import { useState, useEffect } from 'react';
import mockHistoryData from '../mock/history.json';
import { useApiKeysStore } from '../store/apiKeysStore';
import { UnifiedHistoryPosition } from '../types';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';
import { useSettingsStore } from '../store/settingsStore';

export function usePositionHistory(period: 'today' | '7d' | '30d' | '90d' | 'custom', customStart: string, customEnd: string, triggerSearch: boolean) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const historyCacheVersion = useSettingsStore(state => state.historyCacheVersion);
  const [positions, setPositions] = useState<UnifiedHistoryPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      if (useMockData) {
        const sortedHistory = [...mockHistoryData].sort((a: any, b: any) => b.closeUpdateTime - a.closeUpdateTime);
        setPositions(sortedHistory as UnifiedHistoryPosition[]);
        return;
      }

      if (keys.length === 0) {
        setPositions([]);
        return;
      }
      setIsLoading(true);
      
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
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [keys, period, customStart, customEnd, triggerSearch, useMockData, historyCacheVersion]);

  return { positions, setPositions, isLoading };
}
