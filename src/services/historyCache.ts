import React from 'react';
import { openDB, deleteDB, DBSchema, IDBPDatabase } from 'idb';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';
import {
  UnifiedHistoryPosition,
  UnifiedAssetCategory,
  UnifiedOrder,
  BybitTransactionLogEntry,
  BitgetTransactionLogEntry,
  OkxTransactionLogEntry,
  FundingRateSummary,
  ExchangeName,
  FundingMeta
} from '../types';
import { LogManager } from './LogManager';

export const DB_NAME = 'crypto-dashboard-cache';
export const DB_VERSION = 12;
const HISTORY_STORE = 'positionHistory';
const META_STORE = 'cacheMeta';
const ASSET_META_STORE = 'assetMetadata';
const ORDER_HISTORY_STORE = 'orderHistory';
const ORDER_META_STORE = 'orderCacheMeta';
const BYBIT_REAL_PNL_STORE = 'bybitRealPnL';
const BYBIT_TX_LOG_STORE = 'bybit-transaction-log';
const BYBIT_TX_META_STORE = 'bybit-transaction-meta';
const BITGET_TX_LOG_STORE = 'bitget-transaction-log';
const BITGET_TX_META_STORE = 'bitget-transaction-meta';
const OKX_TX_LOG_STORE = 'okx-transaction-log';
const OKX_TX_META_STORE = 'okx-transaction-meta';
const FUNDING_SUMMARIES_STORE = 'funding-summaries';
const FUNDING_META_STORE = 'funding-meta';


interface CacheDB extends DBSchema {
  positionHistory: {
    key: string;       // UnifiedHistoryPosition.id
    value: UnifiedHistoryPosition;
    indexes: {
      'by-connectionId': string;
      'by-closeUpdateTime': number;
    };
  };
  cacheMeta: {
    key: string;       // connectionId
    value: {
      connectionId: string;
      lastFetchTimestamp: number;  // most recent closeTime cached
      updatedAt: number;          // when cache was last written
    };
  };
  assetMetadata: {
    key: string;      // "exchange_symbol" (e.g. "bybit_BTCUSDT")
    value: {
      id: string; // same as key
      category: UnifiedAssetCategory;
      updatedAt: number; // timestamp of fetch
    };
  };
  orderHistory: {
    key: string;
    value: UnifiedOrder;
    indexes: {
      'by-connectionId': string;
      'by-createdTime': number;
    };
  };
  orderCacheMeta: {
    key: string;
    value: {
      connectionId: string;
      lastFetchTimestamp: number;
      updatedAt: number;
    };
  };
  bybitRealPnL: {
    key: string;       // "connectionId-period"
    value: {
      id: string;      // "connectionId-period"
      connectionId: string;
      period: string;
      pnlData: Record<string, string>;
      updatedAt: number;
    };
  };
  'bybit-transaction-log': {
    key: string;
    value: BybitTransactionLogEntry;
    indexes: {
      'by-connectionId': string;
      'by-transactionTime': number;
      'by-symbol': string;
      'by-type': string;
      'by-currency': string;
      'by-category': string;
    };
  };
  'bybit-transaction-meta': {
    key: string;       // connectionId
    value: {
      connectionId: string;
      oldestTransactionTime: number;
      latestTransactionTime: number;
      totalRecords: number;
      updatedAt: number;
    };
  };
  'bitget-transaction-log': {
    key: string;
    value: BitgetTransactionLogEntry;
    indexes: {
      'by-connectionId': string;
      'by-transactionTime': number;
      'by-symbol': string;
      'by-type': string;
      'by-currency': string;
      'by-category': string;
    };
  };
  'bitget-transaction-meta': {
    key: string;       // connectionId
    value: {
      connectionId: string;
      oldestTransactionTime: number;
      latestTransactionTime: number;
      totalRecords: number;
      updatedAt: number;
    };
  };
  'okx-transaction-log': {
    key: string;
    value: OkxTransactionLogEntry;
    indexes: {
      'by-connectionId': string;
      'by-transactionTime': number;
      'by-symbol': string;
      'by-type': string;
      'by-currency': string;
      'by-category': string;
    };
  };
  'okx-transaction-meta': {
    key: string;       // connectionId
    value: {
      connectionId: string;
      oldestTransactionTime: number;
      latestTransactionTime: number;
      totalRecords: number;
      updatedAt: number;
    };
  };
  'funding-summaries': {
    key: string;
    value: FundingRateSummary;
    indexes: { 'by-exchange': ExchangeName; 'by-symbol': string };
  };
  'funding-meta': {
    key: string; // `${exchange}-${symbol}`
    value: {
      id: string;
      exchange: string;
      symbol: string;
      oldestTimestamp: number;
      latestTimestamp: number;
      updatedAt: number;
    };
  };
}

let dbInstance: IDBPDatabase<CacheDB> | null = null;

