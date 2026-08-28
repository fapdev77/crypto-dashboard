import { describe, it, expect } from 'vitest';
import type { UnifiedPosition, UnifiedBalance } from '../../types';
import {
  getHedgePositionLevels,
  getHedgeCoinSummaries,
  getHedgeCoinChartRows,
  getHedgeTotals,
  getInverseCoinKey,
} from '../hedgeUtils';

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function makePos(overrides: Partial<UnifiedPosition> & { id: string; connectionId: string }): UnifiedPosition {
  return {
    exchange: 'bitget',
    label: 'test',
    symbol: 'BTCUSD',
    baseCoin: 'BTC',
    quoteCoin: 'USD',
    side: 'short',
    ccy: 'BTC',
    size: 2,
    entryPrice: 50000,
    markPrice: 55000,
    unrealizedPnl: 0,
    realizedPnl: 0,
    leverage: 10,
    instrumentType: 'INVERSE',
    ...overrides,
  };
}

function makeBal(overrides: Partial<UnifiedBalance> & { id: string; connectionId: string; ccy: string }): UnifiedBalance {
  return {
    exchange: 'bitget',
    label: 'test',
    amount: 5,
    usdValue: 275000,
    ...overrides,
  };
}

const BTC_BALANCE = makeBal({ id: 'conn1-BTC', connectionId: 'conn1', ccy: 'BTC', amount: 5, usdValue: 275000 });

// Short Bitget inverse: entryUsd = size × entryPrice (no notionalUsd in mock/bitget)
const SHORT_BTC = makePos({
  id: 'pos-short',
  connectionId: 'conn1',
  exchange: 'bitget',
  symbol: 'BTCUSD',
  baseCoin: 'BTC',
  ccy: 'BTC',
  side: 'short',
  size: 2,
  entryPrice: 50000,
  markPrice: 55000,
});

const LONG_BTC = makePos({
  id: 'pos-long',
  connectionId: 'conn1',
  exchange: 'bitget',
  symbol: 'BTCUSD',
  baseCoin: 'BTC',
  ccy: 'BTC',
  side: 'long',
  size: 2,
  entryPrice: 50000,
  markPrice: 55000,
});

describe('getInverseCoinKey', () => {
  it('should join connectionId and baseCoin', () => {
    expect(getInverseCoinKey('conn-abc', 'BTC')).toBe('conn-abc:BTC');
  });
});

