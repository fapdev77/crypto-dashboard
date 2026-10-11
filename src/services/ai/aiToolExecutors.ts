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
   * Retrieves funding rates with pure 8-decimal precision, cumulative historical rate horizons
   * (today, current month, last month, 3 months, and up to 2 years for Bybit), and actual historical
   * funding fees paid/received from exchange transaction logs.
   *
   * Note on exchange history coverage:
   * - Bybit supports up to 2 years (730 days) of transaction logs and 400+ days of funding history.
   * - Bitget and OKX support up to 90 days.
   */
  async aiGetFundingFeesHistory(args: { days?: number; symbol?: string; exchange?: string }) {
    const { days = 7, symbol, exchange } = args;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const privacyActive = isPrivacyModeActive();

    // 1. Gather funding summaries and live rates
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
      // Fallback gracefully if IndexedDB is unavailable
    }

    // Complement with live currentRates from Zustand store
    const liveRates = useFundingStore.getState().currentRates || [];
    const allSymbolKeys = new Set<string>();

    for (const [key] of summaryMap) {
      allSymbolKeys.add(key);
    }
    for (const r of liveRates) {
      allSymbolKeys.add(`${r.exchange.toLowerCase()}-${r.symbol.toUpperCase()}`);
    }

    // 2. Query actual historical funding fee transactions from IndexedDB
    const feesBySymbolAndEx: Record<string, { totalFeeBig: Big; count: number }> = {};
    let totalFundingFeesAllBig = new Big(0);
    let totalFundingTxCount = 0;

    try {
      if (typeof window !== 'undefined' && window.indexedDB) {
        const db = await openDB(DB_NAME, DB_VERSION);

        // A. Bybit transaction logs (supports up to 2 years / 730 days)
        if (!exchange || exchange.toLowerCase() === 'bybit') {
          if (db.objectStoreNames.contains('bybit-transaction-log')) {
            const logs: BybitTransactionLogEntry[] = await db.getAll('bybit-transaction-log');
            for (const log of logs) {
              const time = log.transactionTime || 0;
              if (time >= cutoffTime) {
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
                  totalFundingFeesAllBig = totalFundingFeesAllBig.plus(feeBig);
                  totalFundingTxCount++;

                  const key = `bybit-${sym || 'UNKNOWN'}`;
                  if (!feesBySymbolAndEx[key]) {
                    feesBySymbolAndEx[key] = { totalFeeBig: new Big(0), count: 0 };
                  }
                  feesBySymbolAndEx[key].totalFeeBig = feesBySymbolAndEx[key].totalFeeBig.plus(feeBig);
                  feesBySymbolAndEx[key].count++;
                }
              }
            }
          }
        }

        // B. OKX transaction logs (supports up to 90 days)
        if (!exchange || exchange.toLowerCase() === 'okx') {
          if (db.objectStoreNames.contains('okx-transaction-log')) {
            const logs: OkxTransactionLogEntry[] = await db.getAll('okx-transaction-log');
            for (const log of logs) {
              const time = log.transactionTime || 0;
              if (time >= cutoffTime) {
                const sym = (log.symbol || '').toUpperCase();
                if (symbol && !sym.includes(symbol.toUpperCase())) continue;

                const typeStr = (log.type || '').toLowerCase();
                const subTypeStr = ((log.transSubType || log.subType) || '').toLowerCase();
                const rawFunding = log.funding;
                const isFunding = Boolean(
                  (rawFunding && rawFunding !== '0' && rawFunding !== '0.0') ||
                  typeStr.includes('funding') ||
                  subTypeStr.includes('funding')
                );

                if (isFunding) {
                  const feeVal = rawFunding && rawFunding !== '0' ? rawFunding : (log.change || log.fee || '0');
                  const feeBig = new Big(feeVal);
                  totalFundingFeesAllBig = totalFundingFeesAllBig.plus(feeBig);
                  totalFundingTxCount++;

                  const key = `okx-${sym || 'UNKNOWN'}`;
                  if (!feesBySymbolAndEx[key]) {
                    feesBySymbolAndEx[key] = { totalFeeBig: new Big(0), count: 0 };
                  }
                  feesBySymbolAndEx[key].totalFeeBig = feesBySymbolAndEx[key].totalFeeBig.plus(feeBig);
                  feesBySymbolAndEx[key].count++;
                }
              }
            }
          }
        }

        // C. Bitget transaction logs (supports up to 90 days)
        if (!exchange || exchange.toLowerCase() === 'bitget') {
          if (db.objectStoreNames.contains('bitget-transaction-log')) {
            const logs: BitgetTransactionLogEntry[] = await db.getAll('bitget-transaction-log');
            for (const log of logs) {
              const time = log.transactionTime || 0;
              if (time >= cutoffTime) {
                const sym = (log.symbol || '').toUpperCase();
                if (symbol && !sym.includes(symbol.toUpperCase())) continue;

                const typeUpper = (log.type || '').toUpperCase();
                const rawFunding = log.funding;
                const isFunding = Boolean(
                  (rawFunding && rawFunding !== '0' && rawFunding !== '0.0') ||
                  typeUpper.includes('FUNDING')
                );

                if (isFunding) {
                  const feeVal = rawFunding && rawFunding !== '0' ? rawFunding : (log.change || log.fee || '0');
                  const feeBig = new Big(feeVal);
                  totalFundingFeesAllBig = totalFundingFeesAllBig.plus(feeBig);
                  totalFundingTxCount++;

                  const key = `bitget-${sym || 'UNKNOWN'}`;
                  if (!feesBySymbolAndEx[key]) {
                    feesBySymbolAndEx[key] = { totalFeeBig: new Big(0), count: 0 };
                  }
                  feesBySymbolAndEx[key].totalFeeBig = feesBySymbolAndEx[key].totalFeeBig.plus(feeBig);
                  feesBySymbolAndEx[key].count++;
                }
              }
            }
          }
        }
      }
    } catch {
      // IndexedDB query fallback
    }

    // 3. Assemble unified list with pure 8-decimal rates and multi-horizon periods
    const resultSymbols: Array<{
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
        last6Months?: string;
        last12Months?: string;
        exchangeMaxCoverage: string;
      };
      actualFundingFeePaidUsd: any;
      actualFundingFeePaidUsdRaw?: string;
      fundingTransactionsCount: number;
      lastSettlementTime: string | null;
    }> = [];

    for (const key of allSymbolKeys) {
      const summary = summaryMap.get(key);
      const dashIdx = key.indexOf('-');
      const ex = dashIdx > 0 ? key.substring(0, dashIdx) : 'unknown';
      const sym = dashIdx > 0 ? key.substring(dashIdx + 1) : key;

      if (exchange && ex.toLowerCase() !== exchange.toLowerCase()) {
        continue;
      }
      if (symbol && !sym.toUpperCase().includes(symbol.toUpperCase())) {
        continue;
      }

      const liveRateItem = liveRates.find(
        (r) => r.exchange.toLowerCase() === ex.toLowerCase() && r.symbol.toUpperCase() === sym.toUpperCase()
      );

      const rawRate = summary?.lastFundingRate ?? (liveRateItem?.fundingRate != null ? String(liveRateItem.fundingRate) : '0');
      const rate8 = formatRate8(rawRate);
      const rateDecimal = Number(rate8);

      const feeEntry = feesBySymbolAndEx[key];
      const feeUsd = feeEntry ? Number(feeEntry.totalFeeBig.toString()) : 0;
      const feeUsdRaw = feeEntry ? feeEntry.totalFeeBig.toString() : '0';

      const cumulativeRates: {
        today: string;
        currentMonth: string;
        lastMonth: string;
        last3Months: string;
        last6Months?: string;
        last12Months?: string;
        exchangeMaxCoverage: string;
      } = {
        today: formatRate8(summary?.todayFundingRate ?? '0'),
        currentMonth: formatRate8(summary?.currentMonthFundingRate ?? '0'),
        lastMonth: formatRate8(summary?.lastMonthFundingRate ?? '0'),
        last3Months: formatRate8(summary?.last3MonthsFundingRate ?? '0'),
        exchangeMaxCoverage: ex.toLowerCase() === 'bybit' ? '2 years (730 days)' : '90 days',
      };

      if (ex.toLowerCase() === 'bybit') {
        cumulativeRates.last6Months = formatRate8(summary?.last6MonthsFundingRate ?? '0');
        cumulativeRates.last12Months = formatRate8(summary?.last12MonthsFundingRate ?? '0');
      }

      resultSymbols.push({
        symbol: sym,
        exchange: ex,
        instrumentType: summary?.instrumentType || liveRateItem?.instrumentType || 'USDT-M',
        fundingRate: rate8,
        fundingRateDecimal: rateDecimal,
        cumulativeRates,
        actualFundingFeePaidUsd: privacyActive ? '[OBFUSCATED]' : feeUsd,
        actualFundingFeePaidUsdRaw: privacyActive ? '[OBFUSCATED]' : feeUsdRaw,
        fundingTransactionsCount: feeEntry?.count ?? 0,
        lastSettlementTime: summary?.lastFundingTime || (liveRateItem?.nextFundingTime ? String(liveRateItem.nextFundingTime) : null),
      });
    }

    const hasData = resultSymbols.length > 0 || totalFundingTxCount > 0;
    const syncNotice = evaluateSyncAndDataNotice(hasData);

    return {
      syncStatus: syncNotice.status,
      syncInProgress: syncNotice.syncInProgress,
      ...(syncNotice.syncNotice ? { syncNotice: syncNotice.syncNotice } : {}),
      privacyModeActive: privacyActive,
      periodDays: days,
      cutoffTimestamp: cutoffTime,
      totalSymbolsFound: resultSymbols.length,
      exchangeCoverage: {
        bybit: 'Up to 2 years (730 days) of historical funding & transaction logs',
        okx: 'Up to 90 days of historical data',
        bitget: 'Up to 90 days of historical data',
      },
      totalFundingFeesPaidUsd: privacyActive
        ? '[OBFUSCATED - Privacy Mode Active]'
        : Number(totalFundingFeesAllBig.toString()),
      totalFundingFeesPaidUsdRaw: privacyActive
        ? '[OBFUSCATED]'
        : totalFundingFeesAllBig.toString(),
      totalFundingTransactionsAnalyzed: totalFundingTxCount,
      symbols: resultSymbols.slice(0, 50),
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
