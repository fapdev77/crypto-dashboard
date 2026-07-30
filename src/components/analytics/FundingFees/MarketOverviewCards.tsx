import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Activity,
  Flame, Snowflake, Layers, ChevronDown, ChevronRight, Loader2
} from 'lucide-react';
import { MarketMetrics, Rankings } from '../../../hooks/useKpiMetrics';
import { KpiRankingList } from './KpiRankingList';
import { AppTooltip } from '../../ui/Tooltip';

interface MarketOverviewCardsProps {
  marketMetrics: MarketMetrics;
  rankings: Rankings;
  className?: string;
  isSyncing?: boolean;
}

const formatPercent = (val: number): string => val.toFixed(4) + '%';
const formatPercentShort = (val: number): string => val.toFixed(1) + '%';

const STORAGE_KEY = 'fundingDashboard_marketOverviewExpanded';

export const MarketOverviewCards = ({
  marketMetrics,
  rankings,
  className = '',
  isSyncing = false,
}: MarketOverviewCardsProps) => {
  const [expanded, setExpanded] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(expanded));
  }, [expanded]);

  if (marketMetrics.totalSymbols === 0) return null;

  return (
    <div className={`bg-[#151619] border border-[#2a2b30] rounded-xl ${className}`}>
      {/* ── Toggle Header ── */}
      <div
        className="relative flex items-center justify-between px-6 py-3 cursor-pointer bg-[#1A1C20] hover:bg-[#202226] transition-colors select-none overflow-hidden"
        onClick={() => setExpanded(prev => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(prev => !prev); } }}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse Market Overview' : 'Expand Market Overview'}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[#8E9299]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#8E9299]" />
          )}
          <h3 className="text-sm font-semibold text-white">Market Overview</h3>
          <span className="text-xs text-[#8E9299] font-normal">
            ({marketMetrics.totalSymbols} symbols · {rankings.topPayers.length} top / {rankings.bottomPayers.length} bottom)
          </span>
        </div>

        {isSyncing && (
           <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-xs font-medium animate-pulse">
             <Loader2 className="w-3 h-3 animate-spin" />
             Please wait, rates update in progress...
           </div>
        )}

        {/* Mini preview when collapsed */}
        {!expanded && (
          <div className="flex items-center gap-3 text-[11px] text-[#8E9299]">
            <span className="hidden sm:inline">
              Avg: <span className={marketMetrics.avgTodayRate > 0 ? 'text-green-400' : marketMetrics.avgTodayRate < 0 ? 'text-red-400' : 'text-white'}>
                {formatPercent(marketMetrics.avgTodayRate)}
              </span>
            </span>
            <span>
              ±<span className="text-white">{formatPercent(marketMetrics.stdDevTodayRate)}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {expanded && (
        <div className="px-6 py-4 space-y-4">
          {/* Row 1: Numeric Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Active Symbols with instrument type breakdown */}
            <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col gap-1.5 hover:border-[#3a3b40] transition-colors">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#8E9299]" />
                <span className="text-[10px] font-medium text-[#8E9299] uppercase tracking-wider">Active Symbols</span>
              </div>
              <span className="text-xl font-bold font-mono tracking-tight text-white">
                {marketMetrics.totalSymbols}
              </span>
              <div className="flex flex-col gap-0.5 text-[11px]">
                <AppTooltip description="Linear perpetual contracts settled in USDT." side="top" align="center">
                  <span className="flex items-center justify-between cursor-help border-b border-dashed border-[#8E9299]/20 text-[#8E9299]">
                    <span>USDT-M</span>
                    <span className="font-mono text-white">{marketMetrics.usdtmSymbols}</span>
                  </span>
                </AppTooltip>
                <AppTooltip description="Inverse perpetual contracts settled in the base coin (e.g. BTC, ETH)." side="top" align="center">
                  <span className="flex items-center justify-between cursor-help border-b border-dashed border-[#8E9299]/20 text-[#8E9299]">
                    <span>COIN-M</span>
                    <span className="font-mono text-white">{marketMetrics.coinmSymbols}</span>
                  </span>
                </AppTooltip>
              </div>
            </div>
            {/* Combined Distribution card: Positive + Neutral + Negative + Net spread */}
            <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col gap-2 hover:border-[#3a3b40] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#8E9299]" />
                  <span className="text-[10px] font-medium text-[#8E9299] uppercase tracking-wider">Distribution Today</span>
                </div>
                <AppTooltip
                  description="Net positive spread: the difference between the % of positive and negative symbols. A positive value means more symbols have Longs paying Shorts than vice versa."
                  side="top"
                  align="center"
                >
                  <span
                    className={`text-xs font-mono font-bold cursor-help border-b border-dashed border-[#8E9299]/30 ${
                      marketMetrics.netPositiveSpread > 0 ? 'text-green-400' : marketMetrics.netPositiveSpread < 0 ? 'text-red-400' : 'text-white'
                    }`}
                  >
                    Net {marketMetrics.netPositiveSpread >= 0 ? '+' : ''}{formatPercentShort(marketMetrics.netPositiveSpread)}
                  </span>
                </AppTooltip>
              </div>

              {/* Distribution rows */}
              <div className="flex flex-col gap-1 text-[11px]">
                <AppTooltip description="Percentage of symbols with positive cumulative funding today (Longs pay Shorts)." side="top" align="center">
                  <span className="flex items-center justify-between cursor-help border-b border-dashed border-green-400/30 text-green-400">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" />
                      Positive
                    </span>
                    <span className="font-mono font-medium">{formatPercentShort(marketMetrics.positiveRatePct)}</span>
                  </span>
                </AppTooltip>
                <AppTooltip description="Percentage of symbols with zero cumulative funding today (no payment exchanged)." side="top" align="center">
                  <span className="flex items-center justify-between cursor-help border-b border-dashed border-[#8E9299]/20 text-[#8E9299]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 flex items-center justify-center text-[10px]">—</span>
                      Neutral
                    </span>
                    <span className="font-mono font-medium">{formatPercentShort(marketMetrics.neutralRatePct)}</span>
                  </span>
                </AppTooltip>
                <AppTooltip description="Percentage of symbols with negative cumulative funding today (Shorts pay Longs)." side="top" align="center">
                  <span className="flex items-center justify-between cursor-help border-b border-dashed border-red-400/30 text-red-400">
                    <span className="flex items-center gap-1.5">
                      <TrendingDown className="w-3 h-3" />
                      Negative
                    </span>
                    <span className="font-mono font-medium">{formatPercentShort(marketMetrics.negativeRatePct)}</span>
                  </span>
                </AppTooltip>
              </div>
            </div>
            {/* Combined Rate Stats: Avg Rate + Std Deviation */}
            <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col gap-1.5 hover:border-[#3a3b40] transition-colors">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#8E9299]" />
                <span className="text-[10px] font-medium text-[#8E9299] uppercase tracking-wider">Rate Stats</span>
              </div>
              <AppTooltip description="Average cumulative funding rate across all symbols for today (UTC). A positive value means Longs are generally paying Shorts." side="top" align="center">
                <span className="flex items-center justify-between cursor-help border-b border-dashed border-[#8E9299]/20 text-[11px]">
                  <span className="text-[#8E9299]">Avg Rate</span>
                  <span className={`font-mono font-medium ${
                    marketMetrics.avgTodayRate > 0 ? 'text-green-400' : marketMetrics.avgTodayRate < 0 ? 'text-red-400' : 'text-white'
                  }`}>
                    {formatPercent(marketMetrics.avgTodayRate)}
                  </span>
                </span>
              </AppTooltip>
              <AppTooltip description="Standard deviation of today's funding rates. Higher values indicate greater dispersion between coins — some cost much more to hold than others." side="top" align="center">
                <span className="flex items-center justify-between cursor-help border-b border-dashed border-[#8E9299]/20 text-[11px]">
                  <span className="text-[#8E9299]">Std Dev</span>
                  <span className="font-mono font-medium text-white">
                    {formatPercent(marketMetrics.stdDevTodayRate)}
                  </span>
                </span>
              </AppTooltip>
            </div>
          </div>

          {/* Row 2: Rankings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KpiRankingList
              title="Top Payers"
              icon={<Flame className="w-4 h-4" />}
              items={rankings.topPayers}
              color="green"
              tooltip="Top 5 symbols where Long positions are paying the most in funding today (highest positive cumulative rate)."
            />
            <KpiRankingList
              title="Bottom Payers"
              icon={<Snowflake className="w-4 h-4" />}
              items={rankings.bottomPayers}
              color="red"
              tooltip="Top 5 symbols where Short positions are paying the most in funding today (most negative cumulative rate)."
            />
            <KpiRankingList
              title="Highest Volatility"
              icon={<Activity className="w-4 h-4" />}
              items={rankings.highestVolatility}
              color="green"
              tooltip="Top 5 symbols with the highest absolute funding rate today, regardless of direction. Highest cost to hold either side."
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketOverviewCards;
