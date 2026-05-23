export type ExchangeName = 'bybit' | 'bitget' | 'okx';

export type PositionSide = 'long' | 'short' | 'net';

export interface UnifiedPosition {
  id: string; // Ex: 'connId-okx-BTC-USDT-long'
  connectionId: string;
  exchange: ExchangeName;
  label: string; // Account label/name
  symbol: string;
  ccy?: string; // Margin/PNL currency (e.g. USDT, BTC)
  side: PositionSide;
  size: number; // For position size
  valueUsd?: number; // approx value
  notionalUsd?: number; // True notional value from API
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
  ccy?: string;
  side: PositionSide;
  realizedPnl: number;
  closeTime: number; // timestamp
  entryPrice?: number;
  closePrice?: number;
  size?: number;
  fundingFee?: number;
  tradingFee?: number;
  raw?: any;
}

export type BillType = 'deposit' | 'withdrawal' | 'funding' | 'fee' | 'transfer' | 'other';

export interface UnifiedBillRecord {
  id: string;
  connectionId: string;
  exchange: ExchangeName;
  label: string;
  type: BillType;
  amount: number;
  ccy: string;
  timestamp: number;
  raw?: any;
}

