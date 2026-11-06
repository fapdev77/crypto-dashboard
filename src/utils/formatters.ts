import Big from 'big.js';
import { UnifiedAssetCategory } from '../types';

export function isStablecoin(ccy: string | undefined | null): boolean {
  if (!ccy) return false;
  const normalized = ccy.toUpperCase().trim();
  const knownStables = new Set([
    'USDT', 'USDC', 'USD', 'DAI', 'FDUSD', 'USDE', 'USDD',
    'BUSD', 'PYUSD', 'TUSD', 'USDP', 'EURT', 'GUSD', 'BRL', 'USDG'
  ]);
  if (knownStables.has(normalized)) return true;
  return false;
}

export function formatValue(
  val: number | undefined | null,
  decimalsOrSymbol: number | string = 2,
  locale: string = 'en-US'
): string {
  if (val === undefined || val === null || isNaN(val)) return '--';
  
  let decimals = 2;
  if (typeof decimalsOrSymbol === 'number') {
    decimals = decimalsOrSymbol;
  } else if (typeof decimalsOrSymbol === 'string') {
    decimals = isStablecoin(decimalsOrSymbol) ? 2 : 8;
  }
  
  let numericVal = val;
  if (Math.abs(numericVal) < Math.pow(10, -decimals) / 2) {
    numericVal = 0;
  }
  
  return numericVal.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCrypto(
  val: number | undefined | null,
  decimalsOrSymbol: number | string = 8,
  locale: string = 'en-US'
): string {
  if (val === undefined || val === null || isNaN(val)) return '--';
  
  let decimals = 8;
  let minDecimals = 2;
  if (typeof decimalsOrSymbol === 'string') {
    decimals = isStablecoin(decimalsOrSymbol) ? 2 : 8;
    minDecimals = decimals;
  } else if (typeof decimalsOrSymbol === 'number') {
    decimals = decimalsOrSymbol;
    minDecimals = decimalsOrSymbol <= 4 ? decimalsOrSymbol : 2;
  }

  let numericVal = val;
  if (Math.abs(numericVal) < Math.pow(10, -decimals) / 2) {
    numericVal = 0;
  }
  
  return numericVal.toLocaleString(locale, { minimumFractionDigits: minDecimals, maximumFractionDigits: decimals });
}

export function formatPrice(
  val: number | undefined | null,
  isFiatPair: boolean = true,
  locale: string = 'en-US'
): string {
  if (val === undefined || val === null || isNaN(val)) return '--';
  const absVal = Math.abs(val);
  if (absVal === 0) return '0.00';
  
  if (!isFiatPair) {
    return val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  }

  if (absVal < 0.001) return val.toLocaleString(locale, { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  if (absVal < 1) return val.toLocaleString(locale, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  if (absVal < 100) return val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCompactFiat(
  val: number,
  decimals = 2,
  symbol = '$',
  isPrefix = true
): string {
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  const prefix = isPrefix ? symbol : '';
  const suffix = !isPrefix ? ` ${symbol}` : '';
  
  if (absVal >= 1_000_000_000) return `${sign}${prefix}${(absVal / 1_000_000_000).toFixed(decimals)}B${suffix}`;
  if (absVal >= 1_000_000) return `${sign}${prefix}${(absVal / 1_000_000).toFixed(decimals)}M${suffix}`;
  if (absVal >= 1_000) return `${sign}${prefix}${(absVal / 1_000).toFixed(decimals)}k${suffix}`;
  return `${sign}${prefix}${absVal.toFixed(decimals)}${suffix}`;
}

export function formatCompactUSD(val: number, decimals = 2): string {
  return formatCompactFiat(val, decimals, '$', true);
}

/**
 * Formats an asset amount based on its category
 * Utilizing big.js to prevent precision issues for crypto amounts
 */
export function formatAssetAmount(val: number | string | undefined | null, category: UnifiedAssetCategory): string {
  if (val === undefined || val === null || val === '') return '--';
  try {
    const bigVal = new Big(val);
    if (category === 'STOCK') {
       return bigVal.toFixed(2);
    }
    // MAX 8 decimals for crypto, and strip trailing zeroes after decimal point
    return bigVal.toFixed(8).replace(/\.?0+$/, ''); 
  } catch {
    return '--';
  }
}

export * from './dateTimeHelper';

