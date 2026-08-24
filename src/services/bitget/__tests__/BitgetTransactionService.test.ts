import { describe, it, expect } from 'vitest';
import { BitgetTransactionService } from '../BitgetTransactionService';
import { BitgetTransactionLogEntry } from '../../../types';

function makeMockBitgetEntry(overrides: Partial<BitgetTransactionLogEntry> = {}): BitgetTransactionLogEntry {
  return {
    id: 'bg-mock-1',
    connectionId: 'conn-bg-1',
    exchange: 'bitget',
    label: 'bitget-main',
    rawId: 'raw-bg-1',
    symbol: 'BTCUSDT',
    category: 'usdt-futures',
    side: 'Buy',
    transactionTime: 1710000000000,
    type: 'TRADE',
    currency: 'USDT',
    amount: '100',
    fee: '-0.06',
    cashFlow: '100',
    change: '100',
    balance: '5000',
    tradeId: 'bg-tr-001',
    orderId: 'bg-ord-001',
    raw: {},
    ...overrides,
  };
}

describe('BitgetTransactionService', () => {
  describe('filterEntries', () => {
    const entries = [
      makeMockBitgetEntry({ symbol: 'BTCUSDT', type: 'TRADE', currency: 'USDT', category: 'usdt-futures', transactionTime: 1710000000000 }),
      makeMockBitgetEntry({ id: 'bg-2', symbol: 'ETHUSDT', type: 'CONTRACT_MAIN_SETTLE_FEE', currency: 'USDT', category: 'usdt-futures', transactionTime: 1710086400000 }),
      makeMockBitgetEntry({ id: 'bg-3', symbol: 'SOLUSDT', type: 'TRANS_FROM_EXCHANGE', currency: 'USDT', category: 'spot', transactionTime: 1710172800000, connectionId: 'conn-bg-2' }),
      makeMockBitgetEntry({ id: 'bg-4', symbol: 'BTCUSD', type: 'OPEN_LONG', currency: 'BTC', category: 'coin-futures', transactionTime: 1710259200000 }),
    ];

    it('should return all entries when no filters applied', () => {
      const result = BitgetTransactionService.filterEntries(entries, {});
      expect(result).toHaveLength(4);
    });

    it('should filter by search term', () => {
      const result = BitgetTransactionService.filterEntries(entries, { search: 'BTC' });
      expect(result).toHaveLength(2);
    });

    it('should filter by category', () => {
      const result = BitgetTransactionService.filterEntries(entries, { category: 'coin-futures' });
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTCUSD');
    });

    it('should filter by unified type (FUNDING_FEE)', () => {
      const result = BitgetTransactionService.filterEntries(entries, { type: 'FUNDING_FEE' });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('CONTRACT_MAIN_SETTLE_FEE');
    });

    it('should filter by unified type (TRADE)', () => {
      const result = BitgetTransactionService.filterEntries(entries, { type: 'TRADE' });
      expect(result).toHaveLength(2); // TRADE and OPEN_LONG
    });

    it('should filter by currency', () => {
      const result = BitgetTransactionService.filterEntries(entries, { currency: 'BTC' });
      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('BTC');
    });

    it('should filter by accountId', () => {
      const result = BitgetTransactionService.filterEntries(entries, { accountId: 'conn-bg-2' });
      expect(result).toHaveLength(1);
      expect(result[0].connectionId).toBe('conn-bg-2');
    });
  });

  describe('computeStats', () => {
    it('computes stats correctly including funding and balances', () => {
      const entries = [
        makeMockBitgetEntry({ type: 'ORDER_DEALT_IN', change: '500', fee: '-0.5', balance: '1500', currency: 'USDT' }),
        makeMockBitgetEntry({ id: 'bg-2', type: 'CONTRACT_MAIN_SETTLE_FEE', change: '-2.5', fee: '0', balance: '1497.5', currency: 'USDT' }),
      ];

      const stats = BitgetTransactionService.computeStats(entries);
      expect(stats.totalCount).toBe(2);
      expect(stats.stable.totalFunding).toBe('-2.5');
      expect(stats.stable.totalFees).toBe('-0.5');
      expect(stats.stable.finalBalance).toBe('1500');
    });
  });
});