function runSchemaUpgrade(db: IDBPDatabase<CacheDB>, oldVersion: number, transaction: any) {
  if (oldVersion < 1 || !db.objectStoreNames.contains(HISTORY_STORE)) {
    // Run fresh set up
    if (!db.objectStoreNames.contains(HISTORY_STORE)) {
      const historyStore = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      historyStore.createIndex('by-connectionId', 'connectionId');
      historyStore.createIndex('by-closeUpdateTime', 'closeUpdateTime');
    }
    if (!db.objectStoreNames.contains(META_STORE)) {
      db.createObjectStore(META_STORE, { keyPath: 'connectionId' });
    }
  } else if (oldVersion < 2) {
    // Upgrade from v1 -> v2
    const historyStore = transaction.objectStore(HISTORY_STORE);
    if ((historyStore.indexNames as any).contains('by-closeTime')) {
      historyStore.deleteIndex('by-closeTime' as any);
    }
    if (!historyStore.indexNames.contains('by-closeUpdateTime')) {
      historyStore.createIndex('by-closeUpdateTime', 'closeUpdateTime');
    }
  }

  if (oldVersion < 3) {
    if (!db.objectStoreNames.contains(ASSET_META_STORE)) {
      db.createObjectStore(ASSET_META_STORE, { keyPath: 'id' });
    }
  }

  if (oldVersion < 4) {
    if (!db.objectStoreNames.contains(ORDER_HISTORY_STORE)) {
      const orderStore = db.createObjectStore(ORDER_HISTORY_STORE, { keyPath: 'id' });
      orderStore.createIndex('by-connectionId', 'connectionId');
      orderStore.createIndex('by-createdTime', 'createdTime');
    }
    if (!db.objectStoreNames.contains(ORDER_META_STORE)) {
      db.createObjectStore(ORDER_META_STORE, { keyPath: 'connectionId' });
    }
  }

  if (oldVersion < 5) {
    if (!db.objectStoreNames.contains(BYBIT_REAL_PNL_STORE)) {
      db.createObjectStore(BYBIT_REAL_PNL_STORE, { keyPath: 'id' });
    }
  }

  if (oldVersion < 8) {
    if (!db.objectStoreNames.contains(BYBIT_TX_LOG_STORE)) {
      const txLogStore = db.createObjectStore(BYBIT_TX_LOG_STORE, { keyPath: 'id' });
      txLogStore.createIndex('by-connectionId', 'connectionId');
      txLogStore.createIndex('by-transactionTime', 'transactionTime');
      txLogStore.createIndex('by-symbol', 'symbol');
      txLogStore.createIndex('by-type', 'type');
      txLogStore.createIndex('by-currency', 'currency');
      txLogStore.createIndex('by-category', 'category');
    }
    if (!db.objectStoreNames.contains(BYBIT_TX_META_STORE)) {
      db.createObjectStore(BYBIT_TX_META_STORE, { keyPath: 'connectionId' });
    }
  }

  if (oldVersion < 9) {
    // 'funding-fees' store is removed from CacheDB type (v10+).
    // Cast to 'any' for this legacy migration block since the store
    // no longer exists in the current schema.
    const u = db as any;
    if (!u.objectStoreNames.contains('funding-fees')) {
      const fundingStore = u.createObjectStore('funding-fees', { keyPath: 'id' });
      fundingStore.createIndex('by-exchange', 'exchange');
      fundingStore.createIndex('by-symbol', 'symbol');
      fundingStore.createIndex('by-timestamp', 'timestamp');
    }
    if (!u.objectStoreNames.contains(FUNDING_META_STORE)) {
      u.createObjectStore(FUNDING_META_STORE, { keyPath: 'id' });
    }
  }

  if (oldVersion < 10) {
    // funding-fees was removed from CacheDB — cast to any for legacy cleanup
    const v10db = db as any;
    if (v10db.objectStoreNames.contains('funding-fees')) {
      v10db.deleteObjectStore('funding-fees');
    }
    if (!db.objectStoreNames.contains(FUNDING_SUMMARIES_STORE)) {
      const summaryStore = db.createObjectStore(FUNDING_SUMMARIES_STORE, { keyPath: 'id' });
      summaryStore.createIndex('by-exchange', 'exchange');
      summaryStore.createIndex('by-symbol', 'symbol');
    }
  }

  // v11 / v12: Ensure Bitget and OKX transaction log stores are created
  if (oldVersion < 12) {
    if (!db.objectStoreNames.contains(BITGET_TX_LOG_STORE)) {
      const bitgetTxStore = db.createObjectStore(BITGET_TX_LOG_STORE, { keyPath: 'id' });
      bitgetTxStore.createIndex('by-connectionId', 'connectionId');
      bitgetTxStore.createIndex('by-transactionTime', 'transactionTime');
      bitgetTxStore.createIndex('by-symbol', 'symbol');
      bitgetTxStore.createIndex('by-type', 'type');
      bitgetTxStore.createIndex('by-currency', 'currency');
      bitgetTxStore.createIndex('by-category', 'category');
    }
    if (!db.objectStoreNames.contains(BITGET_TX_META_STORE)) {
      db.createObjectStore(BITGET_TX_META_STORE, { keyPath: 'connectionId' });
    }
    if (!db.objectStoreNames.contains(OKX_TX_LOG_STORE)) {
      const okxTxStore = db.createObjectStore(OKX_TX_LOG_STORE, { keyPath: 'id' });
      okxTxStore.createIndex('by-connectionId', 'connectionId');
      okxTxStore.createIndex('by-transactionTime', 'transactionTime');
      okxTxStore.createIndex('by-symbol', 'symbol');
      okxTxStore.createIndex('by-type', 'type');
      okxTxStore.createIndex('by-currency', 'currency');
      okxTxStore.createIndex('by-category', 'category');
    }
    if (!db.objectStoreNames.contains(OKX_TX_META_STORE)) {
      db.createObjectStore(OKX_TX_META_STORE, { keyPath: 'connectionId' });
    }
  }
}

