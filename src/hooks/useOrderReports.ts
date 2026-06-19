import { useState, useCallback, useMemo } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { ExchangeAggregator } from '../services/adapters/ExchangeAggregator';
import { UnifiedOrder } from '../types';
import { useOrdersStore } from '../store/ordersStore';

export interface OrderFilters {
  exchange: string;     // 'All' | 'bybit' | 'bitget' | 'okx'
  instrument: string;   // 'All' | 'SPOT' | 'PERP' | 'FUTURES' etc
  symbols: string;
  type: string;         // 'All' | 'LIMIT' | 'MARKET' | 'TP' | 'SL' | 'CONDITIONAL'
  side: string;         // 'All' | 'buy' | 'sell'
  status: 'OPEN' | 'CLOSED';
  timePeriod: number;
  accountId: string;    // 'All' | connectionId
}

export function useOrderReports(filters: OrderFilters) {
  const { keys } = useApiKeysStore();
  const cachedOpenOrders = useOrdersStore(state => state.openOrders);

  // Local state used only for CLOSED (history) orders
  const [closedRawOrders, setClosedRawOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // fetchOrders is only meaningful for CLOSED orders now.
  // Open orders are hydrated continuously by the global background polling.
  const fetchOrders = useCallback(async (silent: boolean = false) => {
    if (filters.status === 'OPEN') return;

    if (!silent) setLoading(true);
    setError(null);
    let allOrders: UnifiedOrder[] = [];

    const now = Date.now();
    // Fetch maximum of 90 days for CLOSED orders to allow in-memory time filtering
    const startTime = now - (90 * 24 * 60 * 60 * 1000);
    const endTime = now;

    try {
      const promises = keys.map(async (key) => {
        const adapter = ExchangeAggregator.getAdapter(key.exchange);
        if (adapter.getHistoryOrders) {
          return await adapter.getHistoryOrders(key, startTime, endTime);
        }
        return [];
      });

      const results = await Promise.allSettled(promises);

      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          allOrders = allOrders.concat(res.value);
        } else {
          console.error('[useOrderReports] error fetching closed orders:', res.reason);
        }
      });

      // Deduplicate
      const uniqueOrdersMap = new Map<string, UnifiedOrder>();
      allOrders.forEach(o => {
        if (!uniqueOrdersMap.has(o.id)) {
          uniqueOrdersMap.set(o.id, o);
        }
      });
      allOrders = Array.from(uniqueOrdersMap.values());

      allOrders.sort((a, b) => b.createdTime - a.createdTime);
      setClosedRawOrders(allOrders);
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to fetch order history');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [keys, filters.status]);

  const orders = useMemo(() => {
    // Source: global in-memory cache for open orders, local state for closed
    const rawOrders: UnifiedOrder[] = filters.status === 'OPEN'
      ? Object.values(cachedOpenOrders)
      : closedRawOrders;

    const symbolsList = filters.symbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
    const now = Date.now();

    return rawOrders.filter(order => {
      if (filters.exchange !== 'All' && order.exchange !== filters.exchange) return false;
      if (filters.status === 'CLOSED' && order.createdTime < now - filters.timePeriod) return false;
      if (symbolsList.length > 0 && !symbolsList.some(sym => order.symbol.toUpperCase().includes(sym))) return false;
      if (filters.type !== 'All' && filters.type !== order.type) return false;
      if (filters.side !== 'All' && order.side !== filters.side) return false;
      if (filters.instrument !== 'All' && (order.category || '').toUpperCase() !== filters.instrument.toUpperCase()) return false;
      if (filters.accountId !== 'All' && order.connectionId !== filters.accountId) return false;
      return true;
    });
  }, [cachedOpenOrders, closedRawOrders, filters]);

  return { fetchOrders, orders, loading, error };
}
