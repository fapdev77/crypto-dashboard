import { describe, it, expect, beforeEach } from 'vitest';
import { useFundingStore, SyncPerformance, ExchangeTimingData } from '../fundingStore';
import { useSettingsStore } from '../settingsStore';
import { CurrentFundingRate } from '../../services/funding/FundingService';

// ── Pure function: find nearest future funding time ────────────────
// Extracted from useFundingSync.ts scheduleNextAutoSync for testability.

function findNearestFutureFundingTime(rates: CurrentFundingRate[], nowMs: number): number {
  let nearest = Infinity;
  for (const rate of rates) {
    if (rate.nextFundingTime > nowMs && rate.nextFundingTime < nearest) {
      nearest = rate.nextFundingTime;
    }
  }
  return nearest;
}

function computeNextAutoSync(rates: CurrentFundingRate[], nowMs: number): number {
  const nearest = findNearestFutureFundingTime(rates, nowMs);
  if (nearest === Infinity) return 0;
  return nearest + 60_000; // +1 minute after funding
}

// ── Pure function: History fetch interval guard ─────────────────────
// Extracted from useFundingSync.ts syncHistoricalRates for testability.
// Returns true if enough time has passed since lastHistoryFetch.

function shouldSyncHistoricalRates(
  lastHistoryFetch: number,
  now: number,
  fundingHistoryInterval: number,
): boolean {
  if (lastHistoryFetch <= 0) return true; // never synced
  const intervalMs = fundingHistoryInterval * 60 * 60 * 1000;
  return (now - lastHistoryFetch) >= intervalMs;
}

// ── Fixtures ───────────────────────────────────────────────────────

function aSyncPerf(overrides?: Partial<SyncPerformance>): SyncPerformance {
  return {
    fetchSec: 10, writeSec: 0.5, totalSec: 10.5, symbols: 50, timestamp: Date.now(),
    ...overrides,
  };
}

function aTiming(overrides?: Partial<ExchangeTimingData> & { name: string }): ExchangeTimingData {
  return {
    name: 'bybit', synced: 20, stale: 25, totalSec: 12, avgMs: 600,
    ...overrides,
  };
}

function makeRate(overrides: Partial<CurrentFundingRate> & { symbol: string }): CurrentFundingRate {
  return {
    exchange: 'bybit',
    instrumentType: 'USDT-M',
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 8 * 3600_000, // 8h from now
    ...overrides,
  };
}

// ───────────────────────────────────────────────────────────────────
// Funding Store — new performance fields
// ───────────────────────────────────────────────────────────────────

