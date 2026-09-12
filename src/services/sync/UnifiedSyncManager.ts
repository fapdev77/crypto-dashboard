import { ApiCredentials } from '../../store/apiKeysStore';
import { useSyncCoordinatorStore } from '../../store/syncCoordinatorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useFundingStore } from '../../store/fundingStore';
import { PositionHistoryService } from '../positions/PositionHistoryService';
import { OrderHistoryService } from '../orders/OrderHistoryService';
import { BybitTransactionService } from '../bybit/BybitTransactionService';
import { BitgetTransactionService } from '../bitget/BitgetTransactionService';
import { OkxTransactionService } from '../okx/OkxTransactionService';
import {
  clearAllCache,
  clearAllTransactionLogsCache,
  getBybitTxLogCache,
  getBybitTxLogMeta,
  getBitgetTxLogCache,
  getBitgetTxLogMeta,
  getOkxTxLogCache,
  getOkxTxLogMeta,
  getComprehensiveCacheStats,
  ComprehensiveCacheStats,
} from '../historyCache';
import { LogManager } from '../LogManager';

export interface FullSyncResult {
  stats: ComprehensiveCacheStats;
  positionsSynced: number;
  ordersSynced: number;
  bybitTxSynced: number;
  bitgetTxSynced: number;
  okxTxSynced: number;
  totalTxSynced: number;
  elapsedSeconds: number;
}

