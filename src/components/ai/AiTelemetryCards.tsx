import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Clock, Cpu, Coins } from 'lucide-react';
import { AiTelemetryStats } from '../../types/aiTypes';
import { AppTooltip } from '../ui/Tooltip';

interface AiTelemetryCardsProps {
  stats: AiTelemetryStats;
}

export const AiTelemetryCards: React.FC<AiTelemetryCardsProps> = ({ stats }) => {
  const { t } = useTranslation();
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatLatency = (ms: number) => {
    if (ms === 0) return '0 ms';
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const formatLastActivity = (ts: number | null) => {
    if (!ts) return 'None';
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.round(diffMin / 60);
    return `${diffHours}h ago`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Calls */}
      <AppTooltip
        description="Total number of AI requests, queries, and assistant interactions processed by the engine."
        side="top"
      >
        <div className="bg-surface border border-line rounded-xl p-4 shadow-lg flex items-center justify-between cursor-default hover:border-line-strong transition">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted block mb-1">
              {t('ai.settings.telemetry.totalCalls', 'Total Invocations')}
            </span>
            <div className="text-2xl font-bold text-fg font-mono">
              {formatNumber(stats.totalCalls)}
            </div>
            <span className="text-[10px] text-fg-muted mt-0.5 block">
              Last: {formatLastActivity(stats.lastActivityTimestamp)}
            </span>
          </div>
          <div className="p-3 bg-accent/10 border border-accent/25 rounded-xl text-accent">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </AppTooltip>

      {/* Total Tokens */}
      <AppTooltip
        description="Consolidated count of prompt tokens sent and completion tokens generated across all active models."
        side="top"
      >
        <div className="bg-surface border border-line rounded-xl p-4 shadow-lg flex items-center justify-between cursor-default hover:border-line-strong transition">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted block mb-1">
              {t('ai.settings.telemetry.totalTokens', 'Total Tokens Used')}
            </span>
            <div className="text-2xl font-bold text-fg font-mono">
              {formatNumber(stats.totalTokens)}
            </div>
            <span className="text-[10px] text-fg-muted mt-0.5 block">
              Prompt: {formatNumber(stats.totalPromptTokens)} | Compl: {formatNumber(stats.totalCompletionTokens)}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
      </AppTooltip>

      {/* {t('ai.settings.telemetry.avgLatency', 'Average Latency')} */}
      <AppTooltip
        description="Average round-trip response time from query submission to completion generation across models."
        side="top"
      >
        <div className="bg-surface border border-line rounded-xl p-4 shadow-lg flex items-center justify-between cursor-default hover:border-line-strong transition">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted block mb-1">
              {t('ai.settings.telemetry.avgLatency', 'Average Latency')}
            </span>
            <div className="text-2xl font-bold text-fg font-mono">
              {formatLatency(stats.averageLatencyMs)}
            </div>
            <span className="text-[10px] text-fg-muted mt-0.5 block">
              Total runtime: {formatLatency(stats.totalDurationMs)}
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </AppTooltip>

      {/* Estimated Cost */}
      <AppTooltip
        description="Theoretical USD cost based on token pricing benchmarks. Local Ollama instances always incur $0.00."
        side="top"
      >
        <div className="bg-surface border border-line rounded-xl p-4 shadow-lg flex items-center justify-between cursor-default hover:border-line-strong transition">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted block mb-1">
              {t('ai.settings.telemetry.estimatedCost', 'Estimated Cost')}
            </span>
            <div className="text-2xl font-bold text-fg font-mono">
              ${stats.estimatedCostUsd.toFixed(4)}
            </div>
            <span className="text-[10px] text-emerald-400 mt-0.5 block">
              Local Ollama = $0.00
            </span>
          </div>
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </AppTooltip>
    </div>
  );
};
