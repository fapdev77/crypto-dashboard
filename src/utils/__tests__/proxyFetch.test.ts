import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hybridFetch, proxyFetch } from '../proxyFetch';

describe('proxyFetch and hybridFetch', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('hybridFetch falls back to proxy when direct fetch times out, passing fresh signal', async () => {
    let directFetchSignal: AbortSignal | undefined;
    let proxyFetchSignal: AbortSignal | undefined;

    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === 'https://api.bybit.com/v5/order/history') {
        directFetchSignal = init?.signal as AbortSignal;
        // Simulate a timeout failure
        const timeoutError = new Error('The operation was aborted due to timeout');
        timeoutError.name = 'TimeoutError';
        return Promise.reject(timeoutError);
      }

      if (url === '/api/proxy') {
        proxyFetchSignal = init?.signal as AbortSignal;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ retCode: 0, result: { list: [] } }),
        });
      }

      return Promise.reject(new Error('Unknown url'));
    });

    const result = await hybridFetch(
      'https://api.bybit.com/v5/order/history',
      'GET',
      { 'X-Test': '1' },
      { timeoutMs: 5000 }
    );

    expect(result).toEqual({ retCode: 0, result: { list: [] }, _httpStatus: 200 });
    // Verify direct fetch was called and proxy fetch was called
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    // Proxy fetch signal should NOT be already aborted
    expect(proxyFetchSignal?.aborted).toBe(false);
  });

  it('hybridFetch does not fall back to proxy if caller explicitly aborted via options.signal', async () => {
    const callerController = new AbortController();
    callerController.abort(); // already aborted by caller

    globalThis.fetch = vi.fn().mockImplementation(() => {
      const abortErr = new Error('Aborted');
      abortErr.name = 'AbortError';
      return Promise.reject(abortErr);
    });

    await expect(
      hybridFetch(
        'https://api.bybit.com/v5/order/history',
        'GET',
        {},
        { signal: callerController.signal }
      )
    ).rejects.toThrow();

    // Should only have called direct fetch, never /api/proxy
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
