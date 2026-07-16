import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processSymbol } from '../useFundingSync';
import { FundingService, type CurrentFundingRate } from '../../services/funding/FundingService';

// ── Mock historyCache at module level ────────────────────────────
// vi.mock is hoisted above imports by vitest, so these are available
// before any test file code runs.
vi.mock('../../services/historyCache', () => ({
  getFundingMeta: vi.fn(),
  saveFundingFeesCache: vi.fn(),
  updateFundingMeta: vi.fn(),
}));

import { getFundingMeta, saveFundingFeesCache, updateFundingMeta } from '../../services/historyCache';

const mockGetFundingMeta = getFundingMeta as ReturnType<typeof vi.fn>;
const mockSaveFundingFeesCache = saveFundingFeesCache as ReturnType<typeof vi.fn>;
const mockUpdateFundingMeta = updateFundingMeta as ReturnType<typeof vi.fn>;

// ── Constants ────────────────────────────────────────────────────

const NOW = 1710518400000; // 2024-03-15T12:00:00.000Z (fixed, deterministic)
const FUNDING_CYCLE_MS = 8 * 60 * 60 * 1000; // 8h
const TARGET_DEPTH_MS = 400 * 24 * 60 * 60 * 1000; // 400d

// ── Helpers ──────────────────────────────────────────────────────

function makeRate(exchange: 'bybit' | 'okx' | 'bitget', symbol = 'BTCUSDT'): CurrentFundingRate {
  return {
    exchange,
    symbol,
    instrumentType: 'USDT-M',
    fundingRate: 0.0001,
    nextFundingTime: NOW + FUNDING_CYCLE_MS,
  };
}

function makeMeta(oldestTimestamp: number, latestTimestamp: number, exchange = 'bybit', symbol = 'BTCUSDT') {
  return {
    id: `${exchange}-${symbol}`,
    exchange,
    symbol,
    oldestTimestamp,
    latestTimestamp,
    updatedAt: NOW - 1000,
  };
}

