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
});
