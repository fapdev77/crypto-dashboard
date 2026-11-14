import { useState, useEffect, useMemo, useRef } from 'react';
import mockBybitTxData from '../mock/bybit-transactions.json';
import mockBitgetTxData from '../mock/bitget-transactions.json';
import mockOkxTxData from '../mock/okx-transactions.json';
import type {
  BybitTransactionLogEntry,
  BitgetTransactionLogEntry,
  OkxTransactionLogEntry,
} from '../types';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { getBybitTxLogCache, getBitgetTxLogCache, getOkxTxLogCache } from '../services/historyCache';
import { getUsdPricesForVenues } from '../services/pricing/usdPrice';
import { resolveUsdRate, needsTokenRate } from '../utils/usdAggregation';
import { resolveUtcPeriodDateRange } from '../utils/dateTimeHelper';
import {
  normalizeAllPerformanceEntries,
  scopePerformanceEntries,
  computePortfolioPerformance,
  defaultPerformanceFilters,
  defaultEmptyPerformanceData,
  type PortfolioPerformanceFilters,
  type PrimaryResultMetrics,
  type EvolutionPoint,
  type OperationsResultMetrics,
  type OtherOperationalBreakdown,
  type AdvancedPerformanceMetrics,
  type DayOfWeekItem,
  type TimeOfDayItem,
  type PriceMilestoneItem,
  type PortfolioPerformanceData,
} from '../utils/portfolioPerformanceEngine';

export {
  defaultPerformanceFilters,
  defaultEmptyPerformanceData,
  type PortfolioPerformanceFilters,
  type PrimaryResultMetrics,
  type EvolutionPoint,
  type OperationsResultMetrics,
  type OtherOperationalBreakdown,
  type AdvancedPerformanceMetrics,
  type DayOfWeekItem,
  type TimeOfDayItem,
  type PriceMilestoneItem,
  type PortfolioPerformanceData,
};

