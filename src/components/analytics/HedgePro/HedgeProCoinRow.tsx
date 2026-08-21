import React from 'react';
import { ChevronDown, AlertTriangle, ShieldCheck, Activity, TrendingUp } from 'lucide-react';
import { HedgeCoinSummary, getExchangeDisplayName } from '../../../utils/hedgeUtils';
import { CoinIcon } from '../../ui/CoinIcon';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { AccountTypeBadge } from '../../ui/AccountTypeBadge';
import { AppTooltip } from '../../ui/Tooltip';
import { HedgeExposureBar } from './HedgeExposureBar';
import { HedgePositionLevelRow } from './HedgePositionLevelRow';

interface HedgeProCoinRowProps {
  coin: HedgeCoinSummary;
  isExpanded: boolean;
  onToggle: () => void;
  formatCurrency: (value: number | undefined | null, type?: 'usd' | 'crypto' | 'price' | 'compact', decimalsOrSymbol?: number | string) => string;
}

/** Format coin crypto value nicely */
function formatCoinValue(
  value: number | undefined | null,
  coin: string,
  formatCurrency: HedgeProCoinRowProps['formatCurrency']
): string {
  const isFiat = /USD|USDT|USDC|EUR|BRL/i.test(coin);
  return formatCurrency(value, 'crypto', isFiat ? 2 : 8);
}

/**
 * HedgeProCoinRow — Row-based layout for per-coin hedge summary:
 * - Line 1: Asset info, tags, exchange, account, position counters & risk alert icon.
 * - Line 2: Dedicated exposure & protection visual bar with leverage metrics.
 * - Expanded Drawer: 6 analytical summary cards (Wallet, Net, Protected, Exposed, Unrealized PnL, Realized PnL) + interactive position rows with direct navigation to Open Positions.
 */
