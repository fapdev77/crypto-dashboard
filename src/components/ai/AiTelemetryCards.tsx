import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Clock, Cpu, Coins } from 'lucide-react';
import { AiTelemetryStats } from '../../types/aiTypes';
import { AppTooltip } from '../ui/Tooltip';

interface AiTelemetryCardsProps {
  stats: AiTelemetryStats;
}

export const AiTelemetryCards: React.FC<AiTelemetryCardsProps> = ({ stats }) => {
  const { t, i18n } = useTranslation();
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(i18n.language).format(num);
  };

  const formatLatency = (ms: number) => {
    if (ms === 0) return '0 ms';
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const formatLastActivity = (ts: number | null) => {
    if (!ts) return t('common.none', 'None');
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return t('ai.telemetry.justNow', 'Just now');
    if (diffMin < 60) return t('ai.telemetry.minutesAgo', '{{count}}m ago', { count: diffMin });
    const diffHours = Math.round(diffMin / 60);
    return t('ai.telemetry.hoursAgo', '{{count}}h ago', { count: diffHours });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Calls */}
      <AppTooltip
        description={t('ai.telemetry.tooltips.totalRequests', 'Total number of AI requests, queries, and assistant interactions processed by the engine.')}
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
              {t('ai.telemetry.lastPrefix', 'Last:')} {formatLastActivity(stats.lastActivityTimestamp)}
            </span>
          </div>
          <div className="p-3 bg-accent/10 border border-accent/25 rounded-xl text-accent">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </AppTooltip>

      {/* Total Tokens */}
      <AppTooltip
        description={t('ai.telemetry.tooltips.totalTokens', 'Consolidated count of prompt tokens sent and completion tokens generated across all active models.')}
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
              {t('ai.telemetry.promptShort', 'Prompt')}: {formatNumber(stats.totalPromptTokens)} | {t('ai.telemetry.complShort', 'Compl')}: {formatNumber(stats.totalCompletionTokens)}
            </span>
          </div>
          <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-success">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
      </AppTooltip>

      {/* Average Latency */}
      <AppTooltip
        description={t('ai.telemetry.tooltips.avgLatency', 'Average round-trip response time from query submission to completion generation across models.')}
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
              {t('ai.telemetry.totalRuntime', 'Total runtime:')} {formatLatency(stats.totalDurationMs)}
            </span>
          </div>
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl text-warning">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </AppTooltip>

      {/* Estimated Cost */}
      <AppTooltip
        description={t('ai.telemetry.tooltips.theoreticalCost', 'Theoretical USD cost based on token pricing benchmarks. Local Ollama instances always incur $0.00.')}
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
            <span className="text-[10px] text-success mt-0.5 block">
              {t('ai.telemetry.localOllamaFree', 'Local Ollama = $0.00')}
            </span>
          </div>
          <div className="p-3 bg-tone-cyan/10 border border-tone-cyan/20 rounded-xl text-tone-cyan">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </AppTooltip>
    </div>
  );
};
