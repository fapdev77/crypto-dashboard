import React, { useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  Activity,
  Compass,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';
import { MarketAnalyticsHeader } from './MarketAnalyticsHeader';
import { FundingArbitrageWidget } from './FundingArbitrageWidget';
import { OpenInterestWidget } from './OpenInterestWidget';
import { TakerFlowCvdWidget } from './TakerFlowCvdWidget';
import { SmartMoneySentimentWidget } from './SmartMoneySentimentWidget';
import { SimulationModeBadge } from '../../ui/SimulationModeBadge';
import { useSymbolCatalogRefresh } from './useSymbolCatalogRefresh';
import { MarketBreakdownStrip } from './MarketBreakdownStrip';
import {
  PriceMetricTooltip,
  Volume24hTooltip,
  OpenInterestMetricTooltip,
  FundingRateMetricTooltip,
  MaxFundingSpreadTooltip,
  TakerFlowMetricTooltip,
  FearAndGreedTooltip,
} from './MarketAnalyticsTooltips';

export const MarketAnalyticsDashboard: React.FC = () => {
  const {
    snapshot,
    isLoading,
    error,
    pollingIntervalSeconds,
    refreshData,
  } = useMarketAnalyticsStore();

  // Keeps the exchange symbol registry fresh per the Settings interval
  useSymbolCatalogRefresh();

  // Initial load: BTC is always the default asset when entering Market Analytics
  useEffect(() => {
    useMarketAnalyticsStore.getState().setSelectedSymbol('BTC');
    refreshData(true);
  }, []);

  const formatCurrency = (val: number): string => {
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1_000_000_000) return `${sign}$${(absVal / 1_000_000_000).toFixed(2)}B`;
    if (absVal >= 1_000_000) return `${sign}$${(absVal / 1_000_000).toFixed(2)}M`;
    if (absVal >= 1_000) return `${sign}$${(absVal / 1_000).toFixed(1)}K`;
    return `${sign}$${absVal.toFixed(2)}`;
  };

  return (
    <div className="space-y-6 pb-12 max-w-[1600px] mx-auto">
      {/* Top Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#2F6BFF]" />
              Market Analytics
            </h1>
            <SimulationModeBadge />
          </div>
          <p className="text-xs text-[#8E9299] mt-0.5">
            Quantitative cross-exchange derivatives intelligence, open interest regimes, taker order flow & funding arbitrage across Bybit, OKX & Bitget.
          </p>
        </div>
      </div>

      {/* Global Filter Bar: Favorites, Markets, Exchanges, Timeframes */}
      <MarketAnalyticsHeader />

      {/* Error display if any */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3 text-xs text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => refreshData(true)}
            className="ml-auto underline hover:text-white font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Initial Skeleton Loader */}
      {!snapshot && isLoading && (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
          <Loader2 className="w-8 h-8 text-[#2F6BFF] animate-spin" />
          <p className="text-xs text-[#8E9299]">Loading market analytics snapshot...</p>
        </div>
      )}

      {snapshot && (
        <>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Price */}
            <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-3.5 space-y-1">
              <PriceMetricTooltip>
                <span className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block">
                  Index Price ({snapshot.symbol})
                </span>
              </PriceMetricTooltip>
              <div className="text-lg font-bold font-mono text-white">
                ${snapshot.currentPrice}
              </div>
              <div
                className={`text-xs font-semibold flex items-center gap-0.5 ${
                  snapshot.priceChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {snapshot.priceChange24h >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {snapshot.priceChange24h >= 0 ? '+' : ''}
                {snapshot.priceChange24h}%
              </div>
            </div>

            {/* 24h Volume */}
            <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-3.5 space-y-1">
              <Volume24hTooltip>
                <span className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block">
                  24h Notional Volume
                </span>
              </Volume24hTooltip>
              <div className="text-lg font-bold font-mono text-white">
                {formatCurrency(snapshot.totalVolume24hUsd)}
              </div>
              <span className="text-[11px] text-[#8E9299]">Aggregated Takers</span>
            </div>

            {/* Total Open Interest */}
            <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-3.5 space-y-1">
              <OpenInterestMetricTooltip>
                <span className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block">
                  Total Open Interest
                </span>
              </OpenInterestMetricTooltip>
              <div className="text-lg font-bold font-mono text-amber-400">
                {snapshot.marketTypes?.some((m) => m !== 'SPOT') === false
                  ? 'N/A (Spot)'
                  : formatCurrency(snapshot.totalOiUsd)}
              </div>
              <span
                className={`text-[11px] font-semibold ${
                  snapshot.oiChange24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                24h Δ: {snapshot.oiChange24hPercent >= 0 ? '+' : ''}
                {snapshot.oiChange24hPercent}%
              </span>
            </div>

            {/* Funding Spread */}
            <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-3.5 space-y-1">
              <MaxFundingSpreadTooltip>
                <span className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block">
                  Max Funding Spread
                </span>
              </MaxFundingSpreadTooltip>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {snapshot.marketTypes?.some((m) => m !== 'SPOT') === false || !snapshot.currentFunding
                  ? 'N/A'
                  : `+${snapshot.currentFunding.spreadApr}%`}
              </div>
              <span className="text-[11px] text-[#8E9299]">Annualized (APR)</span>
            </div>

            {/* CVD Momentum */}
            <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-3.5 space-y-1">
              <TakerFlowMetricTooltip>
                <span className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block">
                  Taker Flow (CVD)
                </span>
              </TakerFlowMetricTooltip>
              <div
                className={`text-lg font-bold font-mono ${
                  snapshot.takerFlowHistory[snapshot.takerFlowHistory.length - 1]?.cvd >= 0
                    ? 'text-cyan-400'
                    : 'text-rose-400'
                }`}
              >
                {formatCurrency(
                  snapshot.takerFlowHistory[snapshot.takerFlowHistory.length - 1]?.cvd || 0
                )}
              </div>
              <span className="text-[11px] text-[#8E9299]">Aggressive Net Flow</span>
            </div>

            {/* Fear & Greed */}
            <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-3.5 space-y-1">
              <FearAndGreedTooltip>
                <span className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block">
                  Sentiment Index
                </span>
              </FearAndGreedTooltip>
              <div className="text-lg font-bold font-mono text-purple-400">
                {snapshot.sentiment.greedFearScore}
                <span className="text-xs font-normal text-[#8E9299]">/100</span>
              </div>
              <span className="text-[11px] font-semibold text-purple-300">
                {snapshot.sentiment.greedFearLabel}
              </span>
            </div>
          </div>

          {/* Cross-Market Segregated Breakdown Strip */}
          <MarketBreakdownStrip />

          {/* 4 Core Quantitative Panels */}
          <div className="space-y-6">
            {/* Panel 1: Funding Arbitrage Matrix */}
            <FundingArbitrageWidget />

            {/* Panel 2: Open Interest & Market Regime */}
            <OpenInterestWidget />

            {/* Panel 3: Order Flow & CVD */}
            <TakerFlowCvdWidget />

            {/* Panel 4: Smart Money vs Retail Positioning */}
            <SmartMoneySentimentWidget />
          </div>
        </>
      )}
    </div>
  );
};

export default MarketAnalyticsDashboard;
