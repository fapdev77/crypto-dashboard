import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { CurrentFundingRate } from '../services/funding/FundingService';

interface FundingState {
  favorites: string[]; // array of base coins
  toggleFavorite: (coin: string) => void;
  
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
}

export const useFundingStore = create<FundingState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (coin: string) => {
        const { favorites } = get();
        if (favorites.includes(coin)) {
          set({ favorites: favorites.filter(f => f !== coin) });
        } else {
          set({ favorites: [...favorites, coin] });
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
    }),
    {
      name: 'funding-store',
      partialize: (state) => ({ favorites: state.favorites, lastHistoryFetch: state.lastHistoryFetch }),
    }
  )
);
