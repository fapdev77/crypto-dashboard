import React from 'react';
import { Calendar } from 'lucide-react';
import { DailyTokenUsage } from '../../store/aiTelemetryStore';

interface AiDailyTokenChartProps {
  dailyUsage: Record<string, DailyTokenUsage>;
}

export const AiDailyTokenChart: React.FC<AiDailyTokenChartProps> = ({ dailyUsage }) => {
  const days = Object.values(dailyUsage).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  const maxTokens = Math.max(...days.map((d) => d.totalTokens), 100);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#2F6BFF]" />
            Daily Token Consumption (Last 7 Days)
          </h3>
          <p className="text-xs text-[#8E9299]">
            Daily monitoring of prompt and completion token volumes
          </p>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="py-8 text-center text-[#8E9299] text-xs">
          No daily token consumption recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((day) => {
            const pct = Math.min(100, Math.max(4, Math.round((day.totalTokens / maxTokens) * 100)));
            return (
              <div key={day.date} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-gray-300 font-medium">{day.date}</span>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="text-[#8E9299]">{day.callsCount} calls</span>
                    <span className="text-emerald-400 font-medium">{formatNumber(day.totalTokens)} tokens</span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-[#0b0c10] border border-[#2a2b30] rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${pct}%` }}
                    className="h-full bg-gradient-to-r from-[#2F6BFF] to-emerald-400 rounded-full transition-all duration-500"
                  />
                </div>

                <div className="flex justify-between text-[10px] text-[#8E9299] font-mono">
                  <span>Prompt: {formatNumber(day.promptTokens)}</span>
                  <span>Completion: {formatNumber(day.completionTokens)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
