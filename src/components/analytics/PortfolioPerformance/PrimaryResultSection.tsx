import React from 'react';
import { useTranslation } from 'react-i18next';
import { PrimaryResultMetrics } from '../../../hooks/usePortfolioPerformance';
import { AppTooltip } from '../../ui/Tooltip';
import { Target, Calendar, Info } from 'lucide-react';

interface Props {
  metrics: PrimaryResultMetrics;
  denomination: string;
  isPrivateMode: boolean;
}

export const PrimaryResultSection = React.memo(function PrimaryResultSection({ metrics, denomination, isPrivateMode }: Props) {
  const { t } = useTranslation();
  const isPositive = metrics.percentageGain >= 0;

  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return String(val);
  };

  return (
    <div className="space-y-4">
      {/* Section Header with Date Period */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-line/60">
        <h3 className="text-base font-bold text-fg flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          {t('analytics.portfolio.primary.title', 'Primary Result')}
        </h3>
        <div className="flex items-center gap-2 text-xs text-fg-muted font-mono tabular-nums">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            Period (UTC): {metrics.earliestDate} to {metrics.latestDate} ({metrics.durationDays} {metrics.durationDays === 1 ? 'day' : 'days'})
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-6 shadow-sm">
        {/* Top Hero Banner */}
        <div className="flex flex-col items-center justify-center py-4 bg-elevated/60 rounded-xl border border-line/50 text-center relative overflow-hidden">
          <span className="text-[11px] font-semibold tracking-wider text-fg-muted uppercase mb-1">
            {t('analytics.portfolio.primary.roi', 'Percentage Gain in Period (ROI)')}
          </span>
          <div className={`text-4xl sm:text-5xl font-extrabold font-mono tabular-nums tracking-tight ${isPositive ? 'text-success' : 'text-danger'}`}>
            {isPositive ? '+' : ''}{metrics.percentageGain.toFixed(2)}%
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-fg-muted font-mono tabular-nums">
            <span>{t('analytics.portfolio.primary.absoluteGain', 'Absolute Gain')}:</span>
            <span className={`font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
              {maskVal(`${isPositive ? '+' : ''}${metrics.absoluteGain} ${denomination}`)}
            </span>
            {denomination !== 'USD' && (
              <span className="text-xs text-fg-muted">
                ({maskVal(`$${metrics.absoluteGainUsd} USD`)})
              </span>
            )}
          </div>
        </div>

        {/* 4 Sub-KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Initial Balance */}
          <div className="bg-elevated border border-line rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <AppTooltip description="Portfolio wallet balance at the start of the analyzed window across all selected accounts (excluding subsequent deposits).">
                <span className="text-[11px] text-fg-muted uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50">
                  {t('analytics.portfolio.primary.initialBalance', 'Initial Balance')}
                </span>
              </AppTooltip>
            </div>
            <div>
              <div className="text-xl font-bold font-mono tabular-nums text-fg">
                {maskVal(metrics.initialBalance)}
              </div>
              <span className="text-xs text-fg-muted">{denomination}</span>
            </div>
          </div>

          {/* 2. Final Balance */}
          <div className="bg-elevated border border-line rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <AppTooltip description="Consolidated portfolio wallet balance across all active selected accounts at the end of the analyzed timeframe.">
                <span className="text-[11px] text-fg-muted uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50">
                  {t('analytics.portfolio.primary.finalBalance', 'Final Balance')}
                </span>
              </AppTooltip>
            </div>
            <div>
              <div className="text-xl font-bold font-mono tabular-nums text-fg">
                {maskVal(metrics.finalBalance)}
              </div>
              <span className="text-xs text-fg-muted">{denomination}</span>
            </div>
          </div>

          {/* 3. Daily Average ROI */}
          <div className="bg-elevated border border-line rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <AppTooltip description="Average daily return rate: Total Percentage Gain / Operating Days.">
                <span className="text-[11px] text-fg-muted uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50">
                  {t('analytics.portfolio.primary.dailyAvgRoi', 'Daily Average ROI')}
                </span>
              </AppTooltip>
            </div>
            <div>
              <div className={`text-xl font-bold font-mono tabular-nums ${metrics.dailyAverageRoi >= 0 ? 'text-success' : 'text-danger'}`}>
                {metrics.dailyAverageRoi >= 0 ? '+' : ''}{metrics.dailyAverageRoi.toFixed(4)}%
              </div>
              <span className="text-xs text-fg-muted">{t('analytics.portfolio.primary.perOperatingDay', 'per operating day')}</span>
            </div>
          </div>

          {/* 4. Deposits in Period */}
          <div className="bg-elevated border border-line rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <AppTooltip description="Total deposits during the period. Separated from operational gain to measure genuine strategy performance.">
                <span className="text-[11px] text-fg-muted uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50 flex items-center gap-1">
                  {t('analytics.portfolio.primary.depositsInPeriod', 'Deposits in Period')} <Info className="w-3 h-3 text-accent" />
                </span>
              </AppTooltip>
            </div>
            <div>
              <div className="text-xl font-bold font-mono tabular-nums text-fg">
                {maskVal(metrics.depositsInPeriod)}
              </div>
              <span className="text-[10px] text-fg-muted block mt-0.5">
                {denomination} (does not inflate trading result)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
