import { create } from 'zustand';
import { UnifiedHistoryPosition, UnifiedOrder } from '../types';

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
}));
