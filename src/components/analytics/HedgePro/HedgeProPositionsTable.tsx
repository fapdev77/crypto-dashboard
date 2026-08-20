import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { HedgePositionLevels } from '../../../utils/hedgeUtils';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../../ui/Pagination';
import { CoinIcon } from '../../ui/CoinIcon';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { AccountTypeBadge } from '../../ui/AccountTypeBadge';
import { AppTooltip } from '../../ui/Tooltip';
import { formatPrice } from '../../../utils/formatters';
import { HedgeExposureBar } from './HedgeExposureBar';

const ROWS_PER_PAGE = 25;

interface RowProps {
  level: HedgePositionLevels;
  formatCurrency: (value: number | undefined | null, type?: 'usd' | 'crypto' | 'price' | 'compact', decimalsOrSymbol?: number | string) => string;
  /**
   * 'table' (default): full row with the Protected/Exposed/Leveraged bar.
   * 'card': compact form used inside the expandable coin summary cards — no
   * P/E/L bars (already shown in the card summary) and no long leveraged alert.
   */
  variant?: 'table' | 'card';
}

/** Format a coin quantity for display (mirrors PositionCard formatCcy behavior). */
function formatCoin(value: number, ccy: string, formatCurrency: RowProps['formatCurrency']): string {
  const isFiatCcy = /USD|USDT|USDC|EUR|BRL/i.test(ccy);
  return formatCurrency(value, 'crypto', isFiatCcy ? 2 : 8);
}

/**
 * Side badge shared by the position row and the collapsed table header, following
 * the Open Orders pattern: `SHORT 1x Cross` (side · leverage · margin mode).
 */
function getSideBadge(level: HedgePositionLevels) {
  const isLong = !level.isShort;
  const marginMode = level.marginMode === 'isolated' ? 'Isolated' : 'Cross';
  return {
    isLong,
    sideLabel: `${level.side.toUpperCase()} ${level.leverage}x ${marginMode}`,
    color: isLong ? 'text-[#00C853]' : 'text-[#FF4444]',
  };
}

/**
 * A single position's hedge level row. Shared between the positions table and the
 * expandable coin summary cards (pass `variant="card"` there).
 */
