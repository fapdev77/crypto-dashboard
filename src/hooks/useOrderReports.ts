import { useState, useCallback, useMemo, useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { ExchangeAggregator } from '../services/adapters/ExchangeAggregator';
import { UnifiedOrder } from '../types';
import { useOrdersStore } from '../store/ordersStore';
import { getCachedOrders, saveCachedOrders, getLastOrderFetchTimestamp, updateOrderCacheMeta } from '../services/historyCache';
import { useSettingsStore } from '../store/settingsStore';
import mockOrdersData from '../mock/orders.json';

// Module-level state to persist across unmounts/remounts of different views
let globalCachedClosedOrders: UnifiedOrder[] = [];
let globalLastOrdersSyncedVersion: number | null = null;
let globalLastOrdersSyncTimestamp: number = 0;

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
  const { useMockData, historyCacheVersion, historyCacheInterval, lastSyncTime, setLastSyncTime } = useSettingsStore();

  const activeKeys = useMemo(() => keys.filter(k => k.isActive), [keys]);

  // Local state used only for CLOSED (history) orders
  const [closedRawOrders, setClosedRawOrders] = useState<UnifiedOrder[]>(globalCachedClosedOrders);
  const [loading, setLoading] = useState(() => {
    if (useMockData || keys.filter(k => k.isActive).length === 0) return false;
    return globalCachedClosedOrders.length === 0;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Turn off loading if active keys count goes to 0
  useEffect(() => {
    if (!useMockData && keys.filter(k => k.isActive).length === 0) {
      setLoading(false);
    }
  }, [keys, useMockData]);

  // Use a useEffect to handle useMockData changing purely so we update immediately
  useEffect(() => {
    if (useMockData && filters.status === 'CLOSED') {
      const mockClosed = mockOrdersData.filter((o: any) => !['NEW', 'PARTIALLY_FILLED'].includes(o.status));
      setClosedRawOrders(mockClosed as UnifiedOrder[]);
    }
  }, [useMockData, filters.status]);

  // fetchOrders is only meaningful for CLOSED orders now.
  const fetchOrders = useCallback(async (silent: boolean = false, force: boolean = false) => {
    if (filters.status === 'OPEN') return;
    if (useMockData) {
      // Mock data is handled by the useEffect above
      return;
    }

    const activeKeys = keys.filter(k => k.isActive);
    if (activeKeys.length === 0) {
      setClosedRawOrders([]);
      globalCachedClosedOrders = [];
      if (!silent) setLoading(false);
      return;
    }

    // Only trigger loading state on non-silent runs if we don't have any cached orders yet
    if (!silent) {
      if (globalCachedClosedOrders.length === 0) {
        setLoading(true);
      }
      setError(null);
    }

    const now = Date.now();
    let isMounted = true; // In a real setup we might want an abort controller

    try {
      // Step 1: SWR Instant Load from IndexedDB
      let cachedTotal: UnifiedOrder[] = [];
      const cachePromises = activeKeys.map(apiKey => getCachedOrders(apiKey.id));
      const cacheResults = await Promise.all(cachePromises);
      for (const res of cacheResults) {
        cachedTotal = [...cachedTotal, ...res];
      }

      cachedTotal.sort((a, b) => b.createdTime - a.createdTime);

      if (cachedTotal.length > 0) {
        setClosedRawOrders(cachedTotal);
        globalCachedClosedOrders = cachedTotal;
        if (!silent) setLoading(false); // Instant render
      }

      // Smart Check: Should we skip network fetch?
      const intervalMs = (historyCacheInterval || 5) * 60 * 1000;
      const timeSinceLastSync = now - lastSyncTime;
      const hasRecentSync = timeSinceLastSync < intervalMs;

      if (
        !force &&
        cachedTotal.length > 0 &&
        hasRecentSync &&
        lastSyncTime > 0
      ) {
        // Already loaded from cache and synced recently. Skip network request!
        return;
      }

      // Step 2: Background Sync (Incremental)
      setIsSyncing(true);

      let allNewOrders: UnifiedOrder[] = [];

      const fetchPromises = activeKeys.map(async (key) => {
        const adapter = ExchangeAggregator.getAdapter(key.exchange);
        if (adapter.getHistoryOrders) {
          const lastFetch = await getLastOrderFetchTimestamp(key.id);
          const startTime = lastFetch > 0 ? lastFetch : now - (90 * 24 * 60 * 60 * 1000);
          const endTime = now;

          const newOrders = await adapter.getHistoryOrders(key, startTime, endTime);

          if (newOrders.length > 0) {
            await saveCachedOrders(newOrders);
            // find the latest createdTime to update cache meta
            const maxCreatedTime = Math.max(...newOrders.map(o => o.createdTime || 0));
            if (maxCreatedTime > lastFetch) {
              await updateOrderCacheMeta(key.id, maxCreatedTime);
            }
          }
          return newOrders;
        }
        return [];
      });

      const results = await Promise.allSettled(fetchPromises);
      let hasNewOrders = false;

      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          if (res.value.length > 0) hasNewOrders = true;
        } else {
          console.error('[useOrderReports] error fetching closed orders:', res.reason);
        }
      });

      // If we fetched new orders, we should reload from cache to get the fully merged set
      if (hasNewOrders) {
        let updatedTotal: UnifiedOrder[] = [];
        const newCachePromises = activeKeys.map(apiKey => getCachedOrders(apiKey.id));
        const newCacheResults = await Promise.all(newCachePromises);
        for (const res of newCacheResults) {
          updatedTotal = [...updatedTotal, ...res];
        }
        updatedTotal.sort((a, b) => b.createdTime - a.createdTime);
        setClosedRawOrders(updatedTotal);
        globalCachedClosedOrders = updatedTotal;
      } else if (cachedTotal.length === 0) {
        // If we had no cache, and no new orders, set empty array
        setClosedRawOrders([]);
        globalCachedClosedOrders = [];
      }

      // Mark as fully synchronized
      setLastSyncTime(Date.now());

    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to fetch order history');
    } finally {
      if (!silent) setLoading(false);
      setIsSyncing(false);
    }
  }, [keys, filters.status, useMockData, historyCacheVersion, historyCacheInterval, lastSyncTime, setLastSyncTime]);

  const orders = useMemo(() => {
    if (useMockData) {
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
    }

    const activeKeyIds = new Set(keys.filter(k => k.isActive).map(k => k.id));
    if (activeKeyIds.size === 0) {
      return [];
    }

    // Source: global in-memory cache for open orders, local state for closed
    const rawOrders: UnifiedOrder[] = filters.status === 'OPEN'
      ? Object.values(cachedOpenOrders)
      : closedRawOrders;

    const symbolsList = filters.symbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
    const now = Date.now();

    return rawOrders.filter(order => {
      // Rule: Do not display orders for inactive/deactivated API keys
      if (!activeKeyIds.has(order.connectionId)) return false;

      if (filters.exchange !== 'All' && order.exchange !== filters.exchange) return false;
      if (filters.status === 'CLOSED' && order.createdTime < now - filters.timePeriod) return false;
      if (symbolsList.length > 0 && !symbolsList.some(sym => order.symbol.toUpperCase().includes(sym))) return false;
      if (filters.type !== 'All' && filters.type !== order.type) return false;
      if (filters.side !== 'All' && order.side !== filters.side) return false;
      if (filters.instrument !== 'All' && (order.category || '').toUpperCase() !== filters.instrument.toUpperCase()) return false;
      if (filters.accountId !== 'All' && order.connectionId !== filters.accountId) return false;
      return true;
    });
  }, [cachedOpenOrders, closedRawOrders, filters, keys, useMockData]);

  return { fetchOrders, orders, loading: filters.status === 'OPEN' ? false : loading, isSyncing, error };
}
