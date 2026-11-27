import { describe, it, expect } from 'vitest';
import { computeClosedPositionsStats } from '../closedPositionsStats';
import type { UnifiedHistoryPosition } from '../../types';

function makeClosedPos(overrides: Partial<UnifiedHistoryPosition> = {}): UnifiedHistoryPosition {
  return {
    id: 'pos-1',
    connectionId: 'conn-1',
    exchange: 'bybit',
    label: 'Main',
    symbol: 'BTCUSDT',
    baseCoin: 'BTC',
    quoteCoin: 'USDT',
    side: 'long',
    realizedPnl: 100,
    closedPnl: 102,
    closeUpdateTime: 1_700_000_000_000,
    createdTime: 1_699_990_000_000,
    entryPrice: 50000,
    closePrice: 51000,
    size: 0.2, // positionValueUsd = 10,000
    fundingFee: -0.5,
    tradingFee: -1.5,
    leverage: 10, // initialMargin = 1,000
    instrumentType: 'PERP',
    ...overrides,
  };
}

describe('computeClosedPositionsStats', () => {
  it('returns null when positions list is empty', () => {
    expect(computeClosedPositionsStats([])).toBeNull();
  });

  it('computes net/gross PnL, fees, aggregate ROI, PF, edge, R:R, side bias, and cumulative series accurately', () => {
    const positions = [
      // Close time 2: Win Long
      makeClosedPos({
        id: 'p2',
        side: 'long',
        realizedPnl: 150,
        tradingFee: -2,
        fundingFee: 1, // gross = 150 - (-2) - 1 = 151
        size: 0.2,
        entryPrice: 50000, // value = 10,000, lev = 10 -> margin = 1,000
        leverage: 10,
        closeUpdateTime: 2000,
      }),
      // Close time 1: Loss Short
      makeClosedPos({
        id: 'p1',
        side: 'short',
        realizedPnl: -50,
        tradingFee: -3,
        fundingFee: -1, // gross = -50 - (-3) - (-1) = -46
        size: 1,
        entryPrice: 2000, // value = 2,000, lev = 5 -> margin = 400
        leverage: 5,
        closeUpdateTime: 1000,
      }),
      // Close time 3: Win Long
      makeClosedPos({
        id: 'p3',
        side: 'long',
        realizedPnl: 40,
        tradingFee: -1,
        fundingFee: 0, // gross = 41
        size: 0.1,
        entryPrice: 60000, // value = 6,000, lev = 10 -> margin = 600
        leverage: 10,
        closeUpdateTime: 3000,
      }),
    ];

    const stats = computeClosedPositionsStats(positions)!;
    expect(stats).not.toBeNull();
    expect(stats.totalPositions).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.breakevens).toBe(0);
    expect(stats.winRate).toBeCloseTo((2 / 3) * 100, 6);

    // Net & Gross reconciliation
    expect(stats.totalPnl).toBeCloseTo(140, 6); // 150 - 50 + 40
    expect(stats.totalTradeFees).toBeCloseTo(-6, 6);
    expect(stats.totalFundingFees).toBeCloseTo(0, 6);
    expect(stats.totalOperationalCost).toBeCloseTo(-6, 6);
    expect(stats.totalGrossPnl).toBeCloseTo(146, 6); // 151 - 46 + 41
    expect(stats.totalGrossPnl + stats.totalOperationalCost).toBeCloseTo(stats.totalPnl, 6);
    expect(stats.operationalCostPct).toBeCloseTo((6 / 146) * 100, 6);

    // Aggregate ROI: 140 / (1000 + 400 + 600) = 140 / 2000 = 7%
    expect(stats.totalInitialMargin).toBeCloseTo(2000, 6);
    expect(stats.roiPct).toBeCloseTo(7, 6);

    // Profit Factor: (150 + 40) / 50 = 3.8
    expect(stats.profitFactor).toBeCloseTo(3.8, 6);
    // Expectancy (Edge): 140 / 3
    expect(stats.expectancy).toBeCloseTo(140 / 3, 6);
    // Avg W/L & R:R: avgWin = 95, avgLoss = -50 -> R:R = 1.9
    expect(stats.avgWin).toBeCloseTo(95, 6);
    expect(stats.avgLoss).toBeCloseTo(-50, 6);
    expect(stats.riskRewardRatio).toBeCloseTo(1.9, 6);
    expect(stats.largestWin).toBeCloseTo(150, 6);
    expect(stats.largestLoss).toBeCloseTo(-50, 6);

    // Side breakdown: 2 longs (2 wins = 100%), 1 short (0 wins = 0%)
    expect(stats.longs).toBe(2);
    expect(stats.shorts).toBe(1);
    expect(stats.longPct).toBeCloseTo((2 / 3) * 100, 6);
    expect(stats.shortPct).toBeCloseTo((1 / 3) * 100, 6);
    expect(stats.longWinRate).toBeCloseTo(100, 6);
    expect(stats.shortWinRate).toBeCloseTo(0, 6);
    expect(stats.sideBias).toBe('buyer');

    // Sorted chronologically: p1 (-50), p2 (+150 -> 100), p3 (+40 -> 140)
    expect(stats.cumulativePnlSeries).toEqual([0, -50, 100, 140]);
  });

  it('counts breakeven (pnl === 0) trades in totalPositions without distorting Win Rate', () => {
    const stats = computeClosedPositionsStats([
      makeClosedPos({ id: 'w1', realizedPnl: 50 }),
      makeClosedPos({ id: 'b1', realizedPnl: 0, tradingFee: 0, fundingFee: 0 }),
    ])!;

    expect(stats.totalPositions).toBe(2);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.breakevens).toBe(1);
    expect(stats.winRate).toBe(100);
    expect(stats.profitFactor).toBe(Infinity);
    expect(stats.riskRewardRatio).toBeNull();
  });

  it('returns null ROI when no position has valid leverage/margin, and balanced bias on 50/50 split', () => {
    const stats = computeClosedPositionsStats([
      makeClosedPos({ id: 'l1', side: 'long', leverage: 0, raw: {}, realizedPnl: 20 }),
      makeClosedPos({ id: 's1', side: 'short', leverage: undefined, raw: {}, realizedPnl: -10 }),
    ])!;

    expect(stats.roiPct).toBeNull();
    expect(stats.sideBias).toBe('balanced');
    expect(stats.longWinRate).toBe(100);
    expect(stats.shortWinRate).toBe(0);
  });

  it('returns seller bias when shorts >= 55% and handles single position series', () => {
    const stats = computeClosedPositionsStats([
      makeClosedPos({ id: 's1', side: 'short', realizedPnl: -25 }),
    ])!;

    expect(stats.sideBias).toBe('seller');
    expect(stats.longWinRate).toBeNull();
    expect(stats.shortWinRate).toBe(0);
    expect(stats.cumulativePnlSeries).toEqual([0, -25]);
  });

  it('scales INVERSE (COIN-M) position PnL and fees by closePrice into USD', () => {
    const stats = computeClosedPositionsStats([
      makeClosedPos({
        id: 'inv-1',
        exchange: 'bybit',
        instrumentType: 'INVERSE',
        symbol: 'BTCUSD',
        size: 1000, // 1000 USD contracts on Bybit Inverse
        entryPrice: 50000,
        closePrice: 50000,
        realizedPnl: 0.002, // 0.002 BTC = $100
        tradingFee: -0.0001, // -$5
        fundingFee: 0.00002, // +$1
        leverage: 10, // margin = $100
      }),
    ])!;

    expect(stats.totalPnl).toBeCloseTo(100, 6);
    expect(stats.totalTradeFees).toBeCloseTo(-5, 6);
    expect(stats.totalFundingFees).toBeCloseTo(1, 6);
    expect(stats.totalGrossPnl).toBeCloseTo(104, 6);
    expect(stats.roiPct).toBeCloseTo(100, 6);
  });
});
