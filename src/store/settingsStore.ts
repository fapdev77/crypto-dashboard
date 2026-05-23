import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  useMockData: boolean;
  setUseMockData: (useMockData: boolean) => void;
  bybitPollingInterval: number;
  setBybitPollingInterval: (interval: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      useMockData: false,
      setUseMockData: (useMockData: boolean) => set({ useMockData }),
      bybitPollingInterval: 5,
      setBybitPollingInterval: (bybitPollingInterval: number) => set({ bybitPollingInterval }),
    }),
    {
      name: 'terminal-settings',
    }
  )
);