describe('getHedgePositionLevels — short inverse', () => {
  it('should compute protected/exposed with balance cap (standard locked entry USD)', () => {
    // SHORT_BTC: size = 2, entry = 50000, mark = 55000. Balance = 5 BTC ($275,000).
    // Protected USD is locked at entry = 2 * 50000 = 100,000 USD (capped by balance $275,000).
    // protectedAmount = 100,000 / 55,000 BTC (~1.81818 BTC).
    const lvl = getHedgePositionLevels(SHORT_BTC, [BTC_BALANCE]);

    expect(lvl.entryUsd).toBe(2 * 50000);            // 100000 (locked at entry)
    expect(lvl.initialValueUsd).toBe(100000);
    expect(lvl.initialSizeInCoin).toBe(2);
    expect(lvl.protectedUsd).toBe(100000);           // min(2 * 50000, 275000)
    expect(lvl.protectedAmount).toBeCloseTo(100000 / 55000, 8); // size in coin hedged at market price
    expect(lvl.exposedAmount).toBe(3);               // 5 BTC balance - 2 BTC hedged = 3 BTC uncovered
    expect(lvl.exposedBaseUsd).toBe(3 * 55000);      // 165000 (uncovered balance at mark price)
    expect(lvl.exposedUsd).toBe(3 * 55000);
    expect(lvl.leveragedUsd).toBe(0);
    expect(lvl.protectedPct).toBeCloseTo((100000 / 275000) * 100, 3);
    expect(lvl.exposedPct).toBeCloseTo((165000 / 275000) * 100, 3);
    expect(lvl.totalAssetBal).toBe(5);
    expect(lvl.assetBalUsd).toBe(275000);
    expect(lvl.overexposed).toBe(false);
    expect(lvl.label).toBe('test');
    expect(lvl.leverage).toBe(10);
    expect(lvl.marginMode).toBe('cross');
    expect(lvl.ccy).toBe('BTC');
    expect(lvl.unrealizedPnl).toBe(0);
    expect(lvl.unrealizedPnlUsd).toBe(0);
    expect(lvl.realizedPnl).toBe(0);
    expect(lvl.realizedPnlUsd).toBe(0);
  });

  it('should compute protected at locked entryUsd in net mode for Bitget', () => {
    const lvlNet = getHedgePositionLevels(SHORT_BTC, [BTC_BALANCE], 'net');
    expect(lvlNet.entryUsd).toBe(100000);
    expect(lvlNet.protectedUsd).toBe(100000);
    expect(lvlNet.protectedAmount).toBeCloseTo(100000 / 55000, 8);
  });

  it('should convert inverse PnL to USD using the mark price', () => {
    const pos = makePos({
      ...SHORT_BTC,
      id: 'pos-pnl',
      unrealizedPnl: 2,
      realizedPnl: 0.5,
      markPrice: 55000,
    });
    const lvl = getHedgePositionLevels(pos, [BTC_BALANCE]);

    expect(lvl.unrealizedPnl).toBe(2);
    expect(lvl.unrealizedPnlUsd).toBe(2 * 55000);
    expect(lvl.realizedPnl).toBe(0.5);
    expect(lvl.realizedPnlUsd).toBe(0.5 * 55000);
  });

  it('should use notionalUsd directly for bybit/okx shorts', () => {
    const bybitShort = makePos({
      ...SHORT_BTC,
      id: 'pos-bybit',
      exchange: 'bybit',
      symbol: 'BTCUSD',
      size: 2,
      entryPrice: 50000,
      notionalUsd: 120000,
    });
    const lvl = getHedgePositionLevels(bybitShort, [BTC_BALANCE]);

    expect(lvl.entryUsd).toBe(120000);
    expect(lvl.protectedUsd).toBe(120000);
    expect(lvl.exposedUsd).toBeCloseTo(155000, 1);
  });

  it('should keep locked entry USD fixed even if position size exceeds current balance', () => {
    const smallBalance = makeBal({ id: 'conn1-BTC', connectionId: 'conn1', ccy: 'BTC', amount: 1, usdValue: 55000 });
    const lvl = getHedgePositionLevels(SHORT_BTC, [smallBalance]);

    expect(lvl.protectedUsd).toBe(100000);           // 2 BTC * $50,000 = $100,000 locked USD (fixed)
    expect(lvl.exposedUsd).toBe(0);
    expect(lvl.protectedPct).toBeCloseTo((100000 / 55000) * 100, 3);
    expect(lvl.exposedPct).toBe(0);
  });

  it('should fall back to uncapped entry when no matching balance exists', () => {
    const bybitPos = makePos({
      ...SHORT_BTC,
      id: 'pos-bybit-nobal',
      exchange: 'bybit',
      notionalUsd: 100000,
    });
    const lvl = getHedgePositionLevels(bybitPos, []);
    expect(lvl.protectedUsd).toBe(100000);
    expect(lvl.exposedUsd).toBe(0);
    expect(lvl.protectedPct).toBe(100);
    expect(lvl.exposedPct).toBe(0);
  });

  it('should return zero for non-inverse positions', () => {
    const perp = makePos({
      ...SHORT_BTC,
      id: 'pos-perp',
      symbol: 'BTCUSDT',
      quoteCoin: 'USDT',
      ccy: 'USDT',
      instrumentType: 'PERP',
    });
    // Matching balance for the perp's ccy (USDT) — non-inverse must stay unprotected.
    const usdtBal = makeBal({ id: 'conn1-USDT', connectionId: 'conn1', ccy: 'USDT', amount: 5, usdValue: 275000 });
    const lvl = getHedgePositionLevels(perp, [usdtBal]);
    expect(lvl.protectedUsd).toBe(0);
    expect(lvl.exposedUsd).toBe(275000);  // assetBalUsd default — instrument not INVERSE
    expect(lvl.exposedPct).toBe(100);
  });
  it('should support mode="gross" vs mode="net" balance calculation', () => {
    // For Bitget coin-m: amount is Net (Equity). unrealizedPnl is +0.5 BTC.
    // In gross mode: balanceAmount = Net - PnL = 5 - 0.5 = 4.5 BTC.
    // In net mode: balanceAmount = Net = 5 BTC.
    const bitgetPosWithPnl = makePos({
      ...SHORT_BTC,
      id: 'pos-bitget-pnl',
      exchange: 'bitget',
      unrealizedPnl: 0.5,
      markPrice: 50000,
    });

    const lvlGross = getHedgePositionLevels(bitgetPosWithPnl, [BTC_BALANCE], 'gross');
    expect(lvlGross.mode).toBe('gross');
    expect(lvlGross.balanceAmount).toBeCloseTo(4.5, 10);
    expect(lvlGross.grossBalanceAmount).toBeCloseTo(4.5, 10);
    expect(lvlGross.netBalanceAmount).toBeCloseTo(5.0, 10);
    // Standardized across all exchanges: protectedUsd is locked at entry (2 * 50000 = 100000 USD)
    // and protectedAmount in BTC at mark price = 100000 / 50000 = 2 BTC
    expect(lvlGross.protectedAmount).toBe(2);
    expect(lvlGross.protectedUsd).toBe(100000);

    const lvlNet = getHedgePositionLevels(bitgetPosWithPnl, [BTC_BALANCE], 'net');
    expect(lvlNet.mode).toBe('net');
    expect(lvlNet.balanceAmount).toBeCloseTo(5.0, 10);
    expect(lvlNet.grossBalanceAmount).toBeCloseTo(4.5, 10);
    expect(lvlNet.netBalanceAmount).toBeCloseTo(5.0, 10);

    // For Bybit: amount is Gross (Wallet). unrealizedPnl is +0.5 BTC.
    // In gross mode: balanceAmount = Gross = 5 BTC.
    // For inverse short hedge: netBalanceAmount reflects the protected + exposed value (5 BTC).
    const bybitPosWithPnl = makePos({
      ...SHORT_BTC,
      id: 'pos-bybit-pnl',
      exchange: 'bybit',
      unrealizedPnl: 0.5,
      markPrice: 50000,
      notionalUsd: 100000,
    });

    const bybitLvlGross = getHedgePositionLevels(bybitPosWithPnl, [BTC_BALANCE], 'gross');
    expect(bybitLvlGross.mode).toBe('gross');
    expect(bybitLvlGross.balanceAmount).toBeCloseTo(5.0, 10);
    expect(bybitLvlGross.grossBalanceAmount).toBeCloseTo(5.0, 10);
    expect(bybitLvlGross.netBalanceAmount).toBeCloseTo(5.0, 10);

    const bybitLvlNet = getHedgePositionLevels(bybitPosWithPnl, [BTC_BALANCE], 'net');
    expect(bybitLvlNet.mode).toBe('net');
    expect(bybitLvlNet.balanceAmount).toBeCloseTo(5.0, 10);
    expect(bybitLvlNet.grossBalanceAmount).toBeCloseTo(5.0, 10);
    expect(bybitLvlNet.netBalanceAmount).toBeCloseTo(5.0, 10);
  });
});

