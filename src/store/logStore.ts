import { create } from 'zustand';

/** Log severity level for the in-app log terminal. */
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DATA' | 'SYSTEM';

/** A single entry in the in-app log terminal. */
export interface LogEntry {
  /** Unique identifier (crypto.randomUUID). */
  id: string;
  /** Creation timestamp. */
  timestamp: number;
  /** Severity level. */
  level: LogLevel;
  /** Friendly label of the source (connection label, system identifier). */
  source: string;
  /** Formatted log message. */
  message: string;
}

interface LogState {
  /** Ordered list of log entries (newest appended last). */
  entries: LogEntry[];
  /** Maximum number of entries kept in memory (oldest sliced off). */
  maxEntries: number;
  /** Append a new log entry; old entries are trimmed to maxEntries. */
  addLog: (level: LogLevel, source: string, message: string) => void;
  /** Clear all log entries. */
  clearLogs: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  entries: [],
  maxEntries: 1000,
  addLog: (level, source, message) => set((state) => {
    const newEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      source,
      message,
    };
    
    const newEntries = [...state.entries, newEntry].slice(-state.maxEntries);
    
    return { entries: newEntries };
  }),
  clearLogs: () => set({ entries: [] }),
}));
