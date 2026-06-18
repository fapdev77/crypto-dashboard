import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  useMockData: boolean;
  setUseMockData: (useMockData: boolean) => void;
  pollingInterval: number;
  setPollingInterval: (interval: number) => void;
  historyCacheInterval: number;
  setHistoryCacheInterval: (interval: number) => void;
  metadataCacheTtlHours: number;
  setMetadataCacheTtlHours: (hours: number) => void;
  /** In-memory counter bumped after every background cache refresh. Consumers use it as a useEffect dep. */
  historyCacheVersion: number;
  bumpHistoryCacheVersion: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      useMockData: false,
      setUseMockData: (useMockData: boolean) => set({ useMockData }),
      pollingInterval: 5,
      setPollingInterval: (pollingInterval: number) => set({ pollingInterval }),
      historyCacheInterval: 15,
      setHistoryCacheInterval: (historyCacheInterval: number) => set({ historyCacheInterval }),
      metadataCacheTtlHours: 24,
      setMetadataCacheTtlHours: (metadataCacheTtlHours: number) => set({ metadataCacheTtlHours }),
      historyCacheVersion: 0,
      bumpHistoryCacheVersion: () => set(state => ({ historyCacheVersion: state.historyCacheVersion + 1 })),
    }),
    {
      name: 'terminal-settings',
    }
  )
);