export function HedgePositionLevelRow({ level, formatCurrency, variant = 'table' }: RowProps) {
  const { isLong, sideLabel, color: sideColor } = getSideBadge(level);
  const isFiatPair = /USD|USDT|USDC|EUR|BRL/i.test(level.symbol);

  // Beyond-100% bar: Protected + Exposed = 100% of the position's capital reference
  // (the matching balance); Leveraged (longs) extends beyond. Percentages are of the
  // capital reference; the track is scaled so balance + leveraged fills the row width.
  const capitalRef = level.assetBalUsd > 0 ? level.assetBalUsd : level.protectedUsd + level.exposedBaseUsd;
  const barTotal = capitalRef + level.leveragedUsd;
  const balanceWidthPct = barTotal > 0 ? (capitalRef / barTotal) * 100 : 0;
  const leveragedWidthPct = barTotal > 0 ? (level.leveragedUsd / barTotal) * 100 : 0;
  const protectedPct = capitalRef > 0 ? (level.protectedUsd / capitalRef) * 100 : 0;
  const exposedPct = capitalRef > 0 ? (level.exposedBaseUsd / capitalRef) * 100 : 0;
  const leveragedOfBalancePct =
    capitalRef > 0 ? (level.leveragedUsd / capitalRef) * 100 : level.leveragedUsd > 0 ? 100 : 0;

  // Exposed quantity in the asset (exposed USD at mark price).
  const exposedQty = level.markPrice > 0 ? level.exposedUsd / level.markPrice : 0;

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {/* Symbol + side */}
        <div className="flex items-center gap-2 min-w-[150px] flex-wrap">
          <CoinIcon symbol={level.symbol} className="w-5 h-5" />
          <span className="text-white font-medium">{level.symbol}</span>
          <ExchangeIcon exchange={level.exchange} className="w-4 h-4" />
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${isLong ? 'bg-emerald-500/10' : 'bg-red-500/10'} ${sideColor}`}>
            {sideLabel}
          </span>
          {level.label && (
            <span className="text-[10px] font-medium text-[#c0c5cc] bg-[#1a1c20] border border-[#2d3036] py-0.5 px-1.5 rounded-[4px] truncate max-w-[110px]">
              {level.label}
            </span>
          )}
          <AccountTypeBadge
            exchange={level.exchange}
            accountType={level.accountType}
          />
        </div>

        {/* Entry / Mark */}
        <div className="flex items-center gap-3 text-xs">
          <AppTooltip description="Average entry price of the position.">
            <span className="cursor-help border-b border-dashed border-[#8E9299]/40">
              <span className="text-[#8E9299]">Entry: </span>
              <span className="font-mono text-white">{formatPrice(level.entryPrice, isFiatPair)}</span>
            </span>
          </AppTooltip>
          <AppTooltip description="Current mark price.">
            <span className="cursor-help border-b border-dashed border-[#8E9299]/40">
              <span className="text-[#8E9299]">Mark: </span>
              <span className="font-mono text-white">{formatPrice(level.markPrice, isFiatPair)}</span>
            </span>
          </AppTooltip>
        </div>
      </div>

      {variant === 'card' ? (
        <>
          {/* Compact card details: no P/E/L bars (already in the coin summary card).
              Only the position's relevant numbers: entry/mark above, then size,
              protected USD, total balance (+ USD), exposed quantity (+ USD) and
              PnL (unrealized + realized, in coin and USD). */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="text-[#8E9299]">Size</span>
              <span className="font-mono text-white truncate">{formatCoin(level.openPosSize, level.baseCoin, formatCurrency)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8E9299]">Protected</span>
              <span className="font-mono text-emerald-400 truncate">{formatCurrency(level.protectedUsd, 'usd', 2)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8E9299]">Balance</span>
              <span className="font-mono text-white truncate">{formatCoin(level.totalAssetBal, level.baseCoin, formatCurrency)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8E9299]">Balance (USD)</span>
              <span className="font-mono text-white truncate">{formatCurrency(level.assetBalUsd, 'usd', 2)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8E9299]">Exposed</span>
              <span className="font-mono text-white truncate">{formatCoin(exposedQty, level.baseCoin, formatCurrency)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8E9299]">Exposed (USD)</span>
              <span className="font-mono text-white truncate">{formatCurrency(level.exposedUsd, 'usd', 2)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8E9299]">Unrealized PnL</span>
              <span className={`font-mono truncate ${level.unrealizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                {level.unrealizedPnl > 0 ? '+' : ''}{formatCoin(level.unrealizedPnl, level.ccy, formatCurrency)} {level.ccy}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8E9299]">Unrealized PnL (USD)</span>
              <span className={`font-mono truncate ${level.unrealizedPnlUsd >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                ≈ {formatCurrency(level.unrealizedPnlUsd, 'usd', 2)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8E9299]">Realized PnL</span>
              <span className={`font-mono truncate ${level.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                {level.realizedPnl > 0 ? '+' : ''}{formatCoin(level.realizedPnl, level.ccy, formatCurrency)} {level.ccy}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8E9299]">Realized PnL (USD)</span>
              <span className={`font-mono truncate ${level.realizedPnlUsd >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                ≈ {formatCurrency(level.realizedPnlUsd, 'usd', 2)}
              </span>
            </div>
          </div>

          {/* Short-only no-balance alert. The long leveraged alert is intentionally
              omitted in the card variant — the summary card already flags leverage. */}
          {level.overexposed && level.isShort && (
            <div className="flex items-start gap-1 py-1.5 px-2 bg-amber-500/10 border border-amber-500/20 rounded">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-[9.5px] text-amber-300 font-medium leading-tight">
                No matching coin balance found — this position has no identified coverage.
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Protected / Exposed / Leveraged bar (beyond-100% model) */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-[10px] font-mono leading-none">
              <span className="text-emerald-400">P {protectedPct.toFixed(1)}%</span>
              <span className="text-white">E {exposedPct.toFixed(1)}%</span>
              {leveragedOfBalancePct > 0 && (
                <span className="text-amber-400">L +{leveragedOfBalancePct.toFixed(1)}%</span>
              )}
            </div>
            <HedgeExposureBar
              protectedPct={protectedPct}
              exposedPct={exposedPct}
              balanceWidthPct={balanceWidthPct}
              leveragedWidthPct={leveragedWidthPct}
            />
            <div className="flex justify-between text-[9px] font-mono text-[#8E9299] leading-none">
              <span>Bal: {formatCoin(level.totalAssetBal, level.baseCoin, formatCurrency)}</span>
              <span>Pos: {formatCoin(level.openPosSize, level.baseCoin, formatCurrency)}</span>
            </div>
          </div>

          {/* USD amounts */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <span className="text-[#8E9299]">
              Protected: <span className="font-mono text-emerald-400">{formatCurrency(level.protectedUsd, 'usd', 2)}</span>
            </span>
            <span className="text-[#8E9299]">
              Exposed: <span className="font-mono text-white">{formatCurrency(level.exposedUsd, 'usd', 2)}</span>
            </span>
            {!level.isShort && (
              <span className="text-[#8E9299]">
                Leveraged: <span className="font-mono text-amber-400">{formatCurrency(level.positionValueUsd, 'usd', 2)}</span>
              </span>
            )}
          </div>

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
        </>
      )}
    </div>
  );
}

interface HedgeProPositionsTableProps {
  levels: HedgePositionLevels[];
  formatCurrency: RowProps['formatCurrency'];
}

/** Per-position hedge level table with pagination. */
export function HedgeProPositionsTable({ levels, formatCurrency }: HedgeProPositionsTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { page, setPage, paginated, totalItems } = usePagination(levels, ROWS_PER_PAGE, [levels]);

  if (levels.length === 0) {
    return (
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 text-center">
        <p className="text-sm text-[#8E9299]">No inverse positions found with the current filters.</p>
      </div>
    );
  }

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2b30]">
        <h3 className="text-sm font-medium text-white">Hedge Levels per Position</h3>
        <span className="text-xs text-[#8E9299]">{totalItems} positions</span>
      </div>

      {paginated.map(level => {
        const { isLong, sideLabel, color: sideColor } = getSideBadge(level);
        return (
          <div key={level.positionId} className="border-b border-[#2a2b30] last:border-b-0">
            <button
              type="button"
              onClick={() => toggle(level.positionId)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2 text-left hover:bg-[#1a1b1e] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <CoinIcon symbol={level.symbol} className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium text-[#c9cbcf]">{level.symbol}</span>
                <ExchangeIcon exchange={level.exchange} className="w-3.5 h-3.5 shrink-0" />
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${isLong ? 'bg-emerald-500/10' : 'bg-red-500/10'} ${sideColor}`}>
                  {sideLabel}
                </span>
                <AccountTypeBadge
                  exchange={level.exchange}
                  accountType={level.accountType}
                />
              </div>
              {expanded[level.positionId] ? (
                <ChevronDown className="w-4 h-4 text-[#8E9299] shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#8E9299] shrink-0" />
              )}
            </button>
            {expanded[level.positionId] && <HedgePositionLevelRow level={level} formatCurrency={formatCurrency} />}
          </div>
        );
      })}

      <Pagination
        currentPage={page}
        totalItems={totalItems}
        itemsPerPage={ROWS_PER_PAGE}
        onPageChange={setPage}
      />
    </div>
  );
}

export default HedgeProPositionsTable;
