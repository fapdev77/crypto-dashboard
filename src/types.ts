export type ExchangeName = 'bybit' | 'bitget' | 'okx';

export type PositionSide = 'long' | 'short' | 'net';

export interface UnifiedPosition {
  id: string; // Ex: 'connId-okx-BTC-USDT-long'
  connectionId: string;
  exchange: ExchangeName;
  label: string; // Account label/name
  symbol: string;
  side: PositionSide;
  size: number; // For position size
  valueUsd?: number; // approx value
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  leverage: number;
  marginMode?: 'cross' | 'isolated';
  margin?: number; // Position Margin / Isolated Margin
  marginRatio?: number; // Tiered MMR or Margin Ratio (%)
  liquidationPrice?: number;
  breakEvenPrice?: number;
  roe?: number; // Return on Equity (%)
  tp?: number; // Take profit limit
  sl?: number; // Stop loss limit
  raw?: any; // To store the original broker data if needed
}

export interface UnifiedHistoryPosition {
  id: string;
  connectionId: string;
  exchange: ExchangeName;
  label: string;
  symbol: string;
  side: PositionSide;
  realizedPnl: number;
  closeTime: number; // timestamp
  entryPrice?: number;
  closePrice?: number;
  size?: number;
  raw?: any;
}

export function formatValue(val: number | undefined | null, decimals: number = 2): string {
  if (val === undefined || val === null || isNaN(val)) return '--';
  return val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
