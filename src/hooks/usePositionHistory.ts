import { useState, useEffect, useMemo } from 'react';
import mockHistoryData from '../mock/history.json';
import { useApiKeysStore } from '../store/apiKeysStore';
import type { UnifiedHistoryPosition } from '../types';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { getCachedHistory } from '../services/historyCache';
import { LogManager } from '../services/LogManager';

/** Time period presets for position history queries. */
export type PositionHistoryPeriod = 'today' | '7d' | '14d' | '30d' | '90d' | '120d' | '180d' | '365d' | 'all';

/**
 * Hook for fetching closed position history from all active API keys.
 *
 * Uses a two-tier SWR (stale-while-revalidate) approach:
 *   1. Load cached positions from IndexedDB immediately
 *   2. Fetch new/changed positions from exchange REST APIs in background
 *
 * @param period     Time period to filter by (today, 7d, 14d, 30d, 90d).
 * @param exchange   Optional exchange filter ('All' | 'bybit' | 'bitget' | 'okx').
 * @param searchTerm Optional text search on symbol or exchange name.
 *
 * @returns Object with positions array, isLoading, isSyncing, and syncMessage.
 */
export function usePositionHistory(period: PositionHistoryPeriod, exchange?: string, searchTerm?: string) {
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
    if (exchange && exchange !== 'All') {
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
        for (const key of activeKeys) {
          if (!key.isActive) continue;
          if (isMounted) setSyncMessage(`Syncing ${key.exchange} (${key.label})...`);
          await service.fetchWithCache(key);
        }

        // Fetch complete updated list from cache
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
          setIsSyncing(false);
          setSyncMessage(null);
          
          setLastSyncTime(Date.now());
        }
      } catch (err) {
        LogManager.error('PositionHistory', 'Error syncing network positions:', err);
        if (isMounted) {
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
    if (useMockData) {
      const sortedHistory = [...mockHistoryData].sort((a: any, b: any) => b.closeUpdateTime - a.closeUpdateTime);
      // Mock data has raw fields as loose JSON — cast through unknown to skip strict field matching
      setPositions(applyFilters(sortedHistory as unknown as UnifiedHistoryPosition[]));
      return;
    }

    const activeKeys = keys.filter(k => k.isActive);
    if (activeKeys.length === 0) {
      setPositions([]);
      return;
    }

    const now = Date.now();
    const periodStartMap: Record<string, number | undefined> = {
      today: new Date(now).setHours(0, 0, 0, 0),
      '7d': now - 7 * 24 * 60 * 60 * 1000,
      '14d': now - 14 * 24 * 60 * 60 * 1000,
      '30d': now - 30 * 24 * 60 * 60 * 1000,
      '90d': now - 90 * 24 * 60 * 60 * 1000,
      '120d': now - 120 * 24 * 60 * 60 * 1000,
      '180d': now - 180 * 24 * 60 * 60 * 1000,
      '365d': now - 365 * 24 * 60 * 60 * 1000,
      'all': undefined,
    };
    const start = periodStartMap[period];
    const end = start !== undefined ? now : undefined;

    const activeKeyIds = new Set(activeKeys.map(k => k.id));
    let filtered = rawCachedPositions.filter(pos => activeKeyIds.has(pos.connectionId));
    
    if (start !== undefined && end !== undefined) {
      filtered = filtered.filter(pos => pos.closeUpdateTime >= start! && pos.closeUpdateTime <= end!);
    }
    filtered.sort((a, b) => b.closeUpdateTime - a.closeUpdateTime);

    setPositions(applyFilters(filtered));
  }, [rawCachedPositions, keys, period, exchange, searchTerm, useMockData]);

  return { positions, setPositions, isLoading, isSyncing, syncMessage };
}
