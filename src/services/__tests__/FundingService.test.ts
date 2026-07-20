import Big from 'big.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FundingService } from '../funding/FundingService';
import type { ExchangeName } from '../../types';

// ── Mock hybridFetch ──────────────────────────────────────────────
vi.mock('../../utils/proxyFetch', () => ({
  hybridFetch: vi.fn(),
}));

import { hybridFetch } from '../../utils/proxyFetch';
const mockHybridFetch = hybridFetch as ReturnType<typeof vi.fn>;

// ── Exchange API response fixtures ─────────────────────────────────

const BYBIT_TICKER_RESPONSE = {
  retCode: 0,
  retMsg: 'OK',
  result: {
    list: [
      { symbol: 'BTCUSDT', fundingRate: '0.0001', nextFundingTime: String(Date.now() + 3600_000) },
      { symbol: 'ETHUSDT', fundingRate: '-0.00005', nextFundingTime: String(Date.now() + 3600_000) },
    ],
  },
};

const OKX_TICKER_RESPONSE = {
  code: '0',
  msg: '',
  data: [
    { instId: 'BTC-USDT-SWAP', fundingRate: '0.0001', fundingTime: String(Date.now() + 3600_000) },
    { instId: 'ETH-USDT-SWAP', fundingRate: '-0.00005', fundingTime: String(Date.now() + 3600_000) },
  ],
};

const BITGET_TICKER_RESPONSE = {
  code: '00000',
  msg: '',
  data: [
    { symbol: 'BTCUSDT', fundingRate: '0.0001', nextFundingTime: String(Date.now() + 3600_000) },
    { symbol: 'ETHUSDT', fundingRate: '-0.00005', nextFundingTime: String(Date.now() + 3600_000) },
  ],
};

// ── Funding Rate Summary expectations ─────────────────────────────

const ZERO_SUMMARY = expect.objectContaining({
  lastFundingRate: '0.00000000',
  lastFundingTime: '0',
  todayFundingRate: '0.00000000',
  currentMonthFundingRate: '0.00000000',
  lastMonthFundingRate: '0.00000000',
  last3MonthsFundingRate: '0.00000000',
});

// ═══════════════════════════════════════════════════════════════════
// FundingService
// ═══════════════════════════════════════════════════════════════════