/**
 * Global Error Handler for IndexedDB operations.
 * Sets the indexedDBStatus in settingsStore and triggers an alert toast
 * with a "Clear Cache" button as a recovery option.
 */
export function handleIndexedDBError(err: any, context = 'IndexedDB'): void {
  const errMsg = err?.message || err?.name || String(err);
  const errName = err?.name || '';
  LogManager.error('HistoryCache', `IndexedDB error during [${context}]:`, err);

  const isQuota = errName === 'QuotaExceededError' || /quota/i.test(errMsg);
  const isSecurityOrPrivate = errName === 'SecurityError' || /security|permission|private|incognito/i.test(errMsg);
  const isVersion = errName === 'VersionError' || /version/i.test(errMsg);

  let formattedTitle = '⚠️ IndexedDB Error';
  let formattedDesc = `Cache operation failed (${context}): ${errMsg}`;

  if (isQuota) {
    formattedTitle = '⚠️ Storage Quota Exceeded';
    formattedDesc = 'Browser storage quota is full. Use "Clear Cache" in Settings to free space.';
  } else if (isSecurityOrPrivate) {
    formattedTitle = '⚠️ Browser Storage Restricted';
    formattedDesc = 'Private browsing or strict security rules prevent IndexedDB writes.';
  } else if (isVersion) {
    formattedTitle = '⚠️ Database Version Mismatch';
    formattedDesc = 'IndexedDB schema conflict detected. Use "Clear Cache" to rebuild.';
  }

  useSettingsStore.getState().setIndexedDBStatus('error', formattedDesc);

  // Trigger toast with Clear Cache recovery button
  toast(
    (t) =>
      React.createElement(
        'div',
        { className: 'flex flex-col gap-2 max-w-sm' },
        React.createElement(
          'div',
          { className: 'flex items-center gap-1.5' },
          React.createElement('span', { className: 'text-red-400 font-bold text-xs' }, formattedTitle),
        ),
        React.createElement(
          'p',
          { className: 'text-xs text-gray-200 leading-tight' },
          formattedDesc
        ),
        React.createElement(
          'div',
          { className: 'flex items-center gap-2 pt-1' },
          React.createElement(
            'button',
            {
              onClick: async () => {
                toast.dismiss(t.id);
                try {
                  await recoverAndResetIndexedDB();
                } catch (e: any) {
                  LogManager.error('HistoryCache', 'Recovery failed:', e);
                }
              },
              className: 'px-2.5 py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer',
            },
            'Clear Cache'
          ),
          React.createElement(
            'button',
            {
              onClick: () => toast.dismiss(t.id),
              className: 'px-2 py-1 bg-[#2a2b30] hover:bg-[#323339] text-[#8E9299] hover:text-white rounded text-[11px] transition-colors cursor-pointer',
            },
            'Dismiss'
          )
        )
      ),
    {
      id: isQuota ? 'idb-quota-toast' : isSecurityOrPrivate ? 'idb-security-toast' : 'idb-global-conflict-toast',
      duration: 12000,
    }
  );
}

/**
 * Executes a write transaction on IndexedDB with centralized error handling.
 * Automatically catches and classifies QuotaExceededError, SecurityError, etc.
 * If the operation fails, triggers toast + settingsStore error.
 */
export async function executeDBTransaction<T>(
  storeNames: string | string[],
  mode: 'readwrite',
  operation: (tx: any, db: IDBPDatabase<CacheDB>) => Promise<T>,
  context = 'DBTransaction',
  options: { silentFallback?: boolean } = { silentFallback: false }
): Promise<T | undefined> {
  try {
    const db = await getDB();
    const tx = db.transaction(storeNames as any, mode);
    const result = await operation(tx, db);
    await tx.done;
    return result;
  } catch (err: any) {
    handleIndexedDBError(err, context);
    if (!options.silentFallback) {
      throw err;
    }
    return undefined;
  }
}

/**
 * Executes a read query on IndexedDB with centralized error handling and safe fallback.
 */
export async function executeDBRead<T>(
  operation: (db: IDBPDatabase<CacheDB>) => Promise<T>,
  fallbackValue: T,
  context = 'DBRead'
): Promise<T> {
  try {
    const db = await getDB();
    return await operation(db);
  } catch (err: any) {
    handleIndexedDBError(err, context);
    return fallbackValue;
  }
}

/**
 * Recovers from corrupted, incompatible, or VersionError states
 * by closing any hanging handles, purging the database, rebuilding it
 * fresh at DB_VERSION, and notifying settings.
 */
export async function recoverAndResetIndexedDB(): Promise<void> {
  useSettingsStore.getState().setIndexedDBStatus('recovering', null);
  try {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
    await deleteDB(DB_NAME);
    dbInstance = await openDB<CacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        runSchemaUpgrade(db, oldVersion, transaction);
      },
    });
    useSettingsStore.getState().clearIndexedDBError();
    useSettingsStore.getState().bumpHistoryCacheVersion();
    toast.success('IndexedDB cache wiped and reset successfully!', { id: 'idb-reset-success' });
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    useSettingsStore.getState().setIndexedDBStatus('error', errMsg);
    LogManager.error('HistoryCache', 'Failed to recover IndexedDB:', err);
    toast.error(`Failed to reset IndexedDB: ${errMsg}`, { id: 'idb-reset-fail' });
    throw err;
  }
}

