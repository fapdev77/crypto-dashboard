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

// Module-level concurrency locks & request deduplication promises
let activeFullSyncPromise: Promise<FullSyncResult> | null = null;
let activeTxSyncPromise: Promise<{ bybit: number; bitget: number; okx: number; total: number; elapsedSeconds: number }> | null = null;

interface QueuedTask<T = any> {
  description: string;
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

interface ConnectionLockEntry {
  connectionId: string;
  connectionLabel: string;
  currentTaskDescription: string;
  activePromise: Promise<any>;
  queue: QueuedTask[];
}

/**
 * Robust connection-level locking and queueing manager.
 * Prevents race conditions and duplicate API calls for the same connectionId.
 * If a sync is active for a connectionId:
 * - 'queue' strategy (default): Queues the new task to run immediately after the current one.
 * - 'collapse' strategy: Returns the currently active execution promise without double-fetching.
 * Outputs all lock, queue, dequeuing, and error events to LogManager for the Live Connection Log.
 */
export class ConnectionLockManager {
  private static locks = new Map<string, ConnectionLockEntry>();

  /**
   * Check whether a synchronization task is currently executing for a connectionId.
   */
  public static isLocked(connectionId: string): boolean {
    return this.locks.has(connectionId);
  }

  /**
   * Get the number of tasks currently queued for a connectionId.
   */
  public static getQueueDepth(connectionId: string): number {
    return this.locks.get(connectionId)?.queue.length || 0;
  }

  /**
   * Get the description of the currently active task for a connectionId.
   */
  public static getCurrentTask(connectionId: string): string | null {
    return this.locks.get(connectionId)?.currentTaskDescription || null;
  }

  /**
   * Get an overview of all active connection locks for debugging.
   */
  public static getActiveLocks(): { connectionId: string; connectionLabel: string; currentTask: string; queueDepth: number }[] {
    return Array.from(this.locks.values()).map(entry => ({
      connectionId: entry.connectionId,
      connectionLabel: entry.connectionLabel,
      currentTask: entry.currentTaskDescription,
      queueDepth: entry.queue.length,
    }));
  }

  /**
   * Resets all lock states (primarily used in unit test setup/teardown).
   */
  public static clearLocks(): void {
    this.locks.clear();
  }

  /**
   * Executes a task under a single-lane connection lock.
   */
  public static async runWithLock<T>(
    connectionId: string,
    description: string,
    task: () => Promise<T>,
    options?: {
      connectionLabel?: string;
      strategy?: 'queue' | 'collapse';
      maxQueue?: number;
    }
  ): Promise<T> {
    const label = options?.connectionLabel || connectionId;
    const strategy = options?.strategy || 'queue';
    const maxQueue = options?.maxQueue ?? 1;

    const existingLock = this.locks.get(connectionId);

    // 1. If connection is already locked
    if (existingLock) {
      if (strategy === 'collapse') {
        LogManager.warn(
          'UnifiedSyncManager',
          `[Lock Busy] Sync in progress for "${label}" (${connectionId}) running "${existingLock.currentTaskDescription}". Collapsing duplicate request for "${description}".`
        );
        return existingLock.activePromise as Promise<T>;
      }

      // If queue depth exceeds maxQueue, fold/coalesce into the pending item
      if (existingLock.queue.length >= maxQueue) {
        const lastQueued = existingLock.queue[existingLock.queue.length - 1];
        LogManager.warn(
          'UnifiedSyncManager',
          `[Queue Fold] Queue limit (${maxQueue}) reached for "${label}" (${connectionId}). Updating pending queued request to latest "${description}".`
        );

        return new Promise<T>((resolve, reject) => {
          existingLock.queue[existingLock.queue.length - 1] = {
            description,
            task,
            resolve: (val: T) => {
              lastQueued.resolve(val);
              resolve(val);
            },
            reject: (err: any) => {
              lastQueued.reject(err);
              reject(err);
            },
          };
        });
      }

      // Add to queue
      LogManager.warn(
        'UnifiedSyncManager',
        `[Queue Added] Connection "${label}" (${connectionId}) is busy (${existingLock.currentTaskDescription}). Queuing "${description}" (Queue position: ${existingLock.queue.length + 1}).`
      );

      return new Promise<T>((resolve, reject) => {
        existingLock.queue.push({
          description,
          task,
          resolve,
          reject,
        });
      });
    }

    // 2. Connection is free: acquire lock and execute
    LogManager.info(
      'UnifiedSyncManager',
      `[Lock Acquired] Starting "${description}" for connection "${label}" (${connectionId})`
    );

    const lockEntry: ConnectionLockEntry = {
      connectionId,
      connectionLabel: label,
      currentTaskDescription: description,
      activePromise: null as any,
      queue: [],
    };
    this.locks.set(connectionId, lockEntry);

    const executeWithQueue = async (currentDesc: string, currentTask: () => Promise<T>): Promise<T> => {
      lockEntry.currentTaskDescription = currentDesc;
      try {
        const result = await currentTask();
        return result;
      } catch (err: any) {
        LogManager.error(
          'UnifiedSyncManager',
          `[Lock Error] Error during "${currentDesc}" for connection "${label}" (${connectionId}):`,
          err?.message || err
        );
        throw err;
      } finally {
        if (lockEntry.queue.length > 0) {
          const next = lockEntry.queue.shift()!;
          LogManager.info(
            'UnifiedSyncManager',
            `[Queue Dequeued] Starting queued "${next.description}" for connection "${label}" (${connectionId}). Remaining queue: ${lockEntry.queue.length}`
          );
          // Execute next queued task without blocking caller's return
          executeWithQueue(next.description, next.task)
            .then(next.resolve, next.reject);
        } else {
          ConnectionLockManager.locks.delete(connectionId);
          LogManager.info(
            'UnifiedSyncManager',
            `[Lock Released] Finished all sync operations for connection "${label}" (${connectionId})`
          );
        }
      }
    };

    lockEntry.activePromise = executeWithQueue(description, task);
    return lockEntry.activePromise;
  }
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
    if (activeFullSyncPromise) {
      LogManager.warn('UnifiedSyncManager', 'Full application sync already in progress. Reusing active operation.');
      return activeFullSyncPromise;
    }

