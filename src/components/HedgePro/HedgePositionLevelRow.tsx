import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HedgePositionLevels } from '../../utils/hedgeUtils';
import { AppTooltip } from '../ui/Tooltip';
import { formatPrice } from '../../utils/formatters';
import { HedgeExposureBar } from './HedgeExposureBar';
import { HedgePnlConceptMode } from './HedgeProDashboard';

interface RowProps {
  level: HedgePositionLevels;
  formatCurrency: (
    value: number | undefined | null,
    type?: 'usd' | 'crypto' | 'price' | 'compact',
    decimalsOrSymbol?: number | string
  ) => string;
  /**
   * 'table' (default): full row with the Protected/Exposed/Leveraged bar.
   * 'card': compact form used inside the expandable coin summary rows.
   */
  variant?: 'table' | 'card';
  pnlConceptMode?: HedgePnlConceptMode;
}

/** Format a coin quantity for display (mirrors PositionCard formatCcy behavior). */
function formatCoin(value: number, ccy: string, formatCurrency: RowProps['formatCurrency']): string {
  const isFiatCcy = /USD|USDT|USDC|EUR|BRL/i.test(ccy);
  return formatCurrency(value, 'crypto', isFiatCcy ? 2 : 8);
}

/**
 * A single position's hedge level row used inside the expandable coin summary rows.
 */
