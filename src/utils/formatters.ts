import Big from 'big.js';
import { UnifiedAssetCategory } from '../types';

export function isStablecoin(ccy: string | undefined | null): boolean {
  if (!ccy) return false;
  const normalized = ccy.toUpperCase();
  return ['USDT', 'USDC', 'USDG', 'USD', 'BRL'].some(stable => normalized.includes(stable));
}

export function formatValue(val: number | undefined | null, decimalsOrSymbol: number | string = 2): string {
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
  
  return numericVal.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCrypto(val: number | undefined | null, decimalsOrSymbol: number | string = 8): string {
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
  
  return numericVal.toLocaleString('en-US', { minimumFractionDigits: minDecimals, maximumFractionDigits: decimals });
}

export function formatPrice(val: number | undefined | null, isFiatPair: boolean = true): string {
  if (val === undefined || val === null || isNaN(val)) return '--';
  const absVal = Math.abs(val);
  if (absVal === 0) return '0.00';
  
  if (!isFiatPair) {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  }

  if (absVal < 0.001) return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  if (absVal < 1) return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  if (absVal < 100) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCompactUSD(val: number, decimals = 2): string {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(decimals)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(decimals)}k`;
  return `$${val.toFixed(decimals)}`;
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

