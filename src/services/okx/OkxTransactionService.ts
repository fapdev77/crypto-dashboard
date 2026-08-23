import Big from 'big.js';
import { OkxTransactionLogEntry } from '../../types';
import { ApiCredentials } from '../../store/apiKeysStore';
import { LogManager } from '../LogManager';
import { OkxAdapter } from '../adapters/OkxAdapter';
import { matchUniversalTxType } from '../../utils/transactionTypeMapper';
import {
  getOkxTxLogCache,
  saveOkxTxLogCache,
  getOkxTxLogMeta,
  updateOkxTxLogMeta,
} from '../historyCache';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000; // OKX archive supports up to 3 months
const MAX_PAGES_PER_CHUNK = 20;

/** Service for syncing and caching OKX transaction logs with progressive deep-sync. */
export class OkxTransactionService {
  private adapter: OkxAdapter;

  constructor() {
    this.adapter = new OkxAdapter();
  }

  /**
   * Main entry point: load cached entries, then sync if needed.
   * Uses SWR pattern — returns cache immediately, syncs in background.
   */
  async syncWithCache(key: ApiCredentials): Promise<OkxTransactionLogEntry[]> {
    const cached = await getOkxTxLogCache(key.id);
    const meta = await getOkxTxLogMeta(key.id);

    // If we have cache, return it immediately and sync incrementally
    if (cached.length > 0 && meta && meta.latestTransactionTime > 0) {
      this.syncIncremental(key, meta.latestTransactionTime).catch(err =>
        LogManager.warn('OkxTransactionService', `Incremental sync failed for ${key.label}:`, err)
      );
      return cached;
    }

    // No cache: trigger deep sync and return empty for now
    this.syncAll(key).catch(err =>
      LogManager.warn('OkxTransactionService', `Deep sync failed for ${key.label}:`, err)
    );
    return [];
  }

