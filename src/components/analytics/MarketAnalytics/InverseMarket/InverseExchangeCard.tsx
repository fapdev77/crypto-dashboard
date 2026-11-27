import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExchangeId, InverseAssetExchangeMetric } from '../../../../types/marketAnalytics';
import { ExchangeIcon } from '../../../ui/ExchangeIcon';
import { TrendingUp, TrendingDown, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { formatDateTime } from '../../../../utils/formatters';

interface InverseExchangeCardProps {
  exchange: ExchangeId;
  metric: InverseAssetExchangeMetric | null;
  benchmarkPrice: number;
}

const EXCHANGE_NAMES: Record<ExchangeId, string> = {
  bybit: 'Bybit',
  okx: 'OKX',
  bitget: 'Bitget',
};

export const InverseExchangeCard: React.FC<InverseExchangeCardProps> = ({
  exchange,
  metric,
  benchmarkPrice,
}) => {
  const { t } = useTranslation();
  const exName = EXCHANGE_NAMES[exchange];

  const formatRate = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '—';
    const sign = val > 0 ? '+' : '';
    return `${sign}${(val * 100).toFixed(4)}%`;
  };

  const getRateColor = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return 'text-fg-muted';
    if (val > 0) return 'text-success';
    if (val < 0) return 'text-danger';
    return 'text-fg';
  };

  const formatUsd = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '—';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1_000_000_000) return `${sign}$${(absVal / 1_000_000_000).toFixed(2)}B`;
    if (absVal >= 1_000_000) return `${sign}$${(absVal / 1_000_000).toFixed(2)}M`;
    if (absVal >= 1_000) return `${sign}$${(absVal / 1_000).toFixed(1)}K`;
    return `${sign}$${absVal.toFixed(2)}`;
  };

  if (!metric) {
    return (
      <div className="bg-canvas/60 border border-line rounded-xl p-4 flex flex-col justify-between opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExchangeIcon exchange={exchange} className="w-4 h-4 grayscale" />
            <span className="font-semibold text-xs text-fg-muted">{exName}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-elevated text-fg-muted border border-line">
            {t('analytics.inverseMarket.card.noContract', 'No Coin-M Contract')}
          </span>
        </div>
        <p className="text-[11px] text-fg-muted mt-3">
          {t('analytics.inverseMarket.card.notListedDesc', { exchange: exName, defaultValue: `This asset is not listed as an Inverse contract on ${exName}.` })}
        </p>
      </div>
    );
  }

  const deviation = benchmarkPrice > 0 ? ((metric.price - benchmarkPrice) / benchmarkPrice) * 100 : 0;
  const isDeviationPositive = deviation > 0.01;
  const isDeviationNegative = deviation < -0.01;

  return (
    <div className="bg-canvas border border-line hover:border-line-strong rounded-xl p-4 flex flex-col space-y-3.5 transition-all shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ExchangeIcon exchange={exchange} className="w-4 h-4 shrink-0" />
          <span className="font-bold text-xs text-fg">{exName}</span>
          <span className="text-[10px] font-mono text-fg-muted px-1.5 py-0.5 rounded bg-elevated border border-line">
            {metric.pairSymbol}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-tone-cyan font-mono bg-tone-cyan/10 px-2 py-0.5 rounded border border-tone-cyan/20">
          <ShieldCheck className="w-3 h-3" />
          <span>{t('analytics.inverseMarket.card.coinMActive', 'Coin-M Active')}</span>
        </div>
      </div>

      {/* Price & Deviation */}
      <div className="flex items-baseline justify-between border-b border-line/60 pb-2.5">
        <div>
          <div className="text-sm font-bold font-mono text-fg">
            ${metric.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: metric.price < 1 ? 4 : 2 })}
          </div>
          <div className="text-[10px] text-fg-muted font-mono">
            {t('analytics.inverseMarket.card.low24h', '24h L:')} ${metric.low24h.toLocaleString(undefined, { minimumFractionDigits: 2 })} — {t('analytics.inverseMarket.card.highPrefix', 'H:')} ${metric.high24h.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${metric.price24hPcnt >= 0 ? 'text-success' : 'text-danger'}`}>
            {metric.price24hPcnt >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {metric.price24hPcnt >= 0 ? '+' : ''}{metric.price24hPcnt.toFixed(2)}%
          </div>
          {Math.abs(deviation) >= 0.01 && (
            <span className={`text-[10px] font-mono ${isDeviationPositive ? 'text-success/80' : isDeviationNegative ? 'text-danger/80' : 'text-fg-muted'}`}>
              {isDeviationPositive ? '+' : ''}{deviation.toFixed(2)}% {t('analytics.inverseMarket.card.vsIndex', 'vs index')}
            </span>
          )}
        </div>
      </div>

      {/* Volume & Open Interest Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-elevated p-2 rounded-lg border border-line">
          <span className="text-[10px] text-fg-muted uppercase font-semibold block">{t('analytics.inverseMarket.headers.volume', '24h Volume')}</span>
          <div className="font-mono font-bold text-fg text-xs mt-0.5">
            {formatUsd(metric.volume24hUsd)}
          </div>
          <span className="text-[10px] text-tone-cyan/90 font-mono">
            {metric.volume24hCoin.toLocaleString()} {t('analytics.inverseMarket.card.nativeUnit', 'native')}
          </span>
        </div>

        <div className="bg-elevated p-2 rounded-lg border border-line">
          <span className="text-[10px] text-fg-muted uppercase font-semibold block">{t('analytics.inverseMarket.headers.openInterest', 'Open Interest')}</span>
          <div className="font-mono font-bold text-tone-amber text-xs mt-0.5">
            {formatUsd(metric.openInterestUsd)}
          </div>
          <span className="text-[10px] text-fg-muted font-mono">
            {metric.openInterestCoin
              ? `${metric.openInterestCoin.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${t('analytics.inverseMarket.card.coinsUnit', 'coins')}`
              : t('analytics.inverseMarket.card.liveContract', 'Live contract')}
          </span>
        </div>
      </div>

      {/* Funding Rates Breakdown */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] text-fg-muted">{t('analytics.inverseMarket.card.nextFundingRate', 'Next Funding Rate:')}</span>
          <div className="text-right">
            <span className={`font-mono font-bold ${getRateColor(metric.nextFundingRate)}`}>
              {formatRate(metric.nextFundingRate)}
            </span>
            {metric.fundingApr !== null && (
              <span className="text-[10px] text-fg-muted font-mono ml-1.5">
                ({metric.fundingApr > 0 ? '+' : ''}{metric.fundingApr}% APR)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-fg-muted">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-accent" />
            {t('analytics.inverseMarket.card.settlementTime', 'Settlement Time:')}
          </span>
          <span className="font-mono text-fg/80">
            {metric.nextFundingTime
              ? formatDateTime(metric.nextFundingTime, { includeYear: false, includeSeconds: false }).fullStr
              : '—'}
          </span>
        </div>

        {/* Historical cumulative row */}
        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-line/60 text-center">
          <div className="bg-elevated py-1 px-1.5 rounded border border-line">
            <span className="text-[9px] text-fg-muted block font-medium">{t('analytics.inverseMarket.card.todayUtc', 'Today (UTC)')}</span>
            <span className={`font-mono text-[11px] font-bold ${getRateColor(metric.todaySum)}`}>
              {formatRate(metric.todaySum)}
            </span>
          </div>
          <div className="bg-elevated py-1 px-1.5 rounded border border-line">
            <span className="text-[9px] text-fg-muted block font-medium">{t('analytics.inverseMarket.card.curMonth', 'Cur. Month')}</span>
            <span className={`font-mono text-[11px] font-bold ${getRateColor(metric.currentMonthSum)}`}>
              {formatRate(metric.currentMonthSum)}
            </span>
          </div>
          <div className="bg-elevated py-1 px-1.5 rounded border border-line">
            <span className="text-[9px] text-fg-muted block font-medium">{t('analytics.inverseMarket.card.threeMonths', '3 Months')}</span>
            <span className={`font-mono text-[11px] font-bold ${getRateColor(metric.last3MonthsSum)}`}>
              {formatRate(metric.last3MonthsSum)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
