import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const series = propSeries || evolutionSeries || [];

  const customTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: EvolutionPoint }> }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const otherOpGain = data.otherOpGain ?? 0;
    return (
      <div className="bg-elevated border border-line p-3 rounded-lg shadow-xl text-xs space-y-1.5 font-mono tabular-nums">
        <div className="font-semibold text-fg border-b border-line pb-1">
          {new Date(data.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          })}{' '}
          <span className="text-[10px] text-fg-muted">(UTC)</span>
        </div>
        <div className="flex justify-between gap-4 text-amber-400">
          <span>Trading Gain:</span>
          <span>{isPrivateMode ? '****' : `${data.tradingGain > 0 ? '+' : ''}${data.tradingGain} ${denomination}`}</span>
        </div>
        <div className="flex justify-between gap-4 text-emerald-400">
          <span>Funding Gain:</span>
          <span>{isPrivateMode ? '****' : `${data.fundingGain > 0 ? '+' : ''}${data.fundingGain} ${denomination}`}</span>
        </div>
        {otherOpGain !== 0 && (
          <div className="flex justify-between gap-4 text-cyan-400">
            <span>Other Ops:</span>
            <span>{isPrivateMode ? '****' : `${otherOpGain > 0 ? '+' : ''}${otherOpGain} ${denomination}`}</span>
          </div>
        )}
        <div className="flex justify-between gap-4 text-fg font-bold pt-1 border-t border-line/60">
          <span>Total Combined:</span>
          <span>{isPrivateMode ? '****' : `${data.totalGain > 0 ? '+' : ''}${data.totalGain} ${denomination}`}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line/60">
        <h3 className="text-base font-bold text-fg flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          {t('analytics.portfolio.evolution.title', 'Balance Evolution')}
        </h3>
        <span className="text-xs text-fg-muted">Cumulative Progression (UTC)</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Trading Gains Evolution */}
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-fg uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Trading Gains Evolution ({denomination})
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-fg uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Funding Gains Evolution ({denomination})
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
