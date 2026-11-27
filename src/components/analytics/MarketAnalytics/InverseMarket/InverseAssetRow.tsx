import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { InverseAssetAggregated } from '../../../../types/marketAnalytics';
import { CoinIcon } from '../../../ui/CoinIcon';
import { ExchangeIcon } from '../../../ui/ExchangeIcon';
import { Star, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { InverseExchangeCard } from './InverseExchangeCard';
import {
  PriceRangeTooltip,
  DualVolumeTooltip,
  OpenInterestTooltip,
  CvdFlowTooltip,
} from './InverseMarketTooltips';

interface InverseAssetRowProps {
  asset: InverseAssetAggregated;
  isFavorite: boolean;
  onToggleFavorite: (symbol: string) => void;
  defaultExpanded?: boolean;
}

export const InverseAssetRow: React.FC<InverseAssetRowProps> = ({
  asset,
  isFavorite,
  onToggleFavorite,
  defaultExpanded = false,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const formatUsd = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '—';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1_000_000_000) return `${sign}$${(absVal / 1_000_000_000).toFixed(2)}B`;
    if (absVal >= 1_000_000) return `${sign}$${(absVal / 1_000_000).toFixed(2)}M`;
    if (absVal >= 1_000) return `${sign}$${(absVal / 1_000).toFixed(1)}K`;
    return `${sign}$${absVal.toFixed(2)}`;
  };

  const formatCoin = (val: number): string => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const isUp = asset.price24hPcnt >= 0;

  // Range amplitude percentage
  const rangeAmplitude = asset.low24h > 0
    ? Number((((asset.high24h - asset.low24h) / asset.low24h) * 100).toFixed(2))
    : 0;

  return (
    <>
      <tr
        onClick={() => setIsExpanded(!isExpanded)}
        className={`hover:bg-elevated/60 transition-colors cursor-pointer group border-b border-line/60 ${
          isExpanded ? 'bg-elevated/40' : ''
        }`}
      >
        {/* Favorite Star */}
        <td className="py-3 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onToggleFavorite(asset.symbol)}
            className="p-1 hover:scale-110 transition-transform focus:outline-none"
            title={
              isFavorite
                ? t('analytics.market.filterModal.removeFavorite', 'Remove from favorites')
                : t('analytics.market.filterModal.addFavorite', 'Add to favorites')
            }
          >
            <Star
              className={`w-4 h-4 transition-colors ${
                isFavorite
                  ? 'text-warning fill-warning'
                  : 'text-fg-muted/50 hover:text-fg-muted'
              }`}
            />
          </button>
        </td>

        {/* Asset & Supported Exchanges */}
        <td className="py-3 px-3 min-w-[170px]">
          <div className="flex items-center gap-2.5">
            <CoinIcon symbol={asset.symbol} className="w-6 h-6 shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-fg text-xs tracking-tight">{asset.symbol}</span>
                <span className="text-[10px] text-fg-muted hidden sm:inline">{asset.name}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {asset.activeExchanges.map((ex) => (
                  <span
                    key={ex}
                    className="p-0.5 rounded bg-elevated border border-line"
                    title={t('analytics.inverseMarket.activeOnExchange', { exchange: ex.toUpperCase(), defaultValue: `Active on ${ex.toUpperCase()}` })}
                  >
                    <ExchangeIcon exchange={ex} className="w-3 h-3" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </td>

        {/* Benchmark Price */}
        <td className="py-3 px-3 text-right font-mono min-w-[110px]">
          <div className="font-bold text-fg text-xs">
            ${asset.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: asset.price < 1 ? 4 : 2,
            })}
          </div>
          <div
            className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${
              isUp ? 'text-success' : 'text-danger'
            }`}
          >
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isUp ? '+' : ''}
            {asset.price24hPcnt.toFixed(2)}%
          </div>
        </td>

        {/* 24h Range (Min / Max) with Direction Indicator */}
        <td className="py-3 px-3 text-right font-mono min-w-[140px]">
          <PriceRangeTooltip
            high={asset.high24h}
            low={asset.low24h}
            current={asset.price}
            pcnt={asset.price24hPcnt}
          >
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                    isUp
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-danger/10 text-danger border border-danger/20'
                  }`}
                >
                  {isUp ? t('analytics.inverseMarket.trendUp', '▲ UP') : t('analytics.inverseMarket.trendDown', '▼ DOWN')}
                  <span className="font-mono">{Math.abs(asset.price24hPcnt).toFixed(1)}%</span>
                </span>
              </div>
              <div className="text-[10px] text-fg-muted mt-0.5">
                <span className="text-fg/70">${asset.low24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span className="mx-1 text-fg-muted/50">—</span>
                <span className="text-fg/70">${asset.high24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <span className="text-[9px] text-fg-muted/80">
                {t('analytics.inverseMarket.rangePct', { pct: rangeAmplitude, defaultValue: `Range: ${rangeAmplitude}%` })}
              </span>
            </div>
          </PriceRangeTooltip>
        </td>

        {/* 24h Dual Volume (USD + Native Coin) */}
        <td className="py-3 px-3 text-right font-mono min-w-[125px]">
          <DualVolumeTooltip
            coinVol={asset.totalVolumeCoin}
            usdVol={asset.totalVolumeUsd}
            coin={asset.symbol}
          >
            <div>
              <div className="font-bold text-fg text-xs">{formatUsd(asset.totalVolumeUsd)}</div>
              <div className="text-[10px] text-tone-cyan font-mono">
                {formatCoin(asset.totalVolumeCoin)} {asset.symbol}
              </div>
            </div>
          </DualVolumeTooltip>
        </td>

        {/* Open Interest */}
        <td className="py-3 px-3 text-right font-mono min-w-[110px]">
          <OpenInterestTooltip oiUsd={asset.totalOiUsd}>
            <div>
              <span className="font-bold text-tone-amber text-xs">{formatUsd(asset.totalOiUsd)}</span>
              <span className="text-[10px] text-fg-muted block">{t('analytics.inverseMarket.totalCoinM', 'Total Coin-M')}</span>
            </div>
          </OpenInterestTooltip>
        </td>

        {/* CVD Flow (Buyer vs Seller Volume Delta) */}
        <td className="py-3 px-3 text-right font-mono min-w-[120px]">
          <CvdFlowTooltip cvdUsd={asset.estimatedCvdUsd} buyerRatio={asset.estimatedBuyerRatio}>
            <div className="flex flex-col items-end">
              <span
                className={`font-bold text-xs ${
                  asset.estimatedCvdUsd >= 0 ? 'text-tone-cyan' : 'text-danger'
                }`}
              >
                {asset.estimatedCvdUsd >= 0 ? '+' : ''}
                {formatUsd(asset.estimatedCvdUsd)}
              </span>
              <div className="w-16 h-1.5 bg-elevated rounded-full overflow-hidden flex mt-1">
                <div
                  className="bg-tone-cyan h-full transition-all"
                  style={{ width: `${asset.estimatedBuyerRatio}%` }}
                />
                <div
                  className="bg-danger h-full transition-all"
                  style={{ width: `${100 - asset.estimatedBuyerRatio}%` }}
                />
              </div>
              <span className="text-[9px] text-fg-muted mt-0.5">
                {t('analytics.inverseMarket.buyRatioPct', { pct: asset.estimatedBuyerRatio, defaultValue: `${asset.estimatedBuyerRatio}% Buy` })}
              </span>
            </div>
          </CvdFlowTooltip>
        </td>

        {/* Expand Action */}
        <td className="py-3 px-3 w-10 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 rounded hover:bg-elevated text-fg-muted hover:text-fg transition-colors"
            title={
              isExpanded
                ? t('analytics.inverseMarket.collapseCards', 'Collapse exchange cards')
                : t('analytics.inverseMarket.expandCards', 'Expand exchange cards')
            }
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>
      </tr>

      {/* Expanded Segregated Cards Drawer */}
      {isExpanded && (
        <tr className="bg-surface/70 border-b border-line">
          <td colSpan={8} className="p-4 sm:p-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase tracking-wider text-tone-cyan">
                    {t('analytics.inverseMarket.exchangesForAsset', { symbol: asset.symbol, defaultValue: `Exchanges for ${asset.symbol} Coin-M / Inverse` })}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-elevated text-fg-muted border border-line">
                    {t('analytics.inverseMarket.activeExchangesCount', { count: asset.activeExchanges.length, defaultValue: `${asset.activeExchanges.length} active exchange${asset.activeExchanges.length > 1 ? 's' : ''}` })}
                  </span>
                </div>
                {asset.maxFundingSpreadApr !== null && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-success/10 border border-success/20 text-success font-mono text-xs font-bold">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{t('analytics.inverseMarket.arbitrageSpreadApr', { apr: asset.maxFundingSpreadApr, defaultValue: `Arbitrage Spread APR: +${asset.maxFundingSpreadApr}%` })}</span>
                    {asset.bestLongExchange && asset.bestShortExchange && (
                      <span className="text-[10px] text-fg/80 font-sans font-normal ml-1">
                        ({t('analytics.inverseMarket.longWord', 'Long')} {asset.bestLongExchange.toUpperCase()} ↔ {t('analytics.inverseMarket.shortWord', 'Short')} {asset.bestShortExchange.toUpperCase()})
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <InverseExchangeCard
                  exchange="bybit"
                  metric={asset.exchanges.bybit}
                  benchmarkPrice={asset.price}
                />
                <InverseExchangeCard
                  exchange="okx"
                  metric={asset.exchanges.okx}
                  benchmarkPrice={asset.price}
                />
                <InverseExchangeCard
                  exchange="bitget"
                  metric={asset.exchanges.bitget}
                  benchmarkPrice={asset.price}
                />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
