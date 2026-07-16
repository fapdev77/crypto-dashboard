import { UnifiedFundingFee, ExchangeName, UnifiedInstrumentType } from '../../types';
import { hybridFetch } from '../../utils/proxyFetch';
import { LogManager } from '../logger';
import { getAssetMetadata, saveAssetMetadata } from '../historyCache';

export interface CurrentFundingRate {
  exchange: ExchangeName;
  symbol: string;
  instrumentType: 'USDT-M' | 'COIN-M';
  fundingRate: number;
  nextFundingTime: number;
}

export class FundingService {
  /**
   * Fetch current funding rates for all USDT-M and COIN-M symbols from an exchange.
   */
  static async fetchCurrentFundingRates(exchange: ExchangeName): Promise<CurrentFundingRate[]> {
    switch (exchange) {
      case 'bybit':
        return this.fetchBybitCurrentRates();
      case 'okx':
        return this.fetchOkxCurrentRates();
      case 'bitget':
        return this.fetchBitgetCurrentRates();
      default:
        return [];
    }
  }

  /**
   * Fetch historical funding rates for a specific symbol.
   * @param sinceTimestamp - If provided, fetch only records AFTER this timestamp (incremental).
   *                         When omitted, fetches full depth (~400 days).
   */
  static async fetchFundingHistory(
    exchange: ExchangeName,
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
    limit: number = 100,
    sinceTimestamp?: number
  ): Promise<UnifiedFundingFee[]> {
    try {
      switch (exchange) {
        case 'bybit':
          return this.fetchBybitFundingHistory(symbol, instrumentType, limit, sinceTimestamp);
        case 'okx':
          return this.fetchOkxFundingHistory(symbol, instrumentType, limit);
        case 'bitget':
          return this.fetchBitgetFundingHistory(symbol, instrumentType, limit, sinceTimestamp);
        default:
          return [];
      }
    } catch (error) {
      LogManager.error('FundingService', `Error fetching ${exchange} history for ${symbol}:`, error);
      return [];
    }
  }

  private static parseFundingRate(val: any): number | null {
    if (val === undefined || val === null || val === '') return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }

  private static parseIntOrNull(val: any): number | null {
    if (val === undefined || val === null || val === '') return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  }

  private static async fetchBybitCurrentRates(): Promise<CurrentFundingRate[]> {
    const results: CurrentFundingRate[] = [];
    
    for (const category of ['linear', 'inverse']) {
      try {
        const url = `https://api.bybit.com/v5/market/tickers?category=${category}`;
        const data = await hybridFetch(url, 'GET', {});
        
        if (data && data.retCode === 0 && data.result && data.result.list) {
          const instType = category === 'linear' ? 'USDT-M' : 'COIN-M';
          for (const item of data.result.list) {
            const fundingRate = FundingService.parseFundingRate(item.fundingRate);
            const nextFundingTime = FundingService.parseIntOrNull(item.nextFundingTime);
            if (fundingRate !== null && nextFundingTime !== null) {
              results.push({
                exchange: 'bybit',
                symbol: item.symbol,
                instrumentType: instType,
                fundingRate,
                nextFundingTime,
              });
            }
          }
        }
      } catch (e) {
        LogManager.error('FundingService', `Bybit current rates error for ${category}:`, e);
      }
    }
    
    return results;
  }

  private static async fetchBybitFundingHistory(
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
    limit: number,
    sinceTimestamp?: number
  ): Promise<UnifiedFundingFee[]> {
    const category = instrumentType === 'USDT-M' ? 'linear' : 'inverse';
    const allEntries: UnifiedFundingFee[] = [];
    
    // Bybit funding history API: endTime-based REVERSE pagination.
    //   - Full fetch (no sinceTimestamp): stop at ~400 days ago (targetStartTime)
    //   - Incremental fetch (sinceTimestamp): stop at sinceTimestamp
    //
    // IMPORTANT: Passing ONLY startTime returns an error, so we ALWAYS include endTime.
    // When sinceTimestamp is provided, we pass BOTH startTime and endTime together.
    const isIncremental = sinceTimestamp !== undefined;
    const MAX_PAGES = isIncremental ? 5 : 10;
    const pageSize = Math.min(limit, 200);
    const boundary = isIncremental ? sinceTimestamp! : (Date.now() - 400 * 24 * 60 * 60 * 1000);
    const now = Date.now();
    let endTime = String(now);
    let pages = 0;
    let reachedTarget = false;

    do {
      let query = `category=${category}&symbol=${symbol}&limit=${pageSize}`;
      if (isIncremental) query += `&startTime=${boundary}`;
      query += `&endTime=${endTime}`;

      const data = await hybridFetch(
        `https://api.bybit.com/v5/market/funding/history?${query}`,
        'GET',
        {}
      );

      if (!data || data.retCode !== 0 || !data.result?.list || data.result.list.length === 0) break;

      const entries = data.result.list.map((item: any) => ({
        id: `bybit-${symbol}-${item.fundingRateTimestamp}`,
        exchange: 'bybit' as const,
        symbol,
        instrumentType,
        timestamp: parseInt(item.fundingRateTimestamp, 10),
        fundingRate: FundingService.parseFundingRate(item.fundingRate) ?? 0,
      }));

      allEntries.push(...entries);

      // The last item in the list is the oldest record of this page.
      // Use its timestamp as endTime for the next page to get records before it.
      const oldestEntry = entries[entries.length - 1];
      endTime = String(oldestEntry.timestamp);

      // Stop if the oldest record is older than (or equal to) our boundary
      if (oldestEntry.timestamp <= boundary) {
        reachedTarget = true;
      }

      pages++;
    } while (!reachedTarget && endTime && pages < MAX_PAGES);

    return allEntries;
  }

