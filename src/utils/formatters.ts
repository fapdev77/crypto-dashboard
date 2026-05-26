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
  
  return val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCrypto(val: number | undefined | null, decimalsOrSymbol: number | string = 8): string {
  if (val === undefined || val === null || isNaN(val)) return '--';
  
  if (typeof decimalsOrSymbol === 'string') {
    const decimals = isStablecoin(decimalsOrSymbol) ? 2 : 8;
    return val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  
  return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimalsOrSymbol });
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
