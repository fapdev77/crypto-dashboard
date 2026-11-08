import { useState, useEffect, useMemo, useRef } from 'react';
import mockBybitTxData from '../mock/bybit-transactions.json';
import mockBitgetTxData from '../mock/bitget-transactions.json';
import mockOkxTxData from '../mock/okx-transactions.json';
import { BybitTransactionLogEntry, BitgetTransactionLogEntry, OkxTransactionLogEntry } from '../types';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { BybitTransactionService } from '../services/bybit/BybitTransactionService';
import { BitgetTransactionService } from '../services/bitget/BitgetTransactionService';
import { OkxTransactionService } from '../services/okx/OkxTransactionService';
import { getBybitTxLogCache, getBitgetTxLogCache, getOkxTxLogCache } from '../services/historyCache';
import { matchUniversalTxType, UniversalTxType } from '../utils/transactionTypeMapper';
import { fetchTokenUsdPrice } from './useTokenUsdPrice';
import { getStrictCalendarStartTime, resolvePeriodDateRange } from '../utils/dateTimeHelper';
import Big from 'big.js';

export interface ConsolidatedTxFilters {
  search: string;
  exchange: string;     // 'All' | 'bybit' | 'bitget' | 'okx'
  category: string;     // 'All' | specific category
  type: string;         // 'All' | UniversalTxType
  currency: string;     // 'All' | coin symbol
  accountId: string;    // 'All' | connectionId
  timePeriod: number | string;   // ms (0 = All Time), 'mtd', 'ytd', 'custom'
  customStartDate?: string;      // 'YYYY-MM-DD'
  customEndDate?: string;        // 'YYYY-MM-DD'
}

export const defaultConsolidatedFilters: ConsolidatedTxFilters = {
  search: '',
  exchange: 'All',
  category: 'All',
  type: 'All',
  currency: 'All',
  accountId: 'All',
  timePeriod: 0, // All Time
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

export interface ExchangeStatsBlock {
  totalCount: number;
  typeBreakdown: Record<string, number>;
  stable: CurrencyStats;
  perCurrency: Record<string, CurrencyStats>;
  aggregatedUsd: CurrencyStats;
}

export interface ConsolidatedStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
  stable: CurrencyStats;
  perCurrency: Record<string, CurrencyStats>;
  aggregatedUsd: CurrencyStats;
  byExchange: {
    bybit: ExchangeStatsBlock;
    bitget: ExchangeStatsBlock;
    okx: ExchangeStatsBlock;
  };
}

const emptyStatsBlock: ExchangeStatsBlock = {
  totalCount: 0,
  typeBreakdown: {},
  stable: {
    totalFunding: '0',
    totalFees: '0',
    totalCashFlow: '0',
    totalChange: '0',
    finalBalance: '0',
    totalInflow: '0',
    totalOutflow: '0',
    initialBalance: '0',
    percentageChange: 0,
  },
  perCurrency: {},
  aggregatedUsd: {
    totalFunding: '0',
    totalFees: '0',
    totalCashFlow: '0',
    totalChange: '0',
    finalBalance: '0',
    totalInflow: '0',
    totalOutflow: '0',
    initialBalance: '0',
    percentageChange: 0,
  },
};

