import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { HedgePositionLevels } from '../../../utils/hedgeUtils';
import { AppTooltip } from '../../ui/Tooltip';
import { formatPrice } from '../../../utils/formatters';
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
  const isLong = !level.isShort;
  const sideLabel = level.isShort ? 'Short' : 'Long';
  const marginModeLabel = level.marginMode === 'isolated' ? 'Isolated' : 'Cross';
  const sideColor = isLong ? 'text-[#00C853]' : 'text-[#FF4444]';
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
  let uplLabel = 'Unrealized PnL';
  let uplTooltip = 'Position unrealized profit/loss calculated from entry price and mark price.';
  let uplColor =
    level.unrealizedPnlUsd > 0
      ? 'text-[#00C853]'
      : level.unrealizedPnlUsd < 0
        ? 'text-[#FF4444]'
        : 'text-[#8E9299]';

  if (pnlConceptMode === 'hedge') {
    if (level.isShort) {
      if (level.unrealizedPnlUsd < 0) {
        uplLabel = 'Opportunity Cost';
        uplColor = 'text-amber-400';
        uplTooltip = 'Uncaptured market upside on the USD-locked hedge leg since entry price. Your locked USD capital remains intact while uncovered balance gained.';
      } else if (level.unrealizedPnlUsd > 0) {
        uplLabel = 'Accumulated Asset';
        uplColor = 'text-[#00C853]';
        uplTooltip = 'Extra coin units accumulated by this short position to maintain the original USD protection as spot price decreased.';
      } else {
        uplLabel = 'Hedge Balanced';
        uplTooltip = 'Position currently at entry price.';
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
      className="p-3.5 space-y-2.5 bg-[#121316] hover:bg-[#16181d] transition-colors"
    >
      {/* Position Header & Direct Link */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNavigateToOpenPositions}
            className="flex items-center gap-1.5 font-bold text-white text-xs hover:text-[#2F6BFF] transition-colors group cursor-pointer"
            title="Jump to position in Open Positions"
          >
            <span>{level.symbol}</span>
            <ExternalLink className="w-3 h-3 text-[#8E9299] group-hover:text-[#2F6BFF] transition-colors" />
          </button>
          <span className={`text-[11px] font-semibold ${sideColor}`}>
            {sideLabel} {level.leverage}x · {marginModeLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-[#8E9299]">
            Entry: <span className="text-white font-medium">{formatPrice(level.entryPrice, isFiatPair)}</span>
          </span>
          <span className="text-[#8E9299]">
            Mark: <span className="text-white font-medium">{formatPrice(level.markPrice, isFiatPair)}</span>
          </span>
          <span className="text-[#8E9299]">
            Size:{' '}
            <span className="text-white font-medium">
              {formatCoin(level.openPosSize, level.ccy, formatCurrency)} {level.ccy}
            </span>
          </span>
        </div>
      </div>

      {/* Metrics Row / Card Form */}
      {variant === 'card' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#23252a] text-xs font-mono">
          <div className="flex flex-col">
            <AppTooltip description="Initial notional position size valued at entry price." side="top">
              <span className="text-[10px] text-[#8E9299] uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50 w-fit">
                Initial Position Value
              </span>
            </AppTooltip>
            <span className="font-semibold text-white">
              {formatCurrency(level.initialValueUsd ?? level.entryUsd ?? level.positionValueUsd, 'usd', 2)}
            </span>
            <span className="text-[10px] text-[#8E9299]">
              {formatCoin(level.initialSizeInCoin ?? level.openPosSize, level.ccy, formatCurrency)} {level.ccy}
            </span>
          </div>

          <div className="flex flex-col">
            <AppTooltip description="Capital locked in USD by this short position at entry price." side="top">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider cursor-help border-b border-dashed border-emerald-500/40 w-fit">
                Protected
              </span>
            </AppTooltip>
            <span className="font-semibold text-emerald-400">
              {formatCurrency(level.protectedUsd, 'usd', 2)}{' '}
              <span className="text-[10px] font-normal">({protectedPct.toFixed(1)}%)</span>
            </span>
            <span className="text-[10px] text-[#8E9299]">
              {formatCoin(protectedAmount, level.ccy, formatCurrency)} {level.ccy}
            </span>
          </div>

          <div className="flex flex-col">
            <AppTooltip description="Unhedged coin balance portion subject to market price action." side="top">
              <span className="text-[10px] text-white uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50 w-fit">
                Exposed
              </span>
            </AppTooltip>
            <span className="font-semibold text-white">
              {formatCurrency(level.exposedBaseUsd, 'usd', 2)}{' '}
              <span className="text-[10px] font-normal text-[#8E9299]">({exposedPct.toFixed(1)}%)</span>
            </span>
            <span className="text-[10px] text-[#8E9299]">
              {formatCoin(exposedQty, level.ccy, formatCurrency)} {level.ccy}
            </span>
          </div>

          <div className="flex flex-col">
            <AppTooltip description={uplTooltip} side="top">
              <span className="text-[10px] text-[#8E9299] uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50 w-fit truncate max-w-[130px]">
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
            <span className="text-[#8E9299]">
              Protected: <span className="font-mono text-emerald-400">{formatCurrency(level.protectedUsd, 'usd', 2)}</span>
            </span>
            <span className="text-[#8E9299]">
              Exposed: <span className="font-mono text-white">{formatCurrency(level.exposedBaseUsd, 'usd', 2)}</span>
            </span>
            {!level.isShort && (
              <span className="text-[#8E9299]">
                Leveraged: <span className="font-mono text-amber-400">{formatCurrency(level.positionValueUsd, 'usd', 2)}</span>
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
              ? 'No matching coin balance found — this position has no identified coverage.'
              : 'Leveraged! Focus on risk management! Always have a stop in place!'}
          </span>
        </div>
      )}
    </div>
  );
}

export default HedgePositionLevelRow;
