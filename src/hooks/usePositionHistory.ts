import { useState, useEffect } from 'react';
import mockHistoryData from '../mock/history.json';
import { useApiKeysStore } from '../store/apiKeysStore';
import { UnifiedHistoryPosition } from '../types';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';
import { useSettingsStore } from '../store/settingsStore';

export function usePositionHistory(period: '1w' | '2w' | '1m' | 'custom', customStart: string, customEnd: string, triggerSearch: boolean) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const [positions, setPositions] = useState<UnifiedHistoryPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      if (useMockData) {
        const sortedHistory = [...mockHistoryData].sort((a: any, b: any) => b.closeTime - a.closeTime);
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
      } else if (period === '1w') {
        start = now - 7 * 24 * 60 * 60 * 1000;
        end = now;
      } else if (period === '2w') {
        start = now - 14 * 24 * 60 * 60 * 1000;
        end = now;
      } else if (period === '1m') {
        start = now - 30 * 24 * 60 * 60 * 1000;
        end = now;
      }

      const service = new PositionHistoryService();
      let allHistory: UnifiedHistoryPosition[] = [];

      const promises = keys.map(k => service.fetchWithCache(k));
      const results = await Promise.all(promises);
      
      for (const result of results) {
        allHistory = [...allHistory, ...result];
      }

      if (start !== undefined && end !== undefined) {
        allHistory = allHistory.filter(p => p.closeTime >= start! && p.closeTime <= end!);
      }

      allHistory.sort((a, b) => b.closeTime - a.closeTime);

      if (isMounted) {
        setPositions(allHistory);
        setIsLoading(false);
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [keys, period, customStart, customEnd, triggerSearch, useMockData]);

  return { positions, setPositions, isLoading };
}