describe('getHedgePositionLevels — long inverse', () => {
  it('should be fully exposed (balance + position value) and flagged overexposed', () => {
    const lvl = getHedgePositionLevels(LONG_BTC, [BTC_BALANCE]);

    expect(lvl.protectedUsd).toBe(0);
    expect(lvl.positionValueUsd).toBe(2 * 55000);            // 110000 (size × mark)
    expect(lvl.exposedUsd).toBe(275000 + 110000);            // 385000
    expect(lvl.exposedBaseUsd).toBe(275000);                 // balance fully exposed
    expect(lvl.leveragedUsd).toBe(110000);                   // long position value
    expect(lvl.exposedPct).toBeCloseTo(140, 3);              // > 100
    expect(lvl.overexposed).toBe(true);
  });

  it('should flag overexposed when no covering balance exists', () => {
    const lvl = getHedgePositionLevels(LONG_BTC, []);
    expect(lvl.overexposed).toBe(true);
    expect(lvl.exposedUsd).toBe(0 + 110000);                 // position value only
    expect(lvl.exposedPct).toBe(100);
  });
});

describe('getHedgeCoinSummaries', () => {
  it('should roll up a hedge pair (short + long) on the same coin', () => {
    const summaries = getHedgeCoinSummaries([SHORT_BTC, LONG_BTC], [BTC_BALANCE]);
    expect(summaries).toHaveLength(1);

    const coin = summaries[0];
    expect(coin.key).toBe('conn1:BTC');
    expect(coin.accountLabel).toBe('test');
    expect(coin.balanceUsd).toBe(275000);
    expect(coin.walletBalance).toBe(5);
    // Derived from positions (short: Size + Exposed / long: Exposed − Size) —
    // both reconstruct the wallet at the mark price, so they agree.
    expect(coin.walletBalanceUsd).toBe(275000);
    expect(coin.netBalance).toBe(5);                        // wallet + unrealized (0)
    expect(coin.netBalanceUsd).toBe(275000);
    expect(coin.unrealizedPnl).toBe(0);
    expect(coin.unrealizedPnlUsd).toBe(0);
    expect(coin.protectedUsd).toBe(100000);                  // min(Σ shorts, balance)
    expect(coin.protectedSize).toBeCloseTo(100000 / 55000, 10); // Bitget protected coin size at mark price
    expect(coin.exposedBaseUsd).toBe(3 * 55000);             // 165000 uncovered balance at mark (5 - 2 = 3 BTC)
    expect(coin.exposedSize).toBeCloseTo(3, 10);
    expect(coin.leveragedUsd).toBe(110000);                  // long position value
    expect(coin.leveragedSize).toBeCloseTo(2, 10);           // long size in coin
    // Total Exposed = Exposed (short's uncovered) + Leveraged (long) — the full
    // amount at market risk.
    expect(coin.totalExposedUsd).toBe(165000 + 110000);      // = exposedBaseUsd + leveragedUsd
    expect(coin.totalExposedSize).toBeCloseTo(3 + 2, 10);
    expect(coin.exposedUsd).toBe(165000 + 110000);          // 275000
    expect(coin.coveragePct).toBeCloseTo(36.3636, 3);
    expect(coin.roiPct).toBe(0);                             // no unrealized PnL
    expect(coin.positionCount).toBe(2);
    expect(coin.longCount).toBe(1);
    expect(coin.shortCount).toBe(1);
    expect(coin.overexposedCount).toBe(1);
  });

  it('should keep Net Balance (equity) and subtract unrealized PnL into Wallet Balance', () => {
    const shortWithPnl = makePos({ ...SHORT_BTC, id: 'pos-short-pnl', unrealizedPnl: 0.5 });
    const longWithPnl = makePos({ ...LONG_BTC, id: 'pos-long-pnl', unrealizedPnl: -0.2 });
    const summaries = getHedgeCoinSummaries([shortWithPnl, longWithPnl], [BTC_BALANCE]);
    const coin = summaries[0];

    // Total unrealized = short 0.5 + long (−0.2) = 0.3 BTC; in USD = 0.3 × 55000.
    expect(coin.unrealizedPnl).toBeCloseTo(0.3, 10);
    expect(coin.unrealizedPnlUsd).toBeCloseTo(0.3 * 55000, 6);
    // Net Balance = account equity reconstructed from positions (Bitget coin-m
    // store amount IS accountEquity) — unrealized PnL is already inside equity.
    expect(coin.netBalance).toBeCloseTo(5, 10);
    expect(coin.netBalanceUsd).toBeCloseTo(275000, 6);
    // Wallet Balance = Net − unrealized PnL (fixed assets without unrealized).
    expect(coin.walletBalance).toBeCloseTo(5 - 0.3, 10);
    expect(coin.walletBalanceUsd).toBeCloseTo(275000 - 0.3 * 55000, 6);
    // ROI = unrealized PnL ÷ wallet balance = 16500 / 258500.
    expect(coin.roiPct).toBeCloseTo((0.3 * 55000) / (275000 - 0.3 * 55000) * 100, 3);
  });

  it('should show Wallet > Net when unrealized PnL is negative (Bitget coin-m)', () => {
    // Mirrors the exchange's Assets screen: Net 1,130.24, unrealized −195.77 →
    // Wallet 1,326.00. Net = equity (includes unrealized); Wallet = fixed assets
    // without unrealized PnL.
    const shortLoss = makePos({ ...SHORT_BTC, id: 'pos-loss', unrealizedPnl: -0.5 });
    const summaries = getHedgeCoinSummaries([shortLoss], [BTC_BALANCE]);
    const coin = summaries[0];

    expect(coin.netBalance).toBe(5);              // equity at mark (store amount)
    expect(coin.unrealizedPnl).toBe(-0.5);
    expect(coin.walletBalance).toBeCloseTo(5 - (-0.5), 10); // 5.5
    expect(coin.walletBalanceUsd).toBeCloseTo(275000 - (-0.5 * 55000), 6);
    expect(coin.netBalanceUsd).toBe(275000);
    // ROI = unrealized PnL ÷ wallet = (−27500) / 302500 → negative.
    expect(coin.roiPct).toBeCloseTo((-0.5 * 55000) / (275000 + 0.5 * 55000) * 100, 3);
  });

  it('should reconstruct Net Balance (equity) from a long via Exposed − Size', () => {
    const summaries = getHedgeCoinSummaries([LONG_BTC], [BTC_BALANCE]);
    const coin = summaries[0];
    // Long: Exposed (385000) − Size (110000) = 275000 (equity at mark price).
    expect(coin.netBalanceUsd).toBe(275000);
    expect(coin.netBalance).toBe(5);
    // No unrealized PnL → wallet equals net.
    expect(coin.walletBalanceUsd).toBe(275000);
    expect(coin.walletBalance).toBe(5);
  });

  it('should expose wallet + long when there is NO short to hedge (long only)', () => {
    const summaries = getHedgeCoinSummaries([LONG_BTC], [BTC_BALANCE]);
    const coin = summaries[0];
    // No short → nothing is protected, so Exposed Base = wallet balance.
    expect(coin.shortCount).toBe(0);
    expect(coin.protectedUsd).toBe(0);
    expect(coin.exposedSize).toBeCloseTo(5, 10);               // physical wallet only
    expect(coin.exposedBaseUsd).toBeCloseTo(5 * 55000, 6);     // 275000
    // Total Exposed = Exposed Base + Leveraged
    expect(coin.totalExposedSize).toBeCloseTo(7, 10);          // wallet 5 + long 2
    expect(coin.totalExposedUsd).toBeCloseTo(385000, 6);
    expect(coin.leveragedSize).toBeCloseTo(2, 10);             // still shown separately
  });

  it('should reconstruct Net Balance (equity) from a short via Size + Exposed', () => {
    const summaries = getHedgeCoinSummaries([SHORT_BTC], [BTC_BALANCE]);
    const coin = summaries[0];
    // Short: Size (protected 100000) + Exposed (175000) = 275000.
    expect(coin.netBalanceUsd).toBe(275000);
    expect(coin.netBalance).toBe(5);
    expect(coin.walletBalanceUsd).toBe(275000);
    expect(coin.walletBalance).toBe(5);
  });

  it('should reconstruct the wallet balance quantity from Net Balance minus unrealized PnL', () => {
    // Wallet = Net − unrealized PnL. The source walletBalance field is NOT used
    // for the quantity (Bitget coin-m reports 0); the position reconstruction of
    // the equity (Net) is authoritative.
    const balWithWallet = makeBal({
      id: 'conn1-BTC',
      connectionId: 'conn1',
      ccy: 'BTC',
      amount: 5,
      walletBalance: 7,
      usdValue: 275000,
    });
    const summaries = getHedgeCoinSummaries([SHORT_BTC], [balWithWallet]);
    // Net (equity at mark) = 275000/55000 = 5 BTC; unrealized 0 → wallet = net.
    expect(summaries[0].netBalance).toBe(5);
    expect(summaries[0].walletBalance).toBe(5);
    expect(summaries[0].netBalanceUsd).toBe(275000);
    expect(summaries[0].walletBalanceUsd).toBe(275000);
  });

  it('should not zero the wallet quantity when the source reports walletBalance: 0 (Bitget coin-m)', () => {
    // Bitget COIN-FUTURES adapters report walletBalance: 0 (crossedMaxAvailable /
    // available absent) while amount holds the real coin quantity — the quantity
    // must come from the position reconstruction, never 0.
    const balZeroWallet = makeBal({
      id: 'conn1-BTC',
      connectionId: 'conn1',
      ccy: 'BTC',
      amount: 5,
      walletBalance: 0,
      usdValue: 275000,
    });
    const summaries = getHedgeCoinSummaries([SHORT_BTC], [balZeroWallet]);
    expect(summaries[0].walletBalance).toBe(5);
    expect(summaries[0].walletBalanceUsd).toBe(275000);
    // Net = wallet + unrealized (0) — must be positive, not 0 + PnL.
    expect(summaries[0].netBalance).toBe(5);
    expect(summaries[0].netBalanceUsd).toBe(275000);
  });

  it('should correctly compute gross Wallet Balance and liquid Net Balance for Bybit with positive PnL', () => {
    const bybitPos = makePos({
      ...SHORT_BTC,
      id: 'bybit-pos-1',
      connectionId: 'bybit-conn',
      exchange: 'bybit',
      size: 33332,
      notionalUsd: 33332,
      entryPrice: 69164.22,
      markPrice: 68450,
      unrealizedPnl: 0.005028,
    });
    const bybitBal = makeBal({
      id: 'bybit-conn-BTC',
      connectionId: 'bybit-conn',
      exchange: 'bybit',
      ccy: 'BTC',
      amount: 0.65,
      walletBalance: 0.65,
      usdValue: 44492.5,
    });

    const summaries = getHedgeCoinSummaries([bybitPos], [bybitBal]);
    const coin = summaries[0];

    // Wallet Balance is the gross balance before unrealized PnL
    expect(coin.walletBalance).toBe(0.65);
    expect(coin.walletBalanceUsd).toBe(44492.5);

    // Net Balance is the true net equity in USD (Protected USD + Exposed USD)
    expect(coin.netBalance).toBeCloseTo(0.65, 6);
    expect(coin.netBalanceUsd).toBeCloseTo(44492.5, 2);

    // Protected = entry value capped by balance: min(33332, 44492.5) = 33332
    expect(coin.protectedUsd).toBe(33332);
    // Exposed Base = 44492.5 - 33332 = 11160.5
    expect(coin.exposedBaseUsd).toBeCloseTo(11160.5, 2);
  });

  it('should correctly compute gross Wallet Balance and liquid Net Balance for Bybit with negative PnL', () => {
    const bybitPos = makePos({
      ...SHORT_BTC,
      id: 'bybit-pos-2',
      connectionId: 'bybit-conn',
      exchange: 'bybit',
      size: 33332,
      notionalUsd: 33332,
      entryPrice: 65000,
      markPrice: 68450,
      unrealizedPnl: -0.02,
    });
    const bybitBal = makeBal({
      id: 'bybit-conn-BTC',
      connectionId: 'bybit-conn',
      exchange: 'bybit',
      ccy: 'BTC',
      amount: 0.65,
      walletBalance: 0.65,
      usdValue: 44492.5,
    });

    const summaries = getHedgeCoinSummaries([bybitPos], [bybitBal]);
    const coin = summaries[0];

    // Wallet Balance remains gross (0.65)
    expect(coin.walletBalance).toBe(0.65);
    expect(coin.walletBalanceUsd).toBe(44492.5);

    // Net Balance for inverse short hedge preserves locked USD: 33332 protected + 11160.5 exposed = 44492.5
    expect(coin.netBalance).toBeCloseTo(0.65, 6);
    expect(coin.netBalanceUsd).toBeCloseTo(44492.5, 2);
  });

  it('should adjust balanceUsd and exposure according to gross and net modes', () => {
    const bybitPos = makePos({
      ...SHORT_BTC,
      id: 'bybit-pos-pnl',
      connectionId: 'bybit-conn',
      exchange: 'bybit',
      size: 30000,
      notionalUsd: 30000,
      entryPrice: 60000,
      markPrice: 60000,
      unrealizedPnl: 0.1, // +0.1 BTC = +$6,000 PnL
    });
    const bybitBal = makeBal({
      id: 'bybit-conn-BTC',
      connectionId: 'bybit-conn',
      exchange: 'bybit',
      ccy: 'BTC',
      amount: 1.0,
      walletBalance: 1.0,
      usdValue: 60000,
    });

    // Gross mode (default): uses wallet balance ($60,000)
    const grossSummaries = getHedgeCoinSummaries([bybitPos], [bybitBal], 'gross');
    const grossCoin = grossSummaries[0];
    expect(grossCoin.balanceUsd).toBe(60000);
    expect(grossCoin.protectedUsd).toBe(30000);
    expect(grossCoin.exposedBaseUsd).toBeCloseTo(30000, 2);
    expect(grossCoin.positions[0].exposedBaseUsd).toBeCloseTo(30000, 2);

    // Net mode: uses net balance / liquid equity ($60,000 for inverse short)
    const netSummaries = getHedgeCoinSummaries([bybitPos], [bybitBal], 'net');
    const netCoin = netSummaries[0];
    expect(netCoin.balanceUsd).toBe(60000);
    expect(netCoin.protectedUsd).toBe(30000);
    expect(netCoin.exposedBaseUsd).toBeCloseTo(30000, 2);
    expect(netCoin.positions[0].exposedBaseUsd).toBeCloseTo(30000, 2);
  });

  it('should separate the same baseCoin across different connections', () => {
    const otherConn = makePos({ ...SHORT_BTC, id: 'pos-conn2', connectionId: 'conn2' });
    const bal2 = makeBal({ id: 'conn2-BTC', connectionId: 'conn2', ccy: 'BTC', amount: 10, usdValue: 550000 });
    const summaries = getHedgeCoinSummaries([SHORT_BTC, otherConn], [BTC_BALANCE, bal2]);

    expect(summaries).toHaveLength(2);
    const conn1 = summaries.find(c => c.connectionId === 'conn1');
    const conn2 = summaries.find(c => c.connectionId === 'conn2');
    expect(conn1?.balanceUsd).toBe(275000);
    expect(conn2?.balanceUsd).toBe(550000);
  });

  it('should ignore non-INVERSE positions', () => {
    const perp = makePos({
      ...LONG_BTC,
      id: 'pos-perp',
      symbol: 'BTCUSDT',
      quoteCoin: 'USDT',
      ccy: 'USDT',
      instrumentType: 'PERP',
    });
    const summaries = getHedgeCoinSummaries([perp], [BTC_BALANCE]);
    expect(summaries).toHaveLength(0);
  });

  it('should sum total fixed protection from multiple shorts without capping by coin balance', () => {
    const short2 = makePos({ ...SHORT_BTC, id: 'pos-short-2', size: 8, entryPrice: 60000 });
    // Σ entry = 2×50000 + 8×60000 = 580000
    const summaries = getHedgeCoinSummaries([SHORT_BTC, short2], [BTC_BALANCE]);
    expect(summaries[0].protectedUsd).toBe(580000);
    expect(summaries[0].exposedUsd).toBe(0);
    expect(summaries[0].coveragePct).toBeCloseTo((580000 / 275000) * 100, 3);
  });

  it('should return empty array for no inverse positions', () => {
    expect(getHedgeCoinSummaries([], [BTC_BALANCE])).toEqual([]);
  });
});

