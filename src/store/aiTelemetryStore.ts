import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AiTelemetryStats, AiModelTelemetrySummary, AiProviderType } from '../types/aiTypes';

export interface DailyTokenUsage {
  date: string; // 'YYYY-MM-DD'
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  callsCount: number;
}

interface AiTelemetryState {
  stats: AiTelemetryStats;
  modelSummaries: Record<string, AiModelTelemetrySummary>;
  dailyUsage: Record<string, DailyTokenUsage>;

  recordExecution: (params: {
    modelId: string;
    modelName: string;
    provider: AiProviderType;
    promptTokens: number;
    completionTokens: number;
    durationMs: number;
    estimatedCostUsd?: number;
    status: 'success' | 'rate_limited' | 'error' | 'refused_out_of_scope';
  }) => void;

  resetTelemetry: () => void;
}

const INITIAL_STATS: AiTelemetryStats = {
  totalCalls: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,
  totalDurationMs: 0,
  averageLatencyMs: 0,
  estimatedCostUsd: 0,
  lastActivityTimestamp: null,
};

export const useAiTelemetryStore = create<AiTelemetryState>()(
  persist(
    (set, get) => ({
      stats: INITIAL_STATS,
      modelSummaries: {},
      dailyUsage: {},

      recordExecution: ({
        modelId,
        modelName,
        provider,
        promptTokens,
        completionTokens,
        durationMs,
        estimatedCostUsd = 0,
      }) => {
        const totalTokens = promptTokens + completionTokens;
        const now = Date.now();
        const today = new Date().toISOString().split('T')[0];

        set((state) => {
          const newTotalCalls = state.stats.totalCalls + 1;
          const newTotalPromptTokens = state.stats.totalPromptTokens + promptTokens;
          const newTotalCompletionTokens = state.stats.totalCompletionTokens + completionTokens;
          const newTotalTokens = state.stats.totalTokens + totalTokens;
          const newTotalDuration = state.stats.totalDurationMs + durationMs;
          const newAvgLatency = Math.round(newTotalDuration / newTotalCalls);
          const newTotalCost = Number((state.stats.estimatedCostUsd + estimatedCostUsd).toFixed(6));

          // Update Model Summary
          const existingModel = state.modelSummaries[modelId] || {
            modelId,
            modelName,
            provider,
            callsCount: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            averageDurationMs: 0,
            estimatedCostUsd: 0,
            lastUsedTimestamp: null,
            status: 'active' as const,
          };

          const newModelCalls = existingModel.callsCount + 1;
          const newModelPrompt = existingModel.promptTokens + promptTokens;
          const newModelCompletion = existingModel.completionTokens + completionTokens;
          const newModelTokens = existingModel.totalTokens + totalTokens;
          const newModelAvgDuration = Math.round(
            (existingModel.averageDurationMs * existingModel.callsCount + durationMs) / newModelCalls
          );
          const newModelCost = Number((existingModel.estimatedCostUsd + estimatedCostUsd).toFixed(6));

          const updatedModelSummary: AiModelTelemetrySummary = {
            ...existingModel,
            modelName,
            provider,
            callsCount: newModelCalls,
            promptTokens: newModelPrompt,
            completionTokens: newModelCompletion,
            totalTokens: newModelTokens,
            averageDurationMs: newModelAvgDuration,
            estimatedCostUsd: newModelCost,
            lastUsedTimestamp: now,
          };

          // Update Daily Usage
          const existingDay = state.dailyUsage[today] || {
            date: today,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            callsCount: 0,
          };

          const updatedDay: DailyTokenUsage = {
            ...existingDay,
            promptTokens: existingDay.promptTokens + promptTokens,
            completionTokens: existingDay.completionTokens + completionTokens,
            totalTokens: existingDay.totalTokens + totalTokens,
            callsCount: existingDay.callsCount + 1,
          };

          return {
            stats: {
              totalCalls: newTotalCalls,
              totalPromptTokens: newTotalPromptTokens,
              totalCompletionTokens: newTotalCompletionTokens,
              totalTokens: newTotalTokens,
              totalDurationMs: newTotalDuration,
              averageLatencyMs: newAvgLatency,
              estimatedCostUsd: newTotalCost,
              lastActivityTimestamp: now,
            },
            modelSummaries: {
              ...state.modelSummaries,
              [modelId]: updatedModelSummary,
            },
            dailyUsage: {
              ...state.dailyUsage,
              [today]: updatedDay,
            },
          };
        });
      },

      resetTelemetry: () =>
        set({
          stats: INITIAL_STATS,
          modelSummaries: {},
          dailyUsage: {},
        }),
    }),
    {
      name: 'pika-ai-telemetry-v1',
      version: 1,
    }
  )
);
