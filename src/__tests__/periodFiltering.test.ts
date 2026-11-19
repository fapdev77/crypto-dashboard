import { describe, it, expect } from 'vitest';
import { resolvePeriodDateRange } from '../utils/dateTimeHelper';

interface MockTransaction {
  id: string;
  transactionTime: number;
  amount: number;
  currency: string;
}

describe('Period Filtering Integration Logic', () => {
  // Reference date: 2026-10-15 12:00:00
  const refDate = new Date(2026, 9, 15, 12, 0, 0);

  // Generate a collection of transactions across multiple months and years
  const mockTransactions: MockTransaction[] = [
    {
      id: 'tx-last-year',
      transactionTime: new Date(2025, 11, 20, 10, 0, 0).getTime(), // Dec 20, 2025
      amount: 100,
      currency: 'USDT',
    },
    {
      id: 'tx-jan-this-year',
      transactionTime: new Date(2026, 0, 15, 10, 0, 0).getTime(), // Jan 15, 2026
      amount: 200,
      currency: 'USDT',
    },
    {
      id: 'tx-last-month',
      transactionTime: new Date(2026, 8, 28, 23, 59, 0).getTime(), // Sep 28, 2026
      amount: 300,
      currency: 'USDT',
    },
    {
      id: 'tx-mtd-start-boundary',
      transactionTime: new Date(2026, 9, 1, 0, 0, 0, 0).getTime(), // Oct 1, 2026 00:00:00.000
      amount: 400,
      currency: 'USDT',
    },
    {
      id: 'tx-oct-10',
      transactionTime: new Date(2026, 9, 10, 14, 0, 0).getTime(), // Oct 10, 2026
      amount: 500,
      currency: 'USDT',
    },
    {
      id: 'tx-today-early',
      transactionTime: new Date(2026, 9, 15, 2, 30, 0).getTime(), // Oct 15, 2026 02:30:00
      amount: 600,
      currency: 'USDT',
    },
    {
      id: 'tx-today-end-boundary',
      transactionTime: new Date(2026, 9, 15, 23, 59, 59, 999).getTime(), // Oct 15, 2026 23:59:59.999
      amount: 700,
      currency: 'USDT',
    },
    {
      id: 'tx-future-next-month',
      transactionTime: new Date(2026, 10, 1, 10, 0, 0).getTime(), // Nov 1, 2026
      amount: 800,
      currency: 'USDT',
    },
  ];

  function filterTxs(timePeriod: number | string, customStart?: string, customEnd?: string) {
    const { startTime, endTime } = resolvePeriodDateRange(timePeriod, customStart, customEnd, refDate);
    return mockTransactions.filter(tx => {
      if (startTime !== null && tx.transactionTime < startTime) return false;
      if (endTime !== null && tx.transactionTime > endTime) return false;
      return true;
    });
  }

  it('filters by All Time and returns every transaction', () => {
    const res = filterTxs(0);
    expect(res).toHaveLength(mockTransactions.length);
  });

  it('filters by Month-to-Date (MTD) accurately including 1st of month to today', () => {
    const res = filterTxs('mtd');
    const ids = res.map(t => t.id);

    // Should include: tx-mtd-start-boundary (Oct 1), tx-oct-10, tx-today-early, tx-today-end-boundary
    expect(ids).toContain('tx-mtd-start-boundary');
    expect(ids).toContain('tx-oct-10');
    expect(ids).toContain('tx-today-early');
    expect(ids).toContain('tx-today-end-boundary');

    // Should NOT include transactions from previous months or future months
    expect(ids).not.toContain('tx-last-month');
    expect(ids).not.toContain('tx-jan-this-year');
    expect(ids).not.toContain('tx-last-year');
    expect(ids).not.toContain('tx-future-next-month');
    expect(res).toHaveLength(4);
  });

  it('filters by Year-to-Date (YTD) accurately including all 2026 transactions up to today', () => {
    const res = filterTxs('ytd');
    const ids = res.map(t => t.id);

    // Includes Jan 2026, Sep 2026, Oct 2026
    expect(ids).toContain('tx-jan-this-year');
    expect(ids).toContain('tx-last-month');
    expect(ids).toContain('tx-mtd-start-boundary');
    expect(ids).toContain('tx-oct-10');
    expect(ids).toContain('tx-today-early');
    expect(ids).toContain('tx-today-end-boundary');

    // Excludes 2025 and future Nov 2026
    expect(ids).not.toContain('tx-last-year');
    expect(ids).not.toContain('tx-future-next-month');
    expect(res).toHaveLength(6);
  });

  it('filters by Custom Date Range precisely within start and end calendar days', () => {
    // Custom range: 2026-10-05 to 2026-10-12
    const res = filterTxs('custom', '2026-10-05', '2026-10-12');
    const ids = res.map(t => t.id);

    // Only tx-oct-10 falls within Oct 5 00:00:00 and Oct 12 23:59:59.999
    expect(ids).toEqual(['tx-oct-10']);
  });

  it('handles Custom Date Range edge cases where start and end match exactly one day', () => {
    // Single-day custom range: 2026-10-15
    const res = filterTxs('custom', '2026-10-15', '2026-10-15');
    const ids = res.map(t => t.id);

    // Both early and end-boundary transactions on Oct 15 should be captured
    expect(ids).toContain('tx-today-early');
    expect(ids).toContain('tx-today-end-boundary');
    expect(res).toHaveLength(2);
  });

  it('filters by Today preset (24 * 60 * 60 * 1000)', () => {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const res = filterTxs(ONE_DAY_MS);
    const ids = res.map(t => t.id);

    // Today strictly starts at 00:00:00 of Oct 15 and ends at 23:59:59.999
    expect(ids).toContain('tx-today-early');
    expect(ids).toContain('tx-today-end-boundary');
    expect(res).toHaveLength(2);
  });

  it('correctly transitions from Custom Range back to Today or 7 Days without getting stuck', () => {
    // 1. First user applies custom range from Oct 5 to Oct 12
    let activeFilter = {
      timePeriod: 'custom' as number | string,
      customStartDate: '2026-10-05',
      customEndDate: '2026-10-12',
    };
    let res = filterTxs(activeFilter.timePeriod, activeFilter.customStartDate, activeFilter.customEndDate);
    expect(res.map(t => t.id)).toEqual(['tx-oct-10']);

    // 2. User then clicks "Today" (24h)
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    // Even if state had lingering custom dates or if custom dates are cleared
    res = filterTxs(ONE_DAY_MS, activeFilter.customStartDate, activeFilter.customEndDate);
    expect(res.map(t => t.id)).toEqual(['tx-today-early', 'tx-today-end-boundary']);

    // 3. User then clicks "7 Days"
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    res = filterTxs(SEVEN_DAYS_MS, activeFilter.customStartDate, activeFilter.customEndDate);
    const ids7d = res.map(t => t.id);
    expect(ids7d).toContain('tx-oct-10');
    expect(ids7d).toContain('tx-today-early');
    expect(ids7d).toContain('tx-today-end-boundary');
    expect(ids7d).not.toContain('tx-mtd-start-boundary'); // Oct 1 is 14 days ago from Oct 15
  });
});
