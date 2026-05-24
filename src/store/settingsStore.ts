import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  useMockData: boolean;
  setUseMockData: (useMockData: boolean) => void;
  bybitPollingInterval: number;
  setBybitPollingInterval: (interval: number) => void;
  historyCacheInterval: number;
  setHistoryCacheInterval: (interval: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      useMockData: false,
      setUseMockData: (useMockData: boolean) => set({ useMockData }),
      bybitPollingInterval: 5,
      setBybitPollingInterval: (bybitPollingInterval: number) => set({ bybitPollingInterval }),
      historyCacheInterval: 15,
      setHistoryCacheInterval: (historyCacheInterval: number) => set({ historyCacheInterval }),
    }),
    {
      name: 'terminal-settings',
    }
  )
);
