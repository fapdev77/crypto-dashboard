import { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useFundingStore, ExchangeTimingData } from '../store/fundingStore';
import { FundingService, CurrentFundingRate } from '../services/funding/FundingService';
import {
  getFundingMeta,
  saveFundingSummariesBatch,
} from '../services/historyCache';
import { ExchangeName, FundingRateSummary } from '../types';
import { LogManager } from '../services/LogManager';

const EXCHANGES: ExchangeName[] = ['bybit', 'okx', 'bitget'];

/** How recent (ms) a cached record's latestTimestamp must be to consider the symbol up-to-date. */
const FUNDING_CYCLE_MS = 8 * 60 * 60 * 1000; // 8 hours

/** Concurrency limits per exchange (browser maxs ~6 TCP connections per domain). */
const CONCURRENCY: Record<ExchangeName, number> = {
  bybit: 6,
  okx: 4,
  bitget: 6,
};

// ── Module-level singleton locks ──────────────────────────────────
// These live OUTSIDE the hook so ALL instances share the same lock.
// Prevents duplicate syncs even if useFundingSync() is called in multiple places.
const syncInProgressRef = { current: false };
const fetchingRef = { current: false };
const restartRequestedRef = { current: false };

// ── AsyncPool: runs at most `limit` items concurrently ──────────────

async function asyncPool<T>(
  items: T[],
  limit: number,
  iteratorFn: (item: T) => Promise<void>,
): Promise<void> {
  let nextIdx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      await iteratorFn(items[idx]);
    }
  });
  await Promise.allSettled(workers);
}

