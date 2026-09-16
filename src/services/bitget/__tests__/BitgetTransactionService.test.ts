import { describe, it, expect } from 'vitest';
import { BitgetTransactionService } from '../BitgetTransactionService';
import { BitgetTransactionLogEntry } from '../../../types';

function makeMockBitgetEntry(overrides: Partial<BitgetTransactionLogEntry> = {}): BitgetTransactionLogEntry {
  const balance = overrides.balance ?? '5000';
  const cashBalance = overrides.cashBalance ?? balance;
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
    balance,
    cashBalance,
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

  describe('Adapter Normalization for Open/Close positions', () => {
    const mockKey: any = { id: 'test-key', label: 'Test Key', exchange: 'bitget', accountType: 'uta' };

    it('UTA adapter correctly classifies Close Long when selling to reduce long position', async () => {
      const { BitgetUTAAdapter } = await import('../../adapters/BitgetUTAAdapter');
      const raw = {
        id: '123456',
        ts: '1710000000000',
        symbol: 'BTCUSDT_UMCBL',
        side: 'sell',
        posSide: 'long',
        type: 'ORDER_DEALT_OUT',
        size: '1.5',
        price: '65000',
        fee: '-1.2',
        coin: 'USDT'
      };
      const entry = BitgetUTAAdapter.normalizeTxLogEntry(raw, mockKey);
      expect(entry.side).toBe('Close Long');
      expect(entry.positionType).toBe('Long (Close/Reduce)');
      expect(entry.qty).toBe('1.5');
      expect(entry.tradePrice).toBe('65000');
    });

    it('UTA adapter correctly classifies Open Long when buying to open long position', async () => {
      const { BitgetUTAAdapter } = await import('../../adapters/BitgetUTAAdapter');
      const raw = {
        id: '123457',
        ts: '1710000000000',
        symbol: 'BTCUSDT_UMCBL',
        side: 'buy',
        posSide: 'long',
        type: 'ORDER_DEALT_IN',
        size: '2.0',
        price: '64000',
        fee: '-1.5',
        coin: 'USDT'
      };
      const entry = BitgetUTAAdapter.normalizeTxLogEntry(raw, mockKey);
      expect(entry.side).toBe('Open Long');
      expect(entry.positionType).toBe('Long (Open)');
    });

    it('UTA adapter correctly classifies Close Short when buying to reduce short position', async () => {
      const { BitgetUTAAdapter } = await import('../../adapters/BitgetUTAAdapter');
      const raw = {
        id: '123458',
        ts: '1710000000000',
        symbol: 'BTCUSDT_UMCBL',
        side: 'buy',
        posSide: 'short',
        type: 'ORDER_DEALT_IN',
        size: '1.0',
        price: '63000',
        fee: '-0.8',
        coin: 'USDT'
      };
      const entry = BitgetUTAAdapter.normalizeTxLogEntry(raw, mockKey);
      expect(entry.side).toBe('Close Short');
      expect(entry.positionType).toBe('Short (Close/Reduce)');
    });

    it('Classic adapter correctly classifies explicit CLOSE_LONG and OPEN_SHORT types', async () => {
      const { BitgetClassicAdapter } = await import('../../adapters/BitgetClassicAdapter');
      const rawClose = {
        billId: '987654',
        cTime: '1710000000000',
        symbol: 'BTCUSDT_UMCBL',
        businessType: 'CONTRACT_CLOSE_LONG',
        amount: '0.5',
        fee: '-0.3',
        coinName: 'USDT'
      };
      const entryClose = BitgetClassicAdapter.normalizeTxLogEntry(rawClose, { ...mockKey, accountType: 'classic' });
      expect(entryClose.side).toBe('Close Long');

      const rawOpenShort = {
        billId: '987655',
        cTime: '1710000000000',
        symbol: 'ETHUSDT_UMCBL',
        businessType: 'CONTRACT_OPEN_SHORT',
        amount: '5.0',
        fee: '-1.0',
        coinName: 'USDT'
      };
      const entryOpenShort = BitgetClassicAdapter.normalizeTxLogEntry(rawOpenShort, { ...mockKey, accountType: 'classic' });
      expect(entryOpenShort.side).toBe('Open Short');
    });
  });
});
