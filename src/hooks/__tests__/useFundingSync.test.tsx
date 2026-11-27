import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFundingSync } from '../useFundingSync';
import { useFundingStore } from '../../store/fundingStore';
import { useSettingsStore } from '../../store/settingsStore';
import { FundingService, CurrentFundingRate } from '../../services/funding/FundingService';
import { getFundingMeta, saveFundingSummariesBatch } from '../../services/historyCache';
import { LogManager } from '../../services/LogManager';
import type { ExchangeName, FundingMeta, FundingRateSummary } from '../../types';

vi.mock('../../services/funding/FundingService', () => ({
  FundingService: {
    fetchCurrentFundingRates: vi.fn(),
    fetchAndAggregateSummary: vi.fn(),
  },
}));

vi.mock('../../services/historyCache', () => ({
  getFundingMeta: vi.fn(),
  saveFundingSummariesBatch: vi.fn(),
}));

vi.mock('../../services/LogManager', () => ({
  LogManager: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    system: vi.fn(),
  },
}));

const fetchRates = vi.mocked(FundingService.fetchCurrentFundingRates);
const fetchSummary = vi.mocked(FundingService.fetchAndAggregateSummary);
const getMeta = vi.mocked(getFundingMeta);
const saveBatch = vi.mocked(saveFundingSummariesBatch);

const rate = (
  exchange: ExchangeName,
  symbol: string,
  nextFundingTime = Date.now() + 60 * 60 * 1000,
): CurrentFundingRate => ({
  exchange,
  symbol,
  instrumentType: 'USDT-M',
  fundingRate: 0.0001,
  nextFundingTime,
});

const summary = (
  exchange: ExchangeName,
  symbol: string,
  lastFundingTime = '1700000000000',
): FundingRateSummary => ({
  id: `${exchange}-${symbol}`,
  exchange,
  symbol,
  instrumentType: 'USDT-M',
  last3MonthsFundingRate: '0.00000000',
  lastMonthFundingRate: '0.00000000',
  currentMonthFundingRate: '0.00000000',
  todayFundingRate: '0.00000000',
  lastFundingRate: '0.00010000',
  lastFundingTime,
  updatedAt: Date.now(),
});

const freshMeta = (): FundingMeta => ({
  id: 'x',
  exchange: 'bybit',
  symbol: 'BTCUSDT',
  oldestTimestamp: Date.now() - 1000,
  latestTimestamp: Date.now(),
  updatedAt: Date.now(),
});

