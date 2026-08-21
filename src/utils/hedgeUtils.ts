import Big from 'big.js';
import { UnifiedPosition, ExchangeName, PositionSide } from '../types';
import { getInverseShortUsdEntryValue, getOpenPositionSizeAndValue, getInverseUsdValues } from './inverseUtils';

/** Structural subset of a balance row used for same-coin matching (works with
 * both `BalanceItem` from balancesStore and `UnifiedBalance` from adapters). */
export interface HedgeBalanceInput {
  connectionId: string;
  ccy: string;
  amount: number;
  usdValue: number;
  /** Wallet balance quantity (what the exchange reports as the futures account
   *  asset). Falls back to `amount` when the source doesn't expose it — or when
   *  it reports 0 (Bitget coin-m adapters) — the position reconstruction in
   *  getHedgeCoinSummaries is the authoritative source. */
  walletBalance?: number;
}

/**
 * Hedge Pro — canonical hedge (inverse/Coin-M) exposure math.
 *
 * Model (capital protection):
 *  - An inverse SHORT locks USD at the entry price (the "protected" leg — does not
 *    float with the asset). Protection is capped by the same-coin balance.
 *  - An inverse LONG is fully exposed: the coin balance plus the leveraged position
 *    value both suffer from asset variation.
 *  - The per-coin "exposed" amount = (balance − protected) + Σ long position value.
 *
 * This module is the single source of truth for the Hedge Pro dashboard. It reuses
 * `inverseUtils` helpers and replicates the math already present in PositionCard's
 * "Hedge Pro Details" block and the main dashboard's "Hedge Mode (Inverse)" indicator.
 * All accumulation uses Big.js (project rule — PRD §6.2.6).
 */

// ── Derived types (computation-local; intentionally NOT in types.ts) ──

/** Per-position hedge level result (mirrors PositionCard math). */
export interface HedgePositionLevels {
  positionId: string;
  connectionId?: string;
  accountType?: 'classic' | 'uta';
  symbol: string;
  baseCoin: string;
  exchange: ExchangeName;
  /** Account label (e.g. 'Mock BITGET 1'). */
  label: string;
  side: PositionSide;
  isShort: boolean;
  /** Position leverage (e.g. 10 → '10x'). */
  leverage: number;
  /** Position margin mode ('cross' | 'isolated' | 'unknown'). */
  marginMode: string;
  /** USD locked at entry by a short (`getInverseShortUsdEntryValue`); 0 for longs. */
  entryUsd: number;
  /** Entry price (USD). */
  entryPrice: number;
  /** Mark price (USD). */
  markPrice: number;
  /** USD protected (capped by the same-coin balance) for shorts; 0 for longs. */
  protectedUsd: number;
  /** USD exposed: shorts → balance − protected; longs → balance + position value. */
  exposedUsd: number;
  /** USD exposed excluding the leveraged portion (uncovered balance). */
  exposedBaseUsd: number;
  /** USD leveraged portion of exposure (long position value; 0 for shorts). */
  leveragedUsd: number;
  /** Position value in USD (`getOpenPositionSizeAndValue`). */
  positionValueUsd: number;
  protectedPct: number;
  exposedPct: number;
  /** Matching same-coin balance amount (connectionId + ccy). */
  totalAssetBal: number;
  /** totalAssetBal × markPrice. */
  assetBalUsd: number;
  /** Position size expressed in coin (positionValueUsd / markPrice). */
  openPosSize: number;
  /** Margin/PnL currency (e.g. 'BTC', 'USDT'). */
  ccy: string;
  /** Unrealized PnL in the position's currency (coin for inverse). */
  unrealizedPnl: number;
  /** Unrealized PnL converted to USD (mark price for inverse). */
  unrealizedPnlUsd: number;
  /** Realized PnL in the position's currency (coin for inverse). */
  realizedPnl: number;
  /** Realized PnL converted to USD (mark price for inverse). */
  realizedPnlUsd: number;
  /** Long with exposedPct > 100, or any position with no covering balance. */
  overexposed: boolean;
}

