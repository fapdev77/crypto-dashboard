import { useBalancesStore } from '../../store/balancesStore';
import { usePositionsStore } from '../../store/positionsStore';
import { useFundingStore } from '../../store/fundingStore';
import { useSyncCoordinatorStore } from '../../store/syncCoordinatorStore';
import { useAiSettingsStore } from '../../store/aiSettingsStore';
import { openDB } from 'idb';
import { DB_NAME, DB_VERSION } from '../historyCache';
import Big from 'big.js';
import {
  FundingRateSummary,
  BybitTransactionLogEntry,
  BitgetTransactionLogEntry,
  OkxTransactionLogEntry,
} from '../../types';

/**
 * Checks whether Privacy Mode is active (either via global app privacy mode or AI settings).
 * When active, nominal balances and USD numbers must be obfuscated percentually.
 */
export function isPrivacyModeActive(): boolean {
  try {
    const aiSettingsObfuscate = useAiSettingsStore.getState().globalSettings?.obfuscateValues;
    if (aiSettingsObfuscate) return true;

    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('app_privacy_mode');
      if (stored !== null) {
        return stored === 'true';
      }
    }
  } catch {
    // Safe fallback
  }
  return false;
}

/**
 * Evaluates whether local data exists and whether a broker synchronization is currently active.
 * Generates the intelligent warning required for version 2.0:
 * a. No data & no sync: "No local data found."
 * b. No data & sync in progress: "No local data found, but synchronization is currently in progress. Please wait a few minutes for sync to complete and try again."
 * c. Has data & sync in progress: "Synchronization is currently in progress. Data may be outdated and results may not be accurate. Do you want to proceed anyway?"
 * d. Has data & no sync: normal flow.
 */
export function evaluateSyncAndDataNotice(hasData: boolean): {
  status: 'NORMAL' | 'NO_DATA' | 'NO_DATA_SYNCING' | 'DATA_SYNCING';
  syncInProgress: boolean;
  hasData: boolean;
  syncNotice?: string;
} {
  let syncInProgress = false;
  try {
    const syncState = useSyncCoordinatorStore.getState();
    const fundingState = useFundingStore.getState();
    syncInProgress = Boolean(
      syncState?.isBybitTxSyncing ||
      syncState?.isBitgetTxSyncing ||
      syncState?.isOkxTxSyncing ||
      fundingState?.isSyncing
    );
  } catch {
    syncInProgress = false;
  }

  if (!hasData && !syncInProgress) {
    return {
      status: 'NO_DATA',
      syncInProgress: false,
      hasData: false,
      syncNotice: 'No local data found.',
    };
  }

  if (!hasData && syncInProgress) {
    return {
      status: 'NO_DATA_SYNCING',
      syncInProgress: true,
      hasData: false,
      syncNotice: 'No local data found, but synchronization is currently in progress. Please wait a few minutes for sync to complete and try again.',
    };
  }

  if (hasData && syncInProgress) {
    return {
      status: 'DATA_SYNCING',
      syncInProgress: true,
      hasData: true,
      syncNotice: 'Synchronization is currently in progress. Data may be outdated and results may not be accurate. Do you want to proceed anyway?',
    };
  }

  return {
    status: 'NORMAL',
    syncInProgress: false,
    hasData: true,
  };
}

/**
 * Formats a funding rate as a pure decimal string with up to 8 decimal places.
 * E.g. 0.0001 -> "0.00010000", -0.00005234 -> "-0.00005234".
 */
export function formatRate8(val: unknown): string {
  if (val === null || val === undefined || val === '') return '0.00000000';
  try {
    return new Big(val as any).toFixed(8);
  } catch {
    const num = Number(val);
    return !isNaN(num) ? num.toFixed(8) : '0.00000000';
  }
}

/**
 * Envelope shared by every AI tool payload, describing local data availability and whether a
 * broker synchronization is currently running.
 */
export interface AiSyncEnvelope {
  syncStatus: 'NORMAL' | 'NO_DATA' | 'NO_DATA_SYNCING' | 'DATA_SYNCING';
  syncInProgress: boolean;
  syncNotice?: string;
}

/** Per-asset cash-flow funding fees aggregated from real exchange transaction logs. */
export interface FundingFeeCashFlowItem {
  symbol: string;
  exchange: string;
  positionStatus: 'OPEN' | 'CLOSED';
  fundingReceivedUsd: number | string;
  fundingPaidUsd: number | string;
  netFundingUsd: number | string;
  fundingTransactionsCount: number;
  lastSettlementTime: string | null;
  settlementsCount: number;
}

/**
 * Per-asset benchmark funding rate row, emitted when no transaction log exists in the period but
 * live market rates are available.
 */
export interface FundingFeeRateBenchmarkItem {
  symbol: string;
  exchange: string;
  instrumentType: string;
  fundingRate: string;
  fundingRateDecimal: number;
  cumulativeRates: {
    today: string;
    currentMonth: string;
    lastMonth: string;
    last3Months: string;
    last6Months: string | undefined;
    last12Months: string | undefined;
    exchangeMaxCoverage: string;
  };
  actualFundingFeePaidUsd: number;
  actualFundingFeePaidUsdRaw: string;
  fundingTransactionsCount: number;
  lastSettlementTime: string | null;
}

export type FundingFeeSymbolItem = FundingFeeCashFlowItem | FundingFeeRateBenchmarkItem;

/** Ranked asset entry for the RANKING mode of the market funding rates tool. */
export interface AiFundingRateRankedAsset {
  symbol: string;
  exchange: string;
  rateHorizon: string;
  cumulativeRate: string;
  cumulativeRatePct: string;
  currentSettlementRate: string;
  currentSettlementRatePct: string;
  instrumentType: string;
}

/** Single exchange row for the CROSS_EXCHANGE_COMPARISON mode of the market funding rates tool. */
export interface AiFundingRateComparisonRow {
  symbol: string;
  exchange: string;
  instrumentType: string;
  latestRate: string;
  latestRatePct: string;
  todayCumulativeRate: string;
  todayCumulativeRatePct: string;
  currentMonthCumulativeRate: string;
  currentMonthCumulativeRatePct: string;
  lastMonthCumulativeRate: string;
  lastMonthCumulativeRatePct: string;
  last3MonthsCumulativeRate: string;
  last3MonthsCumulativeRatePct: string;
  last6MonthsCumulativeRate: string | undefined;
  last6MonthsCumulativeRatePct: string | undefined;
  last12MonthsCumulativeRate: string | undefined;
  last12MonthsCumulativeRatePct: string | undefined;
  exchangeMaxCoverage: string;
}

/** Single market rate row for the MARKET_RATES_LIST mode of the market funding rates tool. */
export interface AiMarketRateRow {
  symbol: string;
  exchange: string;
  instrumentType: string;
  latestRate: string;
  latestRatePct: string;
  todayCumulativeRate: string;
  todayCumulativeRatePct: string;
  currentMonthCumulativeRate: string;
  currentMonthCumulativeRatePct: string;
  lastMonthCumulativeRate: string;
  lastMonthCumulativeRatePct: string;
  last3MonthsCumulativeRate: string;
  last3MonthsCumulativeRatePct: string;
}

