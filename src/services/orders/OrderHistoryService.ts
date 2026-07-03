import { UnifiedOrder } from '../../types';
import { ApiCredentials } from '../../store/apiKeysStore';
import { ExchangeAggregator } from '../adapters/ExchangeAggregator';
import {
  getCachedOrders,
  saveCachedOrders,
  getLastOrderFetchTimestamp,
  updateOrderCacheMeta,
} from '../historyCache';

export class OrderHistoryService {
  /**
   * Incremental fetch of closed orders with IndexedDB caching.
   * 1. Loads cached orders immediately.
   * 2. Calculates start/end timestamps.
   * 3. Fetches orders from exchange API.
   * 4. Updates cache and metadata.
   */
  public async fetchWithCache(key: ApiCredentials): Promise<UnifiedOrder[]> {
    const connectionId = key.id;
    const adapter = ExchangeAggregator.getAdapter(key.exchange);
    if (!adapter.getHistoryOrders) {
      return [];
    }

    const cachedOrders = await getCachedOrders(connectionId);
    const lastFetch = await getLastOrderFetchTimestamp(connectionId);
    const now = Date.now();

    // Look back at least 14 days to cover any open orders that were created in the last 14 days and subsequently closed/canceled.
    const minLookback = 14 * 24 * 60 * 60 * 1000; // 14 days
    const startTime = lastFetch > 0 
      ? Math.max(now - (90 * 24 * 60 * 60 * 1000), Math.min(lastFetch, now - minLookback)) 
      : now - (90 * 24 * 60 * 60 * 1000);
    const endTime = now;

    try {
      const newOrders = await adapter.getHistoryOrders(key, startTime, endTime);

      if (newOrders.length > 0) {
        await saveCachedOrders(newOrders);
        // Find the latest createdTime to update cache meta
        const maxCreatedTime = Math.max(...newOrders.map(o => o.createdTime || 0));
        if (maxCreatedTime > lastFetch) {
          await updateOrderCacheMeta(connectionId, maxCreatedTime);
        }
      }
      
      // Return fully merged set from cache
      return await getCachedOrders(connectionId);
    } catch (err) {
      console.warn(`[OrderHistoryCache] Incremental fetch failed for ${connectionId}, returning cached data`, err);
      return cachedOrders;
    }
  }
}
