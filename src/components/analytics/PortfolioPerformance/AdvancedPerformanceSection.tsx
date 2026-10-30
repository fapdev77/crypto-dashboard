import React from 'react';
import { AdvancedPerformanceMetrics } from '../../../hooks/usePortfolioPerformance';
import { AppTooltip } from '../../ui/Tooltip';
import { Award, TrendingUp, ShieldCheck, Activity } from 'lucide-react';

interface Props {
  metrics: AdvancedPerformanceMetrics;
  denomination: string;
  isPrivateMode: boolean;
}

export const AdvancedPerformanceSection = React.memo(function AdvancedPerformanceSection({ metrics, denomination, isPrivateMode }: Props) {
  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return String(val);
  };

  const getProfitFactorBadge = (rating: string) => {
    switch (rating) {
      case 'Excellent':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Good':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Acceptable':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
  };

  const getConsistencyBadge = (rating: string) => {
    switch (rating) {
      case 'Highly Consistent':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Moderate Consistency':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
  };

  const negativeDaysCount = Math.max(0, metrics.totalDaysEvaluated - metrics.positiveDaysCount);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#2a2b30]/60">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-[#2F6BFF]" />
          Advanced Performance Metrics
        </h3>
        <span className="text-xs text-[#8E9299]">Risk, Return & Consistency</span>
      </div>

      {/* Grid of 3 Main Analytical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Win Rate */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <AppTooltip description="Percentage of operating days with positive net result over the total days with activity.">
                <span className="text-[11px] font-semibold text-[#8E9299] uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50">
                  Win Rate (Daily)
                </span>
              </AppTooltip>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="text-3xl font-extrabold font-mono text-emerald-400 mb-2">
              {metrics.winRate.toFixed(1)}%
            </div>

            <div className="text-xs text-[#8E9299] flex items-center gap-1.5 mb-4">
              <span>{metrics.positiveDaysCount} positive</span>
              <span>/</span>
              <span>{metrics.totalDaysEvaluated} total days</span>
              {negativeDaysCount > 0 && (
                <span className="text-rose-400">({negativeDaysCount} negative)</span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#1e2025] rounded-full h-2.5 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, metrics.winRate))}%` }}
              title={`Positive Days: ${metrics.winRate.toFixed(1)}%`}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, 100 - metrics.winRate))}%` }}
              title={`Negative Days: ${(100 - metrics.winRate).toFixed(1)}%`}
            />
          </div>
        </div>

        {/* 2. Profit Factor */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <AppTooltip description="Ratio of gross gains to gross losses: Total Gains / Total Losses. Values > 2.0 indicate institutional excellence.">
                <span className="text-[11px] font-semibold text-[#8E9299] uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50">
                  Profit Factor
                </span>
              </AppTooltip>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getProfitFactorBadge(metrics.profitFactorRating)}`}>
                {metrics.profitFactorRating}
              </span>
            </div>

            <div className="text-3xl font-extrabold font-mono text-white mb-2">
              {metrics.profitFactor > 99 ? '> 99.0' : metrics.profitFactor.toFixed(2)}
            </div>

            {/* Split breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#2a2b30]/50 font-mono">
              <div>
                <span className="text-[10px] text-[#8E9299] block">Total Gains:</span>
                <span className="text-emerald-400 font-semibold">
                  {maskVal(`+${metrics.totalGains} ${denomination}`)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8E9299] block">Total Losses:</span>
                <span className="text-rose-400 font-semibold">
                  {maskVal(`-${metrics.totalLosses} ${denomination}`)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#8E9299] mt-3 pt-2 border-t border-[#2a2b30]/30 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2F6BFF]" />
            <span>Ratio of gains relative to absorbed drawdowns</span>
          </div>
        </div>

        {/* 3. Consistency Index (CV) */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <AppTooltip description="Coefficient of Variation (Standard Deviation / Daily Mean * 100). Lower CV reflects higher regularity and consistency across operational days.">
                <span className="text-[11px] font-semibold text-[#8E9299] uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50">
                  Consistency Index (CV)
                </span>
              </AppTooltip>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getConsistencyBadge(metrics.consistencyRating)}`}>
                {metrics.consistencyRating}
              </span>
            </div>

            <div className="text-3xl font-extrabold font-mono text-white mb-2">
              {metrics.consistencyIndexCv.toFixed(1)}%
            </div>

            <p className="text-xs text-[#8E9299] leading-relaxed">
              {metrics.consistencyRating === 'Highly Consistent' &&
                'Low outcome dispersion indicating consistent, steady performance.'}
              {metrics.consistencyRating === 'Moderate Consistency' &&
                'Balanced distribution between consistent sessions and outlier days.'}
              {metrics.consistencyRating === 'High Dispersion' &&
                'High return variance across days with significant fluctuation.'}
            </p>
          </div>

          <div className="text-[11px] text-[#8E9299] mt-3 pt-2 border-t border-[#2a2b30]/30 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Normalized standard deviation of daily returns</span>
          </div>
        </div>
      </div>
    </div>
  );
});
