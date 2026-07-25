import Big from 'big.js';
import { BybitTransactionLogEntry } from '../../types';
import { ApiCredentials } from '../../store/apiKeysStore';
import { LogManager } from '../LogManager';
import { BybitAdapter } from '../adapters/BybitAdapter';
import {
  getBybitTxLogCache,
  saveBybitTxLogCache,
  getBybitTxLogMeta,
  updateBybitTxLogMeta,
} from '../historyCache';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const MAX_PAGES_PER_CHUNK = 20;
const MAX_RETRIES = 3;

/** Service for syncing and caching Bybit transaction logs with progressive deep-sync. */
export class BybitTransactionService {
  private adapter: BybitAdapter;

  constructor() {
    this.adapter = new BybitAdapter();
  }

  /**
   * Main entry point: load cached entries, then sync if needed.
   * Uses SWR pattern — returns cache immediately, syncs in background.
   */
  async syncWithCache(key: ApiCredentials): Promise<BybitTransactionLogEntry[]> {
    const cached = await getBybitTxLogCache(key.id);
    const meta = await getBybitTxLogMeta(key.id);

    // If we have cache, return it immediately and sync incrementally
    if (cached.length > 0 && meta && meta.latestTransactionTime > 0) {
      this.syncIncremental(key, meta.latestTransactionTime).catch(err =>
        LogManager.warn('BybitTransactionService', `Incremental sync failed for ${key.label}:`, err)
      );
      return cached;
    }

    // No cache: trigger deep sync and return empty for now
    this.syncAll(key).catch(err =>
      LogManager.warn('BybitTransactionService', `Deep sync failed for ${key.label}:`, err)
    );
    return [];
  }

