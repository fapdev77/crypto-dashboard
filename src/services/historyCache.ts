import { openDB, deleteDB, DBSchema, IDBPDatabase } from 'idb';
import { UnifiedHistoryPosition, UnifiedAssetCategory, UnifiedOrder, BybitTransactionLogEntry, UnifiedFundingFee } from '../types';
import { LogManager } from './LogManager';

const DB_NAME = 'crypto-dashboard-cache';
const DB_VERSION = 9;
const HISTORY_STORE = 'positionHistory';
const META_STORE = 'cacheMeta';
const ASSET_META_STORE = 'assetMetadata';
const ORDER_HISTORY_STORE = 'orderHistory';
const ORDER_META_STORE = 'orderCacheMeta';
const BYBIT_REAL_PNL_STORE = 'bybitRealPnL';
const BYBIT_TX_LOG_STORE = 'bybit-transaction-log';
const BYBIT_TX_META_STORE = 'bybit-transaction-meta';
const FUNDING_FEES_STORE = 'funding-fees';
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
  'funding-fees': {
    key: string; // id
    value: UnifiedFundingFee;
    indexes: {
      'by-exchange': string;
      'by-symbol': string;
      'by-timestamp': number;
      'by-exchange-symbol': string;
    };
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
        if (!db.objectStoreNames.contains(FUNDING_FEES_STORE)) {
          const fundingStore = db.createObjectStore(FUNDING_FEES_STORE, { keyPath: 'id' });
          fundingStore.createIndex('by-exchange', 'exchange');
          fundingStore.createIndex('by-symbol', 'symbol');
          fundingStore.createIndex('by-timestamp', 'timestamp');
          // Creating a compound index is not natively supported by a single key path if it's an array for a simple index,
          // but we can create a secondary field or just filter in memory. Actually we'll use a derived property `exchangeSymbol` if needed,
          // but we can just use by-symbol since symbol names are mostly unique per exchange, or query by exchange and filter by symbol.
          // Let's use by-exchange and filter.
        }
        if (!db.objectStoreNames.contains(FUNDING_META_STORE)) {
          db.createObjectStore(FUNDING_META_STORE, { keyPath: 'id' });
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
export async function getAssetMetadata(id: string): Promise<{id: string, category: UnifiedAssetCategory, updatedAt: number} | undefined> {
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

/**
 * Clear all cached data (useful for debugging or user-triggered resets).
 */
export async function clearAllCache(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  await deleteDB(DB_NAME);
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
// FUNDING FEES CACHE
// ------------------------------------------------------------------

export async function saveFundingFeesCache(entries: UnifiedFundingFee[]): Promise<void> {
  if (entries.length === 0) return;
  const db = await getDB();
  const tx = db.transaction(FUNDING_FEES_STORE, 'readwrite');
  const store = tx.objectStore(FUNDING_FEES_STORE);
  for (const entry of entries) {
    await store.put(entry);
  }
  await tx.done;
}

export async function getFundingFeesBySymbol(exchange: string, symbol: string): Promise<UnifiedFundingFee[]> {
  const db = await getDB();
  // Using by-symbol index, then filtering by exchange
  const allForSymbol = await db.getAllFromIndex(FUNDING_FEES_STORE, 'by-symbol', symbol);
  return allForSymbol.filter(e => e.exchange === exchange).sort((a, b) => b.timestamp - a.timestamp);
}

export async function getAllFundingFees(): Promise<UnifiedFundingFee[]> {
  const db = await getDB();
  return db.getAll(FUNDING_FEES_STORE);
}

export async function clearFundingFeesCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([FUNDING_FEES_STORE, FUNDING_META_STORE], 'readwrite');
  await tx.objectStore(FUNDING_FEES_STORE).clear();
  await tx.objectStore(FUNDING_META_STORE).clear();
  await tx.done;
}

export async function getFundingMeta(exchange: string, symbol: string): Promise<{
  id: string;
  exchange: string;
  symbol: string;
  oldestTimestamp: number;
  latestTimestamp: number;
  updatedAt: number;
} | undefined> {
  const db = await getDB();
  return db.get(FUNDING_META_STORE, `${exchange}-${symbol}`);
}

export async function updateFundingMeta(
  exchange: string,
  symbol: string,
  oldestTimestamp: number,
  latestTimestamp: number
): Promise<void> {
  const db = await getDB();
  await db.put(FUNDING_META_STORE, {
    id: `${exchange}-${symbol}`,
    exchange,
    symbol,
    oldestTimestamp,
    latestTimestamp,
    updatedAt: Date.now(),
  });
}