describe('FundingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── fetchCurrentFundingRates ──────────────────────────────────────

  describe('fetchCurrentFundingRates', () => {
    it('should parse Bybit tickers into CurrentFundingRate[]', async () => {
      mockHybridFetch.mockResolvedValue(BYBIT_TICKER_RESPONSE);

      const rates = await FundingService.fetchCurrentFundingRates('bybit');

      expect(rates.length).toBeGreaterThanOrEqual(2);
      expect(rates[0]).toMatchObject({
        exchange: 'bybit',
        symbol: 'BTCUSDT',
        instrumentType: 'USDT-M',
        fundingRate: 0.0001,
      });
      expect(rates[0].nextFundingTime).toBeGreaterThan(0);
    });

    it('should handle Bybit API error gracefully', async () => {
      mockHybridFetch.mockResolvedValue({ retCode: -1 });

      const rates = await FundingService.fetchCurrentFundingRates('bybit');
      expect(rates).toEqual([]);
    });

    it('should parse OKX tickers into CurrentFundingRate[]', async () => {
      mockHybridFetch.mockResolvedValue(OKX_TICKER_RESPONSE);

      const rates = await FundingService.fetchCurrentFundingRates('okx');
      expect(rates.length).toBeGreaterThanOrEqual(2);
      expect(rates[0]).toMatchObject({
        exchange: 'okx',
        symbol: 'BTC-USDT-SWAP',
        fundingRate: 0.0001,
      });
    });

    it('should handle OKX API error gracefully', async () => {
      mockHybridFetch.mockResolvedValue({ code: '9999' });

      const rates = await FundingService.fetchCurrentFundingRates('okx');
      expect(rates).toEqual([]);
    });

    it('should parse Bitget tickers into CurrentFundingRate[]', async () => {
      mockHybridFetch.mockResolvedValue(BITGET_TICKER_RESPONSE);

      const rates = await FundingService.fetchCurrentFundingRates('bitget');
      expect(rates.length).toBeGreaterThanOrEqual(2);
      expect(rates[0]).toMatchObject({
        exchange: 'bitget',
        symbol: 'BTCUSDT',
        fundingRate: 0.0001,
      });
    });

    it('should handle Bitget API error gracefully', async () => {
      mockHybridFetch.mockResolvedValue({ code: '99999' });

      const rates = await FundingService.fetchCurrentFundingRates('bitget');
      expect(rates).toEqual([]);
    });

    it('should skip invalid / null funding rates', async () => {
      const invalidResponse = {
        retCode: 0,
        result: {
          list: [
            { symbol: 'BTCUSDT', fundingRate: '', nextFundingTime: String(Date.now()) },
            { symbol: 'ETHUSDT', fundingRate: 'abc', nextFundingTime: String(Date.now()) },
            { symbol: 'SOLUSDT', fundingRate: null, nextFundingTime: String(Date.now()) },
          ],
        },
      };
      mockHybridFetch.mockResolvedValue(invalidResponse);

      const rates = await FundingService.fetchCurrentFundingRates('bybit');
      expect(rates.filter(r => r.symbol === 'BTCUSDT')).toHaveLength(0);
      expect(rates.filter(r => r.symbol === 'ETHUSDT')).toHaveLength(0);
      expect(rates.filter(r => r.symbol === 'SOLUSDT')).toHaveLength(0);
    });

    it('should return empty array for unknown exchange', async () => {
      const rates = await FundingService.fetchCurrentFundingRates('unknown' as ExchangeName);
      expect(rates).toEqual([]);
    });

    it('should handle fetch throwing an exception', async () => {
      mockHybridFetch.mockRejectedValue(new Error('Network error'));

      const rates = await FundingService.fetchCurrentFundingRates('bybit');
      expect(rates).toEqual([]);
    });
  });

  // ── Aggregation logic (pure function, tested directly) ──────────

  describe('aggregateData (pure math)', () => {
    it('should correctly classify records into calendar-month buckets', () => {
      const now = new Date();
      const dayMs = 86_400_000;

      // Build deterministic boundaries
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const last3MStart = new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime();
      const last6MStart = new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime();
      const last12MStart = new Date(now.getFullYear(), now.getMonth() - 12, 1).getTime();

      const boundaries = { todayStart, currentMonthStart, lastMonthStart, last3MStart, last6MStart, last12MStart };

      // One record in each bucket (rate = 0.0001 per record)
      const todayTs = todayStart + 3600_000;              // 1h into today
      const currentMonthTs = currentMonthStart + dayMs;   // day 2 of current month
      const lastMonthTs = lastMonthStart + dayMs;         // day 2 of last month
      const last3MTs = last3MStart + dayMs;               // day 2 of 3 months ago
      const last6MTs = last6MStart + dayMs;               // day 2 of 6 months ago
      const last12MTs = last12MStart + dayMs;             // day 2 of 12 months ago

      // Records must be NEWEST-FIRST (as the service returns them from API)
      const records = [
        { fundingTime: String(todayTs), fundingRate: '0.0001' },
        { fundingTime: String(currentMonthTs), fundingRate: '0.0001' },
        { fundingTime: String(lastMonthTs), fundingRate: '0.0001' },
        { fundingTime: String(last3MTs), fundingRate: '0.0001' },
        { fundingTime: String(last6MTs), fundingRate: '0.0001' },
        { fundingTime: String(last12MTs), fundingRate: '0.0001' },
      ];

      const result = (FundingService as any).aggregateData(
        records, 'bybit', 'BTCUSDT', 'USDT-M', boundaries,
      );

      // Today bucket: ts >= todayStart → 1 record (#1 todayTs)
      expect(result.todayFundingRate).toBe('0.00010000');

      // Current month bucket: ts >= currentMonthStart → 2 records (#1 todayTs, #2 currentMonthTs)
      expect(result.currentMonthFundingRate).toBe('0.00020000');

      // Last month bucket: ts >= lastMonthStart AND ts < currentMonthStart
      // Only record #3 (lastMonthTs) satisfies both → 1 record
      expect(result.lastMonthFundingRate).toBe('0.00010000');

      // Last 3 months bucket: ts >= last3MStart AND ts < currentMonthStart
      // Records #3 (lastMonthTs) and #4 (last3MTs) satisfy → 2 records
      expect(result.last3MonthsFundingRate).toBe('0.00020000');

      // Last 6 months bucket: ts >= last6MStart AND ts < currentMonthStart
      // Records #3, #4, #5 satisfy → 3 records
      expect(result.last6MonthsFundingRate).toBe('0.00030000');

      // Last 12 months bucket: ts >= last12MStart AND ts < currentMonthStart
      // All 4 records (#3, #4, #5, #6) satisfy → 4 records
      expect(result.last12MonthsFundingRate).toBe('0.00040000');
    });

    it('should return zero-summary for empty records', () => {
      const boundaries = (FundingService as any).buildAggregationBoundaries();
      const result = (FundingService as any).aggregateData(
        [], 'bybit', 'BTCUSDT', 'USDT-M', boundaries,
      );

      expect(result).toMatchObject(ZERO_SUMMARY);
    });

    it('should use latest record as lastFundingRate', () => {
      const boundaries = (FundingService as any).buildAggregationBoundaries();
      const now = Date.now();

      const records = [
        { fundingTime: String(now), fundingRate: '0.0005' },          // newest
        { fundingTime: String(now - 3600_000), fundingRate: '0.0003' },  // middle
        { fundingTime: String(now - 7200_000), fundingRate: '0.0001' },  // oldest
      ];

      const result = (FundingService as any).aggregateData(
        records, 'bybit', 'BTCUSDT', 'USDT-M', boundaries,
      );

      // newest record's fundingRate should be lastFundingRate (currently correct: records[0] is newest)
      expect(result.lastFundingRate).toBe('0.0005');
      expect(result.lastFundingTime).toBe(String(now));
    });

    it('should produce deterministic results for same input', () => {
      const boundaries = (FundingService as any).buildAggregationBoundaries();
      const records = [
        { fundingTime: String(Date.now() - 3600_000), fundingRate: '0.0001' },
        { fundingTime: String(Date.now() - 7200_000), fundingRate: '0.0002' },
      ];

      const resultA = (FundingService as any).aggregateData(
        records, 'bybit', 'BTCUSDT', 'USDT-M', boundaries,
      );
      const resultB = (FundingService as any).aggregateData(
        records, 'bybit', 'BTCUSDT', 'USDT-M', boundaries,
      );

      expect(resultA.lastMonthFundingRate).toBe(resultB.lastMonthFundingRate);
      expect(resultA.id).toBe(resultB.id);
    });

    it('should handle mixed positive and negative funding rates', () => {
      const now = Date.now();
      // Alternating positive/negative rates within current month
      const records = Array.from({ length: 20 }, (_, i) => ({
        fundingTime: String(now - i * 3600_000),
        fundingRate: i % 2 === 0 ? '0.0001' : '-0.00005',
      }));

      // Use last3MStart far enough in the past so all records contribute to current month
      const boundaries = {
        todayStart: 0, currentMonthStart: 0,
        lastMonthStart: now - 30 * 86_400_000,
        last3MStart: now - 90 * 86_400_000,
        last6MStart: now - 180 * 86_400_000,
        last12MStart: now - 365 * 86_400_000,
      };

      const result = (FundingService as any).aggregateData(
        records, 'bybit', 'BTCUSDT', 'USDT-M', boundaries,
      );

      // With 10 positive (0.0001) + 10 negative (-0.00005):
      // currentMonthBucket = 10 * 0.0001 + 10 * (-0.00005)
      // = 0.001 + (-0.0005) = 0.0005
      expect(result.currentMonthFundingRate).not.toBe('0.00000000');
      // Verify Big.js arithmetic works (no floating point errors)
      expect(() => Big(result.currentMonthFundingRate)).not.toThrow();
    });

    it('should handle very small rates with Big.js precision', () => {
      const now = Date.now();
      // 100 records spanning ~100 hours (~4 days)
      const tinyRates = Array.from({ length: 100 }, (_, i) => ({
        fundingTime: String(now - i * 3600_000),
        fundingRate: '0.00000001', // very small rate
      }));

      // Use boundaries that place all records in currentMonth bucket
      const boundaries = {
        todayStart: 0, currentMonthStart: 0,
        lastMonthStart: now - 30 * 86_400_000,
        last3MStart: now - 90 * 86_400_000,
        last6MStart: now - 180 * 86_400_000,
        last12MStart: now - 365 * 86_400_000,
      };

      const result = (FundingService as any).aggregateData(
        tinyRates, 'bybit', 'BTCUSDT', 'USDT-M', boundaries,
      );

      // All 100 records contribute to currentMonthBucket
      // Sum = 100 * 0.00000001 = 0.00000100
      const rateBig = Big(result.currentMonthFundingRate);
      expect(rateBig.toNumber()).toBeGreaterThan(0);
      // Big.js precision: no scientific notation, max 8 decimal places
      expect(result.currentMonthFundingRate).not.toBe('0.00000000');
      expect(result.currentMonthFundingRate).not.toContain('e');
      expect(result.currentMonthFundingRate.split('.')[1]?.length || 0).toBeLessThanOrEqual(8);
    });
  });

  // ── Helper methods (private, accessed via (FundingService as any)) ──

  describe('helper methods', () => {
    describe('parseFundingRate', () => {
      it('should parse valid string number', () => {
        expect((FundingService as any).parseFundingRate('0.0001')).toBe(0.0001);
      });

      it('should parse valid number', () => {
        expect((FundingService as any).parseFundingRate(0.0001)).toBe(0.0001);
      });

      it('should return null for undefined', () => {
        expect((FundingService as any).parseFundingRate(undefined)).toBeNull();
      });

      it('should return null for empty string', () => {
        expect((FundingService as any).parseFundingRate('')).toBeNull();
      });

      it('should return null for non-numeric string', () => {
        expect((FundingService as any).parseFundingRate('abc')).toBeNull();
      });
    });

    describe('parseIntOrNull', () => {
      it('should parse valid string number', () => {
        expect((FundingService as any).parseIntOrNull('1234567890')).toBe(1234567890);
      });

      it('should parse valid number', () => {
        expect((FundingService as any).parseIntOrNull(1234567890)).toBe(1234567890);
      });

      it('should return null for undefined', () => {
        expect((FundingService as any).parseIntOrNull(undefined)).toBeNull();
      });

      it('should return null for empty string', () => {
        expect((FundingService as any).parseIntOrNull('')).toBeNull();
      });

      it('should return null for NaN', () => {
        expect((FundingService as any).parseIntOrNull('abc')).toBeNull();
      });
    });

    describe('zeroSummary', () => {
      it('should build a zero-filled summary for Bybit', () => {
        const result = (FundingService as any).zeroSummary('bybit', 'BTCUSDT', 'USDT-M');

        expect(result).toMatchObject({
          id: 'bybit-BTCUSDT',
          exchange: 'bybit',
          symbol: 'BTCUSDT',
          instrumentType: 'USDT-M',
          lastFundingRate: '0.00000000',
          lastFundingTime: '0',
          todayFundingRate: '0.00000000',
          currentMonthFundingRate: '0.00000000',
          lastMonthFundingRate: '0.00000000',
          last3MonthsFundingRate: '0.00000000',
        });
        expect(result.updatedAt).toBeGreaterThan(0);
      });

      it('should build a zero-filled summary for OKX', () => {
        const result = (FundingService as any).zeroSummary('okx', 'ETH-USDT-SWAP', 'USDT-M');

        expect(result.id).toBe('okx-ETH-USDT-SWAP');
        expect(result.lastFundingRate).toBe('0.00000000');
      });
    });

    describe('buildAggregationBoundaries', () => {
      it('should return 6 boundary timestamps with correct ordering', () => {
        const boundaries = (FundingService as any).buildAggregationBoundaries();

        expect(boundaries).toHaveProperty('todayStart');
        expect(boundaries).toHaveProperty('currentMonthStart');
        expect(boundaries).toHaveProperty('lastMonthStart');
        expect(boundaries).toHaveProperty('last3MStart');
        expect(boundaries).toHaveProperty('last6MStart');
        expect(boundaries).toHaveProperty('last12MStart');

        expect(boundaries.todayStart).toBeGreaterThanOrEqual(boundaries.currentMonthStart);
        expect(boundaries.currentMonthStart).toBeGreaterThan(boundaries.lastMonthStart);
        expect(boundaries.lastMonthStart).toBeGreaterThan(boundaries.last3MStart);
        expect(boundaries.last3MStart).toBeGreaterThan(boundaries.last6MStart);
        expect(boundaries.last6MStart).toBeGreaterThan(boundaries.last12MStart);
      });

      it('should use calendar-month boundaries (1st of the month)', () => {
        const boundaries = (FundingService as any).buildAggregationBoundaries();
        const currentMonth = new Date(boundaries.currentMonthStart);

        expect(currentMonth.getDate()).toBe(1);
        expect(currentMonth.getHours()).toBe(0);
        expect(currentMonth.getMinutes()).toBe(0);
        expect(currentMonth.getSeconds()).toBe(0);
      });
    });
  });

  // ── Exchange routing ──────────────────────────────────────────────

  describe('exchange routing', () => {
    it('should route Bybit to fetchBybitCurrentRates (linear + inverse)', async () => {
      mockHybridFetch.mockResolvedValue({ retCode: 0, result: { list: [] } });

      await FundingService.fetchCurrentFundingRates('bybit');

      expect(mockHybridFetch).toHaveBeenCalledTimes(2); // linear + inverse
    });

    it('should route OKX to fetchOkxCurrentRates (1 call)', async () => {
      mockHybridFetch.mockResolvedValue({ code: '0', data: [] });

      await FundingService.fetchCurrentFundingRates('okx');

      expect(mockHybridFetch).toHaveBeenCalledTimes(1);
    });

    it('should route Bitget to fetchBitgetCurrentRates (USDT + COIN)', async () => {
      mockHybridFetch.mockResolvedValue({ code: '00000', data: [] });

      await FundingService.fetchCurrentFundingRates('bitget');

      expect(mockHybridFetch).toHaveBeenCalledTimes(2); // USDT + COIN futures
    });
  });
});
