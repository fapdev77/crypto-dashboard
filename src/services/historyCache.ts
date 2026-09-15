import { openDB, deleteDB, DBSchema, IDBPDatabase } from 'idb';
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

const DB_NAME = 'crypto-dashboard-cache';
const DB_VERSION = 11;
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

async function getDB(): Promise<IDBPDatabase<CacheDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<CacheDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
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
        const summaryStore = db.createObjectStore('funding-summaries', { keyPath: 'id' });
        summaryStore.createIndex('by-exchange', 'exchange');
        summaryStore.createIndex('by-symbol', 'symbol');
      }

      if (oldVersion < 11) {
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
    },
  });

  return dbInstance;
}

/**
 * Save Asset Metadata
 */
export async function saveAssetMetadata(id: string, category: UnifiedAssetCategory): Promise<void> {
  const db = await getDB();
  await db.put(ASSET_META_STORE, {
    id,
    category,
    updatedAt: Date.now(),
  });
}

/**
 * Get Asset Metadata
 */
export async function getAssetMetadata(id: string): Promise<{ id: string, category: UnifiedAssetCategory, updatedAt: number } | undefined> {
  const db = await getDB();
  return db.get(ASSET_META_STORE, id);
}

/**
 * Get the total number of cached Asset Metadata entries.
 */
export async function getAssetMetadataCacheSize(): Promise<number> {
  const db = await getDB();
  return db.count(ASSET_META_STORE);
}

/**
 * Clear cached asset metadata
 */
export async function clearAssetMetadataCache(): Promise<void> {
  const db = await getDB();
  await db.clear(ASSET_META_STORE);
}


/**
 * Get all cached history positions for a given connection.
 */
export async function getCachedHistory(connectionId: string): Promise<UnifiedHistoryPosition[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(HISTORY_STORE, 'by-connectionId', connectionId);
  return all.sort((a, b) => b.closeUpdateTime - a.closeUpdateTime);
}

/**
 * Get all cached history regardless of connection.
 */
export async function getAllCachedHistory(): Promise<UnifiedHistoryPosition[]> {
  const db = await getDB();
  const all = await db.getAll(HISTORY_STORE);
  return all.sort((a, b) => b.closeUpdateTime - a.closeUpdateTime);
}

/**
 * Save (upsert) a batch of history positions into the cache.
 * Uses a single transaction for performance.
 */
export async function saveCachedHistory(positions: UnifiedHistoryPosition[]): Promise<void> {
  if (positions.length === 0) return;

  const db = await getDB();
  const tx = db.transaction(HISTORY_STORE, 'readwrite');
  const store = tx.objectStore(HISTORY_STORE);

  for (const pos of positions) {
    await store.put(pos);
  }

  await tx.done;
}

/**
 * Get the most recent closeTime that we have cached for a given connection.
 * Returns 0 if no cache metadata exists (first fetch).
 */
export async function getLastFetchTimestamp(connectionId: string): Promise<number> {
  const db = await getDB();
  const meta = await db.get(META_STORE, connectionId);
  return meta?.lastFetchTimestamp || 0;
}

/**
 * Update the cache metadata after a successful fetch.
 */
export async function updateCacheMeta(connectionId: string, latestCloseTime: number): Promise<void> {
  const db = await getDB();
  await db.put(META_STORE, {
    connectionId,
    lastFetchTimestamp: latestCloseTime,
    updatedAt: Date.now(),
  });
}

export async function clearAllCache(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  await deleteDB(DB_NAME);
}

/**
 * Clear position history cache only
 */
export async function clearPositionHistoryCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([HISTORY_STORE, META_STORE], 'readwrite');
  await tx.objectStore(HISTORY_STORE).clear();
  await tx.objectStore(META_STORE).clear();
  await tx.done;
}

/**
 * Clear order history cache only
 */
export async function clearOrderHistoryCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([ORDER_HISTORY_STORE, ORDER_META_STORE], 'readwrite');
  await tx.objectStore(ORDER_HISTORY_STORE).clear();
  await tx.objectStore(ORDER_META_STORE).clear();
  await tx.done;
}

/**
 * Clear Bybit transaction log cache only
 */
