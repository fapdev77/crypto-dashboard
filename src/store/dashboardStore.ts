import { create } from 'zustand';
import { UnifiedPosition } from '../types';

export interface BalanceItem {
  id: string; // e.g., 'connId-USDT'
  connectionId: string;
  exchange: string;
  label: string;
  ccy: string;
  amount: number;
  usdValue: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface DashboardState {
  // Connection statuses tracking (keyed by connectionId)
  statuses: Record<string, ConnectionStatus>;
  errors: Record<string, string | null>;
  setConnectionStatus: (connectionId: string, status: ConnectionStatus, error?: string | null) => void;
  setConnectionError: (connectionId: string, error: string | null) => void;

  // Wallet balances
  balances: Record<string, BalanceItem>;
  updateBalances: (connectionId: string, newBalances: BalanceItem[]) => void;
  updateBalancesDelta: (connectionId: string, deltaBalances: Partial<BalanceItem>[]) => void;
  
  // Positions
  positions: Record<string, UnifiedPosition>;
  updatePositions: (connectionId: string, newPositions: UnifiedPosition[]) => void;
  updatePositionsDelta: (connectionId: string, deltaPositions: Partial<UnifiedPosition>[]) => void;
  
  // Clear all data for a specific connection
  clearConnectionData: (connectionId: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  statuses: {},
  errors: {},
  setConnectionStatus: (connectionId, status, error) => set((state) => ({
    statuses: { ...state.statuses, [connectionId]: status },
    errors: error !== undefined ? { ...state.errors, [connectionId]: error } : state.errors
  })),
  setConnectionError: (connectionId, error) => set((state) => ({
    errors: { ...state.errors, [connectionId]: error }
  })),

  balances: {},
  updateBalances: (connectionId, newBalances) => set((state) => {
    const nextBalances = { ...state.balances };
    newBalances.forEach(b => {
      nextBalances[b.id] = b;
    });
    for (const key in nextBalances) {
      if (nextBalances[key].amount <= 0) {
        delete nextBalances[key];
      }
    }
    return { balances: nextBalances };
  }),

  updateBalancesDelta: (connectionId, deltaBalances) => set((state) => {
    const nextBalances = { ...state.balances };
    deltaBalances.forEach(b => {
      if (!b.id) return;
      if (nextBalances[b.id]) {
        nextBalances[b.id] = { ...nextBalances[b.id], ...b };
      } else {
        nextBalances[b.id] = b as BalanceItem;
      }
    });
    for (const key in nextBalances) {
      if (nextBalances[key].amount <= 0) {
        delete nextBalances[key];
      }
    }
    return { balances: nextBalances };
  }),

  positions: {},
  updatePositions: (connectionId, newPositions) => set((state) => {
    const nextPositions = { ...state.positions };
    newPositions.forEach(pos => {
      nextPositions[pos.id] = pos;
    });
    for (const key in nextPositions) {
      if (Math.abs(nextPositions[key].size) <= 0) {
        delete nextPositions[key];
      }
    }
    return { positions: nextPositions };
  }),

  updatePositionsDelta: (connectionId, deltaPositions) => set((state) => {
    const nextPositions = { ...state.positions };
    deltaPositions.forEach(pos => {
      if (!pos.id) return;
      if (nextPositions[pos.id]) {
        nextPositions[pos.id] = { ...nextPositions[pos.id], ...pos };
      } else {
        nextPositions[pos.id] = pos as UnifiedPosition;
      }
    });
    for (const key in nextPositions) {
      if (Math.abs(nextPositions[key].size) <= 0) {
        delete nextPositions[key];
      }
    }
    return { positions: nextPositions };
  }),

  // Telemetry
  telemetry: {},
  updateLatency: (connectionId, ms) => set((state) => {
    const current = state.telemetry[connectionId] || {
      latencyHistory: [], throughputHistory: [], lastPingMs: 0, bytesPerSecond: 0, accumulatingBytes: 0, lastThroughputUpdate: Date.now()
    };
    const newHistory = [...current.latencyHistory, ms].slice(-20);
    return {
      telemetry: {
        ...state.telemetry,
        [connectionId]: {
          ...current,
          lastPingMs: ms,
          latencyHistory: newHistory
        }
      }
    };
  }),
  addBytesReceived: (connectionId, bytes) => set((state) => {
    const current = state.telemetry[connectionId];
    if (!current) return state;
    return {
      telemetry: {
        ...state.telemetry,
        [connectionId]: {
          ...current,
          accumulatingBytes: current.accumulatingBytes + bytes
        }
      }
    };
  }),
  tickThroughput: () => set((state) => {
    const now = Date.now();
    const nextTelemetry = { ...state.telemetry };
    Object.keys(nextTelemetry).forEach(id => {
      const current = nextTelemetry[id];
      const deltaMs = now - current.lastThroughputUpdate;
      if (deltaMs >= 1000) {
        const bytesPerSec = (current.accumulatingBytes / deltaMs) * 1000;
        const newHistory = [...current.throughputHistory, bytesPerSec].slice(-20);
        
        nextTelemetry[id] = {
          ...current,
          bytesPerSecond: bytesPerSec,
          throughputHistory: newHistory,
          accumulatingBytes: 0,
          lastThroughputUpdate: now
        };
      }
    });
    return { telemetry: nextTelemetry };
  }),

  clearConnectionData: (connectionId) => set((state) => {
    const nextBalances = { ...state.balances };
    const nextPositions = { ...state.positions };
    const nextStatuses = { ...state.statuses };
    const nextErrors = { ...state.errors };
    const nextTelemetry = { ...state.telemetry };
    
    for (const key in nextBalances) {
      if (nextBalances[key].connectionId === connectionId) {
        delete nextBalances[key];
      }
    }
    
    for (const key in nextPositions) {
      if (nextPositions[key].connectionId === connectionId) {
        delete nextPositions[key];
      }
    }
    
    delete nextStatuses[connectionId];
    delete nextErrors[connectionId];
    delete nextTelemetry[connectionId];

    return { balances: nextBalances, positions: nextPositions, statuses: nextStatuses, errors: nextErrors, telemetry: nextTelemetry };
  })
}));

