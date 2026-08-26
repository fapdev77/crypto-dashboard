import React from 'react';
import { UnifiedPosition } from '../types';
import { formatValue, formatPrice } from '../utils/formatters';
import { CoinIcon } from './ui/CoinIcon';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { AssetClassifierAggregator } from '../services/AssetClassifierAggregator';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { usePrivacy } from '../context/PrivacyContext';
import { AppTooltip } from './ui/Tooltip';
import { getInverseUsdValues, getOpenPositionSizeAndValue } from '../utils/inverseUtils';
import { getHedgePositionLevels } from '../utils/hedgeUtils';
import { HedgeExposureBar } from './analytics/HedgePro/HedgeExposureBar';
import { usePositionsStore } from '../store/positionsStore';
import { useSettingsStore } from '../store/settingsStore';
import { useBalancesStore } from '../store/balancesStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { AccountTypeBadge } from './ui/AccountTypeBadge';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface PositionCardProps {
  pos: UnifiedPosition;
  isExpanded: boolean;
  onToggle: () => void;
}

export function PositionCard({ pos, isExpanded, onToggle }: PositionCardProps) {
  const balances = useBalancesStore(state => state.balances);
  const hedgeExposedMode = useSettingsStore(state => state.hedgeExposedMode);
  const setHedgeExposedMode = useSettingsStore(state => state.setHedgeExposedMode);
  const keys = useApiKeysStore(state => state.keys);
  const formatCurrency = useFormatCurrency();
  const { isPrivateMode } = usePrivacy();

  const isLong = pos.side === 'long';
  const isShort = pos.side === 'short';
  const sideColor = isLong ? 'text-[#00C853]' : isShort ? 'text-[#FF4444]' : 'text-gray-400';
  const sideLabel = isLong ? 'Long' : isShort ? 'Short' : 'Net';
  const marginModeLabel = pos.marginMode === 'isolated' ? 'Isolated' : 'Cross';

  const uplColor = pos.unrealizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';
  const roeColor = (pos.roe || 0) >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';
  const realizedPnlColor = pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';

  const fundingFee = pos.accumulatedFunding ? parseFloat(pos.accumulatedFunding) : 0;
  const tradingFee = pos.accumulatedTradingFee ? parseFloat(pos.accumulatedTradingFee) : 0;
  const closedPnl = pos.closedPnl !== undefined ? pos.closedPnl : 0;

  // Normalize inverse PnL to USD values
  const inverseVals = getInverseUsdValues(pos);

  // Approximations using normalized USD values where helpful
  const { positionValueUsd: sizeValUsd } = getOpenPositionSizeAndValue(pos);
  const posCcy = pos.ccy || pos.baseCoin || 'USDT';

  const isFiatPair = pos.symbol.toUpperCase().includes('USD') || pos.symbol.toUpperCase().includes('EUR') || pos.symbol.toUpperCase().includes('BRL');
  const isFiatCcy = posCcy.toUpperCase().includes('USD') || posCcy.toUpperCase() === 'EUR' || posCcy.toUpperCase() === 'BRL';
  const formatCcy = (v: number | undefined | null) => formatCurrency(v, 'crypto', isFiatCcy ? 2 : 8);

  const category = AssetClassifierAggregator.getGlobalCategorySync(pos.symbol);

  // Inverse Protection / Exposure logic via centralized hedgeUtils with active mode
  const hedgeLevels = getHedgePositionLevels(pos, Object.values(balances), hedgeExposedMode);

  const posTypeStr = pos.instrumentType === 'INVERSE' ? 'CM Perpetual Inverse' :
    (pos.instrumentType && pos.instrumentType !== 'PERP') ?
      pos.instrumentType.charAt(0).toUpperCase() + pos.instrumentType.slice(1).toLowerCase() :
      'Perpetual';
  const posTitle = `${pos.symbol} ${posTypeStr}`;
  const baseCoinClean = pos.baseCoin || pos.symbol.replace(/USDT|USDC|USD|EUR|BUSD|BTC$/i, '');

  const handleNavigateToHedgePro = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetCoin = (pos.baseCoin || baseCoinClean).toUpperCase();
    const targetId = `hedge-row-${pos.connectionId}:${targetCoin}`;
    window.dispatchEvent(
      new CustomEvent('navigate-to-tab', {
        detail: {
          tab: 'analytics-hedge-pro',
          targetId: targetId,
        },
      })
    );
  };

  const entryPriceTooltipProps = {
    side: "top" as const,
    description: (
      <div className="flex flex-col gap-1 w-full max-w-[250px]">
        <span className="text-[13px] font-medium text-white tracking-wide font-sans">
          Entry Price
        </span>
        <p className="text-[12px] text-[#8E9299] leading-snug">
          Current position average price.
        </p>
      </div>
    )
  };

  const markPriceTooltipProps = {
    side: "top" as const,
    description: (
      <div className="flex flex-col gap-1 w-full max-w-[280px]">
        <span className="text-[13px] font-medium text-white tracking-wide font-sans">
          Mark Price
        </span>
        <p className="text-[12px] text-[#8E9299] leading-snug">
          The mark price is determined by the real-time index price and the upcoming funding rate, reflecting the current fair price of the futures. The mark price is used to calculate the unrealized PnL of the position and trigger liquidations.
        </p>
      </div>
    )
  };

  const unrealizedPnlTooltipProps = {
    side: "top" as const,
    description: (
      <div className="flex flex-col gap-1 w-full max-w-[280px]">
        <span className="text-[13px] font-medium text-white tracking-wide font-sans">
          Unrealized PnL
        </span>
        <p className="text-[12px] text-[#8E9299] leading-snug">
          Unrealized PnL calculation.
        </p>
      </div>
    )
  };

  const liqPriceTooltipProps = {
    side: "top" as const,
    description: (
      <div className="flex flex-col gap-1 w-full max-w-[280px]">
        <span className="text-[13px] font-medium text-white tracking-wide font-sans">
          Est. Liq. Price
        </span>
        <p className="text-[12px] text-[#8E9299] leading-snug">
          The estimated price at which an open position will be liquidated. This price is for reference only. The actual liquidation price is determined when your maintenance margin ratio drops to 100% or lower and your position is liquidated or reduced.
        </p>
      </div>
    )
  };

  const marginTooltipProps = {
    side: "top" as const,
    description: (
      <div className="flex flex-col gap-1 w-full max-w-[280px]">
        <span className="text-[13px] font-medium text-white tracking-wide font-sans">
          Margin
        </span>
        <p className="text-[12px] text-[#8E9299] leading-snug">
          The margin allocated to your open position.
        </p>
      </div>
    )
  };

  const maintenanceMarginTooltipProps = {
    side: "top" as const,
    description: (
      <div className="flex flex-col gap-1 w-full max-w-[280px]">
        <span className="text-[13px] font-medium text-white tracking-wide font-sans">
          {pos.exchange === 'okx' ? 'Maintenance Margin Ratio (MMR)' : 'Maintenance Margin'}
        </span>
        <p className="text-[12px] text-[#8E9299] leading-snug">
          {pos.exchange === 'okx'
            ? 'Maintenance margin ratio (MMR) is a risk metric for your positions. The lower the maintenance margin ratio, the higher the risk. When the maintenance margin ratio reaches or drops below 100%, your positions will be reduced or liquidated.'
            : 'The minimum amount of margin that must be maintained to keep the position open. If the margin drops below this value, the position will be liquidated.'}
        </p>
      </div>
    )
  };

  const sizeTooltipProps = {
    side: "top" as const,
    description: (
      <div className="flex flex-col gap-2 w-full min-w-[220px]">
        <div className="text-[13px] font-medium text-white border-b border-[#2a2b30] pb-2 tracking-wide font-sans">
          {posTitle}
        </div>
      </div>
    ),
    rows: [
      {
        label: 'Side',
        value: sideLabel,
        labelClassName: 'text-[12px] text-[#8E9299]',
        valueClassName: `text-[12px] font-medium ${sideColor}`
      },
      {
        label: 'Number of contracts',
        value: `${formatCurrency(Math.abs(pos.size), 'crypto')} contracts`,
        labelClassName: 'text-[12px] text-[#8E9299]',
        valueClassName: 'text-[12px] font-mono text-white'
      },
      {
        label: 'Total crypto',
        value: `${pos.instrumentType === 'INVERSE' ? formatCurrency(hedgeLevels.openPosSize, 'crypto', 8) : formatCurrency(Math.abs(pos.size), 'crypto')} ${baseCoinClean}`,
        labelClassName: 'text-[12px] text-[#8E9299]',
        valueClassName: 'text-[12px] font-mono text-white'
      },
      {
        label: 'Total value',
        value: `${formatCurrency(sizeValUsd, 'usd', 2)} USD`,
        labelClassName: 'text-[12px] text-[#8E9299]',
        valueClassName: 'text-[12px] font-mono text-white'
      }
    ]
  };

  return (
    <div
      id={`pos-card-${pos.id}`}
      className="bg-[#151619] border border-[#2a2b30] rounded-xl flex flex-col cursor-pointer transition-colors hover:border-[#3a3b40]"
      onClick={onToggle}
    >
      {/* Main Row / Lite Info */}
      <div className="p-4 grid grid-cols-2 lg:grid-cols-7 gap-4">

        {/* Asset info */}
        <div className="flex items-center gap-3 w-full border-b border-[#2a2b30] md:border-none pb-3 md:pb-0 col-span-2 lg:col-span-1">
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="flex items-center relative">
              <CoinIcon symbol={pos.symbol} size={28} className="w-7 h-7" category={category} />
              <div className="bg-[#151619] rounded-full p-0.5 absolute -bottom-1 -right-1">
                <ExchangeIcon exchange={pos.exchange} className="w-3.5 h-3.5" />
              </div>
            </div>
            {pos.instrumentType && (
              <span className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded bg-[#2a2b30] border border-[#3a3b40] text-[#a0a5ad] uppercase">
                {pos.instrumentType}
              </span>
            )}
            <span className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded bg-[#2a2b30] border border-[#3a3b40] text-[#a0a5ad] uppercase">
              {category}
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-bold text-white text-sm">{pos.symbol}</span>
            </div>
            <span className={`text-xs mt-0.5 font-medium ${sideColor}`}>
              {sideLabel} <span className="mx-0.5 text-[#8E9299]">·</span> {pos.leverage}x <span className="mx-0.5 text-[#8E9299]">·</span> {marginModeLabel}
            </span>
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <span className="w-max text-[10px] font-semibold text-white bg-[#202226] border border-[#34373c] py-0.5 px-1.5 rounded-[4px] capitalize">
                {pos.label}
              </span>
              <AccountTypeBadge
                exchange={pos.exchange}
                accountType={pos.accountType || keys.find(k => k.id === pos.connectionId)?.accountType}
              />
            </div>
          </div>
        </div>

        {/* Size / Value */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
          <AppTooltip {...sizeTooltipProps}>
            <div className="flex flex-col gap-0.5 cursor-help w-max focus:outline-none">
              <span className="text-[10px] text-[#8E9299] uppercase border-b border-dashed border-[#8E9299]/50 w-max">Pos Size / Value</span>
              <span className="font-mono text-white text-sm">{formatCurrency(pos.size, 'crypto')} {baseCoinClean}</span>
              <span className="text-xs text-[#8E9299] font-mono">≈ {formatCurrency(sizeValUsd, 'crypto', 2)} USD</span>
            </div>
          </AppTooltip>
        </div>

        {/* Prices */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
          <div className="flex items-center gap-1">
            <AppTooltip {...entryPriceTooltipProps}>
              <span className="text-[10px] text-[#8E9299] uppercase border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Entry</span>
            </AppTooltip>
            <span className="text-[10px] text-[#8E9299] uppercase">/</span>
            <AppTooltip {...markPriceTooltipProps}>
              <span className="text-[10px] text-[#8E9299] uppercase border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Mark</span>
            </AppTooltip>
          </div>
          <span className="font-mono text-white text-sm">{formatPrice(pos.entryPrice, isFiatPair)}</span>
          <span className="font-mono text-white text-xs">{formatPrice(pos.markPrice, isFiatPair)}</span>
        </div>

        {/* Margin & Liq Price */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
          <div className="flex items-center gap-1">
            <AppTooltip {...liqPriceTooltipProps}>
              <span className="text-[10px] text-[#8E9299] uppercase border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Liq Price</span>
            </AppTooltip>
            <span className="text-[10px] text-[#8E9299] uppercase">/</span>
            <AppTooltip {...marginTooltipProps}>
              <span className="text-[10px] text-[#8E9299] uppercase border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Margin</span>
            </AppTooltip>
          </div>
          <span className="font-mono text-orange-400 text-sm whitespace-nowrap">{formatPrice(pos.liquidationPrice, isFiatPair)}</span>
          <span className="font-mono text-white text-xs">
            {formatCcy(pos.margin)} <span className="font-sans text-[10px] text-[#8E9299]">{posCcy}</span>
          </span>
        </div>

        {/* Unrealized PnL (ROE) */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
          <AppTooltip {...unrealizedPnlTooltipProps}>
            <span className="text-[10px] text-[#8E9299] uppercase border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Unrealized PnL (ROE)</span>
          </AppTooltip>
          <span className={`font-mono text-sm ${uplColor}`}>
            {pos.unrealizedPnl > 0 ? '+' : ''}{formatCcy(pos.unrealizedPnl)} <span className="font-sans text-[10px]">{posCcy}</span>
          </span>
          <AppTooltip description="Return on Equity (ROE) based on Unrealized PnL.">
            <span className={`font-mono text-xs w-max cursor-help border-b border-dashed border-[#8E9299]/50 ${roeColor}`}>
              {inverseVals.isInverse && pos.unrealizedPnl !== undefined ? (pos.unrealizedPnl > 0 ? '+' : '') + formatCurrency(Math.abs(inverseVals.unrealizedPnl), 'usd', 2) + ' / ' : ''}
              {pos.roe !== undefined ? (pos.roe > 0 ? '+' : '') + formatValue(pos.roe, 2) + '%' : '--'}
            </span>
          </AppTooltip>
        </div>

        {/* Realized PnL */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
          <AppTooltip
            side="top"
            description={
              <div className="flex flex-col gap-1 w-full min-w-[180px]">
                <span className="text-[12px] font-medium text-white">Realized PnL</span>
                <span className={`text-[15px] font-mono font-medium ${pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                  {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="text-[11px] font-sans text-[#8E9299]">{posCcy}</span>
                </span>
              </div>
            }
            rows={[
              {
                label: 'Closed PnL',
                value: `${closedPnl > 0 ? '+' : ''}${formatCcy(closedPnl)} ${posCcy}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.closedPnl, 'usd', 2)})` : ''}`,
                labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                valueClassName: `text-[11px] font-mono font-bold ${closedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
              },
              {
                label: 'Funding fee',
                value: `${fundingFee > 0 ? '+' : ''}${formatCcy(fundingFee)} ${posCcy}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.fundingFee, 'usd', 2)})` : ''}`,
                labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                valueClassName: `text-[11px] font-mono font-bold ${fundingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
              },
              {
                label: 'Trading fee',
                value: `${tradingFee > 0 ? '+' : ''}${formatCcy(tradingFee)} ${posCcy}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.tradingFee, 'usd', 2)})` : ''}`,
                labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                valueClassName: `text-[11px] font-mono font-bold ${tradingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
              }
            ]}
          >
            <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Realized PnL</span>
          </AppTooltip>
          <span className={`font-mono text-sm ${realizedPnlColor}`}>
            {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="font-sans text-[10px]">{posCcy}</span>
          </span>
          {inverseVals.isInverse && pos.realizedPnl !== undefined ? (
            <span className={`font-mono text-xs ${realizedPnlColor} opacity-80`}>
              ≈ {pos.realizedPnl > 0 ? '+' : ''}{formatCurrency(Math.abs(inverseVals.realizedPnl), 'usd', 2)} USD
            </span>
          ) : (
            <span className="text-[10px] opacity-0">-</span>
          )}
        </div>

        {/* Inverse - Protected / Exposed */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
          {pos.instrumentType === 'INVERSE' ? (
            <div className="flex items-center gap-1">
              <AppTooltip
                description={
                  hedgeExposedMode === 'net'
                    ? "Indicates the Hedge protection based on Net Equity (Net Balance [Wallet + PnL] - Position = Net Exposed Balance), considering the position's unrealized PnL. Click to view more details in Hedge Pro Dashboard."
                    : "Indicates the Hedge protection based on Total Gross Assets (Wallet Balance - Position = Gross Exposed Balance), not considering the position's PnL. Click to view more details in Hedge Pro Dashboard."
                }
              >
                <button
                  type="button"
                  onClick={handleNavigateToHedgePro}
                  className="text-[10px] text-[#8E9299] hover:text-emerald-400 uppercase w-fit cursor-pointer border-b border-dashed border-[#8E9299]/50 hover:border-emerald-400 transition-colors flex items-center gap-1 group text-left"
                >
                  <span>Hedge / Exposure</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400" />
                </button>
              </AppTooltip>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHedgeExposedMode(hedgeExposedMode === 'gross' ? 'net' : 'gross');
                }}
                className="text-[9px] px-1 py-0.2 rounded bg-[#2a2b30] hover:bg-[#3a3b40] text-[#8E9299] hover:text-white font-mono lowercase border border-transparent hover:border-[#4a4b50] transition-colors cursor-pointer"
                title={`Current mode: ${hedgeExposedMode}. Click to switch to ${hedgeExposedMode === 'gross' ? 'net' : 'gross'}.`}
              >
                {hedgeExposedMode}
              </button>
            </div>
          ) : (
            <AppTooltip description="Position hedge/exposure level">
              <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">
                Hedge / Exposure
              </span>
            </AppTooltip>
          )}
          {pos.instrumentType === 'INVERSE' ? (
            <div
              onClick={handleNavigateToHedgePro}
              className="cursor-pointer group/hedge hover:opacity-90 transition-opacity"
              title="Click to view in Hedge Pro"
            >
              <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                <span className="text-[#00C853]">{hedgeLevels.barMetrics.protectedPct.toFixed(1)}%</span>
                <div className="flex items-center gap-1">
                  <span className="text-white">{hedgeLevels.barMetrics.exposedPct.toFixed(1)}%</span>
                  {hedgeLevels.barMetrics.leveragedWidthPct > 0 && (
                    <span className="text-amber-400 font-semibold" title="Leveraged long exposure">
                      +{((hedgeLevels.barMetrics.leveragedOfBalancePct || 0)).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-1 mb-1 group-hover/hedge:ring-1 group-hover/hedge:ring-emerald-400/40 rounded-full transition-all">
                <HedgeExposureBar
                  protectedPct={hedgeLevels.barMetrics.protectedPct}
                  exposedPct={hedgeLevels.barMetrics.exposedPct}
                  balanceWidthPct={hedgeLevels.barMetrics.balanceWidthPct}
                  leveragedWidthPct={hedgeLevels.barMetrics.leveragedWidthPct}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-[#8E9299] leading-none text-opacity-80">
                <span>{hedgeExposedMode === 'net' ? 'Net:' : 'Bal:'} {formatCcy(hedgeLevels.balanceAmount)}</span>
                <span>Pos: {formatCcy(hedgeLevels.openPosSize)}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center h-full">
              <span className="text-[#8E9299] font-mono">—</span>
            </div>
          )}
        </div>

      </div>

      {/* Detalhes Expandidos: Grid de 5 colunas x 3 linhas */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 bg-[#12131a] border-t border-[#2a2b30] animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-y-5 gap-x-4 text-sm mt-4">

            {/* Linha 1 */}
            <div className="flex flex-col gap-1">
              <AppTooltip {...sizeTooltipProps}>
                <div className="flex flex-col gap-1 cursor-help w-max focus:outline-none">
                  <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Position</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-white">{formatCurrency(pos.size, 'crypto')}</span>
                    <span className="text-[#8E9299] text-xs">≈ {formatCurrency(sizeValUsd, 'crypto', 2)} USD</span>
                  </div>
                </div>
              </AppTooltip>
            </div>
            <div className="flex flex-col gap-1">
              <AppTooltip {...entryPriceTooltipProps}>
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Entry price</span>
              </AppTooltip>
              <span className="font-mono text-white">{formatPrice(pos.entryPrice, isFiatPair)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <AppTooltip {...marginTooltipProps}>
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Margin</span>
              </AppTooltip>
              <span className="font-mono text-white">
                {formatCcy(pos.margin)} <span className="font-sans text-[10px] text-[#8E9299]">{posCcy}</span>
                {posCcy && !posCcy.includes('USD') && pos.margin && pos.markPrice ? (
                  <span className="text-[#8E9299] text-[10px] ml-1">≈ {formatCurrency(pos.margin * pos.markPrice, 'crypto', 2)} USD</span>
                ) : null}
              </span>
            </div>
            <AppTooltip
              side="top"
              description={
                <div className="flex flex-col gap-1 w-full min-w-[180px]">
                  <span className="text-[12px] font-medium text-white">Realized PnL</span>
                  <span className={`text-[15px] font-mono font-medium ${pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                    {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="text-[11px] font-sans text-[#8E9299]">{posCcy}</span>
                  </span>
                </div>
              }
              rows={[
                {
                  label: 'Closed PnL',
                  value: `${closedPnl > 0 ? '+' : ''}${formatCcy(closedPnl)} ${posCcy}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.closedPnl, 'usd', 2)})` : ''}`,
                  labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                  valueClassName: `text-[11px] font-mono font-bold ${closedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                },
                {
                  label: 'Funding fee',
                  value: `${fundingFee > 0 ? '+' : ''}${formatCcy(fundingFee)} ${posCcy}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.fundingFee, 'usd', 2)})` : ''}`,
                  labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                  valueClassName: `text-[11px] font-mono font-bold ${fundingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                },
                {
                  label: 'Trading fee',
                  value: `${tradingFee > 0 ? '+' : ''}${formatCcy(tradingFee)} ${posCcy}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.tradingFee, 'usd', 2)})` : ''}`,
                  labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                  valueClassName: `text-[11px] font-mono font-bold ${tradingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                }
              ]}
            >
              <div className="flex flex-col gap-1 cursor-help w-max focus:outline-none">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Realized PnL</span>
                <span className={`font-mono ${pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                  {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="font-sans text-[10px]">{posCcy}</span>
                  {inverseVals.isInverse && pos.realizedPnl !== undefined ? (
                    <span className="text-[#8E9299] text-[10px] ml-1">≈ {formatCurrency(Math.abs(inverseVals.realizedPnl), 'usd', 2)}</span>
                  ) : null}
                </span>
              </div>
            </AppTooltip>

            {pos.instrumentType === 'INVERSE' ? (
              <div className="col-span-2 md:col-span-1 md:row-span-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <AppTooltip description="Click to view details in Hedge Pro Dashboard">
                    <button
                      type="button"
                      onClick={handleNavigateToHedgePro}
                      className="text-[#8E9299] hover:text-emerald-400 text-xs w-max border-b border-dashed border-[#8E9299]/50 hover:border-emerald-400 cursor-pointer flex items-center gap-1.5 transition-colors group"
                    >
                      <span>Hedge Pro Details ({hedgeExposedMode.toUpperCase()})</span>
                      <ExternalLink className="w-3 h-3 text-emerald-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </AppTooltip>

                  <div className="flex flex-col gap-2.5 mt-1.5">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#8E9299]">
                        {hedgeExposedMode === 'net' ? 'Net Balance (Equity):' : 'Wallet Balance (Gross):'}
                      </span>
                      <span className="font-mono text-white text-[13px]">
                        {formatCcy(hedgeLevels.balanceAmount)} {posCcy} <span className="text-[#8E9299] text-[11px] font-sans">/ {formatCurrency(hedgeLevels.balanceUsd, 'usd', 2)} USD</span>
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] text-emerald-400 font-medium">Protected: {hedgeLevels.barMetrics.protectedPct.toFixed(1)}%</span>
                      <span className="font-mono text-white text-[13px]">
                        {formatCcy(hedgeLevels.protectedAmount)} {posCcy} <span className="text-[#8E9299] text-[11px] font-sans">/ {formatCurrency(hedgeLevels.protectedUsd, 'usd', 2)} USD</span>
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] text-white font-medium">Exposed (Base): {hedgeLevels.barMetrics.exposedPct.toFixed(1)}%</span>
                      <span className="font-mono text-white text-[13px]">
                        {formatCcy(hedgeLevels.markPrice > 0 ? hedgeLevels.exposedBaseUsd / hedgeLevels.markPrice : 0)} {posCcy} <span className="text-[#8E9299] text-[11px] font-sans">/ {formatCurrency(hedgeLevels.exposedBaseUsd, 'usd', 2)} USD</span>
                      </span>
                    </div>

                    {!isShort && hedgeLevels.leveragedUsd > 0 && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-amber-400 font-medium">
                          Leveraged (Long): +{(hedgeLevels.barMetrics.leveragedOfBalancePct || 0).toFixed(1)}%
                        </span>
                        <span className="font-mono text-white text-[13px]">
                          {formatCcy(hedgeLevels.openPosSize)} {posCcy} <span className="text-[#8E9299] text-[11px] font-sans">/ {formatCurrency(hedgeLevels.leveragedUsd, 'usd', 2)} USD</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {hedgeLevels.overexposed && (
                  <div className="flex items-start gap-1 py-1.5 px-2 bg-amber-500/10 border border-amber-500/20 rounded">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-[9.5px] text-amber-300 font-medium leading-tight">
                      {isShort
                        ? 'No matching coin balance found — this position has no identified coverage.'
                        : 'Leveraged! Focus on risk management! Always have a stop in place!'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs">Entire TP/SL</span>
                <span className="font-mono text-white">
                  {pos.tp ? formatPrice(pos.tp, isFiatPair) : '--'} / {pos.sl ? formatPrice(pos.sl, isFiatPair) : '--'}
                </span>
              </div>
            )}

            {/* Linha 2 */}
            <div className="flex flex-col gap-1">
              <AppTooltip {...unrealizedPnlTooltipProps}>
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50 cursor-help focus:outline-none">Unrealized PnL</span>
              </AppTooltip>
              <span className={`font-mono ${uplColor}`}>
                {pos.unrealizedPnl > 0 ? '+' : ''}{formatCcy(pos.unrealizedPnl)} <span className="text-[#8E9299] text-[10px] font-sans ml-1">{posCcy}</span>
                {posCcy && !posCcy.includes('USD') && pos.unrealizedPnl && pos.markPrice ? (
                  <span className="text-[#8E9299] text-[10px] ml-1">≈ {pos.unrealizedPnl > 0 ? '+' : ''}{formatCurrency(Math.abs(pos.unrealizedPnl) * pos.markPrice, 'crypto', 2)} USD</span>
                ) : null}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <AppTooltip {...markPriceTooltipProps}>
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Mark price</span>
              </AppTooltip>
              <span className="font-mono text-white">{formatPrice(pos.markPrice, isFiatPair)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <AppTooltip {...maintenanceMarginTooltipProps}>
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50 cursor-help focus:outline-none">{pos.exchange === 'okx' ? 'Maint. Margin / MMR' : 'Maintenance Margin'}</span>
              </AppTooltip>
              <span className="font-mono text-white">
                {pos.maintenanceMargin !== undefined ? (
                  <>
                    {formatCcy(pos.maintenanceMargin)} <span className="font-sans text-[10px] text-[#8E9299]">{posCcy}</span>
                    {posCcy && !posCcy.includes('USD') && pos.maintenanceMargin && pos.markPrice ? (
                      <span className="text-[#8E9299] text-[10px] ml-1">≈ {formatCurrency(pos.maintenanceMargin * pos.markPrice, 'crypto', 2)} USD</span>
                    ) : null}
                    {pos.marginRatio !== undefined && (
                      <span className="text-orange-400 text-[10px] ml-1">({formatValue(pos.marginRatio, 2)}%)</span>
                    )}
                  </>
                ) : (
                  pos.marginRatio !== undefined ? `${formatValue(pos.marginRatio, 2)}%` : '--'
                )}
              </span>
            </div>
            <AppTooltip
              description={
                <div className="flex flex-col gap-2 w-full">
                  <div className="text-[12px] leading-relaxed text-[#c9cbcf] whitespace-normal border-b border-dashed border-[#8E9299]/50 pb-2">
                    At the breakeven price, your total PnL will be zero if you close your remaining position. Note that the breakeven price, which includes the trading fee and funding fee, is updated every second.
                  </div>
                  <div className="flex flex-col gap-1 w-full min-w-[180px] pt-1">
                    <span className="text-[12px] font-medium text-white">Realized PnL</span>
                    <span className={`text-[15px] font-mono font-medium ${pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                      {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="text-[11px] font-sans text-[#8E9299]">{posCcy}</span>
                    </span>
                  </div>
                </div>
              }
              side="top"
              rows={[
                {
                  label: 'Closed PnL',
                  value: `${closedPnl > 0 ? '+' : ''}${formatCcy(closedPnl)} ${posCcy}`,
                  labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                  valueClassName: `text-[11px] font-mono font-bold ${closedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                },
                {
                  label: 'Funding fee',
                  value: `${fundingFee > 0 ? '+' : ''}${formatCcy(fundingFee)} ${posCcy}`,
                  labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                  valueClassName: `text-[11px] font-mono font-bold ${fundingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                },
                {
                  label: 'Trading fee',
                  value: `${tradingFee > 0 ? '+' : ''}${formatCcy(tradingFee)} ${posCcy}`,
                  labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                  valueClassName: `text-[11px] font-mono font-bold ${tradingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                }
              ]}
            >
              <div className="flex flex-col gap-1 cursor-help w-max focus:outline-none">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Breakeven price</span>
                <span className="font-mono text-white">{formatPrice(pos.breakEvenPrice, isFiatPair)}</span>
              </div>
            </AppTooltip>
            {pos.instrumentType !== 'INVERSE' && (
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Partial TP/SL</span>
                <span className="font-mono text-[#8E9299]">--</span>
              </div>
            )}

            {/* Linha 3 */}
            <div className="flex flex-col gap-1">
              <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">ROE</span>
              <span className={`font-mono ${roeColor}`}>
                {pos.roe !== undefined ? (pos.roe > 0 ? '+' : '') + formatValue(pos.roe, 2) + '%' : '--'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <AppTooltip {...liqPriceTooltipProps}>
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50 cursor-help focus:outline-none">Est. liq. price</span>
              </AppTooltip>
              <span className="font-mono text-orange-400">{formatPrice(pos.liquidationPrice, isFiatPair)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Placed/ Max close</span>
              <span className="font-mono text-[#8E9299]">--/--</span>
            </div>
            <div className="hidden md:block"></div> {/* Espaço vazio na coluna 4 */}
            {pos.instrumentType !== 'INVERSE' && (
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Trailing TP/SL/ MMR SL</span>
                <span className="font-mono text-[#8E9299]">--/--</span>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