export async function clearBybitTxLogCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([BYBIT_TX_LOG_STORE, BYBIT_TX_META_STORE], 'readwrite');
  await tx.objectStore(BYBIT_TX_LOG_STORE).clear();
  await tx.objectStore(BYBIT_TX_META_STORE).clear();
  await tx.done;
}

/**
 * Clear Bitget transaction log cache only
 */
export async function clearBitgetTxLogCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([BITGET_TX_LOG_STORE, BITGET_TX_META_STORE], 'readwrite');
  await tx.objectStore(BITGET_TX_LOG_STORE).clear();
  await tx.objectStore(BITGET_TX_META_STORE).clear();
  await tx.done;
}

/**
 * Clear OKX transaction log cache only
 */
export async function clearOkxTxLogCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([OKX_TX_LOG_STORE, OKX_TX_META_STORE], 'readwrite');
  await tx.objectStore(OKX_TX_LOG_STORE).clear();
  await tx.objectStore(OKX_TX_META_STORE).clear();
  await tx.done;
}

/**
 * Clear all transaction logs across Bybit, Bitget, and OKX
 */
export async function clearAllTransactionLogsCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([
    BYBIT_TX_LOG_STORE, BYBIT_TX_META_STORE,
    BITGET_TX_LOG_STORE, BITGET_TX_META_STORE,
    OKX_TX_LOG_STORE, OKX_TX_META_STORE
  ], 'readwrite');
  await tx.objectStore(BYBIT_TX_LOG_STORE).clear();
  await tx.objectStore(BYBIT_TX_META_STORE).clear();
  await tx.objectStore(BITGET_TX_LOG_STORE).clear();
  await tx.objectStore(BITGET_TX_META_STORE).clear();
  await tx.objectStore(OKX_TX_LOG_STORE).clear();
  await tx.objectStore(OKX_TX_META_STORE).clear();
  await tx.done;
}

/**
 * Get total counts across individual stores
 */
export async function getOrderCacheSize(): Promise<number> {
  const db = await getDB();
  return db.count(ORDER_HISTORY_STORE);
}

export async function getBybitTxLogTotalCount(): Promise<number> {
  const db = await getDB();
  return db.count(BYBIT_TX_LOG_STORE);
}

export async function getBitgetTxLogTotalCount(): Promise<number> {
  const db = await getDB();
  return db.count(BITGET_TX_LOG_STORE);
}

export async function getOkxTxLogTotalCount(): Promise<number> {
  const db = await getDB();
  return db.count(OKX_TX_LOG_STORE);
}

export async function getFundingSummariesCount(): Promise<number> {
  const db = await getDB();
  return db.count('funding-summaries');
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
  const db = await getDB();
  return db.count(HISTORY_STORE);
}

// ------------------------------------------------------------------
// ORDER HISTORY
// ------------------------------------------------------------------

export async function getCachedOrders(connectionId: string): Promise<UnifiedOrder[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(ORDER_HISTORY_STORE, 'by-connectionId', connectionId);
  return all.sort((a, b) => b.createdTime - a.createdTime);
}

export async function saveCachedOrders(orders: UnifiedOrder[]): Promise<void> {
  if (orders.length === 0) return;
  const db = await getDB();
  const tx = db.transaction(ORDER_HISTORY_STORE, 'readwrite');
  const store = tx.objectStore(ORDER_HISTORY_STORE);
  for (const ord of orders) {
    await store.put(ord);
  }
  await tx.done;
}

export async function getLastOrderFetchTimestamp(connectionId: string): Promise<number> {
  const db = await getDB();
  const meta = await db.get(ORDER_META_STORE, connectionId);
  return meta?.lastFetchTimestamp || 0;
}

export async function updateOrderCacheMeta(connectionId: string, latestCreatedTime: number): Promise<void> {
  const db = await getDB();
  await db.put(ORDER_META_STORE, {
    connectionId,
    lastFetchTimestamp: latestCreatedTime,
    updatedAt: Date.now(),
  });
}

// ------------------------------------------------------------------
// BYBIT REAL PNL CACHE
// ------------------------------------------------------------------

export async function saveBybitRealPnLCache(
  connectionId: string,
  period: string,
  pnlData: Record<string, string>
): Promise<void> {
  const db = await getDB();
  const id = `${connectionId}-${period}`;
  await db.put(BYBIT_REAL_PNL_STORE, {
    id,
    connectionId,
    period,
    pnlData,
    updatedAt: Date.now(),
  });
}

