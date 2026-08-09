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

  describe('computeRealPnL', () => {
    it('should return empty object for empty entries', () => {
      const result = BybitTransactionService.computeRealPnL([]);
      expect(result).toEqual({});
    });

    it('should return empty object when entries have no symbol', () => {
      const entries = [
        makeMockEntry({ symbol: '', cashFlow: '500' }),
        makeMockEntry({ id: 'mock-no-sym', symbol: '', cashFlow: '300' }),
      ];
      const result = BybitTransactionService.computeRealPnL(entries);
      expect(result).toEqual({});
    });

    it('should skip non-relevant types (BONUS, TRANSFER, SPOT)', () => {
      const entries = [
        makeMockEntry({ symbol: 'BTCUSDT', type: 'TRADE', cashFlow: '1000' }),
        makeMockEntry({ id: 'mock-2', symbol: 'BTCUSDT', type: 'BONUS', cashFlow: '500' }),
        makeMockEntry({ id: 'mock-3', symbol: 'BTCUSDT', type: 'TRANSFER', cashFlow: '200' }),
        makeMockEntry({ id: 'mock-4', symbol: 'BTCUSDT', type: 'SPOT', cashFlow: '300' }),
      ];
      const result = BybitTransactionService.computeRealPnL(entries);
      // Only TRADE should be included
      expect(result).toEqual({ BTCUSDT: '1000' });
    });

    it('should aggregate cashFlow by symbol for relevant types', () => {
      const entries = [
        makeMockEntry({ symbol: 'BTCUSDT', type: 'TRADE', cashFlow: '2500' }),
        makeMockEntry({ id: 'mock-2', symbol: 'ETHUSDT', type: 'TRADE', cashFlow: '-1200' }),
        makeMockEntry({ id: 'mock-3', symbol: 'BTCUSDT', type: 'TRADE', cashFlow: '800' }),
        makeMockEntry({ id: 'mock-4', symbol: 'SOLUSDT', type: 'SETTLEMENT', cashFlow: '350' }),
      ];
      const result = BybitTransactionService.computeRealPnL(entries);
      // BTCUSDT: 2500 + 800 = 3300
      // ETHUSDT: -1200
      // SOLUSDT: 350
      expect(result).toEqual({
        BTCUSDT: '3300',
        ETHUSDT: '-1200',
        SOLUSDT: '350',
      });
    });

    it('should include SETTLEMENT, LIQUIDATION, DELIVERY as relevant types', () => {
      const entries = [
        makeMockEntry({ symbol: 'BTCUSDT', type: 'TRADE', cashFlow: '1000' }),
        makeMockEntry({ id: 'mock-2', symbol: 'ETHUSDT', type: 'SETTLEMENT', cashFlow: '500' }),
        makeMockEntry({ id: 'mock-3', symbol: 'SOLUSDT', type: 'LIQUIDATION', cashFlow: '-2000' }),
        makeMockEntry({ id: 'mock-4', symbol: 'DOGEUSDT', type: 'DELIVERY', cashFlow: '150' }),
      ];
      const result = BybitTransactionService.computeRealPnL(entries);
      expect(result).toEqual({
        BTCUSDT: '1000',
        ETHUSDT: '500',
        SOLUSDT: '-2000',
        DOGEUSDT: '150',
      });
    });

    it('should filter by startTime correctly', () => {
      const entries = [
        makeMockEntry({ symbol: 'BTCUSDT', cashFlow: '1000', transactionTime: 1000 }),
        makeMockEntry({ id: 'mock-2', symbol: 'BTCUSDT', cashFlow: '2000', transactionTime: 2000 }),
        makeMockEntry({ id: 'mock-3', symbol: 'BTCUSDT', cashFlow: '3000', transactionTime: 3000 }),
      ];
      const result = BybitTransactionService.computeRealPnL(entries, 2000);
      // Only entries at time >= 2000: 2000 + 3000 = 5000
      expect(result).toEqual({ BTCUSDT: '5000' });
    });

    it('should filter by endTime correctly', () => {
      const entries = [
        makeMockEntry({ symbol: 'BTCUSDT', cashFlow: '1000', transactionTime: 1000 }),
        makeMockEntry({ id: 'mock-2', symbol: 'BTCUSDT', cashFlow: '2000', transactionTime: 2000 }),
        makeMockEntry({ id: 'mock-3', symbol: 'BTCUSDT', cashFlow: '3000', transactionTime: 3000 }),
      ];
      const result = BybitTransactionService.computeRealPnL(entries, undefined, 2000);
      // Only entries at time <= 2000: 1000 + 2000 = 3000
      expect(result).toEqual({ BTCUSDT: '3000' });
    });

    it('should filter by both startTime and endTime', () => {
      const entries = [
        makeMockEntry({ symbol: 'BTCUSDT', cashFlow: '1000', transactionTime: 1000 }),
        makeMockEntry({ id: 'mock-2', symbol: 'BTCUSDT', cashFlow: '2000', transactionTime: 2000 }),
        makeMockEntry({ id: 'mock-3', symbol: 'BTCUSDT', cashFlow: '3000', transactionTime: 3000 }),
        makeMockEntry({ id: 'mock-4', symbol: 'BTCUSDT', cashFlow: '4000', transactionTime: 4000 }),
      ];
      const result = BybitTransactionService.computeRealPnL(entries, 2000, 3500);
      // Only entries at time between 2000 and 3500: 2000 + 3000 = 5000
      expect(result).toEqual({ BTCUSDT: '5000' });
    });

    it('should handle negative cashFlow values', () => {
      const entries = [
        makeMockEntry({ symbol: 'BTCUSDT', cashFlow: '-500' }),
        makeMockEntry({ id: 'mock-2', symbol: 'BTCUSDT', cashFlow: '200' }),
      ];
      const result = BybitTransactionService.computeRealPnL(entries);
      expect(result).toEqual({ BTCUSDT: '-300' });
    });

    it('should handle zero cashFlow values', () => {
      const entries = [
        makeMockEntry({ symbol: 'BTCUSDT', cashFlow: '0' }),
        makeMockEntry({ id: 'mock-2', symbol: 'ETHUSDT', cashFlow: '500' }),
      ];
      const result = BybitTransactionService.computeRealPnL(entries);
      expect(result).toEqual({
        BTCUSDT: '0',
        ETHUSDT: '500',
      });
    });

    it('should handle large numbers without precision loss', () => {
      const entries = [
        makeMockEntry({ symbol: 'BTCUSDT', cashFlow: '123456789.123456789' }),
        makeMockEntry({ id: 'mock-2', symbol: 'BTCUSDT', cashFlow: '0.000000001' }),
      ];
      const result = BybitTransactionService.computeRealPnL(entries);
      expect(result).toEqual({ BTCUSDT: '123456789.12345679' });
    });

    it('should handle multiple symbols with mixed relevant/irrelevant types and time filter', () => {
      const entries = [
        // Relevant, within time range
        makeMockEntry({ symbol: 'BTCUSDT', type: 'TRADE', cashFlow: '1000', transactionTime: 1500 }),
        // Relevant, before startTime — excluded
        makeMockEntry({ id: 'mock-2', symbol: 'BTCUSDT', type: 'TRADE', cashFlow: '2000', transactionTime: 500 }),
        // Irrelevant type — excluded even if within range
        makeMockEntry({ id: 'mock-3', symbol: 'BTCUSDT', type: 'BONUS', cashFlow: '3000', transactionTime: 1500 }),
        // Relevant, different symbol
        makeMockEntry({ id: 'mock-4', symbol: 'ETHUSDT', type: 'SETTLEMENT', cashFlow: '400', transactionTime: 2500 }),
        // No symbol — excluded
        makeMockEntry({ id: 'mock-5', symbol: '', type: 'TRADE', cashFlow: '5000', transactionTime: 1500 }),
      ];
      const result = BybitTransactionService.computeRealPnL(entries, 1000, 3000);
      expect(result).toEqual({
        BTCUSDT: '1000',
        ETHUSDT: '400',
      });
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

    it('should exclude TRANSFER, TRANSFER_IN, and TRANSFER_OUT from totalChange and totalCashFlow but include in finalBalance', () => {
      const entries = [
        makeMockEntry({ id: 'tx-1', type: 'TRANSFER_IN', funding: '0', fee: '0', cashFlow: '100', change: '100', cashBalance: '100', currency: 'NEAR', transactionTime: 1710000000000 }),
        makeMockEntry({ id: 'tx-2', type: 'TRADE', funding: '0', fee: '-1', cashFlow: '5', change: '5', cashBalance: '104', currency: 'NEAR', transactionTime: 1710000001000 }),
        makeMockEntry({ id: 'tx-3', type: 'TRANSFER_OUT', funding: '0', fee: '0', cashFlow: '-20', change: '-20', cashBalance: '84', currency: 'NEAR', transactionTime: 1710000002000 }),
      ];

      const stats = BybitTransactionService.computeStats(entries);

      expect(stats.totalCount).toBe(3);
      expect(stats.typeBreakdown).toEqual({ TRANSFER_IN: 1, TRADE: 1, TRANSFER_OUT: 1 });
      
      const nearStats = stats.perCurrency.NEAR;
      expect(nearStats).toBeDefined();
      
      // Fees paid: -1
      expect(nearStats.totalFees).toBe('-1');
      // Only the TRADE's change (5) is added to totalChange (excluding TRANSFER_IN of 100 and TRANSFER_OUT of -20)
      expect(nearStats.totalChange).toBe('5');
      // Only the TRADE's cashFlow (5) is added to totalCashFlow (excluding TRANSFER_IN of 100 and TRANSFER_OUT of -20)
      expect(nearStats.totalCashFlow).toBe('5');
      // The final balance matches the latest entry's balance
      expect(nearStats.finalBalance).toBe('84');
    });
  });
});