/**
 * Live health check to verify current database connectivity, version, and status.
 */
export async function checkIndexedDBHealth(): Promise<{ status: 'healthy' | 'error'; error: string | null; version: number }> {
  try {
    const db = await getDB();
    const ver = db.version;
    useSettingsStore.getState().setIndexedDBStatus('healthy', null);
    return { status: 'healthy', error: null, version: ver };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    handleIndexedDBError(err, 'HealthCheck');
    return { status: 'error', error: errMsg, version: DB_VERSION };
  }
}

async function getDB(): Promise<IDBPDatabase<CacheDB>> {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await openDB<CacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        runSchemaUpgrade(db, oldVersion, transaction);
      },
      blocked() {
        LogManager.warn('HistoryCache', 'IndexedDB upgrade blocked by an open tab.');
      },
      blocking() {
        if (dbInstance) {
          dbInstance.close();
          dbInstance = null;
        }
      },
    });
    useSettingsStore.getState().setIndexedDBStatus('healthy', null);
    return dbInstance;
  } catch (err: any) {
    // Self-healing: If user browser has a higher version or corrupted schema triggering VersionError,
    // safely reset cache database so the application does not break permanently.
    if (err?.name === 'VersionError' || err?.message?.includes('version')) {
      LogManager.error('HistoryCache', 'IndexedDB VersionError detected. Rebuilding cache database to recover.', err);
      try {
        await deleteDB(DB_NAME);
        dbInstance = await openDB<CacheDB>(DB_NAME, DB_VERSION, {
          upgrade(db, oldVersion, _newVersion, transaction) {
            runSchemaUpgrade(db, oldVersion, transaction);
          },
        });
        useSettingsStore.getState().setIndexedDBStatus('healthy', null);
        return dbInstance;
      } catch (recoverErr) {
        handleIndexedDBError(recoverErr, 'VersionRecovery');
        throw recoverErr;
      }
    }
    handleIndexedDBError(err, 'openDB');
    throw err;
  }
}

/**
 * Save Asset Metadata
 */
export async function saveAssetMetadata(id: string, category: UnifiedAssetCategory): Promise<void> {
  await executeDBTransaction(
    ASSET_META_STORE,
    'readwrite',
    async (tx) => {
      await tx.objectStore(ASSET_META_STORE).put({
        id,
        category,
        updatedAt: Date.now(),
      });
    },
    'saveAssetMetadata'
  );
}

/**
 * Get Asset Metadata
 */
export async function getAssetMetadata(id: string): Promise<{ id: string, category: UnifiedAssetCategory, updatedAt: number } | undefined> {
  return executeDBRead(
    (db) => db.get(ASSET_META_STORE, id),
    undefined,
    'getAssetMetadata'
  );
}

/**
 * Get the total number of cached Asset Metadata entries.
 */
export async function getAssetMetadataCacheSize(): Promise<number> {
  return executeDBRead(
    (db) => db.count(ASSET_META_STORE),
    0,
    'getAssetMetadataCacheSize'
  );
}

/**
 * Clear cached asset metadata
 */
export async function clearAssetMetadataCache(): Promise<void> {
  await executeDBTransaction(
    ASSET_META_STORE,
    'readwrite',
    async (tx) => {
      await tx.objectStore(ASSET_META_STORE).clear();
    },
    'clearAssetMetadataCache'
  );
}


/**
 * Get all cached history positions for a given connection.
 */
export async function getCachedHistory(connectionId: string): Promise<UnifiedHistoryPosition[]> {
  return executeDBRead(
    async (db) => {
      const all = await db.getAllFromIndex(HISTORY_STORE, 'by-connectionId', connectionId);
      return all.sort((a, b) => b.closeUpdateTime - a.closeUpdateTime);
    },
    [],
    'getCachedHistory'
  );
}

/**
 * Get all cached history regardless of connection.
 */
export async function getAllCachedHistory(): Promise<UnifiedHistoryPosition[]> {
  return executeDBRead(
    async (db) => {
      const all = await db.getAll(HISTORY_STORE);
      return all.sort((a, b) => b.closeUpdateTime - a.closeUpdateTime);
    },
    [],
    'getAllCachedHistory'
  );
}

/**
 * Save (upsert) a batch of history positions into the cache.
 * Uses a single transaction for performance and wraps in executeDBTransaction.
 */
export async function saveCachedHistory(positions: UnifiedHistoryPosition[]): Promise<void> {
  if (positions.length === 0) return;

  await executeDBTransaction(
    HISTORY_STORE,
    'readwrite',
    async (tx) => {
      const store = tx.objectStore(HISTORY_STORE);
      for (const pos of positions) {
        await store.put(pos);
      }
    },
    'saveCachedHistory'
  );
}

/**
 * Get the most recent closeTime that we have cached for a given connection.
 * Returns 0 if no cache metadata exists (first fetch).
 */
export async function getLastFetchTimestamp(connectionId: string): Promise<number> {
  return executeDBRead(
    async (db) => {
      const meta = await db.get(META_STORE, connectionId);
      return meta?.lastFetchTimestamp || 0;
    },
    0,
    'getLastFetchTimestamp'
  );
}

