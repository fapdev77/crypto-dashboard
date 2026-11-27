import { proxyFetch, hybridFetch } from '../../utils/proxyFetch';
import { LogManager } from '../LogManager';
import { resolveUsdRate, type FiatRatesLike } from '../../utils/usdAggregation';

/**
 * Single source of truth for "what is one unit of this currency worth in USD?".
 *
 * Resolution order (first hit wins):
 *   1. USD-pegged stablecoins (USD_PEGGED)      -> 1
 *   2. Fiat proxies (BRL, EUR, GBP, EURT)       -> fiat rate table
 *   3. In-memory cache (5 min on success)
 *   4. Ticker of the originating exchange, when one is given
 *   5. OKX spot ticker
 *
 * A lookup that cannot be resolved returns null. It never fabricates a rate
 * (no `includes('USD') -> 1`, no `|| 0`), so callers can surface the gap.
 */

export type PriceExchange = 'bybit' | 'bitget' | 'okx';

export interface PriceLookupOptions {
  /** Exchange the balance/transaction came from; tried before the OKX fallback. */
  exchange?: string;
  /** Local fiat rates table; falls back to DEFAULT_FIAT_RATES when absent. */
  fiatRates?: FiatRatesLike;
  /** Internal: batch callers log one summary instead of one line per currency. */
  silent?: boolean;
}

export interface UsdPriceBatch {
  rates: Record<string, number>;
  /** Currencies with no resolvable USD price; excluded from USD totals. */
  missing: string[];
}

const SUCCESS_TTL_MS = 5 * 60 * 1000;
const NEGATIVE_TTL_MS = 60 * 1000;
const RETRY_DELAY_MS = 300;
const MAX_ATTEMPTS = 2;

const successCache = new Map<string, { price: number; timestamp: number }>();
const negativeCache = new Map<string, number>();

/** Contract sizes used by exchanges for micro-cap perps (1000PEPE, 1MBABYDOGE, 10000SATS). */
const MULTIPLIER_PREFIX = /^(1000000|100000|10000|1000)([A-Z][A-Z0-9]*)$/;

function normalizeCode(currency: string | undefined | null): string {
  return (currency || '').toUpperCase().trim();
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readCache(cacheKey: string): number | null {
  const hit = successCache.get(cacheKey);
  if (!hit) return null;
  if (Date.now() - hit.timestamp >= SUCCESS_TTL_MS) {
    successCache.delete(cacheKey);
    return null;
  }
  return hit.price;
}

function isNegativelyCached(cacheKey: string): boolean {
  const timestamp = negativeCache.get(cacheKey);
  if (timestamp === undefined) return false;
  if (Date.now() - timestamp >= NEGATIVE_TTL_MS) {
    negativeCache.delete(cacheKey);
    return false;
  }
  return true;
}

async function fetchOkxTicker(symbol: string): Promise<number | null> {
  const res = await proxyFetch({
    targetUrl: `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USDT`,
    method: 'GET',
    headers: {},
  });
  if (res?.code === '0' && Array.isArray(res.data) && res.data.length > 0) {
    const price = parseFloat(res.data[0].last);
    if (isFinite(price) && price > 0) return price;
  }
  return null;
}

async function fetchBybitTicker(symbol: string): Promise<number | null> {
  const res = await hybridFetch(
    `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}USDT`,
    'GET',
    {}
  );
  const item = res?.retCode === 0 ? res?.result?.list?.[0] : null;
  if (item) {
    const price = parseFloat(item.lastPrice || item.usdIndexPrice || '0');
    if (isFinite(price) && price > 0) return price;
  }
  return null;
}

async function fetchBitgetTicker(symbol: string): Promise<number | null> {
  const res = await proxyFetch({
    targetUrl: `https://api.bitget.com/api/v3/market/tickers?category=SPOT&symbol=${symbol}USDT`,
    method: 'GET',
    headers: {},
  });
  if (res?.code === '00000' && Array.isArray(res.data) && res.data.length > 0) {
    const item = res.data[0];
    const price = parseFloat(item.lastPrice || item.askPr || item.bidPr || '0');
    if (isFinite(price) && price > 0) return price;
  }
  return null;
}

async function fetchTickeredPrice(symbol: string, exchange: PriceExchange): Promise<number | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const price =
        exchange === 'bybit'
          ? await fetchBybitTicker(symbol)
          : exchange === 'bitget'
            ? await fetchBitgetTicker(symbol)
            : await fetchOkxTicker(symbol);
      if (price !== null) return price;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        LogManager.warn('UsdPrice', `Ticker lookup failed for ${symbol} on ${exchange}`, err);
      }
    }
    if (attempt < MAX_ATTEMPTS) await delay(RETRY_DELAY_MS * attempt);
  }
  return null;
}

