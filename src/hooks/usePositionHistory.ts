import { useState, useEffect } from 'react';
import mockHistoryData from '../mock/history.json';
import { useApiKeysStore } from '../store/apiKeysStore';
import { UnifiedHistoryPosition } from '../types';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';
import { useSettingsStore } from '../store/settingsStore';
import { getCachedHistory } from '../services/historyCache';

export function usePositionHistory(period: 'today' | '7d' | '30d' | '90d' | 'custom', customStart: string, customEnd: string, triggerSearch: boolean) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const historyCacheVersion = useSettingsStore(state => state.historyCacheVersion);
  const [positions, setPositions] = useState<UnifiedHistoryPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const execute = async () => {
      if (useMockData) {
        const sortedHistory = [...mockHistoryData].sort((a: any, b: any) => b.closeUpdateTime - a.closeUpdateTime);
        setPositions(sortedHistory as UnifiedHistoryPosition[]);
        return;
      }

      if (keys.length === 0) {
        setPositions([]);
        return;
      }
      
      let start: number | undefined;
      let end: number | undefined;
      const now = Date.now();
      
      if (period === 'custom' && customStart && customEnd) {
        start = new Date(customStart).setHours(0, 0, 0, 0);
        end = new Date(customEnd).setHours(23, 59, 59, 999);
      } else if (period === 'today') {
        start = new Date(now).setHours(0, 0, 0, 0);
        end = now;
      } else if (period === '7d') {
        start = now - 7 * 24 * 60 * 60 * 1000;
        end = now;
      } else if (period === '30d') {
        start = now - 30 * 24 * 60 * 60 * 1000;
        end = now;
      } else if (period === '90d') {
        start = now - 90 * 24 * 60 * 60 * 1000;
        end = now;
      }

      // Step 1: Instant cache load (SWR)
      let cachedTotal: UnifiedHistoryPosition[] = [];
      try {
        const cachePromises = keys.map(apiKey => getCachedHistory(apiKey.id));
        const cacheResults = await Promise.all(cachePromises);
        for (const res of cacheResults) {
          cachedTotal = [...cachedTotal, ...res];
        }
        
        if (start !== undefined && end !== undefined) {
          cachedTotal = cachedTotal.filter(pos => pos.closeUpdateTime >= start! && pos.closeUpdateTime <= end!);
        }
        cachedTotal.sort((a, b) => b.closeUpdateTime - a.closeUpdateTime);
        
        if (isMounted) {
          if (cachedTotal.length > 0) {
            setPositions(cachedTotal);
            setIsLoading(false); // fast render
          } else {
            setIsLoading(true); // initial load
          }
        }
      } catch (e) {
        console.error("Error reading cache for SWR", e);
        if (isMounted) setIsLoading(true);
      }

      // Step 2: Background sync
      if (isMounted) setIsSyncing(true);
      
      try {
        const service = new PositionHistoryService();
        let allHistory: UnifiedHistoryPosition[] = [];
        
        const promises = keys.map(apiKey => service.fetchWithCache(apiKey));
        const results = await Promise.all(promises);
        
        for (const result of results) {
          allHistory = [...allHistory, ...result];
        }

        if (start !== undefined && end !== undefined) {
          allHistory = allHistory.filter(pos => pos.closeUpdateTime >= start! && pos.closeUpdateTime <= end!);
        }
        allHistory.sort((a, b) => b.closeUpdateTime - a.closeUpdateTime);

        if (isMounted) {
          setPositions(allHistory);
          setIsLoading(false);
          setIsSyncing(false);
        }
      } catch (err) {
        console.error("Error background syncing position history", err);
        if (isMounted) {
          setIsLoading(false);
          setIsSyncing(false);
        }
      }
    };

    execute();

    return () => {
      isMounted = false;
    };
  }, [keys, period, customStart, customEnd, triggerSearch, useMockData, historyCacheVersion]);

  return { positions, setPositions, isLoading, isSyncing };
}
