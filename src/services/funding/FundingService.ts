import Big from 'big.js';
import { ExchangeName, FundingRateSummary } from '../../types';
import { hybridFetch } from '../../utils/proxyFetch';
import { LogManager } from '../logger';

export interface CurrentFundingRate {
  exchange: ExchangeName;
  symbol: string;
  instrumentType: 'USDT-M' | 'COIN-M';
  fundingRate: number;
  nextFundingTime: number;
}

/** Internal minimal record shape used exclusively in the aggregation path. */
type RawRecord = {
  fundingTime: string; // ms timestamp as string
  fundingRate: string; // rate as string (e.g. "0.0001")
};

/** Boundary timestamps for bucket classification (calendar-month logic). */
type AggregationBoundaries = {
  todayStart: number;
  currentMonthStart: number;
  lastMonthStart: number;
  last3MStart: number;
  last6MStart: number;
  last12MStart: number;
};

export class FundingService {
  // ── Current rates (unchanged) ──────────────────────────────────────

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

  // ── Sleep helper ───────────────────────────────────────────────────

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Aggregation entry point ────────────────────────────────────────

  /**
   * Fetch all available historical funding records from the exchange API
   * and return a fully computed `FundingRateSummary`.
   *
   * On any error, logs via LogManager and returns a zero-filled summary
   * (all rate fields "0.00000000", lastFundingTime "0") — never throws.
   */
  static async fetchAndAggregateSummary(
    exchange: ExchangeName,
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
  ): Promise<FundingRateSummary> {
    try {
      const boundaries = this.buildAggregationBoundaries();
      let records: RawRecord[];

      switch (exchange) {
        case 'bybit':
          records = await this.fetchBybitRecordsForAggregation(symbol, instrumentType);
          break;
        case 'okx':
          records = await this.fetchOkxRecordsForAggregation(symbol, instrumentType);
          break;
        case 'bitget':
          records = await this.fetchBitgetRecordsForAggregation(symbol, instrumentType);
          break;
        default:
          records = [];
      }

      return this.aggregateData(records, exchange, symbol, instrumentType, boundaries);
    } catch (error) {
      LogManager.error('FundingService', `fetchAndAggregateSummary error for ${exchange} ${symbol}:`, error);
      return this.zeroSummary(exchange, symbol, instrumentType);
    }
  }