/**
 * Update the cache metadata after a successful fetch.
 */
export async function updateCacheMeta(connectionId: string, latestCloseTime: number): Promise<void> {
  await executeDBTransaction(
    META_STORE,
    'readwrite',
    async (tx) => {
      await tx.objectStore(META_STORE).put({
        connectionId,
        lastFetchTimestamp: latestCloseTime,
        updatedAt: Date.now(),
      });
    },
    'updateCacheMeta'
  );
}

export async function clearAllCache(): Promise<void> {
  try {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
    await deleteDB(DB_NAME);
    useSettingsStore.getState().clearIndexedDBError();
  } catch (err: any) {
    handleIndexedDBError(err, 'clearAllCache');
  }
}

/**
 * Clear position history cache only
 */
export async function clearPositionHistoryCache(): Promise<void> {
  await executeDBTransaction(
    [HISTORY_STORE, META_STORE],
    'readwrite',
    async (tx) => {
      await tx.objectStore(HISTORY_STORE).clear();
      await tx.objectStore(META_STORE).clear();
    },
    'clearPositionHistoryCache'
  );
}

/**
 * Clear order history cache only
 */
export async function clearOrderHistoryCache(): Promise<void> {
  await executeDBTransaction(
    [ORDER_HISTORY_STORE, ORDER_META_STORE],
    'readwrite',
    async (tx) => {
      await tx.objectStore(ORDER_HISTORY_STORE).clear();
      await tx.objectStore(ORDER_META_STORE).clear();
    },
    'clearOrderHistoryCache'
  );
}

/**
 * Clear Bybit transaction log cache only
 */
export async function clearBybitTxLogCache(): Promise<void> {
  await executeDBTransaction(
    [BYBIT_TX_LOG_STORE, BYBIT_TX_META_STORE],
    'readwrite',
    async (tx) => {
      await tx.objectStore(BYBIT_TX_LOG_STORE).clear();
      await tx.objectStore(BYBIT_TX_META_STORE).clear();
    },
    'clearBybitTxLogCache'
  );
}

/**
 * Clear Bitget transaction log cache only
 */
export async function clearBitgetTxLogCache(): Promise<void> {
  await executeDBTransaction(
    [BITGET_TX_LOG_STORE, BITGET_TX_META_STORE],
    'readwrite',
    async (tx) => {
      await tx.objectStore(BITGET_TX_LOG_STORE).clear();
      await tx.objectStore(BITGET_TX_META_STORE).clear();
    },
    'clearBitgetTxLogCache'
  );
}

/**
 * Clear OKX transaction log cache only
 */
export async function clearOkxTxLogCache(): Promise<void> {
  await executeDBTransaction(
    [OKX_TX_LOG_STORE, OKX_TX_META_STORE],
    'readwrite',
    async (tx) => {
      await tx.objectStore(OKX_TX_LOG_STORE).clear();
      await tx.objectStore(OKX_TX_META_STORE).clear();
    },
    'clearOkxTxLogCache'
  );
}

/**
 * Clear all transaction logs across Bybit, Bitget, and OKX
 */
export async function clearAllTransactionLogsCache(): Promise<void> {
  await executeDBTransaction(
    [
      BYBIT_TX_LOG_STORE, BYBIT_TX_META_STORE,
      BITGET_TX_LOG_STORE, BITGET_TX_META_STORE,
      OKX_TX_LOG_STORE, OKX_TX_META_STORE
    ],
    'readwrite',
    async (tx) => {
      await tx.objectStore(BYBIT_TX_LOG_STORE).clear();
      await tx.objectStore(BYBIT_TX_META_STORE).clear();
      await tx.objectStore(BITGET_TX_LOG_STORE).clear();
      await tx.objectStore(BITGET_TX_META_STORE).clear();
      await tx.objectStore(OKX_TX_LOG_STORE).clear();
      await tx.objectStore(OKX_TX_META_STORE).clear();
    },
    'clearAllTransactionLogsCache'
  );
}

/**
 * Get total counts across individual stores
 */
export async function getOrderCacheSize(): Promise<number> {
  return executeDBRead((db) => db.count(ORDER_HISTORY_STORE), 0, 'getOrderCacheSize');
}

export async function getBybitTxLogTotalCount(): Promise<number> {
  return executeDBRead((db) => db.count(BYBIT_TX_LOG_STORE), 0, 'getBybitTxLogTotalCount');
}

export async function getBitgetTxLogTotalCount(): Promise<number> {
  return executeDBRead((db) => db.count(BITGET_TX_LOG_STORE), 0, 'getBitgetTxLogTotalCount');
}

export async function getOkxTxLogTotalCount(): Promise<number> {
  return executeDBRead((db) => db.count(OKX_TX_LOG_STORE), 0, 'getOkxTxLogTotalCount');
}

export async function getFundingSummariesCount(): Promise<number> {
  return executeDBRead((db) => db.count('funding-summaries'), 0, 'getFundingSummariesCount');
}

export interface ComprehensiveCacheStats {
  positionHistoryCount: number;
  orderHistoryCount: number;
  bybitTxCount: number;
  bitgetTxCount: number;
  okxTxCount: number;
  totalTxCount: number;
  fundingCount: number;
  assetMetaCount: number;
  totalRecords: number;
}

