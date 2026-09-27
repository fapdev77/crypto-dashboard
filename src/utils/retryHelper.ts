import { LogManager } from '../services/LogManager';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  context?: string;
  onRetry?: (attempt: number, error: any, delayMs: number) => void;
}

export class ApiRateLimitError extends Error {
  public readonly code?: string | number;
  public readonly exchange?: string;
  public readonly retryAfterMs?: number;

  constructor(message: string, code?: string | number, exchange?: string, retryAfterMs?: number) {
    super(message);
    this.name = 'ApiRateLimitError';
    this.code = code;
    this.exchange = exchange;
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, ApiRateLimitError.prototype);
  }
}

/**
 * Checks whether an error, response payload, or status indicates a rate limit:
 * - Bybit: retCode 10006 ("Too many visits. Exceeded the API Rate Limit.")
 * - OKX: code "50011" ("Rate limit reached")
 * - Bitget: code "30006" ("request too many")
 * - HTTP 429 (Too Many Requests) or proxy 429 response
 */
export function isRateLimited(target: any): boolean {
  if (!target) return false;

  if (target instanceof ApiRateLimitError) return true;

  // Check HTTP status property
  if (target._httpStatus === 429 || target.status === 429 || target.statusCode === 429) {
    return true;
  }

  // Check exchange-specific error codes
  if (target.retCode === 10006 || target.retCode === '10006') return true;
  if (target.code === '50011' || target.code === 50011) return true;
  if (target.code === '30006' || target.code === 30006) return true;

  // Check error message strings
  const message = (target.message || target.retMsg || target.msg || (typeof target === 'string' ? target : '')).toLowerCase();
  if (
    message.includes('10006') ||
    message.includes('50011') ||
    message.includes('30006') ||
    message.includes('429') ||
    message.includes('too many visits') ||
    message.includes('too many requests') ||
    message.includes('rate limit') ||
    message.includes('request too many')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether an error is transient (temporary network/server glitch or rate limit)
 * and therefore safe and recommended to retry.
 */
export function isTransientError(error: any): boolean {
  if (!error) return false;
  if (isRateLimited(error)) return true;

  // Check HTTP 5xx transient server codes
  const status = error._httpStatus || error.status || error.statusCode;
  if (status === 502 || status === 503 || status === 504) {
    return true;
  }

  const message = (error.message || (typeof error === 'string' ? error : '')).toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  );
}

/**
 * Generic retry executor with exponential backoff and jitter.
 * Automatically identifies rate-limit and transient network errors.
 * Non-transient errors (such as invalid API key, permission denied, bad parameters)
 * are rejected immediately without wasting retries.
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 10000;
  const context = options.context ?? 'RetryHelper';

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();

      // If the function returned a raw exchange payload with a rate-limit code instead of throwing
      if (isRateLimited(result)) {
        throw new ApiRateLimitError(
          `Exchange returned rate limit payload: ${JSON.stringify(result)}`,
          (result as any).retCode || (result as any).code
        );
      }

      return result;
    } catch (err: any) {
      lastError = err;

      if (attempt >= maxRetries) {
        break;
      }

      // If the error is not transient or rate-limited, do not retry (e.g. auth failed, invalid param)
      if (!isTransientError(err)) {
        LogManager.warn(context, `Non-transient error encountered, aborting retry:`, err?.message || err);
        throw err;
      }

      const isRateLimit = isRateLimited(err);
      // Give rate limits a slightly higher base backoff to allow exchange buckets to reset
      const effectiveBase = isRateLimit ? Math.max(baseDelayMs, 1500) : baseDelayMs;
      // Exponential backoff: base * 2^attempt + jitter (0 - 400ms)
      const exponential = effectiveBase * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 400);
      const delayMs = Math.min(exponential + jitter, maxDelayMs);

      LogManager.warn(
        context,
        `${isRateLimit ? 'Rate limit hit' : 'Transient error'} (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delayMs}ms...`,
        err?.message || err
      );

      if (options.onRetry) {
        options.onRetry(attempt + 1, err, delayMs);
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
