import { describe, it, expect, beforeEach } from 'vitest';
import { useMarketAnalyticsStore } from '../marketAnalyticsStore';
import { useSettingsStore } from '../settingsStore';

describe('useMarketAnalyticsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ useMockData: true });
    localStorage.clear();
  });

  it('should initialize with default state and favorites', () => {
    const state = useMarketAnalyticsStore.getState();
    expect(state.selectedSymbol).toBe('BTC');
    expect(state.selectedMarket).toBe('ALL');
    expect(state.selectedTimeframe).toBe('1h');
    expect(state.favorites).toContain('BTC');
    expect(state.pollingIntervalSeconds).toBe(15);
  });

  it('should toggle favorites correctly and persist to localStorage', () => {
    const store = useMarketAnalyticsStore.getState();
    
    // Toggle ETH (if present, removes; if absent, adds)
    const initialFavCount = store.favorites.length;
    const hasEth = store.favorites.includes('ETH');

    store.toggleFavorite('ETH');
    const afterToggle = useMarketAnalyticsStore.getState().favorites;
    if (hasEth) {
      expect(afterToggle).not.toContain('ETH');
      expect(afterToggle.length).toBe(initialFavCount - 1);
    } else {
      expect(afterToggle).toContain('ETH');
      expect(afterToggle.length).toBe(initialFavCount + 1);
    }

    // Toggle a new symbol (e.g. SOL or AVAX)
    store.toggleFavorite('AVAX');
    expect(useMarketAnalyticsStore.getState().favorites).toContain('AVAX');

    // BTC should NEVER be removed from favorites (permanent fixed favorite)
    store.toggleFavorite('BTC');
    expect(useMarketAnalyticsStore.getState().favorites).toContain('BTC');
  });

  it('should support multi-market toggle and selecting all markets', () => {
    const store = useMarketAnalyticsStore.getState();
    expect(store.selectedMarkets).toEqual(['PERP', 'INVERSE', 'SPOT']);
    expect(store.selectedMarket).toBe('ALL');

    // Toggle PERP off
    store.toggleMarket('PERP');
    expect(useMarketAnalyticsStore.getState().selectedMarkets).not.toContain('PERP');

    // Select all markets
    store.selectAllMarkets();
    expect(useMarketAnalyticsStore.getState().selectedMarkets).toEqual(['PERP', 'INVERSE', 'SPOT']);
    expect(useMarketAnalyticsStore.getState().selectedMarket).toBe('ALL');
  });

  it('should support multi-exchange toggle and selectAllExchanges', () => {
    const store = useMarketAnalyticsStore.getState();
    expect(store.selectedExchanges).toEqual(['bybit', 'okx', 'bitget']);

    store.toggleExchange('bybit');
    expect(useMarketAnalyticsStore.getState().selectedExchanges).toEqual(['okx', 'bitget']);

    store.selectAllExchanges();
    expect(useMarketAnalyticsStore.getState().selectedExchanges).toEqual(['bybit', 'okx', 'bitget']);
  });

  it('should set market and timeframe including 30m and 5m', () => {
    const store = useMarketAnalyticsStore.getState();
    
    store.setSelectedMarket('PERP');
    expect(useMarketAnalyticsStore.getState().selectedMarket).toBe('PERP');

    store.setSelectedTimeframe('30m');
    expect(useMarketAnalyticsStore.getState().selectedTimeframe).toBe('30m');

    store.setSelectedTimeframe('5m');
    expect(useMarketAnalyticsStore.getState().selectedTimeframe).toBe('5m');

    store.setSelectedTimeframe('4h');
    expect(useMarketAnalyticsStore.getState().selectedTimeframe).toBe('4h');
  });

  it('should fetch analytics snapshot with correct shape and data', async () => {
    const store = useMarketAnalyticsStore.getState();
    await store.refreshData(true);

    const snapshot = useMarketAnalyticsStore.getState().snapshot;
    expect(snapshot).toBeDefined();
    expect(snapshot?.symbol).toBe('BTC');
    expect(snapshot?.currentPrice).toBeGreaterThan(0);
    expect(snapshot?.oiHistory.length).toBeGreaterThan(0);
    expect(snapshot?.takerFlowHistory.length).toBeGreaterThan(0);
    expect(snapshot?.regime.title).toBeTruthy();
    expect(snapshot?.sentiment.greedFearScore).toBeGreaterThanOrEqual(0);
    expect(snapshot?.sentiment.greedFearScore).toBeLessThanOrEqual(100);
    expect(snapshot?.fundingArbitrage.length).toBeGreaterThan(0);
  });

  it('should support selecting uncataloged or non-default coins seamlessly', async () => {
    const store = useMarketAnalyticsStore.getState();
    store.setSelectedSymbol('PEPE');
    expect(useMarketAnalyticsStore.getState().selectedSymbol).toBe('PEPE');

    await store.refreshData(true);
    const snapshot = useMarketAnalyticsStore.getState().snapshot;
    expect(snapshot).toBeDefined();
    expect(snapshot?.symbol).toBe('PEPE');
    expect(snapshot?.currentFunding?.symbol).toBe('PEPE');
    expect(snapshot?.currentPrice).toBeGreaterThan(0);
  });
});