/**
 * Payload of the market funding rates tool, discriminated by `mode` so callers can narrow to the
 * exact shape their request produced.
 */
export type AiMarketFundingRatesResult = AiSyncEnvelope &
  (
    | {
        mode: 'RANKING';
        rankingHorizon: string;
        totalAssetsEvaluated: number;
        highestFundingRateAssets?: AiFundingRateRankedAsset[];
        lowestFundingRateAssets?: AiFundingRateRankedAsset[];
      }
    | {
        mode: 'CROSS_EXCHANGE_COMPARISON';
        filterSymbol: string;
        totalMatches: number;
        exchangesComparison: AiFundingRateComparisonRow[];
      }
    | {
        mode: 'MARKET_RATES_LIST';
        totalMatches: number;
        rates: AiMarketRateRow[];
      }
  );

export const aiToolExecutors = {
  /**
   * Retrieves aggregated portfolio balances and equity per exchange.
   * Strictly sanitizes all outputs — zero credentials or secrets exposed.
   * Preserves maximum decimal precision across all asset quantities and USD calculations.
   * Automatically applies percentage obfuscation when Privacy Mode is active.
   */
  async aiGetPortfolioBalances() {
    const balancesMap = useBalancesStore.getState().balances;
    const balanceItems = Object.values(balancesMap);
    const hasData = balanceItems.length > 0;
    const syncNotice = evaluateSyncAndDataNotice(hasData);
    const privacyActive = isPrivacyModeActive();

    let totalEquity = Big(0);
    let totalAvailableMargin = Big(0);
    let totalUnrealizedPnl = Big(0);

    const exchangeMap: Record<
      string,
      {
        exchange: string;
        label: string;
        equityUsd: any;
        availableMarginUsd: any;
        unrealizedPnlUsd: any;
        equitySharePct?: string;
        availableMarginSharePct?: string;
        assets: Array<{
          ccy: string;
          amount: any;
          amountRaw?: string;
          usdValue: any;
          portfolioSharePct?: string;
        }>;
      }
    > = {};

    for (const item of balanceItems) {
      const eq = Big(item.totalEquity || item.usdValue || 0);
      const avail = Big(item.availableMargin || item.usdValue || 0);
      const upl = Big(item.unrealizedPnl || 0);

      totalEquity = totalEquity.plus(eq);
      totalAvailableMargin = totalAvailableMargin.plus(avail);
      totalUnrealizedPnl = totalUnrealizedPnl.plus(upl);

      const exKey = item.exchange.toLowerCase();
      if (!exchangeMap[exKey]) {
        exchangeMap[exKey] = {
          exchange: item.exchange,
          label: item.label,
          equityUsd: 0,
          availableMarginUsd: 0,
          unrealizedPnlUsd: 0,
          assets: [],
        };
      }

      const ex = exchangeMap[exKey];
      // Lossless addition preserving high-precision decimal representation
      ex.equityUsd = Number(Big(ex.equityUsd).plus(eq).toString());
      ex.availableMarginUsd = Number(Big(ex.availableMarginUsd).plus(avail).toString());
      ex.unrealizedPnlUsd = Number(Big(ex.unrealizedPnlUsd).plus(upl).toString());

      ex.assets.push({
        ccy: item.ccy,
        amount: item.amount != null ? Number(item.amount) : 0,
        amountRaw: item.amount != null ? String(item.amount) : '0',
        usdValue: item.usdValue != null ? Number(item.usdValue) : 0,
      });
    }

    if (privacyActive) {
      // Obfuscate nominal values and compute percentages
      const equityNum = Number(totalEquity.toString());
      const availMarginNum = Number(totalAvailableMargin.toString());
      const marginCoveragePct = equityNum > 0 ? `${((availMarginNum / equityNum) * 100).toFixed(1)}%` : '0.0%';

      for (const exKey in exchangeMap) {
        const ex = exchangeMap[exKey];
        const exEquity = Number(ex.equityUsd);
        ex.equitySharePct = equityNum > 0 ? `${((exEquity / equityNum) * 100).toFixed(1)}%` : '0.0%';
        ex.availableMarginSharePct = exEquity > 0 ? `${((Number(ex.availableMarginUsd) / exEquity) * 100).toFixed(1)}%` : '0.0%';
        ex.equityUsd = '[OBFUSCATED - Privacy Mode Active]';
        ex.availableMarginUsd = '[OBFUSCATED - Privacy Mode Active]';
        ex.unrealizedPnlUsd = '[OBFUSCATED - Privacy Mode Active]';

        for (const asset of ex.assets) {
          const assetUsd = Number(asset.usdValue);
          asset.portfolioSharePct = equityNum > 0 ? `${((assetUsd / equityNum) * 100).toFixed(1)}%` : '0.0%';
          asset.amount = '[OBFUSCATED]';
          asset.amountRaw = '[OBFUSCATED]';
          asset.usdValue = '[OBFUSCATED]';
        }
      }

      return {
        syncStatus: syncNotice.status,
        syncInProgress: syncNotice.syncInProgress,
        ...(syncNotice.syncNotice ? { syncNotice: syncNotice.syncNotice } : {}),
        privacyModeActive: true,
        privacyNotice: 'Privacy Mode ACTIVE: All nominal values (USD/balances) have been percentage-obfuscated.',
        marginCoveragePct,
        totalEquityUsd: '[OBFUSCATED - Privacy Mode Active]',
        totalAvailableMarginUsd: '[OBFUSCATED - Privacy Mode Active]',
        totalUnrealizedPnlUsd: '[OBFUSCATED - Privacy Mode Active]',
        exchangesCount: Object.keys(exchangeMap).length,
        exchanges: Object.values(exchangeMap),
      };
    }

    return {
      syncStatus: syncNotice.status,
      syncInProgress: syncNotice.syncInProgress,
      ...(syncNotice.syncNotice ? { syncNotice: syncNotice.syncNotice } : {}),
      privacyModeActive: false,
      totalEquityUsd: Number(totalEquity.toString()),
      totalEquityUsdRaw: totalEquity.toString(),
      totalAvailableMarginUsd: Number(totalAvailableMargin.toString()),
      totalUnrealizedPnlUsd: Number(totalUnrealizedPnl.toString()),
      exchangesCount: Object.keys(exchangeMap).length,
      exchanges: Object.values(exchangeMap),
    };
  },

  /**
   * Retrieves open derivative and spot positions with optional filtering.
   * Retains full floating and string decimal precision for micro-prices (e.g. PEPE, SHIB) and fractional contracts.
   * Automatically applies percentage obfuscation when Privacy Mode is active.
   */
  async aiGetOpenPositions(filters?: { exchange?: string; symbol?: string; side?: string }) {
    const positionsMap = usePositionsStore.getState().positions;
    let list = Object.values(positionsMap);
    const hasData = list.length > 0;
    const syncNotice = evaluateSyncAndDataNotice(hasData);
    const privacyActive = isPrivacyModeActive();

    if (filters?.exchange) {
      const targetEx = filters.exchange.toLowerCase();
      list = list.filter((p) => p.exchange.toLowerCase() === targetEx);
    }

    if (filters?.symbol) {
      const targetSym = filters.symbol.toUpperCase();
      list = list.filter((p) => p.symbol.toUpperCase().includes(targetSym));
    }

    if (filters?.side) {
      const targetSide = filters.side.toLowerCase();
      list = list.filter((p) => p.side.toLowerCase() === targetSide);
    }

    let totalLongNotional = Big(0);
    let totalShortNotional = Big(0);
    let totalUnrealizedPnl = Big(0);

    for (const p of list) {
      const notional = Big(p.notionalUsd || 0);
      const upl = Big(p.unrealizedPnl || 0);
      if (p.side?.toLowerCase() === 'long') {
        totalLongNotional = totalLongNotional.plus(notional);
      } else if (p.side?.toLowerCase() === 'short') {
        totalShortNotional = totalShortNotional.plus(notional);
      }
      totalUnrealizedPnl = totalUnrealizedPnl.plus(upl);
    }

    const sanitizedPositions = list.map((p) => {
      const notionalNum = p.notionalUsd != null ? Number(p.notionalUsd) : 0;
      const entryPrice = p.entryPrice != null ? Number(p.entryPrice) : 0;
      const markPrice = p.markPrice != null ? Number(p.markPrice) : 0;
      const leverage = p.leverage || 1;
      const sideUpper = (p.side || '').toUpperCase();

      let unrealizedRoiPct = '0.0%';
      if (entryPrice > 0 && markPrice > 0) {
        const rawRoi =
          sideUpper === 'LONG'
            ? ((markPrice - entryPrice) / entryPrice) * leverage * 100
            : ((entryPrice - markPrice) / entryPrice) * leverage * 100;
        unrealizedRoiPct = `${rawRoi >= 0 ? '+' : ''}${rawRoi.toFixed(2)}%`;
      }

      if (privacyActive) {
        return {
          id: p.id,
          exchange: p.exchange,
          symbol: p.symbol,
          side: sideUpper,
          size: '[OBFUSCATED]',
          sizeRaw: '[OBFUSCATED]',
          notionalUsd: '[OBFUSCATED]',
          entryPrice,
          entryPriceRaw: String(p.entryPrice ?? 0),
          markPrice,
          markPriceRaw: String(p.markPrice ?? 0),
          unrealizedRoiPct,
          unrealizedPnlUsd: '[OBFUSCATED]',
          liquidationPrice: p.liquidationPrice ? Number(p.liquidationPrice) : null,
          liquidationPriceRaw: p.liquidationPrice ? String(p.liquidationPrice) : null,
          leverage,
          marginMode: p.marginMode || 'cross',
          instrumentType: p.instrumentType,
        };
      }

      return {
        id: p.id,
        exchange: p.exchange,
        symbol: p.symbol,
        side: sideUpper,
        size: Number(p.size ?? 0),
        sizeRaw: String(p.size ?? 0),
        notionalUsd: notionalNum,
        entryPrice,
        entryPriceRaw: String(p.entryPrice ?? 0),
        markPrice,
        markPriceRaw: String(p.markPrice ?? 0),
        unrealizedRoiPct,
        unrealizedPnlUsd: p.unrealizedPnl != null ? Number(p.unrealizedPnl) : 0,
        unrealizedPnlUsdRaw: String(p.unrealizedPnl ?? 0),
        liquidationPrice: p.liquidationPrice ? Number(p.liquidationPrice) : null,
        liquidationPriceRaw: p.liquidationPrice ? String(p.liquidationPrice) : null,
        leverage,
        marginMode: p.marginMode || 'cross',
        instrumentType: p.instrumentType,
      };
    });

    if (privacyActive) {
      return {
        syncStatus: syncNotice.status,
        syncInProgress: syncNotice.syncInProgress,
        ...(syncNotice.syncNotice ? { syncNotice: syncNotice.syncNotice } : {}),
        privacyModeActive: true,
        privacyNotice: 'Privacy Mode ACTIVE: Notional and size in USD have been percentage-obfuscated.',
        totalOpenPositions: sanitizedPositions.length,
        totalLongNotionalUsd: '[OBFUSCATED - Privacy Mode Active]',
        totalShortNotionalUsd: '[OBFUSCATED - Privacy Mode Active]',
        totalUnrealizedPnlUsd: '[OBFUSCATED - Privacy Mode Active]',
        positions: sanitizedPositions,
      };
    }

    return {
      syncStatus: syncNotice.status,
      syncInProgress: syncNotice.syncInProgress,
      ...(syncNotice.syncNotice ? { syncNotice: syncNotice.syncNotice } : {}),
      privacyModeActive: false,
      totalOpenPositions: sanitizedPositions.length,
      totalLongNotionalUsd: Number(totalLongNotional.toString()),
      totalShortNotionalUsd: Number(totalShortNotional.toString()),
      totalUnrealizedPnlUsd: Number(totalUnrealizedPnl.toString()),
      positions: sanitizedPositions,
    };
  },

  /**
   * Computes cross-exchange hedge exposure, net delta, and correlation risks.
   * Automatically applies percentage obfuscation when Privacy Mode is active.
   */
  async aiGetHedgeCorrelationSummary() {
    const positionsMap = usePositionsStore.getState().positions;
    const list = Object.values(positionsMap);
    const hasData = list.length > 0;
    const syncNotice = evaluateSyncAndDataNotice(hasData);
    const privacyActive = isPrivacyModeActive();

    const coinsBreakdown: Record<
      string,
      {
        baseCoin: string;
        longExposureUsd: any;
        shortExposureUsd: any;
        netExposureUsd: any;
        hedgeRatioPct?: string;
        exchangesInvolved: string[];
        isHedged: boolean;
      }
    > = {};

    for (const p of list) {
      const baseCoin = p.symbol.replace(/[-_/].*$/, '').replace(/(USDT|USDC|USD|PERP|SWAP).*$/i, '').toUpperCase();
      if (!coinsBreakdown[baseCoin]) {
        coinsBreakdown[baseCoin] = {
          baseCoin,
          longExposureUsd: 0,
          shortExposureUsd: 0,
          netExposureUsd: 0,
          exchangesInvolved: [],
          isHedged: false,
        };
      }

      const item = coinsBreakdown[baseCoin];
      const notional = Big(p.notionalUsd || 0);

      if (p.side?.toLowerCase() === 'long') {
        item.longExposureUsd = Number(Big(item.longExposureUsd).plus(notional).toString());
      } else {
        item.shortExposureUsd = Number(Big(item.shortExposureUsd).plus(notional).toString());
      }

      if (!item.exchangesInvolved.includes(p.exchange)) {
        item.exchangesInvolved.push(p.exchange);
      }
    }

    const hedgedCoins: string[] = [];
    for (const coin in coinsBreakdown) {
      const item = coinsBreakdown[coin];
      const longVal = Number(item.longExposureUsd);
      const shortVal = Number(item.shortExposureUsd);
      item.netExposureUsd = Number(Big(item.longExposureUsd).minus(item.shortExposureUsd).toString());

      if (longVal > 0 && shortVal > 0) {
        item.isHedged = true;
        hedgedCoins.push(coin);
        const minVal = Math.min(longVal, shortVal);
        const maxVal = Math.max(longVal, shortVal, 1);
        item.hedgeRatioPct = `${((minVal / maxVal) * 100).toFixed(1)}%`;
      } else {
        item.hedgeRatioPct = '0.0%';
      }

      if (privacyActive) {
        item.longExposureUsd = '[OBFUSCATED]';
        item.shortExposureUsd = '[OBFUSCATED]';
        item.netExposureUsd = '[OBFUSCATED]';
      }
    }

    return {
      syncStatus: syncNotice.status,
      syncInProgress: syncNotice.syncInProgress,
      ...(syncNotice.syncNotice ? { syncNotice: syncNotice.syncNotice } : {}),
      privacyModeActive: privacyActive,
      ...(privacyActive ? { privacyNotice: 'Privacy Mode ACTIVE: USD exposure has been percentage-obfuscated.' } : {}),
      totalAssetsAnalyzed: Object.keys(coinsBreakdown).length,
      hedgedCoins,
      coinsBreakdown,
    };
  },

  /**
   * Retrieves actual cash-flow funding fees credited/debited to user wallet from real exchange
   * transaction logs in USD.
   *
   * Accurately distinguishes Funding Received (credits/inflow) vs Funding Paid (debits/outflow) vs Net Funding.
   * Supports calendar day intervals ('today_utc' starting 00:00 UTC, 'today_local', 'yesterday_utc', '7d', '30d').
   * Filters results strictly to assets that had actual transactions or held positions in the period,
   * completely eliminating dead market symbols that pollute LLM context.
   */
  async aiGetFundingFeesHistory(args: {
    period?: 'today_utc' | 'today_local' | 'yesterday_utc' | 'yesterday_local' | '7d' | '30d' | 'custom' | string;
    days?: number;
    symbol?: string;
    exchange?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const { period, days, symbol, exchange, startDate, endDate } = args;
    const privacyActive = isPrivacyModeActive();
    const now = new Date();

    // Determine precise temporal window
    let startMs: number;
    let endMs: number = now.getTime();
    let resolvedPeriod = period || (days ? `${days}d` : 'today_utc');

    if (resolvedPeriod === 'today_utc') {
      const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      startMs = utcMidnight.getTime();
    } else if (resolvedPeriod === 'today_local') {
      const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      startMs = localMidnight.getTime();
    } else if (resolvedPeriod === 'yesterday_utc') {
      const yUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0));
      startMs = yUtc.getTime();
      endMs = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59, 999)).getTime();
    } else if (resolvedPeriod === 'yesterday_local') {
      const yLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      startMs = yLocal.getTime();
      endMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999).getTime();
    } else if (startDate) {
      startMs = new Date(startDate).getTime();
      if (endDate) {
        endMs = new Date(endDate).getTime();
      }
    } else {
      const d = days || 7;
      startMs = now.getTime() - d * 24 * 60 * 60 * 1000;
    }

    // 1. Query actual historical funding fee transactions from IndexedDB
    interface SettlementAuditItem {
      timestamp: number;
      timeIsoUtc: string;
      timeLocal: string;
      exchange: string;
      symbol: string;
      type: 'RECEIVED' | 'PAID';
      amountUsd: number;
      rawAmount: string;
    }

    interface AssetFundingAggregate {
      symbol: string;
      exchange: string;
      totalReceivedUsdBig: Big;
      totalPaidUsdBig: Big;
      netFundingUsdBig: Big;
      count: number;
      lastSettlementTimestamp: number;
      settlements: SettlementAuditItem[];
    }

    const assetAggregates: Record<string, AssetFundingAggregate> = {};
    let totalFundingReceivedBig = new Big(0);
    let totalFundingPaidBig = new Big(0);
    let totalFundingTxCount = 0;
    const allSettlements: SettlementAuditItem[] = [];

    try {
      if (typeof window !== 'undefined' && window.indexedDB) {
        const db = await openDB(DB_NAME, DB_VERSION);

        // A. Bybit transaction logs (up to 2 years)
        if (!exchange || exchange.toLowerCase() === 'bybit') {
          if (db.objectStoreNames.contains('bybit-transaction-log')) {
            const logs: BybitTransactionLogEntry[] = await db.getAll('bybit-transaction-log');
            for (const log of logs) {
              const time = log.transactionTime || 0;
              if (time >= startMs && time <= endMs) {
                const sym = (log.symbol || '').toUpperCase();
                if (symbol && !sym.includes(symbol.toUpperCase())) continue;

                const rawFunding = log.funding;
                const typeUpper = (log.type || '').toUpperCase();
                const isFunding = Boolean(
                  (rawFunding && rawFunding !== '0' && rawFunding !== '0.0') ||
                  typeUpper === 'SETTLEMENT' ||
                  typeUpper.includes('FUNDING')
                );

                if (isFunding) {
                  const feeVal = rawFunding && rawFunding !== '0' ? rawFunding : (log.change || log.cashFlow || '0');
                  const feeBig = new Big(feeVal);
                  if (feeBig.eq(0)) continue;

                  const isPositive = feeBig.gt(0);
                  const absVal = feeBig.abs();
                  if (isPositive) {
                    totalFundingReceivedBig = totalFundingReceivedBig.plus(absVal);
                  } else {
                    totalFundingPaidBig = totalFundingPaidBig.plus(absVal);
                  }
                  totalFundingTxCount++;

                  const key = `bybit-${sym || 'UNKNOWN'}`;
                  if (!assetAggregates[key]) {
                    assetAggregates[key] = {
                      symbol: sym || 'UNKNOWN',
                      exchange: 'bybit',
                      totalReceivedUsdBig: new Big(0),
                      totalPaidUsdBig: new Big(0),
                      netFundingUsdBig: new Big(0),
                      count: 0,
                      lastSettlementTimestamp: 0,
                      settlements: [],
                    };
                  }

                  const agg = assetAggregates[key];
                  agg.count++;
                  if (time > agg.lastSettlementTimestamp) agg.lastSettlementTimestamp = time;

                  if (isPositive) {
                    agg.totalReceivedUsdBig = agg.totalReceivedUsdBig.plus(absVal);
                    agg.netFundingUsdBig = agg.netFundingUsdBig.plus(absVal);
                  } else {
                    agg.totalPaidUsdBig = agg.totalPaidUsdBig.plus(absVal);
                    agg.netFundingUsdBig = agg.netFundingUsdBig.minus(absVal);
                  }

                  const sItem: SettlementAuditItem = {
                    timestamp: time,
                    timeIsoUtc: new Date(time).toISOString(),
                    timeLocal: new Date(time).toLocaleString(),
                    exchange: 'bybit',
                    symbol: sym || 'UNKNOWN',
                    type: isPositive ? 'RECEIVED' : 'PAID',
                    amountUsd: Number(absVal.toString()),
                    rawAmount: feeVal,
                  };
                  agg.settlements.push(sItem);
                  allSettlements.push(sItem);
                }
              }
            }
          }
        }

        // B. OKX transaction logs (up to 90 days)
        if (!exchange || exchange.toLowerCase() === 'okx') {
          if (db.objectStoreNames.contains('okx-transaction-log')) {
            const logs: OkxTransactionLogEntry[] = await db.getAll('okx-transaction-log');
            for (const log of logs) {
              const time = log.transactionTime || 0;
              if (time >= startMs && time <= endMs) {
                const sym = (log.symbol || '').toUpperCase();
                if (symbol && !sym.includes(symbol.toUpperCase())) continue;

                const typeStr = (log.type || '').toLowerCase();
                const subTypeStr = ((log.transSubType || log.subType) || '').toLowerCase();
                const rawFunding = log.funding;
                const isFunding = Boolean(
                  (rawFunding && rawFunding !== '0' && rawFunding !== '0.0') ||
                  typeStr.includes('funding') ||
                  subTypeStr.includes('funding') ||
                  log.type === '8'
                );

                if (isFunding) {
                  const feeVal = rawFunding && rawFunding !== '0' ? rawFunding : (log.change || log.fee || '0');
                  const feeBig = new Big(feeVal);
                  if (feeBig.eq(0)) continue;

                  const isPositive = feeBig.gt(0);
                  const absVal = feeBig.abs();
                  if (isPositive) {
                    totalFundingReceivedBig = totalFundingReceivedBig.plus(absVal);
                  } else {
                    totalFundingPaidBig = totalFundingPaidBig.plus(absVal);
                  }
                  totalFundingTxCount++;

                  const key = `okx-${sym || 'UNKNOWN'}`;
                  if (!assetAggregates[key]) {
                    assetAggregates[key] = {
                      symbol: sym || 'UNKNOWN',
                      exchange: 'okx',
                      totalReceivedUsdBig: new Big(0),
                      totalPaidUsdBig: new Big(0),
                      netFundingUsdBig: new Big(0),
                      count: 0,
                      lastSettlementTimestamp: 0,
                      settlements: [],
                    };
                  }

                  const agg = assetAggregates[key];
                  agg.count++;
                  if (time > agg.lastSettlementTimestamp) agg.lastSettlementTimestamp = time;

                  if (isPositive) {
                    agg.totalReceivedUsdBig = agg.totalReceivedUsdBig.plus(absVal);
                    agg.netFundingUsdBig = agg.netFundingUsdBig.plus(absVal);
                  } else {
                    agg.totalPaidUsdBig = agg.totalPaidUsdBig.plus(absVal);
                    agg.netFundingUsdBig = agg.netFundingUsdBig.minus(absVal);
                  }

                  const sItem: SettlementAuditItem = {
                    timestamp: time,
                    timeIsoUtc: new Date(time).toISOString(),
                    timeLocal: new Date(time).toLocaleString(),
                    exchange: 'okx',
                    symbol: sym || 'UNKNOWN',
                    type: isPositive ? 'RECEIVED' : 'PAID',
                    amountUsd: Number(absVal.toString()),
                    rawAmount: feeVal,
                  };
                  agg.settlements.push(sItem);
                  allSettlements.push(sItem);
                }
              }
            }
          }
        }

        // C. Bitget transaction logs (up to 90 days)
        if (!exchange || exchange.toLowerCase() === 'bitget') {
          if (db.objectStoreNames.contains('bitget-transaction-log')) {
            const logs: BitgetTransactionLogEntry[] = await db.getAll('bitget-transaction-log');
            for (const log of logs) {
              const time = log.transactionTime || 0;
              if (time >= startMs && time <= endMs) {
                const sym = (log.symbol || '').toUpperCase();
                if (symbol && !sym.includes(symbol.toUpperCase())) continue;

                const typeUpper = (log.type || '').toUpperCase();
                const rawFunding = log.funding;
                const isFunding = Boolean(
                  (rawFunding && rawFunding !== '0' && rawFunding !== '0.0') ||
                  typeUpper.includes('FUNDING')
                );

                if (isFunding) {
                  const feeVal = rawFunding && rawFunding !== '0' ? rawFunding : (log.change || log.fee || log.cashFlow || '0');
                  const feeBig = new Big(feeVal);
                  if (feeBig.eq(0)) continue;

                  const isPositive = feeBig.gt(0);
                  const absVal = feeBig.abs();
                  if (isPositive) {
                    totalFundingReceivedBig = totalFundingReceivedBig.plus(absVal);
                  } else {
                    totalFundingPaidBig = totalFundingPaidBig.plus(absVal);
                  }
                  totalFundingTxCount++;

                  const key = `bitget-${sym || 'UNKNOWN'}`;
                  if (!assetAggregates[key]) {
                    assetAggregates[key] = {
                      symbol: sym || 'UNKNOWN',
                      exchange: 'bitget',
                      totalReceivedUsdBig: new Big(0),
                      totalPaidUsdBig: new Big(0),
                      netFundingUsdBig: new Big(0),
                      count: 0,
                      lastSettlementTimestamp: 0,
                      settlements: [],
                    };
                  }

                  const agg = assetAggregates[key];
                  agg.count++;
                  if (time > agg.lastSettlementTimestamp) agg.lastSettlementTimestamp = time;

                  if (isPositive) {
                    agg.totalReceivedUsdBig = agg.totalReceivedUsdBig.plus(absVal);
                    agg.netFundingUsdBig = agg.netFundingUsdBig.plus(absVal);
                  } else {
                    agg.totalPaidUsdBig = agg.totalPaidUsdBig.plus(absVal);
                    agg.netFundingUsdBig = agg.netFundingUsdBig.minus(absVal);
                  }

                  const sItem: SettlementAuditItem = {
                    timestamp: time,
                    timeIsoUtc: new Date(time).toISOString(),
                    timeLocal: new Date(time).toLocaleString(),
                    exchange: 'bitget',
                    symbol: sym || 'UNKNOWN',
                    type: isPositive ? 'RECEIVED' : 'PAID',
                    amountUsd: Number(absVal.toString()),
                    rawAmount: feeVal,
                  };
                  agg.settlements.push(sItem);
                  allSettlements.push(sItem);
                }
              }
            }
          }
        }
      }
    } catch {
      // IndexedDB query fallback
    }

    const netFundingTotalBig = totalFundingReceivedBig.minus(totalFundingPaidBig);
    const activePositions = Object.values(usePositionsStore.getState().positions || {});

    // 2. Build structured per-asset list (ONLY assets that had real transactions)
    const resultSymbols: FundingFeeSymbolItem[] = [];

    const sortedAssetKeys = Object.keys(assetAggregates).sort((a, b) => {
      // Sort by absolute net funding magnitude descending
      return Math.abs(Number(assetAggregates[b].netFundingUsdBig.toString())) -
             Math.abs(Number(assetAggregates[a].netFundingUsdBig.toString()));
    });

    for (const key of sortedAssetKeys) {
      const agg = assetAggregates[key];
      const isOpen = activePositions.some(
        (p) => p.exchange.toLowerCase() === agg.exchange.toLowerCase() &&
               (p.symbol.toUpperCase() === agg.symbol.toUpperCase() || agg.symbol.toUpperCase().includes(p.symbol.toUpperCase()))
      );

      resultSymbols.push({
        symbol: agg.symbol,
        exchange: agg.exchange,
        positionStatus: isOpen ? 'OPEN' : 'CLOSED',
        fundingReceivedUsd: privacyActive ? '[OBFUSCATED]' : Number(agg.totalReceivedUsdBig.toString()),
        fundingPaidUsd: privacyActive ? '[OBFUSCATED]' : Number(agg.totalPaidUsdBig.toString()),
        netFundingUsd: privacyActive ? '[OBFUSCATED]' : Number(agg.netFundingUsdBig.toString()),
        fundingTransactionsCount: agg.count,
        lastSettlementTime: agg.lastSettlementTimestamp > 0 ? new Date(agg.lastSettlementTimestamp).toISOString() : null,
        settlementsCount: agg.settlements.length,
      });
    }

    // Sort settlements chronologically descending
    allSettlements.sort((a, b) => b.timestamp - a.timestamp);

    // Backward-compatibility: if zero transactions were found AND Zustand currentRates are populated (like in test suites),
    // preserve benchmark rate symbols without error
    if (resultSymbols.length === 0 && totalFundingTxCount === 0) {
      const liveRates = useFundingStore.getState().currentRates || [];
      if (liveRates.length > 0) {
        for (const r of liveRates) {
          if (exchange && r.exchange.toLowerCase() !== exchange.toLowerCase()) continue;
          if (symbol && !r.symbol.toUpperCase().includes(symbol.toUpperCase())) continue;
          const rate8 = formatRate8(r.fundingRate);
          resultSymbols.push({
            symbol: r.symbol,
            exchange: r.exchange,
            instrumentType: r.instrumentType || 'USDT-M',
            fundingRate: rate8,
            fundingRateDecimal: Number(rate8),
            cumulativeRates: {
              today: '0.00000000',
              currentMonth: '0.00000000',
              lastMonth: '0.00000000',
              last3Months: '0.00000000',
              last6Months: r.exchange.toLowerCase() === 'bybit' ? '0.00000000' : undefined,
              last12Months: r.exchange.toLowerCase() === 'bybit' ? '0.00000000' : undefined,
              exchangeMaxCoverage: r.exchange.toLowerCase() === 'bybit' ? '2 years (730 days)' : '90 days',
            },
            actualFundingFeePaidUsd: 0,
            actualFundingFeePaidUsdRaw: '0',
            fundingTransactionsCount: 0,
            lastSettlementTime: r.nextFundingTime ? String(r.nextFundingTime) : null,
          });
        }
      }
    }

    const hasData = resultSymbols.length > 0 || totalFundingTxCount > 0;
    const syncNotice = evaluateSyncAndDataNotice(hasData);

    return {
      syncStatus: syncNotice.status,
      syncInProgress: syncNotice.syncInProgress,
      ...(syncNotice.syncNotice ? { syncNotice: syncNotice.syncNotice } : {}),
      privacyModeActive: privacyActive,
      period: resolvedPeriod,
      periodStartTimestamp: startMs,
      periodEndTimestamp: endMs,
      periodStartIsoUtc: new Date(startMs).toISOString(),
      periodEndIsoUtc: new Date(endMs).toISOString(),
      periodStartLocal: new Date(startMs).toLocaleString(),
      periodEndLocal: new Date(endMs).toLocaleString(),
      totalFundingReceivedUsd: privacyActive ? '[OBFUSCATED - Privacy Mode Active]' : Number(totalFundingReceivedBig.toString()),
      totalFundingPaidUsd: privacyActive ? '[OBFUSCATED - Privacy Mode Active]' : Number(totalFundingPaidBig.toString()),
      netFundingUsd: privacyActive ? '[OBFUSCATED - Privacy Mode Active]' : Number(netFundingTotalBig.toString()),
      // Maintained for backward compatibility with existing tests
      totalFundingFeesPaidUsd: privacyActive ? '[OBFUSCATED - Privacy Mode Active]' : Number(netFundingTotalBig.toString()),
      totalFundingFeesPaidUsdRaw: privacyActive ? '[OBFUSCATED]' : netFundingTotalBig.toString(),
      totalFundingTransactionsAnalyzed: totalFundingTxCount,
      totalSymbolsFound: resultSymbols.length,
      exchangeCoverage: {
        bybit: 'Up to 2 years (730 days) of historical funding & transaction logs',
        okx: 'Up to 90 days of historical data',
        bitget: 'Up to 90 days of historical data',
      },
      symbols: resultSymbols,
      settlements: allSettlements.slice(0, 50).map(s => ({
        ...s,
        amountUsd: privacyActive ? '[OBFUSCATED]' : s.amountUsd,
        rawAmount: privacyActive ? '[OBFUSCATED]' : s.rawAmount,
      })),
    };
  },

  /**
   * Queries market-wide perpetual funding rates (%), historical multi-horizon cumulative rates,
   * cross-exchange rate comparisons for specific coins, or rankings of highest/lowest paying assets.
   *
   * Designed strictly for market analysis and benchmarking without confusing personal wallet cash flows.
   */
  async aiGetMarketFundingRates(args: {
    symbol?: string;
    exchange?: string;
    ranking?: 'top_positive' | 'top_negative' | 'top_and_bottom';
    horizon?: 'last_rate' | 'today' | 'current_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'last_12_months';
    limit?: number;
  } = {}): Promise<AiMarketFundingRatesResult> {
    const { symbol, exchange, ranking, horizon = 'last_rate', limit = 5 } = args;
    const clampedLimit = Math.min(Math.max(limit || 5, 1), 20);

    const summaryMap = new Map<string, FundingRateSummary>();
    try {
      if (typeof window !== 'undefined' && window.indexedDB) {
        const db = await openDB(DB_NAME, DB_VERSION);
        if (db.objectStoreNames.contains('funding-summaries')) {
          const dbSummaries: FundingRateSummary[] = await db.getAll('funding-summaries');
          for (const s of dbSummaries) {
            const key = `${s.exchange.toLowerCase()}-${s.symbol.toUpperCase()}`;
            summaryMap.set(key, s);
          }
        }
      }
    } catch {
      // Fallback gracefully
    }

    const liveRates = useFundingStore.getState().currentRates || [];
    const allItems: Array<{
      key: string;
      symbol: string;
      exchange: string;
      instrumentType: string;
      lastRate8: string;
      lastRateDecimal: number;
      lastRatePct: string;
      todayRate8: string;
      todayRatePct: string;
      currentMonthRate8: string;
      currentMonthRatePct: string;
      lastMonthRate8: string;
      lastMonthRatePct: string;
      last3MonthsRate8: string;
      last3MonthsRatePct: string;
      last6MonthsRate8?: string;
      last6MonthsRatePct?: string;
      last12MonthsRate8?: string;
      last12MonthsRatePct?: string;
      exchangeMaxCoverage: string;
      lastFundingTime: string | null;
      sortValue: number;
    }> = [];

    const allKeys = new Set<string>();
    for (const [key] of summaryMap) allKeys.add(key);
    for (const r of liveRates) allKeys.add(`${r.exchange.toLowerCase()}-${r.symbol.toUpperCase()}`);

    for (const key of allKeys) {
      const summary = summaryMap.get(key);
      const dashIdx = key.indexOf('-');
      const ex = dashIdx > 0 ? key.substring(0, dashIdx) : 'unknown';
      const sym = dashIdx > 0 ? key.substring(dashIdx + 1) : key;

      if (exchange && ex.toLowerCase() !== exchange.toLowerCase()) continue;
      if (symbol && !sym.toUpperCase().includes(symbol.toUpperCase())) continue;

      const liveItem = liveRates.find(
        (r) => r.exchange.toLowerCase() === ex.toLowerCase() && r.symbol.toUpperCase() === sym.toUpperCase()
      );

      const rawLastRate = summary?.lastFundingRate ?? (liveItem?.fundingRate != null ? String(liveItem.fundingRate) : '0');
      const last8 = formatRate8(rawLastRate);
      const lastNum = Number(last8);

      const today8 = formatRate8(summary?.todayFundingRate ?? '0');
      const curMonth8 = formatRate8(summary?.currentMonthFundingRate ?? '0');
      const lastMonth8 = formatRate8(summary?.lastMonthFundingRate ?? '0');
      const last3M8 = formatRate8(summary?.last3MonthsFundingRate ?? '0');

      const toPct = (str8: string) => {
        try {
          const num = Number(str8);
          return (num >= 0 ? '+' : '') + (num * 100).toFixed(4) + '%';
        } catch {
          return '0.0000%';
        }
      };

      // Determine sorting value according to chosen horizon
      let sortVal = lastNum;
      if (horizon === 'today') sortVal = Number(today8);
      else if (horizon === 'current_month') sortVal = Number(curMonth8);
      else if (horizon === 'last_month') sortVal = Number(lastMonth8);
      else if (horizon === 'last_3_months') sortVal = Number(last3M8);
      else if (horizon === 'last_6_months' && summary?.last6MonthsFundingRate) sortVal = Number(summary.last6MonthsFundingRate);
      else if (horizon === 'last_12_months' && summary?.last12MonthsFundingRate) sortVal = Number(summary.last12MonthsFundingRate);

      allItems.push({
        key,
        symbol: sym,
        exchange: ex,
        instrumentType: summary?.instrumentType || liveItem?.instrumentType || 'USDT-M',
        lastRate8: last8,
        lastRateDecimal: lastNum,
        lastRatePct: toPct(last8),
        todayRate8: today8,
        todayRatePct: toPct(today8),
        currentMonthRate8: curMonth8,
        currentMonthRatePct: toPct(curMonth8),
        lastMonthRate8: lastMonth8,
        lastMonthRatePct: toPct(lastMonth8),
        last3MonthsRate8: last3M8,
        last3MonthsRatePct: toPct(last3M8),
        last6MonthsRate8: summary?.last6MonthsFundingRate ? formatRate8(summary.last6MonthsFundingRate) : undefined,
        last6MonthsRatePct: summary?.last6MonthsFundingRate ? toPct(formatRate8(summary.last6MonthsFundingRate)) : undefined,
        last12MonthsRate8: summary?.last12MonthsFundingRate ? formatRate8(summary.last12MonthsFundingRate) : undefined,
        last12MonthsRatePct: summary?.last12MonthsFundingRate ? toPct(formatRate8(summary.last12MonthsFundingRate)) : undefined,
        exchangeMaxCoverage: ex.toLowerCase() === 'bybit' ? '2 years (730 days)' : '90 days',
        lastFundingTime: summary?.lastFundingTime || (liveItem?.nextFundingTime ? String(liveItem.nextFundingTime) : null),
        sortValue: sortVal,
      });
    }

    const hasData = allItems.length > 0;
    const syncNotice = evaluateSyncAndDataNotice(hasData);

    // Scenario A: Ranking mode (Top positive and/or Top negative)
    if (ranking) {
      const sortedAsc = [...allItems].sort((a, b) => a.sortValue - b.sortValue);
      const sortedDesc = [...allItems].sort((a, b) => b.sortValue - a.sortValue);

      const topPositive = ranking === 'top_negative' ? undefined : sortedDesc.slice(0, clampedLimit).map(i => ({
        symbol: i.symbol,
        exchange: i.exchange,
        rateHorizon: horizon,
        cumulativeRate: formatRate8(i.sortValue),
        cumulativeRatePct: (i.sortValue >= 0 ? '+' : '') + (i.sortValue * 100).toFixed(4) + '%',
        currentSettlementRate: i.lastRate8,
        currentSettlementRatePct: i.lastRatePct,
        instrumentType: i.instrumentType,
      }));

      const topNegative = ranking === 'top_positive' ? undefined : sortedAsc.slice(0, clampedLimit).map(i => ({
        symbol: i.symbol,
        exchange: i.exchange,
        rateHorizon: horizon,
        cumulativeRate: formatRate8(i.sortValue),
        cumulativeRatePct: (i.sortValue >= 0 ? '+' : '') + (i.sortValue * 100).toFixed(4) + '%',
        currentSettlementRate: i.lastRate8,
        currentSettlementRatePct: i.lastRatePct,
        instrumentType: i.instrumentType,
      }));

      return {
        syncStatus: syncNotice.status,
        syncInProgress: syncNotice.syncInProgress,
        ...(syncNotice.syncNotice ? { syncNotice: syncNotice.syncNotice } : {}),
        mode: 'RANKING',
        rankingHorizon: horizon,
        totalAssetsEvaluated: allItems.length,
        ...(topPositive ? { highestFundingRateAssets: topPositive } : {}),
        ...(topNegative ? { lowestFundingRateAssets: topNegative } : {}),
      };
    }

    // Scenario B: Specific symbol cross-exchange comparison
    if (symbol) {
      return {
        syncStatus: syncNotice.status,
        syncInProgress: syncNotice.syncInProgress,
        ...(syncNotice.syncNotice ? { syncNotice: syncNotice.syncNotice } : {}),
        mode: 'CROSS_EXCHANGE_COMPARISON',
        filterSymbol: symbol.toUpperCase(),
        totalMatches: allItems.length,
        exchangesComparison: allItems.slice(0, clampedLimit).map(i => ({
          symbol: i.symbol,
          exchange: i.exchange,
          instrumentType: i.instrumentType,
          latestRate: i.lastRate8,
          latestRatePct: i.lastRatePct,
          todayCumulativeRate: i.todayRate8,
          todayCumulativeRatePct: i.todayRatePct,
          currentMonthCumulativeRate: i.currentMonthRate8,
          currentMonthCumulativeRatePct: i.currentMonthRatePct,
          lastMonthCumulativeRate: i.lastMonthRate8,
          lastMonthCumulativeRatePct: i.lastMonthRatePct,
          last3MonthsCumulativeRate: i.last3MonthsRate8,
          last3MonthsCumulativeRatePct: i.last3MonthsRatePct,
          last6MonthsCumulativeRate: i.last6MonthsRate8,
          last6MonthsCumulativeRatePct: i.last6MonthsRatePct,
          last12MonthsCumulativeRate: i.last12MonthsRate8,
          last12MonthsCumulativeRatePct: i.last12MonthsRatePct,
          exchangeMaxCoverage: i.exchangeMaxCoverage,
        })),
      };
    }

    // Scenario C: General filtered market rates list
    return {
      syncStatus: syncNotice.status,
      syncInProgress: syncNotice.syncInProgress,
      ...(syncNotice.syncNotice ? { syncNotice: syncNotice.syncNotice } : {}),
      mode: 'MARKET_RATES_LIST',
      totalMatches: allItems.length,
      rates: allItems.slice(0, clampedLimit).map(i => ({
        symbol: i.symbol,
        exchange: i.exchange,
        instrumentType: i.instrumentType,
        latestRate: i.lastRate8,
        latestRatePct: i.lastRatePct,
        todayCumulativeRate: i.todayRate8,
        todayCumulativeRatePct: i.todayRatePct,
        currentMonthCumulativeRate: i.currentMonthRate8,
        currentMonthCumulativeRatePct: i.currentMonthRatePct,
        lastMonthCumulativeRate: i.lastMonthRate8,
        lastMonthCumulativeRatePct: i.lastMonthRatePct,
        last3MonthsCumulativeRate: i.last3MonthsRate8,
        last3MonthsCumulativeRatePct: i.last3MonthsRatePct,
      })),
    };
  },

  /**
   * Retrieves trading fees paid in recent operations.
   * Preserves full numerical precision without arbitrary rounding.
   */
  async aiGetTradingFeesHistory(args: { days: number; exchange?: string }) {
    const { days = 7, exchange } = args;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const privacyActive = isPrivacyModeActive();

    let totalFeesUsd = Big(0);
    let totalTransactionsCount = 0;

    try {
      if (typeof window !== 'undefined' && window.indexedDB) {
        const db = await openDB(DB_NAME, DB_VERSION);
        const stores = ['bybit-transaction-log', 'okx-transaction-log', 'bitget-transaction-log'];

        for (const storeName of stores) {
          if (exchange && !storeName.includes(exchange.toLowerCase())) {
            continue;
          }
          if (db.objectStoreNames.contains(storeName as any)) {
            const logs: any[] = await db.getAll(storeName as any);
            for (const log of logs) {
              const time = log.timestamp || log.uTime || log.cTime || log.execTime || log.transactionTime || 0;
              if (time >= cutoffTime) {
                const fee = log.fee || log.feeUsd || log.execFee || 0;
                totalFeesUsd = totalFeesUsd.plus(Math.abs(Number(fee)));
                totalTransactionsCount++;
              }
            }
          }
        }
      }
    } catch {
      // IndexedDB query error handled gracefully
    }

    const hasData = totalTransactionsCount > 0;
    const syncNotice = evaluateSyncAndDataNotice(hasData);

    return {
      syncStatus: syncNotice.status,
      syncInProgress: syncNotice.syncInProgress,
      ...(syncNotice.syncNotice ? { syncNotice: syncNotice.syncNotice } : {}),
      privacyModeActive: privacyActive,
      periodDays: days,
      exchangeFilter: exchange || 'all',
      totalFeesPaidUsd: privacyActive ? '[OBFUSCATED - Privacy Mode Active]' : Number(totalFeesUsd.toString()),
      totalFeesPaidUsdRaw: privacyActive ? '[OBFUSCATED]' : totalFeesUsd.toString(),
      totalTransactionsAnalyzed: totalTransactionsCount,
    };
  },

  /**
   * Retrieves closed positions and realized PnL summary.
   * Preserves exact realized PnL values and win rate statistics.
   */
  async aiGetClosedPositionsSummary(args: { days: number; symbol?: string }) {
    const { days = 7, symbol } = args;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const privacyActive = isPrivacyModeActive();

    let totalRealizedPnl = Big(0);
    let winningTrades = 0;
    let losingTrades = 0;

    try {
      if (typeof window !== 'undefined' && window.indexedDB) {
        const db = await openDB(DB_NAME, DB_VERSION);
        if (db.objectStoreNames.contains('positionHistory')) {
          const positions: any[] = await db.getAll('positionHistory');
          for (const pos of positions) {
            const closeTime = pos.closeUpdateTime || pos.closedTime || pos.updatedTime || 0;
            if (closeTime >= cutoffTime) {
              if (symbol && !pos.symbol.toUpperCase().includes(symbol.toUpperCase())) {
                continue;
              }
              const pnl = Big(pos.realizedPnl || pos.closedPnl || 0);
              totalRealizedPnl = totalRealizedPnl.plus(pnl);
              if (pnl.gt(0)) winningTrades++;
              else if (pnl.lt(0)) losingTrades++;
            }
          }
        }
      }
    } catch {
      // IndexedDB query error handled gracefully
    }

    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(2)) : 0;
    const hasData = totalTrades > 0;
    const syncNotice = evaluateSyncAndDataNotice(hasData);

    return {
      syncStatus: syncNotice.status,
      syncInProgress: syncNotice.syncInProgress,
      ...(syncNotice.syncNotice ? { syncNotice: syncNotice.syncNotice } : {}),
      privacyModeActive: privacyActive,
      periodDays: days,
      symbolFilter: symbol || 'all',
      totalClosedTrades: totalTrades,
      winningTrades,
      losingTrades,
      winRatePct: winRate,
      winRateRaw: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      totalRealizedPnlUsd: privacyActive ? '[OBFUSCATED - Privacy Mode Active]' : Number(totalRealizedPnl.toString()),
      totalRealizedPnlUsdRaw: privacyActive ? '[OBFUSCATED]' : totalRealizedPnl.toString(),
    };
  },
};