/**
 * Exchange contract symbols trade at a multiple of the base coin
 * (1000PEPE = 1000 x PEPE), so the base quote must be multiplied back up.
 */
function splitMultiplier(code: string): { base: string; factor: number } | null {
  const match = MULTIPLIER_PREFIX.exec(code);
  if (!match) return null;
  const base = match[2];
  if (base.length < 2) return null;
  return { base, factor: Number(match[1]) };
}

/**
 * USD price of one unit of `currency`, or null when no trustworthy rate exists.
 */
export async function getUsdPrice(
  currency: string | undefined | null,
  options: PriceLookupOptions = {}
): Promise<number | null> {
  const code = normalizeCode(currency);
  if (!code) return null;

  const resolved = resolveUsdRate(code, undefined, options.fiatRates);
  if (resolved !== null) return resolved;

  const exchange = (options.exchange || '').toLowerCase() as PriceExchange | '';
  const exchanges: PriceExchange[] = exchange && exchange !== 'okx'
    ? [exchange as PriceExchange, 'okx']
    : ['okx'];

  const candidates: Array<{ symbol: string; factor: number }> = [{ symbol: code, factor: 1 }];
  const multiplier = splitMultiplier(code);
  if (multiplier) candidates.push({ symbol: multiplier.base, factor: multiplier.factor });

  for (const candidate of candidates) {
    for (const venue of exchanges) {
      const cacheKey = `${venue}:${candidate.symbol}`;
      const cached = readCache(cacheKey);
      if (cached !== null) return cached * candidate.factor;
      if (isNegativelyCached(cacheKey)) continue;

      const price = await fetchTickeredPrice(candidate.symbol, venue);
      if (price !== null) {
        successCache.set(cacheKey, { price, timestamp: Date.now() });
        negativeCache.delete(cacheKey);
        return price * candidate.factor;
      }
      negativeCache.set(cacheKey, Date.now());
    }
  }

  if (!options.silent) {
    LogManager.warn(
      'UsdPrice',
      `No USD price found for ${code} (tried ${exchanges.join(', ')})`
    );
  }
  return null;
}

/**
 * Batch variant: resolves every currency and reports the ones that could not be
 * priced, so the UI/export can warn instead of silently dropping them.
 */
export async function getUsdPrices(
  currencies: Array<string | undefined | null>,
  options: PriceLookupOptions = {}
): Promise<UsdPriceBatch> {
  const unique = Array.from(new Set(currencies.map(normalizeCode).filter(Boolean)));
  const results = await Promise.all(
    unique.map(async code => [code, await getUsdPrice(code, { ...options, silent: true })] as const)
  );

  const rates: Record<string, number> = {};
  const missing: string[] = [];
  for (const [code, price] of results) {
    if (price !== null) rates[code] = price;
    else missing.push(code);
  }

  if (missing.length > 0) {
    LogManager.warn(
      'UsdPrice',
      `Missing USD price for ${missing.join(', ')} (tried ${options.exchange || 'okx'})`
    );
  }

  return { rates, missing };
}

/**
 * Batch lookup for a page that mixes venues: each currency is priced through the
 * exchange where it actually trades, then OKX. Needed because OKX does not list
 * every exchange token (BGB and MNT return 51001), and those balances would
 * otherwise look unpriced even though their own exchange quotes them.
 */
export async function getUsdPricesForVenues(
  currenciesByVenue: Partial<Record<PriceExchange, Array<string | undefined | null>>>,
  fiatRates?: Record<string, number>
): Promise<UsdPriceBatch> {
  const groups = (Object.entries(currenciesByVenue) as Array<[PriceExchange, Array<string | undefined | null>]>)
    .map(([venue, list]) => [venue, Array.from(new Set(list.map(normalizeCode).filter(Boolean)))] as const)
    .filter(([, list]) => list.length > 0);

  const requested = new Set(groups.flatMap(([, list]) => list));
  if (requested.size === 0) return { rates: {}, missing: [] };

  const results = await Promise.all(
    groups.map(([venue, list]) => getUsdPrices(list, { exchange: venue, fiatRates }))
  );

  const rates: Record<string, number> = {};
  results.forEach(result => Object.assign(rates, result.rates));

  const missing = Array.from(requested).filter(code => rates[code] === undefined);
  return { rates, missing };
}

/** Test/account-switch helper: forget every cached quote. */
export function clearUsdPriceCache(): void {
  successCache.clear();
  negativeCache.clear();
}
