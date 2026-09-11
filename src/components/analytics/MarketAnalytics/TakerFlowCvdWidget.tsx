import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';

export const TakerFlowCvdWidget: React.FC = () => {
  const { snapshot } = useMarketAnalyticsStore();

  if (!snapshot) return null;

  const { takerFlowHistory, oiHistory } = snapshot;

  const formatUsd = (val: number): string => {
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  // Compute total aggregates over the series
  const totalBuy = takerFlowHistory.reduce((acc, p) => acc + p.buyVol, 0);
  const totalSell = takerFlowHistory.reduce((acc, p) => acc + p.sellVol, 0);
  const netDeltaTotal = totalBuy - totalSell;
  const latestCvd = takerFlowHistory.length > 0 ? takerFlowHistory[takerFlowHistory.length - 1].cvd : 0;

  // Check for CVD / Price Divergence
  const priceStart = oiHistory.length > 0 ? oiHistory[0].price : 0;
  const priceEnd = oiHistory.length > 0 ? oiHistory[oiHistory.length - 1].price : 0;
  const isPriceUp = priceEnd > priceStart;
  const isCvdUp = latestCvd > 0;

  let divergenceAlert: { title: string; desc: string; type: 'warning' | 'info' } | null = null;
  if (isPriceUp && !isCvdUp) {
    divergenceAlert = {
      title: 'Bearish Absorption Warning',
      desc: 'Price is rising despite net negative Taker Flow (CVD falling). This suggests passive limit sellers or market exhaustion.',
      type: 'warning',
    };
  } else if (!isPriceUp && isCvdUp) {
    divergenceAlert = {
      title: 'Bullish Accumulation Divergence',
      desc: 'Price is declining while Taker Volume Delta is positive (CVD rising). Limit orders are absorbing aggressive selling pressure.',
      type: 'info',
    };
  }

  return (
    <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Order Flow & Cumulative Volume Delta (CVD)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#1a1b22] text-[#d1d5db] border border-[#2a2b30] rounded">
                Taker Buy vs. Sell
              </span>
            </div>
            <p className="text-xs text-[#8E9299]">
              Measures aggressive market orders entering the book vs. passive limit absorption
            </p>
          </div>
        </div>

        {/* Aggregated Net Flow */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-[11px] text-[#8E9299] block font-sans">Period Taker Delta</span>
            <span
              className={`text-base font-bold ${
                netDeltaTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {netDeltaTotal >= 0 ? '+' : ''}{formatUsd(netDeltaTotal)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-[#8E9299] block font-sans">CVD Net Balance</span>
            <span
              className={`text-base font-bold ${
                latestCvd >= 0 ? 'text-cyan-400' : 'text-amber-400'
              }`}
            >
              {latestCvd >= 0 ? '+' : ''}{formatUsd(latestCvd)}
            </span>
          </div>
        </div>
      </div>

      {/* Divergence Notification if present */}
      {divergenceAlert && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
            divergenceAlert.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">{divergenceAlert.title}: </strong>
            <span className="text-[#d1d5db]">{divergenceAlert.desc}</span>
          </div>
        </div>
      )}

      {/* Volume Ratio Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Taker Buy: {formatUsd(totalBuy)} (
            {Math.round((totalBuy / (totalBuy + totalSell || 1)) * 100)}%)
          </span>
          <span className="text-rose-400 font-semibold flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Taker Sell: {formatUsd(totalSell)} (
            {Math.round((totalSell / (totalBuy + totalSell || 1)) * 100)}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#1a1b22] overflow-hidden flex">
          <div
            style={{ width: `${(totalBuy / (totalBuy + totalSell || 1)) * 100}%` }}
            className="bg-emerald-500 h-full transition-all"
          />
          <div
            style={{ width: `${(totalSell / (totalBuy + totalSell || 1)) * 100}%` }}
            className="bg-rose-500 h-full transition-all"
          />
        </div>
      </div>

      {/* Recharts ComposedChart: Net Delta Bars + CVD Line */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={takerFlowHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <XAxis
              dataKey="timeLabel"
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#2a2b30' }}
            />
            {/* Left Y-Axis: Net Delta Bar */}
            <YAxis
              yAxisId="delta"
              orientation="left"
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => formatUsd(val)}
            />
            {/* Right Y-Axis: CVD Line */}
            <YAxis
              yAxisId="cvd"
              orientation="right"
              stroke="#38bdf8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => formatUsd(val)}
            />
            <ReferenceLine yAxisId="delta" y={0} stroke="#374151" strokeDasharray="3 3" />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#1a1b22] border border-[#2a2b30] rounded-lg p-3 shadow-xl text-xs space-y-1.5 font-mono">
                      <div className="text-[#8E9299] font-sans font-semibold border-b border-[#2a2b30] pb-1">
                        Time: {data.timeLabel}
                      </div>
                      <div className="flex items-center justify-between gap-4 text-emerald-400">
                        <span className="font-sans">Taker Buy:</span>
                        <span>{formatUsd(data.buyVol)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-rose-400">
                        <span className="font-sans">Taker Sell:</span>
                        <span>{formatUsd(data.sellVol)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-[#2a2b30]/60 pt-1 font-bold">
                        <span className="text-[#8E9299] font-sans">Net Delta:</span>
                        <span className={data.netDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {data.netDelta >= 0 ? '+' : ''}{formatUsd(data.netDelta)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-cyan-400 font-bold">
                        <span className="text-[#8E9299] font-sans">Cumulative (CVD):</span>
                        <span>{formatUsd(data.cvd)}</span>
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
            <Bar yAxisId="delta" dataKey="netDelta" name="Net Delta per Candle" barSize={8}>
              {takerFlowHistory.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.netDelta >= 0 ? '#10b981' : '#f43f5e'}
                />
              ))}
            </Bar>
            <Line
              yAxisId="cvd"
              type="monotone"
              dataKey="cvd"
              name="Cumulative Volume Delta (CVD)"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
