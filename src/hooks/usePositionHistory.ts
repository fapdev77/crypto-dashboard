import { useState, useEffect, useMemo } from 'react';
import mockHistoryData from '../mock/history.json';
import { useApiKeysStore } from '../store/apiKeysStore';
import type { UnifiedHistoryPosition } from '../types';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { getCachedHistory } from '../services/historyCache';
import { LogManager } from '../services/LogManager';
import { resolvePeriodDateRange } from '../utils/dateTimeHelper';

/** Time period presets for position history queries (ms string/number, 'mtd', 'ytd', 'custom', '0', or legacy aliases). */
export type PositionHistoryPeriod = number | string;

/**
 * Hook for fetching closed position history from all active API keys.
 *
 * Uses a two-tier SWR (stale-while-revalidate) approach:
 *   1. Load cached positions from IndexedDB immediately
 *   2. Fetch new/changed positions from exchange REST APIs in background
 *
 * @param period          Time period to filter by.
 * @param exchange        Optional exchange filter ('All' | 'bybit' | 'bitget' | 'okx').
 * @param searchTerm      Optional text search on symbol or exchange name.
 * @param customStartDate Optional custom start date (YYYY-MM-DD).
 * @param customEndDate   Optional custom end date (YYYY-MM-DD).
 *
 * @returns Object with positions array, isLoading, isSyncing, and syncMessage.
 */