export function HedgeProCoinRow({ coin, isExpanded, onToggle, formatCurrency }: HedgeProCoinRowProps) {
  // Exposure calculations
  const exposedBaseUsd = Math.max(0, coin.balanceUsd - coin.protectedUsd);
  const capitalRef = coin.balanceUsd > 0 ? coin.balanceUsd : coin.protectedUsd + exposedBaseUsd;
  const barTotal = capitalRef + coin.leveragedUsd;
  const balanceWidthPct = barTotal > 0 ? (capitalRef / barTotal) * 100 : 0;
  const leveragedWidthPct = barTotal > 0 ? (coin.leveragedUsd / barTotal) * 100 : 0;
  const protectedPct = capitalRef > 0 ? (coin.protectedUsd / capitalRef) * 100 : 0;
  const exposedPct = capitalRef > 0 ? (exposedBaseUsd / capitalRef) * 100 : 0;
  const leveragedOfBalancePct =
    capitalRef > 0 ? (coin.leveragedUsd / capitalRef) * 100 : coin.leveragedUsd > 0 ? 100 : 0;

  // Mini-Consolidated Metrics (matching HedgeProKpis logic per coin)
  const netBalanceUsd = coin.netBalanceUsd;
  const denomUsd = netBalanceUsd > 0 ? netBalanceUsd : (coin.walletBalanceUsd > 0 ? coin.walletBalanceUsd : 1);
  
  // Real Hedge Protected = (Protected - Leveraged) / Net Balance
  const netProtectedUsd = coin.protectedUsd - coin.leveragedUsd;
  const netProtectedSize = coin.protectedSize - coin.leveragedSize;
  const realHedgeProtectedPct = (netProtectedUsd / denomUsd) * 100;
  const isNetProtectedPositive = netProtectedUsd >= 0;

  // Protected of Equity = Protected / Net Balance
  const protectedOfEquityPct = (coin.protectedUsd / denomUsd) * 100;

  // Leveraged of Equity = Leveraged / Net Balance
  const leveragedOfEquityPct = (coin.leveragedUsd / denomUsd) * 100;

  const isUplPositive = coin.unrealizedPnlUsd > 0;
  const isUplNegative = coin.unrealizedPnlUsd < 0;
  const uplColor = isUplPositive ? 'text-[#00C853]' : isUplNegative ? 'text-[#FF4444]' : 'text-[#8E9299]';

  const isRplPositive = coin.realizedPnlUsd > 0;
  const isRplNegative = coin.realizedPnlUsd < 0;
  const rplColor = isRplPositive ? 'text-[#00C853]' : isRplNegative ? 'text-[#FF4444]' : 'text-[#8E9299]';

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
            <AppTooltip description="Protected capital locked in USD by inverse shorts">
              <span className="flex items-center gap-1.5 cursor-help">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Protected
              </span>
            </AppTooltip>

            <AppTooltip description="Exposed capital subject to market fluctuations">
              <span className="flex items-center gap-1.5 cursor-help">
                <Activity className="w-3.5 h-3.5 text-white" /> Exposed
              </span>
            </AppTooltip>

            {coin.leveragedUsd > 0 ? (
              <AppTooltip description="Leveraged positions extending beyond base capital">
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
                ({protectedPct.toFixed(1)}%)
              </span>
            </span>

            <span className="text-white">
              {formatCurrency(coin.exposedBaseUsd, 'usd', 2)}{' '}
              <span className="text-[11px] sm:text-xs font-medium text-[#a0a5ad] font-mono">
                ({exposedPct.toFixed(1)}%)
              </span>
            </span>

            {coin.leveragedUsd > 0 ? (
              <span className="text-amber-400">
                +{formatCurrency(coin.leveragedUsd, 'usd', 2)}{' '}
                <span className="text-[11px] sm:text-xs font-medium text-amber-400/80 font-mono">
                  (+{leveragedOfBalancePct.toFixed(1)}%)
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
            protectedPct={protectedPct}
            exposedPct={exposedPct}
            balanceWidthPct={balanceWidthPct}
            leveragedWidthPct={leveragedWidthPct}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {/* Card 1: Wallet Balance */}
            <div className="p-2.5 rounded-lg bg-[#151619] border border-[#26282d] flex flex-col justify-between">
              <AppTooltip
                description="Fixed gross wallet balance in futures account without unrealized PnL (initial deposit + accumulated realized PnL)."
                side="top"
              >
                <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium cursor-help border-b border-dashed border-[#8E9299]/50 w-fit">
                  Wallet Balance
                </span>
              </AppTooltip>
              <div className="mt-1">
                <div className="font-mono text-white text-sm font-semibold">
                  {formatCurrency(coin.walletBalanceUsd, 'usd', 2)}
                </div>
                <div className="font-mono text-[11px] text-[#8E9299] truncate">
                  {formatCoinValue(coin.walletBalance, coin.baseCoin, formatCurrency)} {coin.baseCoin}
                </div>
              </div>
            </div>

            {/* Card 2: Net Balance */}
            <div className="p-2.5 rounded-lg bg-[#151619] border border-[#26282d] flex flex-col justify-between">
              <AppTooltip
                description="Liquid equity value of this coin if all positions were closed right now (Wallet Balance + Unrealized PnL)."
                side="top"
              >
                <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium cursor-help border-b border-dashed border-[#8E9299]/50 w-fit">
                  Net Balance
                </span>
              </AppTooltip>
              <div className="mt-1">
                <div className="font-mono text-white text-sm font-semibold">
                  {formatCurrency(coin.netBalanceUsd, 'usd', 2)}
                </div>
                <div className="font-mono text-[11px] text-[#8E9299] truncate">
                  {formatCoinValue(coin.netBalance, coin.baseCoin, formatCurrency)} {coin.baseCoin}
                </div>
              </div>
            </div>

            {/* Card 3: Real Hedge Protected */}
            <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
              isNetProtectedPositive
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/20'
            }`}>
              <div className="flex items-center justify-between">
                <AppTooltip
                  description="Real net protection of this coin = (Protected USD − Total Leveraged USD) ÷ Net Balance USD. Negative values indicate long leverage exceeds short protection."
                  side="top"
                >
                  <span className={`text-[10px] uppercase font-bold tracking-wider cursor-help border-b border-dashed ${
                    isNetProtectedPositive ? 'text-emerald-400 border-emerald-500/40' : 'text-red-400 border-red-500/40'
                  }`}>
                    Real Hedge
                  </span>
                </AppTooltip>
                <span className={`text-[10px] font-mono font-semibold ${
                  isNetProtectedPositive ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {realHedgeProtectedPct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1">
                <div className={`font-mono text-sm font-semibold ${
                  isNetProtectedPositive ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {formatCurrency(netProtectedUsd, 'usd', 2)}
                </div>
                <div className="font-mono text-[11px] text-[#8E9299] truncate">
                  {formatCoinValue(netProtectedSize, coin.baseCoin, formatCurrency)} {coin.baseCoin}
                </div>
              </div>
            </div>

            {/* Card 4: Protected of Equity */}
            <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <AppTooltip
                  description="Portion of this coin's equity locked in USD by short hedge positions (Protected USD ÷ Net Balance USD)."
                  side="top"
                >
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider cursor-help border-b border-dashed border-emerald-500/40">
                    Prot. of Eq.
                  </span>
                </AppTooltip>
                <span className="text-[10px] font-mono font-semibold text-emerald-400">
                  {protectedOfEquityPct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1">
                <div className="font-mono text-emerald-400 text-sm font-semibold">
                  {formatCurrency(coin.protectedUsd, 'usd', 2)}
                </div>
                <div className="font-mono text-[11px] text-[#8E9299] truncate">
                  {formatCoinValue(coin.protectedSize, coin.baseCoin, formatCurrency)} {coin.baseCoin}
                </div>
              </div>
            </div>

            {/* Card 5: Total Leveraged */}
            <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
              coin.leveragedUsd > 0
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-[#151619] border-[#26282d]'
            }`}>
              <div className="flex items-center justify-between">
                <AppTooltip
                  description="Total notional value of inverse long positions for this coin. Longs represent directional leverage and add market risk."
                  side="top"
                >
                  <span className={`text-[10px] uppercase font-bold tracking-wider cursor-help border-b border-dashed ${
                    coin.leveragedUsd > 0 ? 'text-amber-400 border-amber-500/40' : 'text-[#8E9299] border-[#8E9299]/50'
                  }`}>
                    Leveraged
                  </span>
                </AppTooltip>
                <span className={`text-[10px] font-mono font-semibold ${
                  coin.leveragedUsd > 0 ? 'text-amber-400' : 'text-[#8E9299]'
                }`}>
                  {leveragedOfEquityPct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1">
                <div className={`font-mono text-sm font-semibold ${
                  coin.leveragedUsd > 0 ? 'text-amber-400' : 'text-white'
                }`}>
                  {coin.leveragedUsd > 0 ? '+' : ''}{formatCurrency(coin.leveragedUsd, 'usd', 2)}
                </div>
                <div className="font-mono text-[11px] text-[#8E9299] truncate">
                  {formatCoinValue(coin.leveragedSize, coin.baseCoin, formatCurrency)} {coin.baseCoin}
                </div>
              </div>
            </div>

            {/* Card 6: Exposed */}
            <div className="p-2.5 rounded-lg bg-[#151619] border border-[#2a2b30] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <AppTooltip
                  description="Uncovered coin balance not hedged by shorts (Exposed USD ÷ Net Balance USD). Fully exposed to spot market volatility."
                  side="top"
                >
                  <span className="text-[10px] uppercase font-bold text-white tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50">
                    Exposed
                  </span>
                </AppTooltip>
                <span className="text-[10px] font-mono font-semibold text-white">{exposedPct.toFixed(1)}%</span>
              </div>
              <div className="mt-1">
                <div className="font-mono text-white text-sm font-semibold">
                  {formatCurrency(coin.exposedBaseUsd, 'usd', 2)}
                </div>
                <div className="font-mono text-[11px] text-[#8E9299] truncate">
                  {formatCoinValue(coin.exposedSize, coin.baseCoin, formatCurrency)} {coin.baseCoin}
                </div>
              </div>
            </div>

            {/* Card 7: Unrealized PnL & ROI */}
            <div className="p-2.5 rounded-lg bg-[#151619] border border-[#26282d] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <AppTooltip
                  description="Aggregated unrealized profit/loss across all short and long positions for this coin, plus total ROI relative to wallet balance."
                  side="top"
                >
                  <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium cursor-help border-b border-dashed border-[#8E9299]/50">
                    Unrealized PnL
                  </span>
                </AppTooltip>
                <span className={`text-[10px] font-mono font-semibold ${uplColor}`}>
                  {coin.roiPct > 0 ? '+' : ''}{coin.roiPct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-1">
                <div className={`font-mono text-sm font-semibold ${uplColor}`}>
                  {isUplPositive ? '+' : ''}{formatCurrency(coin.unrealizedPnlUsd, 'usd', 2)}
                </div>
                <div className={`font-mono text-[11px] truncate ${uplColor}`}>
                  {isUplPositive ? '+' : ''}{formatCoinValue(coin.unrealizedPnl, coin.baseCoin, formatCurrency)} {coin.baseCoin}
                </div>
              </div>
            </div>

            {/* Card 8: Realized PnL & ROI */}
            <div className="p-2.5 rounded-lg bg-[#151619] border border-[#26282d] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <AppTooltip
                  description="Aggregated realized profit/loss across all positions for this coin (funding fees, trade commissions, closed legs), plus ROI relative to wallet balance."
                  side="top"
                >
                  <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium cursor-help border-b border-dashed border-[#8E9299]/50">
                    Realized PnL
                  </span>
                </AppTooltip>
                <span className={`text-[10px] font-mono font-semibold ${rplColor}`}>
                  {coin.realizedRoiPct > 0 ? '+' : ''}{coin.realizedRoiPct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-1">
                <div className={`font-mono text-sm font-semibold ${rplColor}`}>
                  {isRplPositive ? '+' : ''}{formatCurrency(coin.realizedPnlUsd, 'usd', 2)}
                </div>
                <div className={`font-mono text-[11px] truncate ${rplColor}`}>
                  {isRplPositive ? '+' : ''}{formatCoinValue(coin.realizedPnl, coin.baseCoin, formatCurrency)} {coin.baseCoin}
                </div>
              </div>
            </div>
          </div>

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
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HedgeProCoinRow;