/** Per-coin rollup (key = `${connectionId}:${baseCoin}`). */
export interface HedgeCoinSummary {
  key: string;
  connectionId: string;
  accountType?: 'classic' | 'uta';
  baseCoin: string;
  exchange: ExchangeName;
  /** Human-readable account label for this connection (e.g. 'Mock BITGET 1'). */
  accountLabel: string;
  /** Σ same-coin balance usdValue (matching the positions' margin ccy). */
  balanceUsd: number;
  /** Wallet balance quantity — the fixed assets WITHOUT unrealized PnL (deposit
   *  amount + total realized PnL). Net Balance − Σ unrealizedPnl. */
  walletBalance: number;
  /** Real fixed USD value of the wallet (assets without unrealized PnL) =
   *  netBalanceUsd − Σ unrealizedPnlUsd. */
  walletBalanceUsd: number;
  /** Net Balance in coin — the account equity (wallet + unrealized PnL),
   *  reconstructed from the coin's positions at the mark price (Bitget coin-m
   *  store amount = accountEquity); the real value if all positions were closed
   *  now. */
  netBalance: number;
  /** Net Balance in USD = walletBalanceUsd + Σ unrealizedPnlUsd. */
  netBalanceUsd: number;
  /** Σ unrealizedPnl across the coin's positions (short + long), in coin. */
  unrealizedPnl: number;
  /** Σ unrealizedPnlUsd across the coin's positions, in USD. */
  unrealizedPnlUsd: number;
  /** Σ realizedPnl across the coin's positions (short + long), in coin. */
  realizedPnl: number;
  /** Σ realizedPnlUsd across the coin's positions, in USD. */
  realizedPnlUsd: number;
  /** min(Σ short protected, balanceUsd) — you can't protect more than you hold. */
  protectedUsd: number;
  /** Σ short position sizes in coin (the protected leg — the short's size). */
  protectedSize: number;
  /** Uncovered exposure WITHOUT leverage. With a short: balance − protected (short
   *  side only). With NO short (long only): wallet balance + leveraged — nothing is
   *  hedged, so the whole wallet and the long are exposed. */
  exposedBaseUsd: number;
  /** Exposed quantity in coin = exposedBaseUsd ÷ mark price. */
  exposedSize: number;
  /** Σ long position values (inverse longs notional — "total alavancado"). */
  leveragedUsd: number;
  /** Σ long position sizes in coin (the leveraged leg — the long's size). */
  leveragedSize: number;
  /** Total exposed at market risk. With a short: exposedBaseUsd + leveragedUsd (the
   *  long adds exposure on top of the uncovered balance). With NO short the long is
   *  ALREADY inside the exposed (wallet + long), so total = exposedBaseUsd alone —
   *  adding Leveraged again would double-count the position. */
  totalExposedUsd: number;
  /** Total exposed quantity in coin: exposedSize + leveragedSize (with short), or
   *  exposedSize alone (long only — the long is already inside it). */
  totalExposedSize: number;
  /** (balanceUsd − protectedUsd) + leveragedUsd (uncovered balance + long leverage). */
  exposedUsd: number;
  /** balanceUsd > 0 ? protectedUsd / balanceUsd × 100 : 0. */
  coveragePct: number;
  /** Aggregated ROI of the coin = Σ unrealizedPnlUsd / walletBalanceUsd × 100. */
  roiPct: number;
  /** Aggregated Realized ROI of the coin = Σ realizedPnlUsd / walletBalanceUsd × 100. */
  realizedRoiPct: number;
  positionCount: number;
  longCount: number;
  shortCount: number;
  overexposedCount: number;
  positions: HedgePositionLevels[];
}

