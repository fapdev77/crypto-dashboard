import { describe, it, expect } from 'vitest';
import { getConsolidatedMetric, feeDisplaySign } from '../consolidatedTotals';
import type { ConsolidatedStats, CurrencyStats } from '../../hooks/useConsolidatedTransactions';

const currencyStats = (overrides: Partial<CurrencyStats> = {}): CurrencyStats => ({
  totalFunding: '0',
  totalFees: '0',
  totalCashFlow: '0',
  totalChange: '0',
  finalBalance: '0',
  totalInflow: '0',
  totalOutflow: '0',
  initialBalance: '0',
  percentageChange: 0,
  ...overrides,
});

const block = (overrides: Partial<CurrencyStats>, totalCount = 10) => ({
  totalCount,
  typeBreakdown: { TRADE: totalCount },
  stable: currencyStats(),
  perCurrency: {},
  aggregatedUsd: currencyStats(overrides),
  missingRates: [],
});

const buildStats = (
  bybit: Partial<CurrencyStats>,
  bitget: Partial<CurrencyStats>,
  okx: Partial<CurrencyStats>
): ConsolidatedStats => ({
  totalCount: 30,
  typeBreakdown: { TRADE: 30 },
  stable: currencyStats(),
  perCurrency: {},
  aggregatedUsd: currencyStats(),
  missingRates: [],
  byExchange: {
    bybit: block(bybit),
    bitget: block(bitget),
    okx: block(okx),
  },
});

describe('getConsolidatedMetric', () => {
  it('sums fees across venues without cancelling magnitudes (the card/modal bug)', () => {
    // Canonical convention: every venue reports paid fees as positive.
    // Before the fix the raw venues had mixed signs (+89.01 / -65.57 / -58.56),
    // so |sum| = 35.12 while the correct total was 213.14.
    const stats = buildStats(
      { totalFees: '89.01' },
      { totalFees: '65.57' },
      { totalFees: '58.56' }
    );

    const fees = getConsolidatedMetric(stats, 'fees');
    expect(fees.grandTotal).toBe('213.14');
    expect(fees.rows.map(r => r.exchange)).toEqual(['bybit', 'bitget', 'okx']);
  });

  it('nets a genuine rebate instead of ignoring it', () => {
    const stats = buildStats(
      { totalFees: '100' },
      { totalFees: '-30' },
      { totalFees: '0' }
    );

    expect(getConsolidatedMetric(stats, 'fees').grandTotal).toBe('70');
  });

  it('skips exchanges without transactions in the filtered window', () => {
    const stats = buildStats({ totalChange: '10' }, { totalChange: '5' }, { totalChange: '999' });
    stats.byExchange.okx.totalCount = 0;

    const netChange = getConsolidatedMetric(stats, 'netchange');
    expect(netChange.grandTotal).toBe('15');
    expect(netChange.rows).toHaveLength(2);
  });

  it('reads the matching aggregated field per metric', () => {
    const stats = buildStats(
      { totalFunding: '1.5', totalFees: '2', finalBalance: '100', totalChange: '3' },
      { totalFunding: '0.5', totalFees: '1', finalBalance: '200', totalChange: '-1' },
      { totalFunding: '0', totalFees: '0.5', finalBalance: '300', totalChange: '2' }
    );

    expect(getConsolidatedMetric(stats, 'funding').grandTotal).toBe('2');
    expect(getConsolidatedMetric(stats, 'balance').grandTotal).toBe('600');
    expect(getConsolidatedMetric(stats, 'netchange').grandTotal).toBe('4');
  });
});

describe('feeDisplaySign', () => {
  it('shows paid fees with a minus and rebates with a plus', () => {
    expect(feeDisplaySign('12.5')).toBe('-');
    expect(feeDisplaySign('-3')).toBe('+');
    expect(feeDisplaySign('0')).toBe('');
  });
});
