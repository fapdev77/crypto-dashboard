import { useState, useEffect, useMemo } from 'react';
import mockHistoryData from '../mock/history.json';
import { useApiKeysStore } from '../store/apiKeysStore';
import { UnifiedHistoryPosition } from '../types';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';
import { useSettingsStore } from '../store/settingsStore';
import { getCachedHistory } from '../services/historyCache';

export type PositionHistoryPeriod = 'today' | '7d' | '14d' | '30d' | '90d';

// Module-level state to persist across unmounts/remounts of different views
let globalCachedPositions: UnifiedHistoryPosition[] = [];
let globalLastPositionsSyncedVersion: number | null = null;
let globalLastPositionsSyncTimestamp: number = 0;

export function usePositionHistory(period: PositionHistoryPeriod, exchange?: string, searchTerm?: string) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const historyCacheVersion = useSettingsStore(state => state.historyCacheVersion);
  const historyCacheInterval = useSettingsStore(state => state.historyCacheInterval);
  const lastSyncTime = useSettingsStore(state => state.lastSyncTime);
  const setLastSyncTime = useSettingsStore(state => state.setLastSyncTime);
  const [positions, setPositions] = useState<UnifiedHistoryPosition[]>([]);
  const [rawCachedPositions, setRawCachedPositions] = useState<UnifiedHistoryPosition[]>(globalCachedPositions);
  const [isLoading, setIsLoading] = useState(() => {
    if (useMockData || keys.length === 0) return false;
    return globalCachedPositions.length === 0;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

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

    if (keys.length === 0) {
      setRawCachedPositions([]);
      return;
    }

    const loadCache = async () => {
      try {
        let cachedTotal: UnifiedHistoryPosition[] = [];
        const cachePromises = keys.map(apiKey => getCachedHistory(apiKey.id));
        const cacheResults = await Promise.all(cachePromises);
        for (const res of cacheResults) {
          cachedTotal = [...cachedTotal, ...res];
        }
        if (isMounted) {
          setRawCachedPositions(cachedTotal);
          globalCachedPositions = cachedTotal;
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[usePositionHistory] Error loading cache:', err);
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
    if (useMockData || keys.length === 0) return;

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
        setSyncMessage('Iniciando sincronização...');
      }

      try {
        const service = new PositionHistoryService();
        for (const key of keys) {
          if (isMounted) setSyncMessage(`Aguarde: sincronizando ${key.exchange} (${key.label})...`);
          await service.fetchWithCache(key);
        }

        // Fetch complete updated list from cache
        let cachedTotal: UnifiedHistoryPosition[] = [];
        const cachePromises = keys.map(apiKey => getCachedHistory(apiKey.id));
        const cacheResults = await Promise.all(cachePromises);
        for (const res of cacheResults) {
          cachedTotal = [...cachedTotal, ...res];
        }

        if (isMounted) {
          setRawCachedPositions(cachedTotal);
          globalCachedPositions = cachedTotal;
          setIsLoading(false);
          setIsSyncing(false);
          setSyncMessage(null);
          
          setLastSyncTime(Date.now());
        }
      } catch (err) {
        console.error('[usePositionHistory] Error syncing network positions:', err);
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
      setPositions(applyFilters(sortedHistory as UnifiedHistoryPosition[]));
      return;
    }

    if (keys.length === 0) {
      setPositions([]);
      return;
    }

    let start: number | undefined;
    let end: number | undefined;
    const now = Date.now();

    if (period === 'today') {
      start = new Date(now).setHours(0, 0, 0, 0);
      end = now;
    } else if (period === '7d') {
      start = now - 7 * 24 * 60 * 60 * 1000;
      end = now;
    } else if (period === '14d') {
      start = now - 14 * 24 * 60 * 60 * 1000;
      end = now;
    } else if (period === '30d') {
      start = now - 30 * 24 * 60 * 60 * 1000;
      end = now;
    } else if (period === '90d') {
      start = now - 90 * 24 * 60 * 60 * 1000;
      end = now;
    }

    let filtered = [...rawCachedPositions];
    if (start !== undefined && end !== undefined) {
      filtered = filtered.filter(pos => pos.closeUpdateTime >= start! && pos.closeUpdateTime <= end!);
    }
    filtered.sort((a, b) => b.closeUpdateTime - a.closeUpdateTime);

    setPositions(applyFilters(filtered));
  }, [rawCachedPositions, keys, period, exchange, searchTerm, useMockData]);

  return { positions, setPositions, isLoading, isSyncing, syncMessage };
}