export class UnifiedSyncManager {
  /**
   * Syncs all modules across the entire application:
   * 1. Closed Position History
   * 2. Order History
   * 3. Bybit Transaction Logs
   * 4. Bitget Transaction Logs
   * 5. OKX Transaction Logs
   * 6. Funding Fees
   */
  public static async syncFullApplication(
    keys: ApiCredentials[],
    onProgress?: (step: string) => void
  ): Promise<FullSyncResult> {
    const startTime = performance.now();
    const activeKeys = keys.filter(k => k.isActive);
    const bybitKeys = activeKeys.filter(k => k.exchange === 'bybit');
    const bitgetKeys = activeKeys.filter(k => k.exchange === 'bitget');
    const okxKeys = activeKeys.filter(k => k.exchange === 'okx');

    LogManager.info('UnifiedSyncManager', 'Starting full application synchronization...');
    onProgress?.('Syncing Positions, Orders, Transactions & Funding in parallel...');

    const positionService = new PositionHistoryService();
    const orderService = new OrderHistoryService();
    const bybitTxService = new BybitTransactionService();
    const bitgetTxService = new BitgetTransactionService();
    const okxTxService = new OkxTransactionService();

    // 1. Sync Positions & Orders
    const positionsPromise = Promise.all(
      activeKeys.map(k => positionService.fetchWithCache(k).catch(err => {
        LogManager.warn('UnifiedSyncManager', `Position sync failed for ${k.label}:`, err);
        return [];
      }))
    );

    const ordersPromise = Promise.all(
      activeKeys.map(k => orderService.fetchWithCache(k).catch(err => {
        LogManager.warn('UnifiedSyncManager', `Order sync failed for ${k.label}:`, err);
        return [];
      }))
    );

    // 2. Sync Bybit Transactions
    const bybitPromise = (async () => {
      if (bybitKeys.length === 0) return 0;
      let count = 0;
      for (const key of bybitKeys) {
        try {
          const meta = await getBybitTxLogMeta(key.id);
          if (meta && meta.latestTransactionTime > 0) {
            const added = await bybitTxService.syncIncremental(key, meta.latestTransactionTime);
            count += added.length;
          } else {
            await bybitTxService.syncAll(key);
            const postMeta = await getBybitTxLogMeta(key.id);
            count += postMeta?.totalRecords || 0;
          }
        } catch (err) {
          LogManager.warn('UnifiedSyncManager', `Bybit Tx sync failed for ${key.label}:`, err);
        }
      }
      // Reload cache into coordinator store
      const all: any[] = [];
      for (const key of bybitKeys) {
        const cached = await getBybitTxLogCache(key.id);
        all.push(...cached);
      }
      all.sort((a, b) => b.transactionTime - a.transactionTime);
      useSyncCoordinatorStore.getState().setCachedTxLog(all);
      useSyncCoordinatorStore.getState().setBybitTxTotalRecords(all.length);
      useSyncCoordinatorStore.getState().setBybitTxLastSyncTime(Date.now());
      return count;
    })();

    // 3. Sync Bitget Transactions
    const bitgetPromise = (async () => {
      if (bitgetKeys.length === 0) return 0;
      let count = 0;
      for (const key of bitgetKeys) {
        try {
          const meta = await getBitgetTxLogMeta(key.id);
          if (meta && meta.latestTransactionTime > 0) {
            const added = await bitgetTxService.syncIncremental(key, meta.latestTransactionTime);
            count += added.length;
          } else {
            await bitgetTxService.syncAll(key);
            const postMeta = await getBitgetTxLogMeta(key.id);
            count += postMeta?.totalRecords || 0;
          }
        } catch (err) {
          LogManager.warn('UnifiedSyncManager', `Bitget Tx sync failed for ${key.label}:`, err);
        }
      }
      // Reload cache into coordinator store
      const all: any[] = [];
      for (const key of bitgetKeys) {
        const cached = await getBitgetTxLogCache(key.id);
        all.push(...cached);
      }
      all.sort((a, b) => b.transactionTime - a.transactionTime);
      useSyncCoordinatorStore.getState().setCachedBitgetTxLog(all);
      useSyncCoordinatorStore.getState().setBitgetTxTotalRecords(all.length);
      useSyncCoordinatorStore.getState().setBitgetTxLastSyncTime(Date.now());
      return count;
    })();

    // 4. Sync OKX Transactions
    const okxPromise = (async () => {
      if (okxKeys.length === 0) return 0;
      let count = 0;
      for (const key of okxKeys) {
        try {
          const meta = await getOkxTxLogMeta(key.id);
          if (meta && meta.latestTransactionTime > 0) {
            const added = await okxTxService.syncIncremental(key, meta.latestTransactionTime);
            count += added.length;
          } else {
            await okxTxService.syncAll(key);
            const postMeta = await getOkxTxLogMeta(key.id);
            count += postMeta?.totalRecords || 0;
          }
        } catch (err) {
          LogManager.warn('UnifiedSyncManager', `OKX Tx sync failed for ${key.label}:`, err);
        }
      }
      // Reload cache into coordinator store
      const all: any[] = [];
      for (const key of okxKeys) {
        const cached = await getOkxTxLogCache(key.id);
        all.push(...cached);
      }
      all.sort((a, b) => b.transactionTime - a.transactionTime);
      useSyncCoordinatorStore.getState().setCachedOkxTxLog(all);
      useSyncCoordinatorStore.getState().setOkxTxTotalRecords(all.length);
      useSyncCoordinatorStore.getState().setOkxTxLastSyncTime(Date.now());
      return count;
    })();

    // 5. Trigger funding refresh event
    window.dispatchEvent(new CustomEvent('funding-cache-cleared'));

    const [posResults, orderResults, bybitCount, bitgetCount, okxCount] = await Promise.all([
      positionsPromise,
      ordersPromise,
      bybitPromise,
      bitgetPromise,
      okxPromise,
    ]);

    useSettingsStore.getState().bumpHistoryCacheVersion();
    useSettingsStore.getState().setLastSyncTime(Date.now());

    const elapsedSeconds = Number(((performance.now() - startTime) / 1000).toFixed(1));
    const stats = await getComprehensiveCacheStats();

    const positionsSynced = posResults.reduce((acc, curr) => acc + (curr?.length || 0), 0);
    const ordersSynced = orderResults.reduce((acc, curr) => acc + (curr?.length || 0), 0);
    const totalTxSynced = bybitCount + bitgetCount + okxCount;

    LogManager.system(
      'UnifiedSyncManager',
      `Full application sync completed in ${elapsedSeconds}s | Total DB Records: ${stats.totalRecords}`
    );

    return {
      stats,
      positionsSynced,
      ordersSynced,
      bybitTxSynced: bybitCount,
      bitgetTxSynced: bitgetCount,
      okxTxSynced: okxCount,
      totalTxSynced,
      elapsedSeconds,
    };
  }