export async function getComprehensiveCacheStats(): Promise<ComprehensiveCacheStats> {
  try {
    const db = await getDB();
    const [
      positionHistoryCount,
      orderHistoryCount,
      bybitTxCount,
      bitgetTxCount,
      okxTxCount,
      fundingCount,
      assetMetaCount,
    ] = await Promise.all([
      db.count(HISTORY_STORE).catch(() => 0),
      db.count(ORDER_HISTORY_STORE).catch(() => 0),
      db.count(BYBIT_TX_LOG_STORE).catch(() => 0),
      db.count(BITGET_TX_LOG_STORE).catch(() => 0),
      db.count(OKX_TX_LOG_STORE).catch(() => 0),
      db.count('funding-summaries').catch(() => 0),
      db.count(ASSET_META_STORE).catch(() => 0),
    ]);

    const totalTxCount = bybitTxCount + bitgetTxCount + okxTxCount;
    const totalRecords =
      positionHistoryCount +
      orderHistoryCount +
      totalTxCount +
      fundingCount +
      assetMetaCount;

    return {
      positionHistoryCount,
      orderHistoryCount,
      bybitTxCount,
      bitgetTxCount,
      okxTxCount,
      totalTxCount,
      fundingCount,
      assetMetaCount,
      totalRecords,
    };
  } catch (err) {
    LogManager.error('HistoryCache', 'Error calculating comprehensive stats:', err);
    return {
      positionHistoryCount: 0,
      orderHistoryCount: 0,
      bybitTxCount: 0,
      bitgetTxCount: 0,
      okxTxCount: 0,
      totalTxCount: 0,
      fundingCount: 0,
      assetMetaCount: 0,
      totalRecords: 0,
    };
  }
}

/**
 * Get the total number of cached history positions.
 */
export async function getCacheSize(): Promise<number> {
  return executeDBRead((db) => db.count(HISTORY_STORE), 0, 'getCacheSize');
}

// ------------------------------------------------------------------
// ORDER HISTORY
// ------------------------------------------------------------------

export async function getCachedOrders(connectionId: string): Promise<UnifiedOrder[]> {
  return executeDBRead(
    async (db) => {
      const all = await db.getAllFromIndex(ORDER_HISTORY_STORE, 'by-connectionId', connectionId);
      return all.sort((a, b) => b.createdTime - a.createdTime);
    },
    [],
    'getCachedOrders'
  );
}

export async function saveCachedOrders(orders: UnifiedOrder[]): Promise<void> {
  if (orders.length === 0) return;

  await executeDBTransaction(
    ORDER_HISTORY_STORE,
    'readwrite',
    async (tx) => {
      const store = tx.objectStore(ORDER_HISTORY_STORE);
      for (const ord of orders) {
        await store.put(ord);
      }
    },
    'saveCachedOrders'
  );
}

export async function getLastOrderFetchTimestamp(connectionId: string): Promise<number> {
  return executeDBRead(
    async (db) => {
      const meta = await db.get(ORDER_META_STORE, connectionId);
      return meta?.lastFetchTimestamp || 0;
    },
    0,
    'getLastOrderFetchTimestamp'
  );
}

export async function updateOrderCacheMeta(connectionId: string, latestCreatedTime: number): Promise<void> {
  await executeDBTransaction(
    ORDER_META_STORE,
    'readwrite',
    async (tx) => {
      await tx.objectStore(ORDER_META_STORE).put({
        connectionId,
        lastFetchTimestamp: latestCreatedTime,
        updatedAt: Date.now(),
      });
    },
    'updateOrderCacheMeta'
  );
}

// ------------------------------------------------------------------
// BYBIT REAL PNL CACHE
// ------------------------------------------------------------------

export async function saveBybitRealPnLCache(
  connectionId: string,
  period: string,
  pnlData: Record<string, string>
): Promise<void> {
  const id = `${connectionId}-${period}`;
  await executeDBTransaction(
    BYBIT_REAL_PNL_STORE,
    'readwrite',
    async (tx) => {
      await tx.objectStore(BYBIT_REAL_PNL_STORE).put({
        id,
        connectionId,
        period,
        pnlData,
        updatedAt: Date.now(),
      });
    },
    'saveBybitRealPnLCache'
  );
}

export async function getBybitRealPnLCache(
  connectionId: string,
  period: string
): Promise<Record<string, string> | undefined> {
  const id = `${connectionId}-${period}`;
  return executeDBRead(
    async (db) => {
      const record = await db.get(BYBIT_REAL_PNL_STORE, id);
      return record?.pnlData;
    },
    undefined,
    'getBybitRealPnLCache'
  );
}

export async function clearBybitRealPnLCache(): Promise<void> {
  await executeDBTransaction(
    BYBIT_REAL_PNL_STORE,
    'readwrite',
    async (tx) => {
      await tx.objectStore(BYBIT_REAL_PNL_STORE).clear();
    },
    'clearBybitRealPnLCache'
  );
}

// ------------------------------------------------------------------
// BYBIT TRANSACTION LOG CACHE
// ------------------------------------------------------------------

export async function getBybitTxLogCache(connectionId: string): Promise<BybitTransactionLogEntry[]> {
  return executeDBRead(
    async (db) => {
      const all = await db.getAllFromIndex(BYBIT_TX_LOG_STORE, 'by-connectionId', connectionId);
      return all.sort((a, b) => b.transactionTime - a.transactionTime);
    },
    [],
    'getBybitTxLogCache'
  );
}

