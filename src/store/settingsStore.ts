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
  showWelcomeOnStartup: boolean;
  setShowWelcomeOnStartup: (show: boolean) => void;
  /** In-memory counter bumped after every background cache refresh. Consumers use it as a useEffect dep. */
  historyCacheVersion: number;
  bumpHistoryCacheVersion: () => void;
  lastSyncTime: number;
  setLastSyncTime: (time: number) => void;
  cooldownEnd: number;
  setCooldownEnd: (time: number) => void;
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
      showWelcomeOnStartup: true,
      setShowWelcomeOnStartup: (showWelcomeOnStartup: boolean) => set({ showWelcomeOnStartup }),
      historyCacheVersion: 0,
      bumpHistoryCacheVersion: () => set(state => ({ historyCacheVersion: state.historyCacheVersion + 1 })),
      lastSyncTime: Date.now(),
      setLastSyncTime: (lastSyncTime: number) => set({ lastSyncTime }),
      cooldownEnd: 0,
      setCooldownEnd: (cooldownEnd: number) => set({ cooldownEnd }),
    }),
    {
      name: 'terminal-settings',
    }
  )
);
