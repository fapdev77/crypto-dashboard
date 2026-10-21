import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderHistoryService } from '../orders/OrderHistoryService';
import { BillsHistoryService } from '../bills/BillsHistoryService';
import { PositionHistoryService } from '../positions/PositionHistoryService';
import { useApiKeysStore, ApiCredentials } from '../../store/apiKeysStore';
import { useLogStore } from '../../store/logStore';
import { ExchangeAggregator } from '../adapters/ExchangeAggregator';
import * as historyCacheModule from '../historyCache';

vi.mock('../adapters/ExchangeAggregator', () => ({
  ExchangeAggregator: {
    getAdapter: vi.fn(),
  },
}));

vi.mock('../historyCache', () => ({
  getCachedOrders: vi.fn().mockResolvedValue([]),
  saveCachedOrders: vi.fn().mockResolvedValue(undefined),
  getLastOrderFetchTimestamp: vi.fn().mockResolvedValue(0),
  updateOrderCacheMeta: vi.fn().mockResolvedValue(undefined),
  getCachedHistory: vi.fn().mockResolvedValue([]),
  saveCachedHistory: vi.fn().mockResolvedValue(undefined),
  getLastFetchTimestamp: vi.fn().mockResolvedValue(0),
  updateCacheMeta: vi.fn().mockResolvedValue(undefined),
}));

const mockKey: ApiCredentials = {
  id: 'key-hist-1',
  label: 'Bybit Main History',
  exchange: 'bybit',
  apiKey: 'k',
  apiSecret: 's',
  isActive: true,
};

describe('Historical and Security Services - standardized logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLogStore.setState({ entries: [] });
  });

  const getLogs = (tag: string) => {
    return useLogStore.getState().entries.filter(e => e.source === tag);
  };

  describe('OrderHistoryService', () => {
    it('emits start and completion INFO logs with History.Orders tag and [Label]', async () => {
      const service = new OrderHistoryService();
      vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue({
        getHistoryOrders: vi.fn().mockResolvedValue([{ id: 'order-1', createdTime: 1000 }]),
      } as any);

      await service.fetchWithCache(mockKey);

      const logs = getLogs('History.Orders');
      const startLog = logs.find(l => l.level === 'INFO' && l.message.includes('Fetching order history'));
      const completeLog = logs.find(l => l.level === 'INFO' && l.message.includes('Order history synchronized'));

      expect(startLog).toBeDefined();
      expect(startLog!.message).toContain('[Bybit Main History]');
      expect(completeLog).toBeDefined();
      expect(completeLog!.message).toContain('[Bybit Main History]');
    });

    it('emits WARN log with History.Orders tag when fetch fails', async () => {
      const service = new OrderHistoryService();
      vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue({
        getHistoryOrders: vi.fn().mockRejectedValue(new Error('Network error on orders')),
      } as any);

      await expect(service.fetchWithCache(mockKey)).rejects.toThrow('Network error on orders');

      const warnLogs = getLogs('History.Orders').filter(l => l.level === 'WARN');
      expect(warnLogs.length).toBe(1);
      expect(warnLogs[0].message).toContain('[Bybit Main History]');
      expect(warnLogs[0].message).toContain('Incremental fetch failed');
    });
  });

  describe('BillsHistoryService', () => {
    it('emits start and completion INFO logs with History.Bills tag and [Label]', async () => {
      const service = new BillsHistoryService();
      vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue({
        fetchBills: vi.fn().mockResolvedValue([{ id: 'bill-1' }, { id: 'bill-2' }]),
      } as any);

      const result = await service.fetchBills(mockKey);
      expect(result.length).toBe(2);

      const logs = getLogs('History.Bills');
      const startLog = logs.find(l => l.level === 'INFO' && l.message.includes('Fetching deposits and withdrawals'));
      const completeLog = logs.find(l => l.level === 'INFO' && l.message.includes('Successfully fetched 2 bill records'));

      expect(startLog).toBeDefined();
      expect(startLog!.message).toContain('[Bybit Main History]');
      expect(completeLog).toBeDefined();
      expect(completeLog!.message).toContain('[Bybit Main History]');
    });

    it('emits WARN log when exchange does not support fetchBills', async () => {
      const service = new BillsHistoryService();
      vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue({} as any); // no fetchBills

      const result = await service.fetchBills(mockKey);
      expect(result.length).toBe(0);

      const warnLogs = getLogs('History.Bills').filter(l => l.level === 'WARN');
      expect(warnLogs.length).toBe(1);
      expect(warnLogs[0].message).toContain('[Bybit Main History]');
      expect(warnLogs[0].message).toContain('does not implement fetchBills');
    });

    it('emits ERROR log with History.Bills tag on exception', async () => {
      const service = new BillsHistoryService();
      vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue({
        fetchBills: vi.fn().mockRejectedValue(new Error('Bills endpoint down')),
      } as any);

      const result = await service.fetchBills(mockKey);
      expect(result.length).toBe(0);

      const errorLogs = getLogs('History.Bills').filter(l => l.level === 'ERROR');
      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].message).toContain('[Bybit Main History]');
      expect(errorLogs[0].message).toContain('Failed to fetch bills');
    });
  });

  describe('PositionHistoryService', () => {
    it('emits start and completion logs under History.Positions with [Label]', async () => {
      const service = new PositionHistoryService();
      vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue({
        fetchAndNormalize: vi.fn().mockResolvedValue([{ id: 'pos-1', closeUpdateTime: 2000 }]),
      } as any);

      const result = await service.fetchWithCache(mockKey);
      expect(result.length).toBe(1);

      const logs = getLogs('History.Positions');
      const startLog = logs.find(l => l.level === 'INFO' && l.message.includes('Position cache loaded'));
      const fetchLog = logs.find(l => l.level === 'INFO' && l.message.includes('1 new position records fetched'));

      expect(startLog).toBeDefined();
      expect(startLog!.message).toContain('[Bybit Main History]');
      expect(fetchLog).toBeDefined();
      expect(fetchLog!.message).toContain('[Bybit Main History]');
    });
  });

  describe('apiKeysStore - Security.Keys audit logging', () => {
    it('emits SYSTEM log when an API key is added and removed', () => {
      useApiKeysStore.setState({ keys: [] });

      useApiKeysStore.getState().addKey({
        label: 'Audit Test Account',
        exchange: 'okx',
        apiKey: 'k',
        apiSecret: 's',
      });

      const addedLog = getLogs('Security.Keys').find(
        l => l.level === 'SYSTEM' && l.message.includes('Added API connection [Audit Test Account]')
      );
      expect(addedLog).toBeDefined();

      const createdKey = useApiKeysStore.getState().keys[0];
      expect(createdKey).toBeDefined();

      useApiKeysStore.getState().removeKey(createdKey.id);

      const removedLog = getLogs('Security.Keys').find(
        l => l.level === 'SYSTEM' && l.message.includes('Removed API connection [Audit Test Account]')
      );
      expect(removedLog).toBeDefined();
    });

    it('emits WARN log when vault unlock fails with invalid passphrase', async () => {
      useApiKeysStore.setState({
        isEncrypted: true,
        encryptedData: 'corrupted-or-invalid-encrypted-blob',
        isUnlocked: false,
      });

      const success = await useApiKeysStore.getState().unlock('wrong-passphrase');
      expect(success).toBe(false);

      const warnLog = getLogs('Security.Keys').find(
        l => l.level === 'WARN' && l.message.includes('Vault unlock attempt failed')
      );
      expect(warnLog).toBeDefined();
    });
  });
});