export async function getAllBybitTxLogCache(): Promise<BybitTransactionLogEntry[]> {
  return executeDBRead(
    async (db) => {
      const all = await db.getAll(BYBIT_TX_LOG_STORE);
      return all.sort((a, b) => b.transactionTime - a.transactionTime);
    },
    [],
    'getAllBybitTxLogCache'
  );
}

export async function saveBybitTxLogCache(entries: BybitTransactionLogEntry[]): Promise<void> {
  if (entries.length === 0) return;
  await executeDBTransaction(
    BYBIT_TX_LOG_STORE,
    'readwrite',
    async (tx) => {
      const store = tx.objectStore(BYBIT_TX_LOG_STORE);
      for (const entry of entries) {
        await store.put(entry);
      }
    },
    'saveBybitTxLogCache'
  );
}

export async function getBybitTxLogMeta(connectionId: string): Promise<{
  connectionId: string;
  oldestTransactionTime: number;
  latestTransactionTime: number;
  totalRecords: number;
  updatedAt: number;
} | undefined> {
  return executeDBRead(
    (db) => db.get(BYBIT_TX_META_STORE, connectionId),
    undefined,
    'getBybitTxLogMeta'
  );
}

export async function updateBybitTxLogMeta(
  connectionId: string,
  oldestTransactionTime: number,
  latestTransactionTime: number,
  totalRecords: number
): Promise<void> {
  await executeDBTransaction(
    BYBIT_TX_META_STORE,
    'readwrite',
    async (tx) => {
      await tx.objectStore(BYBIT_TX_META_STORE).put({
        connectionId,
        oldestTransactionTime,
        latestTransactionTime,
        totalRecords,
        updatedAt: Date.now(),
      });
    },
    'updateBybitTxLogMeta'
  );
}

export async function getBybitTxLogCount(connectionId: string): Promise<number> {
  return executeDBRead(
    (db) => db.countFromIndex(BYBIT_TX_LOG_STORE, 'by-connectionId', connectionId),
    0,
    'getBybitTxLogCount'
  );
}

// ------------------------------------------------------------------
// BITGET TRANSACTION LOG CACHE
// ------------------------------------------------------------------

export async function getBitgetTxLogCache(connectionId: string): Promise<BitgetTransactionLogEntry[]> {
  return executeDBRead(
    async (db) => {
      const all = await db.getAllFromIndex(BITGET_TX_LOG_STORE, 'by-connectionId', connectionId);
      return all.sort((a, b) => b.transactionTime - a.transactionTime);
    },
    [],
    'getBitgetTxLogCache'
  );
}

export async function getAllBitgetTxLogCache(): Promise<BitgetTransactionLogEntry[]> {
  return executeDBRead(
    async (db) => {
      const all = await db.getAll(BITGET_TX_LOG_STORE);
      return all.sort((a, b) => b.transactionTime - a.transactionTime);
    },
    [],
    'getAllBitgetTxLogCache'
  );
}

export async function saveBitgetTxLogCache(entries: BitgetTransactionLogEntry[]): Promise<void> {
  if (entries.length === 0) return;
  await executeDBTransaction(
    BITGET_TX_LOG_STORE,
    'readwrite',
    async (tx) => {
      const store = tx.objectStore(BITGET_TX_LOG_STORE);
      for (const entry of entries) {
        await store.put(entry);
      }
    },
    'saveBitgetTxLogCache'
  );
}

export async function getBitgetTxLogMeta(connectionId: string): Promise<{
  connectionId: string;
  oldestTransactionTime: number;
  latestTransactionTime: number;
  totalRecords: number;
  updatedAt: number;
} | undefined> {
  return executeDBRead(
    (db) => db.get(BITGET_TX_META_STORE, connectionId),
    undefined,
    'getBitgetTxLogMeta'
  );
}

export async function updateBitgetTxLogMeta(
  connectionId: string,
  oldestTransactionTime: number,
  latestTransactionTime: number,
  totalRecords: number
): Promise<void> {
  await executeDBTransaction(
    BITGET_TX_META_STORE,
    'readwrite',
    async (tx) => {
      await tx.objectStore(BITGET_TX_META_STORE).put({
        connectionId,
        oldestTransactionTime,
        latestTransactionTime,
        totalRecords,
        updatedAt: Date.now(),
      });
    },
    'updateBitgetTxLogMeta'
  );
}

export async function getBitgetTxLogCount(connectionId: string): Promise<number> {
  return executeDBRead(
    (db) => db.countFromIndex(BITGET_TX_LOG_STORE, 'by-connectionId', connectionId),
    0,
    'getBitgetTxLogCount'
  );
}

// ------------------------------------------------------------------
// OKX TRANSACTION LOG CACHE
// ------------------------------------------------------------------

export async function getOkxTxLogCache(connectionId: string): Promise<OkxTransactionLogEntry[]> {
  return executeDBRead(
    async (db) => {
      const all = await db.getAllFromIndex(OKX_TX_LOG_STORE, 'by-connectionId', connectionId);
      return all.sort((a, b) => b.transactionTime - a.transactionTime);
    },
    [],
    'getOkxTxLogCache'
  );
}

