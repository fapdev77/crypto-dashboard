import React from 'react';
import { AppTooltip } from '../../../ui/Tooltip';
import { useTranslation } from 'react-i18next';

interface TooltipWrapperProps {
  children: React.ReactNode;
}

export const ThHeaderTooltip: React.FC<{
  title: string;
  description: string;
  rows?: { label: string; value: React.ReactNode }[];
  children: React.ReactNode;
}> = ({ description, rows, children }) => (
  <AppTooltip description={description} rows={rows} side="top" align="center">
    <span className="cursor-help border-b border-dashed border-[#8E9299]/40 hover:border-[#8E9299]/80 transition-colors inline-block">
      {children}
    </span>
  </AppTooltip>
);

export const PriceRangeTooltip: React.FC<TooltipWrapperProps & { high: number; low: number; current: number; pcnt: number }> = ({
  high,
  low,
  current,
  pcnt,
  children,
}) => {
  const { t } = useTranslation();
  const range = high - low;
  const posPct = range > 0 ? Math.round(((current - low) / range) * 100) : 50;

  return (
    <AppTooltip
      description={t('analytics.inverseTooltips.priceRangeDesc', '24-hour high and low price channel across active Coin-M derivative contracts. The percentage indicator signals the intraday directional velocity.')}
      rows={[
        { label: t('analytics.inverseTooltips.priceRangeHigh', '24h High'), value: `$${high.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
        { label: t('analytics.inverseTooltips.priceRangeLow', '24h Low'), value: `$${low.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
        { label: t('analytics.inverseTooltips.priceRangePos', 'Channel Position'), value: `${posPct}% ${t('analytics.inverseTooltips.fromBottom', '(from bottom)')}` },
        { label: t('analytics.inverseTooltips.priceRangeMomentum', '24h Momentum'), value: `${pcnt >= 0 ? '+' : ''}${pcnt.toFixed(2)}%`, valueClassName: pcnt >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold' },
      ]}
      side="top"
    >
      <div className="cursor-help">{children}</div>
    </AppTooltip>
  );
};

export const DualVolumeTooltip: React.FC<TooltipWrapperProps & { coinVol: number; usdVol: number; coin: string }> = ({
  coinVol,
  usdVol,
  coin,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <AppTooltip
      description={t('analytics.inverseTooltips.dualVolDesc', 'Coin-M (Inverse) contracts are collateralized and settled in the underlying coin, but standard contract values represent fixed USD amounts ($10 or $100 per contract). Both notional and native asset volumes are presented.')}
      rows={[
        { label: t('analytics.inverseTooltips.dualVolNative', { coin, defaultValue: `Native Volume (${coin})` }), value: `${coinVol.toLocaleString()} ${coin}` },
        { label: t('analytics.inverseTooltips.dualVolNotional', 'Notional Volume'), value: `$${usdVol.toLocaleString()}` },
      ]}
      side="top"
    >
      <div className="cursor-help">{children}</div>
    </AppTooltip>
  );
};

export const OpenInterestTooltip: React.FC<TooltipWrapperProps & { oiUsd: number }> = ({
  oiUsd,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <AppTooltip
      description={t('analytics.inverseTooltips.oiDesc', 'Total active Coin-M futures positions currently open across Bybit, OKX, and Bitget. High open interest relative to volume points to major institutional hedging and leverage accumulation.')}
      rows={[
        { label: t('analytics.inverseTooltips.oiTotal', 'Total Active Coin-M OI'), value: `$${oiUsd.toLocaleString()}` },
      ]}
      side="top"
    >
      <div className="cursor-help">{children}</div>
    </AppTooltip>
  );
};

export const CvdFlowTooltip: React.FC<TooltipWrapperProps & { cvdUsd: number; buyerRatio: number }> = ({
  cvdUsd,
  buyerRatio,
  children,
}) => {
  const { t } = useTranslation();
  const isNetBuyer = cvdUsd >= 0;
  return (
    <AppTooltip
      description={t('analytics.inverseTooltips.cvdDesc', 'Estimated Cumulative Volume Delta (CVD) derived from taker order flow across Coin-M contracts. Signals aggressive buyer vs seller market order imbalances.')}
      rows={[
        { label: t('analytics.inverseTooltips.cvdDelta', 'Estimated Taker Delta'), value: `${isNetBuyer ? '+' : ''}$${Math.abs(cvdUsd).toLocaleString()}`, valueClassName: isNetBuyer ? 'text-cyan-400 font-semibold' : 'text-rose-400 font-semibold' },
        { label: t('analytics.inverseTooltips.cvdBuyer', 'Buyer Volume Ratio'), value: `${buyerRatio}%` },
        { label: t('analytics.inverseTooltips.cvdSeller', 'Seller Volume Ratio'), value: `${(100 - buyerRatio).toFixed(1)}%` },
      ]}
      side="top"
    >
      <div className="cursor-help">{children}</div>
    </AppTooltip>
  );
};

export const NextFundingTooltip: React.FC<TooltipWrapperProps & { rate: number | null; countdownSecs: number }> = ({
  rate,
  countdownSecs,
  children,
}) => {
  const { t } = useTranslation();
  const hours = Math.floor(countdownSecs / 3600);
  const minutes = Math.floor((countdownSecs % 3600) / 60);
  const isPositive = rate !== null && rate > 0;
  const isNegative = rate !== null && rate < 0;

  return (
    <AppTooltip
      description={t('analytics.inverseTooltips.nextFundingDesc', 'Estimated upcoming funding payment rate and time remaining until next 8-hour settlement cycle. Rates are paid in native base currency for Inverse contracts.')}
      rows={[
        { label: t('analytics.inverseTooltips.nextFundingDirection', 'Payment Direction'), value: isPositive ? t('analytics.inverseTooltips.longsPayShorts', 'Longs pay Shorts') : isNegative ? t('analytics.inverseTooltips.shortsPayLongs', 'Shorts pay Longs') : t('analytics.inverseTooltips.neutral', 'Neutral') },
        { label: t('analytics.inverseTooltips.nextFundingCountdown', 'Countdown'), value: `in ${hours}h ${minutes}m` },
      ]}
      side="top"
    >
      <div className="cursor-help">{children}</div>
    </AppTooltip>
  );
};

export const TodayFundingTooltip: React.FC<TooltipWrapperProps & { rate: number | null }> = ({
  rate,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <AppTooltip
      description={t('analytics.inverseTooltips.todayFundingDesc', 'Cumulative funding rate sum settled exclusively during the current UTC civil day (00:00 UTC to current moment). Does not represent a sliding 24-hour window.')}
      rows={[
        { label: 'Period', value: t('analytics.inverseTooltips.todayPeriod', 'Today (00:00 UTC - Present)') },
        { label: t('analytics.inverseTooltips.todaySettlement', 'Settlement Direction'), value: rate && rate > 0 ? t('analytics.inverseTooltips.netLongPayment', 'Net Long payment') : rate && rate < 0 ? t('analytics.inverseTooltips.netShortPayment', 'Net Short payment') : t('analytics.inverseTooltips.neutral', 'Neutral') },
      ]}
      side="top"
    >
      <div className="cursor-help">{children}</div>
    </AppTooltip>
  );
};

export const SpreadAprTooltip: React.FC<TooltipWrapperProps & { spreadApr: number | null; bestLong: string | null; bestShort: string | null }> = ({
  spreadApr,
  bestLong,
  bestShort,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <AppTooltip
      description={t('analytics.inverseTooltips.spreadAprDesc', 'Annualized funding rate differential between the exchange with the lowest funding rate and the exchange with the highest funding rate. Traders capture this spread delta-neutrally by holding Long on the low exchange and Short on the high exchange.')}
      rows={[
        { label: t('analytics.inverseTooltips.spreadAprTitle', 'Annualized Spread (APR)'), value: spreadApr !== null ? `+${spreadApr.toFixed(2)}%` : '—', valueClassName: 'text-emerald-400 font-bold' },
        { label: t('analytics.inverseTooltips.optimalLong', 'Optimal Long Exchange'), value: bestLong ? bestLong.toUpperCase() : '—' },
        { label: t('analytics.inverseTooltips.optimalShort', 'Optimal Short Exchange'), value: bestShort ? bestShort.toUpperCase() : '—' },
      ]}
      side="top"
    >
      <div className="cursor-help">{children}</div>
    </AppTooltip>
  );
};
