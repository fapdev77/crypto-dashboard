import { describe, it, expect } from 'vitest';
import { BybitTransactionService } from '../BybitTransactionService';
import { BybitTransactionLogEntry } from '../../../types';

function makeMockEntry(overrides: Partial<BybitTransactionLogEntry> = {}): BybitTransactionLogEntry {
  return {
    id: 'mock-id',
    connectionId: 'conn-1',
    exchange: 'bybit',
    label: 'bybit-main',
    rawId: 'raw-1',
    symbol: 'BTCUSDT',
    category: 'linear',
    side: 'Buy',
    transactionTime: 1710000000000,
    type: 'TRADE',
    transSubType: '',
    qty: '0.5',
    size: '0.5',
    currency: 'USDT',
    tradePrice: '65000',
    funding: '0',
    fee: '-15.5',
    cashFlow: '2500',
    change: '2515.5',
    cashBalance: '12500.5',
    feeRate: '0.0006',
    bonusChange: '0',
    tradeId: 'trade-001',
    orderId: 'order-001',
    orderLinkId: '',
    raw: {},
    ...overrides,
  };
}

describe('BybitTransactionService', () => {
  describe('filterEntries', () => {
    const entries = [
      makeMockEntry({ symbol: 'BTCUSDT', type: 'TRADE', currency: 'USDT', category: 'linear', transactionTime: 1710000000000 }),
      makeMockEntry({ id: 'mock-2', symbol: 'ETHUSDT', type: 'SETTLEMENT', currency: 'USDT', category: 'linear', transactionTime: 1710086400000 }),
      makeMockEntry({ id: 'mock-3', symbol: 'SOLUSDT', type: 'TRADE', currency: 'USDT', category: 'linear', transactionTime: 1710172800000, connectionId: 'conn-2' }),
      makeMockEntry({ id: 'mock-4', symbol: 'BTCUSD', type: 'SETTLEMENT', currency: 'BTC', category: 'inverse', transactionTime: 1710259200000 }),
    ];

    it('should return all entries when no filters applied', () => {
      const result = BybitTransactionService.filterEntries(entries, {});
      expect(result).toHaveLength(4);
    });

    it('should filter by search term (symbol)', () => {
      const result = BybitTransactionService.filterEntries(entries, { search: 'BTC' });
      expect(result).toHaveLength(2);
      expect(result.every(e => e.symbol.includes('BTC'))).toBe(true);
    });

    it('should filter by category', () => {
      const result = BybitTransactionService.filterEntries(entries, { category: 'inverse' });
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('inverse');
    });

    it('should filter by type', () => {
      const result = BybitTransactionService.filterEntries(entries, { type: 'SETTLEMENT' });
      expect(result).toHaveLength(2);
      expect(result.every(e => e.type === 'SETTLEMENT')).toBe(true);
    });

    it('should filter by currency', () => {
      const result = BybitTransactionService.filterEntries(entries, { currency: 'BTC' });
      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('BTC');
    });

    it('should filter by accountId', () => {
      const result = BybitTransactionService.filterEntries(entries, { accountId: 'conn-2' });
      expect(result).toHaveLength(1);
      expect(result[0].connectionId).toBe('conn-2');
    });

    it('should filter by time range', () => {
      const result = BybitTransactionService.filterEntries(entries, {
        startTime: 1710086400000,
        endTime: 1710200000000,
      });
      expect(result).toHaveLength(2);
    });

    it('should combine multiple filters', () => {
      const result = BybitTransactionService.filterEntries(entries, {
        type: 'TRADE',
        currency: 'USDT',
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('computeStats', () => {
    it('should compute correct stats for empty list', () => {
      const stats = BybitTransactionService.computeStats([]);
      expect(stats.totalCount).toBe(0);
      expect(stats.typeBreakdown).toEqual({});
      expect(stats.stable.totalFunding).toBe('0');
      expect(stats.stable.totalFees).toBe('0');
      expect(stats.stable.finalBalance).toBe('0');
      expect(stats.perCurrency).toEqual({});
    });

    it('should compute stats correctly', () => {
      const entries = [
        makeMockEntry({ type: 'TRADE', funding: '-2.5', fee: '-15.5', cashFlow: '2500', change: '2515.5', cashBalance: '12500.5', currency: 'USDT' }),
        makeMockEntry({ id: 'mock-2', type: 'TRADE', funding: '1.25', fee: '-6.12', cashFlow: '-1800', change: '-1806.12', cashBalance: '10694.38', currency: 'USDT' }),
        makeMockEntry({ id: 'mock-3', type: 'SETTLEMENT', funding: '-0.85', fee: '0', cashFlow: '0', change: '-0.85', cashBalance: '10693.53', currency: 'USDT' }),
      ];

      const stats = BybitTransactionService.computeStats(entries);

      expect(stats.totalCount).toBe(3);
      expect(stats.typeBreakdown).toEqual({ TRADE: 2, SETTLEMENT: 1 });
      // funding: -2.5 + 1.25 + (-0.85) = -2.1
      expect(stats.stable.totalFunding).toBe('-2.1');
      // fees: -15.5 + (-6.12) + 0 = -21.62
      expect(stats.stable.totalFees).toBe('-21.62');
      // cashFlow: 2500 + (-1800) + 0 = 700
      expect(stats.stable.totalCashFlow).toBe('700');
      // change: 2515.5 + (-1806.12) + (-0.85) = 708.53
      expect(stats.stable.totalChange).toBe('708.53');
      // finalBalance: from most recent entry (first one by default order)
      expect(stats.stable.finalBalance).toBe('12500.5');
      // No per-currency breakdown for this test (all USDT)
      expect(stats.perCurrency).toEqual({});
    });
  });
});
