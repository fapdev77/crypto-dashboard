import { usePrivacy } from '../context/PrivacyContext';
import { formatValue, formatCrypto, formatPrice, formatCompactUSD } from '../utils/formatters';
import Big from 'big.js';

export type CurrencyFormatType = 'usd' | 'crypto' | 'price' | 'compact';

export function useFormatCurrency() {
  const { isPrivateMode } = usePrivacy();

  const formatCurrency = (
    value: number | Big | undefined | null,
    type: CurrencyFormatType = 'usd',
    decimalsOrSymbol?: number | string
  ): string => {
    // If privacy mode is active, mask the numeric values
    if (isPrivateMode) {
      if (type === 'usd' || type === 'compact') {
        // Keeps the currency symbol visible as per user's preference
        return '$••••';
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

    // Delegate format operation to pre-existing formatters
    switch (type) {
      case 'usd': {
        const formatted = formatValue(numericValue, decimalsOrSymbol ?? 2);
        if (formatted === '--') return '--';
        if (numericValue < 0) {
          return `-$${formatted.slice(1)}`;
        }
        return `$${formatted}`;
      }
      case 'crypto':
        return formatCrypto(numericValue, decimalsOrSymbol ?? 8);
      case 'price': {
        const isFiat = decimalsOrSymbol === undefined ? true : decimalsOrSymbol === 'true';
        return formatPrice(numericValue, isFiat);
      }
      case 'compact':
        return formatCompactUSD(numericValue, typeof decimalsOrSymbol === 'number' ? decimalsOrSymbol : 2);
      default: {
        const formatted = formatValue(numericValue, 2);
        if (formatted === '--') return '--';
        if (numericValue < 0) {
          return `-$${formatted.slice(1)}`;
        }
        return `$${formatted}`;
      }
    }
  };

  return formatCurrency;
}
