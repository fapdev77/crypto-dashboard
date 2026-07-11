import { create } from 'zustand';
import { UnifiedHistoryPosition, UnifiedOrder, BybitTransactionLogEntry } from '../types';

/** Sync progress info for Bybit transaction log backfill. */
export interface BybitTxProgress {
  pct: number;       // 0-100
  records: number;   // total records cached so far
}

/** Synchronisation state coordinator used to share sync state across multiple history views. */
interface SyncCoordinatorState {
  // ── 1. Position History ──
  /** In-memory cache of all closed positions across connections. */
  cachedPositions: UnifiedHistoryPosition[];
  setCachedPositions: (positions: UnifiedHistoryPosition[]) => void;
  /** historyCacheVersion at the time positions were last synced. */
  lastPositionsSyncedVersion: number | null;
  setLastPositionsSyncedVersion: (version: number | null) => void;
  /** Timestamp of the last successful positions sync. */
  lastPositionsSyncTimestamp: number;
  setLastPositionsSyncTimestamp: (timestamp: number) => void;

  // ── 2. PnL By Symbol (Bybit Real PnL) ──
  /** Bybit transaction-log PnL aggregated by symbol. */
  cachedPnLRecord: Record<string, string>;
  setCachedPnLRecord: (record: Record<string, string>) => void;
  /** historyCacheVersion at the time PnL record was last synced. */
  lastPnlSyncedVersion: number | null;
  setLastPnlSyncedVersion: (version: number | null) => void;
  /** Timestamp of the last successful PnL sync. */
  lastPnlSyncTimestamp: number;
  setLastPnlSyncTimestamp: (timestamp: number) => void;

  // ── 3. Order Reports ──
  /** In-memory cache of all closed/cancelled orders across connections. */
  cachedClosedOrders: UnifiedOrder[];
  setCachedClosedOrders: (orders: UnifiedOrder[]) => void;
  /** historyCacheVersion at the time orders were last synced. */
  lastOrdersSyncedVersion: number | null;
  setLastOrdersSyncedVersion: (version: number | null) => void;
  /** Timestamp of the last successful orders sync. */
  lastOrdersSyncTimestamp: number;
  setLastOrdersSyncTimestamp: (timestamp: number) => void;

  // ── 4. Bybit Transactions ──
  /** In-memory cache of transaction log entries across connections. */
  cachedTxLog: BybitTransactionLogEntry[];
  setCachedTxLog: (entries: BybitTransactionLogEntry[]) => void;
  /** Whether a transaction-log sync is currently in progress. */
  isBybitTxSyncing: boolean;
  setIsBybitTxSyncing: (v: boolean) => void;
  /** Sync progress info. */
  bybitTxProgress: BybitTxProgress | null;
  setBybitTxProgress: (p: BybitTxProgress | null) => void;
  /** Timestamp of the last successful transaction-log sync. */
  bybitTxLastSyncTime: number;
  setBybitTxLastSyncTime: (t: number) => void;
  /** Latest transactionTime cached. */
  bybitTxLatestTransactionTime: number;
  setBybitTxLatestTransactionTime: (t: number) => void;
  /** Oldest transactionTime cached. */
  bybitTxOldestTransactionTime: number;
  setBybitTxOldestTransactionTime: (t: number) => void;
  /** Total transaction records cached. */
  bybitTxTotalRecords: number;
  setBybitTxTotalRecords: (n: number) => void;
}

export const useSyncCoordinatorStore = create<SyncCoordinatorState>((set) => ({
  // 1. Position History
  cachedPositions: [],
  setCachedPositions: (cachedPositions) => set({ cachedPositions }),
  lastPositionsSyncedVersion: null,
  setLastPositionsSyncedVersion: (lastPositionsSyncedVersion) => set({ lastPositionsSyncedVersion }),
  lastPositionsSyncTimestamp: 0,
  setLastPositionsSyncTimestamp: (lastPositionsSyncTimestamp) => set({ lastPositionsSyncTimestamp }),

  // 2. PnL By Symbol (Bybit Real PnL)
  cachedPnLRecord: {},
  setCachedPnLRecord: (cachedPnLRecord) => set({ cachedPnLRecord }),
  lastPnlSyncedVersion: null,
  setLastPnlSyncedVersion: (lastPnlSyncedVersion) => set({ lastPnlSyncedVersion }),
  lastPnlSyncTimestamp: 0,
  setLastPnlSyncTimestamp: (lastPnlSyncTimestamp) => set({ lastPnlSyncTimestamp }),

  // 3. Order Reports
  cachedClosedOrders: [],
  setCachedClosedOrders: (cachedClosedOrders) => set({ cachedClosedOrders }),
  lastOrdersSyncedVersion: null,
  setLastOrdersSyncedVersion: (lastOrdersSyncedVersion) => set({ lastOrdersSyncedVersion }),
  lastOrdersSyncTimestamp: 0,
  setLastOrdersSyncTimestamp: (lastOrdersSyncTimestamp) => set({ lastOrdersSyncTimestamp }),

  // 4. Bybit Transactions
  cachedTxLog: [],
  setCachedTxLog: (cachedTxLog) => set({ cachedTxLog }),
  isBybitTxSyncing: false,
  setIsBybitTxSyncing: (isBybitTxSyncing) => set({ isBybitTxSyncing }),
  bybitTxProgress: null,
  setBybitTxProgress: (bybitTxProgress) => set({ bybitTxProgress }),
  bybitTxLastSyncTime: 0,
  setBybitTxLastSyncTime: (bybitTxLastSyncTime) => set({ bybitTxLastSyncTime }),
  bybitTxLatestTransactionTime: 0,
  setBybitTxLatestTransactionTime: (bybitTxLatestTransactionTime) => set({ bybitTxLatestTransactionTime }),
  bybitTxOldestTransactionTime: 0,
  setBybitTxOldestTransactionTime: (bybitTxOldestTransactionTime) => set({ bybitTxOldestTransactionTime }),
  bybitTxTotalRecords: 0,
  setBybitTxTotalRecords: (bybitTxTotalRecords) => set({ bybitTxTotalRecords }),
}));
