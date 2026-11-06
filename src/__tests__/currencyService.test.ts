import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CurrencyService } from '../services/currency/CurrencyService';
import { DEFAULT_FIAT_RATES } from '../services/currency/currencyTypes';

describe('CurrencyService', () => {
  beforeEach(() => {
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
});