  private static async fetchOkxCurrentRates(): Promise<CurrentFundingRate[]> {
    const results: CurrentFundingRate[] = [];
    try {
      const url = `https://www.okx.com/api/v5/public/funding-rate?instId=ANY`;
      const data = await hybridFetch(url, 'GET', {});
      
      if (data && data.code === '0' && data.data) {
        for (const item of data.data) {
          const isUsdt = item.instId.endsWith('-USDT-SWAP');
          const isCoin = item.instId.endsWith('-USD-SWAP');
          
          if (!isUsdt && !isCoin) continue;

          const fundingRate = FundingService.parseFundingRate(item.fundingRate);
          const nextFundingTime = FundingService.parseIntOrNull(item.fundingTime);
          if (fundingRate !== null && nextFundingTime !== null) {
            results.push({
              exchange: 'okx',
              symbol: item.instId,
              instrumentType: isUsdt ? 'USDT-M' : 'COIN-M',
              fundingRate,
              nextFundingTime,
            });
          }
        }
      }
    } catch (e) {
      LogManager.error('FundingService', 'OKX current rates error:', e);
    }
    return results;
  }

  private static async fetchOkxFundingHistory(
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
    limit: number
  ): Promise<UnifiedFundingFee[]> {
    const allEntries: UnifiedFundingFee[] = [];
    // OKX API has a hard 3-month limit; 5 pages × 100 records = 500 records ≈ 166 days (5.5 months) is enough.
    // Actual data will be shorter (~270 records). Cache accumulates more over time.
    const MAX_PAGES = 5;
    const pageSize = Math.min(limit, 100);
    let after = '';
    let pages = 0;

    do {
      let query = `instId=${symbol}&limit=${pageSize}`;
      if (after) query += `&after=${after}`;

      const data = await hybridFetch(
        `https://www.okx.com/api/v5/public/funding-rate-history?${query}`,
        'GET',
        {}
      );

      if (!data || data.code !== '0' || !data.data || data.data.length === 0) break;

      const entries = data.data.map((item: any) => ({
        id: `okx-${symbol}-${item.fundingTime}`,
        exchange: 'okx' as const,
        symbol,
        instrumentType,
        timestamp: parseInt(item.fundingTime, 10),
        fundingRate: FundingService.parseFundingRate(item.realizedRate ?? item.fundingRate) ?? 0,
        realizedRate: FundingService.parseFundingRate(item.realizedRate) ?? undefined,
      }));

      allEntries.push(...entries);

      // Paginate backward: 'after' = timestamp of the last record
      const lastEntry = data.data[data.data.length - 1];
      after = lastEntry?.fundingTime || '';
      pages++;
    } while (after && pages < MAX_PAGES);

    return allEntries;
  }

  private static async fetchBitgetCurrentRates(): Promise<CurrentFundingRate[]> {
    const results: CurrentFundingRate[] = [];
    for (const productType of ['USDT-FUTURES', 'COIN-FUTURES']) {
      try {
        const url = `https://api.bitget.com/api/v2/mix/market/current-fund-rate?productType=${productType}`;
        const data = await hybridFetch(url, 'GET', {});
        
        if (data && data.code === '00000' && data.data) {
          const instType = productType === 'USDT-FUTURES' ? 'USDT-M' : 'COIN-M';
          for (const item of data.data) {
            const fundingRate = FundingService.parseFundingRate(item.fundingRate);
            const nextTime = FundingService.parseIntOrNull(item.nextUpdate || item.nextFundingTime);
            if (fundingRate !== null && nextTime !== null) {
              results.push({
                exchange: 'bitget',
                symbol: item.symbol,
                instrumentType: instType,
                fundingRate,
                nextFundingTime: nextTime,
              });
            }
          }
        }
      } catch (e) {
        LogManager.error('FundingService', `Bitget current rates error for ${productType}:`, e);
      }
    }
    return results;
  }

