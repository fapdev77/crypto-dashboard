import React from 'react';
import {
  Compass,
  Users,
  Briefcase,
  AlertTriangle,
  Zap,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';

export const SmartMoneySentimentWidget: React.FC = () => {
  const { snapshot } = useMarketAnalyticsStore();

  if (!snapshot) return null;

  const { sentiment } = snapshot;
  const {
    retailLongRatio,
    retailShortRatio,
    topTraderLongRatio,
    topTraderShortRatio,
    divergenceDetected,
    divergenceMessage,
    greedFearScore,
    greedFearLabel,
  } = sentiment;

  const getScoreTheme = (score: number) => {
    if (score >= 75) {
      return {
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        meterBg: 'bg-cyan-500',
      };
    }
    if (score >= 56) {
      return {
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        meterBg: 'bg-emerald-500',
      };
    }
    if (score >= 45) {
      return {
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        meterBg: 'bg-yellow-500',
      };
    }
    if (score >= 25) {
      return {
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        meterBg: 'bg-amber-500',
      };
    }
    return {
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      meterBg: 'bg-rose-500',
    };
  };

  const theme = getScoreTheme(greedFearScore);

  return (
    <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Smart Money vs. Retail Sentiment
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#1a1b22] text-[#d1d5db] border border-[#2a2b30] rounded">
                Positioning Divergence
              </span>
            </div>
            <p className="text-xs text-[#8E9299]">
              Compares retail trader account counts against top whale volume positioning
            </p>
          </div>
        </div>

        {/* Fear & Greed Score Badge */}
        <div className={`flex items-center gap-3 px-3.5 py-1.5 rounded-xl border ${theme.bg} ${theme.border}`}>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#8E9299] block">
              Market Emotion
            </span>
            <span className={`text-sm font-bold ${theme.color}`}>{greedFearLabel}</span>
          </div>
          <div className={`text-2xl font-black font-mono ${theme.color}`}>
            {greedFearScore}
            <span className="text-xs font-normal text-[#8E9299]">/100</span>
          </div>
        </div>
      </div>

      {/* Divergence Alert Banner */}
      {divergenceDetected && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400 shrink-0 mt-0.5">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-purple-300">
              Institutional Positioning Divergence Detected:
            </span>
            <p className="text-xs text-[#d1d5db] mt-0.5 leading-relaxed">
              {divergenceMessage}
            </p>
          </div>
        </div>
      )}

      {/* Retail vs Smart Money Comparative Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Retail Traders Card */}
        <div className="bg-[#1a1b22] border border-[#2a2b30] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                Retail Accounts Ratio
              </span>
            </div>
            <span className="text-[10px] text-[#8E9299]">Bybit & OKX Accounts</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400 font-bold">Long: {retailLongRatio}%</span>
            <span className="text-rose-400 font-bold">Short: {retailShortRatio}%</span>
          </div>

          {/* Segmented bar */}
          <div className="w-full h-2.5 rounded-full bg-[#121318] overflow-hidden flex border border-[#2a2b30]">
            <div
              style={{ width: `${retailLongRatio}%` }}
              className="bg-emerald-500 h-full transition-all"
            />
            <div
              style={{ width: `${retailShortRatio}%` }}
              className="bg-rose-500 h-full transition-all"
            />
          </div>

          <p className="text-[11px] text-[#8E9299] leading-tight">
            Percentage of total active trader accounts holding open long versus short positions.
          </p>
        </div>

        {/* Top Traders (Smart Money) Card */}
        <div className="bg-[#1a1b22] border border-[#2a2b30] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                Top Traders (Smart Money)
              </span>
            </div>
            <span className="text-[10px] text-[#8E9299]">Volume-Weighted Elite</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400 font-bold">Long: {topTraderLongRatio}%</span>
            <span className="text-rose-400 font-bold">Short: {topTraderShortRatio}%</span>
          </div>

          {/* Segmented bar */}
          <div className="w-full h-2.5 rounded-full bg-[#121318] overflow-hidden flex border border-[#2a2b30]">
            <div
              style={{ width: `${topTraderLongRatio}%` }}
              className="bg-emerald-500 h-full transition-all"
            />
            <div
              style={{ width: `${topTraderShortRatio}%` }}
              className="bg-rose-500 h-full transition-all"
            />
          </div>

          <p className="text-[11px] text-[#8E9299] leading-tight">
            Nocional positioning of the top 20% most profitable and high-volume accounts on OKX/Bitget.
          </p>
        </div>
      </div>

      {/* Fear and Greed Meter Visual Bar */}
      <div className="bg-[#1a1b22] border border-[#2a2b30] rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-[#8E9299]">
          <span className="font-semibold text-white">Market Sentiment Spectrum</span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-rose-400">Extreme Fear</span>
            <span>•</span>
            <span className="text-yellow-400">Neutral</span>
            <span>•</span>
            <span className="text-cyan-400">Extreme Greed</span>
          </div>
        </div>

        {/* Multi-gradient spectrum with marker */}
        <div className="relative pt-2 pb-1">
          <div className="w-full h-3 rounded-full bg-gradient-to-r from-rose-500 via-amber-500 via-yellow-400 via-emerald-500 to-cyan-400 shadow-inner" />
          <div
            style={{ left: `${Math.max(2, Math.min(98, greedFearScore))}%` }}
            className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center"
          >
            <div className="w-4 h-4 bg-white rounded-full border-2 border-[#121318] shadow-lg" />
            <span className="text-[10px] font-mono font-bold text-white mt-1 bg-[#121318] px-1 rounded border border-[#2a2b30]">
              {greedFearScore}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
