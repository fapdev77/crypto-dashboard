import React from 'react';
import { PrimaryResultMetrics } from '../../../hooks/usePortfolioPerformance';
import { AppTooltip } from '../../ui/Tooltip';
import { Target, Calendar, Info } from 'lucide-react';

interface Props {
  metrics: PrimaryResultMetrics;
  denomination: string;
  isPrivateMode: boolean;
}

export const PrimaryResultSection = React.memo(function PrimaryResultSection({ metrics, denomination, isPrivateMode }: Props) {
  const isPositive = metrics.percentageGain >= 0;

  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return String(val);
  };

  return (
    <div className="space-y-4">
      {/* Section Header with Date Period */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#2a2b30]/60">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-[#2F6BFF]" />
          Primary Result
        </h3>
        <div className="flex items-center gap-2 text-xs text-[#8E9299]">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            Period: {metrics.earliestDate} to {metrics.latestDate} ({metrics.durationDays} {metrics.durationDays === 1 ? 'day' : 'days'})
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-5 space-y-6 shadow-sm">
        {/* Top Hero Banner */}
        <div className="flex flex-col items-center justify-center py-4 bg-[#1a1b1e]/60 rounded-xl border border-[#2a2b30]/50 text-center relative overflow-hidden">
          <span className="text-[11px] font-semibold tracking-wider text-[#8E9299] uppercase mb-1">
            Percentage Gain in Period (ROI)
          </span>
          <div className={`text-4xl sm:text-5xl font-extrabold font-mono tracking-tight ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
            {isPositive ? '+' : ''}{metrics.percentageGain.toFixed(2)}%
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-[#8E9299] font-mono">
            <span>Absolute Gain:</span>
            <span className={`font-bold ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
              {maskVal(`${isPositive ? '+' : ''}${metrics.absoluteGain} ${denomination}`)}
            </span>
            {denomination !== 'USD' && (
              <span className="text-xs text-[#8E9299]">
                ({maskVal(`$${metrics.absoluteGainUsd} USD`)})
              </span>
            )}
          </div>
        </div>

        {/* 4 Sub-KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Initial Balance */}
          <div className="bg-[#161b22] border border-[#2a2b30] rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <AppTooltip description="Portfolio wallet balance at the time of the first trading operation (excluding subsequent deposits).">
                <span className="text-[11px] text-[#8E9299] uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50">
                  Initial Balance
                </span>
              </AppTooltip>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-white">
                {maskVal(metrics.initialBalance)}
              </div>
              <span className="text-xs text-[#8E9299]">{denomination}</span>
            </div>
          </div>

          {/* 2. Final Balance */}
          <div className="bg-[#161b22] border border-[#2a2b30] rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <AppTooltip description="Total portfolio wallet balance at the end of the analyzed timeframe.">
                <span className="text-[11px] text-[#8E9299] uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50">
                  Final Balance
                </span>
              </AppTooltip>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-white">
                {maskVal(metrics.finalBalance)}
              </div>
              <span className="text-xs text-[#8E9299]">{denomination}</span>
            </div>
          </div>

          {/* 3. Daily Average ROI */}
          <div className="bg-[#161b22] border border-[#2a2b30] rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <AppTooltip description="Average daily return rate: Total Percentage Gain / Operating Days.">
                <span className="text-[11px] text-[#8E9299] uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50">
                  Daily Average ROI
                </span>
              </AppTooltip>
            </div>
            <div>
              <div className={`text-xl font-bold font-mono ${metrics.dailyAverageRoi >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                {metrics.dailyAverageRoi >= 0 ? '+' : ''}{metrics.dailyAverageRoi.toFixed(4)}%
              </div>
              <span className="text-xs text-[#8E9299]">per operating day</span>
            </div>
          </div>

          {/* 4. Deposits in Period */}
          <div className="bg-[#161b22] border border-[#2a2b30] rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <AppTooltip description="Total deposits during the period. Excluded from ROI calculations to measure genuine strategy alpha.">
                <span className="text-[11px] text-[#8E9299] uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50 flex items-center gap-1">
                  Deposits in Period <Info className="w-3 h-3 text-[#2F6BFF]" />
                </span>
              </AppTooltip>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-gray-300">
                {maskVal(metrics.depositsInPeriod)}
              </div>
              <span className="text-[10px] text-[#8E9299] block mt-0.5">
                {denomination} (does not inflate trading result)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
