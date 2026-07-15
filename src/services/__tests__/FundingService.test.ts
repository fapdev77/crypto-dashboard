import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FundingService } from '../funding/FundingService';

// ── Mock hybridFetch ──────────────────────────────────────────────
vi.mock('../../utils/proxyFetch', () => ({
  hybridFetch: vi.fn(),
}));

import { hybridFetch } from '../../utils/proxyFetch';
const mockHybridFetch = hybridFetch as ReturnType<typeof vi.fn>;

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Generate N funding records descending from `endTs` backwards,
 * each spaced `intervalMs` apart.
 */
function generateBybitRecords(
  endTs: number,
  count: number,
  symbol: string,
): Array<{ symbol: string; fundingRate: string; fundingRateTimestamp: string }> {
  const records: Array<{ symbol: string; fundingRate: string; fundingRateTimestamp: string }> = [];
  const intervalMs = 8 * 60 * 60 * 1000; // 8 hours
  for (let i = 0; i < count; i++) {
    const ts = endTs - i * intervalMs;
    records.push({
      symbol,
      fundingRate: `${(Math.random() * 0.002).toFixed(6)}`,
      fundingRateTimestamp: String(ts),
    });
  }
  return records;
}

/**
 * Generate N Bitget funding records for a given pageNo.
 * Page 1 = most recent (near now), page N = oldest.
 */
function generateBitgetRecords(
  pageNo: number,
  pageSize: number,
  symbol: string,
): Array<{ symbol: string; fundingRate: string; fundingTime: string }> {
  const records: Array<{ symbol: string; fundingRate: string; fundingTime: string }> = [];
  const intervalMs = 8 * 60 * 60 * 1000;
  const now = Date.now();
  // Page 1 = most recent (now - 0*pageSize*interval), Page 2 = older, etc.
  const baseOffset = (pageNo - 1) * pageSize * intervalMs;
  for (let i = 0; i < pageSize; i++) {
    const ts = now - baseOffset - i * intervalMs;
    records.push({
      symbol,
      fundingRate: `${(Math.random() * 0.002).toFixed(6)}`,
      fundingTime: String(ts),
    });
  }
  return records;
}

// ── Tests ─────────────────────────────────────────────────────────

