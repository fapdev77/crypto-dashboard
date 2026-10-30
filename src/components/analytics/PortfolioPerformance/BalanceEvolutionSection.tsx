import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { EvolutionPoint } from '../../../hooks/usePortfolioPerformance';
import { TrendingUp, Activity } from 'lucide-react';

interface Props {
  series?: EvolutionPoint[];
  evolutionSeries?: EvolutionPoint[];
  denomination: string;
  isPrivateMode: boolean;
}

export const BalanceEvolutionSection = React.memo(function BalanceEvolutionSection({
  series: propSeries,
  evolutionSeries,
  denomination,
  isPrivateMode,
}: Props) {
  const series = propSeries || evolutionSeries || [];
  // Sample series to avoid rendering excessive SVG nodes (max 80 points)
  const sampledSeries = React.useMemo(() => {
    if (series.length <= 80) return series;
    const step = Math.ceil(series.length / 80);
    const result: EvolutionPoint[] = [];
    for (let i = 0; i < series.length; i += step) {
      result.push(series[i]);
    }
    // Always include the last point
    if (result[result.length - 1] !== series[series.length - 1]) {
      result.push(series[series.length - 1]);
    }
    return result;
  }, [series]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload as EvolutionPoint;
    return (
      <div className="bg-[#161b22] border border-[#2a2b30] p-3 rounded-lg shadow-xl text-xs space-y-1.5 font-mono">
        <div className="font-semibold text-white border-b border-[#2a2b30] pb-1">
          {new Date(data.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
        <div className="flex justify-between gap-4 text-amber-400">
          <span>Trading Gain:</span>
          <span>{isPrivateMode ? '****' : `${data.tradingGain > 0 ? '+' : ''}${data.tradingGain} ${denomination}`}</span>
        </div>
        <div className="flex justify-between gap-4 text-emerald-400">
          <span>Funding Gain:</span>
          <span>{isPrivateMode ? '****' : `${data.fundingGain > 0 ? '+' : ''}${data.fundingGain} ${denomination}`}</span>
        </div>
        <div className="flex justify-between gap-4 text-white font-bold pt-1 border-t border-[#2a2b30]/60">
          <span>Total Combined:</span>
          <span>{isPrivateMode ? '****' : `${data.totalGain > 0 ? '+' : ''}${data.totalGain} ${denomination}`}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#2a2b30]/60">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#2F6BFF]" />
          Balance Evolution
        </h3>
        <span className="text-xs text-[#8E9299]">Cumulative Progression</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Trading Gains Evolution */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Trading Gains Evolution ({denomination})
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sampledSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tradingGainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2b30" vertical={false} />
                <XAxis dataKey="dateStr" stroke="#8E9299" fontSize={10} tickLine={false} />
                <YAxis stroke="#8E9299" fontSize={10} tickLine={false} tickFormatter={(v) => isPrivateMode ? '****' : v} />
                <Tooltip content={customTooltip} />
                <Area
                  type="monotone"
                  dataKey="tradingGain"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#tradingGainGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Funding Gains Evolution */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Funding Gains Evolution ({denomination})
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sampledSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fundingGainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2b30" vertical={false} />
                <XAxis dataKey="dateStr" stroke="#8E9299" fontSize={10} tickLine={false} />
                <YAxis stroke="#8E9299" fontSize={10} tickLine={false} tickFormatter={(v) => isPrivateMode ? '****' : v} />
                <Tooltip content={customTooltip} />
                <Area
                  type="monotone"
                  dataKey="fundingGain"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#fundingGainGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
});