describe('getHedgeCoinChartRows', () => {
  it('should aggregate the same baseCoin across accounts into a single row', () => {
    const short2 = makePos({
      ...SHORT_BTC,
      id: 'pos-conn2',
      connectionId: 'conn2',
      exchange: 'bybit',
      size: 3,
      entryPrice: 60000,
    });
    const bal2 = makeBal({ id: 'conn2-BTC', connectionId: 'conn2', ccy: 'BTC', amount: 10, usdValue: 600000 });

    const summaries = getHedgeCoinSummaries([SHORT_BTC, short2], [BTC_BALANCE, bal2]);
    const rows = getHedgeCoinChartRows(summaries);

    expect(rows).toHaveLength(1); // one row per coin, NOT one per account
    expect(rows[0].baseCoin).toBe('BTC');
    expect(rows[0].accountCount).toBe(2);
    expect(rows[0].balanceUsd).toBe(275000 + 600000);
    // conn1: min(2×50000, 275000) = 100000; conn2: min(3×60000, 600000) = 180000
    expect(rows[0].protectedUsd).toBe(100000 + 180000);
    expect(rows[0].exposedUsd).toBe(550000); // 10 BTC exposed * 55000
    expect(rows[0].exposedBaseUsd).toBe(550000); // no leveraged
    expect(rows[0].leveragedUsd).toBe(0);
    expect(rows[0].coveragePct).toBeCloseTo((280000 / 875000) * 100, 3);
    expect(rows[0].overexposed).toBe(false);
    expect(rows[0].accounts).toHaveLength(2);
    expect(rows[0].accounts.map(a => a.exchange).sort()).toEqual(['bitget', 'bybit']);
    expect(rows[0].accounts.find(a => a.exchange === 'bybit')?.protectedUsd).toBe(180000);
  });

  it('should keep distinct coins as separate rows', () => {
    const ethPos = makePos({
      ...SHORT_BTC,
      id: 'pos-eth',
      symbol: 'ETHUSD',
      baseCoin: 'ETH',
      size: 10,
      entryPrice: 3000,
    });
    const ethBal = makeBal({ id: 'conn1-ETH', connectionId: 'conn1', ccy: 'ETH', amount: 20, usdValue: 60000 });

    const summaries = getHedgeCoinSummaries([SHORT_BTC, ethPos], [BTC_BALANCE, ethBal]);
    const rows = getHedgeCoinChartRows(summaries);

    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.baseCoin).sort()).toEqual(['BTC', 'ETH']);
  });

  it('should flag overexposed when any account of the coin is overexposed', () => {
    const long2 = makePos({ ...LONG_BTC, id: 'pos-conn2', connectionId: 'conn2' });
    const bal2 = makeBal({ id: 'conn2-BTC', connectionId: 'conn2', ccy: 'BTC', amount: 10, usdValue: 600000 });

    const summaries = getHedgeCoinSummaries([LONG_BTC, long2], [BTC_BALANCE, bal2]);
    const rows = getHedgeCoinChartRows(summaries);

    expect(rows[0].overexposed).toBe(true);
    // Longs split the bar: exposed base = balances, leveraged = position values.
    expect(rows[0].exposedBaseUsd).toBe(275000 + 550000);
    expect(rows[0].leveragedUsd).toBe(110000 + 110000);
  });

  it('should return empty for no summaries', () => {
    expect(getHedgeCoinChartRows([])).toEqual([]);
  });
});

