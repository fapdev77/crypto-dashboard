import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { UnifiedHistoryPosition } from '../types';

const DB_NAME = 'crypto-dashboard-cache';
const DB_VERSION = 2;
const HISTORY_STORE = 'positionHistory';
const META_STORE = 'cacheMeta';

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
        if (historyStore.indexNames.contains('by-closeTime')) {
          historyStore.deleteIndex('by-closeTime');
        }
        if (!historyStore.indexNames.contains('by-closeUpdateTime')) {
          historyStore.createIndex('by-closeUpdateTime', 'closeUpdateTime');
        }
      }
    },
  });

  return dbInstance;
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
  const db = await getDB();
  await db.clear(HISTORY_STORE);
  await db.clear(META_STORE);
}

/**
 * Get the total number of cached history positions.
 */
export async function getCacheSize(): Promise<number> {
  const db = await getDB();
  return db.count(HISTORY_STORE);
}
