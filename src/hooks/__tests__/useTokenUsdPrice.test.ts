import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { proxyFetch, hybridFetch } from '../../utils/proxyFetch';
import { fetchTokenUsdPrice } from '../useTokenUsdPrice';
import { clearUsdPriceCache } from '../../services/pricing/usdPrice';

vi.mock('../../utils/proxyFetch', () => ({
  proxyFetch: vi.fn(),
  hybridFetch: vi.fn(),
}));

const mockedProxy = vi.mocked(proxyFetch);

const okxQuote = (price: number) => ({ code: '0', data: [{ last: String(price) }] });

describe('fetchTokenUsdPrice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearUsdPriceCache();
    vi.clearAllMocks();
    mockedProxy.mockResolvedValue(okxQuote(123));
    vi.mocked(hybridFetch).mockResolvedValue({ retCode: 0, result: { list: [] } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps returning null for fiat and stablecoin codes', async () => {
    expect(await fetchTokenUsdPrice('USDT')).toBeNull();
    expect(await fetchTokenUsdPrice('USD')).toBeNull();
    expect(await fetchTokenUsdPrice('BRL')).toBeNull();
    expect(mockedProxy).not.toHaveBeenCalled();
  });

  it('no longer treats every symbol containing "USD" as a dollar', async () => {
    const price = fetchTokenUsdPrice('USDS');
    await vi.advanceTimersByTimeAsync(500);

    // Previously returned null (blocked by the substring guard); now it is priced
    // by the cascade instead of being silently skipped.
    expect(await price).toBe(123);
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUrl: 'https://www.okx.com/api/v5/market/ticker?instId=USDS-USDT',
      })
    );
  });

  it('returns null when the cascade cannot price the currency', async () => {
    mockedProxy.mockResolvedValue({ code: '0', data: [] });

    const price = fetchTokenUsdPrice('ZZZ');
    await vi.advanceTimersByTimeAsync(2000);

    expect(await price).toBeNull();
  });
});
