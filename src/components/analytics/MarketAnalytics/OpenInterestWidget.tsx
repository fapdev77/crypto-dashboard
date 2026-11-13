import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';
import { MarketRegime } from '../../../types/marketAnalytics';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { OpenInterestMetricTooltip, MarketRegimeTooltip } from './MarketAnalyticsTooltips';

export const OpenInterestWidget: React.FC = () => {
  const { t } = useTranslation();
  const { snapshot, selectedMarkets, selectAllMarkets } = useMarketAnalyticsStore();

  if (!snapshot) return null;

  const hasDerivatives = selectedMarkets.some((m) => m !== 'SPOT');

  if (!hasDerivatives) {
    return (
      <div className="bg-canvas border border-line rounded-xl p-5 shadow-lg flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
        <div className="p-3 bg-accent/10 border border-accent/20 rounded-full text-accent">
          <Layers className="w-6 h-6" />
        </div>
        <div className="max-w-md">
          <h3 className="text-base font-semibold text-fg">Open Interest is Exclusive to Futures & Perpetuals</h3>
          <p className="text-xs text-fg-muted mt-1 leading-relaxed">
            Open Interest tracks the total outstanding derivative contracts that have not been settled. Spot trades settle immediately on-chain or in ledger without open contracts.
          </p>
        </div>
        <button
          onClick={selectAllMarkets}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-colors shadow"
        >
          View Consolidated Derivatives OI
        </button>
      </div>
    );
  }

  const {
    currentPrice,
    totalOiUsd,
    oiChange1hPercent,
    oiChange24hPercent,
    oiBreakdown,
    oiHistory,
    regime,
  } = snapshot;

  const formatUsd = (val: number): string => {
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1_000_000_000) return `${sign}$${(absVal / 1_000_000_000).toFixed(2)}B`;
    if (absVal >= 1_000_000) return `${sign}$${(absVal / 1_000_000).toFixed(2)}M`;
    if (absVal >= 1_000) return `${sign}$${(absVal / 1_000).toFixed(1)}K`;
    return `${sign}$${absVal.toFixed(2)}`;
  };

  const getRegimeColor = (sentiment: MarketRegime['sentiment']) => {
    switch (sentiment) {
      case 'bullish':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          dot: 'bg-emerald-400',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          dot: 'bg-amber-400',
        };
      case 'bearish':
        return {
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/30',
          text: 'text-rose-400',
          dot: 'bg-rose-400',
        };
      default:
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          dot: 'bg-blue-400',
        };
    }
  };

  const regimeStyle = getRegimeColor(regime.sentiment);

  // Calculate market shares
  const totalBreakdown = oiBreakdown.bybit + oiBreakdown.okx + oiBreakdown.bitget || 1;
  const bybitShare = Math.round((oiBreakdown.bybit / totalBreakdown) * 100);
  const okxShare = Math.round((oiBreakdown.okx / totalBreakdown) * 100);
  const bitgetShare = Math.max(0, 100 - (bybitShare + okxShare));

  return (
    <div className="bg-canvas border border-line rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <OpenInterestMetricTooltip>
                <h3 className="text-base font-bold text-fg tracking-tight cursor-help border-b border-dotted border-fg-muted/50 hover:text-amber-400 transition-colors">
                  Open Interest & Leverage Monitor
                </h3>
              </OpenInterestMetricTooltip>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-elevated text-fg border border-line rounded">
                Price vs. Open Interest
              </span>
            </div>
            <p className="text-xs text-fg-muted">
              Tracks speculative capital expansion, liquidation risk, and institutional positioning
            </p>
          </div>
        </div>

        {/* Total OI and Changes */}
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[11px] text-fg-muted text-right">Total Aggregate OI</div>
            <div className="text-lg font-bold font-mono text-fg text-right">
              {formatUsd(totalOiUsd)}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                oiChange24hPercent >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {oiChange24hPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              24h ΔOI: {oiChange24hPercent >= 0 ? '+' : ''}{oiChange24hPercent}%
            </span>
            <span className="text-[10px] text-fg-muted">
              1h ΔOI: {oiChange1hPercent >= 0 ? '+' : ''}{oiChange1hPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Market Regime Classifier Banner */}
      <MarketRegimeTooltip regime={regime.title} sentiment={regime.sentiment} description={regime.description}>
        <div className={`p-3.5 rounded-xl border ${regimeStyle.bg} ${regimeStyle.border} flex flex-wrap items-center justify-between gap-3 cursor-help transition-opacity hover:opacity-90`}>
          <div className="flex items-start gap-2.5 max-w-xl">
            <div className="mt-0.5 shrink-0">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${regimeStyle.dot} animate-pulse`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wide ${regimeStyle.text}`}>
                  Current Regime: {regime.title}
                </span>
              </div>
              <p className="text-xs text-fg mt-0.5 leading-relaxed">
                {regime.description}
              </p>
            </div>
          </div>
        <div className="flex items-center gap-3 text-xs ml-auto">
          <div className="bg-elevated/70 px-2.5 py-1 rounded-lg border border-line">
            <span className="text-fg-muted">24h Price: </span>
            <strong className={regime.priceChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {regime.priceChange24h >= 0 ? '+' : ''}{regime.priceChange24h.toFixed(2)}%
            </strong>
          </div>
          <div className="bg-elevated/70 px-2.5 py-1 rounded-lg border border-line">
            <span className="text-fg-muted">24h OI: </span>
            <strong className={regime.oiChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {regime.oiChange24h >= 0 ? '+' : ''}{regime.oiChange24h.toFixed(2)}%
            </strong>
          </div>
        </div>
      </div>
      </MarketRegimeTooltip>

      {/* Exchange OI Market Share Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-fg-muted">
          <span className="font-semibold uppercase text-[10px] tracking-wide">
            Exchange OI Liquidity Distribution
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-warning">
              <span className="w-2 h-2 rounded-full bg-warning" /> Bybit: {bybitShare}% ({formatUsd(oiBreakdown.bybit)})
            </span>
            <span className="flex items-center gap-1 text-accent">
              <span className="w-2 h-2 rounded-full bg-accent" /> OKX: {okxShare}% ({formatUsd(oiBreakdown.okx)})
            </span>
            <span className="flex items-center gap-1 text-success">
              <span className="w-2 h-2 rounded-full bg-success" /> Bitget: {bitgetShare}% ({formatUsd(oiBreakdown.bitget)})
            </span>
          </div>
        </div>

        {/* Multi-color Progress bar */}
        <div className="w-full h-2 rounded-full bg-elevated overflow-hidden flex">
          <div style={{ width: `${bybitShare}%` }} className="bg-warning h-full transition-all" />
          <div style={{ width: `${okxShare}%` }} className="bg-accent h-full transition-all" />
          <div style={{ width: `${bitgetShare}%` }} className="bg-success h-full transition-all" />
        </div>
      </div>

      {/* Interactive Dual-Axis Chart */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={oiHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="oiGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timeLabel"
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#2a2b30' }}
            />
            {/* Left Y Axis: Price */}
            <YAxis
              yAxisId="price"
              domain={['auto', 'auto']}
              orientation="left"
              stroke="#2F6BFF"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `$${val}`}
            />
            {/* Right Y Axis: Open Interest */}
            <YAxis
              yAxisId="oi"
              orientation="right"
              stroke="#f59e0b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => formatUsd(val)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-elevated border border-line rounded-lg p-3 shadow-xl text-xs space-y-1.5 font-mono">
                      <div className="text-fg-muted font-sans font-semibold border-b border-line pb-1">
                        Time: {data.timeLabel}
                      </div>
                      <div className="flex items-center justify-between gap-4 text-fg">
                        <span className="text-accent font-sans">Price:</span>
                        <span className="font-bold">${data.price}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-fg">
                        <span className="text-warning font-sans">Total OI:</span>
                        <span className="font-bold">{formatUsd(data.totalOiUsd)}</span>
                      </div>
                      <div className="text-[11px] text-fg-muted space-y-0.5 pt-1 border-t border-line/60">
                        <div>Bybit: {formatUsd(data.bybitOiUsd)}</div>
                        <div>OKX: {formatUsd(data.okxOiUsd)}</div>
                        <div>Bitget: {formatUsd(data.bitgetOiUsd)}</div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
            />
            <Area
              yAxisId="oi"
              type="monotone"
              dataKey="totalOiUsd"
              name="Open Interest (USD)"
              stroke="#f59e0b"
              fill="url(#oiGradient)"
              strokeWidth={2}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              name="Price (USD)"
              stroke="#2F6BFF"
              dot={false}
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
