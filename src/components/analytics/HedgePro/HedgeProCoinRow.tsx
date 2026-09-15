import React from 'react';
import { ChevronDown, AlertTriangle, ShieldCheck, Activity, TrendingUp } from 'lucide-react';
import { HedgeCoinSummary, getExchangeDisplayName } from '../../../utils/hedgeUtils';
import { CoinIcon } from '../../ui/CoinIcon';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { AccountTypeBadge } from '../../ui/AccountTypeBadge';
import { AppTooltip } from '../../ui/Tooltip';
import { HedgeExposureBar } from './HedgeExposureBar';
import { HedgePositionLevelRow } from './HedgePositionLevelRow';
import { HedgeProCoinDrawerMetrics } from './HedgeProCoinDrawerMetrics';
import { HedgePnlConceptMode } from './HedgeProDashboard';

interface HedgeProCoinRowProps {
  coin: HedgeCoinSummary;
  isExpanded: boolean;
  onToggle: () => void;
  formatCurrency: (
    value: number | undefined | null,
    type?: 'usd' | 'crypto' | 'price' | 'compact',
    decimalsOrSymbol?: number | string,
  ) => string;
  pnlConceptMode?: HedgePnlConceptMode;
}

/**
 * HedgeProCoinRow — Row-based layout for per-coin hedge summary:
 * - Line 1: Asset info, tags, exchange, account, position counters & risk alert icon.
 * - Line 2: Dedicated exposure & protection visual bar with leverage metrics.
 * - Expanded Drawer: 8 analytical summary cards + interactive position rows with direct navigation to Open Positions.
 */
