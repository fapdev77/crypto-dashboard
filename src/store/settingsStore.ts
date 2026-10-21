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
  /** Refresh interval for the Market Analytics symbol catalog in hours (default 1, min 1, max 24). */
  symbolCatalogRefreshHours: number;
  setSymbolCatalogRefreshHours: (hours: number) => void;
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
  /** Funding rate polling interval in minutes (default 1). */
  fundingPollingInterval: number;
  setFundingPollingInterval: (interval: number) => void;
  /** Funding history fetch interval in hours (default 4). */
  fundingHistoryInterval: number;
  setFundingHistoryInterval: (interval: number) => void;
  /** Exposed balance calculation mode for hedge positions ('gross' or 'net'). */
  hedgeExposedMode: 'gross' | 'net';
  setHedgeExposedMode: (mode: 'gross' | 'net') => void;
  /** Whether the encrypted vault automatically locks on user inactivity. Default true. */
  vaultAutoLockEnabled: boolean;
  setVaultAutoLockEnabled: (enabled: boolean) => void;
  /** Inactivity timeout in minutes before auto-locking (1 to 60). Default 15. */
  vaultAutoLockMinutes: number;
  setVaultAutoLockMinutes: (minutes: number) => void;
  /** Whether to show the 5-second unencrypted vault notice on startup. Default true. */
  showVaultSetupNoticeOnStartup: boolean;
  setShowVaultSetupNoticeOnStartup: (show: boolean) => void;
  /** IndexedDB health and schema status */
  indexedDBStatus: 'healthy' | 'error' | 'recovering';
  indexedDBError: string | null;
  indexedDBVersion: number;
  setIndexedDBStatus: (status: 'healthy' | 'error' | 'recovering', error?: string | null) => void;
  clearIndexedDBError: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      useMockData: false,
      setUseMockData: (useMockData: boolean) => set({ useMockData }),
      pollingInterval: 5,
      setPollingInterval: (val: number) => set({ pollingInterval: Math.max(1, Math.min(60, val)) }),
      historyCacheInterval: 15,
      setHistoryCacheInterval: (val: number) => set({ historyCacheInterval: Math.max(1, Math.min(60, val)) }),
      metadataCacheTtlHours: 24,
      setMetadataCacheTtlHours: (val: number) => set({ metadataCacheTtlHours: Math.max(1, Math.min(24, val)) }),
      symbolCatalogRefreshHours: 1,
      setSymbolCatalogRefreshHours: (val: number) => set({ symbolCatalogRefreshHours: Math.max(1, Math.min(24, val)) }),
      showWelcomeOnStartup: true,
      setShowWelcomeOnStartup: (showWelcomeOnStartup: boolean) => set({ showWelcomeOnStartup }),
      historyCacheVersion: 0,
      bumpHistoryCacheVersion: () => set(state => ({ historyCacheVersion: state.historyCacheVersion + 1 })),
      lastSyncTime: Date.now(),
      setLastSyncTime: (lastSyncTime: number) => set({ lastSyncTime }),
      cooldownEnd: 0,
      setCooldownEnd: (cooldownEnd: number) => set({ cooldownEnd }),
      fundingPollingInterval: 1,
      setFundingPollingInterval: (val: number) => set({ fundingPollingInterval: Math.max(1, Math.min(60, val)) }),
      fundingHistoryInterval: 4,
      setFundingHistoryInterval: (val: number) => set({ fundingHistoryInterval: Math.max(4, Math.min(8, val)) }),
      hedgeExposedMode: 'gross',
      setHedgeExposedMode: (hedgeExposedMode: 'gross' | 'net') => set({ hedgeExposedMode }),
      vaultAutoLockEnabled: true,
      setVaultAutoLockEnabled: (vaultAutoLockEnabled: boolean) => set({ vaultAutoLockEnabled }),
      vaultAutoLockMinutes: 15,
      setVaultAutoLockMinutes: (val: number) => set({ vaultAutoLockMinutes: Math.max(1, Math.min(60, Math.round(val))) }),
      showVaultSetupNoticeOnStartup: true,
      setShowVaultSetupNoticeOnStartup: (showVaultSetupNoticeOnStartup: boolean) => set({ showVaultSetupNoticeOnStartup }),
      indexedDBStatus: 'healthy',
      indexedDBError: null,
      indexedDBVersion: 12,
      setIndexedDBStatus: (indexedDBStatus, error = null) => set({ indexedDBStatus, indexedDBError: error }),
      clearIndexedDBError: () => set({ indexedDBStatus: 'healthy', indexedDBError: null }),
    }),
    {
      name: 'terminal-settings',
    }
  )
);