describe('FundingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchFundingHistory — bybit', () => {
    const symbol = 'BTCUSDT';
    const instType = 'USDT-M' as const;

    it('should perform full fetch with endTime reverse pagination', async () => {
      const now = Date.now();
      const page1End = now;
      // 200 records, each 8h apart → oldest is at index 199 = endTs - 199*8h
      const page2End = now - 199 * 8 * 60 * 60 * 1000;
      const page3End = page2End - 199 * 8 * 60 * 60 * 1000;

      // Page 1: 200 records ending at `now`
      mockHybridFetch.mockResolvedValueOnce({
        retCode: 0,
        result: {
          list: generateBybitRecords(page1End, 200, symbol),
        },
      });
      // Page 2: 200 records ending at page2End
      mockHybridFetch.mockResolvedValueOnce({
        retCode: 0,
        result: {
          list: generateBybitRecords(page2End, 200, symbol),
        },
      });
      // Page 3: the oldest record will be <= boundary (~400d ago), so we stop
      const page3Records = generateBybitRecords(page3End, 200, symbol);
      // Override the oldest record to be ~400 days ago (boundary)
      const boundary = Date.now() - 400 * 24 * 60 * 60 * 1000;
      page3Records[page3Records.length - 1] = {
        ...page3Records[page3Records.length - 1],
        fundingRateTimestamp: String(boundary - 1),
      };
      mockHybridFetch.mockResolvedValueOnce({
        retCode: 0,
        result: { list: page3Records },
      });

      const result = await FundingService.fetchFundingHistory('bybit', symbol, instType, 200);

      // Should have fetched 3 pages = ~600 records
      expect(mockHybridFetch).toHaveBeenCalledTimes(3);
      expect(result.length).toBeGreaterThanOrEqual(400);
      expect(result.length).toBeLessThanOrEqual(600);

      // Verify URL construction: each call should have `endTime=...` but NOT `startTime`
      for (const call of mockHybridFetch.mock.calls) {
        const url: string = call[0];
        expect(url).toContain('endTime=');
        expect(url).not.toContain('startTime=');
      }

      // First call should use current time as endTime
      const firstUrl: string = mockHybridFetch.mock.calls[0][0];
      const firstEndTime = parseInt(firstUrl.match(/endTime=(\d+)/)![1], 10);
      expect(Math.abs(firstEndTime - now)).toBeLessThan(5000);

      // Second call should use the oldest record from page 1 as endTime
      const secondUrl: string = mockHybridFetch.mock.calls[1][0];
      const secondEndTime = parseInt(secondUrl.match(/endTime=(\d+)/)![1], 10);
      expect(secondEndTime).toBe(page2End);

      // All records should have correct shape
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('exchange', 'bybit');
      expect(result[0]).toHaveProperty('symbol', symbol);
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('fundingRate');
    });

    it('should stop early when oldest record <= ~400d boundary', async () => {
      const now = Date.now();
      const boundary = now - 400 * 24 * 60 * 60 * 1000;

      // Page 1: oldest record is OLDER than boundary → should stop after 1 page
      const records = generateBybitRecords(now, 200, symbol);
      records[records.length - 1] = {
        ...records[records.length - 1],
        fundingRateTimestamp: String(boundary - 1),
      };

      mockHybridFetch.mockResolvedValueOnce({
        retCode: 0,
        result: { list: records },
      });

      const result = await FundingService.fetchFundingHistory('bybit', symbol, instType, 200);

      expect(mockHybridFetch).toHaveBeenCalledTimes(1);
      expect(result.every(r => r.symbol === symbol)).toBe(true);
    });

    it('should handle incremental fetch with startTime + endTime', async () => {
      const now = Date.now();
      const sinceTimestamp = now - 3 * 24 * 60 * 60 * 1000; // 3 days ago

      // Just 1 page needed (200 records = ~66 days, covers 3 days)
      const records = generateBybitRecords(now, 200, symbol);
      // Make sure the oldest record is still > sinceTimestamp (we haven't reached it yet)
      // Actually for incremental, we pass both startTime AND endTime
      // The boundary check becomes: stop when oldest <= sinceTimestamp
      // But since sinceTimestamp = 3 days ago and page has records from now to ~66d ago,
      // the oldest record is already <= sinceTimestamp → stops after 1 page
      mockHybridFetch.mockResolvedValueOnce({
        retCode: 0,
        result: { list: records },
      });

      const result = await FundingService.fetchFundingHistory('bybit', symbol, instType, 200, sinceTimestamp);

      // Verify URL has BOTH startTime and endTime
      const url: string = mockHybridFetch.mock.calls[0][0];
      expect(url).toContain('startTime=');
      expect(url).toContain('endTime=');

      // Verify startTime is sinceTimestamp
      const startTime = parseInt(url.match(/startTime=(\d+)/)![1], 10);
      expect(startTime).toBe(sinceTimestamp);

      expect(result.length).toBe(200);
    });

    it('should handle empty API response', async () => {
      mockHybridFetch.mockResolvedValueOnce({
        retCode: 0,
        result: { list: [] },
      });

      const result = await FundingService.fetchFundingHistory('bybit', symbol, instType, 200);
      expect(result).toHaveLength(0);
    });

    it('should handle API error (non-zero retCode)', async () => {
      mockHybridFetch.mockResolvedValueOnce({
        retCode: 10001,
        retMsg: 'error',
        result: null,
      });

      const result = await FundingService.fetchFundingHistory('bybit', symbol, instType, 200);
      expect(result).toHaveLength(0);
    });

    it('should respect MAX_PAGES limit (10 for full, 5 for incremental)', async () => {
      const now = Date.now();

      // Use records with timestamps very close to now so the boundary (400d ago)
      // is NEVER reached, forcing MAX_PAGES=10 to be the binding constraint.
      for (let i = 0; i < 12; i++) {
        mockHybridFetch.mockResolvedValueOnce({
          retCode: 0,
          result: {
            list: Array.from({ length: 200 }, (_, idx) => ({
              symbol,
              fundingRate: '0.0001',
              fundingRateTimestamp: String(now - i * 200 - idx), // all within ms of now
            })),
          },
        });
      }

      const result = await FundingService.fetchFundingHistory('bybit', symbol, instType, 200);
      // Should stop at MAX_PAGES = 10, not boundary (which is 400d away)
      expect(mockHybridFetch).toHaveBeenCalledTimes(10);
      expect(result.length).toBe(10 * 200);
    });
  });

  describe('fetchFundingHistory — bitget', () => {
    const symbol = 'BTCUSDT';
    const instType = 'USDT-M' as const;

    it('should perform full fetch with parallel page batches', async () => {
      // 15 pages needed for full fetch, but early-stop at ~400d boundary
      // Mock 15 pages of 100 records each
      for (let pageNo = 1; pageNo <= 15; pageNo++) {
        mockHybridFetch.mockResolvedValueOnce({
          code: '00000',
          data: generateBitgetRecords(pageNo, 100, symbol),
        });
      }

      const result = await FundingService.fetchFundingHistory('bitget', symbol, instType, 100);

      // Should have called hybridFetch multiple times (batches of 5)
      const calls = mockHybridFetch.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(5); // at least 1 batch
      expect(calls.length).toBeLessThanOrEqual(15);

      // Verify URL construction: should have symbol, productType, pageSize, pageNo
      for (const call of calls) {
        const url: string = call[0];
        expect(url).toContain('symbol=');
        expect(url).toContain('productType=');
        expect(url).toContain('pageSize=');
        expect(url).toContain('pageNo=');
      }

      // Verify productType mapping
      const firstUrl: string = calls[0][0];
      expect(firstUrl).toContain('productType=USDT-FUTURES'); // USDT-M → USDT-FUTURES

      // All records should have correct shape
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('exchange', 'bitget');
        expect(result[0]).toHaveProperty('timestamp');
        expect(result[0]).toHaveProperty('fundingRate');
      }
    });

    /**
     * Helper to flush any leftover mock implementations from previous tests before
     * the empty-response test. vitest's clearAllMocks does NOT clear the deferred
     * mockResolvedValueOnce queue, so we must reset explicitly.
     */
    function resetHybridFetch(): void {
      mockHybridFetch.mockReset();
      // Re-mock the function as a vi.fn() (mockReset removes all implementation)
      // mockResolvedValueOnce will re-enable it per-test.
    }

    it('should handle incremental fetch with only 1-2 pages', async () => {
      const sinceTimestamp = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago

      // Page 1: 100 records (most recent, within 2 days)
      const page1Records = generateBitgetRecords(1, 100, symbol);
      // Page 2: 100 records (older, most will be filtered out)
      const oldestTimestamp = sinceTimestamp - 1; // make oldest < sinceTimestamp
      const page2Records = generateBitgetRecords(2, 100, symbol);
      page2Records[page2Records.length - 1] = {
        ...page2Records[page2Records.length - 1],
        fundingTime: String(oldestTimestamp),
      };

      mockHybridFetch.mockResolvedValueOnce({
        code: '00000',
        data: page1Records,
      });
      mockHybridFetch.mockResolvedValueOnce({
        code: '00000',
        data: page2Records,
      });

      const result = await FundingService.fetchFundingHistory('bitget', symbol, instType, 100, sinceTimestamp);

      // Should filter to only records > sinceTimestamp
      expect(result.every(r => r.timestamp > sinceTimestamp)).toBe(true);
      expect(mockHybridFetch).toHaveBeenCalledTimes(2);

      // Verify URL has pageNo=1 and pageNo=2
      const calls = mockHybridFetch.mock.calls;
      expect(calls[0][0]).toContain('pageNo=1');
      expect(calls[1][0]).toContain('pageNo=2');
    });

    it('should handle empty response', async () => {
      resetHybridFetch();
      mockHybridFetch.mockResolvedValueOnce({
        code: '00000',
        data: [],
      });

      const result = await FundingService.fetchFundingHistory('bitget', symbol, instType, 100);
      expect(result).toHaveLength(0);
    });

    it('should handle API error (non-zero code)', async () => {
      mockHybridFetch.mockResolvedValueOnce({
        code: '40001',
        msg: 'error',
        data: [],
      });

      const result = await FundingService.fetchFundingHistory('bitget', symbol, instType, 100);
      expect(result).toHaveLength(0);
    });

    it('should map instrumentType correctly', async () => {
      // COIN-M → COIN-FUTURES
      for (let pageNo = 1; pageNo <= 5; pageNo++) {
        mockHybridFetch.mockResolvedValueOnce({
          code: '00000',
          data: generateBitgetRecords(pageNo, 100, symbol),
        });
      }

      await FundingService.fetchFundingHistory('bitget', symbol, 'COIN-M', 100);

      const url: string = mockHybridFetch.mock.calls[0][0];
      expect(url).toContain('productType=COIN-FUTURES');
    });
  });
});