export function HedgeProCoinRow({
  coin,
  isExpanded,
  onToggle,
  formatCurrency,
  pnlConceptMode = 'hedge',
}: HedgeProCoinRowProps) {
  const { barMetrics } = coin;

  return (
    <div
      id={`hedge-row-${coin.key}`}
      className="bg-[#151619] border border-[#2a2b30] rounded-xl flex flex-col cursor-pointer transition-colors hover:border-[#3a3b40] overflow-hidden"
      onClick={onToggle}
    >
      {/* Main Row: 2-Line Clean Layout */}
      <div className="p-4 flex flex-col gap-3">
        {/* LINE 1: Asset details, exchange, account, positions counter, risk icon & expand trigger */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Coin Icon + Symbols + Badges */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center relative shrink-0">
              <CoinIcon symbol={coin.baseCoin} size={32} className="w-8 h-8" />
              <div className="bg-[#151619] rounded-full p-0.5 absolute -bottom-1 -right-1 border border-[#2a2b30]">
                <ExchangeIcon exchange={coin.exchange} className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-base tracking-tight">{coin.baseCoin}</span>
              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#202226] border border-[#34373c] text-[#a0a5ad] uppercase">
                INVERSE
              </span>
              <span className="text-[10px] font-semibold text-white bg-[#202226] border border-[#34373c] py-0.5 px-1.5 rounded-[4px] capitalize">
                {getExchangeDisplayName(coin.exchange)}
              </span>
              <span
                className="text-[10px] font-semibold text-[#a0a5ad] bg-[#202226] border border-[#34373c] py-0.5 px-1.5 rounded-[4px] truncate max-w-[130px]"
                title={coin.accountLabel}
              >
                {coin.accountLabel}
              </span>
              <AccountTypeBadge exchange={coin.exchange} accountType={coin.accountType} />

              {/* Position counter & Risk Alert Icon (integrated together without text) */}
              <div className="flex items-center gap-1.5 ml-1">
                <AppTooltip description={`Positions: ${coin.longCount} Long(s) and ${coin.shortCount} Short(s)`}>
                  <span className="text-[10px] font-mono bg-[#1a1b1e] border border-[#2a2b30] px-1.5 py-0.5 rounded flex items-center gap-1 cursor-help">
                    <span className="text-[#00C853] font-medium">{coin.longCount}L</span>
                    <span className="text-[#8E9299]">/</span>
                    <span className="text-[#FF4444] font-medium">{coin.shortCount}S</span>
                  </span>
                </AppTooltip>

                {coin.overexposedCount > 0 && (
                  <AppTooltip description={`${coin.overexposedCount} position(s) with uncovered risk or overexposure`}>
                    <span className="inline-flex items-center justify-center p-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 cursor-help">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                  </AppTooltip>
                )}
              </div>
            </div>
          </div>

          {/* Right: Positions count badge & Expand Chevron */}
          <div className="flex items-center gap-2 shrink-0 text-[#8E9299]">
            <span className="text-[11px] font-mono bg-[#1a1b1e] border border-[#2a2b30] px-2 py-0.5 rounded text-[#a0a5ad]">
              {coin.positions.length} {coin.positions.length === 1 ? 'position' : 'positions'}
            </span>
            <div
              className={`p-1 rounded hover:bg-[#202226] text-[#8E9299] hover:text-white transition-transform duration-200 ${
                isExpanded ? 'rotate-180 text-white' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* LINE 2: Dedicated row for Exposure, Protection & Leverage Bar (Matching main Hedge Pro pattern) */}
        <div className="bg-[#121317] border border-[#23252a] rounded-lg p-3 space-y-2">
          {/* Sub-line 1: Icons & Labels */}
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#8E9299] uppercase tracking-wider">
            <AppTooltip description="Protected capital locked in USD by inverse shorts at entry price">
              <span className="flex items-center gap-1.5 cursor-help">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Protected
              </span>
            </AppTooltip>

            <AppTooltip description="Unhedged spot balance exposed to market price movements">
              <span className="flex items-center gap-1.5 cursor-help">
                <Activity className="w-3.5 h-3.5 text-white" /> Exposed
              </span>
            </AppTooltip>

            {coin.leveragedUsd > 0 ? (
              <AppTooltip description="Directional long positions adding leveraged market exposure">
                <span className="flex items-center gap-1.5 cursor-help">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Leveraged
                </span>
              </AppTooltip>
            ) : (
              <span className="hidden sm:flex items-center gap-1.5 text-[#555861]">
                <TrendingUp className="w-3.5 h-3.5 text-[#555861]" /> No Leverage
              </span>
            )}
          </div>

          {/* Sub-line 2: USD Value and (%) */}
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold font-mono">
            <span className="text-emerald-400">
              {formatCurrency(coin.protectedUsd, 'usd', 2)}{' '}
              <span className="text-[11px] sm:text-xs font-medium text-emerald-400/80 font-mono">
                ({barMetrics.protectedPct.toFixed(1)}%)
              </span>
            </span>

            <span className="text-white">
              {formatCurrency(coin.exposedBaseUsd, 'usd', 2)}{' '}
              <span className="text-[11px] sm:text-xs font-medium text-[#a0a5ad] font-mono">
                ({barMetrics.exposedPct.toFixed(1)}%)
              </span>
            </span>

            {coin.leveragedUsd > 0 ? (
              <span className="text-amber-400">
                +{formatCurrency(coin.leveragedUsd, 'usd', 2)}{' '}
                <span className="text-[11px] sm:text-xs font-medium text-amber-400/80 font-mono">
                  (+{(barMetrics.leveragedOfBalancePct ?? 0).toFixed(1)}%)
                </span>
              </span>
            ) : (
              <span className="hidden sm:inline-block text-[#555861] font-mono text-xs">
                $0.00 (0.0%)
              </span>
            )}
          </div>

          {/* Sub-line 3: The visual bar */}
          <HedgeExposureBar
            protectedPct={barMetrics.protectedPct}
            exposedPct={barMetrics.exposedPct}
            balanceWidthPct={barMetrics.balanceWidthPct}
            leveragedWidthPct={barMetrics.leveragedWidthPct}
          />
        </div>
      </div>

      {/* Expanded Details Drawer */}
      {isExpanded && (
        <div
          className="px-4 pb-4 pt-3 bg-[#101116] border-t border-[#2a2b30] animate-in slide-in-from-top-2 duration-200 space-y-4"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Summary Cards for this specific coin (8 Mini-Consolidated Cards) */}
          <HedgeProCoinDrawerMetrics
            coin={coin}
            formatCurrency={formatCurrency}
            pnlConceptMode={pnlConceptMode}
          />

          {/* Positions Under This Coin */}
          <div className="border border-[#26282d] rounded-lg bg-[#151619] overflow-hidden divide-y divide-[#222429]">
            <div className="px-3.5 py-2 bg-[#1a1b1e] border-b border-[#26282d] flex items-center justify-between">
              <span className="text-xs font-semibold text-white">
                Open Positions for {coin.baseCoin} ({coin.positions.length})
              </span>
              <span className="text-[11px] text-[#8E9299]">
                Click symbol to navigate and highlight in Open Positions
              </span>
            </div>
            {coin.positions.map(pos => (
              <HedgePositionLevelRow
                key={pos.positionId}
                level={pos}
                formatCurrency={formatCurrency}
                variant="card"
                pnlConceptMode={pnlConceptMode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HedgeProCoinRow;