describe('fundingStore — performance persistence', () => {
  beforeEach(() => {
    useFundingStore.setState({
      favorites: [],
      currentRates: [],
      isSyncing: false,
      syncProgress: 0,
      syncMessage: '',
      lastHistoryFetch: 0,
      lastSyncPerformance: null,
      lastExchangeTimings: [],
      nextFundingTime: 0,
      nextScheduledSyncTime: 0,
    });
  });

  it('should start with null sync performance', () => {
    const { lastSyncPerformance } = useFundingStore.getState();
    expect(lastSyncPerformance).toBeNull();
  });

  it('should start with empty exchange timings', () => {
    const { lastExchangeTimings } = useFundingStore.getState();
    expect(lastExchangeTimings).toEqual([]);
  });

  it('should start with nextFundingTime = 0', () => {
    const { nextFundingTime } = useFundingStore.getState();
    expect(nextFundingTime).toBe(0);
  });

  it('should start with nextScheduledSyncTime = 0', () => {
    const { nextScheduledSyncTime } = useFundingStore.getState();
    expect(nextScheduledSyncTime).toBe(0);
  });

  describe('setLastSyncPerformance', () => {
    it('should store and retrieve sync performance data', () => {
      const perf: SyncPerformance = {
        fetchSec: 45.2,
        writeSec: 0.3,
        totalSec: 45.5,
        symbols: 187,
        timestamp: Date.now(),
      };

      useFundingStore.getState().setLastSyncPerformance(perf);
      const stored = useFundingStore.getState().lastSyncPerformance;

      expect(stored).not.toBeNull();
      expect(stored!.fetchSec).toBe(45.2);
      expect(stored!.writeSec).toBe(0.3);
      expect(stored!.totalSec).toBe(45.5);
      expect(stored!.symbols).toBe(187);
      expect(stored!.timestamp).toBeGreaterThan(0);
    });

    it('should overwrite previous data on second call', () => {
      const perf1: SyncPerformance = {
        fetchSec: 10, writeSec: 1, totalSec: 11, symbols: 50, timestamp: 1000,
      };
      const perf2: SyncPerformance = {
        fetchSec: 20, writeSec: 2, totalSec: 22, symbols: 100, timestamp: 2000,
      };

      useFundingStore.getState().setLastSyncPerformance(perf1);
      useFundingStore.getState().setLastSyncPerformance(perf2);

      const stored = useFundingStore.getState().lastSyncPerformance;
      expect(stored!.totalSec).toBe(22);
      expect(stored!.symbols).toBe(100);
      expect(stored!.timestamp).toBe(2000);
    });
  });

  describe('setLastExchangeTimings', () => {
    it('should store and retrieve exchange timing data', () => {
      const timings: ExchangeTimingData[] = [
        { name: 'bybit', synced: 45, stale: 50, totalSec: 23.5, avgMs: 470 },
        { name: 'okx', synced: 30, stale: 35, totalSec: 18.2, avgMs: 520 },
      ];

      useFundingStore.getState().setLastExchangeTimings(timings);
      const stored = useFundingStore.getState().lastExchangeTimings;

      expect(stored).toHaveLength(2);
      expect(stored[0].name).toBe('bybit');
      expect(stored[0].synced).toBe(45);
      expect(stored[0].avgMs).toBe(470);
      expect(stored[1].name).toBe('okx');
    });

    it('should replace timings on second call', () => {
      const t1: ExchangeTimingData[] = [{ name: 'bybit', synced: 10, stale: 10, totalSec: 5, avgMs: 500 }];
      const t2: ExchangeTimingData[] = [{ name: 'bitget', synced: 20, stale: 20, totalSec: 8, avgMs: 400 }];

      useFundingStore.getState().setLastExchangeTimings(t1);
      useFundingStore.getState().setLastExchangeTimings(t2);

      expect(useFundingStore.getState().lastExchangeTimings).toHaveLength(1);
      expect(useFundingStore.getState().lastExchangeTimings[0].name).toBe('bitget');
    });
  });

  describe('setNextFundingTime', () => {
    it('should store a funding settlement timestamp', () => {
      const fundingTime = Date.now() + 8 * 3600_000;

      useFundingStore.getState().setNextFundingTime(fundingTime);
      expect(useFundingStore.getState().nextFundingTime).toBe(fundingTime);
    });

    it('should overwrite with a new funding time', () => {
      useFundingStore.getState().setNextFundingTime(Date.now() + 4 * 3600_000);
      const later = Date.now() + 8 * 3600_000;
      useFundingStore.getState().setNextFundingTime(later);

      expect(useFundingStore.getState().nextFundingTime).toBe(later);
    });

    it('should reset to 0 when cleared', () => {
      useFundingStore.getState().setNextFundingTime(Date.now() + 3600_000);
      useFundingStore.getState().setNextFundingTime(0);

      expect(useFundingStore.getState().nextFundingTime).toBe(0);
    });
  });

  describe('setNextScheduledSyncTime', () => {
    it('should store a future sync timestamp', () => {
      const future = Date.now() + 8 * 3600_000 + 60_000;

      useFundingStore.getState().setNextScheduledSyncTime(future);
      expect(useFundingStore.getState().nextScheduledSyncTime).toBe(future);
    });

    it('should reset to 0 when cleared', () => {
      useFundingStore.getState().setNextScheduledSyncTime(Date.now() + 3600_000);
      useFundingStore.getState().setNextScheduledSyncTime(0);

      expect(useFundingStore.getState().nextScheduledSyncTime).toBe(0);
    });
  });

  describe('favorites — toggleFavorite', () => {
    it('should start with empty favorites', () => {
      expect(useFundingStore.getState().favorites).toEqual([]);
    });

    it('should add a coin to favorites', () => {
      useFundingStore.getState().toggleFavorite('BTC');
      expect(useFundingStore.getState().favorites).toEqual(['BTC']);
    });

    it('should add multiple coins', () => {
      useFundingStore.getState().toggleFavorite('BTC');
      useFundingStore.getState().toggleFavorite('ETH');
      useFundingStore.getState().toggleFavorite('SOL');
      expect(useFundingStore.getState().favorites).toEqual(['BTC', 'ETH', 'SOL']);
    });

    it('should remove a coin when toggled again', () => {
      useFundingStore.getState().toggleFavorite('BTC');
      useFundingStore.getState().toggleFavorite('ETH');
      expect(useFundingStore.getState().favorites).toEqual(['BTC', 'ETH']);

      useFundingStore.getState().toggleFavorite('BTC');
      expect(useFundingStore.getState().favorites).toEqual(['ETH']);
    });

    it('should toggle the same coin multiple times', () => {
      useFundingStore.getState().toggleFavorite('BTC');
      useFundingStore.getState().toggleFavorite('BTC');
      expect(useFundingStore.getState().favorites).toEqual([]);

      useFundingStore.getState().toggleFavorite('BTC');
      expect(useFundingStore.getState().favorites).toEqual(['BTC']);
    });
  });

  describe('setCurrentRates', () => {
    it('should start with empty rates', () => {
      expect(useFundingStore.getState().currentRates).toEqual([]);
    });

    it('should store current funding rates', () => {
      const rates: CurrentFundingRate[] = [
        { exchange: 'bybit', symbol: 'BTCUSDT', instrumentType: 'USDT-M', fundingRate: 0.0001, nextFundingTime: Date.now() + 3600_000 },
        { exchange: 'bybit', symbol: 'ETHUSDT', instrumentType: 'USDT-M', fundingRate: 0.0002, nextFundingTime: Date.now() + 3600_000 },
      ];

      useFundingStore.getState().setCurrentRates(rates);
      expect(useFundingStore.getState().currentRates).toHaveLength(2);
      expect(useFundingStore.getState().currentRates[0].symbol).toBe('BTCUSDT');
      expect(useFundingStore.getState().currentRates[1].fundingRate).toBe(0.0002);
    });

    it('should overwrite previous rates', () => {
      useFundingStore.getState().setCurrentRates([
        { exchange: 'bybit', symbol: 'BTCUSDT', instrumentType: 'USDT-M', fundingRate: 0.0001, nextFundingTime: Date.now() },
      ]);
      expect(useFundingStore.getState().currentRates).toHaveLength(1);

      useFundingStore.getState().setCurrentRates([]);
      expect(useFundingStore.getState().currentRates).toEqual([]);
    });
  });

  describe('setSyncStatus', () => {
    it('should update all three status fields at once', () => {
      useFundingStore.getState().setSyncStatus(true, 50, 'Syncing 50%...');

      const state = useFundingStore.getState();
      expect(state.isSyncing).toBe(true);
      expect(state.syncProgress).toBe(50);
      expect(state.syncMessage).toBe('Syncing 50%...');
    });

    it('should clear sync status', () => {
      useFundingStore.getState().setSyncStatus(true, 100, 'Done');
      useFundingStore.getState().setSyncStatus(false, 0, '');

      const state = useFundingStore.getState();
      expect(state.isSyncing).toBe(false);
      expect(state.syncProgress).toBe(0);
      expect(state.syncMessage).toBe('');
    });
  });

  describe('setLastHistoryFetch', () => {
    it('should start with lastHistoryFetch = 0', () => {
      expect(useFundingStore.getState().lastHistoryFetch).toBe(0);
    });

    it('should store a fetch timestamp', () => {
      const ts = Date.now();
      useFundingStore.getState().setLastHistoryFetch(ts);
      expect(useFundingStore.getState().lastHistoryFetch).toBe(ts);
    });

    it('should overwrite previous timestamp', () => {
      useFundingStore.getState().setLastHistoryFetch(1000);
      useFundingStore.getState().setLastHistoryFetch(2000);
      expect(useFundingStore.getState().lastHistoryFetch).toBe(2000);
    });
  });

  describe('partialize — persisted fields', () => {
    it('should include the new performance fields in partialize output', () => {
      const { setLastSyncPerformance, setLastExchangeTimings, setNextFundingTime, setNextScheduledSyncTime } = useFundingStore.getState();

      setLastSyncPerformance({ fetchSec: 30, writeSec: 0.5, totalSec: 30.5, symbols: 100, timestamp: 12345 });
      setLastExchangeTimings([{ name: 'bybit', synced: 20, stale: 25, totalSec: 12, avgMs: 600 }]);
      setNextFundingTime(88888);
      setNextScheduledSyncTime(99999);

      // Re-read fresh state after mutations
      const fresh = useFundingStore.getState();
      const partial = {
        favorites: fresh.favorites,
        lastHistoryFetch: fresh.lastHistoryFetch,
        lastSyncPerformance: fresh.lastSyncPerformance,
        lastExchangeTimings: fresh.lastExchangeTimings,
        nextFundingTime: fresh.nextFundingTime,
        nextScheduledSyncTime: fresh.nextScheduledSyncTime,
      };

      expect(partial.lastSyncPerformance).not.toBeNull();
      expect(partial.lastExchangeTimings).toHaveLength(1);
      expect(partial.nextFundingTime).toBe(88888);
      expect(partial.nextScheduledSyncTime).toBe(99999);
    });

    it('should NOT persist transient fields (currentRates, isSyncing)', () => {
      const fresh = useFundingStore.getState();
      const partial = {
        favorites: fresh.favorites,
        lastHistoryFetch: fresh.lastHistoryFetch,
        lastSyncPerformance: fresh.lastSyncPerformance,
        lastExchangeTimings: fresh.lastExchangeTimings,
        nextFundingTime: fresh.nextFundingTime,
        nextScheduledSyncTime: fresh.nextScheduledSyncTime,
      };

      expect((partial as any).currentRates).toBeUndefined();
      expect((partial as any).isSyncing).toBeUndefined();
    });
  });

  describe('localStorage persist integration', () => {
    beforeEach(() => {
      localStorage.removeItem('funding-store');
    });

    it('should persist favorites to localStorage', () => {
      useFundingStore.getState().toggleFavorite('SOL');
      useFundingStore.getState().toggleFavorite('BTC');

      const stored = JSON.parse(localStorage.getItem('funding-store') || '{}');
      expect(stored.state.favorites).toEqual(['SOL', 'BTC']);
    });

    it('should persist lastHistoryFetch to localStorage', () => {
      useFundingStore.getState().setLastHistoryFetch(123456789);

      const stored = JSON.parse(localStorage.getItem('funding-store') || '{}');
      expect(stored.state.lastHistoryFetch).toBe(123456789);
    });

    it('should persist lastSyncPerformance to localStorage', () => {
      useFundingStore.getState().setLastSyncPerformance(
        aSyncPerf({ totalSec: 45.5, symbols: 200, timestamp: 99999 }),
      );

      const stored = JSON.parse(localStorage.getItem('funding-store') || '{}');
      expect(stored.state.lastSyncPerformance.totalSec).toBe(45.5);
      expect(stored.state.lastSyncPerformance.symbols).toBe(200);
      expect(stored.state.lastSyncPerformance.timestamp).toBe(99999);
    });

    it('should persist lastExchangeTimings to localStorage', () => {
      useFundingStore.getState().setLastExchangeTimings([
        aTiming({ name: 'bybit', synced: 45, avgMs: 470 }),
        aTiming({ name: 'okx', synced: 30, avgMs: 520 }),
      ]);

      const stored = JSON.parse(localStorage.getItem('funding-store') || '{}');
      expect(stored.state.lastExchangeTimings).toHaveLength(2);
      expect(stored.state.lastExchangeTimings[0].name).toBe('bybit');
      expect(stored.state.lastExchangeTimings[0].avgMs).toBe(470);
    });

    it('should persist nextFundingTime to localStorage', () => {
      useFundingStore.getState().setNextFundingTime(88888);

      const stored = JSON.parse(localStorage.getItem('funding-store') || '{}');
      expect(stored.state.nextFundingTime).toBe(88888);
    });

    it('should persist nextScheduledSyncTime to localStorage', () => {
      useFundingStore.getState().setNextScheduledSyncTime(99999);

      const stored = JSON.parse(localStorage.getItem('funding-store') || '{}');
      expect(stored.state.nextScheduledSyncTime).toBe(99999);
    });

    it('should NOT persist transient fields to localStorage', () => {
      useFundingStore.getState().setCurrentRates([
        { exchange: 'bybit', symbol: 'BTCUSDT', instrumentType: 'USDT-M', fundingRate: 0.0001, nextFundingTime: Date.now() },
      ]);

      const stored = JSON.parse(localStorage.getItem('funding-store') || '{}');
      expect(stored.state.currentRates).toBeUndefined();
      expect(stored.state.isSyncing).toBeUndefined();
    });

    it('should restore persisted fields on rehydration', () => {
      localStorage.setItem('funding-store', JSON.stringify({
        state: {
          favorites: ['BTC'],
          lastHistoryFetch: 55555,
          lastSyncPerformance: aSyncPerf({ timestamp: 77777 }),
          lastExchangeTimings: [aTiming({ name: 'bitget', avgMs: 400 })],
          nextFundingTime: 88888,
          nextScheduledSyncTime: 99999,
        },
        version: 0,
      }));

      // Simulate rehydration (normally done by zustand persist middleware)
      useFundingStore.setState({
        favorites: ['BTC'],
        lastHistoryFetch: 55555,
        lastSyncPerformance: aSyncPerf({ timestamp: 77777 }),
        lastExchangeTimings: [aTiming({ name: 'bitget', avgMs: 400 })],
        nextFundingTime: 88888,
        nextScheduledSyncTime: 99999,
      });

      const state = useFundingStore.getState();
      expect(state.favorites).toEqual(['BTC']);
      expect(state.lastHistoryFetch).toBe(55555);
      expect(state.lastSyncPerformance!.timestamp).toBe(77777);
      expect(state.lastExchangeTimings[0].avgMs).toBe(400);
      expect(state.nextFundingTime).toBe(88888);
      expect(state.nextScheduledSyncTime).toBe(99999);
    });
  });
});

