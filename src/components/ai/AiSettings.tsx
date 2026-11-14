import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.error(t('toasts.mustKeepOneModel', 'You must keep at least one AI model registered.'));
      return;
    }
    deleteModel(id);
    toast.success(t('toasts.modelDeleted', 'Model deleted.'));
  };

  const handleCloneModel = (id: string) => {
    const newId = cloneModel(id);
    if (newId) {
      toast.success(t('toasts.modelCloned', 'Model cloned successfully!'));
    }
  };

  const handleToggleFallback = (id: string) => {
    const target = models.find((m) => m.id === id);
    if (!target) return;
    if (target.isPrimary) {
      toast.error(t('toasts.primaryCannotBeFallback', 'The primary model cannot be set as contingency (fallback) simultaneously.'));
      return;
    }
    setFallbackModel(id, !target.isFallback);
    toast.success(!target.isFallback ? t('toasts.modelAddedFallback', 'Model added to fallback list') : t('toasts.modelRemovedFallback', 'Model removed from fallback list'));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Global Activation Toggle */}
      <div className="bg-surface border border-line rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-accent/10 border border-accent/25 rounded-xl text-accent shrink-0">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-fg tracking-tight">
                  {t('ai.settings.title', 'PIKA Assistant Settings')}
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
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase cursor-default ${globalSettings.isEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-elevated text-fg-muted border border-line'
                      }`}
                  >
                    {globalSettings.isEnabled ? `🟢 ${t('ai.settings.activeBadge', 'Active in App')}` : `⚪ ${t('ai.settings.disabledBadge', 'Disabled (Default)')}`}
                  </span>
                </AppTooltip>
              </div>
              <p className="text-xs text-fg-muted mt-1 max-w-2xl">
                {t('ai.settings.description', 'Portfolio Information & Knowledge Assistant — Quantitative auditing, hedge analysis, and commission diagnostics with support for local models (Ollama) or secure cloud endpoints with automated failover.')}
              </p>
            </div>
          </div>

          {/* Master activation switch */}
          <div className="flex items-center gap-4 bg-canvas border border-line p-3 rounded-xl shrink-0">
            <div className="text-right">
              <div className="text-xs font-semibold text-fg">{t('ai.settings.enableToggle', 'Enable PIKA Assistant')}</div>
              <div className="text-[10px] text-fg-muted">
                {globalSettings.isEnabled ? t('ai.settings.activeGlobally', 'Active globally') : t('ai.settings.disabledByDefault', 'Disabled by default')}
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
                  toast.success(newState ? t('toasts.pikaActivated', 'PIKA Assistant activated!') : t('toasts.pikaDeactivated', 'PIKA Assistant deactivated!'));
                }}
                className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer ${globalSettings.isEnabled ? 'bg-accent' : 'bg-elevated'
                  }`}
                aria-label="Toggle PIKA"
              >
                <div
                  className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${globalSettings.isEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                />
              </button>
            </AppTooltip>
          </div>
        </div>

        {globalSettings.isEnabled && (
          <div className="mt-4 pt-4 border-t border-line flex items-center justify-between text-xs text-fg-muted">
            <AppTooltip
              description="Zero-Trust Architecture: Your exchange API credentials, keys, and private passphrases are never sent to AI models."
              side="bottom"
            >
              <div className="flex items-center gap-2 text-emerald-400 cursor-default">
                <Shield className="w-4 h-4" />
                <span>{t('ai.settings.zeroTrustActive', 'Zero-Trust Active: Exchange API keys are never included in AI prompts.')}</span>
              </div>
            </AppTooltip>

            <AppTooltip description="Open the sliding PIKA Assistant panel (Shortcut: Ctrl+J)" side="left">
              <button
                onClick={openChatDrawer}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                {t('ai.settings.openChat', 'Open PIKA Assistant')}
              </button>
            </AppTooltip>
          </div>
        )}
      </div>

      {/* Section 1: Global Inference & Safety Parameters */}
      <div className="bg-surface border border-line rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 className="text-sm font-bold text-fg flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent" />
              {t('ai.settings.globalInferenceTitle', 'Global Inference & Safety Parameters')}
            </h3>
            <p className="text-xs text-fg-muted">
              {t('ai.settings.globalInferenceSubtitle', 'Adjust fallback contingency logic, temperature parameters, and assistant system guidelines')}
            </p>
          </div>
          <AppTooltip description="Restore system prompt and inference parameters to default values" side="left">
            <button
              onClick={() => {
                resetToDefaults();
                toast.success(t('toasts.inferenceRestored', 'Inference parameters restored to defaults'));
              }}
              className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> {t('ai.settings.resetDefaults', 'Restore Defaults')}
            </button>
          </AppTooltip>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contingency & Privacy */}
          <div className="space-y-4">
            <div className="p-4 bg-canvas border border-line rounded-xl space-y-3">
              <AppTooltip
                description="If enabled, the assistant automatically routes queries to fallback cloud/local models if the primary model times out or encounters rate limits."
                side="top"
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-fg flex items-center gap-1.5">
                      {t('ai.settings.autoFailover', 'Automatic Failover (Fallback)')}
                      <HelpCircle className="w-3 h-3 text-fg-muted" />
                    </div>
                    <div className="text-[11px] text-fg-muted">
                      {t('ai.settings.autoFailoverDesc', 'Switch to backup models automatically when primary is unavailable')}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={globalSettings.autoFallback}
                    onChange={(e) => updateGlobalSettings({ autoFallback: e.target.checked })}
                    className="w-4 h-4 rounded border-line text-accent focus:ring-accent cursor-pointer"
                  />
                </label>
              </AppTooltip>

              <AppTooltip
                description="Converts nominal dollar balances into percentage allocations and obfuscates total asset sizes before consulting external cloud models."
                side="top"
              >
                <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-line">
                  <div>
                    <div className="text-xs font-semibold text-fg flex items-center gap-1.5">
                      {t('ai.settings.obfuscation', 'Financial Value Obfuscation')}
                      <HelpCircle className="w-3 h-3 text-fg-muted" />
                    </div>
                    <div className="text-[11px] text-fg-muted">
                      {t('ai.settings.obfuscationDesc', 'Normalize raw balances into percentage weightings before querying cloud models')}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={globalSettings.obfuscateValues}
                    onChange={(e) => updateGlobalSettings({ obfuscateValues: e.target.checked })}
                    className="w-4 h-4 rounded border-line text-accent focus:ring-accent cursor-pointer"
                  />
                </label>
              </AppTooltip>
            </div>

            <div>
              <AppTooltip
                description="Temperature: Lower values (e.g. 0.10) guarantee deterministic, mathematically accurate responses. Highly recommended for quantitative auditing."
                side="top"
              >
                <div className="flex justify-between text-xs text-fg mb-1 cursor-default">
                  <span className="flex items-center gap-1">
                    {t('ai.settings.defaultTemp', 'Default Temperature')}
                    <HelpCircle className="w-3 h-3 text-fg-muted" />
                  </span>
                  <span className="font-mono text-accent font-bold">{globalSettings.defaultTemperature.toFixed(2)}</span>
                </div>
              </AppTooltip>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={globalSettings.defaultTemperature}
                onChange={(e) => updateGlobalSettings({ defaultTemperature: parseFloat(e.target.value) })}
                className="w-full accent-accent cursor-pointer"
              />
              <span className="text-[10px] text-fg-muted">
                {t('ai.settings.tempDesc', 'Low values (0.10) eliminate creative hallucinations and guarantee analytical consistency.')}
              </span>
            </div>
          </div>

          {/* Base System Prompt */}
          <div>
            <AppTooltip
              description="Imperative instructions injected into the AI session that restrict the PIKA assistant to crypto portfolio analytics and enforce out-of-scope refusals."
              side="top"
            >
              <label className="block text-xs font-semibold text-fg mb-1.5 cursor-default flex items-center gap-1.5">
                {t('ai.settings.systemPromptLabel', 'Base System Instructions (System Prompt)')}
                <HelpCircle className="w-3 h-3 text-fg-muted" />
              </label>
            </AppTooltip>
            <textarea
              rows={6}
              value={globalSettings.baseSystemPrompt}
              onChange={(e) => updateGlobalSettings({ baseSystemPrompt: e.target.value })}
              className="w-full bg-canvas border border-line rounded-xl p-3 text-xs text-fg font-mono focus:outline-none focus:border-accent resize-none"
            />
            <span className="text-[10px] text-fg-muted">
              {t('ai.settings.systemPromptDesc', 'Hardcoded directives enforce read-only safety, closed analytical scope, and accurate calculations.')}
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
            <h2 className="text-base font-bold text-fg tracking-tight">
              {t('ai.settings.telemetry.title', 'AI Consumption & Real-Time Telemetry')}
            </h2>
            <p className="text-xs text-fg-muted">
              {t('ai.settings.telemetrySubtitle', 'Consolidated performance metrics, average latency, and token consumption statistics')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <AppTooltip description="Reset all telemetry metrics and token consumption statistics to zero" side="left">
              <button
                onClick={() => {
                  useAiTelemetryStore.getState().resetTelemetry();
                  toast.success(t('toasts.telemetryReset', 'Telemetry metrics reset successfully'));
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated hover:bg-line text-fg-muted hover:text-fg border border-line rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-accent" />
                {t('ai.settings.resetMetrics', 'Reset Metrics')}
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
