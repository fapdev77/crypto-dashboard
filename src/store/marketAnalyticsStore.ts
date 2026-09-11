import { create } from 'zustand';
import {
  MarketType,
  SpecificMarketType,
  MarketTimeframe,
  PollingIntervalSeconds,
  ExchangeId,
  MarketAnalyticsSnapshot,
} from '../types/marketAnalytics';
import { MarketAnalyticsService } from '../services/marketAnalytics/MarketAnalyticsService';

const FAVORITES_STORAGE_KEY = 'cpm_market_analytics_favorites';

export const ALL_SPECIFIC_MARKETS: SpecificMarketType[] = ['PERP', 'INVERSE', 'SPOT'];
export const ALL_EXCHANGES: ExchangeId[] = ['bybit', 'okx', 'bitget'];

const loadStoredFavorites = (): string[] => {
  try {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set(['BTC', ...parsed]));
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return ['BTC', 'ETH', 'SOL', 'XRP'];
};

interface MarketAnalyticsStoreState {
  favorites: string[];
  selectedSymbol: string;
  selectedMarket: MarketType;
  selectedMarkets: SpecificMarketType[];
  selectedExchanges: ExchangeId[];
  selectedTimeframe: MarketTimeframe;
  pollingIntervalSeconds: PollingIntervalSeconds;
  snapshot: MarketAnalyticsSnapshot | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  toggleFavorite: (symbol: string) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedMarket: (market: MarketType) => void;
  toggleMarket: (market: SpecificMarketType) => void;
  selectAllMarkets: () => void;
  toggleExchange: (exchange: ExchangeId) => void;
  selectAllExchanges: () => void;
  setSelectedTimeframe: (timeframe: MarketTimeframe) => void;
  setPollingIntervalSeconds: (seconds: PollingIntervalSeconds) => void;
  refreshData: (force?: boolean) => Promise<void>;
}

export const useMarketAnalyticsStore = create<MarketAnalyticsStoreState>((set, get) => ({
  favorites: loadStoredFavorites(),
  selectedSymbol: 'BTC',
  selectedMarket: 'ALL',
  selectedMarkets: ['PERP', 'INVERSE', 'SPOT'],
  selectedExchanges: ['bybit', 'okx', 'bitget'],
  selectedTimeframe: '1h',
  pollingIntervalSeconds: 60,
  snapshot: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  toggleFavorite: (symbol: string) => {
    const cleanSym = symbol.toUpperCase().replace(/USDT$|USD$|-SWAP$/, '');
    if (cleanSym === 'BTC') {
      // BTC is permanently favorite
      return;
    }
    const currentFavs = get().favorites;
    let nextFavs: string[];
    if (currentFavs.includes(cleanSym)) {
      nextFavs = currentFavs.filter((s) => s !== cleanSym);
    } else {
      nextFavs = [...currentFavs, cleanSym];
    }
    if (!nextFavs.includes('BTC')) {
      nextFavs = ['BTC', ...nextFavs];
    }
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavs));
    } catch {
      // Ignore
    }
    set({ favorites: nextFavs });
  },

  setSelectedSymbol: (symbol: string) => {
    const clean = symbol.toUpperCase().replace(/USDT$|USD$|-SWAP$/, '');
    if (get().selectedSymbol === clean) return;
    set({ selectedSymbol: clean });
    get().refreshData(true);
  },

  setSelectedMarket: (market: MarketType) => {
    if (market === 'ALL') {
      set({ selectedMarket: 'ALL', selectedMarkets: ['PERP', 'INVERSE', 'SPOT'] });
    } else {
      set({ selectedMarket: market, selectedMarkets: [market] });
    }
    get().refreshData(true);
  },

  toggleMarket: (market: SpecificMarketType) => {
    const current = get().selectedMarkets;
    let next: SpecificMarketType[];
    if (current.includes(market)) {
      if (current.length === 1) return; // Prevent empty
      next = current.filter((m) => m !== market);
    } else {
      next = [...current, market];
    }
    const nextMarket: MarketType = next.length === ALL_SPECIFIC_MARKETS.length ? 'ALL' : next[0];
    set({ selectedMarkets: next, selectedMarket: nextMarket });
    get().refreshData(true);
  },

  selectAllMarkets: () => {
    set({
      selectedMarkets: ['PERP', 'INVERSE', 'SPOT'],
      selectedMarket: 'ALL',
    });
    get().refreshData(true);
  },

  toggleExchange: (exchange: ExchangeId) => {
    const current = get().selectedExchanges;
    if (current.includes(exchange) && current.length === 1) {
      // Prevent unselecting all exchanges
      return;
    }
    const next = current.includes(exchange)
      ? current.filter((e) => e !== exchange)
      : [...current, exchange];
    set({ selectedExchanges: next });
    get().refreshData(true);
  },

  selectAllExchanges: () => {
    set({ selectedExchanges: ['bybit', 'okx', 'bitget'] });
    get().refreshData(true);
  },

  setSelectedTimeframe: (timeframe: MarketTimeframe) => {
    if (get().selectedTimeframe === timeframe) return;
    set({ selectedTimeframe: timeframe });
    get().refreshData(true);
  },

  setPollingIntervalSeconds: (seconds: PollingIntervalSeconds) => {
    set({ pollingIntervalSeconds: seconds });
  },

  refreshData: async (force = false) => {
    const { selectedSymbol, selectedMarket, selectedTimeframe, selectedExchanges, snapshot } = get();
    
    // Only show full loading spinner if we don't have existing snapshot to avoid layout flicker
    if (!snapshot || force) {
      set({ isLoading: true, error: null });
    }

    try {
      const data = await MarketAnalyticsService.fetchSnapshot(
        selectedSymbol,
        selectedMarket,
        selectedTimeframe,
        selectedExchanges,
        force
      );
      set({
        snapshot: data,
        isLoading: false,
        lastFetched: Date.now(),
        error: null,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Failed to load market analytics',
      });
    }
  },
}));
