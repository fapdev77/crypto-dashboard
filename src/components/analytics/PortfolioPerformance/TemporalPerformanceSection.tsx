import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DayOfWeekItem,
  TimeOfDayItem,
} from '../../../hooks/usePortfolioPerformance';
import { AppTooltip } from '../../ui/Tooltip';
import { Clock, CalendarDays, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';

import { getDenominationDecimals } from '../../../utils/portfolioPerformanceEngine';

interface Props {
  dayOfWeek: {
    list: DayOfWeekItem[];
    bestDay: { name: string; gain: number };
    worstDay: { name: string; gain: number };
  };
  timeOfDay: {
    list: TimeOfDayItem[];
    bestTime: { period: string; gain: number };
    worstTime: { period: string; gain: number };
  };
  denomination: string;
  isPrivateMode: boolean;
}

export const TemporalPerformanceSection = React.memo(function TemporalPerformanceSection({
  dayOfWeek,
  timeOfDay,
  denomination,
  isPrivateMode,
}: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'dayOfWeek' | 'timeOfDay'>('dayOfWeek');
  const decimals = getDenominationDecimals(denomination);

  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return String(val);
  };

  const formatGain = (val: number) => {
    if (isPrivateMode) return '****';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(decimals)} ${denomination}`;
  };

  return (
    <div className="space-y-4">
      {/* Header and Tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-line/60">
        <h3 className="text-base font-bold text-fg flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          {t('analytics.portfolio.temporal.title', 'Temporal Performance Analysis')}
        </h3>

        <div className="flex items-center gap-1 bg-elevated p-1 rounded-lg border border-line">
          <button
            onClick={() => setActiveTab('dayOfWeek')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'dayOfWeek'
                ? 'bg-accent text-white shadow-sm'
                : 'text-fg-muted hover:text-fg hover:bg-line/40'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{t('analytics.portfolio.temporal.dayOfWeekTab', 'Day of Week')}</span>
          </button>
          <button
            onClick={() => setActiveTab('timeOfDay')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'timeOfDay'
                ? 'bg-accent text-white shadow-sm'
                : 'text-fg-muted hover:text-fg hover:bg-line/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('analytics.portfolio.temporal.timeOfDayTab', 'Time of Day')}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-6 shadow-sm">
        {activeTab === 'dayOfWeek' ? (
          <div className="space-y-6">
            {/* Highlights: Best vs Worst Day */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-elevated border border-emerald-500/20 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                    {t('analytics.portfolio.temporal.bestDay', 'Best Day of Week')}
                  </span>
                  <div className="text-lg font-bold text-fg">
                    {dayOfWeek.bestDay.name}
                  </div>
                  <div className="text-xs font-mono tabular-nums font-bold text-emerald-400 mt-1">
                    {formatGain(dayOfWeek.bestDay.gain)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="bg-elevated border border-rose-500/20 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                    Lowest / Worst Day
                  </span>
                  <div className="text-lg font-bold text-fg">
                    {dayOfWeek.worstDay.name}
                  </div>
                  <div className="text-xs font-mono tabular-nums font-bold text-rose-400 mt-1">
                    {formatGain(dayOfWeek.worstDay.gain)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/30">
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                </div>
              </div>
            </div>

            {/* Bar Chart: Monday - Sunday Total Gain */}
            <div className="bg-elevated/50 border border-line/60 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent" />
                Total Return by Day (UTC)
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeek.list} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <XAxis
                      dataKey="dayName"
                      stroke="#8E9299"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#2a2b30' }}
                    />
                    <YAxis
                      stroke="#8E9299"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#2a2b30' }}
                      tickFormatter={(val) => isPrivateMode ? '****' : String(val)}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as DayOfWeekItem;
                          return (
                            <div className="bg-[#1b1c20] border border-line p-3 rounded-lg shadow-xl text-xs space-y-1 font-mono tabular-nums">
                              <p className="font-bold font-sans text-fg border-b border-line pb-1">
                                {data.dayName} (UTC)
                              </p>
                              <div className="flex justify-between gap-4 text-fg-muted">
                                <span>Operations:</span>
                                <span className="text-fg">{maskVal(data.trades)}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-fg-muted">
                                <span>Trading Result:</span>
                                <span className={data.tradingGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {formatGain(data.tradingGain)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-fg-muted">
                                <span>Funding Result:</span>
                                <span className={data.fundingGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {formatGain(data.fundingGain)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-fg-muted pt-1 border-t border-line">
                                <span className="font-bold text-fg">Total Result:</span>
                                <span className={`font-bold ${data.totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {formatGain(data.totalGain)}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="totalGain" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {dayOfWeek.list.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.totalGain >= 0 ? '#10B981' : '#EF4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-line rounded-lg overflow-hidden">
                <thead className="bg-[#1b1c20] text-fg-muted uppercase text-[10px] tracking-wider border-b border-line">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Day of Week (UTC)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Trades / Ops</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Trading Result</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Funding Result</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Total Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 font-mono tabular-nums">
                  {dayOfWeek.list.map((d) => (
                    <tr key={d.dayName} className="hover:bg-elevated transition-colors">
                      <td className="py-2.5 px-4 font-sans font-medium text-fg flex items-center gap-2">
                        <span>{d.dayName}</span>
                        {d.dayName === dayOfWeek.bestDay.name && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-sans uppercase font-bold">
                            Best
                          </span>
                        )}
                        {d.dayName === dayOfWeek.worstDay.name && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-sans uppercase font-bold">
                            Lowest
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right text-fg-muted">{maskVal(d.trades)}</td>
                      <td className={`py-2.5 px-4 text-right ${d.tradingGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatGain(d.tradingGain)}
                      </td>
                      <td className={`py-2.5 px-4 text-right ${d.fundingGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatGain(d.fundingGain)}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-bold ${d.totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatGain(d.totalGain)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Time of Day tab */
          <div className="space-y-6">
            {/* Highlights: Best vs Worst Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-elevated border border-emerald-500/20 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                    Best Time Window
                  </span>
                  <div className="text-lg font-bold text-fg">
                    {timeOfDay.bestTime.period}
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                    {formatGain(timeOfDay.bestTime.gain)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="bg-elevated border border-rose-500/20 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                    Lowest Time Window
                  </span>
                  <div className="text-lg font-bold text-fg">
                    {timeOfDay.worstTime.period}
                  </div>
                  <div className="text-xs font-mono font-bold text-rose-400 mt-1">
                    {formatGain(timeOfDay.worstTime.gain)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/30">
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                </div>
              </div>
            </div>

            {/* Bar Chart: 4h Intervals Total Gain */}
            <div className="bg-elevated/50 border border-line/60 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent" />
                Total Return by 4-Hour Time Bucket (UTC)
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeOfDay.list} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <XAxis
                      dataKey="periodLabel"
                      stroke="#8E9299"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#2a2b30' }}
                    />
                    <YAxis
                      stroke="#8E9299"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#2a2b30' }}
                      tickFormatter={(val) => isPrivateMode ? '****' : String(val)}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as TimeOfDayItem;
                          return (
                            <div className="bg-[#1b1c20] border border-line p-3 rounded-lg shadow-xl text-xs space-y-1">
                              <p className="font-bold text-fg border-b border-line pb-1">
                                {data.periodLabel}
                              </p>
                              <div className="flex justify-between gap-4 text-fg-muted">
                                <span>Operations:</span>
                                <span className="font-mono text-fg">{maskVal(data.trades)}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-fg-muted">
                                <span>Trading Result:</span>
                                <span className={`font-mono ${data.tradingGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {formatGain(data.tradingGain)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-fg-muted">
                                <span>Funding Result:</span>
                                <span className={`font-mono ${data.fundingGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {formatGain(data.fundingGain)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-fg-muted pt-1 border-t border-line">
                                <span className="font-bold text-fg">Total Result:</span>
                                <span className={`font-mono font-bold ${data.totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {formatGain(data.totalGain)}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="totalGain" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {timeOfDay.list.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.totalGain >= 0 ? '#10B981' : '#EF4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Time Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-line rounded-lg overflow-hidden">
                <thead className="bg-[#1b1c20] text-fg-muted uppercase text-[10px] tracking-wider border-b border-line">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Time Window (UTC)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Trades / Ops</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Trading Result</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Funding Result</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Total Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 font-mono tabular-nums">
                  {timeOfDay.list.map((t) => (
                    <tr key={t.periodLabel} className="hover:bg-elevated transition-colors">
                      <td className="py-2.5 px-4 font-sans font-medium text-fg flex items-center gap-2">
                        <span>{t.periodLabel}</span>
                        {t.periodLabel === timeOfDay.bestTime.period && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-sans uppercase font-bold">
                            Best
                          </span>
                        )}
                        {t.periodLabel === timeOfDay.worstTime.period && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-sans uppercase font-bold">
                            Lowest
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right text-fg-muted">{maskVal(t.trades)}</td>
                      <td className={`py-2.5 px-4 text-right ${t.tradingGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatGain(t.tradingGain)}
                      </td>
                      <td className={`py-2.5 px-4 text-right ${t.fundingGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatGain(t.fundingGain)}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-bold ${t.totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatGain(t.totalGain)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
