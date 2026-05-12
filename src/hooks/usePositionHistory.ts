import { useState, useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { UnifiedPosition } from '../types/positions';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';
import { useSettingsStore } from '../store/settingsStore';

export function usePositionHistory(period: '1w' | '2w' | '1m' | 'custom', customStart: string, customEnd: string, triggerSearch: boolean) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const [positions, setPositions] = useState<UnifiedPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      if (useMockData) {
        setPositions([
          {
            id: 'mock-hist-1',
            connectionId: 'mock',
            exchange: 'BYBIT',
            label: 'Mock Account',
            symbol: 'BTCUSDT',
            side: 'long',
            realizedPnl: 150.25,
            closeTime: Date.now() - 3600000,
            entryPrice: 60100.5,
            closePrice: 60500.0,
            size: 0.375,
            raw: { leverage: 10, marginMode: 'cross' }
          },
          {
            id: 'mock-hist-2',
            connectionId: 'mock',
            exchange: 'OKX',
            label: 'Mock Account',
            symbol: 'ETH-USDT-SWAP',
            side: 'short',
            realizedPnl: -45.50,
            closeTime: Date.now() - 86400000,
            entryPrice: 3100.25,
            closePrice: 3150.75,
            size: 0.9,
            raw: { leverage: 5, marginMode: 'isolated' }
          },
          {
            id: 'mock-hist-3',
            connectionId: 'mock',
            exchange: 'BITGET',
            label: 'Mock Account',
            symbol: 'SOLUSDT',
            side: 'long',
            realizedPnl: 320.75,
            closeTime: Date.now() - 172800000,
            entryPrice: 140.5,
            closePrice: 152.0,
            size: 27.8,
            raw: { leverage: 20, marginMode: 'cross' }
          }
        ]);
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
      let allHistory: UnifiedPosition[] = [];

      // Parallell connection requests for speed
      const promises = keys.map(k => service.fetchExchangeHistory(k, start, end));
      const results = await Promise.all(promises);
      
      for (const result of results) {
        allHistory = [...allHistory, ...result];
      }

      // Order by close time descending
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