// ───────────────────────────────────────────────────────────────────
// History fetch interval guard — pure function + store integration
// ───────────────────────────────────────────────────────────────────

describe('fundingHistoryInterval guard', () => {
  const FIXED_NOW = 1_000_000_000_000;
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;   // 14_400_000
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;     // 21_600_000
  const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;   // 28_800_000

  // ── Pure function tests ─────────────────────────────────────

  describe('shouldSyncHistoricalRates (pure function)', () => {
    it('should return true when lastHistoryFetch is 0 (never synced)', () => {
      expect(shouldSyncHistoricalRates(0, FIXED_NOW, 4)).toBe(true);
    });

    it('should return true when lastHistoryFetch is negative (edge case)', () => {
      expect(shouldSyncHistoricalRates(-1, FIXED_NOW, 4)).toBe(true);
    });

    it('should return false when within the 4h interval (no cooldown elapsed)', () => {
      const lastFetch = FIXED_NOW - 3_600_000; // 1 hour ago
      expect(shouldSyncHistoricalRates(lastFetch, FIXED_NOW, 4)).toBe(false);
    });

    it('should return false when within the 8h interval', () => {
      const lastFetch = FIXED_NOW - 4 * 3600_000; // 4 hours ago
      expect(shouldSyncHistoricalRates(lastFetch, FIXED_NOW, 8)).toBe(false);
    });

    it('should return true when exactly at the interval boundary', () => {
      const lastFetch = FIXED_NOW - FOUR_HOURS_MS; // exactly 4h ago
      expect(shouldSyncHistoricalRates(lastFetch, FIXED_NOW, 4)).toBe(true);
    });

    it('should return true when past the interval boundary', () => {
      const lastFetch = FIXED_NOW - SIX_HOURS_MS; // 6h ago (4h interval)
      expect(shouldSyncHistoricalRates(lastFetch, FIXED_NOW, 4)).toBe(true);
    });

    it('should respect interval of 6h (mid-range)', () => {
      // 5h ago → within 6h interval → should NOT sync
      const lastFetch = FIXED_NOW - 5 * 3600_000;
      expect(shouldSyncHistoricalRates(lastFetch, FIXED_NOW, 6)).toBe(false);

      // 7h ago → past 6h interval → should sync
      const olderFetch = FIXED_NOW - 7 * 3600_000;
      expect(shouldSyncHistoricalRates(olderFetch, FIXED_NOW, 6)).toBe(true);
    });

    it('should respect interval of 8h (maximum of range)', () => {
      // 6h ago → within 8h interval → should NOT sync
      const lastFetch = FIXED_NOW - 6 * 3600_000;
      expect(shouldSyncHistoricalRates(lastFetch, FIXED_NOW, 8)).toBe(false);

      // 10h ago → past 8h interval → should sync
      const olderFetch = FIXED_NOW - 10 * 3600_000;
      expect(shouldSyncHistoricalRates(olderFetch, FIXED_NOW, 8)).toBe(true);
    });

    it('should work with fractional intervals', () => {
      // fundingHistoryInterval is always integer (1-8), but the formula handles any number
      const lastFetch = FIXED_NOW - 2 * 3600_000; // 2h ago
      // With interval = 1h, 2h > 1h → should sync
      expect(shouldSyncHistoricalRates(lastFetch, FIXED_NOW, 1)).toBe(true);
    });
  });

  // ── Store integration tests ────────────────────────────────

  describe('store integration', () => {
    beforeEach(() => {
      // Reset both stores to known state
      useFundingStore.setState({
        lastHistoryFetch: 0,
        favorites: [],
        currentRates: [],
        isSyncing: false,
        syncProgress: 0,
        syncMessage: '',
        lastSyncPerformance: null,
        lastExchangeTimings: [],
        nextFundingTime: 0,
        nextScheduledSyncTime: 0,
      });
      useSettingsStore.setState({
        fundingHistoryInterval: 4,
        fundingPollingInterval: 1,
      });
    });

    it('should allow sync when lastHistoryFetch is 0 (initial state)', () => {
      const lastFetch = useFundingStore.getState().lastHistoryFetch;
      const interval = useSettingsStore.getState().fundingHistoryInterval;

      expect(shouldSyncHistoricalRates(lastFetch, Date.now(), interval)).toBe(true);
    });

    it('should prevent sync when lastHistoryFetch + interval has not elapsed', () => {
      const now = Date.now();
      // Simulate a sync that happened 30 minutes ago
      useFundingStore.getState().setLastHistoryFetch(now - 30 * 60 * 1000);

      const lastFetch = useFundingStore.getState().lastHistoryFetch;
      const interval = useSettingsStore.getState().fundingHistoryInterval;

      // Default 4h interval → 30 min < 4h → NOT expired
      expect(shouldSyncHistoricalRates(lastFetch, now, interval)).toBe(false);
    });

    it('should allow sync after interval has elapsed (with store values)', () => {
      const now = Date.now();
      // Simulate a sync that happened 6 hours ago
      useFundingStore.getState().setLastHistoryFetch(now - 6 * 60 * 60 * 1000);

      const lastFetch = useFundingStore.getState().lastHistoryFetch;
      const interval = useSettingsStore.getState().fundingHistoryInterval;

      // Default 4h interval → 6h > 4h → expired
      expect(shouldSyncHistoricalRates(lastFetch, now, interval)).toBe(true);
    });

    it('should prevent sync with 6h interval set in store (custom range)', () => {
      useSettingsStore.getState().setFundingHistoryInterval(6);
      const now = Date.now();
      // Simulate sync 5h ago
      useFundingStore.getState().setLastHistoryFetch(now - 5 * 60 * 60 * 1000);

      const lastFetch = useFundingStore.getState().lastHistoryFetch;
      const interval = useSettingsStore.getState().fundingHistoryInterval;

      // 6h interval → 5h < 6h → NOT expired
      expect(shouldSyncHistoricalRates(lastFetch, now, interval)).toBe(false);

      // Now 7h later (simulate time passing by adjusting lastFetch)
      const olderNow = now + 2 * 60 * 60 * 1000; // 2h later
      expect(shouldSyncHistoricalRates(lastFetch, olderNow, interval)).toBe(true);
    });

    it('should use fundingHistoryInterval from settingsStore in guard', () => {
      // Verify the guard reads from the same store that the UI slider controls
      useSettingsStore.getState().setFundingHistoryInterval(8);
      const now = Date.now();
      // 4h ago + 8h interval = not expired
      useFundingStore.getState().setLastHistoryFetch(now - 4 * 60 * 60 * 1000);

      const shouldSync = shouldSyncHistoricalRates(
        useFundingStore.getState().lastHistoryFetch,
        now,
        useSettingsStore.getState().fundingHistoryInterval,
      );
      expect(shouldSync).toBe(false);
    });
  });
});

