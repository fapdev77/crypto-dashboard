import React from 'react';
import { AppTooltip } from '../../../ui/Tooltip';

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
  const range = high - low;
  const posPct = range > 0 ? Math.round(((current - low) / range) * 100) : 50;

  return (
    <AppTooltip
      description="24-hour high and low price channel across active Coin-M derivative contracts. The percentage indicator signals the intraday directional velocity."
      rows={[
        { label: '24h High', value: `$${high.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
        { label: '24h Low', value: `$${low.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
        { label: 'Channel Position', value: `${posPct}% (from bottom)` },
        { label: '24h Momentum', value: `${pcnt >= 0 ? '+' : ''}${pcnt.toFixed(2)}%`, valueClassName: pcnt >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold' },
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
}) => (
  <AppTooltip
    description="Coin-M (Inverse) contracts are collateralized and settled in the underlying coin, but standard contract values represent fixed USD amounts ($10 or $100 per contract). Both notional USD and native asset volumes are presented."
    rows={[
      { label: `Native Volume (${coin})`, value: `${coinVol.toLocaleString()} ${coin}` },
      { label: 'Notional USD Volume', value: `$${usdVol.toLocaleString()}` },
    ]}
    side="top"
  >
    <div className="cursor-help">{children}</div>
  </AppTooltip>
);

export const OpenInterestTooltip: React.FC<TooltipWrapperProps & { oiUsd: number }> = ({
  oiUsd,
  children,
}) => (
  <AppTooltip
    description="Total active Coin-M futures positions currently open across Bybit, OKX, and Bitget. High open interest relative to volume points to major institutional hedging and leverage accumulation."
    rows={[
      { label: 'Total Active Coin-M OI', value: `$${oiUsd.toLocaleString()}` },
    ]}
    side="top"
  >
    <div className="cursor-help">{children}</div>
  </AppTooltip>
);

export const CvdFlowTooltip: React.FC<TooltipWrapperProps & { cvdUsd: number; buyerRatio: number }> = ({
  cvdUsd,
  buyerRatio,
  children,
}) => {
  const isNetBuyer = cvdUsd >= 0;
  return (
    <AppTooltip
      description="Estimated Cumulative Volume Delta (CVD) derived from taker order flow across Coin-M contracts. Signals aggressive buyer vs seller market order imbalances."
      rows={[
        { label: 'Estimated Taker Delta', value: `${isNetBuyer ? '+' : ''}$${Math.abs(cvdUsd).toLocaleString()}`, valueClassName: isNetBuyer ? 'text-cyan-400 font-semibold' : 'text-rose-400 font-semibold' },
        { label: 'Buyer Volume Ratio', value: `${buyerRatio}%` },
        { label: 'Seller Volume Ratio', value: `${(100 - buyerRatio).toFixed(1)}%` },
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
  const hours = Math.floor(countdownSecs / 3600);
  const minutes = Math.floor((countdownSecs % 3600) / 60);
  const isPositive = rate !== null && rate > 0;
  const isNegative = rate !== null && rate < 0;

  return (
    <AppTooltip
      description="Estimated upcoming funding payment rate and time remaining until next 8-hour settlement cycle. Rates are paid in native base currency for Inverse contracts."
      rows={[
        { label: 'Payment Direction', value: isPositive ? 'Longs pay Shorts' : isNegative ? 'Shorts pay Longs' : 'Neutral' },
        { label: 'Countdown', value: `in ${hours}h ${minutes}m` },
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
}) => (
  <AppTooltip
    description="Cumulative funding rate sum settled exclusively during the current UTC civil day (00:00 UTC to current moment). Does not represent a sliding 24-hour window."
    rows={[
      { label: 'Period', value: 'Today (00:00 UTC - Present)' },
      { label: 'Settlement Direction', value: rate && rate > 0 ? 'Net Long payment' : rate && rate < 0 ? 'Net Short payment' : 'Neutral' },
    ]}
    side="top"
  >
    <div className="cursor-help">{children}</div>
  </AppTooltip>
);

export const SpreadAprTooltip: React.FC<TooltipWrapperProps & { spreadApr: number | null; bestLong: string | null; bestShort: string | null }> = ({
  spreadApr,
  bestLong,
  bestShort,
  children,
}) => (
  <AppTooltip
    description="Annualized funding rate differential between the exchange with the lowest funding rate and the exchange with the highest funding rate. Traders capture this spread delta-neutrally by holding Long on the low exchange and Short on the high exchange."
    rows={[
      { label: 'Annualized Spread (APR)', value: spreadApr !== null ? `+${spreadApr.toFixed(2)}%` : '—', valueClassName: 'text-emerald-400 font-bold' },
      { label: 'Optimal Long Exchange', value: bestLong ? bestLong.toUpperCase() : '—' },
      { label: 'Optimal Short Exchange', value: bestShort ? bestShort.toUpperCase() : '—' },
    ]}
    side="top"
  >
    <div className="cursor-help">{children}</div>
  </AppTooltip>
);
