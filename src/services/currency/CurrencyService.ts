import {
  SupportedFiatCurrency,
  SupportedLocale,
  DEFAULT_FIAT_RATES,
  DEFAULT_USDT_RATE,
  SUPPORTED_FIAT_CURRENCIES,
  SUPPORTED_LOCALES,
  CurrencyApiDiagnostics,
} from './currencyTypes';
import { proxyFetch } from '../../utils/proxyFetch';
import { LogManager } from '../LogManager';
import { useSettingsStore } from '../../store/settingsStore';

const CACHE_KEY = 'cpm_fiat_rates_cache_v2';
const USDT_CACHE_KEY = 'cpm_usdt_rate_cache_v1';
const DEFAULT_TTL_MINUTES = 30;

export interface FiatRatesResult {
  rates: Record<SupportedFiatCurrency, number>;
  source: string;
  status: 'live' | 'cached' | 'fallback';
  timestamp: number;
}

interface CachedRates {
  rates: Record<SupportedFiatCurrency, number>;
  source: string;
  status: 'live' | 'cached' | 'fallback';
  timestamp: number;
}

interface CachedUsdtRate {
  rate: number;
  status: 'live' | 'cached' | 'fallback';
  timestamp: number;
}

export class CurrencyService {
  private static inMemoryCache: CachedRates | null = null;
  private static inMemoryUsdtCache: CachedUsdtRate | null = null;
  private static isFetching = false;
  private static listeners: Array<(rates: Record<SupportedFiatCurrency, number>) => void> = [];