export function usePortfolioPerformance(filters: PortfolioPerformanceFilters = defaultPerformanceFilters) {
  const keys = useApiKeysStore((state) => state.keys);
  const useMockData = useSettingsStore((state) => state.useMockData);
  const fiatRates = useSettingsStore((state) => state.fiatRates);
  const historyCacheVersion = useSettingsStore((state) => state.historyCacheVersion);

  const bybitTxLastSyncTime = useSyncCoordinatorStore((state) => state.bybitTxLastSyncTime);
  const bitgetTxLastSyncTime = useSyncCoordinatorStore((state) => state.bitgetTxLastSyncTime);
  const okxTxLastSyncTime = useSyncCoordinatorStore((state) => state.okxTxLastSyncTime);
  const cachedTxLog = useSyncCoordinatorStore((state) => state.cachedTxLog);
  const cachedBitgetTxLog = useSyncCoordinatorStore((state) => state.cachedBitgetTxLog);
  const cachedOkxTxLog = useSyncCoordinatorStore((state) => state.cachedOkxTxLog);
  const isBybitTxSyncing = useSyncCoordinatorStore((state) => state.isBybitTxSyncing);
  const isBitgetTxSyncing = useSyncCoordinatorStore((state) => state.isBitgetTxSyncing);
  const isOkxTxSyncing = useSyncCoordinatorStore((state) => state.isOkxTxSyncing);
  const bybitTxSyncError = useSyncCoordinatorStore((state) => state.bybitTxSyncError);
  const bitgetTxSyncError = useSyncCoordinatorStore((state) => state.bitgetTxSyncError);
  const okxTxSyncError = useSyncCoordinatorStore((state) => state.okxTxSyncError);

  const hasLoadedOnceRef = useRef(false);

  const [bybitEntries, setBybitEntries] = useState<BybitTransactionLogEntry[]>(() => {
    if (useMockData) {
      return [...mockBybitTxData].sort((a: { transactionTime: number }, b: { transactionTime: number }) => b.transactionTime - a.transactionTime) as unknown as BybitTransactionLogEntry[];
    }
    return (cachedTxLog as BybitTransactionLogEntry[]) || [];
  });
  const [bitgetEntries, setBitgetEntries] = useState<BitgetTransactionLogEntry[]>(() => {
    if (useMockData) {
      return [...mockBitgetTxData].sort((a: { transactionTime: number }, b: { transactionTime: number }) => b.transactionTime - a.transactionTime) as unknown as BitgetTransactionLogEntry[];
    }
    return (cachedBitgetTxLog as BitgetTransactionLogEntry[]) || [];
  });
  const [okxEntries, setOkxEntries] = useState<OkxTransactionLogEntry[]>(() => {
    if (useMockData) {
      return [...mockOkxTxData].sort((a: { transactionTime: number }, b: { transactionTime: number }) => b.transactionTime - a.transactionTime) as unknown as OkxTransactionLogEntry[];
    }
    return (cachedOkxTxLog as OkxTransactionLogEntry[]) || [];
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (useMockData) return false;
    const activeKeys = keys.filter((k) => k.isActive);
    if (activeKeys.length === 0) return false;
    const hasCached =
      (cachedTxLog?.length ?? 0) > 0 ||
      (cachedBitgetTxLog?.length ?? 0) > 0 ||
      (cachedOkxTxLog?.length ?? 0) > 0;
    return !hasCached;
  });

  const [tokenRates, setTokenRates] = useState<Record<string, number>>({});
  const [isCalculatingUsd, setIsCalculatingUsd] = useState(false);

  // Sync in-memory store updates immediately when not using mock data
  useEffect(() => {
    if (useMockData) return;
    if (cachedTxLog && cachedTxLog.length > 0) {
      setBybitEntries([...cachedTxLog].sort((a, b) => b.transactionTime - a.transactionTime));
    }
    if (cachedBitgetTxLog && cachedBitgetTxLog.length > 0) {
      setBitgetEntries([...cachedBitgetTxLog].sort((a, b) => b.transactionTime - a.transactionTime));
    }
    if (cachedOkxTxLog && cachedOkxTxLog.length > 0) {
      setOkxEntries([...cachedOkxTxLog].sort((a, b) => b.transactionTime - a.transactionTime));
    }
  }, [useMockData, cachedTxLog, cachedBitgetTxLog, cachedOkxTxLog]);

  // Load entries from IndexedDB cache or mock datasets
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!hasLoadedOnceRef.current) {
        const hasExisting = bybitEntries.length > 0 || bitgetEntries.length > 0 || okxEntries.length > 0;
        if (!hasExisting && !useMockData && keys.filter((k) => k.isActive).length > 0) {
          setIsLoading(true);
        }
      }

      if (useMockData) {
        if (isMounted) {
          setBybitEntries([...mockBybitTxData].sort((a: { transactionTime: number }, b: { transactionTime: number }) => b.transactionTime - a.transactionTime) as unknown as BybitTransactionLogEntry[]);
          setBitgetEntries([...mockBitgetTxData].sort((a: { transactionTime: number }, b: { transactionTime: number }) => b.transactionTime - a.transactionTime) as unknown as BitgetTransactionLogEntry[]);
          setOkxEntries([...mockOkxTxData].sort((a: { transactionTime: number }, b: { transactionTime: number }) => b.transactionTime - a.transactionTime) as unknown as OkxTransactionLogEntry[]);
          hasLoadedOnceRef.current = true;
          setIsLoading(false);
        }
        return;
      }

      const activeKeys = keys.filter((k) => k.isActive);
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

      const bybitKeys = activeKeys.filter((k) => k.exchange.toLowerCase() === 'bybit');
      const bitgetKeys = activeKeys.filter((k) => k.exchange.toLowerCase() === 'bitget');
      const okxKeys = activeKeys.filter((k) => k.exchange.toLowerCase() === 'okx');

      try {
        const [bybitRes, bitgetRes, okxRes] = await Promise.all([
          Promise.all(bybitKeys.map((k) => getBybitTxLogCache(k.id))),
          Promise.all(bitgetKeys.map((k) => getBitgetTxLogCache(k.id))),
          Promise.all(okxKeys.map((k) => getOkxTxLogCache(k.id))),
        ]);

        if (!isMounted) return;

        const mergedBybit = bybitRes.flat().sort((a, b) => b.transactionTime - a.transactionTime);
        const mergedBitget = bitgetRes.flat().sort((a, b) => b.transactionTime - a.transactionTime);
        const mergedOkx = okxRes.flat().sort((a, b) => b.transactionTime - a.transactionTime);

        if (mergedBybit.length > 0 || (cachedTxLog?.length ?? 0) === 0) {
          setBybitEntries(mergedBybit);
        }
        if (mergedBitget.length > 0 || (cachedBitgetTxLog?.length ?? 0) === 0) {
          setBitgetEntries(mergedBitget);
        }
        if (mergedOkx.length > 0 || (cachedOkxTxLog?.length ?? 0) === 0) {
          setOkxEntries(mergedOkx);
        }
      } catch (err) {
        console.error('Error loading portfolio performance logs:', err);
      } finally {
        if (isMounted) {
          hasLoadedOnceRef.current = true;
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [keys, useMockData, historyCacheVersion, bybitTxLastSyncTime, bitgetTxLastSyncTime, okxTxLastSyncTime]);

  // Normalize all entries into unified structure sorted chronologically
  const unifiedEntries = useMemo(
    () => normalizeAllPerformanceEntries({ bybitEntries, bitgetEntries, okxEntries }),
    [bybitEntries, bitgetEntries, okxEntries]
  );

  // Available currencies scoped to currently selected exchange & account
  const availableCurrencies = useMemo(() => {
    const exchFilter = filters.exchange.toLowerCase();
    const accFilter = filters.accountId || 'All';
    const set = new Set<string>();
    unifiedEntries.forEach((e) => {
      if (exchFilter !== 'all' && e.exchange !== exchFilter) return;
      if (accFilter.toLowerCase() !== 'all' && e.connectionId !== accFilter) return;
      if (e.currency) set.add(e.currency);
    });
    return Array.from(set).sort();
  }, [unifiedEntries, filters.exchange, filters.accountId]);

  // Scope entries using standardized UTC date boundaries
  const { scopedUpToEnd, periodEntries: filteredEntries } = useMemo(() => {
    const utcRange = resolveUtcPeriodDateRange(
      filters.timePeriod,
      filters.customStartDate,
      filters.customEndDate
    );
    return scopePerformanceEntries(unifiedEntries, filters, utcRange);
  }, [unifiedEntries, filters]);

  // Currencies without a local USD rate, grouped by the exchange they trade on
  const unpricedByExchange = useMemo(() => {
    const groups: Partial<Record<'bybit' | 'bitget' | 'okx', string[]>> = {};

    scopedUpToEnd.forEach((entry) => {
      const ccy = (entry.currency || '').toUpperCase();
      if (!ccy || !needsTokenRate(ccy, fiatRates) || tokenRates[ccy] !== undefined) return;
      const venue = entry.exchange;
      if (!groups[venue]) groups[venue] = [];
      if (!groups[venue]!.includes(ccy)) groups[venue]!.push(ccy);
    });

    const denom = filters.denomination.toUpperCase();
    if (denom !== 'USD' && needsTokenRate(denom, fiatRates) && tokenRates[denom] === undefined && filteredEntries.length > 0) {
      const venue = filteredEntries[0].exchange;
      if (!groups[venue]) groups[venue] = [];
      if (!groups[venue]!.includes(denom)) groups[venue]!.push(denom);
    }

    return groups;
  }, [scopedUpToEnd, filteredEntries, filters.denomination, fiatRates, tokenRates]);

  const unpricedSignature = Object.entries(unpricedByExchange)
    .map(([exchange, currencies]) => `${exchange}:${(currencies || []).join(',')}`)
    .join('|');

  useEffect(() => {
    let isMounted = true;
    if (!unpricedSignature) {
      if (isCalculatingUsd) setIsCalculatingUsd(false);
      return;
    }

    setIsCalculatingUsd(true);
    getUsdPricesForVenues(unpricedByExchange, fiatRates)
      .then(({ rates }) => {
        if (!isMounted) return;
        if (Object.keys(rates).length > 0) {
          setTokenRates((prev) => ({ ...prev, ...rates }));
        }
        setIsCalculatingUsd(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching portfolio performance USD prices:', err);
        setIsCalculatingUsd(false);
      });
  }, [unpricedSignature]);

  // Core calculations across all 6 analytical suites
  const performanceData = useMemo(
    () =>
      computePortfolioPerformance({
        scopedUpToEnd,
        periodEntries: filteredEntries,
        filters,
        tokenRates,
        fiatRates,
      }),
    [scopedUpToEnd, filteredEntries, filters, tokenRates, fiatRates]
  );

  // Currencies present in the active scope that still have no USD rate
  const missingRates = useMemo(() => {
    const codes = new Set<string>();
    scopedUpToEnd.forEach((entry) => {
      const ccy = (entry.currency || '').toUpperCase();
      if (ccy && resolveUsdRate(ccy, tokenRates, fiatRates) === null) codes.add(ccy);
    });
    return Array.from(codes).sort();
  }, [scopedUpToEnd, tokenRates, fiatRates]);

  const isSyncing = isBybitTxSyncing || isBitgetTxSyncing || isOkxTxSyncing;
  const syncError = bybitTxSyncError || bitgetTxSyncError || okxTxSyncError;

  return {
    filteredEntries,
    performanceData,
    isLoading,
    isSyncing,
    isCalculatingUsd,
    error: syncError,
    availableCurrencies,
    tokenRates,
    missingRates,
  };
}
