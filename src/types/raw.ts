/**
 * Raw exchange API response types (superset approach).
 *
 * These types represent the raw data returned by each exchange's API before
 * normalization. They contain ALL fields that are actually accessed across the
 * codebase, regardless of which exchange returns them. Fields are optional so
 * that accessing a field that only exists on one exchange is safe without
 * manual type narrowing.
 */

// ──────────────────────────────────────────────
//  Raw Position (open) — unified across exchanges
// ──────────────────────────────────────────────
export interface RawPositionData {
  // Common
  symbol?: string;
  instId?: string;
  side?: string;
  holdSide?: string;
  posSide?: string;
  size?: string;
  total?: string;
  leverage?: string;
  lever?: string;
  marginMode?: string;
  mgnMode?: string;
  margin?: string;
  markPrice?: string;
  markPx?: string;
  entryPrice?: string;
  avgPrice?: string;
  avgPx?: string;
  openPriceAvg?: string;
  liquidationPrice?: string;
  liqPx?: string;
  breakEvenPrice?: string;
  takeProfit?: string;
  stopLoss?: string;
  roe?: string;

  // PnL / Fees
  unrealizedPL?: string;
  unrealisedPnl?: string;
  upl?: string;
  uplRatio?: string;
  achievedProfits?: string;
  realizedPnl?: string;
  curRealisedPnl?: string;
  pnl?: string;
  totalFee?: string;
  deductedFee?: string;
  fundingFee?: string;

  // Margin
  marginSize?: string;
  marginCoin?: string;
  keepMarginRate?: string;
  positionIM?: string;
  positionIMByMp?: string;
  positionMM?: string;
  positionMMByMp?: string;
  imr?: string;
  mmr?: string;
  mgnRatio?: string;
  tradeMode?: string;
  positionIdx?: string;

  // Instrument
  category?: string;
  productType?: string;
  instType?: string;
  positionValue?: string;
  notionalUsd?: string;
  pos?: string;
  ccy?: string;
  coin?: string;
  settleCoin?: string;

  // Metadata
  createdTime?: string;
  posId?: string;
  positionId?: string;
  fee?: string;
  mockData?: boolean;
}

// ──────────────────────────────────────────────
//  Raw History Position — superset across exchanges
// ──────────────────────────────────────────────
export interface RawHistoryPositionData {
  // Common
  symbol?: string;
  instId?: string;
  side?: string;
  holdSide?: string;
  posSide?: string;
  direction?: string;
  leverage?: string;
  lever?: string;
  marginMode?: string;
  mgnMode?: string;
  roi?: string;
  mockData?: boolean;

  // PnL
  realizedPnl?: string;
  pnl?: string;
  netProfit?: string;
  achievedProfits?: string;
  closedPnl?: string;
  closedPnlId?: string;

  // Prices
  avgEntryPrice?: string;
  avgExitPrice?: string;
  openAvgPrice?: string;
  openPriceAvg?: string;
  closeAvgPrice?: string;
  closePriceAvg?: string;
  openAvgPx?: string;
  avgPx?: string;
  closeAvgPx?: string;

  // Sizes / values
  closedSize?: string;
  cumEntryValue?: string;
  closeTotalPos?: string;
  openTotalPos?: string;
  closeVol?: string;
  size?: string;

  // Fees
  fundingFee?: string;
  execFee?: string;
  totalFunding?: string;
  openFee?: string;
  closeFee?: string;
  fee?: string;

  // Timestamps / IDs
  orderId?: string;
  posId?: string;
  positionId?: string;
  cTime?: string;
  uTime?: string;
  createdTime?: string;
  updatedTime?: string;

  // Instrument
  category?: string;
  productType?: string;
  instType?: string;
  marginCoin?: string;
  coin?: string;
  settleCoin?: string;
  ccy?: string;
}

// ──────────────────────────────────────────────
//  Raw Order — superset across exchanges
// ──────────────────────────────────────────────
export interface RawOrderData {
  // IDs
  orderId?: string;
  ordId?: string;

  // Symbol / category
  symbol?: string;
  instId?: string;
  category?: string;
  instType?: string;
  productType?: string;

  // State / type
  state?: string;
  status?: string;
  orderStatus?: string;
  orderType?: string;
  ordType?: string;
  planType?: string;
  stopOrderType?: string;

  // Side / position
  side?: string;
  posSide?: string;
  positionIdx?: string;

  // Price
  price?: string;
  px?: string;
  priceAvg?: string;
  avgPrice?: string;
  avgPx?: string;

  // Quantity
  qty?: string;
  size?: string;
  sz?: string;
  cumExecQty?: string;
  filledQty?: string;
  baseVolume?: string;
  accFillSz?: string;
  cumExecValue?: string;
  quoteVolume?: string;

  // Trigger / TIF
  triggerPrice?: string;
  tpTriggerPx?: string;
  slTriggerPx?: string;
  reduceOnly?: boolean | string;
  timeInForce?: string;
  force?: string;
  notionalUsd?: string;

  // Timestamps
  cTime?: string;
  uTime?: string;
  createdTime?: string;
  updatedTime?: string;

  // Fees / leverage
  cumExecFee?: string;
  deductedFee?: string;
  fee?: string;
  leverage?: string;
  lever?: string;
  marginMode?: string;
  ccy?: string;
}

// ──────────────────────────────────────────────
//  Raw Balance item (per-coin) — superset
// ──────────────────────────────────────────────
export interface RawBalanceItem {
  coin?: string;
  symbol?: string;
  ccy?: string;
  walletBalance?: string;
  equity?: string;
  usdValue?: string;
  available?: string;
  frozen?: string;
  amount?: string;
  usdtEquity?: string;
  accountEquity?: string;
  crossedMaxAvailable?: string;
  marginCoin?: string;
  unrealizedPL?: string;
  cashBal?: string;
  eqUsd?: string;
}

// ──────────────────────────────────────────────
//  Raw Bill record — superset
// ──────────────────────────────────────────────
export interface RawBillData {
  txID?: string;
  withdrawId?: string;
  depositId?: string;
  depId?: string;
  wdId?: string;
  txId?: string;
  orderId?: string;
  id?: string;
  amount?: string;
  size?: string;
  amt?: string;
  coin?: string;
  ccy?: string;
  successAt?: string;
  updateTime?: string;
  cTime?: string;
  uTime?: string;
  ts?: string;
}