/** Portfolio-level totals. */
export interface HedgeTotals {
  totalProtected: number;
  totalExposed: number;
  totalLeveraged: number;
  totalBalance: number;
  /** totalEquity > 0 ? (totalProtected − totalLeveraged) / totalEquity × 100 : 0.
   *  Net protection: only the protected leg counts — the leveraged leg is NOT protected
   *  (it only adds risk), so it subtracts from the protected side. Negative when
   *  leveraged exceeds protected (risk with no hedge to offset it). */
  coveragePct: number;
  totalEquity: number;
  /** totalEquity > 0 ? totalProtected / totalEquity × 100 : 0 (reconciliation with Dashboard). */
  protectedOfEquityPct: number;
  exposedOfEquityPct: number;
  inversePositionCount: number;
  inverseLongCount: number;
  inverseShortCount: number;
}

// ── Keys ──

/** Group key for a coin: `${connectionId}:${baseCoin}`. Balances are per-connection. */
export function getInverseCoinKey(connectionId: string, baseCoin: string): string {
  return `${connectionId}:${baseCoin}`;
}

/** Human-readable exchange name for display (e.g. 'Bitget', 'Bybit', 'OKX'). */
export function getExchangeDisplayName(exchange: string): string {
  const ex = exchange.toLowerCase();
  if (ex.includes('bitget')) return 'Bitget';
  if (ex.includes('bybit')) return 'Bybit';
  if (ex.includes('okx')) return 'OKX';
  return exchange;
}

/** Margin/PnL currency used for balance matching (mirrors PositionCard `posCcy`). */
function getPosCcy(pos: UnifiedPosition): string {
  return (pos.ccy || pos.baseCoin || 'USDT').toUpperCase();
}

// ── Per-position levels ──

/**
 * Per-position hedge levels. Replicates PositionCard's protected/exposed math
 * (lines ~54–94) exactly for the covered cases. Improvement over PositionCard's
 * degenerate zero-balance display: when no matching balance is found, a short still
 * protects its full entry value (uncapped) and a long is flagged overexposed with
 * `exposedUsd = positionValueUsd`.
 */
export function getHedgePositionLevels(
  pos: UnifiedPosition,
  balances: HedgeBalanceInput[],
): HedgePositionLevels {
  const isShort = pos.side === 'short';
  const posCcy = getPosCcy(pos);
  const inverseVals = getInverseUsdValues(pos);

  const matchingBalance = balances.find(
    b => b.connectionId === pos.connectionId && b.ccy.toUpperCase() === posCcy
  );
  const totalAssetBal = matchingBalance ? (matchingBalance.amount || 0) : 0;
  const markPrice = pos.markPrice || 0;
  const assetBalUsd = markPrice > 0
    ? totalAssetBal * markPrice
    : (matchingBalance?.usdValue || 0);
  const { positionValueUsd } = getOpenPositionSizeAndValue(pos);
  const openPosSize = markPrice > 0 ? positionValueUsd / markPrice : Math.abs(pos.size);

  let entryUsd = 0;
  let protectedUsd = 0;
  let exposedBaseUsd = assetBalUsd;
  let leveragedUsd = 0;
  let exposedUsd = assetBalUsd;
  let protectedPct = 0;
  let exposedPct = 100;
  let overexposed = false;

  if (pos.instrumentType === 'INVERSE') {
    if (isShort) {
      entryUsd = getInverseShortUsdEntryValue(pos);
      if (totalAssetBal > 0 || assetBalUsd > 0) {
        protectedUsd = Math.min(entryUsd, assetBalUsd);
        exposedBaseUsd = Math.max(0, assetBalUsd - protectedUsd);
        exposedUsd = exposedBaseUsd;
        protectedPct = assetBalUsd > 0 ? (protectedUsd / assetBalUsd) * 100 : 0;
        exposedPct = assetBalUsd > 0 ? (exposedBaseUsd / assetBalUsd) * 100 : 0;
      } else {
        // No covering balance found — the short still locks USD at entry (uncapped).
        protectedUsd = entryUsd;
        exposedBaseUsd = 0;
        exposedUsd = 0;
        protectedPct = 100;
        exposedPct = 0;
      }
    } else {
      // Long inverse — fully exposed: balance (base) + leveraged position value.
      leveragedUsd = positionValueUsd;
      exposedBaseUsd = assetBalUsd;
      exposedUsd = exposedBaseUsd + leveragedUsd;
      protectedUsd = 0;
      protectedPct = 0;
      exposedPct = assetBalUsd > 0 ? (exposedUsd / assetBalUsd) * 100 : 100;
      overexposed = exposedPct > 100 || totalAssetBal <= 0;
    }
  }

  return {
    positionId: pos.id,
    connectionId: pos.connectionId,
    accountType: pos.accountType,
    symbol: pos.symbol,
    baseCoin: pos.baseCoin,
    exchange: pos.exchange,
    label: pos.label || '',
    side: pos.side,
    isShort,
    leverage: pos.leverage || 1,
    marginMode: pos.marginMode || 'cross',
    entryUsd,
    entryPrice: pos.entryPrice || 0,
    markPrice: pos.markPrice || 0,
    protectedUsd,
    exposedUsd,
    exposedBaseUsd,
    leveragedUsd,
    positionValueUsd,
    protectedPct,
    exposedPct,
    totalAssetBal,
    assetBalUsd,
    openPosSize,
    ccy: posCcy,
    unrealizedPnl: pos.unrealizedPnl || 0,
    unrealizedPnlUsd: inverseVals.unrealizedPnl,
    realizedPnl: pos.realizedPnl || 0,
    realizedPnlUsd: inverseVals.realizedPnl,
    overexposed,
  };
}

