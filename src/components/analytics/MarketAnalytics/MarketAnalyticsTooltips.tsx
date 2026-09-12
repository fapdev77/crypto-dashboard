import React from 'react';
import { AppTooltip } from '../../ui/Tooltip';

export const TooltipWrapper = ({ children, description, rows, align = 'center', side = 'top' }: any) => {
  return (
    <AppTooltip description={description} rows={rows} align={align} side={side}>
      <div className="cursor-help inline-block border-b border-dotted border-[#8E9299]/50 hover:text-white transition-colors hover:border-white/50">
        {children}
      </div>
    </AppTooltip>
  );
};

export const PriceMetricTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipWrapper
    description="Current global spot/perpetual price blended across top liquidity venues."
    rows={[
      { label: "Formula (Δ%)", value: "((Current Price - 24h Price) / 24h Price) * 100", valueClassName: "font-mono text-[10px] text-gray-400" }
    ]}
  >
    {children}
  </TooltipWrapper>
);

export const Volume24hTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipWrapper
    description="Aggregated notional volume traded over the last 24 hours across all monitored exchanges."
    rows={[
      { label: "Formula", value: "Σ Volume(ex)", valueClassName: "font-mono text-[10px] text-gray-400" }
    ]}
  >
    {children}
  </TooltipWrapper>
);

export const OpenInterestMetricTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipWrapper
    description="Total nominal value of all outstanding derivative contracts (futures and options) that have not been settled."
    rows={[
      { label: "Formula", value: "Σ (Contracts * Price)", valueClassName: "font-mono text-[10px] text-gray-400" },
      { label: "Significance", value: "Rising OI indicates new money entering the market, confirming trends." }
    ]}
  >
    {children}
  </TooltipWrapper>
);

export const FundingRateMetricTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipWrapper
    description="Weighted average funding rate across exchanges, indicating the cost of holding long vs short positions."
    rows={[
      { label: "Formula (APR)", value: "Funding Rate * 3 * 365 * 100", valueClassName: "font-mono text-[10px] text-gray-400" },
      { label: "Positive", value: "Longs pay Shorts (Bullish consensus)" },
      { label: "Negative", value: "Shorts pay Longs (Bearish consensus)" }
    ]}
  >
    {children}
  </TooltipWrapper>
);

export const MaxFundingSpreadTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipWrapper
    description="The maximum annualized difference between the highest and lowest funding rates across tracked exchanges."
    rows={[
      { label: "Strategy", value: "Cash & Carry / Delta Neutral" },
      { label: "Formula", value: "Rate(Short) - Rate(Long)", valueClassName: "font-mono text-[10px] text-gray-400" }
    ]}
  >
    {children}
  </TooltipWrapper>
);

export const TakerFlowMetricTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipWrapper
    description="Cumulative Volume Delta (CVD) represents the net difference between aggressive (taker) buying and selling volumes."
    rows={[
      { label: "Net Delta", value: "Taker Buy Vol - Taker Sell Vol", valueClassName: "font-mono text-[10px] text-gray-400" },
      { label: "Positive CVD", value: "Aggressive buying pressure" },
      { label: "Negative CVD", value: "Aggressive selling pressure" }
    ]}
  >
    {children}
  </TooltipWrapper>
);

export const AssetSelectorTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppTooltip 
    description="Search and select the cryptocurrency to analyze across the market."
    rows={[
      { label: "Action", value: "Type to search (e.g. BTC, ETH)" }
    ]}
  >
    <div className="cursor-help transition-opacity hover:opacity-90">
      {children}
    </div>
  </AppTooltip>
);

export const MarketTypeSelectorTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppTooltip 
    description="Filter analytics by market type: Spot, Perpetual Futures, or Inverse Contracts."
    rows={[
      { label: "Spot", value: "Base assets only (No OI/Funding)" },
      { label: "Perp", value: "USDT/USDC margined futures" },
      { label: "Inverse", value: "Coin-margined futures" }
    ]}
  >
    <div className="cursor-help transition-opacity hover:opacity-90">
      {children}
    </div>
  </AppTooltip>
);

export const ExchangeSelectorTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppTooltip 
    description="Filter analytics to a specific exchange or view aggregated cross-exchange data."
    rows={[
      { label: "Aggregated", value: "Blends data from all venues" },
      { label: "Specific", value: "Isolates flow to one venue" }
    ]}
  >
    <div className="cursor-help transition-opacity hover:opacity-90">
      {children}
    </div>
  </AppTooltip>
);

