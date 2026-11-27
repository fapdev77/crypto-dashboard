import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppTooltip } from '../../ui/Tooltip';

export const TooltipWrapper = ({ children, description, rows, align = 'center', side = 'top' }: any) => {
  return (
    <AppTooltip description={description} rows={rows} align={align} side={side}>
      <div className="cursor-help inline-block border-b border-dotted border-fg-muted/50 hover:text-fg transition-colors hover:border-fg/50">
        {children}
      </div>
    </AppTooltip>
  );
};

export const PriceMetricTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <TooltipWrapper
    description={t("analytics.market.tooltips.price", "Current global spot/perpetual price blended across top liquidity venues.")}
    rows={[
      { label: t("analytics.market.tooltipRows.formulaDelta", "Formula (Δ%)"), value: "((Current Price - 24h Price) / 24h Price) * 100", valueClassName: "font-mono text-[10px] text-fg-muted" }
    ]}
  >
    {children}
  </TooltipWrapper>
  );
};

export const Volume24hTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <TooltipWrapper
    description={t("analytics.market.tooltips.volume", "Aggregated notional volume traded over the last 24 hours across all monitored exchanges.")}
    rows={[
      { label: t("analytics.market.tooltipRows.formula", "Formula"), value: "Σ Volume(ex)", valueClassName: "font-mono text-[10px] text-fg-muted" }
    ]}
  >
    {children}
  </TooltipWrapper>
  );
};

export const OpenInterestMetricTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <TooltipWrapper
    description={t("analytics.market.tooltips.openInterest", "Total nominal value of all outstanding derivative contracts (futures and options) that have not been settled.")}
    rows={[
      { label: t("analytics.market.tooltipRows.formula", "Formula"), value: "Σ (Contracts * Price)", valueClassName: "font-mono text-[10px] text-fg-muted" },
      { label: t("analytics.market.tooltipRows.significance", "Significance"), value: t("analytics.market.tooltipRows.oiSignificanceVal", "Rising OI indicates new money entering the market, confirming trends.") }
    ]}
  >
    {children}
  </TooltipWrapper>
  );
};

export const FundingRateMetricTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <TooltipWrapper
    description={t("analytics.market.tooltips.fundingRate", "Weighted average funding rate across exchanges, indicating the cost of holding long vs short positions.")}
    rows={[
      { label: t("analytics.market.tooltipRows.formulaApr", "Formula (APR)"), value: "Funding Rate * 3 * 365 * 100", valueClassName: "font-mono text-[10px] text-fg-muted" },
      { label: t("analytics.market.tooltipRows.positive", "Positive"), value: t("analytics.market.tooltipRows.positiveVal", "Longs pay Shorts (Bullish consensus)") },
      { label: t("analytics.market.tooltipRows.negative", "Negative"), value: t("analytics.market.tooltipRows.negativeVal", "Shorts pay Longs (Bearish consensus)") }
    ]}
  >
    {children}
  </TooltipWrapper>
  );
};

export const MaxFundingSpreadTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <TooltipWrapper
    description={t("analytics.market.tooltips.spread", "The maximum annualized difference between the highest and lowest funding rates across tracked exchanges.")}
    rows={[
      { label: t("analytics.market.tooltipRows.strategy", "Strategy"), value: t("analytics.market.tooltipRows.strategyVal", "Cash & Carry / Delta Neutral") },
      { label: t("analytics.market.tooltipRows.formula", "Formula"), value: "Rate(Short) - Rate(Long)", valueClassName: "font-mono text-[10px] text-fg-muted" }
    ]}
  >
    {children}
  </TooltipWrapper>
  );
};

export const TakerFlowMetricTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <TooltipWrapper
    description={t("analytics.market.tooltips.cvd", "Cumulative Volume Delta (CVD) represents the net difference between aggressive (taker) buying and selling volumes.")}
    rows={[
      { label: t("analytics.market.tooltipRows.netDelta", "Net Delta"), value: t("analytics.market.tooltipRows.netDeltaVal", "Taker Buy Vol - Taker Sell Vol"), valueClassName: "font-mono text-[10px] text-fg-muted" },
      { label: t("analytics.market.tooltipRows.positiveCvd", "Positive CVD"), value: t("analytics.market.tooltipRows.positiveCvdVal", "Aggressive buying pressure") },
      { label: t("analytics.market.tooltipRows.negativeCvd", "Negative CVD"), value: t("analytics.market.tooltipRows.negativeCvdVal", "Aggressive selling pressure") }
    ]}
  >
    {children}
  </TooltipWrapper>
  );
};

export const PeriodTakerDeltaTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <TooltipWrapper
    description={t("analytics.market.tooltips.periodTakerDelta", "Total net delta of aggressive market orders (Taker Buy - Taker Sell) accumulated across all candles in the active chart period.")}
    rows={[
      { label: t("analytics.market.tooltipRows.formula", "Formula"), value: "Σ (Taker Buy - Taker Sell)", valueClassName: "font-mono text-[10px] text-fg-muted" },
      { label: t("analytics.market.tooltipRows.interpretation", "Interpretation"), value: t("analytics.market.tooltipRows.periodDeltaInterpVal", "Sum of taker aggression across the selected window") }
    ]}
  >
    {children}
  </TooltipWrapper>
  );
};

