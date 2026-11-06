import { usePrivacy } from '../context/PrivacyContext';
import { formatValue, formatCrypto, formatPrice, formatCompactFiat } from '../utils/formatters';
import { useSettingsStore } from '../store/settingsStore';
import { SUPPORTED_FIAT_CURRENCIES, SUPPORTED_LOCALES, DEFAULT_FIAT_RATES } from '../services/currency/currencyTypes';
import Big from 'big.js';

/** Currency/mask type for formatting values via useFormatCurrency. */
export type CurrencyFormatType = 'usd' | 'fiat' | 'crypto' | 'price' | 'compact';

/**
 * Hook returning a formatCurrency function that respects the global privacy mode,
 * selected display fiat currency (USD, EUR, GBP, BRL) and regional locale formatting.
 *
 * @returns A format function with signature:
 *   (value, type = 'usd', decimalsOrSymbol?) => string
 */
export function useFormatCurrency() {
  const { isPrivateMode } = usePrivacy();
  const fiatCurrency = useSettingsStore(state => state.fiatCurrency) || 'USD';
  const locale = useSettingsStore(state => state.locale) || 'pt-BR';
  const fiatRates = useSettingsStore(state => state.fiatRates);

  const currencyConfig = SUPPORTED_FIAT_CURRENCIES[fiatCurrency] || SUPPORTED_FIAT_CURRENCIES.USD;
  const localeConfig = SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES['pt-BR'];
  const symbol = currencyConfig.symbol;
  const numberLocale = localeConfig.numberLocale;
  const currentRate = fiatRates?.[fiatCurrency] || DEFAULT_FIAT_RATES[fiatCurrency] || 1;

  const formatCurrency = (
    value: number | Big | undefined | null,
    type: CurrencyFormatType = 'usd',
    decimalsOrSymbol?: number | string
  ): string => {
    // If privacy mode is active, mask the numeric values with the active currency symbol
    if (isPrivateMode) {
      if (type === 'usd' || type === 'fiat' || type === 'compact') {
        return fiatCurrency === 'BRL' ? `${symbol} ••••` : `${symbol}••••`;
      }
      return '••••';
    }

    // Convert Big.js instances safely to numbers for the base formatters
    let numericValue: number | undefined | null = null;
    if (value !== undefined && value !== null) {
      if (value instanceof Big) {
        numericValue = Number(value);
      } else {
        numericValue = Number(value);
      }
    }

    // Safety fallback for non-numeric, null, or undefined values
    if (numericValue === null || numericValue === undefined || isNaN(numericValue)) {
      return type === 'crypto' ? '0.00000000' : '0.00';
    }

    // Delegate format operation based on format type
    switch (type) {
      case 'usd':
      case 'fiat': {
        // Convert from USD to selected fiat currency
        const converted = fiatCurrency === 'USD' ? numericValue : numericValue * currentRate;
        const decimals = typeof decimalsOrSymbol === 'number' ? decimalsOrSymbol : 2;
        const formatted = formatValue(Math.abs(converted), decimals, numberLocale);
        if (formatted === '--') return '--';

        const isNegative = converted < 0;
        const spacing = fiatCurrency === 'BRL' ? ' ' : '';
        return isNegative
          ? `-${symbol}${spacing}${formatted}`
          : `${symbol}${spacing}${formatted}`;
      }

      case 'crypto':
        return formatCrypto(numericValue, decimalsOrSymbol ?? 8, numberLocale);

      case 'price': {
        const isFiat = decimalsOrSymbol === undefined ? true : decimalsOrSymbol === 'true';
        return formatPrice(numericValue, isFiat, numberLocale);
      }

      case 'compact': {
        const converted = fiatCurrency === 'USD' ? numericValue : numericValue * currentRate;
        const decimals = typeof decimalsOrSymbol === 'number' ? decimalsOrSymbol : 2;
        const spacing = fiatCurrency === 'BRL' ? `${symbol} ` : symbol;
        return formatCompactFiat(converted, decimals, spacing, true);
      }

      default: {
        const converted = fiatCurrency === 'USD' ? numericValue : numericValue * currentRate;
        const formatted = formatValue(Math.abs(converted), 2, numberLocale);
        if (formatted === '--') return '--';
        const isNegative = converted < 0;
        const spacing = fiatCurrency === 'BRL' ? ' ' : '';
        return isNegative
          ? `-${symbol}${spacing}${formatted}`
          : `${symbol}${spacing}${formatted}`;
      }
    }
  };

  return formatCurrency;
}