function makeHistory(count: number, startTs: number, intervalMs = 8 * 60 * 60 * 1000) {
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-${i}`,
    exchange: 'bybit' as const,
    symbol: 'BTCUSDT',
    instrumentType: 'USDT-M' as const,
    timestamp: startTs - i * intervalMs,
    fundingRate: 0.0001,
  }));
}

// ── beforeEach: reset call history only, keep implementations ────

beforeEach(() => {
  // Reset call history on historyCache mocks (but NOT mockResolvedValue)
  vi.mocked(mockGetFundingMeta).mockClear();
  vi.mocked(mockSaveFundingFeesCache).mockClear();
  vi.mocked(mockUpdateFundingMeta).mockClear();
  // fetchHistorySpy is managed per-test via vi.spyOn
});

// ── Tests ─────────────────────────────────────────────────────────

describe('processSymbol', () => {
  // ── Scenario 1: No meta (cache empty) → doFullFetch ──────────

  it('Scenario 1: should doFullFetch when no cache meta exists', async () => {
    mockGetFundingMeta.mockResolvedValue(undefined);
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');
    spy.mockResolvedValue(makeHistory(200, NOW));

    await processSymbol(makeRate('bybit'), NOW);

    expect(spy).toHaveBeenCalledWith('bybit', 'BTCUSDT', 'USDT-M', 200);
    expect(mockSaveFundingFeesCache).toHaveBeenCalled();
    expect(mockUpdateFundingMeta).toHaveBeenCalledWith(
      'bybit', 'BTCUSDT', expect.any(Number), expect.any(Number),
    );
    spy.mockRestore();
  });

  it('Scenario 1b: should not fail when meta is undefined and history is empty', async () => {
    mockGetFundingMeta.mockResolvedValue(undefined);
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');
    spy.mockResolvedValue([]);

    await expect(processSymbol(makeRate('bybit'), NOW)).resolves.toBeUndefined();

    expect(mockSaveFundingFeesCache).not.toHaveBeenCalled();
    expect(mockUpdateFundingMeta).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // ── Scenario 2: OKX fresh → skip ─────────────────────────────

  it('Scenario 2: should skip OKX when meta is fresh', async () => {
    const latestTs = NOW - 1000; // 1 second ago → fresh (< 8h)
    const oldestTs = NOW - 90 * 24 * 60 * 60 * 1000;
    mockGetFundingMeta.mockResolvedValue(makeMeta(oldestTs, latestTs, 'okx'));
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');

    await processSymbol(makeRate('okx'), NOW);

    expect(spy).not.toHaveBeenCalled();
    expect(mockSaveFundingFeesCache).not.toHaveBeenCalled();
    expect(mockUpdateFundingMeta).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // ── Scenario 3: OKX stale → doFullFetch with existing bounds ─

  it('Scenario 3: should doFullFetch for OKX when stale', async () => {
    const latestTs = NOW - FUNDING_CYCLE_MS - 1; // stale (> 8h ago)
    const oldestTs = NOW - 90 * 24 * 60 * 60 * 1000;
    mockGetFundingMeta.mockResolvedValue(makeMeta(oldestTs, latestTs, 'okx'));
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');
    spy.mockResolvedValue(makeHistory(200, NOW));

    await processSymbol(makeRate('okx'), NOW);

    // Should fetch full history (no sinceTimestamp)
    expect(spy).toHaveBeenCalledWith('okx', 'BTCUSDT', 'USDT-M', 200);
    expect(mockSaveFundingFeesCache).toHaveBeenCalled();
    expect(mockUpdateFundingMeta).toHaveBeenCalled();
    // Should preserve the more distant (older) of existing vs fetched oldest
    const [, , updatedOldest] = mockUpdateFundingMeta.mock.calls[0];
    expect(updatedOldest).toBe(oldestTs);
    spy.mockRestore();
  });

  // ── Scenario 4: Bybit/Bitget/OKX fresh + deep enough → skip ─

  it('Scenario 4a: should skip Bybit when fresh and deep enough', async () => {
    const latestTs = NOW - 1000; // fresh (< 8h)
    const oldestTs = NOW - 1000 - TARGET_DEPTH_MS - 1; // span > 400d
    mockGetFundingMeta.mockResolvedValue(makeMeta(oldestTs, latestTs, 'bybit'));
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');

    await processSymbol(makeRate('bybit'), NOW);

    expect(spy).not.toHaveBeenCalled();
    expect(mockSaveFundingFeesCache).not.toHaveBeenCalled();
    expect(mockUpdateFundingMeta).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('Scenario 4b: should skip Bitget when fresh (freshness-only, like OKX)', async () => {
    const latestTs = NOW - 1000;
    mockGetFundingMeta.mockResolvedValue(makeMeta(0, latestTs, 'bitget'));
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');

    await processSymbol(makeRate('bitget'), NOW);

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // ── Scenario 5: Bybit stale + deep enough → doIncrementalFetch ─

  it('Scenario 5a: should doIncrementalFetch for Bybit when stale but deep enough', async () => {
    const latestTs = NOW - FUNDING_CYCLE_MS - 1; // stale (> 8h ago)
    const oldestTs = NOW - FUNDING_CYCLE_MS - 1 - TARGET_DEPTH_MS; // span > 400d
    mockGetFundingMeta.mockResolvedValue(makeMeta(oldestTs, latestTs, 'bybit'));
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');
    spy.mockResolvedValue(makeHistory(5, NOW)); // 5 new records

    await processSymbol(makeRate('bybit'), NOW);

    // Should fetch WITH sinceTimestamp (incremental)
    expect(spy).toHaveBeenCalledWith('bybit', 'BTCUSDT', 'USDT-M', 200, latestTs);
    expect(mockSaveFundingFeesCache).toHaveBeenCalled();
    expect(mockUpdateFundingMeta).toHaveBeenCalledWith(
      'bybit', 'BTCUSDT', oldestTs, expect.any(Number),
    );
    spy.mockRestore();
  });

  it('Scenario 5b: should doFullFetch for Bitget when stale (freshness-only, like OKX)', async () => {
    const latestTs = NOW - FUNDING_CYCLE_MS - 1; // stale (> 8h ago)
    const oldestTs = NOW - FUNDING_CYCLE_MS - 1 - TARGET_DEPTH_MS;
    mockGetFundingMeta.mockResolvedValue(makeMeta(oldestTs, latestTs, 'bitget'));
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');
    spy.mockResolvedValue(makeHistory(5, NOW));

    await processSymbol(makeRate('bitget'), NOW);

    // Should fetch WITHOUT sinceTimestamp (full fetch, not incremental)
    expect(spy).toHaveBeenCalledWith('bitget', 'BTCUSDT', 'USDT-M', 200);
    expect(mockSaveFundingFeesCache).toHaveBeenCalled();
    // Should preserve oldest depth (Math.min of existing vs fetched)
    const [, , updatedOldest] = mockUpdateFundingMeta.mock.calls[0];
    expect(updatedOldest).toBe(oldestTs);
    spy.mockRestore();
  });

  it('Scenario 5c: should skip save if incremental fetch returns no new records', async () => {
    const latestTs = NOW - FUNDING_CYCLE_MS - 1;
    const oldestTs = NOW - FUNDING_CYCLE_MS - 1 - TARGET_DEPTH_MS;
    mockGetFundingMeta.mockResolvedValue(makeMeta(oldestTs, latestTs, 'bybit'));
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');
    // All returned records have timestamp <= latestTs → filtered out
    spy.mockResolvedValue(makeHistory(5, latestTs - 1000));

    await processSymbol(makeRate('bybit'), NOW);

    expect(spy).toHaveBeenCalled();
    expect(mockSaveFundingFeesCache).not.toHaveBeenCalled();
    expect(mockUpdateFundingMeta).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // ── Scenario 6: Bybit not deep enough → doFullFetch ──────────

  it('Scenario 6a: should doFullFetch for Bybit when not deep enough (even if fresh)', async () => {
    const latestTs = NOW - 1000; // fresh
    const oldestTs = NOW - 100 * 24 * 60 * 60 * 1000; // only 100d (not deep enough)
    mockGetFundingMeta.mockResolvedValue(makeMeta(oldestTs, latestTs, 'bybit'));
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');
    spy.mockResolvedValue(makeHistory(200, NOW));

    await processSymbol(makeRate('bybit'), NOW);

    expect(spy).toHaveBeenCalledWith('bybit', 'BTCUSDT', 'USDT-M', 200);
    expect(mockUpdateFundingMeta).toHaveBeenCalled();
    const [, , updatedOldest] = mockUpdateFundingMeta.mock.calls[0];
    expect(updatedOldest).toBe(oldestTs); // Math.min preserves oldest
    spy.mockRestore();
  });

  it('Scenario 6b: should doFullFetch for Bitget when stale (regardless of depth)', async () => {
    const latestTs = NOW - FUNDING_CYCLE_MS - 1; // stale
    const oldestTs = NOW - 100 * 24 * 60 * 60 * 1000; // only 100d
    mockGetFundingMeta.mockResolvedValue(makeMeta(oldestTs, latestTs, 'bitget'));
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');
    spy.mockResolvedValue(makeHistory(200, NOW));

    await processSymbol(makeRate('bitget'), NOW);

    expect(spy).toHaveBeenCalledWith('bitget', 'BTCUSDT', 'USDT-M', 200);
    expect(mockSaveFundingFeesCache).toHaveBeenCalled();
    spy.mockRestore();
  });

  // ── Error handling ─────────────────────────────────────────────

  it('should handle fetchFundingHistory throwing an error gracefully', async () => {
    mockGetFundingMeta.mockResolvedValue(undefined);
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');
    spy.mockRejectedValue(new Error('API timeout'));

    await expect(processSymbol(makeRate('bybit'), NOW)).resolves.toBeUndefined();

    expect(mockSaveFundingFeesCache).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should handle getFundingMeta throwing an error gracefully', async () => {
    mockGetFundingMeta.mockRejectedValue(new Error('IndexedDB error'));
    const spy = vi.spyOn(FundingService, 'fetchFundingHistory');

    await expect(processSymbol(makeRate('bybit'), NOW)).resolves.toBeUndefined();

    expect(spy).not.toHaveBeenCalled();
    expect(mockSaveFundingFeesCache).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