export function useConsolidatedTransactions(filters: ConsolidatedTxFilters = defaultConsolidatedFilters) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const syncStore = useSyncCoordinatorStore();

  const hasLoadedOnceRef = useRef(false);

  const [bybitEntries, setBybitEntries] = useState<BybitTransactionLogEntry[]>(() => {
    if (useMockData) {
      return [...mockBybitTxData].sort((a: any, b: any) => b.transactionTime - a.transactionTime) as unknown as BybitTransactionLogEntry[];
    }
    return (syncStore.cachedTxLog as BybitTransactionLogEntry[]) || [];
  });
  const [bitgetEntries, setBitgetEntries] = useState<BitgetTransactionLogEntry[]>(() => {
    if (useMockData) {
      return [...mockBitgetTxData].sort((a: any, b: any) => b.transactionTime - a.transactionTime) as unknown as BitgetTransactionLogEntry[];
    }
    return (syncStore.cachedBitgetTxLog as BitgetTransactionLogEntry[]) || [];
  });
  const [okxEntries, setOkxEntries] = useState<OkxTransactionLogEntry[]>(() => {
    if (useMockData) {
      return [...mockOkxTxData].sort((a: any, b: any) => b.transactionTime - a.transactionTime) as unknown as OkxTransactionLogEntry[];
    }
    return (syncStore.cachedOkxTxLog as OkxTransactionLogEntry[]) || [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (useMockData) return false;
    const activeKeys = keys.filter(k => k.isActive);
    if (activeKeys.length === 0) return false;
    const hasCached = (syncStore.cachedTxLog?.length ?? 0) > 0 ||
                      (syncStore.cachedBitgetTxLog?.length ?? 0) > 0 ||
                      (syncStore.cachedOkxTxLog?.length ?? 0) > 0;
    return !hasCached;
  });

  // USD exchange rate cache for non-stable tokens
  const [tokenRates, setTokenRates] = useState<Record<string, number>>({});
  const [isCalculatingUsd, setIsCalculatingUsd] = useState(false);

  // Active exchanges based on user keys or mock data
  const activeExchanges = useMemo(() => {
    if (useMockData) return ['bybit', 'bitget', 'okx'];
    const exchs = new Set<string>();
    keys.filter(k => k.isActive).forEach(k => exchs.add(k.exchange.toLowerCase()));
    return Array.from(exchs);
  }, [keys, useMockData]);

  // Load entries from IndexedDB cache or mock datasets
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // Only set isLoading to true on the very first load if we don't already have entries
      if (!hasLoadedOnceRef.current) {
        const hasExisting = bybitEntries.length > 0 || bitgetEntries.length > 0 || okxEntries.length > 0;
        if (!hasExisting && !useMockData && keys.filter(k => k.isActive).length > 0) {
          setIsLoading(true);
        }
      }

      if (useMockData) {
        if (isMounted) {
          setBybitEntries([...mockBybitTxData].sort((a: any, b: any) => b.transactionTime - a.transactionTime) as unknown as BybitTransactionLogEntry[]);
          setBitgetEntries([...mockBitgetTxData].sort((a: any, b: any) => b.transactionTime - a.transactionTime) as unknown as BitgetTransactionLogEntry[]);
          setOkxEntries([...mockOkxTxData].sort((a: any, b: any) => b.transactionTime - a.transactionTime) as unknown as OkxTransactionLogEntry[]);
          hasLoadedOnceRef.current = true;
          setIsLoading(false);
        }
        return;
      }

      const activeKeys = keys.filter(k => k.isActive);
      if (activeKeys.length === 0) {
        if (isMounted) {
          setBybitEntries([]);
          setBitgetEntries([]);
          setOkxEntries([]);
          hasLoadedOnceRef.current = true;
          setIsLoading(false);
        }
        return;
      }

      const bybitKeys = activeKeys.filter(k => k.exchange.toLowerCase() === 'bybit');
      const bitgetKeys = activeKeys.filter(k => k.exchange.toLowerCase() === 'bitget');
      const okxKeys = activeKeys.filter(k => k.exchange.toLowerCase() === 'okx');

      try {
        const [bybitRes, bitgetRes, okxRes] = await Promise.all([
          Promise.all(bybitKeys.map(k => getBybitTxLogCache(k.id))),
          Promise.all(bitgetKeys.map(k => getBitgetTxLogCache(k.id))),
          Promise.all(okxKeys.map(k => getOkxTxLogCache(k.id))),
        ]);

        if (!isMounted) return;

        const mergedBybit = bybitRes.flat().sort((a, b) => b.transactionTime - a.transactionTime);
        const mergedBitget = bitgetRes.flat().sort((a, b) => b.transactionTime - a.transactionTime);
        const mergedOkx = okxRes.flat().sort((a, b) => b.transactionTime - a.transactionTime);

        setBybitEntries(mergedBybit);
        setBitgetEntries(mergedBitget);
        setOkxEntries(mergedOkx);
      } catch (err) {
        console.error('Error loading consolidated transaction cache:', err);
      } finally {
        if (isMounted) {
          hasLoadedOnceRef.current = true;
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [keys, useMockData, syncStore.bybitTxLastSyncTime, syncStore.bitgetTxLastSyncTime, syncStore.okxTxLastSyncTime]);

  // Filter entries per exchange
  const filteredByExchange = useMemo(() => {
    const filterExch = filters.exchange.toLowerCase();
    const { startTime, endTime } = resolvePeriodDateRange(
      filters.timePeriod,
      filters.customStartDate,
      filters.customEndDate
    );

    // Helper filter function
    const matchesCommon = (
      exchange: 'bybit' | 'bitget' | 'okx',
      entry: {
        symbol?: string;
        currency?: string;
        category?: string;
        transactionTime: number;
        connectionId: string;
        type?: string;
      }
    ) => {
      // Exchange filter
      if (filterExch !== 'all' && filterExch !== exchange) return false;

      // Account filter
      if (filters.accountId && filters.accountId.toLowerCase() !== 'all' && entry.connectionId !== filters.accountId) {
        return false;
      }

      // Time period filter
      if (startTime !== null && entry.transactionTime < startTime) return false;
      if (endTime !== null && entry.transactionTime > endTime) return false;

      // Currency filter
      if (filters.currency && filters.currency.toLowerCase() !== 'all') {
        if ((entry.currency || '').toUpperCase() !== filters.currency.toUpperCase()) return false;
      }

      // Search filter (symbol or currency)
      if (filters.search) {
        const query = filters.search.toLowerCase().trim();
        const sym = (entry.symbol || '').toLowerCase();
        const cur = (entry.currency || '').toLowerCase();
        if (!sym.includes(query) && !cur.includes(query)) return false;
      }

      // Category filter
      if (filters.category && filters.category.toLowerCase() !== 'all') {
        const cat = (entry.category || '').toLowerCase();
        const target = filters.category.toLowerCase();
        if (!cat.includes(target) && !target.includes(cat)) return false;
      }

      // Universal type filter
      if (filters.type && filters.type.toUpperCase() !== 'ALL') {
        if (!matchUniversalTxType(exchange, entry, filters.type)) return false;
      }

      return true;
    };

    const bybit = (filterExch === 'all' || filterExch === 'bybit')
      ? bybitEntries.filter(e => matchesCommon('bybit', e))
      : [];

    const bitget = (filterExch === 'all' || filterExch === 'bitget')
      ? bitgetEntries.filter(e => matchesCommon('bitget', e))
      : [];

    const okx = (filterExch === 'all' || filterExch === 'okx')
      ? okxEntries.filter(e => matchesCommon('okx', e))
      : [];

    return { bybit, bitget, okx };
  }, [bybitEntries, bitgetEntries, okxEntries, filters]);

  // Compute raw stats for each exchange using their respective services
  const rawStatsByExchange = useMemo(() => {
    return {
      bybit: BybitTransactionService.computeStats(filteredByExchange.bybit),
      bitget: BitgetTransactionService.computeStats(filteredByExchange.bitget),
      okx: OkxTransactionService.computeStats(filteredByExchange.okx),
    };
  }, [filteredByExchange]);

  // Collect all non-stable currencies needing USD rates
  const nonStableCurrencies = useMemo(() => {
    const set = new Set<string>();
    [rawStatsByExchange.bybit, rawStatsByExchange.bitget, rawStatsByExchange.okx].forEach(stats => {
      Object.keys(stats.perCurrency).forEach(c => set.add(c.toUpperCase()));
    });
    return Array.from(set);
  }, [rawStatsByExchange]);

  // Fetch prices for any missing non-stable currencies
  useEffect(() => {
    let isMounted = true;
    if (nonStableCurrencies.length === 0) {
      if (isCalculatingUsd) setIsCalculatingUsd(false);
      return;
    }

    const missing = nonStableCurrencies.filter(c => tokenRates[c] === undefined);
    if (missing.length === 0) {
      if (isCalculatingUsd) setIsCalculatingUsd(false);
      return;
    }

    setIsCalculatingUsd(true);

    const fetchRates = async () => {
      const promises = missing.map(c => fetchTokenUsdPrice(c));
      const results = await Promise.all(promises);

      if (!isMounted) return;

      const updatedRates = { ...tokenRates };
      let changed = false;

      missing.forEach((c, idx) => {
        const rate = results[idx];
        if (rate !== null) {
          updatedRates[c] = rate;
          changed = true;
        }
      });

      if (changed) {
        setTokenRates(updatedRates);
      }
      setIsCalculatingUsd(false);
    };

    fetchRates();
  }, [nonStableCurrencies.sort().join(',')]);

  // Combine raw stats with dynamic USD equivalents into final ConsolidatedStats
  const stats = useMemo<ConsolidatedStats>(() => {
    const buildExchangeBlock = (raw: typeof rawStatsByExchange.bybit): ExchangeStatsBlock => {
      let totalFundingUsd = new Big(raw.stable.totalFunding);
      let totalFeesUsd = new Big(raw.stable.totalFees);
      let totalCashFlowUsd = new Big(raw.stable.totalCashFlow);
      let totalChangeUsd = new Big(raw.stable.totalChange);
      let finalBalanceUsd = new Big(raw.stable.finalBalance);
      let totalInflowUsd = new Big(raw.stable.totalInflow);
      let totalOutflowUsd = new Big(raw.stable.totalOutflow);

      for (const [ccy, vals] of Object.entries(raw.perCurrency)) {
        const rate = tokenRates[ccy.toUpperCase()] || 0;
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
        totalCount: raw.totalCount,
        typeBreakdown: raw.typeBreakdown,
        stable: raw.stable,
        perCurrency: raw.perCurrency,
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
        },
      };
    };

    const bybitBlock = buildExchangeBlock(rawStatsByExchange.bybit);
    const bitgetBlock = buildExchangeBlock(rawStatsByExchange.bitget);
    const okxBlock = buildExchangeBlock(rawStatsByExchange.okx);

    // Consolidated global totals across all exchanges
    const combinedTypeBreakdown: Record<string, number> = {};
    let totalCount = 0;

    [bybitBlock, bitgetBlock, okxBlock].forEach(block => {
      totalCount += block.totalCount;
      Object.entries(block.typeBreakdown).forEach(([t, count]) => {
        combinedTypeBreakdown[t] = (combinedTypeBreakdown[t] || 0) + count;
      });
    });

    let totalFundingUsd = new Big(bybitBlock.aggregatedUsd.totalFunding)
      .plus(bitgetBlock.aggregatedUsd.totalFunding)
      .plus(okxBlock.aggregatedUsd.totalFunding);

    let totalFeesUsd = new Big(bybitBlock.aggregatedUsd.totalFees)
      .plus(bitgetBlock.aggregatedUsd.totalFees)
      .plus(okxBlock.aggregatedUsd.totalFees);

    let totalCashFlowUsd = new Big(bybitBlock.aggregatedUsd.totalCashFlow)
      .plus(bitgetBlock.aggregatedUsd.totalCashFlow)
      .plus(okxBlock.aggregatedUsd.totalCashFlow);

    let totalChangeUsd = new Big(bybitBlock.aggregatedUsd.totalChange)
      .plus(bitgetBlock.aggregatedUsd.totalChange)
      .plus(okxBlock.aggregatedUsd.totalChange);

    let finalBalanceUsd = new Big(bybitBlock.aggregatedUsd.finalBalance)
      .plus(bitgetBlock.aggregatedUsd.finalBalance)
      .plus(okxBlock.aggregatedUsd.finalBalance);

    let totalInflowUsd = new Big(bybitBlock.aggregatedUsd.totalInflow)
      .plus(bitgetBlock.aggregatedUsd.totalInflow)
      .plus(okxBlock.aggregatedUsd.totalInflow);

    let totalOutflowUsd = new Big(bybitBlock.aggregatedUsd.totalOutflow)
      .plus(bitgetBlock.aggregatedUsd.totalOutflow)
      .plus(okxBlock.aggregatedUsd.totalOutflow);

    const initialBalanceUsd = finalBalanceUsd.minus(totalChangeUsd).minus(totalInflowUsd).plus(totalOutflowUsd);
    const basisUsd = initialBalanceUsd.plus(totalInflowUsd);
    let percentageChangeUsd = 0;
    if (basisUsd.gt(0)) {
      percentageChangeUsd = totalChangeUsd.div(basisUsd).times(100).toNumber();
    } else if (basisUsd.eq(0) && totalChangeUsd.gt(0)) {
      percentageChangeUsd = 100;
    }

    return {
      totalCount,
      typeBreakdown: combinedTypeBreakdown,
      stable: {
        totalFunding: new Big(bybitBlock.stable.totalFunding).plus(bitgetBlock.stable.totalFunding).plus(okxBlock.stable.totalFunding).toString(),
        totalFees: new Big(bybitBlock.stable.totalFees).plus(bitgetBlock.stable.totalFees).plus(okxBlock.stable.totalFees).toString(),
        totalCashFlow: new Big(bybitBlock.stable.totalCashFlow).plus(bitgetBlock.stable.totalCashFlow).plus(okxBlock.stable.totalCashFlow).toString(),
        totalChange: new Big(bybitBlock.stable.totalChange).plus(bitgetBlock.stable.totalChange).plus(okxBlock.stable.totalChange).toString(),
        finalBalance: new Big(bybitBlock.stable.finalBalance).plus(bitgetBlock.stable.finalBalance).plus(okxBlock.stable.finalBalance).toString(),
        totalInflow: new Big(bybitBlock.stable.totalInflow).plus(bitgetBlock.stable.totalInflow).plus(okxBlock.stable.totalInflow).toString(),
        totalOutflow: new Big(bybitBlock.stable.totalOutflow).plus(bitgetBlock.stable.totalOutflow).plus(okxBlock.stable.totalOutflow).toString(),
        initialBalance: initialBalanceUsd.toString(),
        percentageChange: percentageChangeUsd,
      },
      perCurrency: {}, // Filled dynamically if needed
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
      },
      byExchange: {
        bybit: bybitBlock,
        bitget: bitgetBlock,
        okx: okxBlock,
      },
    };
  }, [rawStatsByExchange, tokenRates]);

  // Multi-exchange sync states
  const isSyncing = syncStore.isBybitTxSyncing || syncStore.isBitgetTxSyncing || syncStore.isOkxTxSyncing;
  const syncError = syncStore.bybitTxSyncError || syncStore.bitgetTxSyncError || syncStore.okxTxSyncError;

  return {
    bybitEntries,
    bitgetEntries,
    okxEntries,
    filteredByExchange,
    isLoading,
    isSyncing,
    isCalculatingUsd,
    error: syncError,
    stats,
    tokenRates,
    activeExchanges,
  };
}
