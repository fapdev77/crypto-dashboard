import { describe, it, expect } from 'vitest';
import type {
  BybitTransactionLogEntry,
  BitgetTransactionLogEntry,
  OkxTransactionLogEntry,
} from '../../types';
import {
  normalizeAllPerformanceEntries,
  scopePerformanceEntries,
  computePortfolioPerformance,
  defaultPerformanceFilters,
  extractBaseAsset,
  getDenominationDecimals,
  type PortfolioPerformanceFilters,
} from '../portfolioPerformanceEngine';

function makeBybit(overrides: Partial<BybitTransactionLogEntry> = {}): BybitTransactionLogEntry {
  return {
    id: `bybit-${Math.random()}`,
    connectionId: 'bybit-1',
    exchange: 'bybit',
    label: 'Bybit Main',
    rawId: '1',
    symbol: 'BTCUSDT',
    category: 'linear',
    side: 'Buy',
    transactionTime: Date.UTC(2026, 4, 10, 12, 0, 0),
    type: 'TRADE',
    transSubType: '',
    qty: '1',
    size: '1',
    currency: 'USDT',
    tradePrice: '65000',
    funding: '0',
    fee: '0',
    cashFlow: '0',
    change: '0',
    cashBalance: '1000',
    feeRate: '0',
    bonusChange: '0',
    tradeId: '',
    orderId: '',
    orderLinkId: '',
    raw: {},
    ...overrides,
  };
}

function makeBitget(overrides: Partial<BitgetTransactionLogEntry> = {}): BitgetTransactionLogEntry {
  return {
    id: `bitget-${Math.random()}`,
    connectionId: 'bitget-1',
    exchange: 'bitget',
    label: 'Bitget Main',
    rawId: '1',
    symbol: 'BTCUSDT',
    category: 'USDT-FUTURES',
    side: 'Buy',
    transactionTime: Date.UTC(2026, 4, 10, 12, 0, 0),
    type: 'TRADE',
    currency: 'USDT',
    tradePrice: '65000',
    funding: '0',
    fee: '0',
    cashFlow: '0',
    change: '0',
    cashBalance: '500',
    raw: {},
    ...overrides,
  };
}

function makeOkx(overrides: Partial<OkxTransactionLogEntry> = {}): OkxTransactionLogEntry {
  return {
    id: `okx-${Math.random()}`,
    connectionId: 'okx-1',
    exchange: 'okx',
    label: 'OKX Main',
    rawId: '1',
    symbol: 'BTC-USDT-SWAP',
    category: 'SWAP',
    side: 'Buy',
    transactionTime: Date.UTC(2026, 4, 10, 12, 0, 0),
    type: 'Trade',
    currency: 'USDT',
    tradePrice: '65000',
    funding: '0',
    fee: '0',
    cashFlow: '0',
    change: '0',
    cashBalance: '300',
    raw: {},
    ...overrides,
  };
}

function makeFilters(overrides: Partial<PortfolioPerformanceFilters> = {}): PortfolioPerformanceFilters {
  return {
    ...defaultPerformanceFilters,
    denomination: 'USD',
    timePeriod: 0,
    ...overrides,
  };
}