  /**
   * Fetch wrapper with retry logic for rate-limited requests.
   * Retries up to 3 times with exponential backoff (1s, 2s, 4s)
   * when the API returns a rate-limit error or null response.
   */
  private static async fetchWithRetry(url: string): Promise<any> {
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const backoffMs = 1000 * Math.pow(2, attempt - 1);
        await this.sleep(backoffMs);
      }
      const data = await hybridFetch(url, 'GET', {});
      if (!data) {
        if (attempt < MAX_RETRIES) continue;
        return null;
      }
      // Bybit rate limit (retCode 10006)
      if (typeof data === 'object' && data.retCode === 10006) {
        if (attempt < MAX_RETRIES) continue;
        return data;
      }
      return data;
    }
    return null;
  }

  // ── Aggregation boundaries ─────────────────────────────────────────

  /**
   * Compute calendar-month boundary timestamps.
   * Identical to the V3 script: `new Date(year, month - N, 1).getTime()`.
   */
  private static buildAggregationBoundaries(): AggregationBoundaries {
    const now = new Date();
    return {
      todayStart: new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
      currentMonthStart: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      lastMonthStart: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
      last3MStart: new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime(),
      last6MStart: new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime(),
      last12MStart: new Date(now.getFullYear(), now.getMonth() - 12, 1).getTime(),
    };
  }

  // ── Shared aggregation logic (V3-compatible) ───────────────────────

  /**
   * Core aggregation: classify records into calendar-month buckets using
   * Big.js arithmetic, identical to `aggregateData()` in the V3 script.
   *
   * For Bybit (which fetches 400+ days of data), all fields are populated.
   * For OKX/Bitget (limited to ~3 months), last6MonthsFundingRate and
   * last12MonthsFundingRate are set to `undefined` since the API doesn't
   * reach those boundaries.
   */
  private static aggregateData(
    records: RawRecord[],
    exchange: ExchangeName,
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
    boundaries: AggregationBoundaries,
  ): FundingRateSummary {
    if (records.length === 0) {
      return this.zeroSummary(exchange, symbol, instrumentType);
    }

    // Bucket accumulators (let, because Big.plus() returns a new Big — must reassign)
    let todayBucket = new Big(0);
    let currentMonthBucket = new Big(0);
    let lastMonthBucket = new Big(0);
    let last3MonthsBucket = new Big(0);
    let last6MonthsBucket = new Big(0);
    let last12MonthsBucket = new Big(0);

    // Track the oldest record's timestamp (last element in newest-first array)
    const oldestRecordTs = Number(records[records.length - 1].fundingTime);
    const newestRecord = records[0];

    for (const record of records) {
      const ts = Number(record.fundingTime);
      const rate = new Big(record.fundingRate);

      // ── Bucket classification (V3 rules) ──
      // todayFundingRate: ts >= todayStart
      if (ts >= boundaries.todayStart) {
        todayBucket = todayBucket.plus(rate);
      }

      // currentMonthFundingRate: ts >= currentMonthStart
      if (ts >= boundaries.currentMonthStart) {
        currentMonthBucket = currentMonthBucket.plus(rate);
      }

      // Multi-month buckets: ts >= boundary AND ts < currentMonthStart
      // (excludes current month from historical buckets)
      // Must use Big.plus() for each addition — no native float accumulation
      if (ts < boundaries.currentMonthStart) {
        if (ts >= boundaries.last12MStart) {
          last12MonthsBucket = last12MonthsBucket.plus(rate);
        }
        if (ts >= boundaries.last6MStart) {
          last6MonthsBucket = last6MonthsBucket.plus(rate);
        }
        if (ts >= boundaries.last3MStart) {
          last3MonthsBucket = last3MonthsBucket.plus(rate);
        }
        if (ts >= boundaries.lastMonthStart) {
          lastMonthBucket = lastMonthBucket.plus(rate);
        }
      }
    }

    // ── Determine which optional fields are reachable based on oldestRecord ──
    // Bybit: all fields populated (oldest <= last12MStart)
    // OKX/Bitget: only populate up to the API's natural boundary
    const apiIsLimited = (exchange === 'okx' || exchange === 'bitget');

    const summary: FundingRateSummary = {
      id: `${exchange}-${symbol}`,
      exchange,
      symbol,
      instrumentType,
      lastMonthFundingRate: lastMonthBucket.toFixed(8),
      last3MonthsFundingRate: last3MonthsBucket.toFixed(8),
      currentMonthFundingRate: currentMonthBucket.toFixed(8),
      todayFundingRate: todayBucket.toFixed(8),
      lastFundingRate: newestRecord.fundingRate,
      lastFundingTime: newestRecord.fundingTime,
      updatedAt: Date.now(),
    };

    // ── Populate optional fields only if coverage is sufficient ──
    // For limited APIs (OKX/Bitget), only populate if oldestRecord reaches the boundary
    // For Bybit, always populate (oldestRecord is guaranteed to be < last12MStart)
    if (!apiIsLimited || oldestRecordTs <= boundaries.last12MStart) {
      summary.last12MonthsFundingRate = last12MonthsBucket.toFixed(8);
    }
    if (!apiIsLimited || oldestRecordTs <= boundaries.last6MStart) {
      summary.last6MonthsFundingRate = last6MonthsBucket.toFixed(8);
    }

    return summary;
  }

  /** Build a zero-filled FundingRateSummary. */
  private static zeroSummary(
    exchange: ExchangeName,
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
  ): FundingRateSummary {
    return {
      id: `${exchange}-${symbol}`,
      exchange,
      symbol,
      instrumentType,
      lastFundingRate: '0.00000000',
      lastFundingTime: '0',
      todayFundingRate: '0.00000000',
      currentMonthFundingRate: '0.00000000',
      lastMonthFundingRate: '0.00000000',
      last3MonthsFundingRate: '0.00000000',
      updatedAt: Date.now(),
    };
  }

  // ═════════════════════════════════════════════════════════════════
  //  BYBIT
  // ═════════════════════════════════════════════════════════════════

  private static async fetchBybitRecordsForAggregation(
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
  ): Promise<RawRecord[]> {
    const category = instrumentType === 'USDT-M' ? 'linear' : 'inverse';
    const boundaries = this.buildAggregationBoundaries();
    const records: RawRecord[] = [];
    const MAX_PAGES = 10;
    const pageSize = 200;
    const PAGE_DELAY_MS = 65; // V3-compatible delay
    let endTime = String(Date.now());
    let pages = 0;

    do {
      const url = `https://api.bybit.com/v5/market/funding/history?category=${category}&symbol=${symbol}&limit=${pageSize}&endTime=${endTime}`;
      const data = await this.fetchWithRetry(url);

      if (!data || data.retCode !== 0 || !data.result?.list || data.result.list.length === 0) {
        break;
      }

      const pageRecords: RawRecord[] = data.result.list.map((item: any) => ({
        fundingTime: item.fundingRateTimestamp,
        fundingRate: String(item.fundingRate),
      }));

      records.push(...pageRecords);

      // Cursor advance: endTime - 1 to avoid duplicates
      const oldest = pageRecords[pageRecords.length - 1];
      endTime = String(Number(oldest.fundingTime) - 1);

      // Stop if oldest record reaches the 12-month boundary
      if (Number(oldest.fundingTime) <= boundaries.last12MStart) {
        break;
      }

      // Partial page (< 200) means no more data
      if (pageRecords.length < pageSize) {
        break;
      }

      pages++;

      // V3-compatible delay between pages to avoid rate limiting
      await this.sleep(PAGE_DELAY_MS);
    } while (pages < MAX_PAGES);

    return records;
  }

  // ═════════════════════════════════════════════════════════════════
  //  OKX
  // ═════════════════════════════════════════════════════════════════

  private static async fetchOkxRecordsForAggregation(
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
  ): Promise<RawRecord[]> {
    const boundaries = this.buildAggregationBoundaries();
    const records: RawRecord[] = [];
    const MAX_PAGES = 5;
    const pageSize = 400;
    const PAGE_DELAY_MS = 250; // V3-compatible delay (OKX is strict: 10 req/2s)
    let after = '';
    let pages = 0;

    do {
      let query = `instId=${symbol}&limit=${pageSize}`;
      if (after) query += `&after=${after}`;

      const url = `https://www.okx.com/api/v5/public/funding-rate-history?${query}`;
      const data = await this.fetchWithRetry(url);

      if (!data || data.code !== '0' || !data.data || data.data.length === 0) {
        break;
      }

      const pageRecords: RawRecord[] = data.data.map((item: any) => ({
        fundingTime: item.fundingTime,
        fundingRate: String(item.realizedRate ?? item.fundingRate),
      }));

      records.push(...pageRecords);

      // Cursor advance
      const oldest = pageRecords[pageRecords.length - 1];
      after = oldest.fundingTime;

      // Stop if oldest record reaches the 3-month boundary
      if (Number(oldest.fundingTime) <= boundaries.last3MStart) {
        break;
      }

      // Partial page means no more data
      if (pageRecords.length < pageSize) {
        break;
      }

      pages++;

      // V3-compatible delay between pages
      await this.sleep(PAGE_DELAY_MS);
    } while (pages < MAX_PAGES);

    return records;
  }

  // ═════════════════════════════════════════════════════════════════
  //  BITGET
  // ═════════════════════════════════════════════════════════════════

  private static async fetchBitgetRecordsForAggregation(
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
  ): Promise<RawRecord[]> {
    const productType = instrumentType === 'USDT-M' ? 'USDT-FUTURES' : 'COIN-FUTURES';
    const boundaries = this.buildAggregationBoundaries();
    const records: RawRecord[] = [];
    const MAX_PAGES = 15;
    const pageSize = 100;
    const PAGE_DELAY_MS = 65; // V3-compatible delay
    let pageNo = 1;

    do {
      const url = `https://api.bitget.com/api/v2/mix/market/history-fund-rate?symbol=${symbol}&productType=${productType}&pageSize=${pageSize}&pageNo=${pageNo}`;
      const data = await this.fetchWithRetry(url);

      if (!data || data.code !== '00000' || !data.data || data.data.length === 0) {
        break;
      }

      const pageRecords: RawRecord[] = data.data.map((item: any) => ({
        fundingTime: String(item.fundingTime || item.settleTime),
        fundingRate: String(item.fundingRate),
      }));

      records.push(...pageRecords);

      // Check oldest record against boundary
      const oldest = pageRecords[pageRecords.length - 1];
      if (Number(oldest.fundingTime) <= boundaries.last3MStart) {
        break;
      }

      // Partial page means no more data
      if (pageRecords.length < pageSize) {
        break;
      }

      pageNo++;

      // V3-compatible delay between pages
      await this.sleep(PAGE_DELAY_MS);
    } while (pageNo <= MAX_PAGES);

    return records;
  }

  // ═════════════════════════════════════════════════════════════════
  //  Current-rate fetchers (unchanged)
  // ═════════════════════════════════════════════════════════════════

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
}