export async function getBybitRealPnLCache(
  connectionId: string,
  period: string
): Promise<Record<string, string> | undefined> {
  const db = await getDB();
  const id = `${connectionId}-${period}`;
  try {
    const record = await db.get(BYBIT_REAL_PNL_STORE, id);
    return record?.pnlData;
  } catch (err) {
    LogManager.warn('HistoryCache', 'Error reading Bybit Real PnL cache:', err);
    return undefined;
  }
}

export async function clearBybitRealPnLCache(): Promise<void> {
  const db = await getDB();
  await db.clear(BYBIT_REAL_PNL_STORE);
}

// ------------------------------------------------------------------
// BYBIT TRANSACTION LOG CACHE
// ------------------------------------------------------------------

export async function getBybitTxLogCache(connectionId: string): Promise<BybitTransactionLogEntry[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(BYBIT_TX_LOG_STORE, 'by-connectionId', connectionId);
  return all.sort((a, b) => b.transactionTime - a.transactionTime);
}

export async function getAllBybitTxLogCache(): Promise<BybitTransactionLogEntry[]> {
  const db = await getDB();
  const all = await db.getAll(BYBIT_TX_LOG_STORE);
  return all.sort((a, b) => b.transactionTime - a.transactionTime);
}

export async function saveBybitTxLogCache(entries: BybitTransactionLogEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const db = await getDB();
  const tx = db.transaction(BYBIT_TX_LOG_STORE, 'readwrite');
  const store = tx.objectStore(BYBIT_TX_LOG_STORE);
  for (const entry of entries) {
    await store.put(entry);
  }
  await tx.done;
}

export async function getBybitTxLogMeta(connectionId: string): Promise<{
  connectionId: string;
  oldestTransactionTime: number;
  latestTransactionTime: number;
  totalRecords: number;
  updatedAt: number;
} | undefined> {
  const db = await getDB();
  return db.get(BYBIT_TX_META_STORE, connectionId);
}

export async function updateBybitTxLogMeta(
  connectionId: string,
  oldestTransactionTime: number,
  latestTransactionTime: number,
  totalRecords: number
): Promise<void> {
  const db = await getDB();
  await db.put(BYBIT_TX_META_STORE, {
    connectionId,
    oldestTransactionTime,
    latestTransactionTime,
    totalRecords,
    updatedAt: Date.now(),
  });
}

export async function getBybitTxLogCount(connectionId: string): Promise<number> {
  const db = await getDB();
  return db.countFromIndex(BYBIT_TX_LOG_STORE, 'by-connectionId', connectionId);
}

// ------------------------------------------------------------------
// BITGET TRANSACTION LOG CACHE
// ------------------------------------------------------------------

export async function getBitgetTxLogCache(connectionId: string): Promise<BitgetTransactionLogEntry[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(BITGET_TX_LOG_STORE, 'by-connectionId', connectionId);
  return all.sort((a, b) => b.transactionTime - a.transactionTime);
}

export async function getAllBitgetTxLogCache(): Promise<BitgetTransactionLogEntry[]> {
  const db = await getDB();
  const all = await db.getAll(BITGET_TX_LOG_STORE);
  return all.sort((a, b) => b.transactionTime - a.transactionTime);
}

export async function saveBitgetTxLogCache(entries: BitgetTransactionLogEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const db = await getDB();
  const tx = db.transaction(BITGET_TX_LOG_STORE, 'readwrite');
  const store = tx.objectStore(BITGET_TX_LOG_STORE);
  for (const entry of entries) {
    await store.put(entry);
  }
  await tx.done;
}

export async function getBitgetTxLogMeta(connectionId: string): Promise<{
  connectionId: string;
  oldestTransactionTime: number;
  latestTransactionTime: number;
  totalRecords: number;
  updatedAt: number;
} | undefined> {
  const db = await getDB();
  return db.get(BITGET_TX_META_STORE, connectionId);
}

