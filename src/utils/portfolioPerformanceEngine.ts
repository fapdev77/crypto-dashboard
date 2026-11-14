import Big from 'big.js';
import type {
  BybitTransactionLogEntry,
  BitgetTransactionLogEntry,
  OkxTransactionLogEntry,
} from '../types';
import {
  getBybitUniversalType,
  getBitgetUniversalType,
  getOkxUniversalType,
  type UniversalTxType,
} from './transactionTypeMapper';
import { toFeeCost } from './feeSign';
import { isUsdPeggedStablecoin, resolveUsdRate, type FiatRatesLike } from './usdAggregation';
import { classifyTradeSide } from './tradeSide';

export type ExchangeVenue = 'bybit' | 'bitget' | 'okx';
export type OperationalBucket = 'trade' | 'funding' | 'other_op' | 'inflow' | 'outflow';

export interface PortfolioPerformanceFilters {
  exchange: string;       // 'All' | 'bybit' | 'bitget' | 'okx'
  accountId: string;      // 'All' | connectionId
  denomination: string;   // 'USD' | 'BTC' | 'ETH' | 'USDT' | ...
  timePeriod: number | string; // ms (0 = All Time), 'mtd', 'ytd', 'custom'
  customStartDate?: string;    // 'YYYY-MM-DD'
  customEndDate?: string;      // 'YYYY-MM-DD'
  milestoneStep: number;  // Price interval (e.g. 2500 for BTC)
  milestoneAsset?: string; // Reference asset for Price Milestones (e.g. 'BTC', 'ETH')
}

export const defaultPerformanceFilters: PortfolioPerformanceFilters = {
  exchange: 'All',
  accountId: 'All',
  denomination: 'BTC',
  timePeriod: 7 * 24 * 60 * 60 * 1000,
  milestoneStep: 2500,
};

export interface PrimaryResultMetrics {
  percentageGain: number;
  absoluteGain: string;
  absoluteGainUsd: string;
  initialBalance: string;
  finalBalance: string;
  dailyAverageRoi: number;
  depositsInPeriod: string;
  withdrawalsInPeriod?: string;
  durationDays: number;
  earliestDate: string;
  latestDate: string;
}

export interface EvolutionPoint {
  timestamp: number;
  dateStr: string;
  tradingGain: number;
  fundingGain: number;
  otherOpGain?: number;
  totalGain: number;
}

export interface OtherOperationalBreakdown {
  net: string;
  liquidationNet: string;
  deliveryNet: string;
  interestNet: string;
  rewardsNet: string;
  otherFeesNet: string;
  count: number;
}

export interface OperationsResultMetrics {
  grossCashFlow: string;
  feesPaid: string;
  netTradingPnl: string;
  fundingReceived: string;
  fundingPaid: string;
  netFunding: string;
  fundingRatio: string;
  otherOperational?: OtherOperationalBreakdown;
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
  profitFactorRating: 'Excellent' | 'Good' | 'Marginal' | 'Loss-making' | 'Acceptable';
  totalGains: string;
  totalLosses: string;
  consistencyIndexCv: number;
  consistencyRating: 'Highly Consistent' | 'Moderate Consistency' | 'High Dispersion';
}

export interface DayOfWeekItem {
  dayName: string;
  dayIndex: number;
  trades: number;
  tradingGain: number;
  fundingGain: number;
  otherOpGain?: number;
  totalGain: number;
}

