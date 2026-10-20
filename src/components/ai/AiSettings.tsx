import React, { useState } from 'react';
import {
  BrainCircuit,
  Sliders,
  Shield,
  RotateCcw,
  Bot,
  HelpCircle,
} from 'lucide-react';
import { useAiSettingsStore } from '../../store/aiSettingsStore';
import { useAiTelemetryStore } from '../../store/aiTelemetryStore';
import { useAiChatStore } from '../../store/aiChatStore';
import { AiModelConfig } from '../../types/aiTypes';
import { AiModelList } from './AiModelList';
import { AiModelModal } from './AiModelModal';
import { AiTelemetryCards } from './AiTelemetryCards';
import { AiModelStatsTable } from './AiModelStatsTable';
import { AiDailyTokenChart } from './AiDailyTokenChart';
import { AiAuditLogTable } from './AiAuditLogTable';
import { AppTooltip } from '../ui/Tooltip';
import toast from 'react-hot-toast';

export const AiSettings: React.FC = () => {
  const {
    globalSettings,
    models,
    setIsEnabled,
    updateGlobalSettings,
    addModel,
    updateModel,
    deleteModel,
    setPrimaryModel,
    setFallbackModel,
    toggleModelActive,
    cloneModel,
    reorderModel,
    resetToDefaults,
  } = useAiSettingsStore();

  const telemetryStats = useAiTelemetryStore((state) => state.stats);
  const modelSummaries = useAiTelemetryStore((state) => state.modelSummaries);
  const dailyUsage = useAiTelemetryStore((state) => state.dailyUsage);
  const openChatDrawer = useAiChatStore((state) => state.openDrawer);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modelToEdit, setModelToEdit] = useState<AiModelConfig | null>(null);

  const handleOpenAddModal = () => {
    setModelToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (model: AiModelConfig) => {
    setModelToEdit(model);
    setIsModalOpen(true);
  };

  const handleSaveModel = (modelData: Omit<AiModelConfig, 'id'>, id?: string) => {
    if (id) {
      updateModel(id, modelData);
    } else {
      addModel(modelData);
    }
  };

  const handleDeleteModel = (id: string) => {
    if (models.length <= 1) {
      toast.error('You must keep at least one AI model registered.');
      return;
    }
    deleteModel(id);
    toast.success('Model deleted.');
  };

  const handleCloneModel = (id: string) => {
    const newId = cloneModel(id);
    if (newId) {
      toast.success('Model cloned successfully!');
    }
  };

  const handleToggleFallback = (id: string) => {
    const target = models.find((m) => m.id === id);
    if (!target) return;
    if (target.isPrimary) {
      toast.error('The primary model cannot be set as contingency (fallback) simultaneously.');
      return;
    }
    setFallbackModel(id, !target.isFallback);
    toast.success(!target.isFallback ? 'Model added to fallback list' : 'Model removed from fallback list');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Global Activation Toggle */}
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#2F6BFF]/10 border border-[#2F6BFF]/25 rounded-xl text-[#2F6BFF] shrink-0">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  PIKA Assistant Settings
                </h1>
                <AppTooltip
                  description={
                    globalSettings.isEnabled
                      ? 'PIKA Assistant is active and ready to audit your trading portfolio.'
                      : 'PIKA Assistant is disabled by default for strict security and privacy. Click the toggle to activate.'
                  }
                  side="bottom"
                >
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase cursor-default ${
                      globalSettings.isEnabled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-[#1e1f24] text-[#8E9299] border border-[#2a2b30]'
                    }`}
                  >
                    {globalSettings.isEnabled ? '🟢 Active in App' : '⚪ Disabled (Default)'}
                  </span>
                </AppTooltip>
              </div>
              <p className="text-xs text-[#8E9299] mt-1 max-w-2xl">
                Portfolio Information & Knowledge Assistant — Quantitative auditing, hedge analysis, and commission diagnostics with support for local models (Ollama) or secure cloud endpoints with automated failover.
              </p>
            </div>
          </div>

          {/* Master activation switch */}
          <div className="flex items-center gap-4 bg-[#0b0c10] border border-[#2a2b30] p-3 rounded-xl shrink-0">
            <div className="text-right">
              <div className="text-xs font-semibold text-white">Enable PIKA Assistant</div>
              <div className="text-[10px] text-[#8E9299]">
                {globalSettings.isEnabled ? 'Active globally' : 'Disabled by default'}
              </div>
            </div>
            <AppTooltip
              description="Master Switch: Activates or deactivates the PIKA assistant across the entire application."
              side="left"
            >
              <button
                onClick={() => {
                  const newState = !globalSettings.isEnabled;
                  setIsEnabled(newState);
                  toast.success(newState ? 'PIKA Assistant activated!' : 'PIKA Assistant deactivated!');
                }}
                className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer ${
                  globalSettings.isEnabled ? 'bg-[#2F6BFF]' : 'bg-[#1e1f24]'
                }`}
                aria-label="Toggle PIKA"
              >
                <div
                  className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${
                    globalSettings.isEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </AppTooltip>
          </div>
        </div>

        {globalSettings.isEnabled && (
          <div className="mt-4 pt-4 border-t border-[#2a2b30] flex items-center justify-between text-xs text-[#8E9299]">
            <AppTooltip
              description="Zero-Trust Architecture: Your exchange API credentials, keys, and private passphrases are never sent to AI models."
              side="bottom"
            >
              <div className="flex items-center gap-2 text-emerald-400 cursor-default">
                <Shield className="w-4 h-4" />
                <span>Zero-Trust Active: Exchange API keys are never included in AI prompts.</span>
              </div>
            </AppTooltip>

            <AppTooltip description="Open the sliding PIKA Assistant panel (Shortcut: Ctrl+J)" side="left">
              <button
                onClick={openChatDrawer}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2F6BFF]/10 hover:bg-[#2F6BFF]/20 text-[#2F6BFF] border border-[#2F6BFF]/30 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                Open PIKA Assistant
              </button>
            </AppTooltip>
          </div>
        )}
      </div>

      {/* Section 1: Global Inference & Safety Parameters */}
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-[#2a2b30] pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#2F6BFF]" />
              Global Inference & Safety Parameters
            </h3>
            <p className="text-xs text-[#8E9299]">
              Adjust fallback contingency logic, temperature parameters, and assistant system guidelines
            </p>
          </div>
          <AppTooltip description="Restore system prompt and inference parameters to default values" side="left">
            <button
              onClick={() => {
                resetToDefaults();
                toast.success('Inference parameters restored to defaults');
              }}
              className="flex items-center gap-1 text-xs text-[#8E9299] hover:text-white transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Restore Defaults
            </button>
          </AppTooltip>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contingency & Privacy */}
          <div className="space-y-4">
            <div className="p-4 bg-[#0b0c10] border border-[#2a2b30] rounded-xl space-y-3">
              <AppTooltip
                description="If enabled, the assistant automatically routes queries to fallback cloud/local models if the primary model times out or encounters rate limits."
                side="top"
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      Automatic Failover (Fallback)
                      <HelpCircle className="w-3 h-3 text-[#8E9299]" />
                    </div>
                    <div className="text-[11px] text-[#8E9299]">
                      Switch to backup models automatically when primary is unavailable
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={globalSettings.autoFallback}
                    onChange={(e) => updateGlobalSettings({ autoFallback: e.target.checked })}
                    className="w-4 h-4 rounded border-[#2a2b30] text-[#2F6BFF] focus:ring-[#2F6BFF] cursor-pointer"
                  />
                </label>
              </AppTooltip>

              <AppTooltip
                description="Converts nominal dollar balances into percentage allocations and obfuscates total asset sizes before consulting external cloud models."
                side="top"
              >
                <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-[#2a2b30]">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      Financial Value Obfuscation
                      <HelpCircle className="w-3 h-3 text-[#8E9299]" />
                    </div>
                    <div className="text-[11px] text-[#8E9299]">
                      Normalize raw balances into percentage weightings before querying cloud models
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={globalSettings.obfuscateValues}
                    onChange={(e) => updateGlobalSettings({ obfuscateValues: e.target.checked })}
                    className="w-4 h-4 rounded border-[#2a2b30] text-[#2F6BFF] focus:ring-[#2F6BFF] cursor-pointer"
                  />
                </label>
              </AppTooltip>
            </div>

            <div>
              <AppTooltip
                description="Temperature: Lower values (e.g. 0.10) guarantee deterministic, mathematically accurate responses. Highly recommended for quantitative auditing."
                side="top"
              >
                <div className="flex justify-between text-xs text-gray-300 mb-1 cursor-default">
                  <span className="flex items-center gap-1">
                    Default Temperature
                    <HelpCircle className="w-3 h-3 text-[#8E9299]" />
                  </span>
                  <span className="font-mono text-[#2F6BFF] font-bold">{globalSettings.defaultTemperature.toFixed(2)}</span>
                </div>
              </AppTooltip>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={globalSettings.defaultTemperature}
                onChange={(e) => updateGlobalSettings({ defaultTemperature: parseFloat(e.target.value) })}
                className="w-full accent-[#2F6BFF] cursor-pointer"
              />
              <span className="text-[10px] text-[#8E9299]">
                Low values (0.10) eliminate creative hallucinations and guarantee analytical consistency.
              </span>
            </div>
          </div>

          {/* Base System Prompt */}
          <div>
            <AppTooltip
              description="Imperative instructions injected into the AI session that restrict the PIKA assistant to crypto portfolio analytics and enforce out-of-scope refusals."
              side="top"
            >
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 cursor-default flex items-center gap-1.5">
                Base System Instructions (System Prompt)
                <HelpCircle className="w-3 h-3 text-[#8E9299]" />
              </label>
            </AppTooltip>
            <textarea
              rows={6}
              value={globalSettings.baseSystemPrompt}
              onChange={(e) => updateGlobalSettings({ baseSystemPrompt: e.target.value })}
              className="w-full bg-[#0b0c10] border border-[#2a2b30] rounded-xl p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-[#2F6BFF] resize-none"
            />
            <span className="text-[10px] text-[#8E9299]">
              Hardcoded directives enforce read-only safety, closed analytical scope, and accurate calculations.
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Providers and Contingency Models (Matching reference image) */}
      <AiModelList
        models={models}
        onAddModel={handleOpenAddModal}
        onEditModel={handleOpenEditModal}
        onDeleteModel={handleDeleteModel}
        onToggleActive={toggleModelActive}
        onToggleFallback={handleToggleFallback}
        onSetPrimary={setPrimaryModel}
        onCloneModel={handleCloneModel}
        onReorderModel={reorderModel}
      />

      {/* Section 3: AI Telemetry & Usage in Real Time */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              AI Consumption & Real-Time Telemetry
            </h2>
            <p className="text-xs text-[#8E9299]">
              Consolidated performance metrics, average latency, and token consumption statistics
            </p>
          </div>

          <div className="flex items-center gap-2">
            <AppTooltip description="Reset all telemetry metrics and token consumption statistics to zero" side="left">
              <button
                onClick={() => {
                  useAiTelemetryStore.getState().resetTelemetry();
                  toast.success('Telemetry metrics reset successfully');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1f24] hover:bg-[#2a2b30] text-[#8E9299] hover:text-white border border-[#2a2b30] rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#2F6BFF]" />
                Reset Metrics
              </button>
            </AppTooltip>
          </div>
        </div>
        <AiTelemetryCards stats={telemetryStats} />
      </div>

      {/* Section 4 & 5: Statistics by Model & Daily Consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AiModelStatsTable summaries={modelSummaries} />
        </div>
        <div className="lg:col-span-1">
          <AiDailyTokenChart dailyUsage={dailyUsage} />
        </div>
      </div>

      {/* Section 6: Call History & Audit Trail */}
      <AiAuditLogTable />

      {/* Modal for Model Creation & Editing */}
      <AiModelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModel}
        modelToEdit={modelToEdit}
      />
    </div>
  );
};
