import { useState, useEffect, useMemo, useRef } from 'react';
import Big from 'big.js';
import mockBybitTxData from '../mock/bybit-transactions.json';
import mockBitgetTxData from '../mock/bitget-transactions.json';
import mockOkxTxData from '../mock/okx-transactions.json';
import { BybitTransactionLogEntry, BitgetTransactionLogEntry, OkxTransactionLogEntry } from '../types';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { getBybitTxLogCache, getBitgetTxLogCache, getOkxTxLogCache } from '../services/historyCache';
import { getBybitUniversalType, getBitgetUniversalType, getOkxUniversalType } from '../utils/transactionTypeMapper';
import { fetchTokenUsdPrice } from './useTokenUsdPrice';
import { getStrictCalendarStartTime, resolvePeriodDateRange } from '../utils/dateTimeHelper';

export interface PortfolioPerformanceFilters {
  exchange: string;       // 'All' | 'bybit' | 'bitget' | 'okx'
  accountId: string;      // 'All' | connectionId
  denomination: string;   // 'USD' | 'BTC' | 'ETH' | 'USDT' | ...
  timePeriod: number | string; // ms (0 = All Time), 'mtd', 'ytd', 'custom'
  customStartDate?: string;    // 'YYYY-MM-DD'
  customEndDate?: string;      // 'YYYY-MM-DD'
  milestoneStep: number;  // Price interval (e.g. 2500 for BTC)
}

export const defaultPerformanceFilters: PortfolioPerformanceFilters = {
  exchange: 'All',
  accountId: 'All',
  denomination: 'BTC',    // Default to BTC like the model report, or switchable to USD/others
  timePeriod: 7 * 24 * 60 * 60 * 1000, // Default to 7 Days for fast initial load
  milestoneStep: 2500,    // Default $2,500 for BTC
};

export interface PrimaryResultMetrics {
  percentageGain: number;
  absoluteGain: string;
  absoluteGainUsd: string;
  initialBalance: string;
  finalBalance: string;
  dailyAverageRoi: number;
  depositsInPeriod: string;
  durationDays: number;
  earliestDate: string;
  latestDate: string;
}

export interface EvolutionPoint {
  timestamp: number;
  dateStr: string;
  tradingGain: number;
  fundingGain: number;
  totalGain: number;
}

export interface OperationsResultMetrics {
  grossCashFlow: string;
  feesPaid: string;
  netTradingPnl: string;
  fundingReceived: string;
  fundingPaid: string;
  netFunding: string;
  fundingRatio: string;
  totalTrades: number;
  buysCount: number;
  sellsCount: number;
  buysPct: number;
  sellsPct: number;
  tradesPerDay: number;
  feeCostPct: number;
  feeStatus: 'Excellent' | 'Acceptable' | 'Moderate' | 'High';
  feeInterpretation: string;
  feeAction: string;
}

export interface AdvancedPerformanceMetrics {
  winRate: number;
  positiveDaysCount: number;
  totalDaysEvaluated: number;
  profitFactor: number;
  profitFactorRating: string;
  totalGains: string;
  totalLosses: string;
  consistencyIndexCv: number;
  consistencyRating: string;
}

export interface DayOfWeekItem {
  dayName: string;
  dayIndex: number;
  trades: number;
  tradingGain: number;
  fundingGain: number;
  totalGain: number;
}

export interface TimeOfDayItem {
  periodLabel: string;
  trades: number;
  tradingGain: number;
  fundingGain: number;
  totalGain: number;
}

export interface PriceMilestoneItem {
  milestonePrice: number;
  formattedMilestone: string;
  passages: number;
  firstPassageEquity: number;
  lastPassageEquity: number;
  gainLoss: number;
  gainLossFormatted: string;
  gainLossPct: number;
}

