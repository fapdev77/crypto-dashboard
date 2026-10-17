import React from 'react';
import { BarChart3 } from 'lucide-react';
import { AiModelTelemetrySummary } from '../../types/aiTypes';

interface AiModelStatsTableProps {
  summaries: Record<string, AiModelTelemetrySummary>;
}

export const AiModelStatsTable: React.FC<AiModelStatsTableProps> = ({ summaries }) => {
  const summaryList = Object.values(summaries);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  const formatTime = (ts: number | null) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-[#2a2b30] bg-[#151619]">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          Statistics by AI Model
        </h3>
        <p className="text-xs text-[#8E9299]">
          Detailed breakdown of inference volume, average latency, and token efficiency per model
        </p>
      </div>

      <div className="overflow-x-auto bg-[#0b0c10]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#2a2b30] bg-[#151619] text-[#8E9299] uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Model & Provider</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Invocations</th>
              <th className="py-3 px-4 text-right">Tokens (Prompt/Compl)</th>
              <th className="py-3 px-4 text-right">Avg/Call</th>
              <th className="py-3 px-4 text-right">Avg Latency</th>
              <th className="py-3 px-4 text-right">Est. Cost</th>
              <th className="py-3 px-4 text-right">Last Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2b30] text-gray-300">
            {summaryList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#8E9299]">
                  No inference data recorded yet. Statistics will populate as the assistant is used.
                </td>
              </tr>
            ) : (
              summaryList.map((item) => {
                const avgTokensPerCall = item.callsCount > 0 ? Math.round(item.totalTokens / item.callsCount) : 0;
                return (
                  <tr key={item.modelId} className="hover:bg-[#151619]/80 transition font-mono">
                    <td className="py-3 px-4 font-sans font-medium text-white">
                      <div>{item.modelName}</div>
                      <span className="text-[10px] text-[#8E9299] font-mono uppercase">{item.provider}</span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-white">{formatNumber(item.callsCount)}</td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      <span className="text-emerald-400">{formatNumber(item.promptTokens)}</span> /{' '}
                      <span className="text-[#2F6BFF]">{formatNumber(item.completionTokens)}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">{formatNumber(avgTokensPerCall)}</td>
                    <td className="py-3 px-4 text-right text-amber-400">{item.averageDurationMs} ms</td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                      ${item.estimatedCostUsd.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right text-[#8E9299] text-[11px] font-sans">
                      {formatTime(item.lastUsedTimestamp)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
