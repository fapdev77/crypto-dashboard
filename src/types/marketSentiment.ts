export type SentimentClassification = 
  | 'Extreme Fear'
  | 'Fear'
  | 'Neutral'
  | 'Greed'
  | 'Extreme Greed';

export interface FearAndGreedItem {
  value: number;
  valueClassification: SentimentClassification;
  timestamp: number; // Unix timestamp in seconds
  timeUntilUpdate?: number;
}

export interface MarketTrendSummary {
  regime: 'Bullish' | 'Bearish' | 'Neutral' | 'Consolidation';
  btcDominanceEstimate: number; // e.g., 54.5%
  volatilityIndex: 'Low' | 'Moderate' | 'High' | 'Extreme';
  fundingBias: 'Long Dominant' | 'Short Dominant' | 'Balanced';
  traderAdvice: {
    en: string;
    pt: string;
  };
}

export interface MarketSentimentData {
  currentIndex: FearAndGreedItem;
  historical: FearAndGreedItem[];
  trendSummary: MarketTrendSummary;
  change24h: number;
  change7d: number;
  lastUpdated: string;
}