  /**
   * Syncs transaction logs specifically for Bybit, Bitget and OKX
   */
  public static async syncAllTransactions(
    keys: ApiCredentials[],
    onProgress?: (msg: string) => void
  ): Promise<{ bybit: number; bitget: number; okx: number; total: number; elapsedSeconds: number }> {
    const startTime = performance.now();
    const activeKeys = keys.filter(k => k.isActive);
    const bybitKeys = activeKeys.filter(k => k.exchange === 'bybit');
    const bitgetKeys = activeKeys.filter(k => k.exchange === 'bitget');
    const okxKeys = activeKeys.filter(k => k.exchange === 'okx');

    onProgress?.('Syncing Bybit, Bitget & OKX transaction logs in parallel...');

    const bybitTxService = new BybitTransactionService();
    const bitgetTxService = new BitgetTransactionService();
    const okxTxService = new OkxTransactionService();

    const bybitPromise = (async () => {
      if (bybitKeys.length === 0) return 0;
      let count = 0;
      for (const key of bybitKeys) {
        try {
          const meta = await getBybitTxLogMeta(key.id);
          if (meta && meta.latestTransactionTime > 0) {
            const added = await bybitTxService.syncIncremental(key, meta.latestTransactionTime);
            count += added.length;
          } else {
            await bybitTxService.syncAll(key);
            const postMeta = await getBybitTxLogMeta(key.id);
            count += postMeta?.totalRecords || 0;
          }
        } catch (err) {
          LogManager.warn('UnifiedSyncManager', `Bybit Tx sync failed:`, err);
        }
      }
      const all: any[] = [];
      for (const key of bybitKeys) {
        const cached = await getBybitTxLogCache(key.id);
        all.push(...cached);
      }
      all.sort((a, b) => b.transactionTime - a.transactionTime);
      useSyncCoordinatorStore.getState().setCachedTxLog(all);
      useSyncCoordinatorStore.getState().setBybitTxTotalRecords(all.length);
      useSyncCoordinatorStore.getState().setBybitTxLastSyncTime(Date.now());
      return count;
    })();

    const bitgetPromise = (async () => {
      if (bitgetKeys.length === 0) return 0;
      let count = 0;
      for (const key of bitgetKeys) {
        try {
          const meta = await getBitgetTxLogMeta(key.id);
          if (meta && meta.latestTransactionTime > 0) {
            const added = await bitgetTxService.syncIncremental(key, meta.latestTransactionTime);
            count += added.length;
          } else {
            await bitgetTxService.syncAll(key);
            const postMeta = await getBitgetTxLogMeta(key.id);
            count += postMeta?.totalRecords || 0;
          }
        } catch (err) {
          LogManager.warn('UnifiedSyncManager', `Bitget Tx sync failed:`, err);
        }
      }
      const all: any[] = [];
      for (const key of bitgetKeys) {
        const cached = await getBitgetTxLogCache(key.id);
        all.push(...cached);
      }
      all.sort((a, b) => b.transactionTime - a.transactionTime);
      useSyncCoordinatorStore.getState().setCachedBitgetTxLog(all);
      useSyncCoordinatorStore.getState().setBitgetTxTotalRecords(all.length);
      useSyncCoordinatorStore.getState().setBitgetTxLastSyncTime(Date.now());
      return count;
    })();

    const okxPromise = (async () => {
      if (okxKeys.length === 0) return 0;
      let count = 0;
      for (const key of okxKeys) {
        try {
          const meta = await getOkxTxLogMeta(key.id);
          if (meta && meta.latestTransactionTime > 0) {
            const added = await okxTxService.syncIncremental(key, meta.latestTransactionTime);
            count += added.length;
          } else {
            await okxTxService.syncAll(key);
            const postMeta = await getOkxTxLogMeta(key.id);
            count += postMeta?.totalRecords || 0;
          }
        } catch (err) {
          LogManager.warn('UnifiedSyncManager', `OKX Tx sync failed:`, err);
        }
      }
      const all: any[] = [];
      for (const key of okxKeys) {
        const cached = await getOkxTxLogCache(key.id);
        all.push(...cached);
      }
      all.sort((a, b) => b.transactionTime - a.transactionTime);
      useSyncCoordinatorStore.getState().setCachedOkxTxLog(all);
      useSyncCoordinatorStore.getState().setOkxTxTotalRecords(all.length);
      useSyncCoordinatorStore.getState().setOkxTxLastSyncTime(Date.now());
      return count;
    })();

    const [bybit, bitget, okx] = await Promise.all([bybitPromise, bitgetPromise, okxPromise]);
    const elapsedSeconds = Number(((performance.now() - startTime) / 1000).toFixed(1));

    return {
      bybit,
      bitget,
      okx,
      total: bybit + bitget + okx,
      elapsedSeconds,
    };
  }

