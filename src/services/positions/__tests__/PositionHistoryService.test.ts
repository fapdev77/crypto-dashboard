import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PositionHistoryService } from '../PositionHistoryService';
import { ExchangeAggregator } from '../../adapters/ExchangeAggregator';
import { useSyncCoordinatorStore } from '../../../store/syncCoordinatorStore';
import * as historyCache from '../../historyCache';
import { ApiCredentials } from '../../../store/apiKeysStore';

vi.mock('../../adapters/ExchangeAggregator');
vi.mock('../../historyCache');

describe('PositionHistoryService error propagation and fallback', () => {
  const mockKey: ApiCredentials = {
    id: 'test-key-1',
    exchange: 'bybit',
    apiKey: 'key',
    apiSecret: 'secret',
    label: 'Test Key',
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useSyncCoordinatorStore.getState().setPositionsSyncError(null);
  });

  it('fetchExchangeHistory re-throws errors from the adapter', async () => {
    const service = new PositionHistoryService();
    const mockAdapter = {
      fetchAndNormalize: vi.fn().mockRejectedValue(new Error('API key expired 401')),
    };
    vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue(mockAdapter as any);

    await expect(service.fetchExchangeHistory(mockKey, 1000, 2000)).rejects.toThrow('API key expired 401');
  });

  it('fetchWithCache catches fetch errors, sets positionsSyncError, and returns stale cache', async () => {
    const service = new PositionHistoryService();
    const stalePositions = [
      {
        id: 'pos-1',
        connectionId: 'test-key-1',
        symbol: 'BTCUSDT',
        closeUpdateTime: 1000,
      },
    ];

    vi.mocked(historyCache.getCachedHistory).mockResolvedValue(stalePositions as any);
    vi.mocked(historyCache.getLastFetchTimestamp).mockResolvedValue(1000);

    const mockAdapter = {
      fetchAndNormalize: vi.fn().mockRejectedValue(new Error('Rate limit exceeded 429')),
    };
    vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue(mockAdapter as any);

    const result = await service.fetchWithCache(mockKey);

    expect(result).toEqual(stalePositions);
    expect(useSyncCoordinatorStore.getState().positionsSyncError).toContain('Rate limit exceeded 429');
  });

  it('fetchWithCache resets positionsSyncError to null on successful fetch', async () => {
    const service = new PositionHistoryService();
    useSyncCoordinatorStore.getState().setPositionsSyncError('Previous Error');

    vi.mocked(historyCache.getCachedHistory).mockResolvedValue([]);
    vi.mocked(historyCache.getLastFetchTimestamp).mockResolvedValue(0);
    vi.mocked(historyCache.saveCachedHistory).mockResolvedValue(undefined as any);
    vi.mocked(historyCache.updateCacheMeta).mockResolvedValue(undefined as any);

    const freshPositions = [
      {
        id: 'pos-2',
        connectionId: 'test-key-1',
        symbol: 'ETHUSDT',
        closeUpdateTime: 2000,
      },
    ];

    const mockAdapter = {
      fetchAndNormalize: vi.fn().mockResolvedValue(freshPositions),
    };
    vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue(mockAdapter as any);

    const result = await service.fetchWithCache(mockKey);

    expect(result).toEqual(freshPositions);
    expect(useSyncCoordinatorStore.getState().positionsSyncError).toBeNull();
  });
});
