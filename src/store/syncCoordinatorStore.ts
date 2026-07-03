import { create } from 'zustand';
import { UnifiedHistoryPosition, UnifiedOrder } from '../types';

interface SyncCoordinatorState {
  // 1. Position History
  cachedPositions: UnifiedHistoryPosition[];
  setCachedPositions: (positions: UnifiedHistoryPosition[]) => void;
  lastPositionsSyncedVersion: number | null;
  setLastPositionsSyncedVersion: (version: number | null) => void;
  lastPositionsSyncTimestamp: number;
  setLastPositionsSyncTimestamp: (timestamp: number) => void;

  // 2. PnL By Symbol (Bybit Real PnL) — independent sync from main history
  cachedPnLRecord: Record<string, string>;
  setCachedPnLRecord: (record: Record<string, string>) => void;
  lastPnlSyncedVersion: number | null;
  setLastPnlSyncedVersion: (version: number | null) => void;
  lastPnlSyncTimestamp: number;
  setLastPnlSyncTimestamp: (timestamp: number) => void;

  // 3. Order Reports
  cachedClosedOrders: UnifiedOrder[];
  setCachedClosedOrders: (orders: UnifiedOrder[]) => void;
  lastOrdersSyncedVersion: number | null;
  setLastOrdersSyncedVersion: (version: number | null) => void;
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