// ── Per-coin rollups ──

interface HedgeCoinGroup {
  connectionId: string;
  baseCoin: string;
  exchange: ExchangeName;
  ccies: Set<string>;
  levels: HedgePositionLevels[];
}

/**
 * Group inverse positions by `${connectionId}:${baseCoin}` and compute the per-coin
 * protected / exposed / leveraged rollup. Non-INVERSE positions are ignored.
 */
export function getHedgeCoinSummaries(
  positions: UnifiedPosition[],
  balances: HedgeBalanceInput[],
): HedgeCoinSummary[] {
  const groups = new Map<string, HedgeCoinGroup>();

  for (const pos of positions) {
    if (pos.instrumentType !== 'INVERSE') continue;

    const key = getInverseCoinKey(pos.connectionId, pos.baseCoin);
    let group = groups.get(key);
    if (!group) {
      group = {
        connectionId: pos.connectionId,
        baseCoin: pos.baseCoin,
        exchange: pos.exchange,
        ccies: new Set<string>(),
        levels: [],
      };
      groups.set(key, group);
    }
    group.ccies.add(getPosCcy(pos));
    group.levels.push(getHedgePositionLevels(pos, balances));
  }

  const summaries: HedgeCoinSummary[] = [];

  for (const [key, group] of groups) {
    // Coin balance = Σ usdValue of balances matching this connection + any of the
    // margin ccys used by the group's positions. The summed balance quantity is
    // only a fallback: Bitget coin-m adapters report walletBalance: 0 even when
    // the account holds coins, so the position reconstruction below is the
    // authoritative source for the wallet quantity.
    const refPrice = group.levels[0]?.markPrice || 0;
    let balanceAmount = 0;
    const balanceUsd = balances.reduce((acc, b) => {
      if (b.connectionId === group.connectionId && group.ccies.has(b.ccy.toUpperCase())) {
        balanceAmount = new Big(balanceAmount).plus(b.amount || 0).toNumber();
        return acc.plus(b.usdValue || (refPrice > 0 ? (b.amount || 0) * refPrice : 0));
      }
      return acc;
    }, new Big(0)).toNumber();

    const sumShortProtected = group.levels.reduce(
      (acc, l) => (l.isShort ? acc.plus(l.protectedUsd) : acc),
      new Big(0),
    ).toNumber();

    const leveragedUsd = group.levels.reduce(
      (acc, l) => (l.isShort ? acc : acc.plus(l.positionValueUsd)),
      new Big(0),
    ).toNumber();

    // Can't protect more than the coin balance actually holds.
    const protectedUsd = balanceUsd > 0 ? Math.min(sumShortProtected, balanceUsd) : sumShortProtected;
    const exposedBaseUsd = Math.max(0, balanceUsd - protectedUsd);
    const totalExposedUsd = exposedBaseUsd + leveragedUsd;
    const exposedUsd = totalExposedUsd;
    const coveragePct = balanceUsd > 0 ? (protectedUsd / balanceUsd) * 100 : 0;

    const positionCount = group.levels.length;
    const longCount = group.levels.filter(l => !l.isShort).length;
    const shortCount = group.levels.filter(l => l.isShort).length;
    const overexposedCount = group.levels.filter(l => l.overexposed).length;

    // Total unrealized PnL of the coin = short's + long's, in coin and USD.
    const unrealizedPnl = group.levels.reduce(
      (acc, l) => acc.plus(l.unrealizedPnl || 0),
      new Big(0),
    ).toNumber();
    const unrealizedPnlUsd = group.levels.reduce(
      (acc, l) => acc.plus(l.unrealizedPnlUsd || 0),
      new Big(0),
    ).toNumber();

    // Total realized PnL of the coin = short's + long's, in coin and USD.
    const realizedPnl = group.levels.reduce(
      (acc, l) => acc.plus(l.realizedPnl || 0),
      new Big(0),
    ).toNumber();
    const realizedPnlUsd = group.levels.reduce(
      (acc, l) => acc.plus(l.realizedPnlUsd || 0),
      new Big(0),
    ).toNumber();

    // The base value for the coin. Depending on the exchange, the API returns
    // either the Account Equity (Bitget) or the Wallet Balance (Bybit/OKX) in
    // the amount field. We reconstruct the exact USD value at the current mark
    // price using the position levels to avoid stale mock data.
    let reconstructedUsd = balanceUsd;
    
    if (positionCount > 0 && refPrice > 0) {
      // Every level on the same coin shares the same balance; each reconstruction
      // yields the same value, so take the max (avoids double-counting across
      // multiple positions of the same coin).
      const derivedPerLevel = group.levels.map(l =>
        l.isShort
          ? l.protectedUsd + l.exposedBaseUsd          // Size + Exposed Base
          : Math.max(0, l.exposedUsd - l.leveragedUsd) // Exposed − Size
      );
      if (derivedPerLevel.length > 0 && Math.max(...derivedPerLevel) > 0) {
        reconstructedUsd = Math.max(...derivedPerLevel);
      }
    }

    const reconstructedAmount = refPrice > 0 ? reconstructedUsd / refPrice : balanceAmount;

    let netBalance: number;
    let netBalanceUsd: number;
    let walletBalance: number;
    let walletBalanceUsd: number;

    if (group.exchange.toLowerCase() === 'bitget') {
      // Bitget coin-m provides Account Equity (already includes unrealized PnL).
      // Wallet = Net − Unrealized.
      netBalance = reconstructedAmount;
      netBalanceUsd = reconstructedUsd;
      walletBalance = new Big(netBalance).minus(unrealizedPnl).toNumber();
      walletBalanceUsd = new Big(netBalanceUsd).minus(unrealizedPnlUsd).toNumber();
    } else {
      // Bybit and OKX provide Wallet Balance (does not include unrealized PnL).
      // Net = Wallet + Unrealized.
      walletBalance = reconstructedAmount;
      walletBalanceUsd = reconstructedUsd;
      netBalance = new Big(walletBalance).plus(unrealizedPnl).toNumber();
      netBalanceUsd = new Big(walletBalanceUsd).plus(unrealizedPnlUsd).toNumber();
    }

    // Coin sizes (in coin, at the coin's mark price): shorts' size = the protected
    // leg; longs' size = the leveraged leg. Exposed Size is the part of the coin
    // that is NOT protected: with a short it is only the short's uncovered balance
    // (balance − protected); with NO short there is nothing hedged, so the whole
    // wallet PLUS the long position is exposed (wallet + leveraged). Total Exposed
    // = Exposed + Leveraged — the full amount at market risk.
    const protectedSize = group.levels.reduce(
      (acc, l) => (l.isShort ? acc.plus(l.openPosSize || 0) : acc),
      new Big(0),
    ).toNumber();
    const leveragedSize = group.levels.reduce(
      (acc, l) => (l.isShort ? acc : acc.plus(l.openPosSize || 0)),
      new Big(0),
    ).toNumber();
    
    // Exposed Size is the part of the coin that is NOT protected (uncovered base).
    const exposedSize = refPrice > 0 
      ? exposedBaseUsd / refPrice 
      : Math.max(0, new Big(walletBalance || 0).minus(protectedSize).toNumber());

    // Total Exposed Size = Exposed + Leveraged.
    const totalExposedSize = new Big(exposedSize).plus(leveragedSize).toNumber();

    // Aggregated ROI of the coin — unrealized PnL relative to the fixed wallet
    // (mirrors the exchange's Assets screen: unrealized ÷ wallet balance).
    const roiPct = walletBalanceUsd > 0 ? (unrealizedPnlUsd / walletBalanceUsd) * 100 : 0;
    const realizedRoiPct = walletBalanceUsd > 0 ? (realizedPnlUsd / walletBalanceUsd) * 100 : 0;

    summaries.push({
      key,
      connectionId: group.connectionId,
      accountType: group.levels[0]?.accountType,
      baseCoin: group.baseCoin,
      exchange: group.exchange,
      accountLabel: group.levels[0]?.label || '',
      balanceUsd,
      walletBalance,
      walletBalanceUsd,
      netBalance,
      netBalanceUsd,
      unrealizedPnl,
      unrealizedPnlUsd,
      realizedPnl,
      realizedPnlUsd,
      protectedUsd,
      protectedSize,
      exposedBaseUsd,
      exposedSize,
      leveragedUsd,
      leveragedSize,
      totalExposedUsd,
      totalExposedSize,
      exposedUsd,
      coveragePct,
      roiPct,
      realizedRoiPct,
      positionCount,
      longCount,
      shortCount,
      overexposedCount,
      positions: group.levels,
    });
  }

  // Stable order: most "value at play" first (protected + exposed desc).
  return summaries.sort((a, b) =>
    (b.protectedUsd + b.exposedUsd) - (a.protectedUsd + a.exposedUsd)
  );
}