export const CvdNetBalanceTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <TooltipWrapper
    description={t("analytics.market.tooltips.cvdNetBalance", "Current Cumulative Volume Delta (CVD) value at the most recent candle, tracking cumulative aggressive order balance starting from the beginning of the period.")}
    rows={[
      { label: t("analytics.market.tooltipRows.formula", "Formula"), value: t("analytics.market.tooltipRows.cvdNetFormulaVal", "Running sum of candle deltas at t(latest)"), valueClassName: "font-mono text-[10px] text-fg-muted" },
      { label: t("analytics.market.tooltipRows.alignment", "Alignment"), value: t("analytics.market.tooltipRows.cvdNetAlignVal", "Matches the final data point of the blue CVD line on the chart") }
    ]}
  >
    {children}
  </TooltipWrapper>
  );
};

export const AssetSelectorTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <AppTooltip 
    description={t("analytics.market.tooltips.assetSelector", "Search and select the cryptocurrency to analyze across the market.")}
    rows={[
      { label: t("analytics.market.tooltipRows.action", "Action"), value: t("analytics.market.tooltipRows.assetActionVal", "Type to search (e.g. BTC, ETH)") }
    ]}
  >
    <div className="cursor-help transition-opacity hover:opacity-90">
      {children}
    </div>
  </AppTooltip>
  );
};

export const MarketTypeSelectorTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <AppTooltip 
    description={t("analytics.market.tooltips.marketTypeSelector", "Filter analytics by market type: Spot, Perpetual Futures, or Inverse Contracts.")}
    rows={[
      { label: t("analytics.market.header.spot", "Spot"), value: t("analytics.market.tooltipRows.spotVal", "Base assets only (No OI/Funding)") },
      { label: t("analytics.market.tooltipRows.perp", "Perp"), value: t("analytics.market.tooltipRows.perpVal", "USDT/USDC margined futures") },
      { label: t("analytics.market.header.inverse", "Inverse"), value: t("analytics.market.tooltipRows.inverseVal", "Coin-margined futures") }
    ]}
  >
    <div className="cursor-help transition-opacity hover:opacity-90">
      {children}
    </div>
  </AppTooltip>
  );
};

export const ExchangeSelectorTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <AppTooltip 
    description={t("analytics.market.tooltips.exchangeSelector", "Filter analytics to a specific exchange or view aggregated cross-exchange data.")}
    rows={[
      { label: t("analytics.market.tooltipRows.aggregated", "Aggregated"), value: t("analytics.market.tooltipRows.aggregatedVal", "Blends data from all venues") },
      { label: t("analytics.market.tooltipRows.specific", "Specific"), value: t("analytics.market.tooltipRows.specificVal", "Isolates flow to one venue") }
    ]}
  >
    <div className="cursor-help transition-opacity hover:opacity-90">
      {children}
    </div>
  </AppTooltip>
  );
};

export const TimeframeSelectorTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <AppTooltip 
    description={t("analytics.market.tooltips.timeframeSelector", "Select the time resolution for charts and historical calculations.")}
    rows={[
      { label: t("analytics.market.tooltipRows.shortTerm", "Short Term"), value: "5m, 15m, 30m, 1h" },
      { label: t("analytics.market.tooltipRows.swingMacro", "Swing/Macro"), value: "4h, 1d" }
    ]}
  >
    <div className="cursor-help transition-opacity hover:opacity-90">
      {children}
    </div>
  </AppTooltip>
  );
};

export const AutoRefreshTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <AppTooltip 
    description={t("analytics.market.tooltips.autoRefresh", "Time until the next automatic data synchronization with the server.")}
    rows={[
      { label: t("analytics.market.tooltipRows.action", "Action"), value: t("analytics.market.tooltipRows.refreshActionVal", "Click to refresh manually") },
      { label: t("analytics.market.tooltipRows.frequency", "Frequency"), value: t("analytics.market.tooltipRows.frequencyVal", "Every 60 seconds") }
    ]}
  >
    <div className="cursor-pointer transition-opacity hover:opacity-90">
      {children}
    </div>
  </AppTooltip>
  );
};