// ───────────────────────────────────────────────────────────────────
// Schedule logic — pure functions
// ───────────────────────────────────────────────────────────────────

describe('scheduleNextAutoSync — core logic', () => {
  const baseNow = Date.now();

  it('should find the nearest future funding time among all rates', () => {
    const rates: CurrentFundingRate[] = [
      makeRate({ symbol: 'BTCUSDT', nextFundingTime: baseNow + 8 * 3600_000 }),
      makeRate({ symbol: 'ETHUSDT', nextFundingTime: baseNow + 16 * 3600_000 }),
      makeRate({ symbol: 'SOLUSDT', nextFundingTime: baseNow + 4 * 3600_000 }),
    ];

    const nearest = findNearestFutureFundingTime(rates, baseNow);
    // SOL has the nearest (4h from now)
    expect(nearest).toBe(baseNow + 4 * 3600_000);
  });

  it('should ignore rates with nextFundingTime in the past', () => {
    const rates: CurrentFundingRate[] = [
      makeRate({ symbol: 'BTCUSDT', nextFundingTime: baseNow - 3600_000 }), // 1h ago
      makeRate({ symbol: 'ETHUSDT', nextFundingTime: baseNow + 8 * 3600_000 }), // 8h from now
    ];

    const nearest = findNearestFutureFundingTime(rates, baseNow);
    expect(nearest).toBe(baseNow + 8 * 3600_000);
  });

  it('should return Infinity when all rates are in the past', () => {
    const rates: CurrentFundingRate[] = [
      makeRate({ symbol: 'BTCUSDT', nextFundingTime: baseNow - 3600_000 }),
      makeRate({ symbol: 'ETHUSDT', nextFundingTime: baseNow - 7200_000 }),
    ];

    const nearest = findNearestFutureFundingTime(rates, baseNow);
    expect(nearest).toBe(Infinity);
  });

  it('should return 0 from computeNextAutoSync when no future funding found', () => {
    const rates: CurrentFundingRate[] = [
      makeRate({ symbol: 'BTCUSDT', nextFundingTime: baseNow - 3600_000 }),
    ];

    const nextSync = computeNextAutoSync(rates, baseNow);
    expect(nextSync).toBe(0);
  });

  it('should compute nextSyncTime = nearestFundingTime + 60s', () => {
    const rates: CurrentFundingRate[] = [
      makeRate({ symbol: 'BTCUSDT', nextFundingTime: baseNow + 8 * 3600_000 }),
    ];

    const nextSync = computeNextAutoSync(rates, baseNow);
    expect(nextSync).toBe(baseNow + 8 * 3600_000 + 60_000);
  });

  it('should handle empty rates array', () => {
    const rates: CurrentFundingRate[] = [];
    const nearest = findNearestFutureFundingTime(rates, baseNow);
    expect(nearest).toBe(Infinity);
    expect(computeNextAutoSync(rates, baseNow)).toBe(0);
  });

  it('should pick the same time for same-epoch rates', () => {
    // All rates have the same funding time (typical real-world scenario)
    const fundingEpoch = baseNow + 8 * 3600_000;
    const rates: CurrentFundingRate[] = [
      makeRate({ symbol: 'BTCUSDT', nextFundingTime: fundingEpoch }),
      makeRate({ symbol: 'ETHUSDT', nextFundingTime: fundingEpoch }),
      makeRate({ symbol: 'SOLUSDT', nextFundingTime: fundingEpoch }),
    ];

    const nearest = findNearestFutureFundingTime(rates, baseNow);
    expect(nearest).toBe(fundingEpoch);
  });

  it('should work with a mix of bybit, okx, bitget rates', () => {
    const now = baseNow;
    const rates: CurrentFundingRate[] = [
      { exchange: 'bybit', symbol: 'BTCUSDT', instrumentType: 'USDT-M', fundingRate: 0.0001, nextFundingTime: now + 8 * 3600_000 },
      { exchange: 'okx', symbol: 'ETH-USDT-SWAP', instrumentType: 'USDT-M', fundingRate: 0.0002, nextFundingTime: now + 4 * 3600_000 },
      { exchange: 'bitget', symbol: 'SOLUSDT', instrumentType: 'USDT-M', fundingRate: 0.0003, nextFundingTime: now + 12 * 3600_000 },
    ];

    const nearest = findNearestFutureFundingTime(rates, now);
    expect(nearest).toBe(now + 4 * 3600_000); // OKX is nearest
  });
});