interface ExchangeSyncDetails {
  exchange: ExchangeName;
  summaries: FundingRateSummary[];
  synced: number;
  skippedSymbols: string[];
  errors: number;
  stale: number;
  elapsedMs: number;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatDurationHms(totalSec: number): string {
  const totalSeconds = Math.floor(totalSec);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function buildSyncReport(
  exchangeResults: ExchangeSyncDetails[],
  totalSec: number,
  startMs: number,
  endMs: number,
): string {
  const lines: string[] = [];
  const hms = formatDurationHms(totalSec);
  lines.push('');
  lines.push('======================================================');
  lines.push('             FUNDING SYNC COMPLETED (REPORT)         ');
  lines.push('======================================================');
  lines.push(`  Start Time  : ${formatDateTime(startMs)}`);
  lines.push(`  End Time    : ${formatDateTime(endMs)}`);
  lines.push(`  Total Time  : ${totalSec.toFixed(1)}s (${hms})`);
  lines.push('------------------------------------------------------');
  lines.push('  Exchange | Processed | Skipped | Total Stale | Errors');
  lines.push('------------------------------------------------------');

  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalStaleAll = 0;
  let totalErrorsAll = 0;

  for (const r of exchangeResults) {
    const ex = r.exchange.toUpperCase().padEnd(8);
    const proc = String(r.synced).padStart(9);
    const skip = String(r.skippedSymbols.length).padStart(7);
    const stale = String(r.stale).padStart(11);
    const err = String(r.errors).padStart(6);

    totalProcessed += r.synced;
    totalSkipped += r.skippedSymbols.length;
    totalStaleAll += r.stale;
    totalErrorsAll += r.errors;

    lines.push(`  ${ex} | ${proc} | ${skip} | ${stale} | ${err}`);
  }

  lines.push('------------------------------------------------------');
  lines.push(
    `  TOTAL    | ${String(totalProcessed).padStart(9)} | ${String(totalSkipped).padStart(7)} | ${String(totalStaleAll).padStart(11)} | ${String(totalErrorsAll).padStart(6)}`,
  );
  lines.push('======================================================');

  lines.push('\n--- SKIPPED SYMBOLS (No Funding) ---');
  for (const r of exchangeResults) {
    const ex = r.exchange.toUpperCase().padEnd(8);
    if (r.skippedSymbols.length > 0) {
      const maxDisplay = 15;
      const displayed = r.skippedSymbols.slice(0, maxDisplay).join(', ');
      const remaining = r.skippedSymbols.length - maxDisplay;
      const suffix = remaining > 0 ? ` (+${remaining} more)` : '';
      lines.push(`  [${ex}] Skipped (${r.skippedSymbols.length}): ${displayed}${suffix}`);
    } else {
      lines.push(`  [${ex}] No symbols skipped.`);
    }
  }

  return lines.join('\n');
}

// ── Sync one exchange's stale symbols ──────────────────────────────

async function syncExchange(
  exchange: ExchangeName,
  rates: CurrentFundingRate[],
  now: number,
  onProgress: (pct: number, message: string) => void,
): Promise<ExchangeSyncDetails> {
  const exchangeStartMs = performance.now();

  // 1. Check freshness via IndexedDB meta
  const metas = await Promise.all(
    rates.map(r => getFundingMeta(r.exchange, r.symbol)),
  );
  const staleRates = rates.filter((_, i) => {
    const m = metas[i];
    return !m || (now - m.latestTimestamp) >= FUNDING_CYCLE_MS;
  });

  if (staleRates.length === 0) {
    return { exchange, summaries: [], synced: 0, skippedSymbols: [], errors: 0, stale: 0, elapsedMs: 0 };
  }

  const totalStale = staleRates.length;
  const summaries: FundingRateSummary[] = [];
  const skippedSymbols: string[] = [];
  let errors = 0;
  let completed = 0;

  onProgress(0, `${exchange}: ${totalStale} symbols to sync...`);

  await asyncPool(staleRates, CONCURRENCY[exchange], async (rate) => {
    const symbolStartMs = performance.now();

    try {
      const summary = await FundingService.fetchAndAggregateSummary(
        rate.exchange,
        rate.symbol,
        rate.instrumentType,
      );

      const symbolElapsed = performance.now() - symbolStartMs;

      // Warn if a single symbol takes > 10s (signals API issue)
      if (symbolElapsed > 10_000) {
        LogManager.warn(
          'useFundingSync',
          `SLOW [${exchange}] ${rate.symbol}: ${(symbolElapsed / 1000).toFixed(1)}s`,
        );
      }

      // Skip symbols with no data (zeroSummary guard)
      if (summary.lastFundingTime !== '0') {
        summaries.push(summary);
      } else {
        skippedSymbols.push(rate.symbol);
      }
    } catch {
      errors++;
    }

    completed++;
    if (completed % 10 === 0 || completed === totalStale) {
      const pct = Math.round((completed / totalStale) * 100);
      onProgress(pct, `${exchange}: ${completed}/${totalStale} symbols...`);
    }
  });

  // ── Exchange timing report ──
  const exchangeElapsed = performance.now() - exchangeStartMs;
  const avgMsPerSymbol = totalStale > 0 ? (exchangeElapsed / totalStale).toFixed(0) : '0';

  LogManager.info(
    'FundingTiming',
    `${exchange.toUpperCase()} | ` +
    `${summaries.length} synced / ${totalStale} stale | ` +
    `${(exchangeElapsed / 1000).toFixed(1)}s total | ` +
    `${avgMsPerSymbol}ms avg/symbol`,
  );

  return {
    exchange,
    summaries,
    synced: summaries.length,
    skippedSymbols,
    errors,
    stale: totalStale,
    elapsedMs: exchangeElapsed,
  };
}

// ── Hook ──────────────────────────────────────────────────────────

export function useFundingSync() {
  const { fundingPollingInterval, fundingHistoryInterval, useMockData } = useSettingsStore();
  const setLastSyncTime = useSettingsStore(state => state.setLastSyncTime);
  const { setSyncStatus, lastHistoryFetch, setLastHistoryFetch } = useFundingStore();

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Mirror lastHistoryFetch in a ref to break the effect re-trigger cycle ──
  const lastHistoryFetchRef = useRef(lastHistoryFetch);
  useEffect(() => {
    lastHistoryFetchRef.current = lastHistoryFetch;
  }, [lastHistoryFetch]);

  // ── Schedule next auto-sync based on nearest nextFundingTime + 1 min ──
  const scheduleNextAutoSync = useCallback(() => {
    const rates = useFundingStore.getState().currentRates;
    if (!rates || rates.length === 0) return;

    const nowMs = Date.now();
    let nearestFundingTime = Infinity;
    for (const rate of rates) {
      if (rate.nextFundingTime > nowMs && rate.nextFundingTime < nearestFundingTime) {
        nearestFundingTime = rate.nextFundingTime;
      }
    }

    // Only schedule if there's a future funding time found
    if (nearestFundingTime === Infinity) return;

    const nextSyncTime = nearestFundingTime + 60_000; // +1 minute after funding
    const delayMs = nextSyncTime - nowMs;

    // Don't schedule if it's already in the past
    if (delayMs <= 0) return;

    // ── Preserve existing timer if it will fire sooner ──────────────
    // Prevents polling ticks AFTER a funding settlement (when
    // nextFundingTime has rolled forward to the next cycle) from
    // cancelling the auto-sync that was already scheduled for +1 minute
    // after that settlement.
    const existingNextSyncTime = useFundingStore.getState().nextScheduledSyncTime;
    if (autoSyncTimerRef.current && existingNextSyncTime > nowMs) {
      const existingRemainingMs = existingNextSyncTime - nowMs;
      if (existingRemainingMs < delayMs) {
        // Existing timer fires sooner — keep it, don't replace.
        return;
      }
    }

    // Clear previous schedule and set the new one
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }

    LogManager.info(
      'useFundingSync',
      `Auto-sync scheduled: ${new Date(nextSyncTime).toLocaleString('pt-BR')} ` +
      `(${(delayMs / 60_000).toFixed(0)} min after next funding)`,
    );

    useFundingStore.getState().setNextFundingTime(nearestFundingTime);
    useFundingStore.getState().setNextScheduledSyncTime(nextSyncTime);

    autoSyncTimerRef.current = setTimeout(async () => {
      const actual = Date.now();
      const driftSec = ((actual - nextSyncTime) / 1000).toFixed(1);
      const diff = driftSec.startsWith('-') ? `${driftSec}s (early)` : `${driftSec}s (late)`;
      LogManager.info(
        'useFundingSync',
        `Auto-sync fired | scheduled: ${new Date(nextSyncTime).toLocaleString('pt-BR')} | ` +
        `actual: ${new Date(actual).toLocaleString('pt-BR')} | diff: ${diff}`,
      );
      // Use the event-based approach (same as manual sync buttons)
      useFundingStore.getState().setLastHistoryFetch(0);
      window.dispatchEvent(new CustomEvent('funding-cache-cleared'));
    }, delayMs);
  }, []);

  // Poll current rates (fast, single endpoint per exchange usually)
  const fetchCurrentRates = useCallback(async () => {
    if (useMockData || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const results: CurrentFundingRate[] = [];
      for (const ex of EXCHANGES) {
        try {
          const rates = await FundingService.fetchCurrentFundingRates(ex);
          results.push(...rates);
        } catch (e) {
          LogManager.error('useFundingSync', `Failed to fetch current rates for ${ex}:`, e);
        }
      }
      // Save partial results — if one exchange fails, data from others survives.
      // Only overwrite if we got at least some data; otherwise keep the stale
      // snapshot so scheduleNextAutoSync() can still work on the next tick.
      if (results.length > 0) {
        useFundingStore.setState({ currentRates: results });
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [useMockData]);

  // ── Sync historical rates (V3-compatible: asyncPool per exchange, parallel exchanges) ──

  const syncHistoricalRates = useCallback(async (currentRates: CurrentFundingRate[]) => {
    if (useMockData || syncInProgressRef.current) return;

    const now = Date.now();
    const intervalMs = fundingHistoryInterval * 60 * 60 * 1000;

    if (now - lastHistoryFetchRef.current < intervalMs) {
      return; // Not time yet
    }

    syncInProgressRef.current = true;

    try {
      const totalSymbols = currentRates.length;
      if (totalSymbols === 0) {
        syncInProgressRef.current = false;
        return;
      }

      setSyncStatus(true, 0, 'Checking freshness...');

      // ── 1. Group currentRates by exchange ──
      const exchangeMap = new Map<ExchangeName, CurrentFundingRate[]>();
      for (const rate of currentRates) {
        const list = exchangeMap.get(rate.exchange) ?? [];
        list.push(rate);
        exchangeMap.set(rate.exchange, list);
      }

      // ── 2. Run all exchanges in parallel (V3-compatible) ──
      const syncStartMs = Date.now();
      const exchangeSyncStart = performance.now();
      const capturedTimings: ExchangeTimingData[] = [];
      const exchangeSyncResults: ExchangeSyncDetails[] = [];

      const exchangePromises = Array.from(exchangeMap.entries()).map(
        async ([exchange, rates]) => {
          const result = await syncExchange(
            exchange, rates, now,
            (pct, msg) => setSyncStatus(true, pct, msg),
          );
          if (result.stale > 0) {
            capturedTimings.push({
              name: exchange,
              synced: result.synced,
              stale: result.stale,
              totalSec: result.elapsedMs / 1000,
              avgMs: Math.round(result.elapsedMs / result.stale),
            });
            exchangeSyncResults.push(result);
          }
          return result.summaries;
        },
      );

      const nestedSummaries: FundingRateSummary[][] = await Promise.all(exchangePromises);
      const allSummaries = nestedSummaries.flat();

      // ── 2b. Determine the next funding payment time from current rates ──
      const storedRates = useFundingStore.getState().currentRates;
      const curNow = Date.now();
      let nearestFundingTime = Infinity;
      for (const rate of storedRates) {
        if (rate.nextFundingTime > curNow && rate.nextFundingTime < nearestFundingTime) {
          nearestFundingTime = rate.nextFundingTime;
        }
      }
      const nextAutoSync = nearestFundingTime !== Infinity
        ? nearestFundingTime + 60_000 // next funding + 1 minute
        : 0;

      const fetchElapsed = performance.now() - exchangeSyncStart;

      // ── 3. Batch-write all summaries to IndexedDB (single transaction) ──
      let writeElapsed = 0;
      if (allSummaries.length > 0) {
        const writeStart = performance.now();
        await saveFundingSummariesBatch(allSummaries);
        writeElapsed = performance.now() - writeStart;
      }

      const completedAt = Date.now();
      const totalSec = (fetchElapsed + writeElapsed) / 1000;

      // ── 3b. Emit ASCII Summary Report to system logs ──
      if (exchangeSyncResults.length > 0) {
        const syncReport = buildSyncReport(exchangeSyncResults, totalSec, syncStartMs, completedAt);
        LogManager.system('FundingSync', syncReport);
      } else {
        LogManager.system(
          'FundingTiming',
          `=== SYNC COMPLETE === ` +
          `Fetch: ${(fetchElapsed / 1000).toFixed(1)}s | ` +
          `Write: ${(writeElapsed / 1000).toFixed(1)}s | ` +
          `Total: ${totalSec.toFixed(1)}s | ` +
          `${allSummaries.length} symbols`,
        );
      }

      // ── 4. Persist performance data to fundingStore ──
      const { setLastSyncPerformance, setLastExchangeTimings, setNextFundingTime, setNextScheduledSyncTime } = useFundingStore.getState();
      setLastSyncPerformance({
        fetchSec: fetchElapsed / 1000,
        writeSec: writeElapsed / 1000,
        totalSec,
        symbols: allSummaries.length,
        timestamp: completedAt,
      });
      if (capturedTimings.length > 0) {
        setLastExchangeTimings(capturedTimings);
      }
      if (nextAutoSync > 0) {
        setNextFundingTime(nearestFundingTime);
        setNextScheduledSyncTime(nextAutoSync);
        // Realign the setTimeout timer with the latest calculation
        scheduleNextAutoSync();
      }

      setLastHistoryFetch(completedAt);
      lastHistoryFetchRef.current = completedAt;
      setLastSyncTime(completedAt);
      setSyncStatus(
        false,
        100,
        `Synced ${allSummaries.length} symbols across ${exchangeMap.size} exchanges ` +
        `in ${totalSec.toFixed(1)}s.`,
      );
    } catch (error: any) {
      LogManager.error('useFundingSync', 'Historical sync error:', error);
      setSyncStatus(false, 0, `Sync failed: ${error.message}`);
    } finally {
      syncInProgressRef.current = false;

      // Clear success/error status after a brief delay (keeps UX readable)
      setTimeout(() => {
        if (!syncInProgressRef.current) {
          setSyncStatus(false, 0, '');
        }
      }, 3000);

      // Handle restart request IMMEDIATELY — no 3s gap, no race window
      // where forceSync() starts a new sync before the flag is checked.
      if (restartRequestedRef.current) {
        restartRequestedRef.current = false;
        LogManager.info('useFundingSync', 'Restarting sync after user force request...');
        forceSync();
      }
    }
  }, [useMockData, fundingHistoryInterval, setLastHistoryFetch, setLastSyncTime, setSyncStatus, scheduleNextAutoSync]);

  // Expose manual trigger (enforces singleton + restart-rest logic)
  const forceSync = async () => {
    // If a sync is already running, flag a restart instead of silently ignoring
    if (syncInProgressRef.current) {
      LogManager.info('useFundingSync', 'Sync already in progress — will restart after completion');
      restartRequestedRef.current = true;
      return;
    }

    restartRequestedRef.current = false;
    await fetchCurrentRates();
    const rates = useFundingStore.getState().currentRates;
    if (rates && rates.length > 0) {
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
      // Schedule auto-sync based on next funding payment time
      scheduleNextAutoSync();
    });

    // Polling setup — re-schedule auto-sync on each polling tick
    const intervalMs = fundingPollingInterval * 60 * 1000;
    const wrappedPoll = async () => {
      await fetchCurrentRates();
      scheduleNextAutoSync();
    };
    pollingTimerRef.current = setInterval(wrappedPoll, intervalMs);

    // Listen for manual cache-cleared events
    const onCacheCleared = () => {
      setTimeout(() => forceSync(), 0);
    };
    window.addEventListener('funding-cache-cleared', onCacheCleared);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
      window.removeEventListener('funding-cache-cleared', onCacheCleared);
    };
  }, [useMockData, fundingPollingInterval, fetchCurrentRates, syncHistoricalRates, scheduleNextAutoSync]);

  return { forceSync };
}
