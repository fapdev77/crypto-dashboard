export type SpecificMarketType = 'PERP' | 'INVERSE' | 'SPOT';

export type MarketType = 'ALL' | SpecificMarketType;

export type ExchangeId = 'bybit' | 'okx' | 'bitget';

/**
 * Underlying asset class derived from exchange instrument metadata.
 * `STOCK` includes xStocks/TradFi equities, `COMMODITY`/`METAL` cover Bybit & Bitget TradFi listings.
 */
export type AssetKind = 'CRYPTO' | 'STOCK' | 'COMMODITY' | 'METAL' | 'OTHER';

/** A single tradable base asset as listed by an exchange for a given market type. */
export interface SymbolEntry {
  symbol: string; // base asset, e.g. 'BTC'
  name: string;   // display name, e.g. 'Bitcoin'
  kind: AssetKind;
}

export type MarketTimeframe = '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export type PollingIntervalSeconds = 5 | 10 | 15 | 30 | 60 | 0;

export interface FundingRateEntry {
  exchange: ExchangeId;
  rate8h: number;
  rateApr: number;
  predictedRate8h?: number;
  nextFundingTime: number;
}

export interface FundingArbitrageItem {
  symbol: string;
  bybitRate: number | null;
  okxRate: number | null;
  bitgetRate: number | null;
  predictedOkxRate?: number | null;
  spread: number;
  spreadApr: number;
  bestLongExchange: ExchangeId | null;
  bestShortExchange: ExchangeId | null;
  nextFundingCountdown: number; // in milliseconds
  marketType: 'PERP' | 'INVERSE';
}

export interface OpenInterestDataPoint {
  timestamp: number;
  timeLabel: string;
  price: number;
  totalOiUsd: number;
  bybitOiUsd: number;
  okxOiUsd: number;
  bitgetOiUsd: number;
  oiChangePercent: number;
}

export type RegimeType =
  | 'LONG_ACCUMULATION'
  | 'SHORT_SQUEEZE'
  | 'AGGRESSIVE_SHORTING'
  | 'LONG_LIQUIDATION'
  | 'NEUTRAL_CONSOLIDATION';

export interface MarketRegime {
  type: RegimeType;
  title: string;
  description: string;
  sentiment: 'bullish' | 'bearish' | 'warning' | 'neutral';
  priceChange24h: number;
  oiChange24h: number;
}

export interface TakerFlowDataPoint {
  timestamp: number;
  timeLabel: string;
  buyVol: number;
  sellVol: number;
  netDelta: number;
  cvd: number;
}

export interface SmartMoneySentiment {
  symbol: string;
  retailLongRatio: number; // 0 to 100
  retailShortRatio: number; // 0 to 100
  topTraderLongRatio: number; // 0 to 100
  topTraderShortRatio: number; // 0 to 100
  divergenceDetected: boolean;
  divergenceMessage: string;
  greedFearScore: number; // 0 to 100
  greedFearLabel: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
}

export interface MarketBreakdownEntry {
  exchange: ExchangeId;
  market: SpecificMarketType;
  price: number;
  volume24hUsd: number;
  oiUsd: number | null; // null for SPOT
  fundingRate: number | null; // null for SPOT
  fundingApr: number | null; // null for SPOT
  cvd: number;
}

export interface MarketAnalyticsSnapshot {
  symbol: string;
  marketType: MarketType;
  marketTypes: SpecificMarketType[];
  currentPrice: number;
  priceChange24h: number;
  totalVolume24hUsd: number;
  totalOiUsd: number;
  oiChange1hPercent: number;
  oiChange24hPercent: number;
  oiBreakdown: {
    bybit: number;
    okx: number;
    bitget: number;
  };
  breakdown: MarketBreakdownEntry[];
  oiHistory: OpenInterestDataPoint[];
  takerFlowHistory: TakerFlowDataPoint[];
  fundingArbitrage: FundingArbitrageItem[];
  currentFunding: FundingArbitrageItem | null;
  regime: MarketRegime;
  sentiment: SmartMoneySentiment;
  lastUpdated: number;
}

// ── Inverse / Coin-M Market Dashboard Interfaces ──────────────────
export interface InverseAssetExchangeMetric {
  exchange: ExchangeId;              // 'bybit' | 'okx' | 'bitget'
  pairSymbol: string;                // 'BTCUSD', 'BTC-USD-SWAP', 'BTCUSD_CM'
  price: number;
  price24hPcnt: number;              // 24h percentage change (e.g. 2.45)
  high24h: number;                   // 24h high price
  low24h: number;                    // 24h low price
  volume24hCoin: number;             // 24h volume in base coin (e.g. BTC)
  volume24hUsd: number;              // 24h volume in USD notional
  openInterestUsd: number | null;    // OI in USD
  openInterestCoin: number | null;   // OI in base coin
  nextFundingRate: number | null;    // Next funding rate (decimal e.g. 0.0001)
  nextFundingTime: number | null;    // Next settlement timestamp ms
  fundingApr: number | null;         // Annualized funding APR (e.g. 10.95%)
  todaySum: number | null;           // Cumulative rate paid today UTC civil day
  currentMonthSum: number | null;    // Cumulative rate current calendar month
  last3MonthsSum: number | null;     // Cumulative rate past 3 completed months
}

export interface InverseAssetAggregated {
  symbol: string;                    // Base asset 'BTC', 'ETH', 'SOL', etc.
  name: string;                      // Display name 'Bitcoin', 'Ethereum', etc.
  activeExchanges: ExchangeId[];     // Exchanges where Coin-M contract exists
  price: number;                     // Average/primary benchmark price
  price24hPcnt: number;              // Average 24h percent change
  high24h: number;                   // Aggregated 24h high
  low24h: number;                    // Aggregated 24h low
  totalVolumeCoin: number;           // Total 24h volume in base coin
  totalVolumeUsd: number;            // Total 24h volume in USD
  totalOiUsd: number;                // Total Open Interest in USD
  estimatedCvdUsd: number;           // Estimated CVD (Buyer Volume - Seller Volume)
  estimatedBuyerRatio: number;       // Estimated buyer volume ratio (0 to 100)
  nextFundingRate: number | null;    // Aggregated next funding rate
  nextFundingCountdown: number;      // Seconds until next funding settlement
  todaySum: number | null;           // Aggregated rate today UTC
  currentMonthSum: number | null;    // Aggregated current month
  last3MonthsSum: number | null;     // Aggregated last 3 months
  maxFundingSpreadApr: number | null;// Max spread between highest and lowest exchange APR
  bestLongExchange: ExchangeId | null;
  bestShortExchange: ExchangeId | null;
  exchanges: Record<ExchangeId, InverseAssetExchangeMetric | null>;
}