export async function updateBitgetTxLogMeta(
  connectionId: string,
  oldestTransactionTime: number,
  latestTransactionTime: number,
  totalRecords: number
): Promise<void> {
  const db = await getDB();
  await db.put(BITGET_TX_META_STORE, {
    connectionId,
    oldestTransactionTime,
    latestTransactionTime,
    totalRecords,
    updatedAt: Date.now(),
  });
}

export async function getBitgetTxLogCount(connectionId: string): Promise<number> {
  const db = await getDB();
  return db.countFromIndex(BITGET_TX_LOG_STORE, 'by-connectionId', connectionId);
}

// ------------------------------------------------------------------
// OKX TRANSACTION LOG CACHE
// ------------------------------------------------------------------

export async function getOkxTxLogCache(connectionId: string): Promise<OkxTransactionLogEntry[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(OKX_TX_LOG_STORE, 'by-connectionId', connectionId);
  return all.sort((a, b) => b.transactionTime - a.transactionTime);
}

export async function getAllOkxTxLogCache(): Promise<OkxTransactionLogEntry[]> {
  const db = await getDB();
  const all = await db.getAll(OKX_TX_LOG_STORE);
  return all.sort((a, b) => b.transactionTime - a.transactionTime);
}

export async function saveOkxTxLogCache(entries: OkxTransactionLogEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const db = await getDB();
  const tx = db.transaction(OKX_TX_LOG_STORE, 'readwrite');
  const store = tx.objectStore(OKX_TX_LOG_STORE);
  for (const entry of entries) {
    await store.put(entry);
  }
  await tx.done;
}

export async function getOkxTxLogMeta(connectionId: string): Promise<{
  connectionId: string;
  oldestTransactionTime: number;
  latestTransactionTime: number;
  totalRecords: number;
  updatedAt: number;
} | undefined> {
  const db = await getDB();
  return db.get(OKX_TX_META_STORE, connectionId);
}

export async function updateOkxTxLogMeta(
  connectionId: string,
  oldestTransactionTime: number,
  latestTransactionTime: number,
  totalRecords: number
): Promise<void> {
  const db = await getDB();
  await db.put(OKX_TX_META_STORE, {
    connectionId,
    oldestTransactionTime,
    latestTransactionTime,
    totalRecords,
    updatedAt: Date.now(),
  });
}

export async function getOkxTxLogCount(connectionId: string): Promise<number> {
  const db = await getDB();
  return db.countFromIndex(OKX_TX_LOG_STORE, 'by-connectionId', connectionId);
}

// ------------------------------------------------------------------
// FUNDING SUMMARIES CACHE
// ------------------------------------------------------------------

export async function saveFundingSummary(summary: FundingRateSummary): Promise<void> {
  const db = await getDB();
  await db.put('funding-summaries', summary);
}

export async function getAllFundingSummaries(): Promise<FundingRateSummary[]> {
  const db = await getDB();
  return db.getAll('funding-summaries');
}

export async function getFundingSummaryByKey(exchange: ExchangeName, symbol: string): Promise<FundingRateSummary | undefined> {
  const db = await getDB();
  return db.get('funding-summaries', `${exchange}-${symbol}`);
}

export async function clearFundingSummariesCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['funding-summaries', 'funding-meta'], 'readwrite');
  await tx.objectStore('funding-summaries').clear();
  await tx.objectStore('funding-meta').clear();
  await tx.done;
}

/**
 * Batch-write all summaries and their metadata in a single transaction.
 * Much more efficient than 500+ individual transactions during initial sync.
 */
export async function saveFundingSummariesBatch(summaries: FundingRateSummary[]): Promise<void> {
  if (summaries.length === 0) return;
  const db = await getDB();
  const tx = db.transaction(['funding-summaries', 'funding-meta'], 'readwrite');
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
  await tx.done;
}

export async function getFundingMeta(exchange: string, symbol: string): Promise<FundingMeta | undefined> {
  const db = await getDB();
  const meta = await db.get(FUNDING_META_STORE, `${exchange}-${symbol}`);
  return meta as FundingMeta | undefined;
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
  const db = await getDB();
  await db.put(FUNDING_META_STORE, {
    id: `${exchange}-${symbol}`,
    exchange,
    symbol,
    oldestTimestamp: latestTimestamp,
    latestTimestamp,
    updatedAt: Date.now(),
  });
}
