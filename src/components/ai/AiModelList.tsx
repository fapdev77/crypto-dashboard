import React, { useState } from 'react';
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
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});

  const handleTestConnection = async (model: AiModelConfig) => {
    setTestingModelId(model.id);
    const result = await aiConnectionTester.testModelConnection(model);
    setTestResults((prev) => ({ ...prev, [model.id]: result }));
    setTestingModelId(null);

    if (result.success) {
      toast.success(`${model.name}: Connection active (${result.latencyMs}ms)`);
    } else {
      toast.error(`${model.name}: ${result.error || 'Connection failed'}`);
    }
  };

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case 'gemini':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-[#2F6BFF]/20 text-[#2F6BFF] border border-[#2F6BFF]/40">
            GEMINI
          </span>
        );
      case 'ollama':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-purple-500/20 text-purple-400 border border-purple-500/40">
            LOCAL
          </span>
        );
      case 'openrouter':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
            OPENROUTER
          </span>
        );
      case 'openai':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-teal-500/20 text-teal-400 border border-teal-500/40">
            OPENAI
          </span>
        );
      case 'anthropic':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
            ANTHROPIC
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-gray-500/20 text-gray-300 border border-gray-500/40">
            CUSTOM
          </span>
        );
    }
  };

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden shadow-xl">
      {/* Header matching user reference image */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-[#2a2b30] bg-[#151619]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-mono flex items-center gap-2">
              PROVIDERS & CONTINGENCY MODELS LIST
            </h3>
            <p className="text-xs text-[#8E9299]">
              Manage primary models, automatic contingencies, and execution parameters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-[#8E9299]">
            Total Models: <strong className="text-white font-bold">{models.length}</strong>
          </span>

          <AppTooltip description="Configure a new local (Ollama) or cloud AI model" side="left">
            <button
              onClick={onAddModel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2F6BFF] hover:bg-[#2F6BFF]/80 text-white rounded-lg text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Model
            </button>
          </AppTooltip>
        </div>
      </div>

      {/* Model Cards List */}
      <div className="p-4 space-y-3 bg-[#0b0c10]">
        {models.length === 0 ? (
          <div className="py-12 text-center text-[#8E9299] text-xs">
            No models configured. Click "Add Model" to configure.
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
                className={`bg-[#151619] border rounded-xl p-4 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  model.isActive ? 'border-[#2a2b30] hover:border-[#383b42]' : 'border-[#2a2b30]/60 opacity-60'
                }`}
              >
                {/* Left Side: Rank Order & Details */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Rank & Reorder Arrows */}
                  <div className="flex flex-col items-center justify-center shrink-0 text-[#8E9299] pt-0.5">
                    <AppTooltip description="Move up in execution priority" side="top">
                      <button
                        onClick={() => onReorderModel(model.id, 'up')}
                        disabled={isFirst}
                        aria-label="Move up"
                        className="p-1 hover:text-white disabled:opacity-20 disabled:hover:text-[#8E9299] transition cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    </AppTooltip>
                    <span className="font-mono text-xs font-bold text-white px-1.5 py-0.5 rounded bg-[#1e1f24] border border-[#2a2b30] my-0.5">
                      #{index + 1}
                    </span>
                    <AppTooltip description="Move down in execution priority" side="bottom">
                      <button
                        onClick={() => onReorderModel(model.id, 'down')}
                        disabled={isLast}
                        aria-label="Move down"
                        className="p-1 hover:text-white disabled:opacity-20 disabled:hover:text-[#8E9299] transition cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </AppTooltip>
                  </div>

                  {/* Model Header & Parameters */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Title + Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white tracking-tight">
                        {model.name} {model.isPrimary ? '(Primary)' : model.isFallback ? '(Contingency)' : ''}
                      </span>
                      {getProviderBadge(model.provider)}

                      {model.isFallback && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/40">
                          <ShieldAlert className="w-3 h-3 text-amber-400" />
                          FALLBACK CONTINGENCY
                        </span>
                      )}

                      {model.isPrimary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          PRIMARY
                        </span>
                      )}

                      {model.lastPingStatus === 'deprecated' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/40" title={model.lastPingMessage}>
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          DEPRECATED / OFFLINE
                        </span>
                      )}

                      {model.lastPingStatus === 'healthy' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          VERIFIED ({model.lastPingLatencyMs || 0}MS)
                        </span>
                      )}

                      {model.supportsTools === false ||
                      model.modelId.toLowerCase().includes('deepseek-r1') ||
                      model.modelId.toLowerCase().includes('coder') ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/40"
                          title="Modelos de raciocínio puro ou código não chamam ferramentas no Ollama. Consultas sobre saldos e posições serão bloqueadas pelo PIKA para evitar dados inventados."
                        >
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          SEM TOOLS (BLOQUEIO ATIVO)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          TOOLS OK
                        </span>
                      )}
                    </div>

                    {/* Metadata Specs Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#8E9299] font-mono">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-gray-500" />
                        <span>ID:</span>
                        <span className="text-white font-medium">{model.modelId}</span>
                      </div>

                      {model.baseUrl && (
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-gray-500" />
                          <span>Endpoint:</span>
                          <span className="text-gray-300 truncate max-w-[200px]" title={model.baseUrl}>
                            {model.baseUrl}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-amber-500" />
                        <span>Temp:</span>
                        <span className="text-amber-400 font-semibold">{model.temperature.toFixed(1)}</span>
                      </div>

                      <div>
                        <span>Tokens:</span> <span className="text-gray-300">{model.maxTokens}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Limits:</span>
                        <span className="text-emerald-400 font-semibold">
                          {model.maxRpm > 0 ? `${model.maxRpm} RPM` : 'Unlimited'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Buttons matching reference image */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#2a2b30]/50">
                  {/* 1. Test Connection Button */}
                  <AppTooltip description="Test latency and connectivity with the AI model" side="top">
                    <button
                      onClick={() => handleTestConnection(model)}
                      disabled={isTesting}
                      className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition disabled:opacity-50 cursor-pointer flex items-center justify-center"
                      aria-label="Test Connection"
                    >
                      {isTesting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      ) : test?.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : test && !test.success ? (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Play className="w-4 h-4 fill-current text-blue-400" />
                      )}
                    </button>
                  </AppTooltip>

                  {/* 2. Active / Inactive Toggle Button */}
                  <AppTooltip
                    description={model.isActive ? 'Click to deactivate this model' : 'Click to activate this model'}
                    side="top"
                  >
                    <button
                      onClick={() => onToggleActive(model.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        model.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                      }`}
                    >
                      {model.isActive ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span>{model.isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </AppTooltip>

                  {/* 3. Fallback Toggle Button */}
                  <AppTooltip
                    description={
                      model.isFallback
                        ? 'Active contingency model (Fallback). Click to toggle.'
                        : 'Set as contingency model (Fallback)'
                    }
                    side="top"
                  >
                    <button
                      onClick={() => onToggleFallback(model.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        model.isFallback
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/40 hover:bg-amber-500/20'
                          : 'bg-[#1e1f24] text-[#8E9299] hover:text-white border border-[#2a2b30] hover:border-[#383b42]'
                      }`}
                    >
                      <Shield className={`w-3.5 h-3.5 ${model.isFallback ? 'text-amber-400' : 'text-[#8E9299]'}`} />
                      <span>Fallback</span>
                    </button>
                  </AppTooltip>

                  {/* 4. Clone / Duplicate Model Button */}
                  <AppTooltip description="Clone / duplicate this model" side="top">
                    <button
                      onClick={() => onCloneModel(model.id)}
                      className="p-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition cursor-pointer flex items-center justify-center"
                      aria-label="Clone Model"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </AppTooltip>

                  {/* 5. Edit Model Button */}
                  <AppTooltip description="Edit parameters and credentials of this model" side="top">
                    <button
                      onClick={() => onEditModel(model)}
                      className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition cursor-pointer flex items-center justify-center"
                      aria-label="Edit Model"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </AppTooltip>

                  {/* 6. Delete Model Button */}
                  <AppTooltip description="Delete this model" side="top">
                    <button
                      onClick={() => onDeleteModel(model.id)}
                      className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer flex items-center justify-center"
                      aria-label="Delete Model"
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
