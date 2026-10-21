import React from 'react';
import { Layers, Activity } from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { SpecificMarketType, ExchangeId } from '../../../types/marketAnalytics';

export const MarketBreakdownStrip: React.FC = () => {
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
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 font-mono">USDT Perp</span>;
      case 'INVERSE':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20 font-mono">Coin-M</span>;
      case 'SPOT':
      default:
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-mono">Spot</span>;
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
    <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-4 shadow-lg space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            Exchange × Market Breakdown
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e2028] text-cyan-400 border border-[#2a2b30]">
            {breakdown.length} feed{breakdown.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#8E9299]">
          <Activity className="w-3.5 h-3.5 text-[#2F6BFF]" />
          <span>Real-time metrics segregated across active combinations</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#C5C8D0] min-w-[700px]">
          <thead>
            <tr className="border-b border-[#202229] text-[10px] uppercase font-bold tracking-wider text-[#8E9299]">
              <th className="py-2 px-3">Exchange</th>
              <th className="py-2 px-3">Market</th>
              <th className="py-2 px-3 text-right">Price</th>
              <th className="py-2 px-3 text-right">24h Volume</th>
              <th className="py-2 px-3 text-right">Open Interest</th>
              <th className="py-2 px-3 text-right">Funding APR</th>
              <th className="py-2 px-3 text-right">CVD Flow</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1c22]">
            {breakdown.map((row, idx) => {
              const isPositiveCvd = row.cvd >= 0;
              const hasRate = row.fundingApr !== null;
              const isPositiveRate = hasRate && (row.fundingApr || 0) > 0;
              const isNegativeRate = hasRate && (row.fundingApr || 0) < 0;

              return (
                <tr key={`${row.exchange}-${row.market}-${idx}`} className="hover:bg-[#161820] transition-colors">
                  {/* Exchange */}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <ExchangeIcon exchange={row.exchange} className="w-4 h-4 shrink-0" />
                      <span className="font-medium text-white">{getExchangeName(row.exchange)}</span>
                    </div>
                  </td>

                  {/* Market */}
                  <td className="py-2 px-3">
                    {getMarketBadge(row.market)}
                  </td>

                  {/* Price */}
                  <td className="py-2 px-3 text-right font-mono font-bold text-white">
                    {formatPrice(row.price)}
                  </td>

                  {/* 24h Volume */}
                  <td className="py-2 px-3 text-right font-mono text-[#D8DAE0]">
                    {formatUsd(row.volume24hUsd)}
                  </td>

                  {/* Open Interest */}
                  <td className="py-2 px-3 text-right font-mono">
                    {row.oiUsd !== null ? (
                      <span className="text-amber-400 font-semibold">{formatUsd(row.oiUsd)}</span>
                    ) : (
                      <span className="text-[#555861]">—</span>
                    )}
                  </td>

                  {/* Funding APR */}
                  <td className="py-2 px-3 text-right font-mono">
                    {hasRate ? (
                      <span
                        className={`font-semibold ${
                          isPositiveRate
                            ? 'text-emerald-400'
                            : isNegativeRate
                            ? 'text-rose-400'
                            : 'text-[#8E9299]'
                        }`}
                      >
                        {(row.fundingApr || 0) > 0 ? '+' : ''}
                        {row.fundingApr}%
                      </span>
                    ) : (
                      <span className="text-[#555861]">—</span>
                    )}
                  </td>

                  {/* CVD */}
                  <td className="py-2 px-3 text-right font-mono font-medium">
                    <span className={isPositiveCvd ? 'text-cyan-400' : 'text-rose-400'}>
                      {formatUsd(row.cvd)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Aggregate Summary Footer Row */}
          <tfoot>
            <tr className="border-t-2 border-[#2a2b30] bg-[#161820]/80 font-semibold text-white">
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <span className="font-bold tracking-wide">Aggregate</span>
                </div>
              </td>
              <td className="py-2.5 px-3">
                <span className="text-[10px] font-mono text-[#8E9299] bg-[#1e2028] px-2 py-0.5 rounded border border-[#2a2b30]">
                  {marketTypes.join(' + ')}
                </span>
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                {formatPrice(currentPrice)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-white font-bold">
                {formatUsd(totalVolume24hUsd)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                {hasDerivatives ? formatUsd(totalOiUsd) : <span className="text-[#555861]">—</span>}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                {currentFunding ? `+${currentFunding.spreadApr}% (Spread)` : <span className="text-[#555861]">—</span>}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold">
                <span className={latestCvd >= 0 ? 'text-cyan-400' : 'text-rose-400'}>
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
