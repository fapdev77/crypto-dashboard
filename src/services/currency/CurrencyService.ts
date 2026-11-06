import {
  SupportedFiatCurrency,
  SupportedLocale,
  DEFAULT_FIAT_RATES,
  SUPPORTED_FIAT_CURRENCIES,
  SUPPORTED_LOCALES,
} from './currencyTypes';
import { proxyFetch } from '../../utils/proxyFetch';
import { LogManager } from '../LogManager';
import { useSettingsStore } from '../../store/settingsStore';

const CACHE_KEY = 'cpm_fiat_rates_cache_v2';
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

export class CurrencyService {
  private static inMemoryCache: CachedRates | null = null;
  private static isFetching = false;
  private static listeners: Array<(rates: Record<SupportedFiatCurrency, number>) => void> = [];

  /**
   * Helper to retrieve currently configured TTL in milliseconds.
   */
  public static getTtlMs(customMinutes?: number): number {
    const mins = customMinutes ?? useSettingsStore.getState?.()?.fiatRatesTtlMinutes ?? DEFAULT_TTL_MINUTES;
    return Math.max(5, Math.min(60, mins)) * 60 * 1000;
  }

  /**
   * Returns current rates information (from memory, localStorage or fallback).
   */
  public static getRatesInfo(customTtlMinutes?: number): FiatRatesResult {
    const ttlMs = this.getTtlMs(customTtlMinutes);
    const now = Date.now();

    if (this.inMemoryCache && now - this.inMemoryCache.timestamp < ttlMs) {
      return { ...this.inMemoryCache };
    }

    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed: CachedRates = JSON.parse(stored);
        if (parsed?.rates) {
          const isFresh = now - parsed.timestamp < ttlMs;
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
   * Fetches latest fiat exchange rates for USD -> [EUR, GBP, BRL].
   * Fallback hierarchy:
   * 1. Primary: open.er-api.com
   * 2. Secondary: api.frankfurter.dev
   * 3. Fallback Level 1: Previously saved localStorage rates (cached)
   * 4. Fallback Level 2: Static hardcoded default rates (fallback)
   */
  public static async fetchFiatRates(customTtlMinutes?: number): Promise<Record<SupportedFiatCurrency, number>> {
    const ttlMs = this.getTtlMs(customTtlMinutes);
    const now = Date.now();

    // If cache is still valid, return it immediately
    if (this.inMemoryCache && now - this.inMemoryCache.timestamp < ttlMs) {
      return this.inMemoryCache.rates;
    }

    // Try reading fresh cache from localStorage
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

    if (this.isFetching) {
      return this.getCachedRates();
    }

    this.isFetching = true;

    try {
      let fetchedRates: Record<SupportedFiatCurrency, number> | null = null;
      let activeSource = 'open.er-api.com';

      // 1. Try high-availability primary provider (open.er-api.com)
      try {
        const res = await proxyFetch({
          targetUrl: 'https://open.er-api.com/v6/latest/USD',
          method: 'GET',
          headers: {},
        });

        if (res && res.result === 'success' && res.rates) {
          fetchedRates = {
            USD: 1.0,
            EUR: typeof res.rates.EUR === 'number' ? res.rates.EUR : DEFAULT_FIAT_RATES.EUR,
            GBP: typeof res.rates.GBP === 'number' ? res.rates.GBP : DEFAULT_FIAT_RATES.GBP,
            BRL: typeof res.rates.BRL === 'number' ? res.rates.BRL : DEFAULT_FIAT_RATES.BRL,
          };
          activeSource = 'open.er-api.com';
        }
      } catch (err) {
        LogManager.warn('CurrencyService', 'Failed fetching from primary rates provider (open.er-api.com)', err);
      }

      // 2. Try secondary ECB public provider (api.frankfurter.dev)
      if (!fetchedRates) {
        try {
          const res = await proxyFetch({
            targetUrl: 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,BRL',
            method: 'GET',
            headers: {},
          });

          if (res && res.rates) {
            fetchedRates = {
              USD: 1.0,
              EUR: typeof res.rates.EUR === 'number' ? res.rates.EUR : DEFAULT_FIAT_RATES.EUR,
              GBP: typeof res.rates.GBP === 'number' ? res.rates.GBP : DEFAULT_FIAT_RATES.GBP,
              BRL: typeof res.rates.BRL === 'number' ? res.rates.BRL : DEFAULT_FIAT_RATES.BRL,
            };
            activeSource = 'api.frankfurter.dev';
          }
        } catch (secErr) {
          LogManager.warn('CurrencyService', 'Failed fetching from secondary rates provider (api.frankfurter.dev)', secErr);
        }
      }

      // If network calls succeeded:
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
    } catch (err) {
      LogManager.warn('CurrencyService', 'All fiat rate lookups failed, utilizing fallback rates', err);
    } finally {
      this.isFetching = false;
    }

    // 3. Fallback Level 1: Use previously cached rates even if expired
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

    // 4. Fallback Level 2: Static hardcoded default rates
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
