import { create } from 'zustand';

/** Current connection life-cycle status. */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Real-time network telemetry for a single connection. */
export interface ConnectionTelemetry {
  /** Rolling window of the last 20 ping measurements (ms). */
  latencyHistory: number[];
  /** Rolling window of the last 20 throughput measurements (bytes/s). */
  throughputHistory: number[];
  /** Most recent ping latency in ms. */
  lastPingMs: number;
  /** Calculated throughput in bytes/s. */
  bytesPerSecond: number;
  /** Accumulator for bytes received since last throughput tick. */
  accumulatingBytes: number;
  /** Timestamp of the last throughput calculation. */
  lastThroughputUpdate: number;
}

interface ConnectionState {
  /** Connection status keyed by connectionId. */
  statuses: Record<string, ConnectionStatus>;
  /** Error messages keyed by connectionId (null = no error). */
  errors: Record<string, string | null>;
  /** Telemetry data keyed by connectionId. */
  telemetry: Record<string, ConnectionTelemetry>;

  /** Update the status (and optionally the error) for a connection. */
  setConnectionStatus: (connectionId: string, status: ConnectionStatus, error?: string | null) => void;
  /** Set or clear the error for a connection. */
  setConnectionError: (connectionId: string, error: string | null) => void;
  /** Record a new latency measurement (keeps last 20 samples). */
  updateLatency: (connectionId: string, ms: number) => void;
  /** Accumulate received bytes for a connection. */
  addBytesReceived: (connectionId: string, bytes: number) => void;
  /** Recalculate throughput for all connections with data accumulated ≥ 1s ago. */
  tickThroughput: () => void;
  /** Remove status, error, and telemetry for a connection. */
  clearConnectionData: (connectionId: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  statuses: {},
  errors: {},
  telemetry: {},

  setConnectionStatus: (connectionId, status, error) => set((state) => ({
    statuses: { ...state.statuses, [connectionId]: status },
    errors: error !== undefined ? { ...state.errors, [connectionId]: error } : state.errors
  })),

  setConnectionError: (connectionId, error) => set((state) => ({
    errors: { ...state.errors, [connectionId]: error }
  })),

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
    const current = state.telemetry[connectionId] || {
      latencyHistory: [], throughputHistory: [], lastPingMs: 0, bytesPerSecond: 0, accumulatingBytes: 0, lastThroughputUpdate: Date.now()
    };
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
    const nextStatuses = { ...state.statuses };
    const nextErrors = { ...state.errors };
    const nextTelemetry = { ...state.telemetry };
    delete nextStatuses[connectionId];
    delete nextErrors[connectionId];
    delete nextTelemetry[connectionId];
    return { statuses: nextStatuses, errors: nextErrors, telemetry: nextTelemetry };
  })
}));
