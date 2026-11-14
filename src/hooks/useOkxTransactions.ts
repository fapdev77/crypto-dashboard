import { useState, useEffect, useMemo } from 'react';
import mockOkxTxData from '../mock/okx-transactions.json';
import { OkxTransactionLogEntry } from '../types';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { OkxTransactionService } from '../services/okx/OkxTransactionService';
import { getOkxTxLogCache } from '../services/historyCache';
import { LogManager } from '../services/LogManager';
import { getUsdPrices } from '../services/pricing/usdPrice';
import { getStartOfTodayInMs, resolvePeriodDateRange } from '../utils/dateTimeHelper';
import { aggregateStatsToUsd, needsTokenRate } from '../utils/usdAggregation';

export interface OkxTxFilters {
  search: string;
  category: string;     // 'All' | 'SPOT' | 'MARGIN' | 'SWAP' | 'FUTURES' | 'OPTION'
  type: string;         // 'All' | '1' | '2' | '8' | ...
  currency: string;     // 'All' | 'USDT' | 'USDC' | 'BTC' | ...
  accountId: string;    // 'All' or connectionId
  timePeriod: number | string; // ms (0 = All Time), 'mtd', 'ytd', 'custom'
  customStartDate?: string;
  customEndDate?: string;
}

const defaultFilters: OkxTxFilters = {
  search: '',
  category: 'All',
  type: 'All',
  currency: 'All',
  accountId: 'All',
  timePeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export interface OkxCurrencyStats {
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

export interface OkxTxStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
  /** Aggregated stablecoin values (USDT, USDC) */
  stable: OkxCurrencyStats;
  /** Per-currency breakdown for every currency, stablecoins included */
  perCurrency: Record<string, OkxCurrencyStats>;
  /** 
   * Grand total in USD (combines stable + dynamically fetched prices for non-stable).
   * Note: uses CURRENT market price, not historical transaction price.
   */
  aggregatedUsd: OkxCurrencyStats;
  /** Currencies excluded from the USD totals because no price was available. */
  missingRates: string[];
}

export function useOkxTransactions(filters: OkxTxFilters = defaultFilters) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const fiatRates = useSettingsStore(state => state.fiatRates);
  const syncStore = useSyncCoordinatorStore();

  const [entries, setEntries] = useState<OkxTransactionLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State to hold the current USD rates of non-stable currencies
  const [tokenRates, setTokenRates] = useState<Record<string, number>>({});
  const [isCalculatingUsd, setIsCalculatingUsd] = useState(false);

  // Load from cache + sync in background
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      if (useMockData) {
        const sorted = [...mockOkxTxData].sort((a: any, b: any) => b.transactionTime - a.transactionTime) as unknown as OkxTransactionLogEntry[];
        if (isMounted) {
          setEntries(sorted);
          setIsLoading(false);
        }
        return;
      }

      const okxKeys = keys.filter(k => k.exchange === 'okx' && k.isActive);
      if (okxKeys.length === 0) {
        if (isMounted) {
          setEntries([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Load cache first (SWR)
        const allEntries: OkxTransactionLogEntry[] = [];
        for (const key of okxKeys) {
          const cached = await getOkxTxLogCache(key.id);
          allEntries.push(...cached);
        }

        allEntries.sort((a, b) => b.transactionTime - a.transactionTime);
        
        if (isMounted) {
          setEntries(allEntries);
          useSyncCoordinatorStore.getState().setCachedOkxTxLog(allEntries as any);
          setIsLoading(false);
        }
      } catch (err) {
        LogManager.error('OkxTransactions', 'Error loading tx log cache:', err);
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

    return OkxTransactionService.filterEntries(entries, {
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
    return OkxTransactionService.computeStats(filteredEntries);
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
      const missingCurrencies = currencies.filter(ccy => tokenRates[ccy] === undefined);
      
      if (missingCurrencies.length === 0) {
        if (isMounted) setIsCalculatingUsd(false);
        return;
      }

      if (isMounted) setIsCalculatingUsd(true);

      const { rates } = await getUsdPrices(missingCurrencies, { exchange: 'okx', fiatRates });

      if (!isMounted) return;

      if (Object.keys(rates).length > 0) {
        setTokenRates({ ...tokenRates, ...rates });
      }
      setIsCalculatingUsd(false);
    };

    fetchRates();
  }, [Object.keys(rawStats.perCurrency).join(','), fiatRates]); 

  // Combine raw stats with dynamic USD equivalents
  const stats = useMemo<OkxTxStats>(() => {
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
    isSyncing: syncStore.isOkxTxSyncing,
    isCalculatingUsd,
    progress: syncStore.okxTxProgress,
    error: error || syncStore.okxTxSyncError,
    stats,
    tokenRates,
  };
}
