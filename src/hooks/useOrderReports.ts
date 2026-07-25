import { useState, useCallback, useMemo, useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { ExchangeAggregator } from '../services/adapters/ExchangeAggregator';
import { UnifiedOrder } from '../types';
import { useOrdersStore } from '../store/ordersStore';
import { getCachedOrders } from '../services/historyCache';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { OrderHistoryService } from '../services/orders/OrderHistoryService';
import { LogManager } from '../services/LogManager';
import mockOrdersData from '../mock/orders.json';

/** Filter configuration for the Order Reports view. */
export interface OrderFilters {
  /** Exchange filter: 'All' | 'bybit' | 'bitget' | 'okx'. */
  exchange: string;
  /** Instrument type filter: 'All' | 'SPOT' | 'PERP' | 'FUTURES' etc. */
  instrument: string;
  /** Comma-separated list of symbol substrings to filter by. */
  symbols: string;
  /** Order type filter: 'All' | 'LIMIT' | 'MARKET' | 'TP' | 'SL' | 'CONDITIONAL'. */
  type: string;
  /** Side filter: 'All' | 'buy' | 'sell'. */
  side: string;
  /** Whether to show open or closed orders. */
  status: 'OPEN' | 'CLOSED';
  /** Time period in ms for closed orders (only orders newer than this). */
  timePeriod: number;
  /** Account/connection filter: 'All' | connectionId. */
  accountId: string;
  /** Optional fine-grained status filter for closed orders ('All' | 'FILLED' | 'CANCELLED' etc). */
  historyStatus?: string;
}

/**
 * Hook for fetching and filtering open/closed orders from all active API keys.
 *
 * - Open orders come from the in-memory ordersStore (live REST polling).
 * - Closed orders are fetched via IndexedDB cache + background REST sync (SWR pattern).
 * - Mock data is used when Simulation Mode is active.
 *
 * @param filters Current filter configuration.
 * @returns Object with fetchOrders callback, filtered orders array, loading/syncing/error states.
 */
export function useOrderReports(filters: OrderFilters) {
  const { keys } = useApiKeysStore();
  const cachedOpenOrders = useOrdersStore(state => state.openOrders);
  const { useMockData, historyCacheVersion, historyCacheInterval, lastSyncTime, setLastSyncTime } = useSettingsStore();

  const activeKeys = useMemo(() => keys.filter(k => k.isActive), [keys]);

  const syncStore = useSyncCoordinatorStore();

  // Local state used only for CLOSED (history) orders
  const [closedRawOrders, setClosedRawOrders] = useState<UnifiedOrder[]>(syncStore.cachedClosedOrders);
  const [loading, setLoading] = useState(() => {
    if (useMockData || keys.filter(k => k.isActive).length === 0) return false;
    return syncStore.cachedClosedOrders.length === 0;
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
      useSyncCoordinatorStore.getState().setCachedClosedOrders([]);
      if (!silent) setLoading(false);
      return;
    }

    // Only trigger loading state on non-silent runs if we don't have any cached orders yet
    if (!silent) {
      if (useSyncCoordinatorStore.getState().cachedClosedOrders.length === 0) {
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
        useSyncCoordinatorStore.getState().setCachedClosedOrders(cachedTotal);
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
      
      const orderService = new OrderHistoryService();
      const fetchPromises = activeKeys.map(apiKey => orderService.fetchWithCache(apiKey));
      const results = await Promise.allSettled(fetchPromises);

      // Reload fully merged set from cache
      let updatedTotal: UnifiedOrder[] = [];
      const newCachePromises = activeKeys.map(apiKey => getCachedOrders(apiKey.id));
      const newCacheResults = await Promise.all(newCachePromises);
      for (const res of newCacheResults) {
        updatedTotal = [...updatedTotal, ...res];
      }
      updatedTotal.sort((a, b) => b.createdTime - a.createdTime);
      
      if (updatedTotal.length > 0) {
        setClosedRawOrders(updatedTotal);
        useSyncCoordinatorStore.getState().setCachedClosedOrders(updatedTotal);
      } else if (cachedTotal.length === 0) {
        setClosedRawOrders([]);
        useSyncCoordinatorStore.getState().setCachedClosedOrders([]);
      }

      // Mark as fully synchronized
      setLastSyncTime(Date.now());

    } catch (err: any) {
      LogManager.error('OrderReports', 'Failed to fetch order history:', err);
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

      const filtered = rawOrders.filter(order => {
        if (filters.exchange !== 'All' && order.exchange !== filters.exchange) return false;
        if (filters.status === 'CLOSED' && order.createdTime < now - filters.timePeriod) return false;
        if (symbolsList.length > 0 && !symbolsList.some(sym => order.symbol.toUpperCase().includes(sym))) return false;
        if (filters.type !== 'All' && filters.type !== order.type) return false;
        if (filters.side !== 'All' && order.side !== filters.side) return false;
        if (filters.instrument !== 'All' && (order.category || '').toUpperCase() !== filters.instrument.toUpperCase()) return false;
        if (filters.accountId !== 'All' && order.connectionId !== filters.accountId) return false;
        if (filters.status === 'CLOSED' && filters.historyStatus && filters.historyStatus !== 'All' && order.status !== filters.historyStatus) return false;
        return true;
      });

      return [...filtered].sort((a, b) => b.createdTime - a.createdTime);
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

    const filtered = rawOrders.filter(order => {
      // Rule: Do not display orders for inactive/deactivated API keys
      if (!activeKeyIds.has(order.connectionId)) return false;

      if (filters.exchange !== 'All' && order.exchange !== filters.exchange) return false;
      if (filters.status === 'CLOSED' && order.createdTime < now - filters.timePeriod) return false;
      if (symbolsList.length > 0 && !symbolsList.some(sym => order.symbol.toUpperCase().includes(sym))) return false;
      if (filters.type !== 'All' && filters.type !== order.type) return false;
      if (filters.side !== 'All' && order.side !== filters.side) return false;
      if (filters.instrument !== 'All' && (order.category || '').toUpperCase() !== filters.instrument.toUpperCase()) return false;
      if (filters.accountId !== 'All' && order.connectionId !== filters.accountId) return false;
      if (filters.status === 'CLOSED' && filters.historyStatus && filters.historyStatus !== 'All' && order.status !== filters.historyStatus) return false;
      return true;
    });

    return [...filtered].sort((a, b) => b.createdTime - a.createdTime);
  }, [cachedOpenOrders, closedRawOrders, filters, keys, useMockData]);

  return { fetchOrders, orders, loading: filters.status === 'OPEN' ? false : loading, isSyncing, error };
}
