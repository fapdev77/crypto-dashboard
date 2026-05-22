export function formatValue(val: number | undefined | null, decimals: number = 2): string {
  if (val === undefined || val === null || isNaN(val)) return '--';
  return val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCompactUSD(val: number, decimals = 2): string {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(decimals)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(decimals)}k`;
  return `$${val.toFixed(decimals)}`;
}
