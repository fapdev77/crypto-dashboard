import React from 'react';
import { useTranslation } from 'react-i18next';
import { EyeOff } from 'lucide-react';
import type { ClosedPositionsStats } from '../utils/closedPositionsStats';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { usePrivacy } from '../context/PrivacyContext';
import { Sparkline } from './ui/Sparkline';
import { AppTooltip } from './ui/Tooltip';

interface ClosedPositionsSummaryCardsProps {
  stats: ClosedPositionsStats;
}

export function ClosedPositionsSummaryCards({ stats }: ClosedPositionsSummaryCardsProps) {
  const { t } = useTranslation();
  const formatCurrency = useFormatCurrency();
  const { isPrivateMode } = usePrivacy();

  const formatSignedUsd = (value: number, decimals = 2) => {
    const formatted = formatCurrency(value, 'usd', decimals);
    if (isPrivateMode) return formatted;
    return value > 0 ? `+${formatted}` : formatted;
  };

  const pnlPositive = stats.totalPnl >= 0;
  const roiLabel =
    stats.roiPct !== null && isFinite(stats.roiPct)
      ? `${stats.roiPct > 0 ? '+' : ''}${stats.roiPct.toFixed(2)}%`
      : '--';
  const roiClass =
    stats.roiPct === null
      ? 'bg-elevated text-fg-muted border-line'
      : stats.roiPct >= 0
      ? 'bg-success/10 text-success border-success/25'
      : 'bg-danger/10 text-danger border-danger/25';

  const profitFactorLabel =
    stats.profitFactor === null
      ? '0.00'
      : stats.profitFactor === Infinity
      ? '∞'
      : stats.profitFactor.toFixed(2);

  const costRatioBarWidth =
    stats.operationalCostPct !== null
      ? Math.min(100, Math.max(stats.totalOperationalCost !== 0 ? 3 : 0, stats.operationalCostPct))
      : stats.totalOperationalCost !== 0
      ? 100
      : 0;

  const biasText =
    stats.sideBias === 'buyer'
      ? t('positionsHistory.buyerBias', 'Active buyer bias')
      : stats.sideBias === 'seller'
      ? t('positionsHistory.sellerBias', 'Active seller bias')
      : t('positionsHistory.balancedBias', 'Balanced directional exposure');

  const biasColorClass =
    stats.sideBias === 'buyer'
      ? 'text-success'
      : stats.sideBias === 'seller'
      ? 'text-danger'
      : 'text-fg-muted';

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4 items-stretch"
      data-testid="closed-positions-summary-grid"
    >
      {/* Card 1: Net PnL & Performance */}
      <section
        aria-label={t('positionsHistory.netProfitTitle', 'Net Profit (Total PnL)')}
        className="bg-surface border border-line rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4 min-w-0"
      >
        <h3 className="text-2xl text-fg-muted">
          {t('positionsHistory.netProfitTitle', 'Net Profit (Total PnL)')}
        </h3>

        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex flex-col items-start gap-2.5 min-w-0">
            <span
              className={`text-3xl font-bold font-mono tabular-nums tracking-tight leading-none truncate ${
                pnlPositive ? 'text-success' : 'text-danger'
              }`}
            >
              {formatSignedUsd(stats.totalPnl, 2)}
            </span>

            <AppTooltip
              description={t(
                'positionsHistory.roiTooltip',
                'Aggregate ROI computed as Total Net PnL divided by total initial margin across positions with leverage.'
              )}
            >
              <span
                tabIndex={0}
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold tabular-nums border shrink-0 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${roiClass}`}
              >
                {t('positionsHistory.roi', 'ROI')} {roiLabel}
              </span>
            </AppTooltip>
          </div>

          {isPrivateMode ? (
            <div
              data-testid="privacy-sparkline-placeholder"
              aria-label={t('positionsHistory.privacyChartHidden', 'Chart hidden in Privacy Mode')}
              title={t('positionsHistory.privacyChartHidden', 'Chart hidden in Privacy Mode')}
              className="w-[104px] h-[42px] shrink-0 rounded-md border border-dashed border-line-strong bg-elevated/50 flex items-center justify-center gap-1 text-fg-muted"
            >
              <EyeOff className="w-4 h-4 opacity-75" />
            </div>
          ) : (
            <div className="shrink-0" data-testid="closed-positions-sparkline">
              <Sparkline
                data={stats.cumulativePnlSeries}
                color={pnlPositive ? 'emerald' : 'red'}
                width={104}
                height={42}
                ariaLabel={t('positionsHistory.pnlTrendAria', 'Cumulative realized PnL trend')}
              />
            </div>
          )}
        </div>

        <div className="border-t border-line/70 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <AppTooltip
            description={t(
              'positionsHistory.grossTooltip',
              'Gross realized PnL before deducting trading and funding fees.'
            )}
          >
            <span
              tabIndex={0}
              className="inline-flex items-center gap-1.5 min-w-0 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              <span className="text-fg-muted border-b border-dashed border-fg-muted/40">
                {t('positionsHistory.gross', 'Gross')}:
              </span>
              <span
                className={`font-mono font-medium tabular-nums truncate ${
                  stats.totalGrossPnl >= 0 ? 'text-fg' : 'text-danger'
                }`}
              >
                {formatSignedUsd(stats.totalGrossPnl, 2)}
              </span>
            </span>
          </AppTooltip>

          <AppTooltip
            description={t(
              'positionsHistory.profitFactorTooltip',
              'Ratio of total winning PnL to total losing PnL magnitude. Above 1.00 indicates positive expectancy.'
            )}
          >
            <span
              tabIndex={0}
              className="inline-flex items-center gap-1 shrink-0 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              <span className="text-fg-muted">
                {t('positionsHistory.profitFactor', 'Profit Factor')}:
              </span>
              <span className="font-mono font-semibold tabular-nums text-fg border-b border-dashed border-fg-muted/40">
                {profitFactorLabel} {t('positionsHistory.pfShort', 'PF')}
              </span>
            </span>
          </AppTooltip>
        </div>
      </section>

      {/* Card 2: Operational Costs */}
      <section
        aria-label={t('positionsHistory.operationalCostsTitle', 'Operational Costs')}
        className="bg-surface border border-line rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4 min-w-0"
      >
        <h3 className="text-2xl text-fg-muted">
          {t('positionsHistory.operationalCostsTitle', 'Operational Costs')}
        </h3>

        <div className="flex flex-col gap-2.5">
          <AppTooltip
            description={t(
              'positionsHistory.tradingFeesTooltip',
              'Cumulative execution and trading commissions paid (negative) or rebated (positive) across closed positions.'
            )}
          >
            <div
              tabIndex={0}
              className="flex items-center justify-between gap-2 text-xs cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              <span className="text-fg-muted truncate border-b border-dashed border-fg-muted/35">
                {t('positionsHistory.tradeFees', 'Trading Fees')}
              </span>
              <span
                className={`px-2.5 py-1 rounded bg-elevated border border-line/70 font-mono font-medium tabular-nums shrink-0 ${
                  stats.totalTradeFees < 0
                    ? 'text-danger'
                    : stats.totalTradeFees > 0
                    ? 'text-success'
                    : 'text-fg-muted'
                }`}
              >
                {formatSignedUsd(stats.totalTradeFees, 2)}
              </span>
            </div>
          </AppTooltip>

          <AppTooltip
            description={t(
              'positionsHistory.fundingFeesTooltip',
              'Cumulative perpetual funding settlements paid or received while holding positions.'
            )}
          >
            <div
              tabIndex={0}
              className="flex items-center justify-between gap-2 text-xs cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              <span className="text-fg-muted truncate border-b border-dashed border-fg-muted/35">
                {t('positionsHistory.fundingFees', 'Funding Fees')}
              </span>
              <span
                className={`px-2.5 py-1 rounded bg-elevated border border-line/70 font-mono font-medium tabular-nums shrink-0 ${
                  stats.totalFundingFees < 0
                    ? 'text-danger'
                    : stats.totalFundingFees > 0
                    ? 'text-success'
                    : 'text-fg-muted'
                }`}
              >
                {formatSignedUsd(stats.totalFundingFees, 2)}
              </span>
            </div>
          </AppTooltip>

          <div className="pt-0.5">
            <AppTooltip
              description={t(
                'positionsHistory.ofGrossTooltip',
                'Ratio of total operational cost relative to the magnitude of gross realized PnL.'
              )}
            >
              <span
                tabIndex={0}
                className="inline-flex items-center w-fit px-2.5 py-1 rounded-md bg-elevated border border-line/70 text-[11px] font-mono tabular-nums text-fg-muted cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {stats.operationalCostPct !== null
                  ? `${stats.operationalCostPct.toFixed(2)}% ${t('positionsHistory.ofGross', 'of gross')}`
                  : '--'}
              </span>
            </AppTooltip>
          </div>
        </div>

        <div className="border-t border-line/70 pt-3 space-y-2.5">
          <AppTooltip
            description={t(
              'positionsHistory.totalOperationalCostTooltip',
              'Combined net operational cost (Trading Fees + Funding Fees) across closed positions.'
            )}
          >
            <div
              tabIndex={0}
              className="flex items-center justify-between gap-2 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              <span className="text-xs text-fg-muted truncate border-b border-dashed border-fg-muted/35">
                {t('positionsHistory.totalOperationalCost', 'Total Operational Cost')}
              </span>
              <span
                className={`font-mono text-xl font-bold tabular-nums shrink-0 ${
                  stats.totalOperationalCost < 0
                    ? 'text-danger'
                    : stats.totalOperationalCost > 0
                    ? 'text-success'
                    : 'text-fg'
                }`}
              >
                {formatSignedUsd(stats.totalOperationalCost, 2)}
              </span>
            </div>
          </AppTooltip>
          <div className="h-1.5 w-full rounded-full bg-elevated overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                stats.totalOperationalCost > 0 ? 'bg-success' : 'bg-danger'
              }`}
              style={{ width: `${costRatioBarWidth}%` }}
            />
          </div>
        </div>
      </section>

      {/* Card 3: Volume & Side Distribution */}
      <section
        aria-label={t('positionsHistory.volumeTitle', 'Trade Volume')}
        className="bg-surface border border-line rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 min-w-0"
      >
        <h3 className="text-2xl text-fg-muted">
          {t('positionsHistory.volumeTitle', 'Trade Volume')}
        </h3>

        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-fg leading-none">
              {stats.totalPositions}
            </span>
            <span className="text-sm font-medium text-fg-muted">
              {t('positionsHistory.trades', 'Trades')}
            </span>
          </div>
          <div className="mt-2">
            <AppTooltip
              description={t(
                'positionsHistory.sideBiasTooltip',
                'Directional concentration across closed positions: >=55% Longs indicates buyer bias; >=55% Shorts indicates seller bias.'
              )}
            >
              <span
                tabIndex={0}
                data-testid="closed-positions-side-bias"
                className={`inline-block text-xs font-medium cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded ${biasColorClass}`}
              >
                {biasText}
              </span>
            </AppTooltip>
          </div>
        </div>

        <div className="space-y-2" data-testid="closed-positions-volume-bar">
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
            <span className="text-success truncate">
              {t('positions.longCount', {
                count: stats.longs,
                defaultValue: `${stats.longs} Longs`,
              })}{' '}
              ({stats.longPct.toFixed(0)}%)
            </span>
            <span className="text-danger truncate">
              ({stats.shortPct.toFixed(0)}%){' '}
              {t('positions.shortCount', {
                count: stats.shorts,
                defaultValue: `${stats.shorts} Shorts`,
              })}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-elevated overflow-hidden flex">
            <div
              className="h-full bg-success transition-all duration-300"
              style={{ width: `${stats.longPct}%` }}
            />
            <div
              className="h-full bg-danger transition-all duration-300"
              style={{ width: `${stats.shortPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 border-t border-line/70 pt-3">
          <AppTooltip
            description={t(
              'positionsHistory.winRateLongTooltip',
              'Percentage of profitable trades among closed Long positions.'
            )}
          >
            <div
              tabIndex={0}
              className="bg-elevated/70 border border-line/60 rounded-lg px-2.5 py-2 min-w-0 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted truncate">
                {t('positionsHistory.winRateLong', 'Win Rate Long')}
              </div>
              <div className="font-mono text-xs font-semibold tabular-nums mt-1 text-fg truncate">
                <span className={stats.longWinRate !== null && stats.longWinRate >= 50 ? 'text-success' : 'text-fg'}>
                  {stats.longWinRate !== null ? `${stats.longWinRate.toFixed(1)}%` : '--'}
                </span>{' '}
                <span className="text-fg-muted font-normal">
                  ({stats.longWins}/{stats.longs})
                </span>
              </div>
            </div>
          </AppTooltip>

          <AppTooltip
            description={t(
              'positionsHistory.winRateShortTooltip',
              'Percentage of profitable trades among closed Short positions.'
            )}
          >
            <div
              tabIndex={0}
              className="bg-elevated/70 border border-line/60 rounded-lg px-2.5 py-2 min-w-0 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted truncate">
                {t('positionsHistory.winRateShort', 'Win Rate Short')}
              </div>
              <div className="font-mono text-xs font-semibold tabular-nums mt-1 text-fg truncate">
                <span className={stats.shortWinRate !== null && stats.shortWinRate >= 50 ? 'text-success' : 'text-fg'}>
                  {stats.shortWinRate !== null ? `${stats.shortWinRate.toFixed(1)}%` : '--'}
                </span>{' '}
                <span className="text-fg-muted font-normal">
                  ({stats.shortWins}/{stats.shorts})
                </span>
              </div>
            </div>
          </AppTooltip>
        </div>
      </section>

      {/* Card 4: Win Rate & Extremes */}
      <section
        aria-label={t('positionsHistory.winRateStatsTitle', 'Win Rate & Stats')}
        className="bg-surface border border-line rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 min-w-0"
      >
        <h3 className="text-2xl text-fg-muted">
          {t('positionsHistory.winRateStatsTitle', 'Win Rate & Stats')}
        </h3>

        <div className="min-w-0">
          <AppTooltip
            description={t(
              'positionsHistory.winRateTooltip',
              'Percentage of winning trades out of all decided (non-breakeven) closed positions.'
            )}
          >
            <span
              tabIndex={0}
              className="inline-block text-3xl font-bold font-mono tabular-nums text-fg leading-none cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              {stats.winRate.toFixed(2)}%
            </span>
          </AppTooltip>

          <div className="flex items-center gap-2 mt-2.5 text-xs font-mono tabular-nums flex-wrap">
            <span className="px-2 py-0.5 rounded bg-success/10 border border-success/25 text-success font-semibold">
              {stats.wins} {t('positionsHistory.wins', 'Wins')}
            </span>
            <span className="text-fg-muted">|</span>
            <span className="px-2 py-0.5 rounded bg-danger/10 border border-danger/25 text-danger font-semibold">
              {stats.losses} {t('positionsHistory.losses', 'Losses')}
            </span>
          </div>

          <AppTooltip
            description={t(
              'positionsHistory.edgeTooltip',
              'Mathematical expectancy (Edge): average Net PnL generated per closed trade.'
            )}
          >
            <div
              tabIndex={0}
              data-testid="closed-positions-edge-bar"
              className={`mt-3 w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                stats.expectancy >= 0
                  ? 'bg-success/10 border-success/30'
                  : 'bg-danger/10 border-danger/30'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                {t('positionsHistory.edge', 'Edge')}
              </span>
              <span className="font-mono text-xs font-bold tabular-nums">
                <span className={stats.expectancy >= 0 ? 'text-success' : 'text-danger'}>
                  {formatSignedUsd(stats.expectancy, 2)}
                </span>
                <span className="text-[11px] font-normal text-fg-muted ml-1">
                  /{t('positionsHistory.perTrade', 'trade')}
                </span>
              </span>
            </div>
          </AppTooltip>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-line/70 pt-3">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-1 text-[11px]">
              <AppTooltip
                description={t(
                  'positionsHistory.avgWLTooltip',
                  'Average profit on winning trades versus average loss on losing trades.'
                )}
              >
                <span
                  tabIndex={0}
                  className="text-fg-muted truncate cursor-help border-b border-dashed border-fg-muted/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
                >
                  {t('positionsHistory.avgWL', 'Avg W/L')}
                </span>
              </AppTooltip>

              <AppTooltip
                description={t(
                  'positionsHistory.riskRewardTooltip',
                  'Realized Risk-to-Reward ratio (Average Win divided by Average Loss magnitude).'
                )}
              >
                <span
                  tabIndex={0}
                  className="font-mono text-[10px] text-fg-muted tabular-nums shrink-0 cursor-help border-b border-dashed border-fg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
                >
                  {stats.riskRewardRatio !== null
                    ? `${stats.riskRewardRatio.toFixed(2)} ${t('positionsHistory.riskReward', 'R:R')}`
                    : `-- ${t('positionsHistory.riskReward', 'R:R')}`}
                </span>
              </AppTooltip>
            </div>
            <div className="text-xs font-mono tabular-nums font-semibold mt-1 flex flex-wrap items-center gap-x-1">
              <span className="text-success">
                {!isPrivateMode ? '+' : ''}
                {formatCurrency(stats.avgWin, 'usd', 2)}
              </span>
              <span className="text-fg-muted">/</span>
              <span className="text-danger">
                {formatCurrency(stats.avgLoss, 'usd', 2)}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-1 text-[11px]">
              <AppTooltip
                description={t(
                  'positionsHistory.largestWLTooltip',
                  'Single largest winning trade versus single largest losing trade in the selected period.'
                )}
              >
                <span
                  tabIndex={0}
                  className="text-fg-muted truncate cursor-help border-b border-dashed border-fg-muted/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
                >
                  {t('positionsHistory.largestWL', 'Largest W/L')}
                </span>
              </AppTooltip>

              <span className="text-[10px] text-fg-muted truncate">
                {t('positionsHistory.maxExtremes', 'Extremes')}
              </span>
            </div>
            <div className="text-xs font-mono tabular-nums font-semibold mt-1 flex flex-wrap items-center gap-x-1">
              <span className="text-success">
                {!isPrivateMode ? '+' : ''}
                {formatCurrency(stats.largestWin, 'usd', 2)}
              </span>
              <span className="text-fg-muted">/</span>
              <span className="text-danger">
                {formatCurrency(stats.largestLoss, 'usd', 2)}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