export const defaultEmptyPerformanceData = {
  primaryResult: {
    percentageGain: 0,
    absoluteGain: '0.0000',
    absoluteGainUsd: '0.00',
    initialBalance: '0.0000',
    finalBalance: '0.0000',
    dailyAverageRoi: 0,
    depositsInPeriod: '0.0000',
    durationDays: 0,
    earliestDate: '-',
    latestDate: '-',
  },
  operations: {
    grossCashFlow: '0.0000',
    feesPaid: '0.0000',
    netTradingPnl: '0.0000',
    fundingReceived: '0.0000',
    fundingPaid: '0.0000',
    netFunding: '0.0000',
    fundingRatio: '0.00x',
    totalTrades: 0,
    buysCount: 0,
    sellsCount: 0,
    buysPct: 0,
    sellsPct: 0,
    tradesPerDay: 0,
    feeCostPct: 0,
    feeStatus: 'Excellent' as const,
    feeInterpretation: 'No trade or fee data available for this selection.',
    feeAction: 'Execute trades to monitor fee impact.',
  },
  advancedMetrics: {
    winRate: 0,
    positiveDaysCount: 0,
    totalDaysEvaluated: 0,
    profitFactor: 0,
    profitFactorRating: 'Acceptable',
    totalGains: '0.0000',
    totalLosses: '0.0000',
    consistencyIndexCv: 0,
    consistencyRating: 'Moderate Consistency',
  },
  evolutionSeries: [] as EvolutionPoint[],
  dayOfWeek: {
    list: [
      { dayName: 'Monday', dayIndex: 1, trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
      { dayName: 'Tuesday', dayIndex: 2, trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
      { dayName: 'Wednesday', dayIndex: 3, trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
      { dayName: 'Thursday', dayIndex: 4, trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
      { dayName: 'Friday', dayIndex: 5, trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
      { dayName: 'Saturday', dayIndex: 6, trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
      { dayName: 'Sunday', dayIndex: 0, trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
    ],
    bestDay: { name: '-', gain: 0 },
    worstDay: { name: '-', gain: 0 },
  },
  timeOfDay: {
    list: [
      { periodLabel: '00h - 04h', trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
      { periodLabel: '04h - 08h', trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
      { periodLabel: '08h - 12h', trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
      { periodLabel: '12h - 16h', trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
      { periodLabel: '16h - 20h', trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
      { periodLabel: '20h - 24h', trades: 0, tradingGain: 0, fundingGain: 0, totalGain: 0 },
    ],
    bestTime: { period: '-', gain: 0 },
    worstTime: { period: '-', gain: 0 },
  },
  priceMilestones: [] as PriceMilestoneItem[],
};

export function usePortfolioPerformance(filters: PortfolioPerformanceFilters = defaultPerformanceFilters) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const bybitTxLastSyncTime = useSyncCoordinatorStore(state => state.bybitTxLastSyncTime);
  const bitgetTxLastSyncTime = useSyncCoordinatorStore(state => state.bitgetTxLastSyncTime);
  const okxTxLastSyncTime = useSyncCoordinatorStore(state => state.okxTxLastSyncTime);
  const cachedTxLog = useSyncCoordinatorStore(state => state.cachedTxLog);
  const cachedBitgetTxLog = useSyncCoordinatorStore(state => state.cachedBitgetTxLog);
  const cachedOkxTxLog = useSyncCoordinatorStore(state => state.cachedOkxTxLog);
  const isBybitTxSyncing = useSyncCoordinatorStore(state => state.isBybitTxSyncing);
  const isBitgetTxSyncing = useSyncCoordinatorStore(state => state.isBitgetTxSyncing);
  const isOkxTxSyncing = useSyncCoordinatorStore(state => state.isOkxTxSyncing);
  const bybitTxSyncError = useSyncCoordinatorStore(state => state.bybitTxSyncError);
  const bitgetTxSyncError = useSyncCoordinatorStore(state => state.bitgetTxSyncError);
  const okxTxSyncError = useSyncCoordinatorStore(state => state.okxTxSyncError);

  const hasLoadedOnceRef = useRef(false);

  const [bybitEntries, setBybitEntries] = useState<BybitTransactionLogEntry[]>(() => {
    if (useMockData) {
      return [...mockBybitTxData].sort((a: any, b: any) => b.transactionTime - a.transactionTime) as unknown as BybitTransactionLogEntry[];
    }
    return (cachedTxLog as BybitTransactionLogEntry[]) || [];
  });
  const [bitgetEntries, setBitgetEntries] = useState<BitgetTransactionLogEntry[]>(() => {
    if (useMockData) {
      return [...mockBitgetTxData].sort((a: any, b: any) => b.transactionTime - a.transactionTime) as unknown as BitgetTransactionLogEntry[];
    }
    return (cachedBitgetTxLog as BitgetTransactionLogEntry[]) || [];
  });
  const [okxEntries, setOkxEntries] = useState<OkxTransactionLogEntry[]>(() => {
    if (useMockData) {
      return [...mockOkxTxData].sort((a: any, b: any) => b.transactionTime - a.transactionTime) as unknown as OkxTransactionLogEntry[];
    }
    return (cachedOkxTxLog as OkxTransactionLogEntry[]) || [];
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (useMockData) return false;
    const activeKeys = keys.filter(k => k.isActive);
    if (activeKeys.length === 0) return false;
    const hasCached = (cachedTxLog?.length ?? 0) > 0 ||
                      (cachedBitgetTxLog?.length ?? 0) > 0 ||
                      (cachedOkxTxLog?.length ?? 0) > 0;
    return !hasCached;
  });

  const [tokenRates, setTokenRates] = useState<Record<string, number>>({});
  const [isCalculatingUsd, setIsCalculatingUsd] = useState(false);

  // Load entries from cache/mock
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
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

        setBybitEntries(bybitRes.flat().sort((a, b) => b.transactionTime - a.transactionTime));
        setBitgetEntries(bitgetRes.flat().sort((a, b) => b.transactionTime - a.transactionTime));
        setOkxEntries(okxRes.flat().sort((a, b) => b.transactionTime - a.transactionTime));
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
  }, [keys, useMockData, bybitTxLastSyncTime, bitgetTxLastSyncTime, okxTxLastSyncTime]);

  // Available currencies across all entries
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>();
    [...bybitEntries, ...bitgetEntries, ...okxEntries].forEach(e => {
      if (e.currency) set.add(e.currency.toUpperCase());
    });
    return Array.from(set).sort();
  }, [bybitEntries, bitgetEntries, okxEntries]);

  // Fetch USD prices for non-stable tokens
  useEffect(() => {
    let isMounted = true;
    const nonStables = availableCurrencies.filter(c => !['USDT', 'USDC', 'USD', 'DAI', 'BUSD'].includes(c));
    const missing = nonStables.filter(c => tokenRates[c] === undefined);

    if (missing.length === 0) return;

    setIsCalculatingUsd(true);
    Promise.all(missing.map(c => fetchTokenUsdPrice(c))).then(results => {
      if (!isMounted) return;
      const updated = { ...tokenRates };
      let changed = false;
      missing.forEach((c, idx) => {
        if (results[idx] !== null) {
          updated[c] = results[idx] as number;
          changed = true;
        }
      });
      if (changed) setTokenRates(updated);
      setIsCalculatingUsd(false);
    });
  }, [availableCurrencies.join(',')]);

  // Normalize all entries into a unified structure
  const unifiedEntries = useMemo(() => {
    const list: Array<{
      exchange: 'bybit' | 'bitget' | 'okx';
      connectionId: string;
      symbol: string;
      currency: string;
      side: string;
      transactionTime: number;
      type: string;
      universalType: string;
      tradePrice: number;
      funding: number;
      fee: number;
      cashFlow: number;
      change: number;
      cashBalance: number;
    }> = [];

    bybitEntries.forEach(e => {
      const uType = getBybitUniversalType(e.type, e.funding);
      list.push({
        exchange: 'bybit',
        connectionId: e.connectionId,
        symbol: e.symbol || '',
        currency: (e.currency || '').toUpperCase(),
        side: e.side || 'None',
        transactionTime: e.transactionTime,
        type: e.type,
        universalType: uType,
        tradePrice: parseFloat(e.tradePrice || '0') || 0,
        funding: parseFloat(e.funding || '0') || 0,
        fee: Math.abs(parseFloat(e.fee || '0') || 0),
        cashFlow: parseFloat(e.cashFlow || '0') || 0,
        change: parseFloat(e.change || '0') || 0,
        cashBalance: parseFloat(e.cashBalance || '0') || 0,
      });
    });

    bitgetEntries.forEach(e => {
      const uType = getBitgetUniversalType(e.type, e.funding);
      list.push({
        exchange: 'bitget',
        connectionId: e.connectionId,
        symbol: e.symbol || '',
        currency: (e.currency || '').toUpperCase(),
        side: e.side || 'None',
        transactionTime: e.transactionTime,
        type: e.type,
        universalType: uType,
        tradePrice: parseFloat(e.tradePrice || '0') || 0,
        funding: parseFloat(e.funding || '0') || 0,
        fee: Math.abs(parseFloat(e.fee || '0') || 0),
        cashFlow: parseFloat(e.cashFlow || '0') || 0,
        change: parseFloat(e.change || '0') || 0,
        cashBalance: parseFloat(e.cashBalance || e.balance || '0') || 0,
      });
    });

    okxEntries.forEach(e => {
      const uType = getOkxUniversalType(e);
      list.push({
        exchange: 'okx',
        connectionId: e.connectionId,
        symbol: e.symbol || '',
        currency: (e.currency || '').toUpperCase(),
        side: e.side || 'None',
        transactionTime: e.transactionTime,
        type: e.type,
        universalType: uType,
        tradePrice: parseFloat(e.tradePrice || '0') || 0,
        funding: parseFloat(e.funding || '0') || 0,
        fee: Math.abs(parseFloat(e.fee || '0') || 0),
        cashFlow: parseFloat(e.cashFlow || '0') || 0,
        change: parseFloat(e.change || '0') || 0,
        cashBalance: parseFloat(e.cashBalance || e.balance || '0') || 0,
      });
    });

    return list.sort((a, b) => a.transactionTime - b.transactionTime);
  }, [bybitEntries, bitgetEntries, okxEntries]);

  // Apply filters to unified entries
  const filteredEntries = useMemo(() => {
    const exchFilter = filters.exchange.toLowerCase();
    const { startTime, endTime } = resolvePeriodDateRange(
      filters.timePeriod,
      filters.customStartDate,
      filters.customEndDate
    );
    const isUsdDenom = filters.denomination === 'USD';

    return unifiedEntries.filter(e => {
      if (exchFilter !== 'all' && e.exchange !== exchFilter) return false;
      if (filters.accountId && filters.accountId.toLowerCase() !== 'all' && e.connectionId !== filters.accountId) {
        return false;
      }
      if (startTime !== null && e.transactionTime < startTime) return false;
      if (endTime !== null && e.transactionTime > endTime) return false;

      // Currency / Denomination filter
      if (!isUsdDenom) {
        if (e.currency !== filters.denomination.toUpperCase()) return false;
      }

      return true;
    });
  }, [unifiedEntries, filters]);

  // Core calculations and 7 analytical suites
  const performanceData = useMemo(() => {
    if (filteredEntries.length === 0) {
      return defaultEmptyPerformanceData;
    }

    const isUsdDenom = filters.denomination === 'USD';
    const rateOf = (ccy: string) => {
      if (['USDT', 'USDC', 'USD', 'DAI', 'BUSD'].includes(ccy)) return 1;
      return tokenRates[ccy] || 0;
    };

    // Conversion helper: converts amount to target denomination
    const toDenom = (amount: number, ccy: string): number => {
      if (isUsdDenom) {
        return amount * rateOf(ccy);
      }
      // If we are evaluating in BTC and the record is in BTC, 1:1
      if (ccy === filters.denomination.toUpperCase()) return amount;
      // Cross-asset conversion if available
      const fromUsd = amount * rateOf(ccy);
      const targetRate = rateOf(filters.denomination);
      return targetRate > 0 ? fromUsd / targetRate : amount;
    };

    const earliestTime = filteredEntries[0].transactionTime;
    const latestTime = filteredEntries[filteredEntries.length - 1].transactionTime;
    const durationDays = Math.max(1, Math.ceil((latestTime - earliestTime) / (1000 * 60 * 60 * 24)));

    // ── 1. Primary Result & Operations ──
    let grossCashFlow = new Big(0);
    let feesPaid = new Big(0);
    let netTradingPnl = new Big(0);
    let fundingReceived = new Big(0);
    let fundingPaid = new Big(0);
    let netFunding = new Big(0);

    let depositsInPeriod = new Big(0);
    let totalInflow = new Big(0);
    let totalOutflow = new Big(0);

    let totalTrades = 0;
    let buysCount = 0;
    let sellsCount = 0;

    // Daily buckets for Win Rate & Profit Factor
    const dailyMap: Record<string, { trading: number; funding: number; total: number; trades: number }> = {};
    // Day of week buckets (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const dayOfWeekMap: Record<number, { trades: number; trading: number; funding: number; total: number }> = {
      0: { trades: 0, trading: 0, funding: 0, total: 0 },
      1: { trades: 0, trading: 0, funding: 0, total: 0 },
      2: { trades: 0, trading: 0, funding: 0, total: 0 },
      3: { trades: 0, trading: 0, funding: 0, total: 0 },
      4: { trades: 0, trading: 0, funding: 0, total: 0 },
      5: { trades: 0, trading: 0, funding: 0, total: 0 },
      6: { trades: 0, trading: 0, funding: 0, total: 0 },
    };
    // Time of day buckets (6 x 4h)
    const timeOfDayMap: Record<number, { trades: number; trading: number; funding: number; total: number }> = {
      0: { trades: 0, trading: 0, funding: 0, total: 0 }, // 00-04h
      1: { trades: 0, trading: 0, funding: 0, total: 0 }, // 04-08h
      2: { trades: 0, trading: 0, funding: 0, total: 0 }, // 08-12h
      3: { trades: 0, trading: 0, funding: 0, total: 0 }, // 12-16h
      4: { trades: 0, trading: 0, funding: 0, total: 0 }, // 16-20h
      5: { trades: 0, trading: 0, funding: 0, total: 0 }, // 20-24h
    };

    // Cumulative evolution series
    const evolutionSeries: EvolutionPoint[] = [];
    let runningTrading = 0;
    let runningFunding = 0;

    // Price milestone passages map: milestonePrice -> { count, firstEquity, lastEquity }
    const milestoneStep = filters.milestoneStep > 0 ? filters.milestoneStep : 2500;
    const milestoneMap: Record<number, { count: number; firstEquity: number; lastEquity: number }> = {};

    filteredEntries.forEach(e => {
      const valDenom = toDenom(e.change, e.currency);
      const feeDenom = toDenom(e.fee, e.currency);
      const cashFlowDenom = toDenom(e.cashFlow, e.currency);
      const fundingDenom = toDenom(e.funding, e.currency);

      const d = new Date(e.transactionTime);
      const dateKey = d.toISOString().split('T')[0];
      const dow = d.getDay(); // 0 is Sunday
      const hour = d.getHours();
      const periodBucket = Math.floor(hour / 4);

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { trading: 0, funding: 0, total: 0, trades: 0 };
      }

      // Check transaction category
      if (e.universalType === 'TRANSFER_IN') {
        depositsInPeriod = depositsInPeriod.plus(new Big(Math.abs(valDenom)));
        totalInflow = totalInflow.plus(new Big(Math.abs(valDenom)));
      } else if (e.universalType === 'TRANSFER_OUT') {
        totalOutflow = totalOutflow.plus(new Big(Math.abs(valDenom)));
      } else if (e.universalType === 'TRADE') {
        totalTrades++;
        const s = e.side.toLowerCase();
        if (s.includes('buy') || s.includes('long')) buysCount++;
        if (s.includes('sell') || s.includes('short')) sellsCount++;

        if (cashFlowDenom > 0) grossCashFlow = grossCashFlow.plus(new Big(cashFlowDenom));
        feesPaid = feesPaid.plus(new Big(feeDenom));
        netTradingPnl = netTradingPnl.plus(new Big(valDenom));

        runningTrading += valDenom;

        dailyMap[dateKey].trading += valDenom;
        dailyMap[dateKey].total += valDenom;
        dailyMap[dateKey].trades++;

        dayOfWeekMap[dow].trading += valDenom;
        dayOfWeekMap[dow].total += valDenom;
        dayOfWeekMap[dow].trades++;

        timeOfDayMap[periodBucket].trading += valDenom;
        timeOfDayMap[periodBucket].total += valDenom;
        timeOfDayMap[periodBucket].trades++;

        // Track price milestone if price exists
        if (e.tradePrice > 0) {
          const milestone = Math.round(e.tradePrice / milestoneStep) * milestoneStep;
          const currentEquity = e.cashBalance > 0 ? toDenom(e.cashBalance, e.currency) : (runningTrading + runningFunding);
          if (!milestoneMap[milestone]) {
            milestoneMap[milestone] = { count: 1, firstEquity: currentEquity, lastEquity: currentEquity };
          } else {
            milestoneMap[milestone].count++;
            milestoneMap[milestone].lastEquity = currentEquity;
          }
        }
      } else if (e.universalType === 'FUNDING_FEE' || e.funding !== 0) {
        if (fundingDenom > 0) {
          fundingReceived = fundingReceived.plus(new Big(fundingDenom));
        } else {
          fundingPaid = fundingPaid.plus(new Big(Math.abs(fundingDenom)));
        }
        netFunding = netFunding.plus(new Big(fundingDenom));

        runningFunding += fundingDenom;

        dailyMap[dateKey].funding += fundingDenom;
        dailyMap[dateKey].total += fundingDenom;

        dayOfWeekMap[dow].funding += fundingDenom;
        dayOfWeekMap[dow].total += fundingDenom;

        timeOfDayMap[periodBucket].funding += fundingDenom;
        timeOfDayMap[periodBucket].total += fundingDenom;
      }

      // Add points to evolution series (sample daily or major transitions)
      evolutionSeries.push({
        timestamp: e.transactionTime,
        dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tradingGain: Number(runningTrading.toFixed(isUsdDenom ? 2 : 8)),
        fundingGain: Number(runningFunding.toFixed(isUsdDenom ? 2 : 8)),
        totalGain: Number((runningTrading + runningFunding).toFixed(isUsdDenom ? 2 : 8)),
      });
    });

    const absoluteGainBig = netTradingPnl.plus(netFunding);
    const latestBalanceRaw = filteredEntries[filteredEntries.length - 1].cashBalance;
    const finalBalanceBig = latestBalanceRaw > 0 ? new Big(toDenom(latestBalanceRaw, filteredEntries[filteredEntries.length - 1].currency)) : absoluteGainBig;
    const initialBalanceBig = finalBalanceBig.minus(absoluteGainBig).minus(totalInflow).plus(totalOutflow);

    // ROI excluding deposits: (Absolute Gain / Initial Balance) * 100
    let percentageGain = 0;
    if (initialBalanceBig.gt(0)) {
      percentageGain = absoluteGainBig.div(initialBalanceBig).times(100).toNumber();
    } else if (absoluteGainBig.gt(0)) {
      percentageGain = 100;
    }
    const dailyAverageRoi = durationDays > 0 ? percentageGain / durationDays : 0;

    // USD rate for display in header
    const currentAssetRate = rateOf(filters.denomination);
    const absoluteGainUsd = isUsdDenom ? absoluteGainBig.toFixed(2) : absoluteGainBig.times(currentAssetRate).toFixed(2);

    const primaryResult: PrimaryResultMetrics = {
      percentageGain,
      absoluteGain: absoluteGainBig.toFixed(isUsdDenom ? 2 : 8),
      absoluteGainUsd,
      initialBalance: initialBalanceBig.gt(0) ? initialBalanceBig.toFixed(isUsdDenom ? 2 : 8) : '0.00',
      finalBalance: finalBalanceBig.toFixed(isUsdDenom ? 2 : 8),
      dailyAverageRoi,
      depositsInPeriod: depositsInPeriod.toFixed(isUsdDenom ? 2 : 8),
      durationDays,
      earliestDate: new Date(earliestTime).toLocaleDateString('en-GB'),
      latestDate: new Date(latestTime).toLocaleDateString('en-GB'),
    };

    // ── 2. Operations & Fee Efficiency ──
    const feeCostPct = grossCashFlow.gt(0) ? feesPaid.div(grossCashFlow).times(100).toNumber() : 0;
    let feeStatus: 'Excellent' | 'Acceptable' | 'Moderate' | 'High' = 'Acceptable';
    let feeInterpretation = 'Within expected range for trading strategy.';
    let feeAction = 'Monitor and look for spot optimizations.';

    if (feeCostPct < 5) {
      feeStatus = 'Excellent';
      feeInterpretation = 'Highly efficient strategy with minimal operational costs.';
      feeAction = 'Maintain current execution parameters.';
    } else if (feeCostPct <= 10) {
      feeStatus = 'Acceptable';
      feeInterpretation = 'Within expected range for trading strategy.';
      feeAction = 'Monitor and look for spot optimizations.';
    } else if (feeCostPct <= 20) {
      feeStatus = 'Moderate';
      feeInterpretation = 'Can be optimized. Consider adjusting trade frequency.';
      feeAction = 'Review maker/taker execution mix to reduce cost drag.';
    } else {
      feeStatus = 'High';
      feeInterpretation = 'Excessive costs are significantly eroding profits.';
      feeAction = 'Immediate optimization required on trade sizing or fee tiers.';
    }

    const fundingRatioVal = fundingPaid.gt(0) ? fundingReceived.div(fundingPaid).toFixed(2) : (fundingReceived.gt(0) ? '∞' : '0.00');

    const operations: OperationsResultMetrics = {
      grossCashFlow: grossCashFlow.toFixed(isUsdDenom ? 2 : 8),
      feesPaid: feesPaid.toFixed(isUsdDenom ? 2 : 8),
      netTradingPnl: netTradingPnl.toFixed(isUsdDenom ? 2 : 8),
      fundingReceived: fundingReceived.toFixed(isUsdDenom ? 2 : 8),
      fundingPaid: fundingPaid.toFixed(isUsdDenom ? 2 : 8),
      netFunding: netFunding.toFixed(isUsdDenom ? 2 : 8),
      fundingRatio: `${fundingRatioVal}:1`,
      totalTrades,
      buysCount,
      sellsCount,
      buysPct: totalTrades > 0 ? (buysCount / totalTrades) * 100 : 0,
      sellsPct: totalTrades > 0 ? (sellsCount / totalTrades) * 100 : 0,
      tradesPerDay: totalTrades / durationDays,
      feeCostPct,
      feeStatus,
      feeInterpretation,
      feeAction,
    };

    // ── 3. Advanced Performance (Win Rate & CV) ──
    const dailyValues = Object.values(dailyMap);
    const positiveDays = dailyValues.filter(d => d.total > 0).length;
    const totalActiveDays = dailyValues.length || 1;
    const winRate = (positiveDays / totalActiveDays) * 100;

    let totalGains = new Big(0);
    let totalLosses = new Big(0);

    dailyValues.forEach(d => {
      if (d.total > 0) totalGains = totalGains.plus(new Big(d.total));
      if (d.total < 0) totalLosses = totalLosses.plus(new Big(Math.abs(d.total)));
    });

    const profitFactor = totalLosses.gt(0) ? totalGains.div(totalLosses).toNumber() : (totalGains.gt(0) ? 99.9 : 0);
    let profitFactorRating = 'Excellent';
    if (profitFactor < 1.0) profitFactorRating = 'Loss-making';
    else if (profitFactor <= 1.5) profitFactorRating = 'Marginal';
    else if (profitFactor <= 2.0) profitFactorRating = 'Good';

    // Coefficient of variation
    const meanDaily = dailyValues.reduce((sum, d) => sum + d.total, 0) / totalActiveDays;
    const variance = dailyValues.reduce((sum, d) => sum + Math.pow(d.total - meanDaily, 2), 0) / totalActiveDays;
    const stdDev = Math.sqrt(variance);
    const cv = meanDaily !== 0 ? Math.abs((stdDev / meanDaily) * 100) : 0;

    let consistencyRating = 'High consistency';
    if (cv >= 100) consistencyRating = 'Volatile returns';
    else if (cv >= 50) consistencyRating = 'Moderate consistency';

    const advancedMetrics: AdvancedPerformanceMetrics = {
      winRate,
      positiveDaysCount: positiveDays,
      totalDaysEvaluated: totalActiveDays,
      profitFactor,
      profitFactorRating,
      totalGains: totalGains.toFixed(isUsdDenom ? 2 : 8),
      totalLosses: totalLosses.toFixed(isUsdDenom ? 2 : 8),
      consistencyIndexCv: cv,
      consistencyRating,
    };

    // ── 4. Day of the Week ──
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday
    const dayOfWeekList: DayOfWeekItem[] = dayOrder.map(idx => ({
      dayName: dayNames[idx],
      dayIndex: idx,
      trades: dayOfWeekMap[idx].trades,
      tradingGain: Number(dayOfWeekMap[idx].trading.toFixed(isUsdDenom ? 2 : 8)),
      fundingGain: Number(dayOfWeekMap[idx].funding.toFixed(isUsdDenom ? 2 : 8)),
      totalGain: Number(dayOfWeekMap[idx].total.toFixed(isUsdDenom ? 2 : 8)),
    }));

    const sortedByGain = [...dayOfWeekList].sort((a, b) => b.totalGain - a.totalGain);
    const bestDay = { name: sortedByGain[0]?.dayName || '-', gain: sortedByGain[0]?.totalGain || 0 };
    const worstDay = { name: sortedByGain[sortedByGain.length - 1]?.dayName || '-', gain: sortedByGain[sortedByGain.length - 1]?.totalGain || 0 };

    // ── 5. Time of Day ──
    const periodLabels = [
      '00:00 - 03:59',
      '04:00 - 07:59',
      '08:00 - 11:59',
      '12:00 - 15:59',
      '16:00 - 19:59',
      '20:00 - 23:59',
    ];
    const timeOfDayList: TimeOfDayItem[] = periodLabels.map((label, idx) => ({
      periodLabel: label,
      trades: timeOfDayMap[idx].trades,
      tradingGain: Number(timeOfDayMap[idx].trading.toFixed(isUsdDenom ? 2 : 8)),
      fundingGain: Number(timeOfDayMap[idx].funding.toFixed(isUsdDenom ? 2 : 8)),
      totalGain: Number(timeOfDayMap[idx].total.toFixed(isUsdDenom ? 2 : 8)),
    }));

    const sortedTime = [...timeOfDayList].sort((a, b) => b.totalGain - a.totalGain);
    const bestTime = { period: sortedTime[0]?.periodLabel || '-', gain: sortedTime[0]?.totalGain || 0 };
    const worstTime = { period: sortedTime[sortedTime.length - 1]?.periodLabel || '-', gain: sortedTime[sortedTime.length - 1]?.totalGain || 0 };

    // ── 6. Price Milestones ──
    const priceMilestonesList: PriceMilestoneItem[] = Object.entries(milestoneMap)
      .map(([mPrice, item]) => {
        const numPrice = Number(mPrice);
        const delta = item.lastEquity - item.firstEquity;
        const deltaPct = item.firstEquity > 0 ? (delta / item.firstEquity) * 100 : 0;
        return {
          milestonePrice: numPrice,
          formattedMilestone: `$${numPrice.toLocaleString()}`,
          passages: item.count,
          firstPassageEquity: item.firstEquity,
          lastPassageEquity: item.lastEquity,
          gainLoss: delta,
          gainLossFormatted: delta >= 0 ? `+$${delta.toFixed(2)}` : `-$${Math.abs(delta).toFixed(2)}`,
          gainLossPct: deltaPct,
        };
      })
      .sort((a, b) => a.milestonePrice - b.milestonePrice);

    // Downsample evolution series to max 80 points to keep Recharts SVG rendering fast & lightweight
    let optimizedEvolutionSeries = evolutionSeries;
    if (evolutionSeries.length > 80) {
      const step = Math.ceil(evolutionSeries.length / 80);
      const sampled: EvolutionPoint[] = [];
      for (let i = 0; i < evolutionSeries.length; i += step) {
        sampled.push(evolutionSeries[i]);
      }
      if (sampled[sampled.length - 1] !== evolutionSeries[evolutionSeries.length - 1]) {
        sampled.push(evolutionSeries[evolutionSeries.length - 1]);
      }
      optimizedEvolutionSeries = sampled;
    }

    return {
      primaryResult,
      operations,
      advancedMetrics,
      evolutionSeries: optimizedEvolutionSeries,
      dayOfWeek: {
        list: dayOfWeekList,
        bestDay,
        worstDay,
      },
      timeOfDay: {
        list: timeOfDayList,
        bestTime,
        worstTime,
      },
      priceMilestones: priceMilestonesList,
    };
  }, [filteredEntries, filters, tokenRates]);

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
  };
}
