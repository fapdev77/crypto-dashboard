import React from 'react';
import {
  ArrowLeftRight,
  TrendingUp,
  Clock,
  Zap,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { AppTooltip } from '../../ui/Tooltip';
import { MaxFundingSpreadTooltip } from './MarketAnalyticsTooltips';

export const FundingArbitrageWidget: React.FC = () => {
  const { snapshot, selectedMarket, setSelectedMarket, setSelectedSymbol } = useMarketAnalyticsStore();

  if (!snapshot) return null;

  const isSpot = selectedMarket === 'SPOT';

  if (isSpot) {
    return (
      <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-5 shadow-lg flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="max-w-md">
          <h3 className="text-base font-semibold text-white">Funding Fees Not Applicable in Spot</h3>
          <p className="text-xs text-[#8E9299] mt-1 leading-relaxed">
            Spot markets do not have funding rates. Funding fees are exchanged periodically between long and short contract holders in Perpetual and Inverse futures.
          </p>
        </div>
        <button
          onClick={() => setSelectedMarket('PERP')}
          className="px-4 py-2 bg-[#2F6BFF] hover:bg-[#2558d4] text-white text-xs font-semibold rounded-lg transition-colors shadow"
        >
          Switch to USDT Perpetuals
        </button>
      </div>
    );
  }

  const { currentFunding, fundingArbitrage } = snapshot;
  if (!currentFunding) return null;

  // Format countdown
  const hours = Math.floor(currentFunding.nextFundingCountdown / (3600 * 1000));
  const minutes = Math.floor((currentFunding.nextFundingCountdown % (3600 * 1000)) / (60 * 1000));
  const seconds = Math.floor((currentFunding.nextFundingCountdown % (60 * 1000)) / 1000);
  const countdownFormatted = `${hours.toString().padStart(2, '0')}h ${minutes
    .toString()
    .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

  const formatRate = (rate: number | null | undefined) => {
    if (rate === null || rate === undefined) return 'N/A';
    const percent = (rate * 100).toFixed(4);
    const sign = rate > 0 ? '+' : '';
    return `${sign}${percent}%`;
  };

  const formatApr = (rate: number | null | undefined) => {
    if (rate === null || rate === undefined) return 'N/A';
    const apr = (rate * 3 * 365 * 100).toFixed(2);
    const sign = rate > 0 ? '+' : '';
    return `${sign}${apr}%`;
  };

  const getRateColor = (rate: number | null | undefined) => {
    if (rate === null || rate === undefined) return 'text-[#8E9299]';
    if (rate > 0) return 'text-emerald-400';
    if (rate < 0) return 'text-rose-400';
    return 'text-white';
  };

  return (
    <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#2F6BFF]/10 text-[#2F6BFF] rounded-lg border border-[#2F6BFF]/20">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <MaxFundingSpreadTooltip>
                <h3 className="text-base font-bold text-white tracking-tight cursor-help border-b border-dotted border-[#8E9299]/50 hover:text-amber-400 transition-colors">
                  Cross-Exchange Funding Arbitrage
                </h3>
              </MaxFundingSpreadTooltip>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#2F6BFF]/15 text-[#2F6BFF] border border-[#2F6BFF]/30 rounded">
                {snapshot.symbol}
              </span>
            </div>
            <p className="text-xs text-[#8E9299]">
              Real-time spread detection for cash-and-carry & delta-neutral funding yield
            </p>
          </div>
        </div>

        {/* Next Settlement Countdown */}
        <div className="flex items-center gap-2 bg-[#1a1b22] px-3 py-1.5 rounded-lg border border-[#2a2b30]">
          <Clock className="w-4 h-4 text-[#8E9299]" />
          <span className="text-xs text-[#8E9299]">Next Settlement:</span>
          <span className="text-xs font-mono font-bold text-amber-400">{countdownFormatted}</span>
        </div>
      </div>

      {/* Recommended Arbitrage Opportunity Card */}
      {currentFunding.spreadApr > 0 && currentFunding.bestLongExchange && currentFunding.bestShortExchange && (
        <div className="bg-gradient-to-r from-[#1a1b22] via-[#1f202b] to-[#1a1b22] border border-[#2F6BFF]/30 rounded-xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Optimal Delta-Neutral Execution:</span>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/30">
                  Spread APR: +{currentFunding.spreadApr}%
                </span>
              </div>
              <p className="text-xs text-[#d1d5db] mt-0.5">
                Buy Long on <strong className="text-white capitalize">{currentFunding.bestLongExchange}</strong> and Sell Short on{' '}
                <strong className="text-white capitalize">{currentFunding.bestShortExchange}</strong> to capture positive funding carry.
              </p>
            </div>
          </div>
          <div className="text-right ml-auto">
            <span className="text-[11px] text-[#8E9299]">Max Spread (8h)</span>
            <div className="text-sm font-bold font-mono text-emerald-400">
              +{(currentFunding.spread * 100).toFixed(4)}%
            </div>
          </div>
        </div>
      )}

      {/* Exchange Cards Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Bybit Card */}
        <div className="bg-[#1a1b22] border border-[#2a2b30] rounded-xl p-3.5 space-y-2 hover:border-[#3a3b45] transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExchangeIcon exchange="bybit" className="w-4 h-4" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">Bybit V5</span>
            </div>
            <span className="text-[10px] text-[#8E9299]">Linear Perp</span>
          </div>
          <div className="pt-1">
            <div className="text-[11px] text-[#8E9299]">Current 8h Rate</div>
            <div className={`text-lg font-bold font-mono ${getRateColor(currentFunding.bybitRate)}`}>
              {formatRate(currentFunding.bybitRate)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2a2b30]/60">
            <span className="text-[#8E9299]">Annualized (APR)</span>
            <span className={`font-mono font-semibold ${getRateColor(currentFunding.bybitRate)}`}>
              {formatApr(currentFunding.bybitRate)}
            </span>
          </div>
        </div>

        {/* OKX Card */}
        <div className="bg-[#1a1b22] border border-[#2a2b30] rounded-xl p-3.5 space-y-2 hover:border-[#3a3b45] transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExchangeIcon exchange="okx" className="w-4 h-4" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">OKX V5</span>
            </div>
            <span className="text-[10px] text-[#8E9299]">Swap Perp</span>
          </div>
          <div className="pt-1">
            <div className="text-[11px] text-[#8E9299]">Current 8h Rate</div>
            <div className={`text-lg font-bold font-mono ${getRateColor(currentFunding.okxRate)}`}>
              {formatRate(currentFunding.okxRate)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2a2b30]/60">
            <span className="text-[#8E9299]">Next Predicted</span>
            <span className={`font-mono font-semibold ${getRateColor(currentFunding.predictedOkxRate)}`}>
              {formatRate(currentFunding.predictedOkxRate)}
            </span>
          </div>
        </div>

        {/* Bitget Card */}
        <div className="bg-[#1a1b22] border border-[#2a2b30] rounded-xl p-3.5 space-y-2 hover:border-[#3a3b45] transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExchangeIcon exchange="bitget" className="w-4 h-4" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">Bitget V2/V3</span>
            </div>
            <span className="text-[10px] text-[#8E9299]">USDT Futures</span>
          </div>
          <div className="pt-1">
            <div className="text-[11px] text-[#8E9299]">Current 8h Rate</div>
            <div className={`text-lg font-bold font-mono ${getRateColor(currentFunding.bitgetRate)}`}>
              {formatRate(currentFunding.bitgetRate)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2a2b30]/60">
            <span className="text-[#8E9299]">Annualized (APR)</span>
            <span className={`font-mono font-semibold ${getRateColor(currentFunding.bitgetRate)}`}>
              {formatApr(currentFunding.bitgetRate)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Cross-Exchange Arbitrage Rankings Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            Top Market Arbitrage Spreads
          </span>
          <span className="text-[11px] text-[#8E9299]">Click coin to switch view</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1a1b22] text-[#8E9299] uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2 rounded-l-lg">Coin</th>
                <th className="px-3 py-2">Bybit Rate</th>
                <th className="px-3 py-2">OKX Rate</th>
                <th className="px-3 py-2">Bitget Rate</th>
                <th className="px-3 py-2">Spread (8h)</th>
                <th className="px-3 py-2 text-right rounded-r-lg">Spread APR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2b30]/40">
              {fundingArbitrage.slice(0, 5).map((item) => (
                <tr
                  key={item.symbol}
                  onClick={() => setSelectedSymbol(item.symbol)}
                  className="hover:bg-[#1a1b22] cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2.5 font-bold text-white flex items-center gap-1.5">
                    <span>{item.symbol}</span>
                    {item.symbol === snapshot.symbol && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF]" />
                    )}
                  </td>
                  <td className={`px-3 py-2.5 font-mono ${getRateColor(item.bybitRate)}`}>
                    {formatRate(item.bybitRate)}
                  </td>
                  <td className={`px-3 py-2.5 font-mono ${getRateColor(item.okxRate)}`}>
                    {formatRate(item.okxRate)}
                  </td>
                  <td className={`px-3 py-2.5 font-mono ${getRateColor(item.bitgetRate)}`}>
                    {formatRate(item.bitgetRate)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[#d1d5db]">
                    +{(item.spread * 100).toFixed(4)}%
                  </td>
                  <td className="px-3 py-2.5 font-mono font-bold text-right text-emerald-400">
                    +{item.spreadApr}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
