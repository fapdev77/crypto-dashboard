import { useState, useEffect, useMemo } from 'react';
import mockTxData from '../mock/bybit-transactions.json';
import { BybitTransactionLogEntry } from '../types';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { BybitTransactionService } from '../services/bybit/BybitTransactionService';
import { getBybitTxLogCache } from '../services/historyCache';
import { LogManager } from '../services/LogManager';
import { fetchTokenUsdPrice } from './useTokenUsdPrice';
import { getStartOfTodayInMs, resolvePeriodDateRange } from '../utils/dateTimeHelper';
import { aggregateStatsToUsd, needsTokenRate } from '../utils/usdAggregation';

export interface TxFilters {
  search: string;
  category: string;     // 'All' | 'linear' | 'inverse' | 'spot' | 'option'
  type: string;         // 'All' | 'TRADE' | 'SETTLEMENT' | ...
  currency: string;     // 'All' | 'USDT' | 'USDC' | 'BTC' | ...
  accountId: string;    // 'All' or connectionId
  timePeriod: number | string; // ms (0 = All Time), 'mtd', 'ytd', 'custom'
  customStartDate?: string;
  customEndDate?: string;
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
  totalInflow: string;
  totalOutflow: string;
  initialBalance: string;
  percentageChange: number;
}

export interface TxStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
  /** Aggregated stablecoin values (USDT, USDC) */
  stable: CurrencyStats;
  /** Per-currency breakdown for every currency, stablecoins included */
  perCurrency: Record<string, CurrencyStats>;
  /** 
   * Grand total in USD (combines stable + dynamically fetched prices for non-stable).
   * Note: uses CURRENT market price, not historical transaction price.
   */
  aggregatedUsd: CurrencyStats;
  /** Currencies excluded from the USD totals because no price was available. */
  missingRates: string[];
}

export function useBybitTransactions(filters: TxFilters = defaultFilters) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const fiatRates = useSettingsStore(state => state.fiatRates);
  const syncStore = useSyncCoordinatorStore();

  const [entries, setEntries] = useState<BybitTransactionLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State to hold the current USD rates of non-stable currencies
  const [tokenRates, setTokenRates] = useState<Record<string, number>>({});
  const [isCalculatingUsd, setIsCalculatingUsd] = useState(false);

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
        LogManager.error('BybitTransactions', 'Error loading tx log cache:', err);
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
    const { startTime, endTime } = resolvePeriodDateRange(
      filters.timePeriod,
      filters.customStartDate,
      filters.customEndDate
    );

    return BybitTransactionService.filterEntries(entries, {
      search: filters.search || undefined,
      category: filters.category.toLowerCase() !== 'all' ? filters.category : undefined,
      type: filters.type.toLowerCase() !== 'all' ? filters.type : undefined,
      currency: filters.currency.toLowerCase() !== 'all' ? filters.currency : undefined,
      accountId: filters.accountId.toLowerCase() !== 'all' ? filters.accountId : undefined,
      startTime: startTime ?? undefined,
      endTime: endTime ?? undefined,
    });
  }, [entries, filters]);

  // Compute raw stats
  const rawStats = useMemo(() => {
    return BybitTransactionService.computeStats(filteredEntries);
  }, [filteredEntries]);

  // Fetch prices for any non-stable currencies we have in rawStats.perCurrency
  useEffect(() => {
    let isMounted = true;
    const currencies = Object.keys(rawStats.perCurrency).filter(ccy => needsTokenRate(ccy, fiatRates));
    
    if (currencies.length === 0) {
      if (isCalculatingUsd) setIsCalculatingUsd(false);
      return;
    }

    const fetchRates = async () => {
      // Find currencies we don't have rates for yet
      const missingCurrencies = currencies.filter(ccy => tokenRates[ccy] === undefined);
      
      if (missingCurrencies.length === 0) {
        if (isMounted) setIsCalculatingUsd(false);
        return;
      }

      if (isMounted) setIsCalculatingUsd(true);

      const promises = missingCurrencies.map(ccy => fetchTokenUsdPrice(ccy));
      const results = await Promise.all(promises);

      if (!isMounted) return;

      const newRates = { ...tokenRates };
      let updated = false;

      missingCurrencies.forEach((ccy, index) => {
        const price = results[index];
        if (price !== null) {
          newRates[ccy] = price;
          updated = true;
        }
      });

      if (updated) {
        setTokenRates(newRates);
      }
      setIsCalculatingUsd(false);
    };

    fetchRates();
    // We intentionally only depend on the keys of perCurrency, not the whole object, to avoid refetches
  }, [Object.keys(rawStats.perCurrency).join(','), fiatRates]); 

  // Combine raw stats with dynamic USD equivalents
  const stats = useMemo<TxStats>(() => {
    // perCurrency contains every currency (stablecoins included), so a single
    // shared aggregation keeps page, consolidated dashboard and export aligned.
    const { stats: aggregatedUsd, missingRates } = aggregateStatsToUsd(rawStats.perCurrency, tokenRates, fiatRates);

    return {
      totalCount: rawStats.totalCount,
      typeBreakdown: rawStats.typeBreakdown,
      stable: rawStats.stable,
      perCurrency: rawStats.perCurrency,
      aggregatedUsd,
      missingRates: rawStats.totalCount > 0 ? missingRates : [],
    };
  }, [rawStats, tokenRates, fiatRates]);

  return {
    entries,
    filteredEntries,
    isLoading,
    isSyncing: syncStore.isBybitTxSyncing,
    isCalculatingUsd,
    progress: syncStore.bybitTxProgress,
    error: error || syncStore.bybitTxSyncError,
    stats,
    tokenRates,
  };
}