export const MarketRegimeTooltip: React.FC<{ regime: string, sentiment: string, description: string, children: React.ReactNode }> = ({ regime, sentiment, description, children }) => {
  const { t } = useTranslation();
  return (
    <AppTooltip
      description={description}
      rows={[
        { label: t("analytics.market.tooltipRows.regime", "Regime"), value: regime, valueClassName: "font-semibold text-fg" },
        { label: t("analytics.market.tooltipRows.sentiment", "Sentiment"), value: sentiment, valueClassName: "capitalize" },
        { label: t("analytics.market.tooltipRows.longBuild", "Long Build"), value: t("analytics.market.tooltipRows.longBuildVal", "Price ↑, OI ↑ (Strong Uptrend)") },
        { label: t("analytics.market.tooltipRows.shortBuild", "Short Build"), value: t("analytics.market.tooltipRows.shortBuildVal", "Price ↓, OI ↑ (Strong Downtrend)") },
        { label: t("analytics.market.tooltipRows.longUnwind", "Long Unwind"), value: t("analytics.market.tooltipRows.longUnwindVal", "Price ↓, OI ↓ (Bulls closing positions)") },
        { label: t("analytics.market.tooltipRows.shortCovering", "Short Covering"), value: t("analytics.market.tooltipRows.shortCoveringVal", "Price ↑, OI ↓ (Bears closing positions)") }
      ]}
    >
      <div className="cursor-help">
        {children}
      </div>
    </AppTooltip>
  );
};

export const CvdDivergenceTooltip: React.FC<{ type: string, desc: string, children: React.ReactNode }> = ({ type, desc, children }) => {
  const { t } = useTranslation();
  return (
  <AppTooltip
    description={desc}
    rows={[
      { label: t("analytics.market.tooltipRows.type", "Type"), value: type, valueClassName: "font-bold text-fg" },
      { label: t("analytics.market.tooltipRows.bullishDiv", "Bullish Divergence"), value: t("analytics.market.tooltipRows.bullishDivVal", "Price declining but CVD rising (Passive buying absorption)") },
      { label: t("analytics.market.tooltipRows.bearishDiv", "Bearish Divergence"), value: t("analytics.market.tooltipRows.bearishDivVal", "Price rising but CVD declining (Passive selling absorption)") }
    ]}
  >
    <div className="cursor-help">
      {children}
    </div>
  </AppTooltip>
  );
};

export const SentimentTitleTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <TooltipWrapper
    description={t("analytics.market.tooltips.sentimentTitle", "Compares the positioning of standard retail accounts against high-volume, high-winrate top traders (Smart Money).")}
    rows={[
      { label: t("analytics.market.tooltipRows.smartMoney", "Smart Money"), value: t("analytics.market.tooltipRows.smartMoneyVal", "Top 20% by Volume/Profit") },
      { label: t("analytics.market.tooltipRows.retail", "Retail"), value: t("analytics.market.tooltipRows.retailVal", "All other active accounts") }
    ]}
  >
    {children}
  </TooltipWrapper>
  );
};

export const FearAndGreedTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <TooltipWrapper 
    description={t("analytics.market.tooltips.fearGreed", "Crypto Fear & Greed Index, synthesized from momentum, volatility, and order flow metrics.")}
    rows={[
      { label: t("analytics.market.sentiment.extremeFear", "Extreme Fear"), value: "0 - 24", valueClassName: "text-danger font-mono" },
      { label: t("analytics.market.tooltipRows.fear", "Fear"), value: "25 - 44", valueClassName: "text-tone-amber font-mono" },
      { label: t("analytics.market.sentiment.neutral", "Neutral"), value: "45 - 55", valueClassName: "text-tone-yellow font-mono" },
      { label: t("analytics.market.tooltipRows.greed", "Greed"), value: "56 - 74", valueClassName: "text-success font-mono" },
      { label: t("analytics.market.sentiment.extremeGreed", "Extreme Greed"), value: "75 - 100", valueClassName: "text-tone-cyan font-mono" }
    ]}
  >
    {children}
  </TooltipWrapper>
  );
};

export const SentimentDivergenceTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <AppTooltip 
    description={t("analytics.market.tooltips.sentimentDivergence", "Alert triggered when Retail traders are heavily positioned in one direction (e.g., >65% Long) while Top Traders are positioned in the opposite direction.")}
  >
    <div className="cursor-help transition-opacity hover:opacity-90">
      {children}
    </div>
  </AppTooltip>
  );
};

export const RetailRatioTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <TooltipWrapper
    description={t("analytics.market.tooltips.retailRatio", "The long/short ratio calculated based on the absolute number of retail trader accounts holding open positions.")}
    rows={[
      { label: t("analytics.market.tooltipRows.weighting", "Weighting"), value: t("analytics.market.tooltipRows.byAccountCount", "By Account Count (Not Volume)") },
      { label: t("analytics.market.tooltipRows.usage", "Usage"), value: t("analytics.market.tooltipRows.contrarianVal", "Useful as a contrarian indicator") }
    ]}
  >
    {children}
  </TooltipWrapper>
  );
};

export const TopTraderRatioTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
  <TooltipWrapper
    description={t("analytics.market.tooltips.topTraderRatio", "The long/short ratio of elite traders, weighted by their open notional volume (position size).")}
    rows={[
      { label: t("analytics.market.tooltipRows.weighting", "Weighting"), value: t("analytics.market.tooltipRows.byNotionalVol", "By Notional Volume (USD)") },
      { label: t("analytics.market.tooltipRows.usage", "Usage"), value: t("analytics.market.tooltipRows.institutionalVal", "Useful for tracking institutional flow") }
    ]}
  >
    {children}
  </TooltipWrapper>
  );
};

