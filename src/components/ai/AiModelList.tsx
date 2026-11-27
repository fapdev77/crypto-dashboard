import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
  Copy,
  Pencil,
  Trash2,
  Shield,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Sliders,
  Cpu,
  Globe,
  Gauge,
} from 'lucide-react';
import { AiModelConfig } from '../../types/aiTypes';
import { aiConnectionTester, ConnectionTestResult } from '../../services/ai/aiConnectionTester';
import { AppTooltip } from '../ui/Tooltip';
import toast from 'react-hot-toast';

interface AiModelListProps {
  models: AiModelConfig[];
  onAddModel: () => void;
  onEditModel: (model: AiModelConfig) => void;
  onDeleteModel: (id: string) => void;
  onToggleActive: (id: string) => void;
  onToggleFallback: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onCloneModel: (id: string) => void;
  onReorderModel: (id: string, direction: 'up' | 'down') => void;
}

export const AiModelList: React.FC<AiModelListProps> = ({
  models,
  onAddModel,
  onEditModel,
  onDeleteModel,
  onToggleActive,
  onToggleFallback,
  onSetPrimary,
  onCloneModel,
  onReorderModel,
}) => {
  const { t } = useTranslation();
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});

  const handleTestConnection = async (model: AiModelConfig) => {
    setTestingModelId(model.id);
    const result = await aiConnectionTester.testModelConnection(model);
    setTestResults((prev) => ({ ...prev, [model.id]: result }));
    setTestingModelId(null);

    if (result.success) {
      toast.success(t('toasts.modelConnectionActive', '{{name}}: Connection active ({{latency}}ms)', { name: model.name, latency: result.latencyMs }));
    } else {
      toast.error(t('toasts.modelConnectionFailed', '{{name}}: {{error}}', { name: model.name, error: result.error || 'Connection failed' }));
    }
  };

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case 'gemini':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-accent/20 text-accent border border-accent/40">
            GEMINI
          </span>
        );
      case 'ollama':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-tone-purple/15 text-tone-purple border border-tone-purple/30">
            {t('ai.models.providerLocal', 'LOCAL')}
          </span>
        );
      case 'openrouter':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-tone-blue/15 text-tone-blue border border-tone-blue/30">
            OPENROUTER
          </span>
        );
      case 'openai':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-tone-cyan/15 text-tone-cyan border border-tone-cyan/30">
            OPENAI
          </span>
        );
      case 'anthropic':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-tone-amber/15 text-tone-amber border border-tone-amber/30">
            ANTHROPIC
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-elevated text-fg border border-line-strong">
            {t('ai.models.providerCustom', 'CUSTOM')}
          </span>
        );
    }
  };

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-xl">
      {/* Header matching user reference image */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-line bg-surface">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warning/10 border border-warning/30 rounded-lg text-warning">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wider uppercase text-fg font-mono flex items-center gap-2">
              {t('ai.settings.models.title', 'PROVIDERS & CONTINGENCY MODELS LIST')}
            </h3>
            <p className="text-xs text-fg-muted">
              {t('ai.settings.models.subtitle', 'Manage primary models, automatic contingencies, and execution parameters')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-fg-muted">
            {t('ai.settings.models.totalModels', 'Total Models:')} <strong className="text-fg font-bold">{models.length}</strong>
          </span>

          <AppTooltip description={t('ai.models.tooltips.add', 'Configure a new local (Ollama) or cloud AI model')} side="left">
            <button
              onClick={onAddModel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent hover:bg-accent/80 text-white rounded-lg text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('ai.settings.models.addBtn', 'Add Model')}
            </button>
          </AppTooltip>
        </div>
      </div>

      {/* Model Cards List */}
      <div className="p-4 space-y-3 bg-canvas">
        {models.length === 0 ? (
          <div className="py-12 text-center text-fg-muted text-xs">
            {t('ai.settings.models.noModels', 'No models configured. Click "Add Model" to configure.')}
          </div>
        ) : (
          models.map((model, index) => {
            const test = testResults[model.id];
            const isTesting = testingModelId === model.id;
            const isFirst = index === 0;
            const isLast = index === models.length - 1;

            return (
              <div
                key={model.id}
                className={`bg-surface border rounded-xl p-4 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${model.isActive ? 'border-line hover:border-line-strong' : 'border-line/60 opacity-60'
                  }`}
              >
                {/* Left Side: Rank Order & Details */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Rank & Reorder Arrows */}
                  <div className="flex flex-col items-center justify-center shrink-0 text-fg-muted pt-0.5">
                    <AppTooltip description={t('ai.models.tooltips.moveUp', 'Move up in execution priority')} side="top">
                      <button
                        onClick={() => onReorderModel(model.id, 'up')}
                        disabled={isFirst}
                        aria-label={t('ai.models.tooltips.moveUp', 'Move up in execution priority')}
                        className="p-1 hover:text-fg disabled:opacity-20 disabled:hover:text-fg-muted transition cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    </AppTooltip>
                    <span className="font-mono text-xs font-bold text-fg px-1.5 py-0.5 rounded bg-elevated border border-line my-0.5">
                      #{index + 1}
                    </span>
                    <AppTooltip description={t('ai.models.tooltips.moveDown', 'Move down in execution priority')} side="bottom">
                      <button
                        onClick={() => onReorderModel(model.id, 'down')}
                        disabled={isLast}
                        aria-label={t('ai.models.tooltips.moveDown', 'Move down in execution priority')}
                        className="p-1 hover:text-fg disabled:opacity-20 disabled:hover:text-fg-muted transition cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </AppTooltip>
                  </div>

                  {/* Model Header & Parameters */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Title + Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-fg tracking-tight">
                        {model.name}{' '}
                        {model.isPrimary
                          ? t('ai.models.primaryTag', '(Primary)')
                          : model.isFallback
                          ? t('ai.models.contingencyTag', '(Contingency)')
                          : ''}
                      </span>
                      {getProviderBadge(model.provider)}

                      {model.isFallback && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-warning/10 text-warning border border-warning/40">
                          <ShieldAlert className="w-3 h-3 text-warning" />
                          {t('ai.settings.models.fallbackBadge', 'FALLBACK CONTINGENCY')}
                        </span>
                      )}

                      {model.isPrimary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-success/10 text-success border border-success/30">
                          {t('ai.settings.models.primaryBadge', 'PRIMARY')}
                        </span>
                      )}

                      {model.lastPingStatus === 'deprecated' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-danger/10 text-danger border border-danger/40" title={model.lastPingMessage}>
                          <AlertCircle className="w-3 h-3 text-danger" />
                          {t('ai.models.deprecatedOffline', 'DEPRECATED / OFFLINE')}
                        </span>
                      )}

                      {model.lastPingStatus === 'healthy' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-success/10 text-success border border-success/30">
                          {t('ai.models.verifiedLatency', 'VERIFIED ({{ms}}MS)', { ms: model.lastPingLatencyMs || 0 })}
                        </span>
                      )}

                      {model.supportsTools === false ||
                        (model.supportsTools === undefined &&
                          (model.modelId.toLowerCase().includes('deepseek-r1') ||
                            model.modelId.toLowerCase().includes('deepseek_r1') ||
                            model.modelId.toLowerCase().includes('qwen2.5-coder') ||
                            model.modelId.toLowerCase().includes('deepseek-coder'))) ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-warning/10 text-warning border border-warning/40"
                          title={t('ai.models.tooltips.noToolSupport', 'Models without tool support will have live portfolio queries blocked to prevent hallucinations.')}
                        >
                          <AlertCircle className="w-3 h-3 text-warning" />
                          {t('ai.models.noToolsBadge', 'NO TOOLS (STRICT AUDIT)')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-success/10 text-success border border-success/30">
                          {t('ai.models.toolsOkBadge', 'TOOLS OK')}
                        </span>
                      )}
                    </div>

                    {/* Metadata Specs Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted font-mono">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-fg-muted" />
                        <span>{t('ai.models.idLabel', 'ID:')}</span>
                        <span className="text-fg font-medium">{model.modelId}</span>
                      </div>

                      {model.baseUrl && (
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-fg-muted" />
                          <span>{t('ai.models.endpointLabel', 'Endpoint:')}</span>
                          <span className="text-fg truncate max-w-[200px]" title={model.baseUrl}>
                            {model.baseUrl}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-warning" />
                        <span>{t('ai.models.tempLabel', 'Temp:')}</span>
                        <span className="text-warning font-semibold">{model.temperature.toFixed(1)}</span>
                      </div>

                      <div>
                        <span>{t('ai.models.tokensLabel', 'Tokens:')}</span> <span className="text-fg">{model.maxTokens}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-success" />
                        <span>{t('ai.models.limitsLabel', 'Limits:')}</span>
                        <span className="text-success font-semibold">
                          {model.maxRpm > 0 ? `${model.maxRpm} RPM` : t('common.unlimited', 'Unlimited')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Buttons matching reference image */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-line/50">
                  {/* 1. Test Connection Button */}
                  <AppTooltip description={t('ai.models.tooltips.test', 'Test latency and connectivity with the AI model')} side="top">
                    <button
                      onClick={() => handleTestConnection(model)}
                      disabled={isTesting}
                      className="p-2 rounded-lg bg-tone-blue/10 text-tone-blue hover:bg-tone-blue/20 border border-tone-blue/30 transition disabled:opacity-50 cursor-pointer flex items-center justify-center"
                      aria-label={t('ai.settings.models.testBtn', 'Test Connection')}
                    >
                      {isTesting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-tone-blue" />
                      ) : test?.success ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : test && !test.success ? (
                        <AlertCircle className="w-4 h-4 text-danger" />
                      ) : (
                        <Play className="w-4 h-4 fill-current text-tone-blue" />
                      )}
                    </button>
                  </AppTooltip>

                  {/* 2. Active / Inactive Toggle Button */}
                  <AppTooltip
                    description={
                      model.isActive
                        ? t('ai.models.tooltips.deactivate', 'Click to deactivate this model')
                        : t('ai.models.tooltips.activate', 'Click to activate this model')
                    }
                    side="top"
                  >
                    <button
                      onClick={() => onToggleActive(model.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${model.isActive
                        ? 'bg-success/10 text-success border border-success/30 hover:bg-success/20'
                        : 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20'
                        }`}
                    >
                      {model.isActive ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-danger" />
                      )}
                      <span>{model.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}</span>
                    </button>
                  </AppTooltip>

                  {/* 3. Fallback Toggle Button */}
                  <AppTooltip
                    description={
                      model.isFallback
                        ? t('ai.models.tooltips.fallbackActive', 'Active contingency model (Fallback). Click to toggle.')
                        : t('ai.models.tooltips.fallbackInactive', 'Set as contingency model (Fallback)')
                    }
                    side="top"
                  >
                    <button
                      onClick={() => onToggleFallback(model.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${model.isFallback
                        ? 'bg-warning/10 text-warning border border-warning/40 hover:bg-warning/20'
                        : 'bg-elevated text-fg-muted hover:text-fg border border-line hover:border-line-strong'
                        }`}
                    >
                      <Shield className={`w-3.5 h-3.5 ${model.isFallback ? 'text-warning' : 'text-fg-muted'}`} />
                      <span>{t('ai.settings.models.fallbackBadge', 'Fallback')}</span>
                    </button>
                  </AppTooltip>

                  {/* 4. Clone / Duplicate Model Button */}
                  <AppTooltip description={t('ai.models.tooltips.clone', 'Clone / duplicate this model')} side="top">
                    <button
                      onClick={() => onCloneModel(model.id)}
                      className="p-2 rounded-lg bg-tone-purple/10 text-tone-purple hover:bg-tone-purple/20 border border-tone-purple/30 transition cursor-pointer flex items-center justify-center"
                      aria-label={t('ai.settings.models.cloneBtn', 'Clone')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </AppTooltip>

                  {/* 5. Edit Model Button */}
                  <AppTooltip description={t('ai.models.tooltips.edit', 'Edit parameters and credentials of this model')} side="top">
                    <button
                      onClick={() => onEditModel(model)}
                      className="p-2 rounded-lg bg-tone-blue/10 text-tone-blue hover:bg-tone-blue/20 border border-tone-blue/30 transition cursor-pointer flex items-center justify-center"
                      aria-label={t('ai.settings.models.editBtn', 'Edit')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </AppTooltip>

                  {/* 6. Delete Model Button */}
                  <AppTooltip description={t('ai.models.tooltips.delete', 'Delete this model')} side="top">
                    <button
                      onClick={() => onDeleteModel(model.id)}
                      className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 border border-danger/30 transition cursor-pointer flex items-center justify-center"
                      aria-label={t('ai.settings.models.deleteBtn', 'Delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AppTooltip>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