// ── Per-coin chart rows (aggregated across accounts) ──

/** One account's slice of a coin inside the aggregated chart tooltip. */
export interface HedgeCoinChartAccount {
  exchange: ExchangeName;
  accountLabel: string;
  balanceUsd: number;
  protectedUsd: number;
  /** Uncovered balance (excl. leveraged). */
  exposedBaseUsd: number;
  exposedUsd: number;
  leveragedUsd: number;
}

/** Per-coin aggregate across all accounts (one chart row per coin). */
export interface HedgeCoinChartRow {
  baseCoin: string;
  /** Σ balance across accounts holding this coin in hedge. */
  balanceUsd: number;
  /** Σ protected across accounts (each already capped by its own balance). */
  protectedUsd: number;
  /** Σ exposed across accounts. */
  exposedUsd: number;
  /** Σ uncovered balance across accounts (excl. leveraged). */
  exposedBaseUsd: number;
  /** Σ leveraged (inverse longs) across accounts. */
  leveragedUsd: number;
  /** balanceUsd > 0 ? protectedUsd / balanceUsd × 100 : 0. */
  coveragePct: number;
  accountCount: number;
  /** True when ANY account holding this coin has an overexposed position. */
  overexposed: boolean;
  /** Per-account breakdown for the tooltip. */
  accounts: HedgeCoinChartAccount[];
}

