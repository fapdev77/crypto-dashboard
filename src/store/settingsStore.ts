import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  /** Whether to use mock/Simulation data instead of live API calls. */
  useMockData: boolean;
  setUseMockData: (useMockData: boolean) => void;
  /** REST polling interval in seconds (default 5). */
  pollingInterval: number;
  setPollingInterval: (interval: number) => void;
  /** Background cache refresh interval in minutes (default 15). */
  historyCacheInterval: number;
  setHistoryCacheInterval: (interval: number) => void;
  /** TTL for cached asset metadata in hours (default 24). */
  metadataCacheTtlHours: number;
  setMetadataCacheTtlHours: (hours: number) => void;
  /** Whether to show the welcome/help modal on startup. */
  showWelcomeOnStartup: boolean;
  setShowWelcomeOnStartup: (show: boolean) => void;
  /**
   * In-memory counter bumped after every background cache refresh.
   * Consumers use it as a useEffect dependency to trigger re-fetch.
   */
  historyCacheVersion: number;
  /** Increment historyCacheVersion by 1. */
  bumpHistoryCacheVersion: () => void;
  /** Timestamp of the last successful sync across any history domain. */
  lastSyncTime: number;
  setLastSyncTime: (time: number) => void;
  /** Timestamp until which sync is rate-limited (cooldown). */
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
