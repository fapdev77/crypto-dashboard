import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CurrencyService } from '../services/currency/CurrencyService';
import { DEFAULT_FIAT_RATES, DEFAULT_USDT_RATE } from '../services/currency/currencyTypes';
import * as proxyModule from '../utils/proxyFetch';
import { useSettingsStore } from '../store/settingsStore';

describe('CurrencyService', () => {
  beforeEach(() => {
    CurrencyService.clearCache();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('provides default fallback rates when cache is empty', () => {
    const rates = CurrencyService.getCachedRates();
    expect(rates.USD).toBe(1.0);
    expect(rates.BRL).toBe(DEFAULT_FIAT_RATES.BRL);
    expect(rates.EUR).toBe(DEFAULT_FIAT_RATES.EUR);
    expect(rates.GBP).toBe(DEFAULT_FIAT_RATES.GBP);
  });

  it('converts USD to BRL correctly using custom or default rates', () => {
    const customRates = { USD: 1.0, BRL: 5.5, EUR: 0.9, GBP: 0.8 };
    const converted = CurrencyService.convertFromUsd(100, 'BRL', customRates);
    expect(converted).toBe(550);
  });

  it('converts USD to EUR and GBP accurately', () => {
    const customRates = { USD: 1.0, BRL: 5.0, EUR: 0.92, GBP: 0.79 };
    expect(CurrencyService.convertFromUsd(100, 'EUR', customRates)).toBeCloseTo(92, 2);
    expect(CurrencyService.convertFromUsd(100, 'GBP', customRates)).toBeCloseTo(79, 2);
  });

  it('returns exact amount for USD without conversion', () => {
    expect(CurrencyService.convertFromUsd(250.75, 'USD')).toBe(250.75);
  });

  it('safely handles null, undefined, or NaN amounts', () => {
    expect(CurrencyService.convertFromUsd(null, 'BRL')).toBe(0);
    expect(CurrencyService.convertFromUsd(undefined, 'EUR')).toBe(0);
    expect(CurrencyService.convertFromUsd(NaN, 'GBP')).toBe(0);
  });

  it('converts from fiat back to USD', () => {
    const customRates = { USD: 1.0, BRL: 5.0, EUR: 0.8, GBP: 0.75 };
    expect(CurrencyService.convertToUsd(500, 'BRL', customRates)).toBe(100);
    expect(CurrencyService.convertToUsd(80, 'EUR', customRates)).toBe(100);
  });

  it('formats fiat amounts with appropriate currency symbol and locale', () => {
    const formattedBrl = CurrencyService.format(1234.56, 'BRL', 'pt-BR');
    expect(formattedBrl).toContain('R$');
    expect(formattedBrl).toContain('1.234,56');

    const formattedUsd = CurrencyService.format(1234.56, 'USD', 'en-US');
    expect(formattedUsd).toBe('$1,234.56');

    const formattedNegative = CurrencyService.format(-450.2, 'BRL', 'pt-BR');
    expect(formattedNegative).toContain('-R$');
  });

  it('returns symbol for each supported fiat currency', () => {
    expect(CurrencyService.getSymbol('USD')).toBe('$');
    expect(CurrencyService.getSymbol('EUR')).toBe('€');
    expect(CurrencyService.getSymbol('GBP')).toBe('£');
    expect(CurrencyService.getSymbol('BRL')).toBe('R$');
  });

  it('fetches live rates successfully from Frankfurter v2 and CoinGecko', async () => {
    vi.spyOn(proxyModule, 'proxyFetch').mockImplementation(async (req) => {
      if (req.targetUrl.includes('api.frankfurter.dev')) {
        return [
          { date: '2026-11-06', base: 'USD', quote: 'BRL', rate: 5.4856 },
          { date: '2026-11-07', base: 'USD', quote: 'EUR', rate: 0.89138 },
          { date: '2026-11-07', base: 'USD', quote: 'GBP', rate: 0.74402 },
        ];
      }
      if (req.targetUrl.includes('api.coingecko.com')) {
        return {
          tether: {
            usd: 0.9991,
          },
        };
      }
      return null;
    });

    const rates = await CurrencyService.fetchFiatRates(0);
    expect(rates.USD).toBe(1.0);
    expect(rates.BRL).toBe(5.4856);
    expect(rates.EUR).toBe(0.89138);
    expect(rates.GBP).toBe(0.74402);

    expect(CurrencyService.getUsdtRate()).toBe(0.9991);
    expect(useSettingsStore.getState().fiatRatesStatus).toBe('live');
    expect(useSettingsStore.getState().fiatRatesSource).toBe('api.frankfurter.dev');
    expect(useSettingsStore.getState().apiDiagnostics.frankfurter.status).toBe('connected');
    expect(useSettingsStore.getState().apiDiagnostics.coingecko.status).toBe('connected');
  });

  it('uses Fallback Level 1 (localStorage cached rates) when external network fails', async () => {
    // Populate cached rates in localStorage
    localStorage.setItem(
      'cpm_fiat_rates_cache_v2',
      JSON.stringify({
        rates: { USD: 1.0, EUR: 0.88, GBP: 0.76, BRL: 5.3 },
        source: 'api.frankfurter.dev',
        status: 'live',
        timestamp: Date.now() - 3600000, // expired
      })
    );
    localStorage.setItem(
      'cpm_usdt_rate_cache_v1',
      JSON.stringify({
        rate: 0.998,
        status: 'live',
        timestamp: Date.now() - 3600000,
      })
    );

    // Mock network failure
    vi.spyOn(proxyModule, 'proxyFetch').mockRejectedValue(new Error('Network offline'));

    const rates = await CurrencyService.fetchFiatRates(0);
    expect(rates.BRL).toBe(5.3);
    expect(rates.EUR).toBe(0.88);
    expect(rates.GBP).toBe(0.76);
    expect(CurrencyService.getUsdtRate()).toBe(0.998);

    expect(useSettingsStore.getState().fiatRatesStatus).toBe('cached');
  });

  it('uses Fallback Level 2 (static hardcoded defaults) when both network and cache are unavailable', async () => {
    CurrencyService.clearCache();
    localStorage.clear();
    vi.spyOn(proxyModule, 'proxyFetch').mockRejectedValue(new Error('Network offline'));

    const rates = await CurrencyService.fetchFiatRates(0);
    expect(rates.USD).toBe(1.0);
    expect(rates.BRL).toBe(DEFAULT_FIAT_RATES.BRL);
    expect(rates.EUR).toBe(DEFAULT_FIAT_RATES.EUR);
    expect(rates.GBP).toBe(DEFAULT_FIAT_RATES.GBP);
    expect(CurrencyService.getUsdtRate()).toBe(DEFAULT_USDT_RATE);

    expect(useSettingsStore.getState().fiatRatesStatus).toBe('fallback');
  });
});