export interface TimeOfDayItem {
  periodLabel: string;
  trades: number;
  tradingGain: number;
  fundingGain: number;
  otherOpGain?: number;
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

export interface PortfolioPerformanceData {
  primaryResult: PrimaryResultMetrics;
  operations: OperationsResultMetrics;
  advancedMetrics: AdvancedPerformanceMetrics;
  evolutionSeries: EvolutionPoint[];
  dayOfWeek: {
    list: DayOfWeekItem[];
    bestDay: { name: string; gain: number };
    worstDay: { name: string; gain: number };
  };
  timeOfDay: {
    list: TimeOfDayItem[];
    bestTime: { period: string; gain: number };
    worstTime: { period: string; gain: number };
  };
  priceMilestones: PriceMilestoneItem[];
  resolvedMilestoneAsset: string;
  availableMilestoneAssets: string[];
}

export interface NormalizedPerfTx {
  exchange: ExchangeVenue;
  connectionId: string;
  walletKey: string;
  symbol: string;
  baseAsset: string;
  category: string;
  currency: string;
  side: string;
  transactionTime: number;
  type: string;
  universalType: UniversalTxType;
  operationalBucket: OperationalBucket;
  isSpotSwap: boolean;
  tradePrice: number;
  funding: number;
  feeCost: number;
  grossCashFlow: number;
  change: number;
  cashBalance: number | null;
  hasExplicitBalance: boolean;
  /** Non-zero residual on funding/settlement records (e.g. Bybit USDC Perp 8h SETTLEMENT cashFlow). */
  settlementResidual: number;
}

export const defaultEmptyPerformanceData: PortfolioPerformanceData = {
  primaryResult: {
    percentageGain: 0,
    absoluteGain: '0.00000000',
    absoluteGainUsd: '0.00',
    initialBalance: '0.00000000',
    finalBalance: '0.00000000',
    dailyAverageRoi: 0,
    depositsInPeriod: '0.00000000',
    withdrawalsInPeriod: '0.00000000',
    durationDays: 0,
    earliestDate: '-',
    latestDate: '-',
  },
  operations: {
    grossCashFlow: '0.00000000',
    feesPaid: '0.00000000',
    netTradingPnl: '0.00000000',
    fundingReceived: '0.00000000',
    fundingPaid: '0.00000000',
    netFunding: '0.00000000',
    fundingRatio: '0.00:1',
    otherOperational: {
      net: '0.00000000',
      liquidationNet: '0.00000000',
      deliveryNet: '0.00000000',
      interestNet: '0.00000000',
      rewardsNet: '0.00000000',
      otherFeesNet: '0.00000000',
      count: 0,
    },
    totalTrades: 0,
    buysCount: 0,
    sellsCount: 0,
    buysPct: 0,
    sellsPct: 0,
    tradesPerDay: 0,
    feeCostPct: 0,
    feeStatus: 'Excellent',
    feeInterpretation: 'No trade or fee data available for this selection.',
    feeAction: 'Execute trades to monitor fee impact.',
  },
  advancedMetrics: {
    winRate: 0,
    positiveDaysCount: 0,
    totalDaysEvaluated: 0,
    profitFactor: 0,
    profitFactorRating: 'Loss-making',
    totalGains: '0.00000000',
    totalLosses: '0.00000000',
    consistencyIndexCv: 0,
    consistencyRating: 'Highly Consistent',
  },
  evolutionSeries: [],
  dayOfWeek: {
    list: [
      { dayName: 'Monday', dayIndex: 1, trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
      { dayName: 'Tuesday', dayIndex: 2, trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
      { dayName: 'Wednesday', dayIndex: 3, trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
      { dayName: 'Thursday', dayIndex: 4, trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
      { dayName: 'Friday', dayIndex: 5, trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
      { dayName: 'Saturday', dayIndex: 6, trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
      { dayName: 'Sunday', dayIndex: 0, trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
    ],
    bestDay: { name: '-', gain: 0 },
    worstDay: { name: '-', gain: 0 },
  },
  timeOfDay: {
    list: [
      { periodLabel: '00:00 - 03:59', trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
      { periodLabel: '04:00 - 07:59', trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
      { periodLabel: '08:00 - 11:59', trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
      { periodLabel: '12:00 - 15:59', trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
      { periodLabel: '16:00 - 19:59', trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
      { periodLabel: '20:00 - 23:59', trades: 0, tradingGain: 0, fundingGain: 0, otherOpGain: 0, totalGain: 0 },
    ],
    bestTime: { period: '-', gain: 0 },
    worstTime: { period: '-', gain: 0 },
  },
  priceMilestones: [],
  resolvedMilestoneAsset: 'BTC',
  availableMilestoneAssets: [],
};

const KNOWN_QUOTES = ['USDT', 'USDC', 'USD', 'BUSD', 'FDUSD', 'DAI', 'USDE', 'EUR', 'BRL', 'BTC', 'ETH'];

export function getDenominationDecimals(denomination: string): number {
  const code = (denomination || '').toUpperCase().trim();
  if (code === 'USD' || isUsdPeggedStablecoin(code)) return 2;
  return 8;
}

export function getDefaultMilestoneStepForAsset(asset: string): number {
  const code = (asset || '').toUpperCase().trim();
  if (code === 'BTC') return 2500;
  if (code === 'ETH') return 100;
  if (code === 'SOL') return 5;
  if (code === 'BNB') return 25;
  if (code === 'AVAX' || code === 'LINK') return 2;
  if (code === 'XRP' || code === 'DOGE') return 0.05;
  return 100;
}

export function getPresetMilestoneStepsForAsset(asset: string): number[] {
  const code = (asset || '').toUpperCase().trim();
  if (code === 'BTC') return [1000, 2500, 5000, 10000];
  if (code === 'ETH') return [50, 100, 250, 500];
  if (code === 'SOL') return [5, 10, 25, 50];
  if (code === 'BNB') return [10, 25, 50, 100];
  if (code === 'AVAX' || code === 'LINK') return [1, 2, 5, 10];
  if (code === 'XRP' || code === 'DOGE') return [0.02, 0.05, 0.1, 0.25];
  return [500, 1000, 2500, 5000];
}

export function extractBaseAsset(symbol: string | undefined | null): string {
  const raw = (symbol || '').toUpperCase().trim();
  if (!raw) return '';

  // Strip common contract suffixes first
  const cleaned = raw
    .replace(/[-_](SWAP|PERP|UMCBL|DMCBL|CMCBL|FUTURES)$/i, '')
    .replace(/-\d{6}$/, '');

  if (cleaned.includes('-') || cleaned.includes('/')) {
    const parts = cleaned.split(/[-/]/).filter(Boolean);
    if (parts.length >= 1) return parts[0];
  }

  for (const quote of KNOWN_QUOTES) {
    if (cleaned.endsWith(quote) && cleaned.length > quote.length) {
      return cleaned.slice(0, cleaned.length - quote.length);
    }
  }

  return cleaned;
}

function parseFinite(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isFinite(n) ? n : 0;
}

function parseExplicitBalance(val: string | number | undefined | null): { value: number | null; explicit: boolean } {
  if (val === undefined || val === null) return { value: null, explicit: false };
  const s = String(val).trim();
  if (s === '') return { value: null, explicit: false };
  const n = Number(s);
  if (!Number.isFinite(n)) return { value: null, explicit: false };
  return { value: n, explicit: true };
}

const EXPLICIT_INFLOW_TYPES = new Set([
  'TRANSFER_IN',
  'DEPOSIT',
  'FIAT_DEPOSIT',
  'TRANS_FROM_EXCHANGE',
  'TRANS_FROM_CONTRACT',
  'TRACE_TRANSFER_USER_IN',
  'MT5_TRANSFER_IN',
  'ON_CHAIN_TRANSFER_REFUND',
  'EXCHANGE_TARGET_TOKEN_USER_IN',
]);

const EXPLICIT_OUTFLOW_TYPES = new Set([
  'TRANSFER_OUT',
  'WITHDRAW',
  'FIAT_WITHDRAW',
  'TRANS_TO_EXCHANGE',
  'TRANS_TO_CONTRACT',
  'TRACE_TRANSFER_USER_OUT',
  'MT5_TRANSFER_OUT',
  'ON_CHAIN_TRANSFER_OUT',
  'EXCHANGE_SOURCE_TOKEN_USER_OUT',
  'ORDER_DEALT_FROZEN_OUT',
  'AUTO_DEDUCTION',
]);

const EXCHANGE_SWAP_TYPES = new Set([
  'SPOT',
  'CONVERT',
  'CURRENCY_BUY',
  'CURRENCY_SELL',
  'EXCHANGE_TARGET_TOKEN_USER_IN',
  'EXCHANGE_SOURCE_TOKEN_USER_OUT',
]);

function isMockRecord(raw: unknown): boolean {
  return Boolean(raw && typeof raw === 'object' && (raw as Record<string, unknown>).mockData === true);
}

function resolveGrossCashFlow(
  rawCashFlow: number,
  change: number,
  funding: number,
  feeCost: number
): number {
  const derivedGross = change - funding + feeCost;
  // On Bybit (and mock datasets), cashFlow is gross: change = cashFlow + funding - feeCost.
  // On OKX live, OkxAdapter copies net balChg into cashFlow; on Bitget UTA live, raw.cashFlow may be absent and fall back to qty.
  const tolerance = Math.max(0.05, Math.abs(change) * 0.01);
  if (Math.abs(rawCashFlow) > 0 && Math.abs(rawCashFlow + funding - feeCost - change) <= tolerance) {
    return rawCashFlow;
  }
  return derivedGross;
}

function classifySingleEntry(params: {
  exchange: ExchangeVenue;
  connectionId: string;
  symbol: string;
  category: string;
  currency: string;
  side: string;
  transactionTime: number;
  rawType: string;
  subType: string;
  rawUniversalType: UniversalTxType;
  tradePrice: number;
  rawFunding: number;
  feeCost: number;
  rawCashFlow: number;
  change: number;
  cashBalanceRaw: string | number | undefined | null;
  raw: unknown;
}): NormalizedPerfTx {
  const {
    exchange,
    connectionId,
    symbol,
    category,
    currency,
    side,
    transactionTime,
    rawType,
    subType,
    rawUniversalType,
    tradePrice,
    rawFunding,
    feeCost,
    rawCashFlow,
    change,
    cashBalanceRaw,
    raw,
  } = params;

  const typeUpper = rawType.trim().toUpperCase();
  const catLower = category.trim().toLowerCase();
  const ccyUpper = currency.trim().toUpperCase();

  let universalType: UniversalTxType = rawUniversalType;
  let operationalBucket: OperationalBucket;
  let isSpotSwap = false;

  const isExplicitInflow = EXPLICIT_INFLOW_TYPES.has(typeUpper);
  const isExplicitOutflow = EXPLICIT_OUTFLOW_TYPES.has(typeUpper);
  const isAmbiguousTransfer =
    typeUpper === 'TRANSFER' ||
    (exchange === 'okx' && typeUpper === '1' && subType !== '11' && subType !== '12');

  const isLiveSpotTrade =
    !isMockRecord(raw) &&
    catLower === 'spot' &&
    universalType === 'TRADE';

  const isExchangeSwap =
    EXCHANGE_SWAP_TYPES.has(typeUpper) ||
    isLiveSpotTrade ||
    (exchange === 'okx' && (typeUpper === '4' || typeUpper === '11'));

  if (isExchangeSwap) {
    isSpotSwap = true;
    operationalBucket = change >= 0 ? 'inflow' : 'outflow';
  } else if (isAmbiguousTransfer) {
    if (change < 0) {
      universalType = 'TRANSFER_OUT';
      operationalBucket = 'outflow';
    } else {
      universalType = 'TRANSFER_IN';
      operationalBucket = 'inflow';
    }
  } else if (isExplicitInflow || universalType === 'TRANSFER_IN') {
    universalType = 'TRANSFER_IN';
    operationalBucket = 'inflow';
  } else if (isExplicitOutflow || universalType === 'TRANSFER_OUT') {
    universalType = 'TRANSFER_OUT';
    operationalBucket = 'outflow';
  } else if (universalType === 'FUNDING_FEE') {
    operationalBucket = 'funding';
  } else if (universalType === 'TRADE') {
    operationalBucket = 'trade';
  } else {
    // LIQUIDATION, DELIVERY, INTEREST, REWARDS, standalone FEE / OTHERS
    operationalBucket = 'other_op';
  }

  // Resolve funding amount: on Bitget/OKX pure funding entries without `funding` populated, funding equals change.
  let funding = rawFunding;
  if (operationalBucket === 'funding' && funding === 0 && change !== 0) {
    funding = change;
  }

  // Compute non-funding gross cash flow and any residual on funding/settlement records (e.g. Bybit SETTLEMENT).
  const grossCashFlow =
    operationalBucket === 'inflow' || operationalBucket === 'outflow'
      ? 0
      : resolveGrossCashFlow(rawCashFlow, change, funding, feeCost);

  let settlementResidual = 0;
  if (operationalBucket === 'funding') {
    settlementResidual = change - funding;
  } else if (operationalBucket === 'trade' && funding !== 0) {
    // Trade record carrying funding too: split cleanly so trading + funding == change.
    settlementResidual = 0;
  }

  const parsedBalance = parseExplicitBalance(cashBalanceRaw);

  return {
    exchange,
    connectionId,
    walletKey: `${exchange}:${connectionId}:${ccyUpper}`,
    symbol,
    baseAsset: extractBaseAsset(symbol),
    category,
    currency: ccyUpper,
    side: side || 'None',
    transactionTime,
    type: rawType,
    universalType,
    operationalBucket,
    isSpotSwap,
    tradePrice,
    funding,
    feeCost,
    grossCashFlow,
    change,
    cashBalance: parsedBalance.value,
    hasExplicitBalance: parsedBalance.explicit,
    settlementResidual,
  };
}

export function normalizeAllPerformanceEntries(params: {
  bybitEntries: BybitTransactionLogEntry[];
  bitgetEntries: BitgetTransactionLogEntry[];
  okxEntries: OkxTransactionLogEntry[];
}): NormalizedPerfTx[] {
  const { bybitEntries, bitgetEntries, okxEntries } = params;
  const tagged: Array<{ item: NormalizedPerfTx; seq: number }> = [];
  let seq = 0;

  bybitEntries.forEach((e) => {
    const uType = getBybitUniversalType(e.type, e.funding);
    const feeCost = toFeeCost('bybit', e.fee).toNumber();
    const change = parseFinite(e.change);
    const rawFunding = parseFinite(e.funding);
    const rawCashFlow = parseFinite(e.cashFlow);
    tagged.push({
      seq: seq++,
      item: classifySingleEntry({
        exchange: 'bybit',
        connectionId: e.connectionId,
        symbol: e.symbol || '',
        category: e.category || '',
        currency: e.currency || '',
        side: e.side || 'None',
        transactionTime: e.transactionTime,
        rawType: e.type || '',
        subType: e.transSubType || '',
        rawUniversalType: uType,
        tradePrice: parseFinite(e.tradePrice),
        rawFunding,
        feeCost,
        rawCashFlow,
        change,
        cashBalanceRaw: e.cashBalance,
        raw: e.raw,
      }),
    });
  });

  bitgetEntries.forEach((e) => {
    const uType = getBitgetUniversalType(
      e.type,
      e.funding || (e.type?.toUpperCase().includes('SETTLE_FEE') ? e.change : 0)
    );
    const feeCost = toFeeCost('bitget', e.fee).toNumber();
    const change = parseFinite(e.change ?? e.amount);
    const rawFunding = parseFinite(e.funding);
    const rawCashFlow = parseFinite(e.cashFlow);
    tagged.push({
      seq: seq++,
      item: classifySingleEntry({
        exchange: 'bitget',
        connectionId: e.connectionId,
        symbol: e.symbol || '',
        category: e.category || '',
        currency: e.currency || '',
        side: e.side || 'None',
        transactionTime: e.transactionTime,
        rawType: e.type || '',
        subType: e.transSubType || '',
        rawUniversalType: uType,
        tradePrice: parseFinite(e.tradePrice),
        rawFunding,
        feeCost,
        rawCashFlow,
        change,
        cashBalanceRaw: e.cashBalance ?? e.balance,
        raw: e.raw,
      }),
    });
  });

  okxEntries.forEach((e) => {
    const uType = getOkxUniversalType(e);
    const feeCost = toFeeCost('okx', e.fee).toNumber();
    const change = parseFinite(e.change);
    const rawFunding = parseFinite(e.funding);
    const rawCashFlow = parseFinite(e.cashFlow);
    tagged.push({
      seq: seq++,
      item: classifySingleEntry({
        exchange: 'okx',
        connectionId: e.connectionId,
        symbol: e.symbol || '',
        category: e.category || '',
        currency: e.currency || '',
        side: e.side || 'None',
        transactionTime: e.transactionTime,
        rawType: e.type || '',
        subType: e.subType || e.transSubType || '',
        rawUniversalType: uType,
        tradePrice: parseFinite(e.tradePrice),
        rawFunding,
        feeCost,
        rawCashFlow,
        change,
        cashBalanceRaw: e.cashBalance ?? e.balance,
        raw: e.raw,
      }),
    });
  });

  // Sort chronologically ascending; when timestamps tie, preserve reversed input order
  // (inputs are typically newest-first from sync/cache, so reversing restores chronological order).
  return tagged
    .sort((a, b) => {
      if (a.item.transactionTime !== b.item.transactionTime) {
        return a.item.transactionTime - b.item.transactionTime;
      }
      return b.seq - a.seq;
    })
    .map((t) => t.item);
}

export function scopePerformanceEntries(
  unifiedEntries: NormalizedPerfTx[],
  filters: PortfolioPerformanceFilters,
  dateRange: { startTime: number | null; endTime: number | null }
): {
  scopedUpToEnd: NormalizedPerfTx[];
  periodEntries: NormalizedPerfTx[];
} {
  const exchFilter = filters.exchange.toLowerCase();
  const accFilter = filters.accountId || 'All';
  const isUsdDenom = filters.denomination.toUpperCase() === 'USD';
  const targetCcy = filters.denomination.toUpperCase();

  const scopedUpToEnd = unifiedEntries.filter((e) => {
    if (exchFilter !== 'all' && e.exchange !== exchFilter) return false;
    if (accFilter.toLowerCase() !== 'all' && e.connectionId !== accFilter) return false;
    if (dateRange.endTime !== null && e.transactionTime > dateRange.endTime) return false;
    if (!isUsdDenom && e.currency !== targetCcy) return false;
    return true;
  });

  const periodEntries = scopedUpToEnd.filter((e) => {
    if (dateRange.startTime !== null && e.transactionTime < dateRange.startTime) return false;
    return true;
  });

  return { scopedUpToEnd, periodEntries };
}

export function computePortfolioPerformance(params: {
  scopedUpToEnd: NormalizedPerfTx[];
  periodEntries: NormalizedPerfTx[];
  filters: PortfolioPerformanceFilters;
  tokenRates: Record<string, number>;
  fiatRates: FiatRatesLike;
}): PortfolioPerformanceData {
  const { scopedUpToEnd, periodEntries, filters, tokenRates, fiatRates } = params;

  if (periodEntries.length === 0) {
    return defaultEmptyPerformanceData;
  }

  const denom = filters.denomination.toUpperCase();
  const isUsdDenom = denom === 'USD';
  const decimals = getDenominationDecimals(denom);

  const rateOf = (ccy: string): number => resolveUsdRate(ccy, tokenRates, fiatRates) ?? 0;
  const toDenom = (amount: number, ccy: string): number => {
    if (amount === 0) return 0;
    if (isUsdDenom) return amount * rateOf(ccy);
    if (ccy === denom) return amount;
    const targetRate = rateOf(denom);
    return targetRate > 0 ? (amount * rateOf(ccy)) / targetRate : 0;
  };

  // Discover available traded base assets for Price Milestones
  const assetCounts = new Map<string, number>();
  periodEntries.forEach((e) => {
    if (e.tradePrice > 0 && e.baseAsset) {
      assetCounts.set(e.baseAsset, (assetCounts.get(e.baseAsset) || 0) + 1);
    }
  });
  const availableMilestoneAssets = Array.from(assetCounts.keys()).sort((a, b) => {
    if (a === 'BTC') return -1;
    if (b === 'BTC') return 1;
    return (assetCounts.get(b) || 0) - (assetCounts.get(a) || 0);
  });

  let resolvedMilestoneAsset = (filters.milestoneAsset || '').toUpperCase().trim();
  if (!resolvedMilestoneAsset || !assetCounts.has(resolvedMilestoneAsset)) {
    if (!isUsdDenom && !isUsdPeggedStablecoin(denom) && assetCounts.has(denom)) {
      resolvedMilestoneAsset = denom;
    } else if (assetCounts.has('BTC')) {
      resolvedMilestoneAsset = 'BTC';
    } else {
      resolvedMilestoneAsset = availableMilestoneAssets[0] || (!isUsdDenom && !isUsdPeggedStablecoin(denom) ? denom : 'BTC');
    }
  }

  const earliestTime = periodEntries[0].transactionTime;
  const latestTime = periodEntries[periodEntries.length - 1].transactionTime;
  const durationDays = Math.max(1, Math.ceil((latestTime - earliestTime) / (1000 * 60 * 60 * 24)));

  // ── 1. Multi-Account / Multi-Currency Wallet Balance Reconstruction ──
  // Track every wallet present in scope up to `endTime`, including accounts that
  // were active earlier in history but had 0 operations inside [startTime, endTime].
  interface WalletAcc {
    currency: string;
    finalRaw: number | null;
    hasExplicitBalance: boolean;
    periodOpChange: number;
    periodInflow: number;
    periodOutflow: number;
  }

  const wallets = new Map<string, WalletAcc>();
  const ensureWallet = (walletKey: string, currency: string): WalletAcc => {
    let w = wallets.get(walletKey);
    if (!w) {
      w = {
        currency,
        finalRaw: null,
        hasExplicitBalance: false,
        periodOpChange: 0,
        periodInflow: 0,
        periodOutflow: 0,
      };
      wallets.set(walletKey, w);
    }
    return w;
  };

  // Seed final known balance up to endTime for all wallets in scope
  scopedUpToEnd.forEach((e) => {
    const w = ensureWallet(e.walletKey, e.currency);
    if (e.hasExplicitBalance && e.cashBalance !== null) {
      w.finalRaw = e.cashBalance;
      w.hasExplicitBalance = true;
    }
  });

  // Accumulate period deltas per wallet
  periodEntries.forEach((e) => {
    const w = ensureWallet(e.walletKey, e.currency);
    if (e.operationalBucket === 'inflow') {
      w.periodInflow += Math.abs(e.change);
    } else if (e.operationalBucket === 'outflow') {
      w.periodOutflow += Math.abs(e.change);
    } else {
      w.periodOpChange += e.change;
    }
  });

  // Initial balance per wallet before the first period event, used to seed consolidated running equity
  const runningWalletRaw = new Map<string, number>();
  let finalBalanceBig = new Big(0);
  let hasAnyExplicitWalletBalance = false;

  wallets.forEach((w, key) => {
    if (w.hasExplicitBalance && w.finalRaw !== null) {
      hasAnyExplicitWalletBalance = true;
      const finalDenom = toDenom(w.finalRaw, w.currency);
      finalBalanceBig = finalBalanceBig.plus(new Big(finalDenom));
      const initialRaw = w.finalRaw - w.periodOpChange - w.periodInflow + w.periodOutflow;
      runningWalletRaw.set(key, initialRaw);
    } else {
      runningWalletRaw.set(key, 0);
    }
  });

  const computeConsolidatedEquity = (): number => {
    let sum = 0;
    runningWalletRaw.forEach((rawBal, key) => {
      const w = wallets.get(key);
      if (w) sum += toDenom(rawBal, w.currency);
    });
    return sum;
  };

  // ── 2. Analytical Accumulators ──
  let grossCashFlow = new Big(0);
  let feesPaid = new Big(0);
  let netTradingPnl = new Big(0);
  let fundingReceived = new Big(0);
  let fundingPaid = new Big(0);
  let netFunding = new Big(0);

  let otherOpNet = new Big(0);
  let liquidationNet = new Big(0);
  let deliveryNet = new Big(0);
  let interestNet = new Big(0);
  let rewardsNet = new Big(0);
  let otherFeesNet = new Big(0);
  let otherOpCount = 0;

  let depositsInPeriod = new Big(0);
  let withdrawalsInPeriod = new Big(0);
  let totalInflow = new Big(0);
  let totalOutflow = new Big(0);

  let totalTrades = 0;
  let buysCount = 0;
  let sellsCount = 0;

  // Daily operational buckets (strictly UTC YYYY-MM-DD, excluding pure transfers)
  const dailyMap: Record<string, { trading: number; funding: number; otherOp: number; total: number; trades: number }> = {};

  // Day of week buckets (UTC 0=Sun..6=Sat)
  const dayOfWeekMap: Record<number, { trades: number; trading: number; funding: number; otherOp: number; total: number }> = {
    0: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
    1: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
    2: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
    3: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
    4: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
    5: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
    6: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
  };

  // Time of day buckets (6 x 4h UTC)
  const timeOfDayMap: Record<number, { trades: number; trading: number; funding: number; otherOp: number; total: number }> = {
    0: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
    1: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
    2: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
    3: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
    4: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
    5: { trades: 0, trading: 0, funding: 0, otherOp: 0, total: 0 },
  };

  const evolutionSeries: EvolutionPoint[] = [];
  let runningTrading = 0;
  let runningFunding = 0;
  let runningOtherOp = 0;

  const milestoneStep = filters.milestoneStep > 0 ? filters.milestoneStep : getDefaultMilestoneStepForAsset(resolvedMilestoneAsset);
  const milestoneMap: Record<number, { count: number; firstEquity: number; lastEquity: number }> = {};

  const recordOperationalTiming = (
    dateKey: string,
    dow: number,
    periodBucket: number,
    deltaTrading: number,
    deltaFunding: number,
    deltaOtherOp: number,
    isTradeExec: boolean
  ) => {
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { trading: 0, funding: 0, otherOp: 0, total: 0, trades: 0 };
    }
    const deltaTotal = deltaTrading + deltaFunding + deltaOtherOp;
    dailyMap[dateKey].trading += deltaTrading;
    dailyMap[dateKey].funding += deltaFunding;
    dailyMap[dateKey].otherOp += deltaOtherOp;
    dailyMap[dateKey].total += deltaTotal;
    if (isTradeExec) dailyMap[dateKey].trades++;

    dayOfWeekMap[dow].trading += deltaTrading;
    dayOfWeekMap[dow].funding += deltaFunding;
    dayOfWeekMap[dow].otherOp += deltaOtherOp;
    dayOfWeekMap[dow].total += deltaTotal;
    if (isTradeExec) dayOfWeekMap[dow].trades++;

    timeOfDayMap[periodBucket].trading += deltaTrading;
    timeOfDayMap[periodBucket].funding += deltaFunding;
    timeOfDayMap[periodBucket].otherOp += deltaOtherOp;
    timeOfDayMap[periodBucket].total += deltaTotal;
    if (isTradeExec) timeOfDayMap[periodBucket].trades++;
  };

  periodEntries.forEach((e) => {
    // Update per-wallet running balance chronologically
    if (e.hasExplicitBalance && e.cashBalance !== null) {
      runningWalletRaw.set(e.walletKey, e.cashBalance);
    } else {
      runningWalletRaw.set(e.walletKey, (runningWalletRaw.get(e.walletKey) || 0) + e.change);
    }

    const valDenom = toDenom(e.change, e.currency);
    const feeDenom = toDenom(e.feeCost, e.currency);
    const grossFlowDenom = toDenom(e.grossCashFlow, e.currency);
    const fundingDenom = toDenom(e.funding, e.currency);
    const residualDenom = toDenom(e.settlementResidual, e.currency);

    const d = new Date(e.transactionTime);
    const dateKey = d.toISOString().slice(0, 10); // UTC YYYY-MM-DD
    const dow = d.getUTCDay();                    // UTC 0..6
    const periodBucket = Math.floor(d.getUTCHours() / 4); // UTC 4h block

    if (e.operationalBucket === 'inflow') {
      const absDenom = Math.abs(valDenom);
      totalInflow = totalInflow.plus(new Big(absDenom));
      if (!e.isSpotSwap) {
        depositsInPeriod = depositsInPeriod.plus(new Big(absDenom));
      }
      return;
    }

    if (e.operationalBucket === 'outflow') {
      const absDenom = Math.abs(valDenom);
      totalOutflow = totalOutflow.plus(new Big(absDenom));
      if (!e.isSpotSwap) {
        withdrawalsInPeriod = withdrawalsInPeriod.plus(new Big(absDenom));
      }
      return;
    }

    let deltaTrading = 0;
    let deltaFunding = 0;
    let deltaOtherOp = 0;
    let isTradeExec = false;

    if (e.operationalBucket === 'trade') {
      isTradeExec = true;
      totalTrades++;
      const direction = classifyTradeSide(e.side);
      if (direction === 'buy') buysCount++;
      if (direction === 'sell') sellsCount++;

      if (grossFlowDenom > 0) {
        grossCashFlow = grossCashFlow.plus(new Big(grossFlowDenom));
      }
      feesPaid = feesPaid.plus(new Big(feeDenom));

      // If a trade row also carried funding, split funding out so trading + funding == change.
      deltaFunding = fundingDenom;
      deltaTrading = valDenom - fundingDenom;

      netTradingPnl = netTradingPnl.plus(new Big(deltaTrading));
      if (deltaFunding !== 0) {
        if (deltaFunding > 0) fundingReceived = fundingReceived.plus(new Big(deltaFunding));
        else fundingPaid = fundingPaid.plus(new Big(Math.abs(deltaFunding)));
        netFunding = netFunding.plus(new Big(deltaFunding));
      }
    } else if (e.operationalBucket === 'funding') {
      deltaFunding = fundingDenom;
      if (deltaFunding > 0) {
        fundingReceived = fundingReceived.plus(new Big(deltaFunding));
      } else if (deltaFunding < 0) {
        fundingPaid = fundingPaid.plus(new Big(Math.abs(deltaFunding)));
      }
      netFunding = netFunding.plus(new Big(deltaFunding));

      // Handle compound settlement records (e.g. Bybit USDC Perp SETTLEMENT with both cashFlow and funding)
      if (Math.abs(residualDenom) > 1e-12) {
        if (Math.abs(grossFlowDenom) > 0 || feeDenom !== 0) {
          if (grossFlowDenom > 0) grossCashFlow = grossCashFlow.plus(new Big(grossFlowDenom));
          feesPaid = feesPaid.plus(new Big(feeDenom));
          deltaTrading = residualDenom;
          netTradingPnl = netTradingPnl.plus(new Big(deltaTrading));
        } else {
          deltaOtherOp = residualDenom;
          otherOpNet = otherOpNet.plus(new Big(deltaOtherOp));
          otherFeesNet = otherFeesNet.plus(new Big(deltaOtherOp));
          otherOpCount++;
        }
      }
    } else {
      // 'other_op': LIQUIDATION, DELIVERY, INTEREST, REWARDS, standalone FEE / OTHERS
      otherOpCount++;
      if (fundingDenom !== 0) {
        deltaFunding = fundingDenom;
        if (deltaFunding > 0) fundingReceived = fundingReceived.plus(new Big(deltaFunding));
        else fundingPaid = fundingPaid.plus(new Big(Math.abs(deltaFunding)));
        netFunding = netFunding.plus(new Big(deltaFunding));
      }

      deltaOtherOp = valDenom - deltaFunding;
      const opBig = new Big(deltaOtherOp);
      otherOpNet = otherOpNet.plus(opBig);

      if (e.universalType === 'LIQUIDATION') {
        liquidationNet = liquidationNet.plus(opBig);
      } else if (e.universalType === 'DELIVERY') {
        deliveryNet = deliveryNet.plus(opBig);
      } else if (e.universalType === 'INTEREST') {
        interestNet = interestNet.plus(opBig);
      } else if (e.universalType === 'REWARDS') {
        rewardsNet = rewardsNet.plus(opBig);
      } else {
        otherFeesNet = otherFeesNet.plus(opBig);
      }
    }

    runningTrading += deltaTrading;
    runningFunding += deltaFunding;
    runningOtherOp += deltaOtherOp;

    recordOperationalTiming(dateKey, dow, periodBucket, deltaTrading, deltaFunding, deltaOtherOp, isTradeExec);

    // Track Price Milestones on reference asset using consolidated multi-account equity
    if (e.tradePrice > 0 && e.baseAsset === resolvedMilestoneAsset) {
      const milestone = Math.round(e.tradePrice / milestoneStep) * milestoneStep;
      const consolidatedEquity = hasAnyExplicitWalletBalance
        ? computeConsolidatedEquity()
        : (runningTrading + runningFunding + runningOtherOp);

      if (!milestoneMap[milestone]) {
        milestoneMap[milestone] = {
          count: 1,
          firstEquity: consolidatedEquity,
          lastEquity: consolidatedEquity,
        };
      } else {
        milestoneMap[milestone].count++;
        milestoneMap[milestone].lastEquity = consolidatedEquity;
      }
    }

    evolutionSeries.push({
      timestamp: e.transactionTime,
      dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      tradingGain: Number(runningTrading.toFixed(decimals)),
      fundingGain: Number(runningFunding.toFixed(decimals)),
      otherOpGain: Number(runningOtherOp.toFixed(decimals)),
      totalGain: Number((runningTrading + runningFunding + runningOtherOp).toFixed(decimals)),
    });
  });

  // ── 3. Primary Result Reconciliation ──
  const absoluteGainBig = netTradingPnl.plus(netFunding).plus(otherOpNet);
  const resolvedFinalBalanceBig = hasAnyExplicitWalletBalance ? finalBalanceBig : absoluteGainBig;
  const initialBalanceBig = resolvedFinalBalanceBig
    .minus(absoluteGainBig)
    .minus(totalInflow)
    .plus(totalOutflow);

  // Basis excludes Spot asset swaps (which shuffle existing capital) but accounts for genuine new deposits
  const roiBasis = initialBalanceBig.plus(depositsInPeriod);
  let percentageGain = 0;
  if (roiBasis.gt(0)) {
    percentageGain = absoluteGainBig.div(roiBasis).times(100).toNumber();
  } else if (roiBasis.eq(0) && absoluteGainBig.gt(0)) {
    percentageGain = 100;
  }
  const dailyAverageRoi = durationDays > 0 ? percentageGain / durationDays : 0;

  const currentAssetRate = rateOf(denom);
  const absoluteGainUsd = isUsdDenom
    ? absoluteGainBig.toFixed(2)
    : absoluteGainBig.times(currentAssetRate).toFixed(2);

  const primaryResult: PrimaryResultMetrics = {
    percentageGain,
    absoluteGain: absoluteGainBig.toFixed(decimals),
    absoluteGainUsd,
    initialBalance: initialBalanceBig.toFixed(decimals),
    finalBalance: resolvedFinalBalanceBig.toFixed(decimals),
    dailyAverageRoi,
    depositsInPeriod: depositsInPeriod.toFixed(decimals),
    withdrawalsInPeriod: withdrawalsInPeriod.toFixed(decimals),
    durationDays,
    earliestDate: new Date(earliestTime).toLocaleDateString('en-GB', { timeZone: 'UTC' }),
    latestDate: new Date(latestTime).toLocaleDateString('en-GB', { timeZone: 'UTC' }),
  };

  // ── 4. Operations & Fee Efficiency ──
  let feeCostPct = 0;
  if (grossCashFlow.gt(0)) {
    feeCostPct = feesPaid.div(grossCashFlow).times(100).toNumber();
  } else if (feesPaid.gt(0)) {
    // Positive fees paid with zero gross profit means 100% fee drag relative to gross profits
    feeCostPct = 100;
  }

  let feeStatus: 'Excellent' | 'Acceptable' | 'Moderate' | 'High' = 'Acceptable';
  let feeInterpretation = 'Within expected range for trading strategy.';
  let feeAction = 'Monitor and look for spot optimizations.';

  if (grossCashFlow.lte(0) && feesPaid.gt(0)) {
    feeStatus = 'High';
    feeInterpretation = 'Trading fees incurred without offsetting positive gross cash flow.';
    feeAction = 'Review execution sizing, maker/taker ratio, and fee tiers.';
  } else if (feeCostPct < 5) {
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

  const fundingRatioVal = fundingPaid.gt(0)
    ? fundingReceived.div(fundingPaid).toFixed(2)
    : (fundingReceived.gt(0) ? '∞' : '0.00');

  const classifiedTrades = buysCount + sellsCount;

  const operations: OperationsResultMetrics = {
    grossCashFlow: grossCashFlow.toFixed(decimals),
    feesPaid: feesPaid.toFixed(decimals),
    netTradingPnl: netTradingPnl.toFixed(decimals),
    fundingReceived: fundingReceived.toFixed(decimals),
    fundingPaid: fundingPaid.toFixed(decimals),
    netFunding: netFunding.toFixed(decimals),
    fundingRatio: `${fundingRatioVal}:1`,
    otherOperational: {
      net: otherOpNet.toFixed(decimals),
      liquidationNet: liquidationNet.toFixed(decimals),
      deliveryNet: deliveryNet.toFixed(decimals),
      interestNet: interestNet.toFixed(decimals),
      rewardsNet: rewardsNet.toFixed(decimals),
      otherFeesNet: otherFeesNet.toFixed(decimals),
      count: otherOpCount,
    },
    totalTrades,
    buysCount,
    sellsCount,
    buysPct: classifiedTrades > 0 ? (buysCount / classifiedTrades) * 100 : 0,
    sellsPct: classifiedTrades > 0 ? (sellsCount / classifiedTrades) * 100 : 0,
    tradesPerDay: totalTrades / durationDays,
    feeCostPct,
    feeStatus,
    feeInterpretation,
    feeAction,
  };

  // ── 5. Advanced Performance (Win Rate, Profit Factor, Consistency CV) ──
  const dailyValues = Object.values(dailyMap);
  const positiveDays = dailyValues.filter((d) => d.total > 0).length;
  const totalActiveDays = dailyValues.length;
  const winRate = totalActiveDays > 0 ? (positiveDays / totalActiveDays) * 100 : 0;

  let totalGains = new Big(0);
  let totalLosses = new Big(0);
  dailyValues.forEach((d) => {
    if (d.total > 0) totalGains = totalGains.plus(new Big(d.total));
    if (d.total < 0) totalLosses = totalLosses.plus(new Big(Math.abs(d.total)));
  });

  const profitFactor = totalLosses.gt(0)
    ? totalGains.div(totalLosses).toNumber()
    : (totalGains.gt(0) ? 99.9 : 0);

  let profitFactorRating: AdvancedPerformanceMetrics['profitFactorRating'] = 'Excellent';
  if (profitFactor < 1.0) profitFactorRating = 'Loss-making';
  else if (profitFactor <= 1.5) profitFactorRating = 'Marginal';
  else if (profitFactor <= 2.0) profitFactorRating = 'Good';

  const evalDaysDivisor = totalActiveDays || 1;
  const meanDaily = dailyValues.reduce((sum, d) => sum + d.total, 0) / evalDaysDivisor;
  const variance = dailyValues.reduce((sum, d) => sum + Math.pow(d.total - meanDaily, 2), 0) / evalDaysDivisor;
  const stdDev = Math.sqrt(variance);
  const cv = meanDaily !== 0 ? Math.abs((stdDev / meanDaily) * 100) : 0;

  let consistencyRating: AdvancedPerformanceMetrics['consistencyRating'] = 'Highly Consistent';
  if (cv > 100) consistencyRating = 'High Dispersion';
  else if (cv >= 50) consistencyRating = 'Moderate Consistency';

  const advancedMetrics: AdvancedPerformanceMetrics = {
    winRate,
    positiveDaysCount: positiveDays,
    totalDaysEvaluated: totalActiveDays,
    profitFactor,
    profitFactorRating,
    totalGains: totalGains.toFixed(decimals),
    totalLosses: totalLosses.toFixed(decimals),
    consistencyIndexCv: cv,
    consistencyRating,
  };

  // ── 6. Day of the Week (UTC) ──
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  const dayOfWeekList: DayOfWeekItem[] = dayOrder.map((idx) => ({
    dayName: dayNames[idx],
    dayIndex: idx,
    trades: dayOfWeekMap[idx].trades,
    tradingGain: Number(dayOfWeekMap[idx].trading.toFixed(decimals)),
    fundingGain: Number(dayOfWeekMap[idx].funding.toFixed(decimals)),
    otherOpGain: Number(dayOfWeekMap[idx].otherOp.toFixed(decimals)),
    totalGain: Number(dayOfWeekMap[idx].total.toFixed(decimals)),
  }));

  const sortedByGain = [...dayOfWeekList].sort((a, b) => b.totalGain - a.totalGain);
  const bestDay = { name: sortedByGain[0]?.dayName || '-', gain: sortedByGain[0]?.totalGain || 0 };
  const worstDay = { name: sortedByGain[sortedByGain.length - 1]?.dayName || '-', gain: sortedByGain[sortedByGain.length - 1]?.totalGain || 0 };

  // ── 7. Time of Day (UTC) ──
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
    tradingGain: Number(timeOfDayMap[idx].trading.toFixed(decimals)),
    fundingGain: Number(timeOfDayMap[idx].funding.toFixed(decimals)),
    otherOpGain: Number(timeOfDayMap[idx].otherOp.toFixed(decimals)),
    totalGain: Number(timeOfDayMap[idx].total.toFixed(decimals)),
  }));

  const sortedTime = [...timeOfDayList].sort((a, b) => b.totalGain - a.totalGain);
  const bestTime = { period: sortedTime[0]?.periodLabel || '-', gain: sortedTime[0]?.totalGain || 0 };
  const worstTime = { period: sortedTime[sortedTime.length - 1]?.periodLabel || '-', gain: sortedTime[sortedTime.length - 1]?.totalGain || 0 };

  // ── 8. Price Milestones ──
  const priceMilestonesList: PriceMilestoneItem[] = Object.entries(milestoneMap)
    .map(([mPrice, item]) => {
      const numPrice = Number(mPrice);
      const delta = item.lastEquity - item.firstEquity;
      const deltaPct = item.firstEquity > 0 ? (delta / item.firstEquity) * 100 : 0;
      const sign = delta >= 0 ? '+' : '-';
      const gainLossFormatted = isUsdDenom
        ? `${sign}$${Math.abs(delta).toFixed(2)}`
        : `${sign}${Math.abs(delta).toFixed(decimals)} ${denom}`;
      return {
        milestonePrice: numPrice,
        formattedMilestone: `$${numPrice.toLocaleString('en-US')}`,
        passages: item.count,
        firstPassageEquity: item.firstEquity,
        lastPassageEquity: item.lastEquity,
        gainLoss: delta,
        gainLossFormatted,
        gainLossPct: deltaPct,
      };
    })
    .sort((a, b) => a.milestonePrice - b.milestonePrice);

  // Single-pass downsampling (max 80 points)
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
    resolvedMilestoneAsset,
    availableMilestoneAssets,
  };
}
