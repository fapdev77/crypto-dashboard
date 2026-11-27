import React from 'react';
import { useTranslation } from 'react-i18next';
import { AdvancedPerformanceMetrics } from '../../../hooks/usePortfolioPerformance';
import { AppTooltip } from '../../ui/Tooltip';
import { Award, TrendingUp, ShieldCheck, Activity } from 'lucide-react';

interface Props {
  metrics: AdvancedPerformanceMetrics;
  denomination: string;
  isPrivateMode: boolean;
}

export const AdvancedPerformanceSection = React.memo(function AdvancedPerformanceSection({ metrics, denomination, isPrivateMode }: Props) {
  const { t } = useTranslation();
  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return String(val);
  };

  const getProfitFactorBadge = (rating: string) => {
    switch (rating) {
      case 'Excellent':
        return 'bg-success/10 text-success border-success/30';
      case 'Good':
        return 'bg-tone-blue/10 text-tone-blue border-tone-blue/30';
      case 'Marginal':
      case 'Acceptable':
        return 'bg-tone-yellow/10 text-tone-yellow border-tone-yellow/30';
      default:
        return 'bg-danger/10 text-danger border-danger/30';
    }
  };

  const getConsistencyBadge = (rating: string) => {
    switch (rating) {
      case 'Highly Consistent':
        return 'bg-success/10 text-success border-success/30';
      case 'Moderate Consistency':
        return 'bg-tone-yellow/10 text-tone-yellow border-tone-yellow/30';
      default:
        return 'bg-warning/10 text-tone-amber border-warning/30';
    }
  };

  const getLocalizedPfRating = (rating: string) => {
    const map: Record<string, string> = {
      Excellent: 'analytics.portfolio.advanced.ratings.excellent',
      Good: 'analytics.portfolio.advanced.ratings.good',
      Marginal: 'analytics.portfolio.advanced.ratings.marginal',
      Acceptable: 'analytics.portfolio.advanced.ratings.acceptable',
      'Loss-making': 'analytics.portfolio.advanced.ratings.lossMaking',
    };
    return map[rating] ? t(map[rating], rating) : rating;
  };

  const getLocalizedConsistencyRating = (rating: string) => {
    const map: Record<string, string> = {
      'Highly Consistent': 'analytics.portfolio.advanced.ratings.highlyConsistent',
      'Moderate Consistency': 'analytics.portfolio.advanced.ratings.moderateConsistency',
      'High Dispersion': 'analytics.portfolio.advanced.ratings.highDispersion',
    };
    return map[rating] ? t(map[rating], rating) : rating;
  };

  const negativeDaysCount = Math.max(0, metrics.totalDaysEvaluated - metrics.positiveDaysCount);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line/60">
        <h3 className="text-base font-bold text-fg flex items-center gap-2">
          <Award className="w-4 h-4 text-accent" />
          {t('analytics.portfolio.advanced.title', 'Advanced Performance Metrics')}
        </h3>
        <span className="text-xs text-fg-muted">{t('analytics.portfolio.advanced.subtitle', 'Risk, Return & Consistency')}</span>
      </div>

      {/* Grid of 3 Main Analytical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Win Rate */}
        <div className="bg-surface border border-line rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <AppTooltip description={t('analytics.portfolio.advanced.winRateTooltip', 'Percentage of operating days with positive net result over the total days with activity.')}>
                <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50">
                  {t('analytics.portfolio.advanced.winRate', 'Win Rate (Daily)')}
                </span>
              </AppTooltip>
              <TrendingUp className="w-4 h-4 text-success" />
            </div>

            <div className="text-3xl font-extrabold font-mono text-success mb-2">
              {metrics.winRate.toFixed(1)}%
            </div>

            <div className="text-xs text-fg-muted flex items-center gap-1.5 mb-4">
              <span>{t('analytics.portfolio.advanced.positiveDays', '{{positive}} positive', { positive: metrics.positiveDaysCount })}</span>
              <span>/</span>
              <span>{t('analytics.portfolio.advanced.totalDays', '{{total}} total days', { total: metrics.totalDaysEvaluated })}</span>
              {negativeDaysCount > 0 && (
                <span className="text-danger">({t('analytics.portfolio.advanced.negativeDays', '{{count}} negative', { count: negativeDaysCount })})</span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-elevated rounded-full h-2.5 overflow-hidden flex">
            <div
              className="bg-success h-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, metrics.winRate))}%` }}
              title={t('analytics.portfolio.advanced.positiveDaysPctTitle', 'Positive Days: {{pct}}%', { pct: metrics.winRate.toFixed(1) })}
            />
            <div
              className="bg-danger h-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, 100 - metrics.winRate))}%` }}
              title={t('analytics.portfolio.advanced.negativeDaysPctTitle', 'Negative Days: {{pct}}%', { pct: (100 - metrics.winRate).toFixed(1) })}
            />
          </div>
        </div>

        {/* 2. Profit Factor */}
        <div className="bg-surface border border-line rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <AppTooltip description={t('analytics.portfolio.advanced.profitFactorTooltip', 'Ratio of gross gains to gross losses: Total Gains / Total Losses. Values > 2.0 indicate institutional excellence.')}>
                <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50">
                  {t('analytics.portfolio.advanced.profitFactor', 'Profit Factor')}
                </span>
              </AppTooltip>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getProfitFactorBadge(metrics.profitFactorRating)}`}>
                {getLocalizedPfRating(metrics.profitFactorRating)}
              </span>
            </div>

            <div className="text-3xl font-extrabold font-mono text-fg mb-2">
              {metrics.profitFactor > 99 ? '> 99.0' : metrics.profitFactor.toFixed(2)}
            </div>

            {/* Split breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-line/50 font-mono">
              <div>
                <span className="text-[10px] text-fg-muted block">{t('analytics.portfolio.advanced.totalGains', 'Total Gains')}:</span>
                <span className="text-success font-semibold">
                  {maskVal(`+${metrics.totalGains} ${denomination}`)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-fg-muted block">{t('analytics.portfolio.advanced.totalLosses', 'Total Losses')}:</span>
                <span className="text-danger font-semibold">
                  {maskVal(`-${metrics.totalLosses} ${denomination}`)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-fg-muted mt-3 pt-2 border-t border-line/30 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>{t('analytics.portfolio.advanced.profitFactorFootnote', 'Ratio of gains relative to absorbed drawdowns')}</span>
          </div>
        </div>

        {/* 3. Consistency Index (CV) */}
        <div className="bg-surface border border-line rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <AppTooltip description={t('analytics.portfolio.advanced.consistencyTooltip', 'Coefficient of Variation (Standard Deviation / Daily Mean * 100). Lower CV reflects higher regularity and consistency across operational days.')}>
                <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50">
                  {t('analytics.portfolio.advanced.consistencyIndex', 'Consistency Index (CV)')}
                </span>
              </AppTooltip>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getConsistencyBadge(metrics.consistencyRating)}`}>
                {getLocalizedConsistencyRating(metrics.consistencyRating)}
              </span>
            </div>

            <div className="text-3xl font-extrabold font-mono text-fg mb-2">
              {metrics.consistencyIndexCv.toFixed(1)}%
            </div>

            <p className="text-xs text-fg-muted leading-relaxed">
              {metrics.consistencyRating === 'Highly Consistent' &&
                t('analytics.portfolio.advanced.consistencyDescHigh', 'Low outcome dispersion indicating consistent, steady performance.')}
              {metrics.consistencyRating === 'Moderate Consistency' &&
                t('analytics.portfolio.advanced.consistencyDescMod', 'Balanced distribution between consistent sessions and outlier days.')}
              {metrics.consistencyRating === 'High Dispersion' &&
                t('analytics.portfolio.advanced.consistencyDescDisp', 'High return variance across days with significant fluctuation.')}
            </p>
          </div>

          <div className="text-[11px] text-fg-muted mt-3 pt-2 border-t border-line/30 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-tone-blue" />
            <span>{t('analytics.portfolio.advanced.consistencyFootnote', 'Normalized standard deviation of daily returns')}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