export function usePositionHistory(
  period: PositionHistoryPeriod,
  exchange?: string,
  searchTerm?: string,
  customStartDate?: string,
  customEndDate?: string
) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const historyCacheVersion = useSettingsStore(state => state.historyCacheVersion);
  const historyCacheInterval = useSettingsStore(state => state.historyCacheInterval);
  const lastSyncTime = useSettingsStore(state => state.lastSyncTime);
  const setLastSyncTime = useSettingsStore(state => state.setLastSyncTime);
  const syncStore = useSyncCoordinatorStore();
  const [positions, setPositions] = useState<UnifiedHistoryPosition[]>([]);
  const [rawCachedPositions, setRawCachedPositions] = useState<UnifiedHistoryPosition[]>(syncStore.cachedPositions);
  const [isLoading, setIsLoading] = useState(() => {
    if (useMockData || keys.filter(k => k.isActive).length === 0) return false;
    return syncStore.cachedPositions.length === 0;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(syncStore.positionsSyncError);

  // Turn off loading if active keys count goes to 0
  useEffect(() => {
    if (!useMockData && keys.filter(k => k.isActive).length === 0) {
      setIsLoading(false);
    }
  }, [keys, useMockData]);

  // Apply filters to any position list
  const applyFilters = (positionsList: UnifiedHistoryPosition[]) => {
    let filtered = [...positionsList];
    
    // Filter by exchange
    if (exchange && exchange.toLowerCase() !== 'all') {
      filtered = filtered.filter(pos => pos.exchange.toLowerCase() === exchange.toLowerCase());
    }
    
    // Filter by search term
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(pos => 
        pos.symbol.toLowerCase().includes(term) || 
        pos.exchange.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  // 1. Load Local Cache Effect (Runs ONLY on Keys, useMockData or historyCacheVersion change)
  useEffect(() => {
    let isMounted = true;
    if (useMockData) {
      return;
    }

    const activeKeys = keys.filter(k => k.isActive);
    if (activeKeys.length === 0) {
      setRawCachedPositions([]);
      return;
    }

    const loadCache = async () => {
      try {
        let cachedTotal: UnifiedHistoryPosition[] = [];
        const cachePromises = activeKeys.map(apiKey => getCachedHistory(apiKey.id));
        const cacheResults = await Promise.all(cachePromises);
        for (const res of cacheResults) {
          cachedTotal = [...cachedTotal, ...res];
        }
        if (isMounted) {
          setRawCachedPositions(cachedTotal);
          useSyncCoordinatorStore.getState().setCachedPositions(cachedTotal);
          setIsLoading(false);
        }
      } catch (err) {
        LogManager.error('PositionHistory', 'Error loading cache:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCache();

    return () => {
      isMounted = false;
    };
  }, [keys, useMockData, historyCacheVersion]);

  // 2. Background REST API Sync Effect (Runs ONLY on keys, useMockData, historyCacheVersion, lastSyncTime change)
  useEffect(() => {
    let isMounted = true;
    const activeKeys = keys.filter(k => k.isActive);
    if (useMockData || activeKeys.length === 0) return;

    const syncNetwork = async () => {
      const now = Date.now();
      const intervalMs = (historyCacheInterval || 5) * 60 * 1000;
      const hasRecentSync = (now - lastSyncTime) < intervalMs;

      // Skip network fetch if already done recently
      if (hasRecentSync && lastSyncTime > 0) {
        return;
      }

      if (isMounted) {
        setIsSyncing(true);
        setSyncMessage('Starting sync...');
      }

      try {
        const service = new PositionHistoryService();
        const syncErrors: string[] = [];

        for (const key of activeKeys) {
          if (!key.isActive) continue;
          if (isMounted) setSyncMessage(`Syncing ${key.exchange} (${key.label})...`);
          try {
            await service.fetchWithCache(key);
          } catch (err: any) {
            syncErrors.push(`${key.exchange} (${key.label}): ${err?.message || 'Sync failed'}`);
          }
        }

        // Fetch complete updated list from cache (includes stale data for failed keys)
        let cachedTotal: UnifiedHistoryPosition[] = [];
        const cachePromises = activeKeys.map(apiKey => getCachedHistory(apiKey.id));
        const cacheResults = await Promise.all(cachePromises);
        for (const res of cacheResults) {
          cachedTotal = [...cachedTotal, ...res];
        }

        if (isMounted) {
          setRawCachedPositions(cachedTotal);
          useSyncCoordinatorStore.getState().setCachedPositions(cachedTotal);

          if (syncErrors.length > 0) {
            const errorMessage = syncErrors.join('; ');
            useSyncCoordinatorStore.getState().setPositionsSyncError(errorMessage);
            setSyncError(errorMessage);
          } else {
            useSyncCoordinatorStore.getState().setPositionsSyncError(null);
            setSyncError(null);
            setLastSyncTime(Date.now());
          }

          setIsLoading(false);
          setIsSyncing(false);
          setSyncMessage(null);
        }
      } catch (err: any) {
        LogManager.error('PositionHistory', 'Error syncing network positions:', err);
        if (isMounted) {
          const errorMessage = err?.message || 'Error syncing position history';
          setSyncError(errorMessage);
          useSyncCoordinatorStore.getState().setPositionsSyncError(errorMessage);
          setIsLoading(false);
          setIsSyncing(false);
          setSyncMessage(null);
        }
      }
    };

    syncNetwork();

    return () => {
      isMounted = false;
    };
  }, [keys, useMockData, historyCacheVersion, lastSyncTime, historyCacheInterval, setLastSyncTime]);

  // 3. Sync positions calculation based on local in-memory cache and current filters
  useEffect(() => {
    const { startTime, endTime } = resolvePeriodDateRange(
      period,
      customStartDate,
      customEndDate
    );

    if (useMockData) {
      let sortedHistory = [...mockHistoryData]
        .sort((a: any, b: any) => b.closeUpdateTime - a.closeUpdateTime) as unknown as UnifiedHistoryPosition[];
      if (startTime !== null) {
        sortedHistory = sortedHistory.filter(pos => pos.closeUpdateTime >= startTime);
      }
      if (endTime !== null) {
        sortedHistory = sortedHistory.filter(pos => pos.closeUpdateTime <= endTime);
      }
      setPositions(applyFilters(sortedHistory));
      return;
    }

    const activeKeys = keys.filter(k => k.isActive);
    if (activeKeys.length === 0) {
      setPositions([]);
      return;
    }

    const activeKeyIds = new Set(activeKeys.map(k => k.id));
    let filtered = rawCachedPositions.filter(pos => activeKeyIds.has(pos.connectionId));

    if (startTime !== null) {
      filtered = filtered.filter(pos => pos.closeUpdateTime >= startTime);
    }
    if (endTime !== null) {
      filtered = filtered.filter(pos => pos.closeUpdateTime <= endTime);
    }
    filtered.sort((a, b) => b.closeUpdateTime - a.closeUpdateTime);

    setPositions(applyFilters(filtered));
  }, [rawCachedPositions, keys, period, customStartDate, customEndDate, exchange, searchTerm, useMockData]);

  return { positions, setPositions, isLoading, isSyncing, syncMessage, syncError };
}
