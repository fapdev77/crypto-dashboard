import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderHistoryService } from '../OrderHistoryService';
import { ExchangeAggregator } from '../../adapters/ExchangeAggregator';
import { useSyncCoordinatorStore } from '../../../store/syncCoordinatorStore';
import * as historyCache from '../../historyCache';
import { ApiCredentials } from '../../../store/apiKeysStore';

vi.mock('../../adapters/ExchangeAggregator');
vi.mock('../../historyCache');

describe('OrderHistoryService error propagation and fallback', () => {
  const mockKey: ApiCredentials = {
    id: 'test-order-key-1',
    exchange: 'bybit',
    apiKey: 'key',
    apiSecret: 'secret',
    label: 'Test Key',
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useSyncCoordinatorStore.getState().setOrdersSyncError(null);
  });

  it('fetchWithCache returns empty array if adapter does not support getHistoryOrders', async () => {
    const service = new OrderHistoryService();
    const mockAdapter = {};
    vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue(mockAdapter as any);

    const result = await service.fetchWithCache(mockKey);
    expect(result).toEqual([]);
  });

  it('fetchWithCache re-throws errors from adapter so callers can aggregate errors across keys', async () => {
    const service = new OrderHistoryService();
    const staleOrders = [
      {
        id: 'ord-1',
        connectionId: 'test-order-key-1',
        symbol: 'BTCUSDT',
        createdTime: 1000,
        status: 'FILLED',
      },
    ];

    vi.mocked(historyCache.getCachedOrders).mockResolvedValue(staleOrders as any);
    vi.mocked(historyCache.getLastOrderFetchTimestamp).mockResolvedValue(1000);

    const mockAdapter = {
      getHistoryOrders: vi.fn().mockRejectedValue(new Error('Rate limit exceeded 429')),
    };
    vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue(mockAdapter as any);

    await expect(service.fetchWithCache(mockKey)).rejects.toThrow('Rate limit exceeded 429');
    // Service does not directly touch the global error store, preventing multi-key overwriting
    expect(useSyncCoordinatorStore.getState().ordersSyncError).toBeNull();
  });

  it('fetchWithCache saves fresh orders on successful fetch without altering existing store error', async () => {
    const service = new OrderHistoryService();
    useSyncCoordinatorStore.getState().setOrdersSyncError('Previous Error from another key');

    vi.mocked(historyCache.getCachedOrders).mockResolvedValueOnce([]) // initial cachedOrders before fetch
      .mockResolvedValueOnce([ // getCachedOrders after fetch
        {
          id: 'ord-2',
          connectionId: 'test-order-key-1',
          symbol: 'ETHUSDT',
          createdTime: 2000,
          status: 'FILLED',
        },
      ] as any);
    vi.mocked(historyCache.getLastOrderFetchTimestamp).mockResolvedValue(0);
    vi.mocked(historyCache.saveCachedOrders).mockResolvedValue(undefined as any);
    vi.mocked(historyCache.updateOrderCacheMeta).mockResolvedValue(undefined as any);

    const freshOrders = [
      {
        id: 'ord-2',
        connectionId: 'test-order-key-1',
        symbol: 'ETHUSDT',
        createdTime: 2000,
        status: 'FILLED',
      },
    ];

    const mockAdapter = {
      getHistoryOrders: vi.fn().mockResolvedValue(freshOrders),
    };
    vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue(mockAdapter as any);

    const result = await service.fetchWithCache(mockKey);

    expect(result).toEqual(freshOrders);
    // Service leaves store error intact so calling hook can manage multi-key aggregation
    expect(useSyncCoordinatorStore.getState().ordersSyncError).toBe('Previous Error from another key');
  });
});
