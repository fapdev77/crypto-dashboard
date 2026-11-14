import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { proxyFetch, hybridFetch } from '../../../utils/proxyFetch';
import { getUsdPrice, getUsdPrices, getUsdPricesForVenues, clearUsdPriceCache } from '../usdPrice';

vi.mock('../../../utils/proxyFetch', () => ({
  proxyFetch: vi.fn(),
  hybridFetch: vi.fn(),
}));

const mockedProxy = vi.mocked(proxyFetch);
const mockedHybrid = vi.mocked(hybridFetch);

const okxQuote = (price: number) => ({ code: '0', data: [{ last: String(price) }] });
const okxEmpty = () => ({ code: '0', data: [] });
const bitgetQuote = (price: number) => ({ code: '00000', data: [{ lastPrice: String(price) }] });
const bitgetEmpty = () => ({ code: '00000', data: [] });
const bybitQuote = (price: number) => ({ retCode: 0, result: { list: [{ lastPrice: String(price) }] } });
const bybitEmpty = () => ({ retCode: 0, result: { list: [] } });

const okxUrl = (symbol: string) => `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USDT`;

/** Lets pending retry timers run before the promise is awaited. */
async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(2000);
  return promise;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  clearUsdPriceCache();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getUsdPrice', () => {
  it('resolves USD-pegged stablecoins and fiat proxies without any network call', async () => {
    expect(await getUsdPrice('USDT')).toBe(1);
    expect(await getUsdPrice('FDUSD')).toBe(1);
    expect(await getUsdPrice('BRL')).toBeCloseTo(1 / 5.65, 8);
    expect(await getUsdPrice('EURT', { fiatRates: { EUR: 0.9 } })).toBeCloseTo(1 / 0.9, 8);
    expect(mockedProxy).not.toHaveBeenCalled();
    expect(mockedHybrid).not.toHaveBeenCalled();
  });

  it('does not assume 1 for an unknown symbol that merely contains "USD"', async () => {
    mockedProxy.mockResolvedValue(okxQuote(0.98));

    const price = await settle(getUsdPrice('USDS'));

    expect(price).toBe(0.98);
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.objectContaining({ targetUrl: okxUrl('USDS') })
    );
  });

  it('prefers the originating exchange ticker over the OKX fallback', async () => {
    mockedHybrid.mockResolvedValueOnce(bybitQuote(101));

    expect(await getUsdPrice('SOL', { exchange: 'bybit' })).toBe(101);
    expect(mockedProxy).not.toHaveBeenCalled();
  });

  it('falls back to OKX when the originating exchange has no quote', async () => {
    mockedHybrid.mockResolvedValue(bybitEmpty());
    mockedProxy.mockResolvedValue(okxQuote(99));

    const price = await settle(getUsdPrice('SOL', { exchange: 'bybit' }));

    expect(price).toBe(99);
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.objectContaining({ targetUrl: okxUrl('SOL') })
    );
  });

  it('quotes the base coin and applies the contract multiplier for 1000PEPE', async () => {
    mockedProxy.mockImplementation(async (req: any) =>
      String(req.targetUrl).includes('1000PEPE') ? okxEmpty() : okxQuote(0.00001234)
    );

    const price = await settle(getUsdPrice('1000PEPE'));

    expect(price).toBeCloseTo(0.01234, 10);
  });

  it('treats 1INCH as a ticker, not as a multiplier prefix', async () => {
    mockedProxy.mockResolvedValue(okxQuote(0.42));

    expect(await getUsdPrice('1INCH')).toBe(0.42);
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.objectContaining({ targetUrl: okxUrl('1INCH') })
    );
  });

  it('retries a transient failure once before giving up', async () => {
    mockedProxy
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValueOnce(okxQuote(2.5));

    const price = await settle(getUsdPrice('FOO'));

    expect(price).toBe(2.5);
    expect(mockedProxy).toHaveBeenCalledTimes(2);
  });

  it('returns null and then serves the negative cache for 60 seconds', async () => {
    mockedProxy.mockResolvedValue(okxEmpty());

    expect(await settle(getUsdPrice('BAR'))).toBeNull();
    expect(mockedProxy).toHaveBeenCalledTimes(2);

    expect(await getUsdPrice('BAR')).toBeNull();
    expect(mockedProxy).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(61_000);
    mockedProxy.mockResolvedValue(okxQuote(3));

    expect(await settle(getUsdPrice('BAR'))).toBe(3);
    expect(mockedProxy).toHaveBeenCalledTimes(3);
  });

  it('uses the Bitget ticker when Bitget is the originating exchange', async () => {
    mockedProxy.mockResolvedValueOnce(bitgetQuote(7.25));

    expect(await getUsdPrice('XYZ', { exchange: 'bitget' })).toBe(7.25);
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUrl: 'https://api.bitget.com/api/v3/market/tickers?category=SPOT&symbol=XYZUSDT',
      })
    );
  });

  it('returns null when every venue fails for a non-empty code', async () => {
    mockedProxy.mockResolvedValue(okxEmpty());
    mockedProxy.mockResolvedValue(bitgetEmpty());

    expect(await settle(getUsdPrice('NOPE', { exchange: 'bitget' }))).toBeNull();
  });

  it('caches a successful quote for five minutes', async () => {
    mockedProxy.mockResolvedValue(okxQuote(4));

    expect(await getUsdPrice('CACHED')).toBe(4);
    expect(await getUsdPrice('CACHED')).toBe(4);
    expect(mockedProxy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1);
    expect(await getUsdPrice('CACHED')).toBe(4);
    expect(mockedProxy).toHaveBeenCalledTimes(2);
  });
});