  private static async fetchBitgetFundingHistory(
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
    limit: number,
    sinceTimestamp?: number
  ): Promise<UnifiedFundingFee[]> {
    const productType = instrumentType === 'USDT-M' ? 'USDT-FUTURES' : 'COIN-FUTURES';
    const isIncremental = sinceTimestamp !== undefined;
    const pageSize = Math.min(limit, 100);
    const allEntries: UnifiedFundingFee[] = [];

    if (isIncremental) {
      // ── Incremental: fetch only the most recent page(s), filter by timestamp ──
      // Page 1 has the 100 most recent records (~33 days). We fetch 2 pages (200 records)
      // to be safe for cases where user was away for 30+ days.
      const pageNumbers = [1, 2];

      const results = await Promise.allSettled(
        pageNumbers.map(async (pageNo) => {
          const url = `https://api.bitget.com/api/v2/mix/market/history-fund-rate?symbol=${symbol}&productType=${productType}&pageSize=${pageSize}&pageNo=${pageNo}`;
          return hybridFetch(url, 'GET', {});
        })
      );

      for (const result of results) {
        if (result.status === 'rejected') continue;
        const data = result.value;
        if (!data || data.code !== '00000' || !data.data || data.data.length === 0) continue;

        const entries = data.data
          .map((item: any) => ({
            id: `bitget-${symbol}-${item.fundingTime || item.settleTime}`,
            exchange: 'bitget' as const,
            symbol,
            instrumentType,
            timestamp: parseInt(item.fundingTime || item.settleTime, 10),
            fundingRate: FundingService.parseFundingRate(item.fundingRate) ?? 0,
          }))
          .filter(e => e.timestamp > sinceTimestamp); // Keep only truly new records

        allEntries.push(...entries);

        // If this page has records older than sinceTimestamp, no need for more pages
        const oldestInPage = parseInt(data.data[data.data.length - 1].fundingTime || data.data[data.data.length - 1].settleTime, 10);
        if (oldestInPage < sinceTimestamp) break;
      }
    } else {
      // ── Full fetch: 15 pages in parallel batches, stop at ~400 days ──
      const MAX_PAGES = 15;
      const PAGE_BATCH = 5;
      const targetStartTime = Date.now() - 400 * 24 * 60 * 60 * 1000;
      let reachedTargetDepth = false;

      for (let batchStart = 0; batchStart < MAX_PAGES; batchStart += PAGE_BATCH) {
        const batchSize = Math.min(PAGE_BATCH, MAX_PAGES - batchStart);
        const pageNumbers = Array.from({ length: batchSize }, (_, i) => batchStart + i + 1);

        const results = await Promise.allSettled(
          pageNumbers.map(async (pageNo) => {
            const url = `https://api.bitget.com/api/v2/mix/market/history-fund-rate?symbol=${symbol}&productType=${productType}&pageSize=${pageSize}&pageNo=${pageNo}`;
            return hybridFetch(url, 'GET', {});
          })
        );

        let minTimestampInBatch = Infinity;

        for (const result of results) {
          if (result.status === 'rejected') continue;
          const data = result.value;
          if (!data || data.code !== '00000' || !data.data || data.data.length === 0) continue;

          const entries = data.data.map((item: any) => ({
            id: `bitget-${symbol}-${item.fundingTime || item.settleTime}`,
            exchange: 'bitget' as const,
            symbol,
            instrumentType,
            timestamp: parseInt(item.fundingTime || item.settleTime, 10),
            fundingRate: FundingService.parseFundingRate(item.fundingRate) ?? 0,
          }));

          for (const entry of entries) {
            if (entry.timestamp < minTimestampInBatch) {
              minTimestampInBatch = entry.timestamp;
            }
          }

          allEntries.push(...entries);
        }

        if (minTimestampInBatch <= targetStartTime) {
          reachedTargetDepth = true;
        }

        // ── Stop conditions for Bitget full fetch ──
        // 1. reachedTargetDepth: cache now spans the full 400-day target → done
        // 2. NO page in this batch returned any data → API is exhausted, stop
        //
        // NOTE: we do NOT break on transient single-page errors (rate limiting,
        // network glitch) — doing so would cause a single failed request to abort
        // the entire 15-page fetch, leaving the cache artificially shallow (~3 months).
        // The loop is bounded by MAX_PAGES (15) so it cannot run forever.
        const anyPageHadData = results.some(r =>
          r.status === 'fulfilled' &&
          r.value && r.value.code === '00000' &&
          r.value.data && r.value.data.length > 0
        );
        if (!anyPageHadData || reachedTargetDepth) break;
      }
    }

    // Sort descending by timestamp (most recent first) for consistent ordering
    allEntries.sort((a, b) => b.timestamp - a.timestamp);
    return allEntries;
  }
}