  /**
   * Incremental sync: fetch only records newer than the latest cached timestamp.
   */
  async syncIncremental(key: ApiCredentials, latestTime: number): Promise<BybitTransactionLogEntry[]> {
    const now = Date.now();
    let allNew: BybitTransactionLogEntry[] = [];
    const categories = ['linear', 'inverse', 'spot'];
    let hasError = false;

    for (const category of categories) {
      let chunkStart = latestTime + 1;
      while (chunkStart < now) {
        const chunkEnd = Math.min(chunkStart + SEVEN_DAYS_MS, now);
        let cursor = '';
        let pages = 0;
        try {
          do {
            const { list, nextPageCursor } = await this.adapter.getTransactionLog(key, chunkStart, chunkEnd, category, cursor || undefined);
            for (const raw of list) {
              allNew.push(BybitAdapter.normalizeTxLogEntry(raw, key));
            }
            cursor = nextPageCursor;
            pages++;
          } while (cursor && pages < MAX_PAGES_PER_CHUNK);
        } catch (err) {
          LogManager.warn('BybitTransactionService', `Incremental chunk error ${key.label}/${category}:`, err);
          hasError = true;
        }
        chunkStart = chunkEnd + 1;
        // Throttle to avoid rate-limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Deduplicate
    if (allNew.length > 0) {
      const dedup = new Map<string, BybitTransactionLogEntry>();
      for (const entry of allNew) {
        dedup.set(entry.id, entry);
      }
      allNew = Array.from(dedup.values());
    }

    const meta = await getBybitTxLogMeta(key.id);
    const oldest = meta ? meta.oldestTransactionTime : (allNew.length > 0 ? Math.min(...allNew.map(e => e.transactionTime)) : now);
    const totalRecords = (meta?.totalRecords || 0) + allNew.length;

    let nextLatestTime = latestTime;
    if (!hasError) {
      nextLatestTime = now;
    } else if (allNew.length > 0) {
      nextLatestTime = Math.max(latestTime, ...allNew.map(e => e.transactionTime));
    }

    if (allNew.length > 0) {
      await saveBybitTxLogCache(allNew);
    }
    
    // Always update meta to advance latestTransactionTime (if no error), even if allNew is empty
    if (!hasError || allNew.length > 0) {
       await updateBybitTxLogMeta(key.id, oldest, nextLatestTime, totalRecords);
    }

    return allNew;
  }

  /**
   * Deep sync: progressively backfill up to 2 years starting from most recent.
   * Runs in 7-day chunks from now backwards.
   */
  async syncAll(
    key: ApiCredentials,
    onProgress?: (pct: number, records: number) => void
  ): Promise<void> {
    const now = Date.now();
    let twoYearsAgo = now - TWO_YEARS_MS;
    const categories = ['linear', 'inverse', 'spot'];
    let totalNew = 0;
    const targetStart = twoYearsAgo;

    // Process chunks from most recent to oldest
    let chunkEnd = now;
    let allEntries: BybitTransactionLogEntry[] = [];

    while (chunkEnd > twoYearsAgo) {
      const chunkStart = Math.max(twoYearsAgo, chunkEnd - SEVEN_DAYS_MS);

      for (const category of categories) {
        let cursor = '';
        let pages = 0;

        try {
          do {
            const { list, nextPageCursor } = await this.adapter.getTransactionLog(
              key, chunkStart, chunkEnd, category, cursor || undefined
            );

            for (const raw of list) {
              allEntries.push(BybitAdapter.normalizeTxLogEntry(raw, key));
            }

            cursor = nextPageCursor;
            pages++;
          } while (cursor && pages < MAX_PAGES_PER_CHUNK);
        } catch (err) {
          LogManager.warn('BybitTransactionService', `Chunk error ${key.label}/${category}:`, err);
        }
      }

      // Save batch and report progress
      if (allEntries.length > 0) {
        // Deduplicate by id before saving
        const dedup = new Map<string, BybitTransactionLogEntry>();
        for (const entry of allEntries) {
          dedup.set(entry.id, entry);
        }
        const batch = Array.from(dedup.values());
        await saveBybitTxLogCache(batch);

        totalNew += batch.length;

        const oldestInBatch = Math.min(...batch.map(e => e.transactionTime));
        const progressPct = ((now - oldestInBatch) / (now - targetStart)) * 100;

        // Update meta
        const existingMeta = await getBybitTxLogMeta(key.id);
        const oldest = existingMeta ? Math.min(existingMeta.oldestTransactionTime, oldestInBatch) : oldestInBatch;
        const latest = existingMeta ? Math.max(existingMeta.latestTransactionTime, chunkEnd) : chunkEnd;
        await updateBybitTxLogMeta(key.id, oldest, latest, totalNew);

        if (onProgress) {
          onProgress(Math.min(100, progressPct), totalNew);
        }

        allEntries = []; // clear for next chunk
      }

      chunkEnd = chunkStart - 1;

      // Throttle to avoid rate-limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    LogManager.info('BybitTransactionService', `Deep sync complete for ${key.label}: ${totalNew} records`);
  }

  /**
   * Derive real PnL by symbol from cached transaction-log entries.
   * Aggregates cashFlow for relevant trade types (TRADE, SETTLEMENT,
   * LIQUIDATION, DELIVERY) — same logic as BybitAdapter.fetchBybitRealPnLBySymbol
   * but operating on already-cached data, no network calls.
   *
   * @param entries   Cached transaction-log entries (from IndexedDB).
   * @param startTime Optional start of time range (ms timestamp).
   * @param endTime   Optional end of time range (ms timestamp).
   * @returns Record of symbol → total PnL (as string for Big.js precision).
   */
  static computeRealPnL(
    entries: BybitTransactionLogEntry[],
    startTime?: number,
    endTime?: number
  ): Record<string, string> {
    const symbolPnL: Record<string, Big> = {};
    const relevantTypes = new Set(['TRADE', 'SETTLEMENT', 'LIQUIDATION', 'DELIVERY']);

    for (const e of entries) {
      if (!e.symbol) continue;
      if (!relevantTypes.has(e.type)) continue;
      if (startTime !== undefined && e.transactionTime < startTime) continue;
      if (endTime !== undefined && e.transactionTime > endTime) continue;

      const cashFlow = new Big(e.cashFlow || '0');
      if (!symbolPnL[e.symbol]) symbolPnL[e.symbol] = new Big(0);
      symbolPnL[e.symbol] = symbolPnL[e.symbol].plus(cashFlow);
    }

    return Object.fromEntries(
      Object.entries(symbolPnL).map(([sym, val]) => [sym, val.toString()])
    );
  }

  /**
   * Apply in-memory filters for the UI.
   */
  static filterEntries(
    entries: BybitTransactionLogEntry[],
    filters: {
      search?: string;
      category?: string;
      type?: string;
      currency?: string;
      accountId?: string;
      startTime?: number;
      endTime?: number;
    }
  ): BybitTransactionLogEntry[] {
    let filtered = [...entries];

    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(e => e.symbol.toLowerCase().includes(term));
    }

    if (filters.category && filters.category !== 'All') {
      filtered = filtered.filter(e => e.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters.type && filters.type !== 'All') {
      filtered = filtered.filter(e => e.type === filters.type);
    }

    if (filters.currency && filters.currency !== 'All') {
      filtered = filtered.filter(e => e.currency.toUpperCase() === filters.currency!.toUpperCase());
    }

    if (filters.accountId && filters.accountId !== 'All') {
      filtered = filtered.filter(e => e.connectionId === filters.accountId);
    }

    if (filters.startTime) {
      filtered = filtered.filter(e => e.transactionTime >= filters.startTime!);
    }

    if (filters.endTime) {
      filtered = filtered.filter(e => e.transactionTime <= filters.endTime!);
    }

    return filtered;
  }

  /**
   * Compute stats from a list of entries.
   * Financial values are separated by currency group to avoid mixing
   * coin-denominated values (BTC, ETH for inverse contracts) with
   * stablecoin values (USDT, USDC for linear contracts).
   */
  static computeStats(entries: BybitTransactionLogEntry[]): {
    totalCount: number;
    typeBreakdown: Record<string, number>;
    /** Stablecoin totals (USDT, USDC) — displayed as USD */
    stable: { totalFunding: string; totalFees: string; totalCashFlow: string; totalChange: string; finalBalance: string };
    /** Per-currency breakdown for non-stable (e.g. BTC, ETH) */
    perCurrency: Record<string, { totalFunding: string; totalFees: string; totalCashFlow: string; totalChange: string; finalBalance: string }>;
  } {
    const typeBreakdown: Record<string, number> = {};
    const stable = { totalFunding: new Big(0), totalFees: new Big(0), totalCashFlow: new Big(0), totalChange: new Big(0), finalBalance: new Big(0) };
    const perCurrency: Record<string, { totalFunding: Big; totalFees: Big; totalCashFlow: Big; totalChange: Big; finalBalance: Big }> = {};

    const isStable = (currency: string) => ['USDT', 'USDC', 'DAI', 'USD'].includes(currency.toUpperCase());

    for (const e of entries) {
      typeBreakdown[e.type] = (typeBreakdown[e.type] || 0) + 1;

      const stableMatch = isStable(e.currency);
      const bucket = stableMatch ? stable : (perCurrency[e.currency] || (perCurrency[e.currency] = { totalFunding: new Big(0), totalFees: new Big(0), totalCashFlow: new Big(0), totalChange: new Big(0), finalBalance: new Big(0) }));

      bucket.totalFunding = bucket.totalFunding.plus(new Big(e.funding || '0'));
      bucket.totalFees = bucket.totalFees.plus(new Big(e.fee || '0'));
      bucket.totalCashFlow = bucket.totalCashFlow.plus(new Big(e.cashFlow || '0'));
      bucket.totalChange = bucket.totalChange.plus(new Big(e.change || '0'));
    }

    // Final balance is cashBalance of the most recent entry per currency
    const stableEntries = entries.filter(e => isStable(e.currency));
    if (stableEntries.length > 0) {
      const sorted = [...stableEntries].sort((a, b) => b.transactionTime - a.transactionTime);
      stable.finalBalance = new Big(sorted[0].cashBalance || '0');
    }

    for (const currency of Object.keys(perCurrency)) {
      const currencyEntries = entries.filter(e => e.currency === currency);
      if (currencyEntries.length > 0) {
        const sorted = [...currencyEntries].sort((a, b) => b.transactionTime - a.transactionTime);
        perCurrency[currency].finalBalance = new Big(sorted[0].cashBalance || '0');
      }
    }

    return {
      totalCount: entries.length,
      typeBreakdown,
      stable: {
        totalFunding: stable.totalFunding.toString(),
        totalFees: stable.totalFees.toString(),
        totalCashFlow: stable.totalCashFlow.toString(),
        totalChange: stable.totalChange.toString(),
        finalBalance: stable.finalBalance.toString(),
      },
      perCurrency: Object.fromEntries(
        Object.entries(perCurrency).map(([cur, vals]) => [cur, {
          totalFunding: vals.totalFunding.toString(),
          totalFees: vals.totalFees.toString(),
          totalCashFlow: vals.totalCashFlow.toString(),
          totalChange: vals.totalChange.toString(),
          finalBalance: vals.finalBalance.toString(),
        }])
      ),
    };
  }
}
