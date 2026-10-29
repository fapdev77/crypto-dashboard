import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'dayOfWeek' | 'timeOfDay'>('dayOfWeek');

  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return String(val);
  };

  const formatGain = (val: number) => {
    if (isPrivateMode) return '****';
    const sign = val > 0 ? '+' : '';
    const decimals = denomination === 'USD' ? 2 : 4;
    return `${sign}${val.toFixed(decimals)} ${denomination}`;
  };

  return (
    <div className="space-y-4">
      {/* Header and Tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#2a2b30]/60">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#2F6BFF]" />
          Temporal Performance Analysis
        </h3>

        <div className="flex items-center gap-1 bg-[#1a1b1e] p-1 rounded-lg border border-[#2a2b30]">
          <button
            onClick={() => setActiveTab('dayOfWeek')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'dayOfWeek'
                ? 'bg-[#2F6BFF] text-white shadow-sm'
                : 'text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/40'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Day of Week</span>
          </button>
          <button
            onClick={() => setActiveTab('timeOfDay')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'timeOfDay'
                ? 'bg-[#2F6BFF] text-white shadow-sm'
                : 'text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Time of Day</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-5 space-y-6 shadow-sm">
        {activeTab === 'dayOfWeek' ? (
          <div className="space-y-6">
            {/* Highlights: Best vs Worst Day */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#161b22] border border-emerald-500/20 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                    Best Day of Week
                  </span>
                  <div className="text-lg font-bold text-white">
                    {dayOfWeek.bestDay.name}
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                    {formatGain(dayOfWeek.bestDay.gain)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="bg-[#161b22] border border-rose-500/20 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                    Lowest / Worst Day
                  </span>
                  <div className="text-lg font-bold text-white">
                    {dayOfWeek.worstDay.name}
                  </div>
                  <div className="text-xs font-mono font-bold text-rose-400 mt-1">
                    {formatGain(dayOfWeek.worstDay.gain)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/30">
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                </div>
              </div>
            </div>

            {/* Bar Chart: Monday - Sunday Total Gain */}
            <div className="bg-[#1a1b1e]/50 border border-[#2a2b30]/60 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E9299] mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#2F6BFF]" />
                Total Return by Day (Trading + Funding)
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
                            <div className="bg-[#1b1c20] border border-[#2a2b30] p-3 rounded-lg shadow-xl text-xs space-y-1">
                              <p className="font-bold text-white border-b border-[#2a2b30] pb-1">
                                {data.dayName}
                              </p>
                              <div className="flex justify-between gap-4 text-[#8E9299]">
                                <span>Operations:</span>
                                <span className="font-mono text-white">{maskVal(data.trades)}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-[#8E9299]">
                                <span>Trading Result:</span>
                                <span className={`font-mono ${data.tradingGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {formatGain(data.tradingGain)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-[#8E9299]">
                                <span>Funding Result:</span>
                                <span className={`font-mono ${data.fundingGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {formatGain(data.fundingGain)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-[#8E9299] pt-1 border-t border-[#2a2b30]">
                                <span className="font-bold text-white">Total Result:</span>
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
              <table className="w-full text-left text-xs border border-[#2a2b30] rounded-lg overflow-hidden">
                <thead className="bg-[#1b1c20] text-[#8E9299] uppercase text-[10px] tracking-wider border-b border-[#2a2b30]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Day of Week</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Trades / Ops</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Trading Result</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Funding Result</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Total Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2b30]/60 font-mono">
                  {dayOfWeek.list.map((d) => (
                    <tr key={d.dayName} className="hover:bg-[#1a1b1e] transition-colors">
                      <td className="py-2.5 px-4 font-sans font-medium text-white flex items-center gap-2">
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
                      <td className="py-2.5 px-4 text-right text-[#8E9299]">{maskVal(d.trades)}</td>
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
              <div className="bg-[#161b22] border border-emerald-500/20 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                    Best Time Window
                  </span>
                  <div className="text-lg font-bold text-white">
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

              <div className="bg-[#161b22] border border-rose-500/20 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                    Lowest Time Window
                  </span>
                  <div className="text-lg font-bold text-white">
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
            <div className="bg-[#1a1b1e]/50 border border-[#2a2b30]/60 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E9299] mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#2F6BFF]" />
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
                            <div className="bg-[#1b1c20] border border-[#2a2b30] p-3 rounded-lg shadow-xl text-xs space-y-1">
                              <p className="font-bold text-white border-b border-[#2a2b30] pb-1">
                                {data.periodLabel}
                              </p>
                              <div className="flex justify-between gap-4 text-[#8E9299]">
                                <span>Operations:</span>
                                <span className="font-mono text-white">{maskVal(data.trades)}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-[#8E9299]">
                                <span>Trading Result:</span>
                                <span className={`font-mono ${data.tradingGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {formatGain(data.tradingGain)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-[#8E9299]">
                                <span>Funding Result:</span>
                                <span className={`font-mono ${data.fundingGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {formatGain(data.fundingGain)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-[#8E9299] pt-1 border-t border-[#2a2b30]">
                                <span className="font-bold text-white">Total Result:</span>
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
              <table className="w-full text-left text-xs border border-[#2a2b30] rounded-lg overflow-hidden">
                <thead className="bg-[#1b1c20] text-[#8E9299] uppercase text-[10px] tracking-wider border-b border-[#2a2b30]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Time Window (UTC)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Trades / Ops</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Trading Result</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Funding Result</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Total Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2b30]/60 font-mono">
                  {timeOfDay.list.map((t) => (
                    <tr key={t.periodLabel} className="hover:bg-[#1a1b1e] transition-colors">
                      <td className="py-2.5 px-4 font-sans font-medium text-white flex items-center gap-2">
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
                      <td className="py-2.5 px-4 text-right text-[#8E9299]">{maskVal(t.trades)}</td>
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