  /**
   * Clears in-memory and local storage cache (useful for testing and reset)
   */
  public static clearCache(): void {
    this.inMemoryCache = null;
    this.inMemoryUsdtCache = null;
    this.isFetching = false;
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(USDT_CACHE_KEY);
    } catch {
      // Ignore
    }
  }

  /**
   * Helper to retrieve currently configured TTL in milliseconds.
   */
  public static getTtlMs(customMinutes?: number): number {
    if (customMinutes === 0) return 0;
    const mins = customMinutes ?? useSettingsStore.getState?.()?.fiatRatesTtlMinutes ?? DEFAULT_TTL_MINUTES;
    return Math.max(5, Math.min(60, mins)) * 60 * 1000;
  }

  /**
   * Returns current rates information (from memory, localStorage or fallback).
   */
  public static getRatesInfo(customTtlMinutes?: number): FiatRatesResult {
    const ttlMs = this.getTtlMs(customTtlMinutes);
    const now = Date.now();

    if (ttlMs > 0 && this.inMemoryCache && now - this.inMemoryCache.timestamp < ttlMs) {
      return { ...this.inMemoryCache };
    }

    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed: CachedRates = JSON.parse(stored);
        if (parsed?.rates) {
          const isFresh = ttlMs > 0 && now - parsed.timestamp < ttlMs;
          this.inMemoryCache = {
            ...parsed,
            status: isFresh ? parsed.status : 'cached',
          };
          return { ...this.inMemoryCache };
        }
      }
    } catch {
      // Storage error; ignore and fallback
    }

    return {
      rates: { ...DEFAULT_FIAT_RATES },
      source: 'fallback',
      status: 'fallback',
      timestamp: Date.now(),
    };
  }

  /**
   * Returns cached rates dictionary directly.
   */
  public static getCachedRates(): Record<SupportedFiatCurrency, number> {
    return this.getRatesInfo().rates;
  }

  /**
   * Returns current USDT rate in USD (from memory, localStorage or fallback).
   */
  public static getUsdtRate(): number {
    const now = Date.now();
    const ttlMs = this.getTtlMs();

    if (ttlMs > 0 && this.inMemoryUsdtCache && now - this.inMemoryUsdtCache.timestamp < ttlMs) {
      return this.inMemoryUsdtCache.rate;
    }

    try {
      const stored = localStorage.getItem(USDT_CACHE_KEY);
      if (stored) {
        const parsed: CachedUsdtRate = JSON.parse(stored);
        if (typeof parsed?.rate === 'number') {
          this.inMemoryUsdtCache = parsed;
          return parsed.rate;
        }
      }
    } catch {
      // Ignore storage error
    }

    return DEFAULT_USDT_RATE;
  }

  /**
   * Fetches latest fiat exchange rates from Frankfurter v2 and USDT rate from CoinGecko.
   * Fallback hierarchy (2 Levels):
   * 1. Primary: api.frankfurter.dev (v2) & api.coingecko.com (v3)
   * 2. Fallback Level 1: Previously saved localStorage rates (cached)
   * 3. Fallback Level 2: Static hardcoded default rates (fallback)
   */
  public static async fetchFiatRates(customTtlMinutes?: number): Promise<Record<SupportedFiatCurrency, number>> {
    const ttlMs = this.getTtlMs(customTtlMinutes);
    const now = Date.now();

    // If cache is still valid and not forcing refresh (ttlMs > 0), return it immediately
    if (ttlMs > 0 && this.inMemoryCache && now - this.inMemoryCache.timestamp < ttlMs) {
      return this.inMemoryCache.rates;
    }

    // Try reading fresh cache from localStorage (if not forcing refresh)
    if (ttlMs > 0) {
      try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (stored) {
          const parsed: CachedRates = JSON.parse(stored);
          if (parsed?.rates && now - parsed.timestamp < ttlMs) {
            this.inMemoryCache = parsed;
            return parsed.rates;
          }
        }
      } catch {
        // Continue to fetch
      }
    }

    if (this.isFetching) {
      return this.getCachedRates();
    }

    this.isFetching = true;

    const frankfurterEndpoint = 'https://api.frankfurter.dev/v2/rates?base=USD&quotes=BRL,EUR,GBP';
    const coingeckoEndpoint = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd';

    let fetchedRates: Record<SupportedFiatCurrency, number> | null = null;
    let fetchedUsdt: number | null = null;
    const activeSource = 'api.frankfurter.dev';

    let frankfurterLatency = 0;
    let frankfurterError: string | null = null;
    let coingeckoLatency = 0;
    let coingeckoError: string | null = null;

    try {
      // Execute both Frankfurter v2 and CoinGecko calls concurrently
      const [frankfurterResult, coingeckoResult] = await Promise.allSettled([
        (async () => {
          const start = performance.now();
          const res = await proxyFetch({
            targetUrl: frankfurterEndpoint,
            method: 'GET',
            headers: {},
          });
          frankfurterLatency = Math.round(performance.now() - start);
          return res;
        })(),
        (async () => {
          const start = performance.now();
          const res = await proxyFetch({
            targetUrl: coingeckoEndpoint,
            method: 'GET',
            headers: {},
          });
          coingeckoLatency = Math.round(performance.now() - start);
          return res;
        })(),
      ]);

      // Process Frankfurter v2 Response
      if (frankfurterResult.status === 'fulfilled') {
        const res = frankfurterResult.value;
        // Frankfurter v2 returns an array: [{ date, base, quote, rate }, ...]
        if (Array.isArray(res) && res.length > 0) {
          const parsedRates: Record<SupportedFiatCurrency, number> = {
            USD: 1.0,
            EUR: DEFAULT_FIAT_RATES.EUR,
            GBP: DEFAULT_FIAT_RATES.GBP,
            BRL: DEFAULT_FIAT_RATES.BRL,
          };

          for (const item of res) {
            if (item && typeof item.quote === 'string' && typeof item.rate === 'number') {
              if (item.quote === 'EUR') parsedRates.EUR = item.rate;
              if (item.quote === 'GBP') parsedRates.GBP = item.rate;
              if (item.quote === 'BRL') parsedRates.BRL = item.rate;
            }
          }

          fetchedRates = parsedRates;
        } else if (res && typeof res === 'object' && res.rates) {
          // Compatibility with v1 format if ever returned
          fetchedRates = {
            USD: 1.0,
            EUR: typeof res.rates.EUR === 'number' ? res.rates.EUR : DEFAULT_FIAT_RATES.EUR,
            GBP: typeof res.rates.GBP === 'number' ? res.rates.GBP : DEFAULT_FIAT_RATES.GBP,
            BRL: typeof res.rates.BRL === 'number' ? res.rates.BRL : DEFAULT_FIAT_RATES.BRL,
          };
        } else {
          frankfurterError = 'Invalid response payload format from Frankfurter v2';
          LogManager.warn('CurrencyService', frankfurterError, res);
        }
      } else {
        frankfurterError = frankfurterResult.reason?.message || 'Network error fetching Frankfurter v2';
        LogManager.warn('CurrencyService', 'Failed fetching from Frankfurter v2', frankfurterResult.reason);
      }

      // Process CoinGecko Response
      if (coingeckoResult.status === 'fulfilled') {
        const res = coingeckoResult.value;
        if (res && res.tether && typeof res.tether.usd === 'number') {
          fetchedUsdt = res.tether.usd;
        } else {
          coingeckoError = 'Invalid response payload format from CoinGecko';
          LogManager.warn('CurrencyService', coingeckoError, res);
        }
      } else {
        coingeckoError = coingeckoResult.reason?.message || 'Network error fetching CoinGecko';
        LogManager.warn('CurrencyService', 'Failed fetching from CoinGecko', coingeckoResult.reason);
      }

      // Update USDT store & cache
      if (fetchedUsdt !== null) {
        const usdtData: CachedUsdtRate = {
          rate: fetchedUsdt,
          status: 'live',
          timestamp: Date.now(),
        };
        this.saveUsdtCache(usdtData);
        useSettingsStore.getState?.()?.setUsdtRate?.(fetchedUsdt, 'live');
      } else {
        // Fallback for USDT
        const fallbackUsdt = this.getFallbackUsdt();
        useSettingsStore.getState?.()?.setUsdtRate?.(fallbackUsdt.rate, fallbackUsdt.status);
      }

      // Update Diagnostics
      const diagnostics: CurrencyApiDiagnostics = {
        frankfurter: {
          status: fetchedRates ? 'connected' : 'error',
          lastUpdated: fetchedRates ? Date.now() : (useSettingsStore.getState?.()?.apiDiagnostics?.frankfurter?.lastUpdated ?? null),
          latencyMs: frankfurterLatency,
          error: frankfurterError,
          endpoint: frankfurterEndpoint,
        },
        coingecko: {
          status: fetchedUsdt !== null ? 'connected' : 'error',
          lastUpdated: fetchedUsdt !== null ? Date.now() : (useSettingsStore.getState?.()?.apiDiagnostics?.coingecko?.lastUpdated ?? null),
          latencyMs: coingeckoLatency,
          error: coingeckoError,
          endpoint: coingeckoEndpoint,
        },
      };
      useSettingsStore.getState?.()?.setApiDiagnostics?.(diagnostics);

      // If fiat network call succeeded:
      if (fetchedRates) {
        const result: CachedRates = {
          rates: fetchedRates,
          source: activeSource,
          status: 'live',
          timestamp: Date.now(),
        };
        this.saveCache(result);
        this.notifyListeners(fetchedRates);

        useSettingsStore.getState?.()?.setFiatRatesMetadata?.({
          rates: fetchedRates,
          source: activeSource,
          status: 'live',
        });

        return fetchedRates;
      }
    } catch (err: any) {
      LogManager.warn('CurrencyService', 'All fiat rate lookups failed, utilizing fallback rates', err);
    } finally {
      this.isFetching = false;
    }

    // Fallback Level 1: Use previously cached rates even if expired
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed: CachedRates = JSON.parse(stored);
        if (parsed?.rates) {
          const cachedResult: CachedRates = {
            ...parsed,
            status: 'cached',
          };
          this.inMemoryCache = cachedResult;
          useSettingsStore.getState?.()?.setFiatRatesMetadata?.({
            rates: parsed.rates,
            source: parsed.source || 'cache',
            status: 'cached',
          });
          return parsed.rates;
        }
      }
    } catch {
      // Continue to Fallback Level 2
    }

    // Fallback Level 2: Static hardcoded default rates
    const fallbackResult: CachedRates = {
      rates: { ...DEFAULT_FIAT_RATES },
      source: 'fallback',
      status: 'fallback',
      timestamp: Date.now(),
    };
    this.inMemoryCache = fallbackResult;
    useSettingsStore.getState?.()?.setFiatRatesMetadata?.({
      rates: fallbackResult.rates,
      source: 'fallback',
      status: 'fallback',
    });

    return fallbackResult.rates;
  }

  /**
   * Save rates to both memory and localStorage
   */
  private static saveCache(data: CachedRates) {
    this.inMemoryCache = data;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Save USDT rate to both memory and localStorage
   */
  private static saveUsdtCache(data: CachedUsdtRate) {
    this.inMemoryUsdtCache = data;
    try {
      localStorage.setItem(USDT_CACHE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Retrieves USDT rate from cache (Level 1) or static default (Level 2)
   */
  private static getFallbackUsdt(): { rate: number; status: 'cached' | 'fallback' } {
    try {
      const stored = localStorage.getItem(USDT_CACHE_KEY);
      if (stored) {
        const parsed: CachedUsdtRate = JSON.parse(stored);
        if (typeof parsed?.rate === 'number') {
          return { rate: parsed.rate, status: 'cached' };
        }
      }
    } catch {
      // Fallback to static
    }
    return { rate: DEFAULT_USDT_RATE, status: 'fallback' };
  }

  /**
   * Subscribe to rate updates
   */
  public static subscribe(listener: (rates: Record<SupportedFiatCurrency, number>) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notifyListeners(rates: Record<SupportedFiatCurrency, number>) {
    this.listeners.forEach(fn => {
      try {
        fn(rates);
      } catch {
        // Safe listener execution
      }
    });
  }

  /**
   * Convert an amount from USD into the target fiat currency.
   */
  public static convertFromUsd(
    amountInUsd: number | undefined | null,
    targetCurrency: SupportedFiatCurrency = 'USD',
    customRates?: Record<SupportedFiatCurrency, number>
  ): number {
    if (amountInUsd === undefined || amountInUsd === null || isNaN(amountInUsd)) {
      return 0;
    }
    if (targetCurrency === 'USD') {
      return amountInUsd;
    }

    const rates = customRates || this.getCachedRates();
    const rate = rates[targetCurrency] || DEFAULT_FIAT_RATES[targetCurrency] || 1;
    return amountInUsd * rate;
  }

  /**
   * Convert an amount from a given fiat currency back to USD.
   */
  public static convertToUsd(
    amountInFiat: number | undefined | null,
    sourceCurrency: SupportedFiatCurrency = 'USD',
    customRates?: Record<SupportedFiatCurrency, number>
  ): number {
    if (amountInFiat === undefined || amountInFiat === null || isNaN(amountInFiat)) {
      return 0;
    }
    if (sourceCurrency === 'USD') {
      return amountInFiat;
    }

    const rates = customRates || this.getCachedRates();
    const rate = rates[sourceCurrency] || DEFAULT_FIAT_RATES[sourceCurrency] || 1;
    return rate > 0 ? amountInFiat / rate : amountInFiat;
  }

  /**
   * Get the currency symbol (e.g. '$', 'R$', '€', '£')
   */
  public static getSymbol(currency: SupportedFiatCurrency): string {
    return SUPPORTED_FIAT_CURRENCIES[currency]?.symbol || '$';
  }

  /**
   * Formats a fiat currency value with the appropriate locale and currency symbol.
   */
  public static format(
    amount: number | undefined | null,
    currency: SupportedFiatCurrency = 'USD',
    locale: SupportedLocale = 'en-US',
    decimals: number = 2
  ): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '--';
    }

    const numberLocale = SUPPORTED_LOCALES[locale]?.numberLocale || 'en-US';
    const symbol = this.getSymbol(currency);
    const absVal = Math.abs(amount);
    const isNegative = amount < 0;

    const formattedNumber = absVal.toLocaleString(numberLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    if (currency === 'BRL') {
      return `${isNegative ? '-' : ''}${symbol} ${formattedNumber}`;
    }
    return `${isNegative ? '-' : ''}${symbol}${formattedNumber}`;
  }
}
