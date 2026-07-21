import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { CurrentFundingRate } from '../services/funding/FundingService';

// ── Types for persisted performance data ──────────────────────────

export interface SyncPerformance {
  fetchSec: number;
  writeSec: number;
  totalSec: number;
  symbols: number;
  timestamp: number; // when the sync completed
}

export interface ExchangeTimingData {
  name: string;
  synced: number;
  stale: number;
  totalSec: number;
  avgMs: number;
}

interface FundingState {
  favorites: string[]; // array of ids (e.g. USDT-M_BTC)
  toggleFavorite: (id: string) => void;
  
  // Current live rates
  currentRates: CurrentFundingRate[];
  setCurrentRates: (rates: CurrentFundingRate[]) => void;
  
  // Sync Status
  isSyncing: boolean;
  syncProgress: number; // 0 to 100
  syncMessage: string;
  setSyncStatus: (isSyncing: boolean, progress: number, message: string) => void;
  
  lastHistoryFetch: number;
  setLastHistoryFetch: (time: number) => void;

  // ── Persisted sync performance data ───────────────────────────
  lastSyncPerformance: SyncPerformance | null;
  setLastSyncPerformance: (perf: SyncPerformance) => void;
  lastExchangeTimings: ExchangeTimingData[];
  setLastExchangeTimings: (timings: ExchangeTimingData[]) => void;
  nextFundingTime: number; // next funding settlement time (ms timestamp)
  setNextFundingTime: (time: number) => void;
  nextScheduledSyncTime: number; // 0 = not scheduled, otherwise ms timestamp
  setNextScheduledSyncTime: (time: number) => void;
}

export const useFundingStore = create<FundingState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (id: string) => {
        const { favorites } = get();
        let newFavorites = [...favorites];
        
        // Extract coin symbol if it's the new composite format (e.g. BTC_USDT-M)
        const parts = id.split('_');
        const coinSymbol = parts[0]; 

        // If the legacy coin symbol exists, remove it
        if (newFavorites.includes(coinSymbol)) {
          newFavorites = newFavorites.filter(f => f !== coinSymbol);
        }

        if (newFavorites.includes(id)) {
          set({ favorites: newFavorites.filter(f => f !== id) });
        } else {
          set({ favorites: [...newFavorites, id] });
        }
      },
      
      currentRates: [],
      setCurrentRates: (currentRates) => set({ currentRates }),
      
      isSyncing: false,
      syncProgress: 0,
      syncMessage: '',
      setSyncStatus: (isSyncing, syncProgress, syncMessage) => set({ isSyncing, syncProgress, syncMessage }),
      
      lastHistoryFetch: 0,
      setLastHistoryFetch: (lastHistoryFetch) => set({ lastHistoryFetch }),

      // ── Persisted performance data ────────────────────────────
      lastSyncPerformance: null,
      setLastSyncPerformance: (lastSyncPerformance) => set({ lastSyncPerformance }),
      lastExchangeTimings: [],
      setLastExchangeTimings: (lastExchangeTimings) => set({ lastExchangeTimings }),
      nextFundingTime: 0,
      setNextFundingTime: (nextFundingTime) => set({ nextFundingTime }),
      nextScheduledSyncTime: 0,
      setNextScheduledSyncTime: (nextScheduledSyncTime) => set({ nextScheduledSyncTime }),
    }),
    {
      name: 'funding-store',
      partialize: (state) => ({
        favorites: state.favorites,
        lastHistoryFetch: state.lastHistoryFetch,
        lastSyncPerformance: state.lastSyncPerformance,
        lastExchangeTimings: state.lastExchangeTimings,
        nextFundingTime: state.nextFundingTime,
        nextScheduledSyncTime: state.nextScheduledSyncTime,
      }),
    }
  )
);
