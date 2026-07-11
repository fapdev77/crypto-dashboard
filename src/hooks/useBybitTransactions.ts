import { useState, useEffect, useMemo } from 'react';
import mockTxData from '../mock/bybit-transactions.json';
import { BybitTransactionLogEntry } from '../types';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { BybitTransactionService } from '../services/bybit/BybitTransactionService';
import { getBybitTxLogCache } from '../services/historyCache';
import { LogManager } from '../services/LogManager';

export interface TxFilters {
  search: string;
  category: string;     // 'All' | 'linear' | 'inverse' | 'spot' | 'option'
  type: string;         // 'All' | 'TRADE' | 'SETTLEMENT' | ...
  currency: string;     // 'All' | 'USDT' | 'USDC' | 'BTC' | ...
  accountId: string;    // 'All' or connectionId
  timePeriod: number;   // ms
}

const defaultFilters: TxFilters = {
  search: '',
  category: 'All',
  type: 'All',
  currency: 'All',
  accountId: 'All',
  timePeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export interface CurrencyStats {
  totalFunding: string;
  totalFees: string;
  totalCashFlow: string;
  totalChange: string;
  finalBalance: string;
}

export interface TxStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
  /** Aggregated stablecoin values (USDT, USDC) — used for USD display */
  stable: CurrencyStats;
  /** Per-currency breakdown for non-stable coins (BTC, ETH, etc.) */
  perCurrency: Record<string, CurrencyStats>;
}

export function useBybitTransactions(filters: TxFilters = defaultFilters) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const syncStore = useSyncCoordinatorStore();
  const [entries, setEntries] = useState<BybitTransactionLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from cache (or mock data) + sync in background
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      if (useMockData) {
        const sorted = [...mockTxData].sort((a: any, b: any) => b.transactionTime - a.transactionTime) as unknown as BybitTransactionLogEntry[];
        if (isMounted) {
          setEntries(sorted);
          setIsLoading(false);
        }
        return;
      }

      const bybitKeys = keys.filter(k => k.exchange === 'bybit' && k.isActive);
      if (bybitKeys.length === 0) {
        if (isMounted) {
          setEntries([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Load cache first (SWR)
        const allEntries: BybitTransactionLogEntry[] = [];
        for (const key of bybitKeys) {
          const cached = await getBybitTxLogCache(key.id);
          allEntries.push(...cached);
        }
        allEntries.sort((a, b) => b.transactionTime - a.transactionTime);

        if (isMounted) {
          setEntries(allEntries);
          useSyncCoordinatorStore.getState().setCachedTxLog(allEntries as any);
          setIsLoading(false);
        }
      } catch (err) {
        LogManager.error('useBybitTransactions', 'Error loading tx log cache:', err);
        if (isMounted) {
          setError('Failed to load cached transactions');
          setIsLoading(false);
        }
      }
    };

    load();
    return () => { isMounted = false; };
  }, [keys, useMockData]);

  // Apply filters
  const filteredEntries = useMemo(() => {
    let startTime: number | undefined;
    let endTime: number | undefined;
    const now = Date.now();

    // timePeriod === 0 means "All Time" — no time filter
    if (filters.timePeriod > 0) {
      startTime = now - filters.timePeriod;
      endTime = now;
    }

    return BybitTransactionService.filterEntries(entries, {
      search: filters.search || undefined,
      category: filters.category !== 'All' ? filters.category : undefined,
      type: filters.type !== 'All' ? filters.type : undefined,
      currency: filters.currency !== 'All' ? filters.currency : undefined,
      accountId: filters.accountId !== 'All' ? filters.accountId : undefined,
      startTime,
      endTime,
    });
  }, [entries, filters]);

  // Compute stats
  const stats = useMemo<TxStats>(() => {
    const raw = BybitTransactionService.computeStats(filteredEntries);
    return {
      totalCount: raw.totalCount,
      typeBreakdown: raw.typeBreakdown,
      stable: raw.stable,
      perCurrency: raw.perCurrency,
    };
  }, [filteredEntries]);

  return {
    entries,
    filteredEntries,
    isLoading,
    isSyncing: syncStore.isBybitTxSyncing,
    progress: syncStore.bybitTxProgress,
    error,
    stats,
  };
}