/**
 * Aggregate per-account coin summaries into per-coin rows for the chart.
 * One row per baseCoin — sums balance/protected/exposed/leveraged across every
 * account holding that coin in hedge. The chart groups BY COIN; the per-account
 * cards (HedgeProCoinSummary) keep the account-level detail.
 */
export function getHedgeCoinChartRows(summaries: HedgeCoinSummary[]): HedgeCoinChartRow[] {
  const byCoin = new Map<string, HedgeCoinChartRow>();

  for (const s of summaries) {
    const coin = s.baseCoin.toUpperCase();
    let row = byCoin.get(coin);
    if (!row) {
      row = {
        baseCoin: coin,
        balanceUsd: 0,
        protectedUsd: 0,
        exposedUsd: 0,
        exposedBaseUsd: 0,
        leveragedUsd: 0,
        coveragePct: 0,
        accountCount: 0,
        overexposed: false,
        accounts: [],
      };
      byCoin.set(coin, row);
    }

    row.balanceUsd = new Big(row.balanceUsd).plus(s.balanceUsd || 0).toNumber();
    row.protectedUsd = new Big(row.protectedUsd).plus(s.protectedUsd || 0).toNumber();
    row.exposedUsd = new Big(row.exposedUsd).plus(s.exposedUsd || 0).toNumber();
    row.exposedBaseUsd = new Big(row.exposedBaseUsd).plus(Math.max(0, s.balanceUsd - s.protectedUsd)).toNumber();
    row.leveragedUsd = new Big(row.leveragedUsd).plus(s.leveragedUsd || 0).toNumber();
    row.accountCount += 1;
    row.overexposed = row.overexposed || s.overexposedCount > 0;
    row.accounts.push({
      exchange: s.exchange,
      accountLabel: s.accountLabel,
      balanceUsd: s.balanceUsd,
      protectedUsd: s.protectedUsd,
      exposedBaseUsd: Math.max(0, s.balanceUsd - s.protectedUsd),
      exposedUsd: s.exposedUsd,
      leveragedUsd: s.leveragedUsd,
    });
  }

  const rows = Array.from(byCoin.values());
  for (const row of rows) {
    row.coveragePct = row.balanceUsd > 0 ? (row.protectedUsd / row.balanceUsd) * 100 : 0;
  }

  // Stable order: most "value at play" first.
  return rows.sort((a, b) => (b.protectedUsd + b.exposedUsd) - (a.protectedUsd + a.exposedUsd));
}

