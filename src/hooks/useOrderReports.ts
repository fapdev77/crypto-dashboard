import { useState, useCallback, useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useDashboardStore } from '../store/dashboardStore';
import { ExchangeAggregator } from '../services/adapters/ExchangeAggregator';
import { UnifiedOrder } from '../types';

export interface OrderFilters {
  exchange: string;     // 'All' | 'bybit' | 'bitget' | 'okx'
  instrument: string;   // 'All' | 'SPOT' | 'PERP' | 'FUTURES' etc
  symbols: string;
  type: string;         // 'All' | 'LIMIT' | 'MARKET' | 'TP' | 'SL' | 'CONDITIONAL'
  status: 'OPEN' | 'CLOSED';
  timePeriod: number;
}

export function useOrderReports() {
  const { keys } = useApiKeysStore();
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (filters: OrderFilters) => {
    setLoading(true);
    setError(null);
    let allOrders: UnifiedOrder[] = [];

    const now = Date.now();
    const startTime = filters.status === 'CLOSED' ? now - filters.timePeriod : undefined;
    const endTime = filters.status === 'CLOSED' ? now : undefined;

    // Filter keys by selected exchanges
    const activeKeys = keys.filter(k => 
      filters.exchange === 'All' || filters.exchange === k.exchange
    );

    try {
      const promises = activeKeys.map(async (key) => {
        const adapter = ExchangeAggregator.getAdapter(key.exchange);
        if (filters.status === 'OPEN') {
           if (adapter.getOpenOrders) {
             return await adapter.getOpenOrders(key);
           }
        } else {
           if (adapter.getHistoryOrders) {
             return await adapter.getHistoryOrders(key, startTime, endTime);
           }
        }
        return [];
      });

      const results = await Promise.allSettled(promises);
      
      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          allOrders = allOrders.concat(res.value);
        } else {
          console.error('[useOrderReports] error fetching orders:', res.reason);
        }
      });

      // Post fetch UI Filtering
      const symbolsList = filters.symbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s);

      allOrders = allOrders.filter(order => {
        if (symbolsList.length > 0 && !symbolsList.some(sym => order.symbol.toUpperCase().includes(sym))) {
          return false;
        }
        if (filters.type !== 'All' && filters.type !== order.type) {
          return false;
        }
        if (filters.instrument !== 'All' && order.category.toUpperCase() !== filters.instrument.toUpperCase()) {
          return false;
        }
        return true;
      });

      // Sort by createdTime descending
      allOrders.sort((a, b) => b.createdTime - a.createdTime);

      setOrders(allOrders);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [keys]);

  return { fetchOrders, orders, loading, error };
}