export async function getAllOkxTxLogCache(): Promise<OkxTransactionLogEntry[]> {
  return executeDBRead(
    async (db) => {
      const all = await db.getAll(OKX_TX_LOG_STORE);
      return all.sort((a, b) => b.transactionTime - a.transactionTime);
    },
    [],
    'getAllOkxTxLogCache'
  );
}

export async function saveOkxTxLogCache(entries: OkxTransactionLogEntry[]): Promise<void> {
  if (entries.length === 0) return;
  await executeDBTransaction(
    OKX_TX_LOG_STORE,
    'readwrite',
    async (tx) => {
      const store = tx.objectStore(OKX_TX_LOG_STORE);
      for (const entry of entries) {
        await store.put(entry);
      }
    },
    'saveOkxTxLogCache'
  );
}

export async function getOkxTxLogMeta(connectionId: string): Promise<{
  connectionId: string;
  oldestTransactionTime: number;
  latestTransactionTime: number;
  totalRecords: number;
  updatedAt: number;
} | undefined> {
  return executeDBRead(
    (db) => db.get(OKX_TX_META_STORE, connectionId),
    undefined,
    'getOkxTxLogMeta'
  );
}

export async function updateOkxTxLogMeta(
  connectionId: string,
  oldestTransactionTime: number,
  latestTransactionTime: number,
  totalRecords: number
): Promise<void> {
  await executeDBTransaction(
    OKX_TX_META_STORE,
    'readwrite',
    async (tx) => {
      await tx.objectStore(OKX_TX_META_STORE).put({
        connectionId,
        oldestTransactionTime,
        latestTransactionTime,
        totalRecords,
        updatedAt: Date.now(),
      });
    },
    'updateOkxTxLogMeta'
  );
}

export async function getOkxTxLogCount(connectionId: string): Promise<number> {
  return executeDBRead(
    (db) => db.countFromIndex(OKX_TX_LOG_STORE, 'by-connectionId', connectionId),
    0,
    'getOkxTxLogCount'
  );
}

// ------------------------------------------------------------------
// FUNDING SUMMARIES CACHE
// ------------------------------------------------------------------

export async function saveFundingSummary(summary: FundingRateSummary): Promise<void> {
  await executeDBTransaction(
    'funding-summaries',
    'readwrite',
    async (tx) => {
      await tx.objectStore('funding-summaries').put(summary);
    },
    'saveFundingSummary'
  );
}

export async function getAllFundingSummaries(): Promise<FundingRateSummary[]> {
  return executeDBRead((db) => db.getAll('funding-summaries'), [], 'getAllFundingSummaries');
}

export async function getFundingSummaryByKey(exchange: ExchangeName, symbol: string): Promise<FundingRateSummary | undefined> {
  return executeDBRead(
    (db) => db.get('funding-summaries', `${exchange}-${symbol}`),
    undefined,
    'getFundingSummaryByKey'
  );
}

export async function clearFundingSummariesCache(): Promise<void> {
  await executeDBTransaction(
    ['funding-summaries', 'funding-meta'],
    'readwrite',
    async (tx) => {
      await tx.objectStore('funding-summaries').clear();
      await tx.objectStore('funding-meta').clear();
    },
    'clearFundingSummariesCache'
  );
}

/**
 * Batch-write all summaries and their metadata in a single transaction.
 * Much more efficient than 500+ individual transactions during initial sync.
 */
export async function saveFundingSummariesBatch(summaries: FundingRateSummary[]): Promise<void> {
  if (summaries.length === 0) return;
  await executeDBTransaction(
    ['funding-summaries', 'funding-meta'],
    'readwrite',
    async (tx) => {
      const summaryStore = tx.objectStore('funding-summaries');
      const metaStore = tx.objectStore('funding-meta');
      for (const s of summaries) {
        await summaryStore.put(s);
        await metaStore.put({
          id: `${s.exchange}-${s.symbol}`,
          exchange: s.exchange,
          symbol: s.symbol,
          oldestTimestamp: Number(s.lastFundingTime),
          latestTimestamp: Number(s.lastFundingTime),
          updatedAt: Date.now(),
        });
      }
    },
    'saveFundingSummariesBatch'
  );
}

export async function getFundingMeta(exchange: string, symbol: string): Promise<FundingMeta | undefined> {
  return executeDBRead<FundingMeta | undefined>(
    async (db) => {
      const meta = await db.get(FUNDING_META_STORE, `${exchange}-${symbol}`);
      return meta as FundingMeta | undefined;
    },
    undefined,
    'getFundingMeta'
  );
}

/**
 * Update the funding metadata for a symbol.
 * Simplified signature: only `latestTimestamp` is needed for the 8h freshness guard.
 * Both `oldestTimestamp` and `latestTimestamp` are set to the same value for schema compatibility.
 */
export async function updateFundingMeta(
  exchange: string,
  symbol: string,
  latestTimestamp: number
): Promise<void> {
  await executeDBTransaction(
    FUNDING_META_STORE,
    'readwrite',
    async (tx) => {
      await tx.objectStore(FUNDING_META_STORE).put({
        id: `${exchange}-${symbol}`,
        exchange,
        symbol,
        oldestTimestamp: latestTimestamp,
        latestTimestamp,
        updatedAt: Date.now(),
      });
    },
    'updateFundingMeta'
  );
}

