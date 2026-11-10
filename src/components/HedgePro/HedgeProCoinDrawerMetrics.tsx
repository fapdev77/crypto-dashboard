import React from 'react';
import { useTranslation } from 'react-i18next';
import { HedgeCoinSummary } from '../../utils/hedgeUtils';
import { AppTooltip } from '../ui/Tooltip';
import { HedgePnlConceptMode } from './HedgeProDashboard';

interface HedgeProCoinDrawerMetricsProps {
  coin: HedgeCoinSummary;
  formatCurrency: (
    value: number | undefined | null,
    type?: 'usd' | 'crypto' | 'price' | 'compact',
    decimalsOrSymbol?: number | string,
  ) => string;
  pnlConceptMode?: HedgePnlConceptMode;
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
export function HedgeProCoinDrawerMetrics({
  coin,
  formatCurrency,
  pnlConceptMode = 'hedge',
}: HedgeProCoinDrawerMetricsProps) {
  const { t } = useTranslation();
  const isNetProtectedPositive = coin.netProtectedUsd >= 0;
  const isUplPositive = coin.unrealizedPnlUsd > 0;
  const isUplNegative = coin.unrealizedPnlUsd < 0;

  // Colors and labels depending on mode
  let uplLabel = t('hedgePro.drawer.unrealizedPnl');
  let uplTooltip = t('hedgePro.drawer.unrealizedPnlTooltip');
  let uplColor = isUplPositive ? 'text-[#00C853]' : isUplNegative ? 'text-[#FF4444]' : 'text-[#8E9299]';

  if (pnlConceptMode === 'hedge') {
    if (isUplNegative) {
      uplLabel = t('hedgePro.drawer.opportunityCost');
      uplColor = 'text-amber-400';
      uplTooltip = t('hedgePro.drawer.opportunityCostTooltip');
    } else if (isUplPositive) {
      uplLabel = t('hedgePro.drawer.accumulatedAsset');
      uplColor = 'text-[#00C853]';
      uplTooltip = t('hedgePro.drawer.accumulatedAssetTooltip');
    } else {
      uplLabel = t('hedgePro.drawer.hedgeBalanced');
      uplColor = 'text-[#8E9299]';
      uplTooltip = t('hedgePro.drawer.hedgeBalancedTooltip');
    }
  }

  const isRplPositive = coin.realizedPnlUsd > 0;
  const isRplNegative = coin.realizedPnlUsd < 0;
  const rplColor = isRplPositive ? 'text-[#00C853]' : isRplNegative ? 'text-[#FF4444]' : 'text-[#8E9299]';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
      {/* Card 1: Wallet Balance */}
      <div className="p-2.5 rounded-lg bg-[#151619] border border-[#26282d] flex flex-col justify-between">
        <AppTooltip
          description={t('hedgePro.drawer.walletBalanceTooltip')}
          side="top"
        >
          <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium cursor-help border-b border-dashed border-[#8E9299]/50 w-fit">
            {t('hedgePro.drawer.walletBalance')}
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
          description={t('hedgePro.drawer.netBalanceTooltip')}
          side="top"
        >
          <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium cursor-help border-b border-dashed border-[#8E9299]/50 w-fit">
            {t('hedgePro.drawer.netBalance')}
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
        className={`p-2.5 rounded-lg border flex flex-col justify-between ${isNetProtectedPositive
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-red-500/5 border-red-500/20'
          }`}
      >
        <div className="flex items-center justify-between">
          <AppTooltip
            description={t('hedgePro.drawer.realHedgeTooltip')}
            side="top"
          >
            <span
              className={`text-[10px] uppercase font-bold tracking-wider cursor-help border-b border-dashed ${isNetProtectedPositive
                  ? 'text-emerald-400 border-emerald-500/40'
                  : 'text-red-400 border-red-500/40'
                }`}
            >
              {t('hedgePro.drawer.realHedge')}
            </span>
          </AppTooltip>
          <span
            className={`text-[10px] font-mono font-semibold ${isNetProtectedPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
          >
            {coin.realHedgeProtectedPct.toFixed(1)}%
          </span>
        </div>
        <div className="mt-1">
          <div
            className={`font-mono text-sm font-semibold ${isNetProtectedPositive ? 'text-emerald-400' : 'text-red-400'
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
            description={t('hedgePro.drawer.protOfEqTooltip')}
            side="top"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider cursor-help border-b border-dashed border-emerald-500/40">
              {t('hedgePro.drawer.protOfEq')}
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
        className={`p-2.5 rounded-lg border flex flex-col justify-between ${coin.leveragedUsd > 0
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-[#151619] border-[#26282d]'
          }`}
      >
        <div className="flex items-center justify-between">
          <AppTooltip
            description={t('hedgePro.drawer.leveragedTooltip')}
            side="top"
          >
            <span
              className={`text-[10px] uppercase font-bold tracking-wider cursor-help border-b border-dashed ${coin.leveragedUsd > 0 ? 'text-amber-400 border-amber-500/40' : 'text-[#8E9299] border-[#8E9299]/50'
                }`}
            >
              {t('hedgePro.drawer.leveraged')}
            </span>
          </AppTooltip>
          <span
            className={`text-[10px] font-mono font-semibold ${coin.leveragedUsd > 0 ? 'text-amber-400' : 'text-[#8E9299]'
              }`}
          >
            {coin.leveragedOfEquityPct.toFixed(1)}%
          </span>
        </div>
        <div className="mt-1">
          <div
            className={`font-mono text-sm font-semibold ${coin.leveragedUsd > 0 ? 'text-amber-400' : 'text-white'
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
      <div className="p-2.5 rounded-lg bg-[#151619] border border-[#26282d] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <AppTooltip
            description={t('hedgePro.drawer.exposedTooltip')}
            side="top"
          >
            <span className="text-[10px] uppercase font-bold text-white tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50">
              {t('hedgePro.drawer.exposed')}
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

      {/* Card 7: Unrealized PnL / Opportunity Cost / Accumulated Asset */}
      <div className="p-2.5 rounded-lg bg-[#151619] border border-[#26282d] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <AppTooltip description={uplTooltip} side="top">
            <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium cursor-help border-b border-dashed border-[#8E9299]/50 truncate max-w-[90px]">
              {uplLabel}
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
            description={t('hedgePro.drawer.realizedPnlTooltip')}
            side="top"
          >
            <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium cursor-help border-b border-dashed border-[#8E9299]/50">
              {t('hedgePro.drawer.realizedPnl')}
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
