import { describe, it, expect } from 'vitest';
import { OkxTransactionService } from '../OkxTransactionService';
import { OkxTransactionLogEntry } from '../../../types';

function makeMockOkxEntry(overrides: Partial<OkxTransactionLogEntry> = {}): OkxTransactionLogEntry {
  const balance = overrides.balance ?? '6000';
  const cashBalance = overrides.cashBalance ?? balance;
  return {
    id: 'okx-mock-1',
    connectionId: 'conn-okx-1',
    exchange: 'okx',
    label: 'okx-main',
    rawId: 'raw-okx-1',
    symbol: 'BTC-USDT-SWAP',
    category: 'swap',
    side: 'buy',
    transactionTime: 1710000000000,
    type: '2', // Trade
    subType: '1',
    currency: 'USDT',
    amount: '100',
    fee: '-0.05',
    cashFlow: '100',
    change: '100',
    balance,
    cashBalance,
    billId: 'bill-001',
    tradeId: 'okx-tr-001',
    orderId: 'okx-ord-001',
    raw: {},
    ...overrides,
  };
}

describe('OkxTransactionService', () => {
  describe('filterEntries', () => {
    const entries = [
      makeMockOkxEntry({ symbol: 'BTC-USDT-SWAP', type: '2', currency: 'USDT', category: 'swap', transactionTime: 1710000000000 }),
      makeMockOkxEntry({ id: 'okx-2', symbol: 'ETH-USDT-SWAP', type: '8', subType: '100', currency: 'USDT', category: 'swap', transactionTime: 1710086400000 }),
      makeMockOkxEntry({ id: 'okx-3', symbol: 'SOL-USDT', type: '1', subType: '11', currency: 'USDT', category: 'spot', transactionTime: 1710172800000, connectionId: 'conn-okx-2' }),
      makeMockOkxEntry({ id: 'okx-4', symbol: 'BTC-USD-SWAP', type: '5', subType: '100', currency: 'BTC', category: 'swap', transactionTime: 1710259200000 }),
    ];

    it('should return all entries when no filters applied', () => {
      const result = OkxTransactionService.filterEntries(entries, {});
      expect(result).toHaveLength(4);
    });

    it('should filter by search term', () => {
      const result = OkxTransactionService.filterEntries(entries, { search: 'BTC' });
      expect(result).toHaveLength(2);
    });

    it('should filter by category', () => {
      const result = OkxTransactionService.filterEntries(entries, { category: 'spot' });
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('SOL-USDT');
    });

    it('should filter by unified type (FUNDING_FEE)', () => {
      const result = OkxTransactionService.filterEntries(entries, { type: 'FUNDING_FEE' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('okx-2');
    });

    it('should filter by unified type (TRANSFER_IN)', () => {
      const result = OkxTransactionService.filterEntries(entries, { type: 'TRANSFER_IN' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('okx-3');
    });

    it('should filter by unified type (LIQUIDATION)', () => {
      const result = OkxTransactionService.filterEntries(entries, { type: 'LIQUIDATION' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('okx-4');
    });

    it('should filter by currency', () => {
      const result = OkxTransactionService.filterEntries(entries, { currency: 'BTC' });
      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('BTC');
    });

    it('should filter by accountId', () => {
      const result = OkxTransactionService.filterEntries(entries, { accountId: 'conn-okx-2' });
      expect(result).toHaveLength(1);
      expect(result[0].connectionId).toBe('conn-okx-2');
    });
  });

  describe('computeStats', () => {
    it('computes stats correctly for OKX bills', () => {
      const entries = [
        makeMockOkxEntry({ type: '2', change: '250', fee: '-0.25', balance: '2500', currency: 'USDT' }),
        makeMockOkxEntry({ id: 'okx-2', type: '8', change: '-1.2', fee: '0', balance: '2498.8', currency: 'USDT' }),
      ];

      const stats = OkxTransactionService.computeStats(entries);
      expect(stats.totalCount).toBe(2);
      expect(stats.stable.totalFunding).toBe('-1.2');
      expect(stats.stable.totalFees).toBe('-0.25');
      expect(stats.stable.finalBalance).toBe('2500');
    });
  });
});
