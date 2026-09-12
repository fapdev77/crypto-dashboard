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