    activeFullSyncPromise = (async () => {
      try {
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
          activeKeys.map(k =>
            ConnectionLockManager.runWithLock(
              k.id,
              'Position History Sync',
              () => positionService.fetchWithCache(k),
              { connectionLabel: k.label }
            ).catch(err => {
              LogManager.warn('UnifiedSyncManager', `Position sync failed for ${k.label}:`, err);
              return [];
            })
          )
        );

        const ordersPromise = Promise.all(
          activeKeys.map(k =>
            ConnectionLockManager.runWithLock(
              k.id,
              'Order History Sync',
              () => orderService.fetchWithCache(k),
              { connectionLabel: k.label }
            ).catch(err => {
              LogManager.warn('UnifiedSyncManager', `Order sync failed for ${k.label}:`, err);
              return [];
            })
          )
        );

        // 2. Sync Bybit Transactions
        const bybitPromise = (async () => {
          if (bybitKeys.length === 0) return 0;
          let count = 0;
          for (const key of bybitKeys) {
            try {
              const addedCount = await ConnectionLockManager.runWithLock(
                key.id,
                'Bybit Transaction Sync',
                async () => {
                  const meta = await getBybitTxLogMeta(key.id);
                  if (meta && meta.latestTransactionTime > 0) {
                    const added = await bybitTxService.syncIncremental(key, meta.latestTransactionTime);
                    return added.length;
                  } else {
                    await bybitTxService.syncAll(key);
                    const postMeta = await getBybitTxLogMeta(key.id);
                    return postMeta?.totalRecords || 0;
                  }
                },
                { connectionLabel: key.label }
              );
              count += addedCount;
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
              const addedCount = await ConnectionLockManager.runWithLock(
                key.id,
                'Bitget Transaction Sync',
                async () => {
                  const meta = await getBitgetTxLogMeta(key.id);
                  if (meta && meta.latestTransactionTime > 0) {
                    const added = await bitgetTxService.syncIncremental(key, meta.latestTransactionTime);
                    return added.length;
                  } else {
                    await bitgetTxService.syncAll(key);
                    const postMeta = await getBitgetTxLogMeta(key.id);
                    return postMeta?.totalRecords || 0;
                  }
                },
                { connectionLabel: key.label }
              );
              count += addedCount;
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
              const addedCount = await ConnectionLockManager.runWithLock(
                key.id,
                'OKX Transaction Sync',
                async () => {
                  const meta = await getOkxTxLogMeta(key.id);
                  if (meta && meta.latestTransactionTime > 0) {
                    const added = await okxTxService.syncIncremental(key, meta.latestTransactionTime);
                    return added.length;
                  } else {
                    await okxTxService.syncAll(key);
                    const postMeta = await getOkxTxLogMeta(key.id);
                    return postMeta?.totalRecords || 0;
                  }
                },
                { connectionLabel: key.label }
              );
              count += addedCount;
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
      } finally {
        activeFullSyncPromise = null;
      }
    })();

    return activeFullSyncPromise;
  }

  /**
   * Syncs transaction logs specifically for Bybit, Bitget and OKX
   */
  public static async syncAllTransactions(
    keys: ApiCredentials[],
    onProgress?: (msg: string) => void
  ): Promise<{ bybit: number; bitget: number; okx: number; total: number; elapsedSeconds: number }> {
    if (activeTxSyncPromise) {
      LogManager.warn('UnifiedSyncManager', 'Transaction sync already in progress. Reusing active operation.');
      return activeTxSyncPromise;
    }

    activeTxSyncPromise = (async () => {
      try {
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
              const addedCount = await ConnectionLockManager.runWithLock(
                key.id,
                'Bybit Transaction Sync',
                async () => {
                  const meta = await getBybitTxLogMeta(key.id);
                  if (meta && meta.latestTransactionTime > 0) {
                    const added = await bybitTxService.syncIncremental(key, meta.latestTransactionTime);
                    return added.length;
                  } else {
                    await bybitTxService.syncAll(key);
                    const postMeta = await getBybitTxLogMeta(key.id);
                    return postMeta?.totalRecords || 0;
                  }
                },
                { connectionLabel: key.label }
              );
              count += addedCount;
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
              const addedCount = await ConnectionLockManager.runWithLock(
                key.id,
                'Bitget Transaction Sync',
                async () => {
                  const meta = await getBitgetTxLogMeta(key.id);
                  if (meta && meta.latestTransactionTime > 0) {
                    const added = await bitgetTxService.syncIncremental(key, meta.latestTransactionTime);
                    return added.length;
                  } else {
                    await bitgetTxService.syncAll(key);
                    const postMeta = await getBitgetTxLogMeta(key.id);
                    return postMeta?.totalRecords || 0;
                  }
                },
                { connectionLabel: key.label }
              );
              count += addedCount;
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
              const addedCount = await ConnectionLockManager.runWithLock(
                key.id,
                'OKX Transaction Sync',
                async () => {
                  const meta = await getOkxTxLogMeta(key.id);
                  if (meta && meta.latestTransactionTime > 0) {
                    const added = await okxTxService.syncIncremental(key, meta.latestTransactionTime);
                    return added.length;
                  } else {
                    await okxTxService.syncAll(key);
                    const postMeta = await getOkxTxLogMeta(key.id);
                    return postMeta?.totalRecords || 0;
                  }
                },
                { connectionLabel: key.label }
              );
              count += addedCount;
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
      } finally {
        activeTxSyncPromise = null;
      }
    })();

    return activeTxSyncPromise;
  }

  /**
   * Synchronizes an individual connection (positions, orders, and transactions),
   * strictly guarded by the ConnectionLockManager to eliminate race conditions.
   */
  public static async syncConnection(
    key: ApiCredentials,
    onProgress?: (msg: string) => void
  ): Promise<{ positions: number; orders: number; transactions: number; elapsedSeconds: number }> {
    return ConnectionLockManager.runWithLock(
      key.id,
      `Full Connection Sync (${key.label})`,
      async () => {
        const startTime = performance.now();
        onProgress?.(`Syncing connection "${key.label}"...`);

        const positionService = new PositionHistoryService();
        const orderService = new OrderHistoryService();

        let positionsCount = 0;
        let ordersCount = 0;
        let txCount = 0;

        try {
          const positions = await positionService.fetchWithCache(key);
          positionsCount = positions.length;
        } catch (err: any) {
          LogManager.warn('UnifiedSyncManager', `Connection position sync failed for ${key.label}:`, err?.message || err);
        }

        try {
          const orders = await orderService.fetchWithCache(key);
          ordersCount = orders.length;
        } catch (err: any) {
          LogManager.warn('UnifiedSyncManager', `Connection order sync failed for ${key.label}:`, err?.message || err);
        }

        try {
          if (key.exchange === 'bybit') {
            const bybitTxService = new BybitTransactionService();
            const meta = await getBybitTxLogMeta(key.id);
            if (meta && meta.latestTransactionTime > 0) {
              const added = await bybitTxService.syncIncremental(key, meta.latestTransactionTime);
              txCount = added.length;
            } else {
              await bybitTxService.syncAll(key);
              const postMeta = await getBybitTxLogMeta(key.id);
              txCount = postMeta?.totalRecords || 0;
            }
          } else if (key.exchange === 'bitget') {
            const bitgetTxService = new BitgetTransactionService();
            const meta = await getBitgetTxLogMeta(key.id);
            if (meta && meta.latestTransactionTime > 0) {
              const added = await bitgetTxService.syncIncremental(key, meta.latestTransactionTime);
              txCount = added.length;
            } else {
              await bitgetTxService.syncAll(key);
              const postMeta = await getBitgetTxLogMeta(key.id);
              txCount = postMeta?.totalRecords || 0;
            }
          } else if (key.exchange === 'okx') {
            const okxTxService = new OkxTransactionService();
            const meta = await getOkxTxLogMeta(key.id);
            if (meta && meta.latestTransactionTime > 0) {
              const added = await okxTxService.syncIncremental(key, meta.latestTransactionTime);
              txCount = added.length;
            } else {
              await okxTxService.syncAll(key);
              const postMeta = await getOkxTxLogMeta(key.id);
              txCount = postMeta?.totalRecords || 0;
            }
          }
        } catch (err: any) {
          LogManager.warn('UnifiedSyncManager', `Connection transaction sync failed for ${key.label}:`, err?.message || err);
        }

        const elapsedSeconds = Number(((performance.now() - startTime) / 1000).toFixed(1));
        return { positions: positionsCount, orders: ordersCount, transactions: txCount, elapsedSeconds };
      },
      { connectionLabel: key.label }
    );
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
