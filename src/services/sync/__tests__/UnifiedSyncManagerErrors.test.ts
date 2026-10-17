import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedSyncManager, ConnectionLockManager } from '../UnifiedSyncManager';
import { useSyncCoordinatorStore } from '../../../store/syncCoordinatorStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { PositionHistoryService } from '../../positions/PositionHistoryService';
import { OrderHistoryService } from '../../orders/OrderHistoryService';
import { BybitTransactionService } from '../../bybit/BybitTransactionService';
import { BitgetTransactionService } from '../../bitget/BitgetTransactionService';
import { OkxTransactionService } from '../../okx/OkxTransactionService';
import * as historyCache from '../../historyCache';
import { ApiCredentials } from '../../../store/apiKeysStore';

vi.mock('../../positions/PositionHistoryService');
vi.mock('../../orders/OrderHistoryService');
vi.mock('../../bybit/BybitTransactionService');
vi.mock('../../bitget/BitgetTransactionService');
vi.mock('../../okx/OkxTransactionService');
vi.mock('../../historyCache');
vi.mock('../../storageQuota', () => ({
  checkAndWarnStorageQuota: vi.fn().mockResolvedValue(undefined),
}));

describe('UnifiedSyncManager error tracking and store synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ConnectionLockManager.clearLocks();
    useSyncCoordinatorStore.setState({
      positionsSyncError: null,
      ordersSyncError: null,
      bybitTxSyncError: null,
      bitgetTxSyncError: null,
      okxTxSyncError: null,
      txSyncError: null,
    });
    useSettingsStore.setState({
      lastSyncTime: 1000,
      historyCacheInterval: 5,
    });
    vi.mocked(historyCache.getComprehensiveCacheStats).mockResolvedValue({
      totalRecords: 100,
      positions: 10,
      orders: 20,
      bybitTx: 30,
      bitgetTx: 20,
      okxTx: 20,
      funding: 0,
      assets: 0,
    } as any);
  });

  it('aggregates errors when position sync fails in syncFullApplication and does not advance lastSyncTime', async () => {
    const keys: ApiCredentials[] = [
      {
        id: 'conn-1',
        exchange: 'bybit',
        apiKey: 'key-1',
        apiSecret: 'sec-1',
        label: 'Bybit Main',
        isActive: true,
      },
    ];

    vi.mocked(PositionHistoryService.prototype.fetchWithCache).mockRejectedValue(
      new Error('Bybit 429 Too Many Requests')
    );
    vi.mocked(OrderHistoryService.prototype.fetchWithCache).mockResolvedValue([]);
    vi.mocked(BybitTransactionService.prototype.syncAll).mockResolvedValue(undefined as any);
    vi.mocked(historyCache.getBybitTxLogMeta).mockResolvedValue({ latestTransactionTime: 0, totalRecords: 0 } as any);
    vi.mocked(historyCache.getBybitTxLogCache).mockResolvedValue([]);

    const result = await UnifiedSyncManager.syncFullApplication(keys);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Bybit 429 Too Many Requests');
    expect(useSyncCoordinatorStore.getState().positionsSyncError).toContain('Bybit 429 Too Many Requests');
    // Scenario B: lastSyncTime was NOT advanced
    expect(useSettingsStore.getState().lastSyncTime).toBe(1000);
  });

  it('clears error and advances lastSyncTime when syncFullApplication is 100% successful', async () => {
    useSyncCoordinatorStore.setState({ positionsSyncError: 'Old Error' });

    const keys: ApiCredentials[] = [
      {
        id: 'conn-1',
        exchange: 'bybit',
        apiKey: 'key-1',
        apiSecret: 'sec-1',
        label: 'Bybit Main',
        isActive: true,
      },
    ];

    vi.mocked(PositionHistoryService.prototype.fetchWithCache).mockResolvedValue([]);
    vi.mocked(OrderHistoryService.prototype.fetchWithCache).mockResolvedValue([]);
    vi.mocked(BybitTransactionService.prototype.syncAll).mockResolvedValue(undefined as any);
    vi.mocked(historyCache.getBybitTxLogMeta).mockResolvedValue({ latestTransactionTime: 0, totalRecords: 0 } as any);
    vi.mocked(historyCache.getBybitTxLogCache).mockResolvedValue([]);

    const result = await UnifiedSyncManager.syncFullApplication(keys);

    expect(result.errors.length).toBe(0);
    expect(useSyncCoordinatorStore.getState().positionsSyncError).toBeNull();
    // lastSyncTime was advanced
    expect(useSettingsStore.getState().lastSyncTime).toBeGreaterThan(1000);
  });

  it('keeps Bybit and OKX txSyncErrors isolated from each other', async () => {
    const keys: ApiCredentials[] = [
      {
        id: 'bybit-1',
        exchange: 'bybit',
        apiKey: 'key-1',
        apiSecret: 'sec-1',
        label: 'Bybit Conn',
        isActive: true,
      },
      {
        id: 'okx-1',
        exchange: 'okx',
        apiKey: 'key-2',
        apiSecret: 'sec-2',
        label: 'OKX Conn',
        isActive: true,
      },
    ];

    // Bybit fails
    vi.mocked(BybitTransactionService.prototype.syncAll).mockRejectedValue(
      new Error('Partial sync failure for Bybit Conn (Rate limit exhausted)')
    );
    vi.mocked(historyCache.getBybitTxLogMeta).mockResolvedValue(undefined);
    vi.mocked(historyCache.getBybitTxLogCache).mockResolvedValue([]);

    // OKX succeeds
    vi.mocked(OkxTransactionService.prototype.syncAll).mockResolvedValue(undefined as any);
    vi.mocked(historyCache.getOkxTxLogMeta).mockResolvedValue(undefined);
    vi.mocked(historyCache.getOkxTxLogCache).mockResolvedValue([]);

    await UnifiedSyncManager.syncExchangeTransactions(keys, 'bybit');
    await UnifiedSyncManager.syncExchangeTransactions(keys, 'okx');

    expect(useSyncCoordinatorStore.getState().bybitTxSyncError).toContain('Rate limit exhausted');
    // OKX success must NOT overwrite Bybit's error
    expect(useSyncCoordinatorStore.getState().okxTxSyncError).toBeNull();
  });
});
