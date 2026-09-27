import { describe, it, expect, vi } from 'vitest';
import {
  ApiRateLimitError,
  isRateLimited,
  isTransientError,
  isAuthError,
  executeWithRetry,
} from '../retryHelper';

describe('retryHelper', () => {
  describe('isRateLimited', () => {
    it('detects ApiRateLimitError instances', () => {
      const err = new ApiRateLimitError('Rate limited', 10006, 'bybit');
      expect(isRateLimited(err)).toBe(true);
    });

    it('detects Bybit retCode 10006', () => {
      expect(isRateLimited({ retCode: 10006, retMsg: 'Too many visits' })).toBe(true);
      expect(isRateLimited({ retCode: '10006', retMsg: 'Too many visits' })).toBe(true);
    });

    it('detects OKX code 50011', () => {
      expect(isRateLimited({ code: '50011', msg: 'Rate limit reached' })).toBe(true);
      expect(isRateLimited({ code: 50011, msg: 'Rate limit reached' })).toBe(true);
    });

    it('detects Bitget code 30006', () => {
      expect(isRateLimited({ code: '30006', msg: 'request too many' })).toBe(true);
      expect(isRateLimited({ code: 30006, msg: 'request too many' })).toBe(true);
    });

    it('detects HTTP 429 status', () => {
      expect(isRateLimited({ _httpStatus: 429 })).toBe(true);
      expect(isRateLimited({ status: 429 })).toBe(true);
      expect(isRateLimited({ statusCode: 429 })).toBe(true);
    });

    it('detects rate limit strings in error message', () => {
      expect(isRateLimited(new Error('Proxy Error: 429 Too Many Requests'))).toBe(true);
      expect(isRateLimited(new Error('Rate limit reached. Please throttle'))).toBe(true);
      expect(isRateLimited(new Error('Too many visits!'))).toBe(true);
      expect(isRateLimited(new Error('request too many'))).toBe(true);
    });

    it('returns false for non-rate-limit errors or responses', () => {
      expect(isRateLimited(null)).toBe(false);
      expect(isRateLimited(undefined)).toBe(false);
      expect(isRateLimited({ retCode: 0, result: {} })).toBe(false);
      expect(isRateLimited({ code: '00000', data: [] })).toBe(false);
      expect(isRateLimited(new Error('Invalid API Key'))).toBe(false);
      expect(isRateLimited({ retCode: 10003, retMsg: 'API key is invalid' })).toBe(false);
    });
  });

  describe('isTransientError', () => {
    it('treats rate-limits as transient', () => {
      expect(isTransientError({ retCode: 10006 })).toBe(true);
      expect(isTransientError({ code: '50011' })).toBe(true);
      expect(isTransientError({ code: '30006' })).toBe(true);
      expect(isTransientError({ _httpStatus: 429 })).toBe(true);
    });

    it('treats network failures and timeouts as transient', () => {
      expect(isTransientError(new Error('Failed to fetch'))).toBe(true);
      expect(isTransientError(new Error('Network error: ECONNRESET'))).toBe(true);
      expect(isTransientError(new Error('ETIMEDOUT: Connection timed out'))).toBe(true);
      expect(isTransientError(new Error('Gateway Timeout: upstream exchange did not respond'))).toBe(true);
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      expect(isTransientError(abortErr)).toBe(true);
      const timeoutErr = new Error('The operation timed out');
      timeoutErr.name = 'TimeoutError';
      expect(isTransientError(timeoutErr)).toBe(true);
      expect(isTransientError({ status: 502 })).toBe(true);
      expect(isTransientError({ status: 503 })).toBe(true);
      expect(isTransientError({ status: 504 })).toBe(true);
    });

    it('treats business logic errors as non-transient', () => {
      expect(isTransientError(new Error('API key invalid'))).toBe(false);
      expect(isTransientError(new Error('Parameter error: symbol not found'))).toBe(false);
      expect(isTransientError(null)).toBe(false);
    });

    it('never treats authentication errors as transient even if they contain network-sounding words', () => {
      expect(isTransientError({ _httpStatus: 401, message: 'fetch failed: Unauthorized API key' })).toBe(false);
      expect(isTransientError({ retCode: 10003, message: 'network request aborted: API key is invalid' })).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('detects HTTP 401 and 403 status codes', () => {
      expect(isAuthError({ _httpStatus: 401 })).toBe(true);
      expect(isAuthError({ status: 401 })).toBe(true);
      expect(isAuthError({ statusCode: 401 })).toBe(true);
      expect(isAuthError({ _httpStatus: 403 })).toBe(true);
      expect(isAuthError({ status: 403 })).toBe(true);
    });

    it('detects Bybit auth error codes', () => {
      expect(isAuthError({ retCode: 10003, retMsg: 'API key is invalid' })).toBe(true);
      expect(isAuthError({ retCode: 10004, retMsg: 'Error sign' })).toBe(true);
      expect(isAuthError({ retCode: 10005, retMsg: 'Permission denied' })).toBe(true);
      expect(isAuthError({ retCode: 33004, retMsg: 'API key has expired' })).toBe(true);
      expect(isAuthError({ retCode: 10024, retMsg: 'Compliance IP violation' })).toBe(true);
    });

    it('detects OKX auth error codes', () => {
      expect(isAuthError({ code: '50111', msg: 'Invalid API key' })).toBe(true);
      expect(isAuthError({ code: '50105', msg: 'Access key invalid' })).toBe(true);
      expect(isAuthError({ code: '50113', msg: 'IP not in whitelist' })).toBe(true);
      expect(isAuthError({ code: '50100', msg: 'User does not exist' })).toBe(true);
    });

    it('detects Bitget auth error codes', () => {
      expect(isAuthError({ code: '40001', msg: 'accesskey does not exist' })).toBe(true);
      expect(isAuthError({ code: '40005', msg: 'sign failed' })).toBe(true);
      expect(isAuthError({ code: '40006', msg: 'invalid IP' })).toBe(true);
      expect(isAuthError({ code: '40014', msg: 'accesskey expired' })).toBe(true);
      expect(isAuthError({ code: '40017', msg: 'API key frozen' })).toBe(true);
    });

    it('detects auth keywords in error messages', () => {
      expect(isAuthError(new Error('Invalid API Key provided'))).toBe(true);
      expect(isAuthError(new Error('Signature verification failed'))).toBe(true);
      expect(isAuthError(new Error('User unauthorized: 401'))).toBe(true);
      expect(isAuthError(new Error('Forbidden: API key lacks positions read permission'))).toBe(true);
      expect(isAuthError(new Error('IP address not in whitelist'))).toBe(true);
      expect(isAuthError(new Error('API key has expired, please renew'))).toBe(true);
    });

    it('returns false for transient network or rate-limit errors', () => {
      expect(isAuthError(null)).toBe(false);
      expect(isAuthError(undefined)).toBe(false);
      expect(isAuthError({ retCode: 10006, retMsg: 'Rate limit' })).toBe(false);
      expect(isAuthError({ _httpStatus: 429 })).toBe(false);
      expect(isAuthError(new Error('ECONNRESET'))).toBe(false);
      expect(isAuthError(new Error('Failed to fetch'))).toBe(false);
    });
  });

  describe('executeWithRetry', () => {
    it('returns result immediately on success', async () => {
      const fn = vi.fn().mockResolvedValue({ success: true });
      const result = await executeWithRetry(fn, { maxRetries: 3, baseDelayMs: 10 });
      expect(result).toEqual({ success: true });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on transient error and succeeds on 2nd attempt', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ data: 'ok' });

      const onRetry = vi.fn();
      const result = await executeWithRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        onRetry,
      });

      expect(result).toEqual({ data: 'ok' });
      expect(fn).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
    });

    it('retries when rate-limit error is encountered', async () => {
      const rateLimitErr = new ApiRateLimitError('Too many visits', 10006, 'bybit');
      const fn = vi
        .fn()
        .mockRejectedValueOnce(rateLimitErr)
        .mockResolvedValueOnce({ list: [1, 2, 3] });

      const onRetry = vi.fn();
      const result = await executeWithRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        onRetry,
      });

      expect(result).toEqual({ list: [1, 2, 3] });
      expect(fn).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('retries when exchange returns rate-limit payload instead of throwing', async () => {
      const fn = vi
        .fn()
        .mockResolvedValueOnce({ retCode: 10006, retMsg: 'Rate limit exceeded' })
        .mockResolvedValueOnce({ retCode: 0, result: { list: ['done'] } });

      const result = await executeWithRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
      });

      expect(result).toEqual({ retCode: 0, result: { list: ['done'] } });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry non-transient errors (fails fast)', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Invalid credentials (10003)'));

      await expect(
        executeWithRetry(fn, { maxRetries: 3, baseDelayMs: 10 })
      ).rejects.toThrow('Invalid credentials (10003)');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('exhausts all retries and throws when persistent transient error occurs', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Persistent network failure (ECONNRESET)'));

      await expect(
        executeWithRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
      ).rejects.toThrow('Persistent network failure (ECONNRESET)');

      expect(fn).toHaveBeenCalledTimes(3); // attempt 0, 1, 2
    });
  });
});
