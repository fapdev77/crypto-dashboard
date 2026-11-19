import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePositionHistory } from '../usePositionHistory';
import { useSyncCoordinatorStore } from '../../store/syncCoordinatorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { PositionHistoryService } from '../../services/positions/PositionHistoryService';
import * as historyCache from '../../services/historyCache';

vi.mock('../../services/positions/PositionHistoryService');
vi.mock('../../services/historyCache');

describe('usePositionHistory multi-key error aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSyncCoordinatorStore.getState().setPositionsSyncError(null);
    useSyncCoordinatorStore.getState().setCachedPositions([]);
    useSettingsStore.setState({ useMockData: false, lastSyncTime: 0, historyCacheInterval: 5 });
  });

  it('aggregates errors when key 1 fails and key 2 succeeds without clearing error', async () => {
    useApiKeysStore.setState({
      keys: [
        {
          id: 'conn-1',
          exchange: 'bybit',
          apiKey: 'key-1',
          apiSecret: 'secret-1',
          label: 'Bybit Main',
          isActive: true,
        },
        {
          id: 'conn-2',
          exchange: 'bitget',
          apiKey: 'key-2',
          apiSecret: 'secret-2',
          label: 'Bitget Sub',
          isActive: true,
        },
      ],
    });

    const mockFetchWithCache = vi.fn().mockImplementation(async (key) => {
      if (key.id === 'conn-1') {
        throw new Error('Bybit 429 Too Many Requests');
      }
      return [];
    });

    vi.mocked(PositionHistoryService).mockImplementation(function(this: any) {
      return {
        fetchWithCache: mockFetchWithCache,
        fetchExchangeHistory: vi.fn(),
      } as any;
    });

    vi.mocked(historyCache.getCachedHistory).mockImplementation(async (connectionId) => {
      if (connectionId === 'conn-1') {
        return [
          {
            id: 'pos-1',
            connectionId: 'conn-1',
            symbol: 'BTCUSDT',
            side: 'BUY',
            size: '1',
            entryPrice: '50000',
            closeAvgPrice: '51000',
            closeUpdateTime: Date.now() - 10000,
            realisedPnl: '1000',
            realisedPnlPercentage: '2',
            leverage: '10',
            exchange: 'bybit',
          } as any,
        ];
      }
      return [];
    });

    const { result } = renderHook(() => usePositionHistory('7d'));

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.syncError).toBeTruthy();
    });

    // Error from key 1 must be preserved and aggregated, NOT overwritten by key 2
    expect(useSyncCoordinatorStore.getState().positionsSyncError).toContain('bybit (Bybit Main): Bybit 429 Too Many Requests');
    expect(result.current.syncError).toContain('bybit (Bybit Main): Bybit 429 Too Many Requests');

    // Stale cached data from key 1 should still be present in rawCachedPositions
    expect(result.current.positions.length).toBe(1);
    expect(result.current.positions[0].symbol).toBe('BTCUSDT');
  });

  it('clears positionsSyncError when all keys succeed', async () => {
    useSyncCoordinatorStore.getState().setPositionsSyncError('Old Error');

    useApiKeysStore.setState({
      keys: [
        {
          id: 'conn-1',
          exchange: 'bybit',
          apiKey: 'key-1',
          apiSecret: 'secret-1',
          label: 'Bybit Main',
          isActive: true,
        },
      ],
    });

    const mockFetchWithCache = vi.fn().mockResolvedValue([]);
    vi.mocked(PositionHistoryService).mockImplementation(function(this: any) {
      return {
        fetchWithCache: mockFetchWithCache,
        fetchExchangeHistory: vi.fn(),
      } as any;
    });
    vi.mocked(historyCache.getCachedHistory).mockResolvedValue([]);

    const { result } = renderHook(() => usePositionHistory('7d'));

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.syncError).toBeNull();
    });

    expect(useSyncCoordinatorStore.getState().positionsSyncError).toBeNull();
  });

  it('does not advance lastSyncTime when a key fails during position sync', async () => {
    useSettingsStore.setState({ lastSyncTime: 5000 });

    useApiKeysStore.setState({
      keys: [
        {
          id: 'conn-1',
          exchange: 'bybit',
          apiKey: 'key-1',
          apiSecret: 'secret-1',
          label: 'Bybit Main',
          isActive: true,
        },
      ],
    });

    vi.mocked(PositionHistoryService).mockImplementation(function(this: any) {
      return {
        fetchWithCache: vi.fn().mockRejectedValue(new Error('Bybit 429 Too Many Requests')),
        fetchExchangeHistory: vi.fn(),
      } as any;
    });
    vi.mocked(historyCache.getCachedHistory).mockResolvedValue([]);

    const { result } = renderHook(() => usePositionHistory('7d'));

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.syncError).toBeTruthy();
    });

    // lastSyncTime must NOT have advanced!
    expect(useSettingsStore.getState().lastSyncTime).toBe(5000);
  });

  it('advances lastSyncTime when all keys succeed and attempts sync again if previous sync had failed', async () => {
    useSettingsStore.setState({ lastSyncTime: 5000 });

    useApiKeysStore.setState({
      keys: [
        {
          id: 'conn-1',
          exchange: 'bybit',
          apiKey: 'key-1',
          apiSecret: 'secret-1',
          label: 'Bybit Main',
          isActive: true,
        },
      ],
    });

    const mockFetch = vi.fn().mockResolvedValue([]);
    vi.mocked(PositionHistoryService).mockImplementation(function(this: any) {
      return {
        fetchWithCache: mockFetch,
        fetchExchangeHistory: vi.fn(),
      } as any;
    });
    vi.mocked(historyCache.getCachedHistory).mockResolvedValue([]);

    const { result } = renderHook(() => usePositionHistory('7d'));

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.syncError).toBeNull();
    });

    // lastSyncTime must have advanced beyond initial timestamp
    expect(useSettingsStore.getState().lastSyncTime).toBeGreaterThan(5000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('filters cached positions by strict calendar period and custom date range', async () => {
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    useSettingsStore.setState({ lastSyncTime: now }); // skip network sync

    useApiKeysStore.setState({
      keys: [
        {
          id: 'conn-1',
          exchange: 'bybit',
          apiKey: 'key-1',
          apiSecret: 'secret-1',
          label: 'Bybit Main',
          isActive: true,
        },
      ],
    });

    vi.mocked(historyCache.getCachedHistory).mockResolvedValue([
      {
        id: 'recent-pos',
        connectionId: 'conn-1',
        exchange: 'bybit',
        label: 'Bybit Main',
        symbol: 'BTCUSDT',
        side: 'long',
        size: 1,
        entryPrice: 50000,
        closePrice: 51000,
        closeUpdateTime: now - 2 * ONE_DAY,
        realizedPnl: 100,
      } as any,
      {
        id: 'old-pos',
        connectionId: 'conn-1',
        exchange: 'bybit',
        label: 'Bybit Main',
        symbol: 'ETHUSDT',
        side: 'short',
        size: 2,
        entryPrice: 3000,
        closePrice: 2900,
        closeUpdateTime: now - 15 * ONE_DAY,
        realizedPnl: 200,
      } as any,
      {
        id: 'jan-pos',
        connectionId: 'conn-1',
        exchange: 'bybit',
        label: 'Bybit Main',
        symbol: 'SOLUSDT',
        side: 'long',
        size: 10,
        entryPrice: 100,
        closePrice: 120,
        closeUpdateTime: new Date(2026, 0, 15, 12, 0, 0).getTime(),
        realizedPnl: 200,
      } as any,
    ]);

    const { result, rerender } = renderHook(
      ({ period, start, end }: { period: number | string; start?: string; end?: string }) =>
        usePositionHistory(period, 'All', '', start, end),
      { initialProps: { period: 7 * ONE_DAY } as { period: number | string; start?: string; end?: string } }
    );

    await waitFor(() => {
      expect(result.current.positions.map(p => p.id)).toEqual(['recent-pos']);
    });

    rerender({ period: 30 * ONE_DAY });
    await waitFor(() => {
      expect(result.current.positions.map(p => p.id)).toEqual(['recent-pos', 'old-pos']);
    });

    rerender({ period: 'custom', start: '2026-01-10', end: '2026-01-20' });
    await waitFor(() => {
      expect(result.current.positions.map(p => p.id)).toEqual(['jan-pos']);
    });
  });

  it('applies period and custom date filtering in Simulation Mode (useMockData)', async () => {
    useSettingsStore.setState({ useMockData: true });

    const { result, rerender } = renderHook(
      ({ period, start, end }: { period: number | string; start?: string; end?: string }) =>
        usePositionHistory(period, 'All', '', start, end),
      { initialProps: { period: 0 } as { period: number | string; start?: string; end?: string } }
    );

    await waitFor(() => {
      expect(result.current.positions.length).toBeGreaterThan(0);
    });
    const allCount = result.current.positions.length;

    // Very narrow future range must exclude historical mock positions
    rerender({ period: 'custom', start: '2099-01-01', end: '2099-01-02' });
    await waitFor(() => {
      expect(result.current.positions.length).toBe(0);
    });

    // Partial window subsets mock history (proving period filtering works in Simulation Mode)
    rerender({ period: 'custom', start: '2026-01-01', end: '2026-12-31' });
    await waitFor(() => {
      expect(result.current.positions.length).toBeGreaterThan(0);
      expect(result.current.positions.length).toBeLessThanOrEqual(allCount);
    });

    // Broad range covering all mock records restores them
    rerender({ period: 'custom', start: '2020-01-01', end: '2035-12-31' });
    await waitFor(() => {
      expect(result.current.positions.length).toBe(allCount);
    });
  });
});
