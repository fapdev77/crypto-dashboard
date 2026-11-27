import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Activity } from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { SpecificMarketType, ExchangeId } from '../../../types/marketAnalytics';

export const MarketBreakdownStrip: React.FC = () => {
  const { t } = useTranslation();
  const { snapshot } = useMarketAnalyticsStore();

  if (!snapshot || !snapshot.breakdown || snapshot.breakdown.length === 0) {
    return null;
  }

  const { breakdown, marketTypes, totalVolume24hUsd, totalOiUsd, currentPrice, currentFunding } = snapshot;

  const hasDerivatives = marketTypes.some((m) => m !== 'SPOT');

  const formatUsd = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '—';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1_000_000_000) return `${sign}$${(absVal / 1_000_000_000).toFixed(2)}B`;
    if (absVal >= 1_000_000) return `${sign}$${(absVal / 1_000_000).toFixed(2)}M`;
    if (absVal >= 1_000) return `${sign}$${(absVal / 1_000).toFixed(1)}K`;
    return `${sign}$${absVal.toFixed(2)}`;
  };

  const formatPrice = (price: number): string => {
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getMarketBadge = (market: SpecificMarketType) => {
    switch (market) {
      case 'PERP':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-tone-cyan/10 text-tone-cyan border border-tone-cyan/20 font-mono">{t('analytics.market.header.usdtPerp', 'USDT Perp')}</span>;
      case 'INVERSE':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-tone-blue/10 text-tone-blue border border-tone-blue/20 font-mono">Coin-M</span>;
      case 'SPOT':
      default:
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-success/10 text-success border border-success/20 font-mono">{t('analytics.market.header.spot', 'Spot')}</span>;
    }
  };

  const getExchangeName = (ex: ExchangeId): string => {
    switch (ex) {
      case 'bybit':
        return 'Bybit';
      case 'okx':
        return 'OKX';
      case 'bitget':
        return 'Bitget';
    }
  };

  // Latest CVD from taker flow history
  const latestCvd = snapshot.takerFlowHistory[snapshot.takerFlowHistory.length - 1]?.cvd || 0;

  return (
    <div className="bg-canvas border border-line rounded-xl p-4 shadow-lg space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-tone-cyan" />
          <h3 className="text-xs font-semibold text-fg uppercase tracking-wider">
            {t('analytics.market.breakdown.title', 'Exchange × Market Breakdown')}
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-elevated text-tone-cyan border border-line">
            {t('analytics.market.breakdown.feedsCount', { count: breakdown.length, defaultValue: `${breakdown.length} feed${breakdown.length > 1 ? 's' : ''}` })}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
          <Activity className="w-3.5 h-3.5 text-accent" />
          <span>{t('analytics.market.breakdown.subtitle', 'Real-time metrics segregated across active combinations')}</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-fg min-w-[700px]">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase font-bold tracking-wider text-fg-muted">
              <th className="py-2 px-3">{t('analytics.market.breakdown.colExchange', 'Exchange')}</th>
              <th className="py-2 px-3">{t('analytics.market.breakdown.colMarket', 'Market')}</th>
              <th className="py-2 px-3 text-right">{t('analytics.market.breakdown.colPrice', 'Price')}</th>
              <th className="py-2 px-3 text-right">{t('analytics.market.breakdown.colVolume', '24h Volume')}</th>
              <th className="py-2 px-3 text-right">{t('analytics.market.breakdown.colOi', 'Open Interest')}</th>
              <th className="py-2 px-3 text-right">{t('analytics.market.breakdown.colFundingApr', 'Funding APR')}</th>
              <th className="py-2 px-3 text-right">{t('analytics.market.breakdown.colCvd', 'CVD Flow')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {breakdown.map((row, idx) => {
              const isPositiveCvd = row.cvd >= 0;
              const hasRate = row.fundingApr !== null;
              const isPositiveRate = hasRate && (row.fundingApr || 0) > 0;
              const isNegativeRate = hasRate && (row.fundingApr || 0) < 0;

              return (
                <tr key={`${row.exchange}-${row.market}-${idx}`} className="hover:bg-elevated/60 transition-colors">
                  {/* Exchange */}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <ExchangeIcon exchange={row.exchange} className="w-4 h-4 shrink-0" />
                      <span className="font-medium text-fg">{getExchangeName(row.exchange)}</span>
                    </div>
                  </td>

                  {/* Market */}
                  <td className="py-2 px-3">
                    {getMarketBadge(row.market)}
                  </td>

                  {/* Price */}
                  <td className="py-2 px-3 text-right font-mono font-bold text-fg">
                    {formatPrice(row.price)}
                  </td>

                  {/* 24h Volume */}
                  <td className="py-2 px-3 text-right font-mono text-fg">
                    {formatUsd(row.volume24hUsd)}
                  </td>

                  {/* Open Interest */}
                  <td className="py-2 px-3 text-right font-mono">
                    {row.oiUsd !== null ? (
                      <span className="text-tone-amber font-semibold">{formatUsd(row.oiUsd)}</span>
                    ) : (
                      <span className="text-fg-muted">—</span>
                    )}
                  </td>

                  {/* Funding APR */}
                  <td className="py-2 px-3 text-right font-mono">
                    {hasRate ? (
                      <span
                        className={`font-semibold ${
                          isPositiveRate
                            ? 'text-success'
                            : isNegativeRate
                            ? 'text-danger'
                            : 'text-fg-muted'
                        }`}
                      >
                        {(row.fundingApr || 0) > 0 ? '+' : ''}
                        {row.fundingApr}%
                      </span>
                    ) : (
                      <span className="text-fg-muted">—</span>
                    )}
                  </td>

                  {/* CVD */}
                  <td className="py-2 px-3 text-right font-mono font-medium">
                    <span className={isPositiveCvd ? 'text-tone-cyan' : 'text-danger'}>
                      {formatUsd(row.cvd)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Aggregate Summary Footer Row */}
          <tfoot>
            <tr className="border-t-2 border-line bg-elevated/80 font-semibold text-fg">
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-1.5 text-tone-cyan">
                  <span className="font-bold tracking-wide">{t('analytics.market.breakdown.aggregate', 'Aggregate')}</span>
                </div>
              </td>
              <td className="py-2.5 px-3">
                <span className="text-[10px] font-mono text-fg-muted bg-elevated px-2 py-0.5 rounded border border-line">
                  {marketTypes.join(' + ')}
                </span>
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-fg">
                {formatPrice(currentPrice)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-fg font-bold">
                {formatUsd(totalVolume24hUsd)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-tone-amber">
                {hasDerivatives ? formatUsd(totalOiUsd) : <span className="text-fg-muted">—</span>}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-success">
                {currentFunding ? `+${currentFunding.spreadApr}% (${t('analytics.market.breakdown.spreadTag', 'Spread')})` : <span className="text-fg-muted">—</span>}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold">
                <span className={latestCvd >= 0 ? 'text-tone-cyan' : 'text-danger'}>
                  {formatUsd(latestCvd)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