// ── Portfolio totals ──

/**
 * Roll per-coin summaries into portfolio totals. `totalEquity` comes from the same
 * source the main dashboard uses (Σ balance usdValue) and is kept for the equity-%
 * context KPIs so numbers reconcile with the "Hedge Mode (Inverse)" indicator.
 */
export function getHedgeTotals(
  coinSummaries: HedgeCoinSummary[],
  totalEquity: number,
): HedgeTotals {
  const sum = (selector: (c: HedgeCoinSummary) => number): number =>
    coinSummaries.reduce((acc, c) => acc.plus(selector(c) || 0), new Big(0)).toNumber();

  const totalProtected = sum(c => c.protectedUsd);
  const totalExposed = sum(c => c.exposedBaseUsd);
  const totalLeveraged = sum(c => c.leveragedUsd);
  const totalBalance = sum(c => c.balanceUsd);

  // Hedge Coverage (net protection): only the protected leg counts — the leveraged leg is
  // NOT protected (it only adds risk), so it subtracts from the protected side, measured
  // against equity. Negative when leveraged exceeds protected: nothing is shielded while
  // leverage is still running (risk with no hedge to offset it).
  const coveragePct = totalEquity > 0 ? ((totalProtected - totalLeveraged) / totalEquity) * 100 : 0;
  const protectedOfEquityPct = totalEquity > 0 ? (totalProtected / totalEquity) * 100 : 0;
  const exposedOfEquityPct = totalEquity > 0 ? (totalExposed / totalEquity) * 100 : 0;

  const inversePositionCount = coinSummaries.reduce((acc, c) => acc + c.positionCount, 0);
  const inverseLongCount = coinSummaries.reduce((acc, c) => acc + c.longCount, 0);
  const inverseShortCount = coinSummaries.reduce((acc, c) => acc + c.shortCount, 0);

  return {
    totalProtected,
    totalExposed,
    totalLeveraged,
    totalBalance,
    coveragePct,
    totalEquity,
    protectedOfEquityPct,
    exposedOfEquityPct,
    inversePositionCount,
    inverseLongCount,
    inverseShortCount,
  };
}