export function HedgePositionLevelRow({
  level,
  formatCurrency,
  variant = 'table',
  pnlConceptMode = 'hedge',
}: RowProps) {
  const { t } = useTranslation();
  const isLong = !level.isShort;
  const sideLabel = level.isShort ? 'Short' : 'Long';
  const marginModeLabel = level.marginMode === 'isolated' ? t('hedgePro.positions.isolated') : t('hedgePro.positions.cross');
  const sideColor = isLong ? 'text-success' : 'text-danger';
  const isFiatPair = /USD|USDT|USDC|EUR|BRL/i.test(level.symbol);

  // Pre-calculated bar and exposure metrics from hedgeUtils
  const {
    balanceWidthPct,
    leveragedWidthPct,
    protectedPct,
    exposedPct,
  } = level.barMetrics;

  const exposedQty = level.exposedAmount;
  const protectedAmount = level.protectedAmount;

  // Labels and tooltips for PnL / Concept
  let uplLabel = t('hedgePro.drawer.unrealizedPnl');
  let uplTooltip = t('hedgePro.positions.unrealizedPnlTooltip');
  let uplColor =
    level.unrealizedPnlUsd > 0
      ? 'text-success'
      : level.unrealizedPnlUsd < 0
        ? 'text-danger'
        : 'text-fg-muted';

  if (pnlConceptMode === 'hedge') {
    if (level.isShort) {
      if (level.unrealizedPnlUsd < 0) {
        uplLabel = t('hedgePro.drawer.opportunityCost');
        uplColor = 'text-amber-400';
        uplTooltip = t('hedgePro.positions.opportunityCostTooltip');
      } else if (level.unrealizedPnlUsd > 0) {
        uplLabel = t('hedgePro.drawer.accumulatedAsset');
        uplColor = 'text-success';
        uplTooltip = t('hedgePro.positions.accumulatedAssetTooltip');
      } else {
        uplLabel = t('hedgePro.drawer.hedgeBalanced');
        uplTooltip = t('hedgePro.positions.hedgeBalancedTooltip');
      }
    }
  }

  const handleNavigateToOpenPositions = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('navigate-to-tab', {
        detail: {
          tab: 'positions-open',
          targetId: `pos-card-${level.positionId}`,
        },
      })
    );
  };

  return (
    <div
      id={`hedge-pos-${level.positionId}`}
      className="p-3.5 space-y-2.5 bg-canvas hover:bg-[#16181d] transition-colors"
    >
      {/* Position Header & Direct Link */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNavigateToOpenPositions}
            className="flex items-center gap-1.5 font-bold text-fg text-xs hover:text-accent transition-colors group cursor-pointer"
            title={t('hedgePro.positions.jumpToPosition')}
          >
            <span>{level.symbol}</span>
            <ExternalLink className="w-3 h-3 text-fg-muted group-hover:text-accent transition-colors" />
          </button>
          <span className={`text-[11px] font-semibold ${sideColor}`}>
            {sideLabel} {level.leverage}x · {marginModeLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-fg-muted">
            {t('hedgePro.positions.entry')}{' '}
            <span className="text-fg font-medium">{formatPrice(level.entryPrice, isFiatPair)}</span>
          </span>
          <span className="text-fg-muted">
            {t('hedgePro.positions.mark')}{' '}
            <span className="text-fg font-medium">{formatPrice(level.markPrice, isFiatPair)}</span>
          </span>
          <span className="text-fg-muted">
            {t('hedgePro.positions.size')}{' '}
            <span className="text-fg font-medium">
              {formatCoin(level.openPosSize, level.ccy, formatCurrency)} {level.ccy}
            </span>
          </span>
        </div>
      </div>

      {/* Metrics Row / Card Form */}
      {variant === 'card' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#23252a] text-xs font-mono">
          <div className="flex flex-col">
            <AppTooltip description={t('hedgePro.positions.initialPositionValueTooltip')} side="top">
              <span className="text-[10px] text-fg-muted uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50 w-fit">
                {t('hedgePro.positions.initialPositionValue')}
              </span>
            </AppTooltip>
            <span className="font-semibold text-fg">
              {formatCurrency(level.initialValueUsd ?? level.entryUsd ?? level.positionValueUsd, 'usd', 2)}
            </span>
            <span className="text-[10px] text-fg-muted">
              {formatCoin(level.initialSizeInCoin ?? level.openPosSize, level.ccy, formatCurrency)} {level.ccy}
            </span>
          </div>

          <div className="flex flex-col">
            <AppTooltip description={t('hedgePro.positions.protectedTooltip')} side="top">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider cursor-help border-b border-dashed border-emerald-500/40 w-fit">
                {t('hedgePro.positions.protected')}
              </span>
            </AppTooltip>
            <span className="font-semibold text-emerald-400">
              {formatCurrency(level.protectedUsd, 'usd', 2)}{' '}
              <span className="text-[10px] font-normal">({protectedPct.toFixed(1)}%)</span>
            </span>
            <span className="text-[10px] text-fg-muted">
              {formatCoin(protectedAmount, level.ccy, formatCurrency)} {level.ccy}
            </span>
          </div>

          <div className="flex flex-col">
            <AppTooltip description={t('hedgePro.positions.exposedTooltip')} side="top">
              <span className="text-[10px] text-fg uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50 w-fit">
                {t('hedgePro.positions.exposed')}
              </span>
            </AppTooltip>
            <span className="font-semibold text-fg">
              {formatCurrency(level.exposedBaseUsd, 'usd', 2)}{' '}
              <span className="text-[10px] font-normal text-fg-muted">({exposedPct.toFixed(1)}%)</span>
            </span>
            <span className="text-[10px] text-fg-muted">
              {formatCoin(exposedQty, level.ccy, formatCurrency)} {level.ccy}
            </span>
          </div>

          <div className="flex flex-col">
            <AppTooltip description={uplTooltip} side="top">
              <span className="text-[10px] text-fg-muted uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50 w-fit truncate max-w-[130px]">
                {uplLabel}
              </span>
            </AppTooltip>
            <span className={`font-semibold ${uplColor}`}>
              {level.unrealizedPnlUsd > 0 ? '+' : ''}
              {formatCurrency(level.unrealizedPnlUsd, 'usd', 2)}
            </span>
            <span className={`text-[10px] ${uplColor}`}>
              {level.unrealizedPnl > 0 ? '+' : ''}
              {formatCoin(level.unrealizedPnl, level.ccy, formatCurrency)} {level.ccy}
            </span>
          </div>
        </div>
      ) : (
        <>
          <HedgeExposureBar
            protectedPct={protectedPct}
            exposedPct={exposedPct}
            balanceWidthPct={balanceWidthPct}
            leveragedWidthPct={leveragedWidthPct}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <span className="text-fg-muted">
              {t('hedgePro.positions.protected')}: <span className="font-mono text-emerald-400">{formatCurrency(level.protectedUsd, 'usd', 2)}</span>
            </span>
            <span className="text-fg-muted">
              {t('hedgePro.positions.exposed')}: <span className="font-mono text-fg">{formatCurrency(level.exposedBaseUsd, 'usd', 2)}</span>
            </span>
            {!level.isShort && (
              <span className="text-fg-muted">
                {t('hedgePro.drawer.leveraged')}: <span className="font-mono text-amber-400">{formatCurrency(level.positionValueUsd, 'usd', 2)}</span>
              </span>
            )}
          </div>
        </>
      )}

      {level.overexposed && (
        <div className="flex items-start gap-1 py-1.5 px-2 bg-amber-500/10 border border-amber-500/20 rounded">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span className="text-[9.5px] text-amber-300 font-medium leading-tight">
            {level.isShort
              ? t('hedgePro.positions.noCoverageWarning')
              : t('hedgePro.positions.leveragedWarning')}
          </span>
        </div>
      )}
    </div>
  );
}

export default HedgePositionLevelRow;