describe('getHedgeTotals', () => {
  it('should roll up totals from coin summaries', () => {
    const summaries = getHedgeCoinSummaries([SHORT_BTC, LONG_BTC], [BTC_BALANCE]);
    const totals = getHedgeTotals(summaries, 500000);

    expect(totals.totalProtected).toBe(100000);
    expect(totals.totalExposed).toBe(165000); // 3 BTC * 55000 = 165000
    expect(totals.totalLeveraged).toBe(110000);
    expect(totals.totalBalance).toBe(275000);
    // coverage = (protected − leveraged) / equity = (100000 − 110000) / 500000
    expect(totals.coveragePct).toBeCloseTo(((100000 - 110000) / 500000) * 100, 3); // -2
    expect(totals.totalEquity).toBe(500000);
    expect(totals.protectedOfEquityPct).toBeCloseTo(20, 3);
    expect(totals.exposedOfEquityPct).toBeCloseTo(33, 3);
    expect(totals.inversePositionCount).toBe(2);
    expect(totals.inverseLongCount).toBe(1);
    expect(totals.inverseShortCount).toBe(1);
  });

  it('should handle zero equity and empty summaries', () => {
    const totals = getHedgeTotals([], 0);
    expect(totals.totalProtected).toBe(0);
    expect(totals.totalExposed).toBe(0);
    expect(totals.totalLeveraged).toBe(0);
    expect(totals.coveragePct).toBe(0);
    expect(totals.protectedOfEquityPct).toBe(0);
    expect(totals.exposedOfEquityPct).toBe(0);
    expect(totals.inversePositionCount).toBe(0);
  });

  it('should keep Hedge Coverage ≤ Protected of Equity (leveraged subtracts from protected)', () => {
    // No leveraged longs → coverage equals protected of equity.
    const shortsOnly = getHedgeCoinSummaries([SHORT_BTC], [BTC_BALANCE]);
    const totalsNoLev = getHedgeTotals(shortsOnly, 500000);
    expect(totalsNoLev.coveragePct).toBeCloseTo(totalsNoLev.protectedOfEquityPct, 6); // both = 100000/500000

    // With leveraged longs → coverage drops below protected of equity (negative here).
    const mixed = getHedgeCoinSummaries([SHORT_BTC, LONG_BTC], [BTC_BALANCE]);
    const totalsLev = getHedgeTotals(mixed, 500000);
    expect(totalsLev.protectedOfEquityPct).toBeCloseTo(20, 3);
    expect(totalsLev.coveragePct).toBeCloseTo(-2, 3);
    expect(totalsLev.coveragePct).toBeLessThan(totalsLev.protectedOfEquityPct);
  });

  it('should go negative when only leveraged exposure exists (no hedge to offset it)', () => {
    // Long-only: nothing is protected while leverage is still running → more risk.
    const longOnly = getHedgeCoinSummaries([LONG_BTC], [BTC_BALANCE]);
    const totals = getHedgeTotals(longOnly, 500000);
    expect(totals.totalProtected).toBe(0);
    expect(totals.totalLeveraged).toBe(110000);
    // coverage = (0 − 110000) / 500000 = −22%
    expect(totals.coveragePct).toBeCloseTo(-22, 3);
  });

  it('should preserve Big.js precision on large notional values', () => {
    const bigShort = makePos({
      ...SHORT_BTC,
      id: 'pos-big',
      size: 0.1,
      entryPrice: 99999.99,
      markPrice: 99999.99,
    });
    const bigBal = makeBal({ id: 'conn1-BTC', connectionId: 'conn1', ccy: 'BTC', amount: 100, usdValue: 9999999 });
    const summaries = getHedgeCoinSummaries([bigShort], [bigBal]);
    const totals = getHedgeTotals(summaries, 9999999);

    expect(totals.totalProtected).toBeCloseTo(9999.999, 3);
    expect(totals.totalBalance).toBeCloseTo(9999999, 3);
  });

  it('should correctly calculate Bybit Inverse Short with USD contracts and mark price valuation', () => {
    // User scenario: Bybit BTCUSD Inverse Short with 8800 USD contracts
    // Entry price = 65,132.72, Mark price = 79,996.92
    // Wallet balance = 0.11376289 BTC (~$9,100.68), unrealized PnL = -0.0251045 BTC (-$2,008.28)
    const bybitInversePos = makePos({
      id: 'bybit-inverse-btc',
      connectionId: 'bybit-main',
      exchange: 'bybit',
      symbol: 'BTCUSD',
      baseCoin: 'BTC',
      quoteCoin: 'USD',
      ccy: 'BTC',
      side: 'short',
      size: 8800,
      notionalUsd: 8800,
      entryPrice: 65132.72,
      markPrice: 79996.92,
      unrealizedPnl: -0.0251045,
      instrumentType: 'INVERSE',
    });

    const bybitBalance = makeBal({
      id: 'bybit-main-BTC',
      connectionId: 'bybit-main',
      exchange: 'bybit',
      ccy: 'BTC',
      amount: 0.11376289,
      walletBalance: 0.11376289,
      usdValue: 0.11376289 * 79996.92, // ~$9,100.68
    });

    // In Gross mode (default)
    const grossSummaries = getHedgeCoinSummaries([bybitInversePos], [bybitBalance], 'gross');
    const coinGross = grossSummaries[0];

    expect(coinGross.walletBalance).toBeCloseTo(0.11376289, 8);
    expect(coinGross.walletBalanceUsd).toBeCloseTo(0.11376289 * 79996.92, 2);
    // Protected USD should be the full 8800.00 USD
    expect(coinGross.protectedUsd).toBe(8800);
    // Protected size in BTC at current mark price = 8800 / 79996.92
    expect(coinGross.protectedSize).toBeCloseTo(8800 / 79996.92, 8);
    // Net balance in USD is 8800 + exposed USD ($300.68) = $9,100.68 (0.11376289 BTC)
    expect(coinGross.netBalance).toBeCloseTo(0.11376289, 8);
    expect(coinGross.netBalanceUsd).toBeCloseTo(0.11376289 * 79996.92, 2);
    expect(coinGross.unrealizedPnl).toBeCloseTo(-0.0251045, 7);

    // In Net mode
    const netSummaries = getHedgeCoinSummaries([bybitInversePos], [bybitBalance], 'net');
    const coinNet = netSummaries[0];
    expect(coinNet.balanceUsd).toBeCloseTo(0.11376289 * 79996.92, 2);
    expect(coinNet.protectedUsd).toBe(8800);
    expect(coinNet.netBalance).toBeCloseTo(0.11376289, 8);
  });

  it('should correctly calculate Bitget Inverse Short with mark price converted protected ETH size', () => {
    // Exact user scenario:
    // Bitget ETH Inverse Short:
    // Entry: 2166.09, Mark: 2497.01, Size: 4.42 ETH.
    // Initial / Protected USD: 4.42 * 2166.09 = $9,574.13
    // At mark price ($2,497.01), Protected ETH quantity = 9574.13 / 2497.01 = 3.83424175 ETH
    // Net Balance / Equity = 4.33992764 ETH ($10,835.39)
    // Wallet Balance = 4.92568838 ETH ($12,298.04)
    // Unrealized PnL = -0.58576074 ETH (-$1,462.65)
    const bitgetEthPos = makePos({
      id: 'bitget-eth-pos',
      connectionId: 'bitget-main',
      exchange: 'bitget',
      symbol: 'ETHUSD',
      baseCoin: 'ETH',
      ccy: 'ETH',
      side: 'short',
      size: 4.42,
      entryPrice: 2166.09,
      markPrice: 2497.01,
      unrealizedPnl: -0.58576074,
    });

    const bitgetEthBal = makeBal({
      id: 'bitget-eth-bal',
      connectionId: 'bitget-main',
      exchange: 'bitget',
      ccy: 'ETH',
      amount: 4.33992764,       // Bitget reports net equity in amount
      walletBalance: 4.92568838,
      usdValue: 10835.39,
    });

    const lvl = getHedgePositionLevels(bitgetEthPos, [bitgetEthBal]);
    expect(lvl.initialSizeInCoin).toBe(4.42);
    expect(lvl.protectedUsd).toBeCloseTo(4.42 * 2166.09, 2); // 9574.1178
    expect(lvl.protectedAmount).toBeCloseTo((4.42 * 2166.09) / 2497.01, 4); // 3.8342 ETH

    const summaries = getHedgeCoinSummaries([bitgetEthPos], [bitgetEthBal]);
    const coin = summaries[0];
    expect(coin.protectedUsd).toBeCloseTo(4.42 * 2166.09, 2);
    expect(coin.protectedSize).toBeCloseTo(3.83424175, 4); // 3.8342 ETH
    expect(coin.netProtectedSize).toBeCloseTo(3.83424175, 4); // Real Hedge card
  });
});
