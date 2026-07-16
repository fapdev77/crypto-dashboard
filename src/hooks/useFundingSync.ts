import { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useFundingStore } from '../store/fundingStore';
import { FundingService, CurrentFundingRate } from '../services/funding/FundingService';
import { 
  getFundingMeta, 
  updateFundingMeta, 
  saveFundingFeesCache 
} from '../services/historyCache';
import { LogManager } from '../services/LogManager';

const EXCHANGES: ('bybit' | 'okx' | 'bitget')[] = ['bybit', 'okx', 'bitget'];

/** How recent (ms) a cached record's latestTimestamp must be to consider the symbol up-to-date. */
const FUNDING_CYCLE_MS = 8 * 60 * 60 * 1000; // 8 hours

/** Minimum data span (ms) before we consider the cache deep enough and stop refetching.
 *  ~400 days ensures last6Months and 1-year columns are meaningful.
 *  Bybit: startTime=400d ago + 10 pages × 200 records → full 400-day span.
 *  Bitget: api limit ~3 months (similar to OKX); accumulates over time in cache.
 *  OKX:   api limit ~3 months; accumulates over time in cache (freshness-only check). */
const TARGET_DEPTH_MS = 400 * 24 * 60 * 60 * 1000;

/** Number of symbols to fetch in parallel during historical sync. */
const BATCH_SIZE = 20;

/** Delay (ms) between batches to avoid hammering API rate limits. */
const BATCH_DELAY_MS = 300;

/**
 * Process a single symbol: check cache freshness, fetch history if stale, save to IndexedDB.
 * Extracted so the batch loop can call it concurrently via Promise.allSettled.
 */
/**
 * Decide whether a symbol needs history fetch, and which kind:
 *   - full: fetch complete 400-day depth (first sync or accumulated data is shallow)
 *   - incremental: fetch only records since the latest cached timestamp
 *   - skip: data is already fresh and deep enough
 *
 * @internal Exported for unit-testing only.
 */
export async function processSymbol(rate: CurrentFundingRate, now: number): Promise<void> {
  const startTs = performance.now();
  try {
    const meta = await getFundingMeta(rate.exchange, rate.symbol);

    if (!meta) {
      // ── No cache at all → full fetch ──
      await doFullFetch(rate);
    } else {
      const spanMs = meta.latestTimestamp - meta.oldestTimestamp;
      const isDeepEnough = spanMs >= TARGET_DEPTH_MS;
      const isFresh = (now - meta.latestTimestamp) < FUNDING_CYCLE_MS;

      if (rate.exchange === 'okx' || rate.exchange === 'bitget') {
        // OKX/Bitget: freshness-only (API never returns > 3 months)
        if (isFresh) return;
        await doFullFetch(rate, meta.oldestTimestamp, meta.latestTimestamp);
      } else if (isFresh && isDeepEnough) {
        // Bybit: fresh + deep → nothing to do
        return;
      } else if (!isFresh && isDeepEnough) {
        // Bybit: stale + deep → incremental fetch (just new records)
        await doIncrementalFetch(rate, meta.latestTimestamp, meta.oldestTimestamp);
      } else {
        // Bybit: not deep enough yet → full fetch (accumulate depth)
        await doFullFetch(rate, meta.oldestTimestamp, meta.latestTimestamp);
      }
    }

    const elapsed = Math.round(performance.now() - startTs);
    if (elapsed > 2000) {
      LogManager.warn('useFundingSync', `processSymbol ${rate.exchange} ${rate.symbol} took ${elapsed}ms`);
    }
  } catch (e) {
    const elapsed = Math.round(performance.now() - startTs);
    LogManager.error('useFundingSync', `processSymbol error for ${rate.exchange} ${rate.symbol} (${elapsed}ms):`, e);
  }
}

/** Full fetch: get ~400 days of funding history, preserving existing cache depth. */
async function doFullFetch(rate: CurrentFundingRate, existingOldest?: number, existingLatest?: number): Promise<void> {
  const history = await FundingService.fetchFundingHistory(
    rate.exchange, rate.symbol, rate.instrumentType, 200
  );

  if (history.length > 0) {
    await saveFundingFeesCache(history);
    await updateFundingMeta(
      rate.exchange, rate.symbol,
      existingOldest ? Math.min(existingOldest, history[history.length - 1].timestamp) : history[history.length - 1].timestamp,
      existingLatest ? Math.max(existingLatest, history[0].timestamp) : history[0].timestamp
    );
  }
}

/** Incremental fetch: get only records we haven't cached yet. */
async function doIncrementalFetch(rate: CurrentFundingRate, sinceTimestamp: number, existingOldest: number): Promise<void> {
  const history = await FundingService.fetchFundingHistory(
    rate.exchange, rate.symbol, rate.instrumentType, 200, sinceTimestamp
  );

  // Filter to only truly new records (avoid upserting duplicates)
  const newRecords = history.filter(r => r.timestamp > sinceTimestamp);

  if (newRecords.length > 0) {
    await saveFundingFeesCache(newRecords);
    await updateFundingMeta(
      rate.exchange, rate.symbol,
      existingOldest,
      newRecords[0].timestamp
    );
  }
}