describe('getUsdPrices', () => {
  it('returns resolved rates and lists the currencies it could not price', async () => {
    mockedProxy.mockImplementation(async (req: any) =>
      String(req.targetUrl).includes('ZZZ') ? okxEmpty() : okxQuote(10)
    );

    const batch = await settle(getUsdPrices(['btc', 'USDT', 'BRL', 'ZZZ', 'BTC']));

    expect(batch.rates.BTC).toBe(10);
    expect(batch.rates.USDT).toBe(1);
    expect(batch.rates.BRL).toBeCloseTo(1 / 5.65, 8);
    expect(batch.missing).toEqual(['ZZZ']);
  });
});

describe('getUsdPricesForVenues', () => {
  const okxNotListed = () => ({ code: '51001', data: [] });

  it('prices each exchange token through its own venue instead of only OKX', async () => {
    // OKX does not list BGB (Bitget) nor MNT (Bybit): both return 51001.
    mockedProxy.mockImplementation(async (req: any) => {
      const url = String(req.targetUrl);
      if (url.includes('BGB-USDT') || url.includes('MNT-USDT')) return okxNotListed();
      if (url.includes('bitget.com') && url.includes('BGBUSDT')) return bitgetQuote(0.55);
      return okxEmpty();
    });
    mockedHybrid.mockImplementation(async (url: string) =>
      url.includes('MNTUSDT') ? bybitQuote(0.82) : bybitEmpty()
    );

    const batch = await settle(
      getUsdPricesForVenues({ bitget: ['BGB'], bybit: ['MNT'] })
    );

    expect(batch.rates).toEqual({ BGB: 0.55, MNT: 0.82 });
    expect(batch.missing).toEqual([]);
  });

  it('reports only currencies that no venue could price', async () => {
    mockedProxy.mockResolvedValue(okxEmpty());
    mockedHybrid.mockResolvedValue(bybitEmpty());

    const batch = await settle(
      getUsdPricesForVenues({ bitget: ['BGB', 'USDT'], bybit: ['GHOST'] })
    );

    expect(batch.rates).toEqual({ USDT: 1 });
    expect(batch.missing.sort()).toEqual(['BGB', 'GHOST']);
  });
});