  /**
   * Completely clears all cached data across all IndexedDB stores and Zustand states,
   * then immediately triggers a clean re-synchronization across all modules.
   */
  public static async clearAndResyncAll(
    keys: ApiCredentials[],
    onProgress?: (step: string) => void
  ): Promise<FullSyncResult> {
    LogManager.info('UnifiedSyncManager', 'Clearing all application cache...');
    onProgress?.('Clearing local database cache...');

    await clearAllCache();

    // Reset stores
    const coordinator = useSyncCoordinatorStore.getState();
    coordinator.setCachedPositions([]);
    coordinator.setCachedClosedOrders([]);
    coordinator.setCachedTxLog([]);
    coordinator.setCachedBitgetTxLog([]);
    coordinator.setCachedOkxTxLog([]);
    coordinator.setCachedPnLRecord({});
    coordinator.setBybitTxTotalRecords(0);
    coordinator.setBitgetTxTotalRecords(0);
    coordinator.setOkxTxTotalRecords(0);
    coordinator.setBybitTxLastSyncTime(0);
    coordinator.setBitgetTxLastSyncTime(0);
    coordinator.setOkxTxLastSyncTime(0);

    useFundingStore.getState().setLastHistoryFetch(0);
    useSettingsStore.getState().setLastSyncTime(0);

    // Notify listeners
    window.dispatchEvent(new CustomEvent('history-cache-cleared'));
    window.dispatchEvent(new CustomEvent('funding-cache-cleared'));
    window.dispatchEvent(new CustomEvent('transactions-cache-cleared'));

    onProgress?.('Re-synchronizing all modules from exchanges...');
    return this.syncFullApplication(keys, onProgress);
  }

  /**
   * Clears transaction logs cache only (Bybit, Bitget, OKX) and immediately re-syncs them.
   */
  public static async clearAndResyncTransactions(
    keys: ApiCredentials[],
    onProgress?: (step: string) => void
  ): Promise<{ bybit: number; bitget: number; okx: number; total: number; elapsedSeconds: number }> {
    LogManager.info('UnifiedSyncManager', 'Clearing transaction logs cache...');
    onProgress?.('Clearing transaction log tables...');

    await clearAllTransactionLogsCache();

    const coordinator = useSyncCoordinatorStore.getState();
    coordinator.setCachedTxLog([]);
    coordinator.setCachedBitgetTxLog([]);
    coordinator.setCachedOkxTxLog([]);
    coordinator.setBybitTxTotalRecords(0);
    coordinator.setBitgetTxTotalRecords(0);
    coordinator.setOkxTxTotalRecords(0);
    coordinator.setBybitTxLastSyncTime(0);
    coordinator.setBitgetTxLastSyncTime(0);
    coordinator.setOkxTxLastSyncTime(0);

    window.dispatchEvent(new CustomEvent('transactions-cache-cleared'));

    onProgress?.('Re-downloading full transaction history from Bybit, Bitget & OKX...');
    return this.syncAllTransactions(keys, onProgress);
  }
}