  /**
   * Incremental sync: fetch only records newer than the latest cached timestamp.
   */
  async syncIncremental(key: ApiCredentials, latestTime: number): Promise<OkxTransactionLogEntry[]> {
    const now = Date.now();
    let allNew: OkxTransactionLogEntry[] = [];
    const categories = [''];
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
              allNew.push(OkxAdapter.normalizeTxLogEntry(raw, key));
            }
            cursor = nextPageCursor;
            pages++;
          } while (cursor && pages < MAX_PAGES_PER_CHUNK);
        } catch (err) {
          LogManager.warn('OkxTransactionService', `Incremental chunk error ${key.label}/${category}:`, err);
          hasError = true;
        }
        chunkStart = chunkEnd + 1;
        // Throttle to avoid rate-limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Deduplicate
    if (allNew.length > 0) {
      const dedup = new Map<string, OkxTransactionLogEntry>();
      for (const entry of allNew) {
        dedup.set(entry.id, entry);
      }
      allNew = Array.from(dedup.values());
    }

    const meta = await getOkxTxLogMeta(key.id);
    const oldest = meta ? meta.oldestTransactionTime : (allNew.length > 0 ? Math.min(...allNew.map(e => e.transactionTime)) : now);
    const totalRecords = (meta?.totalRecords || 0) + allNew.length;

    let nextLatestTime = latestTime;
    if (!hasError) {
      nextLatestTime = now;
    } else if (allNew.length > 0) {
      nextLatestTime = Math.max(latestTime, ...allNew.map(e => e.transactionTime));
    }

    if (allNew.length > 0) {
      await saveOkxTxLogCache(allNew);
    }
    
    // Always update meta to advance latestTransactionTime (if no error), even if allNew is empty
    if (!hasError || allNew.length > 0) {
       await updateOkxTxLogMeta(key.id, oldest, nextLatestTime, totalRecords);
    }

    return allNew;
  }

  /**
   * Deep sync: progressively backfill up to 3 months starting from most recent.
   * Runs in 7-day chunks from now backwards.
   */
  async syncAll(
    key: ApiCredentials,
    onProgress?: (pct: number, records: number) => void
  ): Promise<void> {
    const now = Date.now();
    let threeMonthsAgo = now - THREE_MONTHS_MS;
    const categories = [''];
    let totalNew = 0;
    const targetStart = threeMonthsAgo;

    // Process chunks from most recent to oldest
    let chunkEnd = now;
    let allEntries: OkxTransactionLogEntry[] = [];

    while (chunkEnd > threeMonthsAgo) {
      const chunkStart = Math.max(threeMonthsAgo, chunkEnd - SEVEN_DAYS_MS);

      for (const category of categories) {
        let cursor = '';
        let pages = 0;

        try {
          do {
            const { list, nextPageCursor } = await this.adapter.getTransactionLog(
              key, chunkStart, chunkEnd, category, cursor || undefined
            );

            for (const raw of list) {
              allEntries.push(OkxAdapter.normalizeTxLogEntry(raw, key));
            }

            cursor = nextPageCursor;
            pages++;
          } while (cursor && pages < MAX_PAGES_PER_CHUNK);
        } catch (err) {
          LogManager.warn('OkxTransactionService', `Chunk error ${key.label}/${category}:`, err);
        }
      }

      // Save batch and report progress
      if (allEntries.length > 0) {
        // Deduplicate by id before saving
        const dedup = new Map<string, OkxTransactionLogEntry>();
        for (const entry of allEntries) {
          dedup.set(entry.id, entry);
        }
        const batch = Array.from(dedup.values());
        await saveOkxTxLogCache(batch);

        totalNew += batch.length;

        const oldestInBatch = Math.min(...batch.map(e => e.transactionTime));
        const progressPct = ((now - oldestInBatch) / (now - targetStart)) * 100;

        // Update meta
        const existingMeta = await getOkxTxLogMeta(key.id);
        const oldest = existingMeta ? Math.min(existingMeta.oldestTransactionTime, oldestInBatch) : oldestInBatch;
        const latest = existingMeta ? Math.max(existingMeta.latestTransactionTime, chunkEnd) : chunkEnd;
        await updateOkxTxLogMeta(key.id, oldest, latest, totalNew);

        if (onProgress) {
          onProgress(Math.min(100, progressPct), totalNew);
        }

        allEntries = []; // clear for next chunk
      }

      chunkEnd = chunkStart - 1;

      // Throttle to avoid rate-limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    LogManager.info('OkxTransactionService', `Deep sync complete for ${key.label}: ${totalNew} records`);
  }

  /**
   * Derive real PnL by symbol from cached transaction-log entries.
   */
  static computeRealPnL(
    entries: OkxTransactionLogEntry[],
    startTime?: number,
    endTime?: number
  ): Record<string, string> {
    const symbolPnL: Record<string, Big> = {};
    const relevantTypes = new Set(['2', '3', '5', '8', '9', '14', '24', 'TRADE', 'LIQUIDATION', 'DELIVERY', 'SETTLEMENT', 'SWAP']);

    for (const e of entries) {
      if (!e.symbol) continue;
      const sub = e.subType || e.transSubType || '';
      if (!relevantTypes.has(e.type) && !relevantTypes.has(sub)) continue;
      if (startTime !== undefined && e.transactionTime < startTime) continue;
      if (endTime !== undefined && e.transactionTime > endTime) continue;

      const cashFlow = new Big(e.cashFlow || e.change || '0');
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
    entries: OkxTransactionLogEntry[],
    filters: {
      search?: string;
      category?: string;
      type?: string;
      currency?: string;
      accountId?: string;
      startTime?: number;
      endTime?: number;
    }
  ): OkxTransactionLogEntry[] {
    let filtered = [...entries];

    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(e => e.symbol.toLowerCase().includes(term));
    }

    if (filters.category && filters.category !== 'All') {
      filtered = filtered.filter(e => e.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters.type && filters.type !== 'All' && filters.type !== 'ALL') {
      filtered = filtered.filter(e => matchUniversalTxType('okx', e, filters.type!));
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
   */
  static computeStats(entries: OkxTransactionLogEntry[]): {
    totalCount: number;
    typeBreakdown: Record<string, number>;
    /** Stablecoin totals (USDT, USDC) — displayed as USD */
    stable: { totalFunding: string; totalFees: string; totalCashFlow: string; totalChange: string; finalBalance: string; totalInflow: string; totalOutflow: string; initialBalance: string; percentageChange: number };
    /** Per-currency breakdown for non-stable (e.g. BTC, ETH) */
    perCurrency: Record<string, { totalFunding: string; totalFees: string; totalCashFlow: string; totalChange: string; finalBalance: string; totalInflow: string; totalOutflow: string; initialBalance: string; percentageChange: number }>;
  } {
    const typeBreakdown: Record<string, number> = {};
    const stable = { totalFunding: new Big(0), totalFees: new Big(0), totalCashFlow: new Big(0), totalChange: new Big(0), finalBalance: new Big(0), totalInflow: new Big(0), totalOutflow: new Big(0) };
    const perCurrency: Record<string, { totalFunding: Big; totalFees: Big; totalCashFlow: Big; totalChange: Big; finalBalance: Big; totalInflow: Big; totalOutflow: Big }> = {};

    const isStable = (currency: string) => ['USDT', 'USDC', 'DAI', 'USD'].includes(currency.toUpperCase());

    const latestBalance: Record<string, { time: number; balance: Big }> = {};

    // In OKX: type 1 = Transfer, 2 = Trade, 8 = Funding Rate, etc. subType 11 = Transfer in, 12 = Transfer out
    const INFLOW_TYPES = ['1', '11', '18', 'TRANSFER_IN', 'DEPOSIT', 'AIRDROP', 'BONUS'];
    const OUTFLOW_TYPES = ['12', '19', 'TRANSFER_OUT', 'WITHDRAW', 'AUTO_DEDUCTION'];
    const EXCHANGE_TYPES = ['SPOT', 'CONVERT', '4', '11'];

    for (const e of entries) {
      const sub = e.subType || e.transSubType || '';
      const typeKey = e.type || sub || 'OTHER';
      typeBreakdown[typeKey] = (typeBreakdown[typeKey] || 0) + 1;

      const stableMatch = isStable(e.currency);
      const bucket = stableMatch ? stable : (perCurrency[e.currency] || (perCurrency[e.currency] = { totalFunding: new Big(0), totalFees: new Big(0), totalCashFlow: new Big(0), totalChange: new Big(0), finalBalance: new Big(0), totalInflow: new Big(0), totalOutflow: new Big(0) }));

      const changeBig = new Big(e.change || '0');
      
      let isInflow = INFLOW_TYPES.includes(e.type) || (sub ? INFLOW_TYPES.includes(sub) : false);
      let isOutflow = OUTFLOW_TYPES.includes(e.type) || (sub ? OUTFLOW_TYPES.includes(sub) : false);
      
      const isExchange = EXCHANGE_TYPES.includes(e.type) || (e.category?.toLowerCase() === 'spot' && e.type === '2');
      
      if (e.type === '1' || isExchange) {
         if (changeBig.gt(0)) isInflow = true;
         if (changeBig.lt(0)) isOutflow = true;
      }
      
      const isTransferOrExchange = isInflow || isOutflow || e.type === '1';

      if (e.type === '8' || sub === '170' || sub === '171') {
        bucket.totalFunding = bucket.totalFunding.plus(changeBig);
      }

      bucket.totalFees = bucket.totalFees.plus(new Big(e.fee || '0'));
      
      if (isInflow) {
        bucket.totalInflow = bucket.totalInflow.plus(changeBig.abs());
      }
      if (isOutflow) {
        bucket.totalOutflow = bucket.totalOutflow.plus(changeBig.abs());
      }

      if (!isTransferOrExchange) {
        bucket.totalCashFlow = bucket.totalCashFlow.plus(new Big(e.cashFlow || changeBig));
        bucket.totalChange = bucket.totalChange.plus(changeBig);
      }

      const balKey = `${e.connectionId}-${e.currency}`;
      if (!latestBalance[balKey] || e.transactionTime > latestBalance[balKey].time) {
        latestBalance[balKey] = { time: e.transactionTime, balance: new Big(e.cashBalance || e.balance || '0') };
      }
    }

    for (const [key, data] of Object.entries(latestBalance)) {
      const dashIndex = key.lastIndexOf('-');
      const currency = key.substring(dashIndex + 1);
      if (!currency) continue;
      
      if (isStable(currency)) {
        stable.finalBalance = stable.finalBalance.plus(data.balance);
      } else if (perCurrency[currency]) {
        perCurrency[currency].finalBalance = perCurrency[currency].finalBalance.plus(data.balance);
      }
    }

    const calcDerived = (bucket: any) => {
      const initialBalance = bucket.finalBalance.minus(bucket.totalChange).minus(bucket.totalInflow).plus(bucket.totalOutflow);
      const basisBig = initialBalance.plus(bucket.totalInflow);
      let percentageChange = 0;
      if (basisBig.gt(0)) {
        percentageChange = bucket.totalChange.div(basisBig).times(100).toNumber();
      } else if (basisBig.eq(0) && bucket.totalChange.gt(0)) {
        percentageChange = 100;
      }
      return {
        initialBalance: initialBalance.toString(),
        percentageChange
      };
    };

    return {
      totalCount: entries.length,
      typeBreakdown,
      stable: {
        totalFunding: stable.totalFunding.toString(),
        totalFees: stable.totalFees.toString(),
        totalCashFlow: stable.totalCashFlow.toString(),
        totalChange: stable.totalChange.toString(),
        finalBalance: stable.finalBalance.toString(),
        totalInflow: stable.totalInflow.toString(),
        totalOutflow: stable.totalOutflow.toString(),
        ...calcDerived(stable)
      },
      perCurrency: Object.fromEntries(
        Object.entries(perCurrency).map(([cur, vals]) => [cur, {
          totalFunding: vals.totalFunding.toString(),
          totalFees: vals.totalFees.toString(),
          totalCashFlow: vals.totalCashFlow.toString(),
          totalChange: vals.totalChange.toString(),
          finalBalance: vals.finalBalance.toString(),
          totalInflow: vals.totalInflow.toString(),
          totalOutflow: vals.totalOutflow.toString(),
          ...calcDerived(vals)
        }])
      ),
    };
  }
}