/** Awaits the async chain started by the mount effect (fetch → sync → persist). */
async function settle() {
  await waitFor(() => {
    expect(useFundingStore.getState().isSyncing).toBe(false);
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('useFundingSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      useMockData: false,
      fundingPollingInterval: 1,
      fundingHistoryInterval: 4,
      lastSyncTime: 0,
    });
    useFundingStore.setState({
      currentRates: [],
      lastHistoryFetch: 0,
      isSyncing: false,
      syncProgress: 0,
      syncMessage: '',
      nextFundingTime: 0,
      nextScheduledSyncTime: 0,
      lastExchangeTimings: [],
    });
    fetchRates.mockResolvedValue([]);
    getMeta.mockResolvedValue(undefined);
    fetchSummary.mockImplementation(async (exchange, symbol) => summary(exchange, symbol));
    saveBatch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not touch the network when mock data is enabled', async () => {
    useSettingsStore.setState({ useMockData: true });

    const { result } = renderHook(() => useFundingSync());
    await result.current.forceSync();

    expect(fetchRates).not.toHaveBeenCalled();
    expect(getMeta).not.toHaveBeenCalled();
    expect(LogManager.info).toHaveBeenCalledWith(
      'FundingSync',
      'Mock mode active, skipping manual sync.',
    );
  });

  it('syncs stale symbols, persists one batch and reports completion', async () => {
    fetchRates.mockImplementation(async (exchange) =>
      exchange === 'bybit' ? [rate('bybit', 'BTCUSDT'), rate('bybit', 'ETHUSDT')] : [],
    );

    renderHook(() => useFundingSync());

    await waitFor(() => expect(saveBatch).toHaveBeenCalledTimes(1));
    const saved = saveBatch.mock.calls[0][0];
    expect(saved).toHaveLength(2);
    expect(saved.map((s) => s.symbol)).toEqual(['BTCUSDT', 'ETHUSDT']);
    expect(getMeta).toHaveBeenCalledTimes(2);

    await waitFor(() =>
      expect(useFundingStore.getState().syncMessage).toContain(
        'Synced 2 symbols across 1 exchanges',
      ),
    );
    expect(useFundingStore.getState().lastHistoryFetch).toBeGreaterThan(0);
    expect(useFundingStore.getState().isSyncing).toBe(false);
    expect(useSettingsStore.getState().lastSyncTime).toBeGreaterThan(0);
    expect(useFundingStore.getState().lastSyncPerformance).toMatchObject({ symbols: 2 });
  });

  it('records symbols with no funding history as skipped instead of syncing them', async () => {
    fetchRates.mockImplementation(async (exchange) =>
      exchange === 'bitget' ? [rate('bitget', 'BTCUSDT'), rate('bitget', 'SOLUSDT')] : [],
    );
    fetchSummary.mockImplementation(async (exchange, symbol) => summary(exchange, symbol, '0'));

    renderHook(() => useFundingSync());

    await waitFor(() =>
      expect(useFundingStore.getState().syncMessage).toContain(
        'Synced 0 symbols across 1 exchanges',
      ),
    );
    expect(saveBatch).not.toHaveBeenCalled();
    expect(LogManager.system).toHaveBeenCalledWith(
      'FundingSync',
      expect.stringContaining('SKIPPED SYMBOLS'),
    );
  });

  it('skips the fetch entirely when the cached record is still fresh', async () => {
    fetchRates.mockImplementation(async (exchange) =>
      exchange === 'bybit' ? [rate('bybit', 'BTCUSDT')] : [],
    );
    getMeta.mockResolvedValue(freshMeta());

    renderHook(() => useFundingSync());

    await waitFor(() =>
      expect(LogManager.system).toHaveBeenCalledWith(
        'FundingSync',
        expect.stringContaining('SYNC COMPLETE'),
      ),
    );
    expect(fetchSummary).not.toHaveBeenCalled();
    expect(saveBatch).not.toHaveBeenCalled();
  });

  it('keeps the exchanges that responded when another one fails', async () => {
    fetchRates.mockImplementation(async (exchange) => {
      if (exchange === 'bybit') throw new Error('bybit down');
      return exchange === 'okx' ? [rate('okx', 'BTC-USDT-SWAP')] : [];
    });

    renderHook(() => useFundingSync());

    await waitFor(() =>
      expect(useFundingStore.getState().currentRates.map((r) => r.symbol)).toEqual([
        'BTC-USDT-SWAP',
      ]),
    );
    expect(LogManager.error).toHaveBeenCalledWith(
      'FundingSync',
      expect.stringContaining('bybit'),
      expect.any(Error),
    );
  });

  it('keeps the previous snapshot when every exchange fails', async () => {
    useFundingStore.setState({ currentRates: [rate('okx', 'KEEP-USDT-SWAP')] });
    fetchRates.mockRejectedValue(new Error('network down'));

    renderHook(() => useFundingSync());

    await waitFor(() => expect(LogManager.error).toHaveBeenCalledTimes(3));
    expect(useFundingStore.getState().currentRates.map((r) => r.symbol)).toEqual([
      'KEEP-USDT-SWAP',
    ]);
  });

  it('does not re-sync history while the poll interval has not elapsed', async () => {
    useFundingStore.setState({ lastHistoryFetch: Date.now() });
    fetchRates.mockImplementation(async (exchange) =>
      exchange === 'bybit' ? [rate('bybit', 'BTCUSDT')] : [],
    );

    renderHook(() => useFundingSync());

    await waitFor(() => expect(fetchRates).toHaveBeenCalled());
    expect(getMeta).not.toHaveBeenCalled();
    expect(saveBatch).not.toHaveBeenCalled();
  });

  it('schedules auto-sync one minute after the nearest funding time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const nextFundingTime = Date.now() + 30_000;

    fetchRates.mockImplementation(async (exchange) =>
      exchange === 'bybit' ? [rate('bybit', 'BTCUSDT', nextFundingTime)] : [],
    );
    getMeta.mockResolvedValue(freshMeta());

    const listener = vi.fn();
    window.addEventListener('funding-cache-cleared', listener);

    renderHook(() => useFundingSync());
    await vi.advanceTimersByTimeAsync(10);

    expect(useFundingStore.getState().nextScheduledSyncTime).toBe(nextFundingTime + 60_000);

    // The fixed UTC schedule (00:01) fires first at +60s; the auto-sync timer
    // only fires at +90s (next funding + 1 minute).
    await vi.advanceTimersByTimeAsync(60_001);
    const beforeAutoSync = listener.mock.calls.length;

    await vi.advanceTimersByTimeAsync(30_000);
    expect(listener.mock.calls.length).toBeGreaterThan(beforeAutoSync);
    expect(LogManager.info).toHaveBeenCalledWith(
      'FundingSync',
      expect.stringContaining('Auto-sync fired'),
    );

    window.removeEventListener('funding-cache-cleared', listener);
  });

  it('restarts the sync instead of dropping a manual request made mid-flight', async () => {
    let release: (() => void) | undefined;
    let firstCall = true;
    fetchRates.mockImplementation(async (exchange) =>
      exchange === 'bybit' ? [rate('bybit', 'BTCUSDT')] : [],
    );
    fetchSummary.mockImplementation(async (exchange, symbol) => {
      if (firstCall) {
        firstCall = false;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      return summary(exchange, symbol);
    });

    const { result } = renderHook(() => useFundingSync());
    await waitFor(() => expect(fetchSummary).toHaveBeenCalledTimes(1));

    // Second request while the first sync is still waiting on the API.
    await result.current.forceSync();
    expect(LogManager.info).toHaveBeenCalledWith(
      'FundingSync',
      'Sync already in progress — will restart after completion',
    );

    release?.();
    await waitFor(() =>
      expect(LogManager.info).toHaveBeenCalledWith(
        'FundingSync',
        'Restarting sync after user force request...',
      ),
    );
    await settle();
    expect(fetchRates.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('clears its timers when the component unmounts', async () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { unmount } = renderHook(() => useFundingSync());
    await vi.advanceTimersByTimeAsync(10);
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    const callsAfterUnmount = fetchRates.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(fetchRates.mock.calls.length).toBe(callsAfterUnmount);

    clearIntervalSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });
});
