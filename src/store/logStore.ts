import { create } from 'zustand';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DATA' | 'SYSTEM';

export interface LogEntry {
  id: string;        // crypto.randomUUID()
  timestamp: number; // Date.now()
  level: LogLevel;
  source: string;    // Label amigável da conexão ou identificador do sistema (ex: 'SYSTEM', 'CACHE')
  message: string;   // Mensagem formatada
}

interface LogState {
  entries: LogEntry[];
  maxEntries: number;
  addLog: (level: LogLevel, source: string, message: string) => void;
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