export function useFundingSync() {
  const { fundingPollingInterval, fundingHistoryInterval, useMockData } = useSettingsStore();
  const setLastSyncTime = useSettingsStore(state => state.setLastSyncTime);
  const { setSyncStatus, lastHistoryFetch, setLastHistoryFetch } = useFundingStore();
  
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncInProgressRef = useRef(false);
  const fetchingRef = useRef(false);

  // ── Mirror lastHistoryFetch in a ref to break the effect re-trigger cycle ──
  const lastHistoryFetchRef = useRef(lastHistoryFetch);
  useEffect(() => {
    lastHistoryFetchRef.current = lastHistoryFetch;
  }, [lastHistoryFetch]);

  // Poll current rates (fast, single endpoint per exchange usually)
  const fetchCurrentRates = useCallback(async () => {
    if (useMockData || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const results: CurrentFundingRate[] = [];
      for (const ex of EXCHANGES) {
        const rates = await FundingService.fetchCurrentFundingRates(ex);
        results.push(...rates);
      }
      
      useFundingStore.setState({ currentRates: results });
    } catch (e) {
      LogManager.error('useFundingSync', 'Failed to fetch current rates:', e);
    } finally {
      fetchingRef.current = false;
    }
  }, [useMockData]);

  // Sync historical rates slowly
  const syncHistoricalRates = useCallback(async (currentRates: CurrentFundingRate[]) => {
    if (useMockData || syncInProgressRef.current) return;
    
    // Check global rate-limit guard using the REF (not state) so this callback stays stable
    const now = Date.now();
    const intervalMs = fundingHistoryInterval * 60 * 60 * 1000;
    
    if (now - lastHistoryFetchRef.current < intervalMs) {
      return; // Not time yet
    }
    
    syncInProgressRef.current = true;
    let successCount = 0;
    
    try {
      const totalSymbols = currentRates.length;
      if (totalSymbols === 0) {
        syncInProgressRef.current = false;
        return;
      }

      setSyncStatus(true, 0, 'Starting historical funding sync...');
      
      // Process symbols in parallel batches to dramatically reduce total sync time
      // while still respecting API rate limits
      for (let batchStart = 0; batchStart < totalSymbols; batchStart += BATCH_SIZE) {
        const batch = currentRates.slice(batchStart, batchStart + BATCH_SIZE);
        
        // Update progress at the start of each batch
        const pct = Math.round((batchStart / totalSymbols) * 100);
        const endIdx = Math.min(batchStart + BATCH_SIZE, totalSymbols);
        setSyncStatus(true, pct, `Syncing symbols ${batchStart + 1}–${endIdx} of ${totalSymbols}...`);
        
        // Fire all symbols in this batch concurrently
        const results = await Promise.allSettled(
          batch.map(sym => processSymbol(sym, now))
        );
        
        successCount += results.filter(r => r.status === 'fulfilled').length;
        
        // Brief pause between batches to avoid overwhelming exchange APIs
        if (batchStart + BATCH_SIZE < totalSymbols) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }
      
      const completedAt = Date.now();
      setLastHistoryFetch(completedAt);
      lastHistoryFetchRef.current = completedAt;
      setLastSyncTime(completedAt);
      setSyncStatus(false, 100, `Synced ${successCount} symbols.`);
      
    } catch (error: any) {
      LogManager.error('useFundingSync', 'Historical sync error:', error);
      setSyncStatus(false, 0, `Sync failed: ${error.message}`);
    } finally {
      syncInProgressRef.current = false;
      setTimeout(() => {
        if (!syncInProgressRef.current) {
          setSyncStatus(false, 0, '');
        }
      }, 3000);
    }
  }, [useMockData, fundingHistoryInterval, setLastHistoryFetch, setLastSyncTime, setSyncStatus]);
  // NOTE: lastHistoryFetch intentionally NOT in deps — we use lastHistoryFetchRef instead

  // Expose manual trigger (defined BEFORE main useEffect so the effect closure captures it safely)
  const forceSync = async () => {
    if (syncInProgressRef.current) return;
    await fetchCurrentRates();
    const rates = useFundingStore.getState().currentRates;
    if (rates && rates.length > 0) {
      // Force bypass interval check
      setLastHistoryFetch(0);
      lastHistoryFetchRef.current = 0;
      await syncHistoricalRates(rates);
    }
  };

  // Main loop
  useEffect(() => {
    if (useMockData) return;
    
    // Initial fetch
    fetchCurrentRates().then(() => {
      const rates = useFundingStore.getState().currentRates;
      if (rates && rates.length > 0) {
         syncHistoricalRates(rates);
      }
    });
    
    // Polling setup
    const intervalMs = fundingPollingInterval * 60 * 1000;
    pollingTimerRef.current = setInterval(() => {
      fetchCurrentRates();
    }, intervalMs);
    
    // Listen for manual cache-cleared events from Settings and re-sync immediately.
    const onCacheCleared = () => {
      // Defer to avoid calling forceSync() synchronously inside a dispatch().
      setTimeout(() => forceSync(), 0);
    };
    window.addEventListener('funding-cache-cleared', onCacheCleared);
    
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      window.removeEventListener('funding-cache-cleared', onCacheCleared);
    };
  }, [useMockData, fundingPollingInterval, fetchCurrentRates, syncHistoricalRates]);

  return { forceSync };
}
