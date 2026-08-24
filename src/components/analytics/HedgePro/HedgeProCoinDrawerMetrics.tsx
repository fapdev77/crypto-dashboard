import React from 'react';
import { HedgeCoinSummary } from '../../../utils/hedgeUtils';
import { AppTooltip } from '../../ui/Tooltip';

interface HedgeProCoinDrawerMetricsProps {
  coin: HedgeCoinSummary;
  formatCurrency: (
    value: number | undefined | null,
    type?: 'usd' | 'crypto' | 'price' | 'compact',
    decimalsOrSymbol?: number | string,
  ) => string;
}

/** Format coin crypto value nicely */
function formatCoinValue(
  value: number | undefined | null,
  coin: string,
  formatCurrency: HedgeProCoinDrawerMetricsProps['formatCurrency'],
): string {
  const isFiat = /USD|USDT|USDC|EUR|BRL/i.test(coin);
  return formatCurrency(value, 'crypto', isFiat ? 2 : 8);
}

/**
 * HedgeProCoinDrawerMetrics — Renders the 8 analytical summary cards for a specific coin in the expanded drawer.
 */
export function HedgeProCoinDrawerMetrics({ coin, formatCurrency }: HedgeProCoinDrawerMetricsProps) {
  const isNetProtectedPositive = coin.netProtectedUsd >= 0;
  const isUplPositive = coin.unrealizedPnlUsd > 0;
  const isUplNegative = coin.unrealizedPnlUsd < 0;
  const uplColor = isUplPositive ? 'text-[#00C853]' : isUplNegative ? 'text-[#FF4444]' : 'text-[#8E9299]';

  const isRplPositive = coin.realizedPnlUsd > 0;
  const isRplNegative = coin.realizedPnlUsd < 0;
  const rplColor = isRplPositive ? 'text-[#00C853]' : isRplNegative ? 'text-[#FF4444]' : 'text-[#8E9299]';

  return (
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
      <div
        className={`p-2.5 rounded-lg border flex flex-col justify-between ${
          isNetProtectedPositive
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-red-500/5 border-red-500/20'
        }`}
      >
        <div className="flex items-center justify-between">
          <AppTooltip
            description="Real net protection of this coin = (Protected USD − Total Leveraged USD) ÷ Net Balance USD. Negative values indicate long leverage exceeds short protection."
            side="top"
          >
            <span
              className={`text-[10px] uppercase font-bold tracking-wider cursor-help border-b border-dashed ${
                isNetProtectedPositive
                  ? 'text-emerald-400 border-emerald-500/40'
                  : 'text-red-400 border-red-500/40'
              }`}
            >
              Real Hedge
            </span>
          </AppTooltip>
          <span
            className={`text-[10px] font-mono font-semibold ${
              isNetProtectedPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {coin.realHedgeProtectedPct.toFixed(1)}%
          </span>
        </div>
        <div className="mt-1">
          <div
            className={`font-mono text-sm font-semibold ${
              isNetProtectedPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(coin.netProtectedUsd, 'usd', 2)}
          </div>
          <div className="font-mono text-[11px] text-[#8E9299] truncate">
            {formatCoinValue(coin.netProtectedSize, coin.baseCoin, formatCurrency)} {coin.baseCoin}
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
            {coin.protectedOfEquityPct.toFixed(1)}%
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
      <div
        className={`p-2.5 rounded-lg border flex flex-col justify-between ${
          coin.leveragedUsd > 0
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-[#151619] border-[#26282d]'
        }`}
      >
        <div className="flex items-center justify-between">
          <AppTooltip
            description="Total notional value of inverse long positions for this coin. Longs represent directional leverage and add market risk."
            side="top"
          >
            <span
              className={`text-[10px] uppercase font-bold tracking-wider cursor-help border-b border-dashed ${
                coin.leveragedUsd > 0 ? 'text-amber-400 border-amber-500/40' : 'text-[#8E9299] border-[#8E9299]/50'
              }`}
            >
              Leveraged
            </span>
          </AppTooltip>
          <span
            className={`text-[10px] font-mono font-semibold ${
              coin.leveragedUsd > 0 ? 'text-amber-400' : 'text-[#8E9299]'
            }`}
          >
            {coin.leveragedOfEquityPct.toFixed(1)}%
          </span>
        </div>
        <div className="mt-1">
          <div
            className={`font-mono text-sm font-semibold ${
              coin.leveragedUsd > 0 ? 'text-amber-400' : 'text-white'
            }`}
          >
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
          <span className="text-[10px] font-mono font-semibold text-white">
            {coin.barMetrics.exposedPct.toFixed(1)}%
          </span>
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
  );
}
