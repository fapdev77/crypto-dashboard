import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  useMockData: boolean;
  setUseMockData: (useMockData: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      useMockData: false,
      setUseMockData: (useMockData: boolean) => set({ useMockData }),
    }),
    {
      name: 'terminal-settings',
    }
  )
);
