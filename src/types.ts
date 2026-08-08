import Big from 'big.js';
import {
  RawPositionData,
  RawHistoryPositionData,
  RawOrderData,
  RawBalanceItem,
  RawBillData
} from './types/raw';

// Types
export type ExchangeName = 'bybit' | 'bitget' | 'okx';
export type PositionSide = 'long' | 'short' | 'net';
export type UnifiedMarginMode = 'cross' | 'isolated' | 'unknown';
export type UnifiedPositionMode = 'hedge' | 'one_way' | 'unknown';
export type UnifiedInstrumentType = 'SPOT' | 'PERP' | 'INVERSE' | 'FUTURES' | 'OPTION' | 'UNKNOWN';
export type UnifiedAssetCategory = 'CRYPTO' | 'STOCK' | 'UNKNOWN';
export type UnifiedOrderStatus = 'NEW' | 'FILLED' | 'CANCELLED' | 'PARTIALLY_FILLED' | 'UNTRIGGERED' | 'TRIGGERED' | 'REJECTED';
export type UnifiedOrderType = 'LIMIT' | 'MARKET' | 'TP' | 'SL' | 'CONDITIONAL';
export type BillType = 'deposit' | 'withdrawal' | 'funding' | 'fee' | 'transfer' | 'other';

// Interfaces
export interface UnifiedBalance {
  id: string; // e.g., 'connId-ccy'
  connectionId: string;
  exchange: ExchangeName;
  label: string;
  ccy: string;
  amount: number;
  usdValue: number;
  totalEquity?: number;
  walletBalance?: number;
  availableMargin?: number;
  unrealizedPnl?: number;
  raw?: RawBalanceItem;
}

export interface UnifiedOrder {
  id: string;
  exchangeOrderId: string;
  connectionId: string;
  exchange: ExchangeName;
  label?: string;
  symbol: string;
  category: UnifiedInstrumentType | string;
  side: 'buy' | 'sell';
  positionSide?: PositionSide;
  type: UnifiedOrderType;
  status: UnifiedOrderStatus;
  price: number;
  avgPrice: number;
  qty: number;
  filledQty: number;
  value?: number;
  triggerPrice?: number;
  reduceOnly?: boolean;
  timeInForce?: string;
  createdTime: number;
  updatedTime: number;
  fees?: number;
  leverage?: number;
  marginMode?: UnifiedMarginMode;
  raw?: RawOrderData;
}

export interface UnifiedPosition {
  id: string; // Ex: 'connId-okx-BTC-USDT-long'
  connectionId: string;
  exchange: ExchangeName;
  label: string; // Account label/name
  symbol: string;
  baseCoin: string; // E.g., 'BTC'
  quoteCoin: string; // E.g., 'USDT'
  ccy?: string; // Margin/PNL currency (e.g. USDT, BTC)
  side: PositionSide;
  size: number; // For position size
  notionalUsd?: number; // True notional value from API
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  closedPnl?: number;
  leverage: number;
  marginMode?: UnifiedMarginMode;
  positionMode?: UnifiedPositionMode;
  margin?: number; // Position Margin / Isolated Margin
  maintenanceMargin?: number; // Maintenance Margin value (calculated or fetched directly)
  marginRatio?: number; // Tiered MMR or Margin Ratio (%)
  liquidationPrice?: number;
  breakEvenPrice?: number;
  roe?: number; // Return on Equity (%)
  tp?: number; // Take profit limit
  sl?: number; // Stop loss limit
  instrumentType?: UnifiedInstrumentType;
  accumulatedFunding?: string;
  accumulatedTradingFee?: string;
  raw?: RawPositionData;
}

export interface UnifiedHistoryPosition {
  id: string;
  connectionId: string;
  exchange: ExchangeName;
  label: string;
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  ccy?: string;
  side: PositionSide;
  realizedPnl: number;
  closedPnl?: number;
  closeUpdateTime: number; // timestamp
  createdTime?: number; // open time timestamp
  entryPrice?: number;
  closePrice?: number;
  size?: number;
  fundingFee?: number;
  tradingFee?: number;
  leverage?: number;
  marginMode?: UnifiedMarginMode;
  positionMode?: UnifiedPositionMode;
  notionalUsd?: number;
  roi?: number;
  instrumentType?: UnifiedInstrumentType;
  raw?: RawHistoryPositionData;
}

export interface UnifiedBillRecord {
  id: string;
  connectionId: string;
  exchange: ExchangeName;
  label: string;
  type: BillType;
  amount: number;
  ccy: string;
  timestamp: number;
  raw?: RawBillData;
}

export interface SymbolPnLRecord {
  symbol: string;
  instrument: string;
  ccy: string;
  totalPnL: Big;
  longPnL: Big;
  shortPnL: Big;
  exchange: ExchangeName;
  lastActivity: number;
}

// ── Bybit Transaction Log ──

export interface FundingFeeAggregated {
  exchange: ExchangeName;
  symbol: string;
  instrumentType: 'USDT-M' | 'COIN-M';
  currentPrice?: number;
  nextFundingRate?: number;
  nextFundingTime?: number;
  lastFundingRate?: number;
  todaySum: number;
  currentMonthSum: number;
  lastMonthSum: number;
  last3MonthsSum: number;
  last6MonthsSum?: number;
  yearSum?: number;
}

export interface FundingRateSummary {
  id: string;                      // `${exchange}-${symbol}`
  exchange: ExchangeName;
  symbol: string;
  instrumentType: 'USDT-M' | 'COIN-M';
  last12MonthsFundingRate?: string; // Big.js toFixed(8) — optional, only populated by Bybit (400d coverage)
  last6MonthsFundingRate?: string;  // Big.js toFixed(8) — optional, only populated by Bybit (400d coverage)
  last3MonthsFundingRate: string;   // Big.js toFixed(8)
  lastMonthFundingRate: string;     // Big.js toFixed(8)
  currentMonthFundingRate: string;  // Big.js toFixed(8)
  todayFundingRate: string;         // Big.js toFixed(8)
  lastFundingRate: string;          // Rate of most recent settlement
  lastFundingTime: string;          // ms timestamp of most recent settlement, as string
  updatedAt: number;                // ms timestamp
}

export interface BybitTransactionLogEntry {
  // Primary key = `${connectionId}-${rawId}-${transactionTime}`
  id: string;
  connectionId: string;
  exchange: 'bybit';
  label: string; // ApiKey Label 

  // Raw data preserved from Bybit
  rawId: string;
  symbol: string;
  category: string;        // linear, inverse, spot, option
  side: 'Buy' | 'Sell' | 'None';
  transactionTime: number; // ms timestamp
  type: string;            // TRADE, SETTLEMENT, DELIVERY, LIQUIDATION, BONUS, TRANSFER, etc.
  transSubType: string;
  qty: string;
  size: string;
  currency: string;
  tradePrice: string;
  funding: string;
  fee: string;
  cashFlow: string;
  change: string;          // change = cashFlow + funding - fee
  cashBalance: string;
  feeRate: string;
  bonusChange: string;
  tradeId: string;
  orderId: string;
  orderLinkId: string;

  raw: Record<string, unknown>;
}

export interface FundingMeta {
  id: string; // 'exchange-symbol'
  exchange: ExchangeName;
  symbol: string;
  oldestTimestamp: number;
  latestTimestamp: number;
  recordCount?: number;
  updatedAt: number;
}