export const TimeframeSelectorTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppTooltip 
    description="Select the time resolution for charts and historical calculations."
    rows={[
      { label: "Short Term", value: "5m, 15m, 30m, 1h" },
      { label: "Swing/Macro", value: "4h, 1d" }
    ]}
  >
    <div className="cursor-help transition-opacity hover:opacity-90">
      {children}
    </div>
  </AppTooltip>
);

export const AutoRefreshTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppTooltip 
    description="Time until the next automatic data synchronization with the server."
    rows={[
      { label: "Action", value: "Click to refresh manually" },
      { label: "Frequency", value: "Every 60 seconds" }
    ]}
  >
    <div className="cursor-pointer transition-opacity hover:opacity-90">
      {children}
    </div>
  </AppTooltip>
);

export const MarketRegimeTooltip: React.FC<{ regime: string, sentiment: string, description: string, children: React.ReactNode }> = ({ regime, sentiment, description, children }) => {
  return (
    <AppTooltip
      description={description}
      rows={[
        { label: "Regime", value: regime, valueClassName: "font-semibold text-white" },
        { label: "Sentiment", value: sentiment, valueClassName: "capitalize" },
        { label: "Long Build", value: "Price ↑, OI ↑ (Strong Uptrend)" },
        { label: "Short Build", value: "Price ↓, OI ↑ (Strong Downtrend)" },
        { label: "Long Unwind", value: "Price ↓, OI ↓ (Bulls closing positions)" },
        { label: "Short Covering", value: "Price ↑, OI ↓ (Bears closing positions)" }
      ]}
    >
      <div className="cursor-help">
        {children}
      </div>
    </AppTooltip>
  );
};

export const CvdDivergenceTooltip: React.FC<{ type: string, desc: string, children: React.ReactNode }> = ({ type, desc, children }) => (
  <AppTooltip
    description={desc}
    rows={[
      { label: "Type", value: type, valueClassName: "font-bold text-white" },
      { label: "Bullish Divergence", value: "Price declining but CVD rising (Passive buying absorption)" },
      { label: "Bearish Divergence", value: "Price rising but CVD declining (Passive selling absorption)" }
    ]}
  >
    <div className="cursor-help">
      {children}
    </div>
  </AppTooltip>
);

export const SentimentTitleTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipWrapper
    description="Compares the positioning of standard retail accounts against high-volume, high-winrate top traders (Smart Money)."
    rows={[
      { label: "Smart Money", value: "Top 20% by Volume/Profit" },
      { label: "Retail", value: "All other active accounts" }
    ]}
  >
    {children}
  </TooltipWrapper>
);

export const FearAndGreedTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipWrapper 
    description="Crypto Fear & Greed Index, synthesized from momentum, volatility, and order flow metrics."
    rows={[
      { label: "Extreme Fear", value: "0 - 24", valueClassName: "text-rose-400 font-mono" },
      { label: "Fear", value: "25 - 44", valueClassName: "text-amber-400 font-mono" },
      { label: "Neutral", value: "45 - 55", valueClassName: "text-yellow-400 font-mono" },
      { label: "Greed", value: "56 - 74", valueClassName: "text-emerald-400 font-mono" },
      { label: "Extreme Greed", value: "75 - 100", valueClassName: "text-cyan-400 font-mono" }
    ]}
  >
    {children}
  </TooltipWrapper>
);

export const SentimentDivergenceTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppTooltip 
    description="Alert triggered when Retail traders are heavily positioned in one direction (e.g., >65% Long) while Top Traders are positioned in the opposite direction."
  >
    <div className="cursor-help transition-opacity hover:opacity-90">
      {children}
    </div>
  </AppTooltip>
);

export const RetailRatioTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipWrapper
    description="The long/short ratio calculated based on the absolute number of retail trader accounts holding open positions."
    rows={[
      { label: "Weighting", value: "By Account Count (Not Volume)" },
      { label: "Usage", value: "Useful as a contrarian indicator" }
    ]}
  >
    {children}
  </TooltipWrapper>
);

export const TopTraderRatioTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipWrapper
    description="The long/short ratio of elite traders, weighted by their open notional volume (position size)."
    rows={[
      { label: "Weighting", value: "By Notional Volume (USD)" },
      { label: "Usage", value: "Useful for tracking institutional flow" }
    ]}
  >
    {children}
  </TooltipWrapper>
);

