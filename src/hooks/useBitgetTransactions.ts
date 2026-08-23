import { useState, useEffect, useMemo } from 'react';
import { BitgetTransactionLogEntry } from '../types';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { BitgetTransactionService } from '../services/bitget/BitgetTransactionService';
import { getBitgetTxLogCache } from '../services/historyCache';
import { LogManager } from '../services/LogManager';
import { fetchTokenUsdPrice } from './useTokenUsdPrice';
import { getStartOfTodayInMs } from '../utils/dateTimeHelper';
import Big from 'big.js';

export interface BitgetTxFilters {
  search: string;
  category: string;     // 'All' | 'spot' | 'usdt-futures' | 'coin-futures' | 'usdc-futures' | 'margin' | 'other'
  type: string;         // 'All' | specific type
  currency: string;     // 'All' | 'USDT' | 'USDC' | 'BTC' | ...
  accountId: string;    // 'All' or connectionId
  timePeriod: number;   // ms
}

const defaultFilters: BitgetTxFilters = {
  search: '',
  category: 'All',
  type: 'All',
  currency: 'All',
  accountId: 'All',
  timePeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export interface BitgetCurrencyStats {
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

export interface BitgetTxStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
  /** Aggregated stablecoin values (USDT, USDC) */
  stable: BitgetCurrencyStats;
  /** Per-currency breakdown for non-stable coins (BTC, ETH, etc.) */
  perCurrency: Record<string, BitgetCurrencyStats>;
  /** 
   * Grand total in USD (combines stable + dynamically fetched prices for non-stable).
   * Note: uses CURRENT market price, not historical transaction price.
   */
  aggregatedUsd: BitgetCurrencyStats;
}

export function useBitgetTransactions(filters: BitgetTxFilters = defaultFilters) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const syncStore = useSyncCoordinatorStore();

  const [entries, setEntries] = useState<BitgetTransactionLogEntry[]>([]);
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

      const bitgetKeys = keys.filter(k => k.exchange === 'bitget' && k.isActive);
      if (bitgetKeys.length === 0) {
        if (isMounted) {
          setEntries([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Load cache first (SWR)
        const allEntries: BitgetTransactionLogEntry[] = [];
        for (const key of bitgetKeys) {
          const cached = await getBitgetTxLogCache(key.id);
          allEntries.push(...cached);
        }

        allEntries.sort((a, b) => b.transactionTime - a.transactionTime);
        
        if (isMounted) {
          setEntries(allEntries);
          useSyncCoordinatorStore.getState().setCachedBitgetTxLog(allEntries as any);
          setIsLoading(false);
        }
      } catch (err) {
        LogManager.error('BitgetTransactions', 'Error loading tx log cache:', err);
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
      if (filters.timePeriod === 24 * 60 * 60 * 1000) {
        startTime = getStartOfTodayInMs();
      } else {
        startTime = now - filters.timePeriod;
      }
      endTime = now;
    }

    return BitgetTransactionService.filterEntries(entries, {
      search: filters.search || undefined,
      category: filters.category.toLowerCase() !== 'all' ? filters.category : undefined,
      type: filters.type.toLowerCase() !== 'all' ? filters.type : undefined,
      currency: filters.currency.toLowerCase() !== 'all' ? filters.currency : undefined,
      accountId: filters.accountId.toLowerCase() !== 'all' ? filters.accountId : undefined,
      startTime,
      endTime,
    });
  }, [entries, filters]);

  // Compute raw stats
  const rawStats = useMemo(() => {
    return BitgetTransactionService.computeStats(filteredEntries);
  }, [filteredEntries]);

  // Fetch prices for any non-stable currencies we have in rawStats.perCurrency
  useEffect(() => {
    let isMounted = true;
    const currencies = Object.keys(rawStats.perCurrency);
    
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
  }, [Object.keys(rawStats.perCurrency).join(',')]); 

  // Combine raw stats with dynamic USD equivalents
  const stats = useMemo<BitgetTxStats>(() => {
    let totalFundingUsd = new Big(rawStats.stable.totalFunding);
    let totalFeesUsd = new Big(rawStats.stable.totalFees);
    let totalCashFlowUsd = new Big(rawStats.stable.totalCashFlow);
    let totalChangeUsd = new Big(rawStats.stable.totalChange);
    let finalBalanceUsd = new Big(rawStats.stable.finalBalance);
    let totalInflowUsd = new Big(rawStats.stable.totalInflow);
    let totalOutflowUsd = new Big(rawStats.stable.totalOutflow);

    for (const [ccy, vals] of Object.entries(rawStats.perCurrency)) {
      const rate = tokenRates[ccy] || 0;
      
      totalFundingUsd = totalFundingUsd.plus(new Big(vals.totalFunding).times(rate));
      totalFeesUsd = totalFeesUsd.plus(new Big(vals.totalFees).times(rate));
      totalCashFlowUsd = totalCashFlowUsd.plus(new Big(vals.totalCashFlow).times(rate));
      totalChangeUsd = totalChangeUsd.plus(new Big(vals.totalChange).times(rate));
      finalBalanceUsd = finalBalanceUsd.plus(new Big(vals.finalBalance).times(rate));
      totalInflowUsd = totalInflowUsd.plus(new Big(vals.totalInflow).times(rate));
      totalOutflowUsd = totalOutflowUsd.plus(new Big(vals.totalOutflow).times(rate));
    }

    const initialBalanceUsd = finalBalanceUsd.minus(totalChangeUsd).minus(totalInflowUsd).plus(totalOutflowUsd);
    
    const basisUsd = initialBalanceUsd.plus(totalInflowUsd);
    let percentageChangeUsd = 0;
    if (basisUsd.gt(0)) {
      percentageChangeUsd = totalChangeUsd.div(basisUsd).times(100).toNumber();
    } else if (basisUsd.eq(0) && totalChangeUsd.gt(0)) {
      percentageChangeUsd = 100;
    }

    return {
      totalCount: rawStats.totalCount,
      typeBreakdown: rawStats.typeBreakdown,
      stable: rawStats.stable,
      perCurrency: rawStats.perCurrency,
      aggregatedUsd: {
        totalFunding: totalFundingUsd.toString(),
        totalFees: totalFeesUsd.toString(),
        totalCashFlow: totalCashFlowUsd.toString(),
        totalChange: totalChangeUsd.toString(),
        finalBalance: finalBalanceUsd.toString(),
        totalInflow: totalInflowUsd.toString(),
        totalOutflow: totalOutflowUsd.toString(),
        initialBalance: initialBalanceUsd.toString(),
        percentageChange: percentageChangeUsd,
      }
    };
  }, [rawStats, tokenRates]);

  return {
    entries,
    filteredEntries,
    isLoading,
    isSyncing: syncStore.isBitgetTxSyncing,
    isCalculatingUsd,
    progress: syncStore.bitgetTxProgress,
    error,
    stats,
    tokenRates,
  };
}