describe('portfolioPerformanceEngine', () => {
  it('reconstructs multi-account and multi-exchange balances including quiet accounts outside window', () => {
    const tOld = Date.UTC(2026, 4, 1, 10, 0, 0);
    const tIn1 = Date.UTC(2026, 4, 10, 10, 0, 0);
    const tIn2 = Date.UTC(2026, 4, 11, 10, 0, 0);

    // Account 2 (Bitget) operated before the 7-day window and stayed quiet during [May 8..May 15]
    // Account 1 (Bybit) deposited 200 USDT before, started window with 1000 USDT, earned +100 USDT net
    const bybitEntries = [
      makeBybit({
        connectionId: 'bybit-1',
        transactionTime: tOld,
        type: 'TRANSFER_IN',
        side: 'None',
        change: '1000',
        cashBalance: '1000',
      }),
      makeBybit({
        connectionId: 'bybit-1',
        transactionTime: tIn1,
        type: 'TRADE',
        side: 'Buy',
        cashFlow: '120',
        fee: '10',
        change: '110',
        cashBalance: '1110',
      }),
      makeBybit({
        connectionId: 'bybit-1',
        transactionTime: tIn2,
        type: 'SETTLEMENT',
        side: 'None',
        funding: '-10',
        change: '-10',
        cashBalance: '1100',
      }),
    ];

    const bitgetEntries = [
      makeBitget({
        connectionId: 'bitget-1',
        transactionTime: tOld,
        type: 'TRANSFER_IN',
        side: 'None',
        change: '500',
        cashBalance: '500',
      }),
    ];

    const unified = normalizeAllPerformanceEntries({ bybitEntries, bitgetEntries, okxEntries: [] });
    const filters = makeFilters({ denomination: 'USD', timePeriod: 'custom', customStartDate: '2026-05-08', customEndDate: '2026-05-15' });
    const { scopedUpToEnd, periodEntries } = scopePerformanceEntries(unified, filters, {
      startTime: Date.UTC(2026, 4, 8, 0, 0, 0),
      endTime: Date.UTC(2026, 4, 15, 23, 59, 59, 999),
    });

    const result = computePortfolioPerformance({
      scopedUpToEnd,
      periodEntries,
      filters,
      tokenRates: {},
      fiatRates: {},
    });

    // Final: Bybit 1100 + Bitget 500 = 1600
    // Initial: 1600 - 100 = 1500 (quiet Bitget wallet carries forward!)
    expect(result.primaryResult.finalBalance).toBe('1600.00');
    expect(result.primaryResult.initialBalance).toBe('1500.00');
    expect(result.primaryResult.absoluteGain).toBe('100.00');
    expect(result.primaryResult.percentageGain).toBeCloseTo((100 / 1500) * 100, 4);
  });

  it('includes LIQUIDATION, DELIVERY, INTEREST, REWARDS, and standalone FEE/SETTLEMENT residuals cleanly', () => {
    const t0 = Date.UTC(2026, 4, 10, 0, 0, 0);
    const bybitEntries = [
      makeBybit({ transactionTime: t0 + 1000, type: 'TRADE', side: 'Buy', cashFlow: '100', fee: '5', change: '95', cashBalance: '1095' }),
      makeBybit({ transactionTime: t0 + 2000, type: 'LIQUIDATION', side: 'Sell', change: '-40', cashBalance: '1055' }),
      makeBybit({ transactionTime: t0 + 3000, type: 'DELIVERY', side: 'None', change: '15', cashBalance: '1070' }),
      makeBybit({ transactionTime: t0 + 4000, type: 'BONUS', side: 'None', change: '10', cashBalance: '1080' }),
      // Compound USDC Perp SETTLEMENT carrying both cashFlow (+25) and funding (-5) => change +20
      makeBybit({
        transactionTime: t0 + 5000,
        type: 'SETTLEMENT',
        side: 'None',
        currency: 'USDC',
        cashFlow: '25',
        funding: '-5',
        change: '20',
        cashBalance: '1100',
      }),
    ];
    const okxEntries = [
      makeOkx({ transactionTime: t0 + 6000, type: 'Interest deduction', side: 'None', change: '-2', cashFlow: '-2', cashBalance: '298' }),
      makeOkx({ transactionTime: t0 + 7000, type: 'FEE_DEDUCTION', side: 'None', change: '-3', cashFlow: '-3', cashBalance: '295' }),
    ];

    const unified = normalizeAllPerformanceEntries({ bybitEntries, bitgetEntries: [], okxEntries });
    const filters = makeFilters({ denomination: 'USD' });
    const { scopedUpToEnd, periodEntries } = scopePerformanceEntries(unified, filters, { startTime: null, endTime: null });

    const res = computePortfolioPerformance({
      scopedUpToEnd,
      periodEntries,
      filters,
      tokenRates: {},
      fiatRates: {},
    });

    // Net Trading: +95 (trade) + +25 (compound settlement cashFlow) = +120
    expect(res.operations.netTradingPnl).toBe('120.00');
    // Net Funding: -5
    expect(res.operations.netFunding).toBe('-5.00');
    // Other operational: -40 (Liq) + 15 (Deliv) + 10 (Rewards) - 2 (Interest) - 3 (Fee) = -20
    expect(res.operations.otherOperational?.net).toBe('-20.00');
    expect(res.operations.otherOperational?.liquidationNet).toBe('-40.00');
    expect(res.operations.otherOperational?.deliveryNet).toBe('15.00');
    expect(res.operations.otherOperational?.rewardsNet).toBe('10.00');
    expect(res.operations.otherOperational?.interestNet).toBe('-2.00');
    expect(res.operations.otherOperational?.otherFeesNet).toBe('-3.00');
    expect(res.operations.otherOperational?.count).toBe(5);
    // Total operational gain = 120 - 5 - 20 = 95
    expect(res.primaryResult.absoluteGain).toBe('95.00');
  });

  it('correctly classifies generic TRANSFER with negative change as outflow and isolates live spot swaps', () => {
    const t0 = Date.UTC(2026, 4, 10, 8, 0, 0);
    const bybitEntries = [
      makeBybit({ transactionTime: t0, type: 'TRANSFER', side: 'None', change: '500', cashBalance: '500' }),
      makeBybit({ transactionTime: t0 + 1000, type: 'TRANSFER', side: 'None', change: '-200', cashBalance: '300' }),
      // Live spot swap must not be booked as trading loss/gain or external deposit
      makeBybit({
        transactionTime: t0 + 2000,
        category: 'spot',
        type: 'TRADE',
        symbol: 'ETHUSDT',
        currency: 'USDT',
        side: 'Buy',
        change: '-100',
        cashFlow: '-100',
        fee: '0.1',
        cashBalance: '200',
        raw: { mockData: false },
      }),
    ];

    const unified = normalizeAllPerformanceEntries({ bybitEntries, bitgetEntries: [], okxEntries: [] });
    const filters = makeFilters({ denomination: 'USD' });
    const { scopedUpToEnd, periodEntries } = scopePerformanceEntries(unified, filters, { startTime: null, endTime: null });

    const res = computePortfolioPerformance({
      scopedUpToEnd,
      periodEntries,
      filters,
      tokenRates: {},
      fiatRates: {},
    });

    expect(res.primaryResult.depositsInPeriod).toBe('500.00');
    expect(res.primaryResult.withdrawalsInPeriod).toBe('200.00');
    expect(res.operations.totalTrades).toBe(0);
    expect(res.primaryResult.absoluteGain).toBe('0.00');
    // Final (200) - Gain (0) - Inflow (500) + Outflow (300) = Initial (0)
    expect(res.primaryResult.initialBalance).toBe('0.00');
  });

  it('normalizes Bitget/OKX negative fees, OKX cashFlow === balChg, and sets feeStatus=High when grossCashFlow <= 0', () => {
    const t0 = Date.UTC(2026, 4, 10, 12, 0, 0);
    // OKX adapter copies net change (-105) into cashFlow while fee = -5 -> gross = -100, feeCost = +5
    const okxEntries = [
      makeOkx({
        transactionTime: t0,
        type: 'Trade',
        side: 'Sell',
        fee: '-5',
        cashFlow: '-105',
        change: '-105',
        cashBalance: '895',
      }),
    ];
    // Bitget negative fee = -3 on winning trade: cashFlow = 20, fee = -3, net change = 17
    const bitgetEntries = [
      makeBitget({
        transactionTime: t0 + 1000,
        type: 'TRADE',
        side: 'Buy',
        fee: '-3',
        cashFlow: '20',
        change: '17',
        cashBalance: '517',
      }),
    ];

    // Check High status when grossCashFlow <= 0 and feesPaid > 0 (OKX only)
    const unifiedLoss = normalizeAllPerformanceEntries({ bybitEntries: [], bitgetEntries: [], okxEntries });
    const filters = makeFilters({ denomination: 'USD' });
    const scopedLoss = scopePerformanceEntries(unifiedLoss, filters, { startTime: null, endTime: null });
    const resLoss = computePortfolioPerformance({ ...scopedLoss, filters, tokenRates: {}, fiatRates: {} });

    expect(resLoss.operations.feesPaid).toBe('5.00');
    expect(resLoss.operations.grossCashFlow).toBe('0.00');
    expect(resLoss.operations.feeCostPct).toBe(100);
    expect(resLoss.operations.feeStatus).toBe('High');

    // Combined OKX + Bitget fees: 5 + 3 = 8, gross positive flow = 20 -> 8/20 = 40% (High)
    const unifiedCombined = normalizeAllPerformanceEntries({ bybitEntries: [], bitgetEntries, okxEntries });
    const scopedCombined = scopePerformanceEntries(unifiedCombined, filters, { startTime: null, endTime: null });
    const resCombined = computePortfolioPerformance({ ...scopedCombined, filters, tokenRates: {}, fiatRates: {} });

    expect(resCombined.operations.feesPaid).toBe('8.00');
    expect(resCombined.operations.grossCashFlow).toBe('20.00');
  });

  it('separates Price Milestones by reference asset using consolidated multi-account equity', () => {
    const t0 = Date.UTC(2026, 4, 10, 9, 0, 0);
    const bybitEntries = [
      makeBybit({
        connectionId: 'bybit-1',
        symbol: 'BTCUSDT',
        tradePrice: '65100',
        transactionTime: t0,
        cashFlow: '50',
        fee: '0',
        change: '50',
        cashBalance: '1050',
      }),
      makeBybit({
        connectionId: 'bybit-1',
        symbol: 'SOLUSDT',
        tradePrice: '150',
        transactionTime: t0 + 1000,
        cashFlow: '30',
        fee: '0',
        change: '30',
        cashBalance: '1080',
      }),
      makeBybit({
        connectionId: 'bybit-1',
        symbol: 'BTC-USDT-SWAP',
        tradePrice: '64900',
        transactionTime: t0 + 2000,
        cashFlow: '20',
        fee: '0',
        change: '20',
        cashBalance: '1100',
      }),
    ];
    const bitgetEntries = [
      makeBitget({
        connectionId: 'bitget-1',
        symbol: 'ETHUSDT',
        tradePrice: '3200',
        transactionTime: t0 + 500,
        cashFlow: '100',
        fee: '0',
        change: '100',
        cashBalance: '600',
      }),
    ];

    const unified = normalizeAllPerformanceEntries({ bybitEntries, bitgetEntries, okxEntries: [] });
    const filters = makeFilters({ denomination: 'USD', milestoneAsset: 'BTC', milestoneStep: 2500 });
    const scoped = scopePerformanceEntries(unified, filters, { startTime: null, endTime: null });
    const res = computePortfolioPerformance({ ...scoped, filters, tokenRates: {}, fiatRates: {} });

    expect(res.resolvedMilestoneAsset).toBe('BTC');
    expect(res.availableMilestoneAssets).toContain('BTC');
    expect(res.availableMilestoneAssets).toContain('SOL');
    expect(res.availableMilestoneAssets).toContain('ETH');

    // Only BTC trades map to $65,000 milestone (not SOL $150 or ETH $3,200)
    expect(res.priceMilestones).toHaveLength(1);
    expect(res.priceMilestones[0].milestonePrice).toBe(65000);
    expect(res.priceMilestones[0].passages).toBe(2);
    // At t0: bybit=1050 + bitget initial=500 -> 1550
    // At t0+2000: bybit=1100 + bitget=600 -> 1700
    expect(res.priceMilestones[0].firstPassageEquity).toBe(1550);
    expect(res.priceMilestones[0].lastPassageEquity).toBe(1700);
    expect(res.priceMilestones[0].gainLoss).toBe(150);
  });

  it('groups temporal buckets strictly in UTC and keeps 8 decimals for crypto vs 2 for USD', () => {
    expect(extractBaseAsset('BTC-USDT-SWAP')).toBe('BTC');
    expect(extractBaseAsset('SOLUSDT_UMCBL')).toBe('SOL');
    expect(getDenominationDecimals('USD')).toBe(2);
    expect(getDenominationDecimals('USDT')).toBe(2);
    expect(getDenominationDecimals('BTC')).toBe(8);
    expect(getDenominationDecimals('ETH')).toBe(8);

    // 2026-05-11 is Monday in UTC. Put a trade at 23:55 UTC (20:00-23:59) and one on Tuesday 00:05 UTC (00:00-03:59).
    const monLate = Date.UTC(2026, 4, 11, 23, 55, 0);
    const tueEarly = Date.UTC(2026, 4, 12, 0, 5, 0);
    const wedTransferOnly = Date.UTC(2026, 4, 13, 10, 0, 0);

    const bybitEntries = [
      makeBybit({
        currency: 'BTC',
        transactionTime: monLate,
        type: 'TRADE',
        side: 'Buy',
        cashFlow: '0.00001234',
        fee: '0',
        change: '0.00001234',
        cashBalance: '1.00001234',
      }),
      makeBybit({
        currency: 'BTC',
        transactionTime: tueEarly,
        type: 'TRADE',
        side: 'Sell',
        cashFlow: '-0.00000234',
        fee: '0',
        change: '-0.00000234',
        cashBalance: '1.00001000',
      }),
      makeBybit({
        currency: 'BTC',
        transactionTime: wedTransferOnly,
        type: 'DEPOSIT',
        side: 'None',
        change: '0.50000000',
        cashBalance: '1.50001000',
      }),
    ];

    const unified = normalizeAllPerformanceEntries({ bybitEntries, bitgetEntries: [], okxEntries: [] });
    const filters = makeFilters({ denomination: 'BTC' });
    const scoped = scopePerformanceEntries(unified, filters, { startTime: null, endTime: null });
    const res = computePortfolioPerformance({ ...scoped, filters, tokenRates: {}, fiatRates: {} });

    // 8-decimal preservation (never collapsed to 0.0000)
    expect(res.primaryResult.absoluteGain).toBe('0.00001000');

    // Transfer-only Wednesday excluded from evaluated operational days
    expect(res.advancedMetrics.totalDaysEvaluated).toBe(2);
    expect(res.advancedMetrics.positiveDaysCount).toBe(1);
    expect(res.advancedMetrics.winRate).toBe(50);

    const monday = res.dayOfWeek.list.find((d) => d.dayName === 'Monday');
    const tuesday = res.dayOfWeek.list.find((d) => d.dayName === 'Tuesday');
    expect(monday?.totalGain).toBeCloseTo(0.00001234, 8);
    expect(tuesday?.totalGain).toBeCloseTo(-0.00000234, 8);

    const bucket20_24 = res.timeOfDay.list.find((t) => t.periodLabel === '20:00 - 23:59');
    const bucket00_04 = res.timeOfDay.list.find((t) => t.periodLabel === '00:00 - 03:59');
    expect(bucket20_24?.trades).toBe(1);
    expect(bucket00_04?.trades).toBe(1);
  });
});
