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

import { exchangeCoinCatalog } from '../services/marketAnalytics/exchangeCoinCatalog';

const FAVORITES_STORAGE_KEY = 'cpm_market_analytics_favorites';

export const ALL_SPECIFIC_MARKETS: SpecificMarketType[] = ['PERP', 'INVERSE', 'SPOT'];
export const ALL_EXCHANGES: ExchangeId[] = ['bybit', 'okx', 'bitget'];

export const getEffectiveAvailability = (
  symbol: string
): { markets: SpecificMarketType[]; exchanges: ExchangeId[] } => {
  const av = exchangeCoinCatalog.getAvailability(symbol);
  return {
    markets: av && av.markets.length > 0 ? av.markets : ALL_SPECIFIC_MARKETS,
    exchanges: av && av.exchanges.length > 0 ? av.exchanges : ALL_EXCHANGES,
  };
};

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
  applyFilters: (symbol: string, markets: SpecificMarketType[], exchanges: ExchangeId[]) => void;
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
  pollingIntervalSeconds: 15,
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

    const { markets: availableMarkets, exchanges: availableExchanges } = getEffectiveAvailability(clean);
    const currentMarkets = get().selectedMarkets;
    const currentExchanges = get().selectedExchanges;

    let nextMarkets = currentMarkets.filter((m) => availableMarkets.includes(m));
    if (nextMarkets.length === 0) {
      nextMarkets = [...availableMarkets];
    }

    let nextExchanges = currentExchanges.filter((e) => availableExchanges.includes(e));
    if (nextExchanges.length === 0) {
      nextExchanges = [...availableExchanges];
    }

    const nextMarket: MarketType = nextMarkets.length === 1 ? nextMarkets[0] : 'ALL';

    set({
      selectedSymbol: clean,
      selectedMarkets: nextMarkets,
      selectedExchanges: nextExchanges,
      selectedMarket: nextMarket,
    });
    get().refreshData(true);
  },

  setSelectedMarket: (market: MarketType) => {
    const { markets: availableMarkets } = getEffectiveAvailability(get().selectedSymbol);
    if (market === 'ALL') {
      const nextMarket: MarketType = availableMarkets.length === 1 ? availableMarkets[0] : 'ALL';
      set({ selectedMarket: nextMarket, selectedMarkets: [...availableMarkets] });
    } else {
      if (availableMarkets.includes(market)) {
        set({ selectedMarket: market, selectedMarkets: [market] });
      }
    }
    get().refreshData(true);
  },

  toggleMarket: (market: SpecificMarketType) => {
    const { markets: availableMarkets } = getEffectiveAvailability(get().selectedSymbol);
    if (!availableMarkets.includes(market)) return; // Prevent selecting unavailable market

    const current = get().selectedMarkets;
    let next: SpecificMarketType[];
    if (current.includes(market)) {
      if (current.length === 1) return; // Prevent empty
      next = current.filter((m) => m !== market);
    } else {
      next = [...current, market];
    }
    const nextMarket: MarketType = next.length === 1 ? next[0] : 'ALL';
    set({ selectedMarkets: next, selectedMarket: nextMarket });
    get().refreshData(true);
  },

  selectAllMarkets: () => {
    const { markets: availableMarkets } = getEffectiveAvailability(get().selectedSymbol);
    const nextMarket: MarketType = availableMarkets.length === 1 ? availableMarkets[0] : 'ALL';
    set({
      selectedMarkets: [...availableMarkets],
      selectedMarket: nextMarket,
    });
    get().refreshData(true);
  },

  toggleExchange: (exchange: ExchangeId) => {
    const { exchanges: availableExchanges } = getEffectiveAvailability(get().selectedSymbol);
    if (!availableExchanges.includes(exchange)) return; // Prevent selecting unavailable exchange

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
    const { exchanges: availableExchanges } = getEffectiveAvailability(get().selectedSymbol);
    set({ selectedExchanges: [...availableExchanges] });
    get().refreshData(true);
  },

  applyFilters: (symbol: string, markets: SpecificMarketType[], exchanges: ExchangeId[]) => {
    const clean = symbol.toUpperCase().replace(/USDT$|USD$|-SWAP$/, '');
    const { markets: availableMarkets, exchanges: availableExchanges } = getEffectiveAvailability(clean);

    let nextMarkets = markets.filter((m) => availableMarkets.includes(m));
    if (nextMarkets.length === 0) {
      nextMarkets = [...availableMarkets];
    }

    let nextExchanges = exchanges.filter((e) => availableExchanges.includes(e));
    if (nextExchanges.length === 0) {
      nextExchanges = [...availableExchanges];
    }

    const nextMarket: MarketType = nextMarkets.length === 1 ? nextMarkets[0] : 'ALL';

    set({
      selectedSymbol: clean,
      selectedMarkets: nextMarkets,
      selectedExchanges: nextExchanges,
      selectedMarket: nextMarket,
    });
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
    const { selectedSymbol, selectedMarkets, selectedTimeframe, selectedExchanges, snapshot } = get();
    
    // Only show full loading spinner if we don't have existing snapshot to avoid layout flicker
    if (!snapshot || force) {
      set({ isLoading: true, error: null });
    }

    try {
      const data = await MarketAnalyticsService.fetchSnapshot(
        selectedSymbol,
        selectedMarkets,
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
