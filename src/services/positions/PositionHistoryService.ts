import { UnifiedHistoryPosition } from '../../types';
import { ApiCredentials } from '../../store/apiKeysStore';
import { LogManager } from '../LogManager';
import { ExchangeAggregator } from '../adapters/ExchangeAggregator';
import {
  getCachedHistory,
  saveCachedHistory,
  getLastFetchTimestamp,
  updateCacheMeta,
} from '../historyCache';

export class PositionHistoryService {
  /**
   * Standard fetch: hits the exchange API directly for the requested period.
   */
  public async fetchExchangeHistory(key: ApiCredentials, start?: number, end?: number): Promise<UnifiedHistoryPosition[]> {
    try {
      LogManager.info('PositionHistoryService', `Fetching history for ${key.exchange} (${key.label})`);
      const adapter = ExchangeAggregator.getAdapter(key.exchange);
      return await adapter.fetchAndNormalize(key, start, end);
    } catch (error) {
      LogManager.error('PositionHistoryService', `Fetching history for ${key.exchange} (${key.label}):`, error);
    }
    return [];
  }

  /**
   * Incremental fetch with IndexedDB caching.
   * 1. Loads cached history immediately.
   * 2. Determines the latest cached timestamp.
   * 3. Fetches only NEW records from the exchange (start = lastCachedTime + 1).
   * 4. Merges and persists the new data into IndexedDB.
   */
  public async fetchWithCache(key: ApiCredentials): Promise<UnifiedHistoryPosition[]> {
    const connectionId = key.id;

    // Step 1: Load existing cache
    const cachedPositions = await getCachedHistory(connectionId);
    LogManager.info('HistoryCache', `${connectionId}: ${cachedPositions.length} records in cache`);

    // Step 2: Determine incremental start
    const lastTimestamp = await getLastFetchTimestamp(connectionId);
    const incrementalStart = lastTimestamp > 0 ? lastTimestamp + 1 : undefined;
    const now = Date.now();

    // Step 3: Fetch only new records
    let newPositions: UnifiedHistoryPosition[] = [];
    try {
      newPositions = await this.fetchExchangeHistory(key, incrementalStart, now);
      LogManager.info('HistoryCache', `${connectionId}: ${newPositions.length} new records fetched`);
    } catch (err) {
      LogManager.warn('HistoryCache', `Incremental fetch failed for ${connectionId}, returning stale cache`, err);
      return cachedPositions; // Graceful fallback to stale data (AGENTS.md §5)
    }

    // Step 4: Persist new records and update metadata
    if (newPositions.length > 0) {
      await saveCachedHistory(newPositions);

      const latestCloseTime = Math.max(...newPositions.map(r => r.closeUpdateTime));
      await updateCacheMeta(connectionId, latestCloseTime);
    }

    // Step 5: Merge and deduplicate (by id)
    const mergedMap = new Map<string, UnifiedHistoryPosition>();
    for (const pos of cachedPositions) mergedMap.set(pos.id, pos);
    for (const pos of newPositions) mergedMap.set(pos.id, pos); // new overrides old

    const merged = Array.from(mergedMap.values());
    merged.sort((a, b) => b.closeUpdateTime - a.closeUpdateTime);

    return merged;
  }
}
