import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Loader2, Sparkles, Server, Key, Sliders, ShieldCheck, RefreshCw, AlertTriangle, Cloud } from 'lucide-react';
import { AiModelConfig, AiProviderType } from '../../types/aiTypes';
import { aiConnectionTester, ConnectionTestResult, DiscoveredModel } from '../../services/ai/aiConnectionTester';
import { AppTooltip } from '../ui/Tooltip';
import toast from 'react-hot-toast';

interface AiModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (model: Omit<AiModelConfig, 'id'>, id?: string) => void;
  modelToEdit?: AiModelConfig | null;
}

const GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Official - High Speed & Analytics)' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest (Official Alias)' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite (Low Latency & High RPM)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview (Complex Reasoning - Paid Tier)' },
  { id: 'custom', name: 'Other / Enter Custom Model ID...' },
];

export const AiModelModal: React.FC<AiModelModalProps> = ({
  isOpen,
  onClose,
  onSave,
  modelToEdit,
}) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<AiProviderType>('gemini');
  const [modelId, setModelId] = useState('gemini-3.8-flash');
  const [isCustomGeminiModel, setIsCustomGeminiModel] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isPrimary, setIsPrimary] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackOrder, setFallbackOrder] = useState(1);
  const [temperature, setTemperature] = useState(0.1);
  const [topP, setTopP] = useState(0.95);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [systemInstruction, setSystemInstruction] = useState('');
  const [maxRpm, setMaxRpm] = useState(60);
  const [maxRpd, setMaxRpd] = useState(0);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // Online models discovery state
  const [onlineModels, setOnlineModels] = useState<DiscoveredModel[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // Validation layer on save
  const [isValidatingSave, setIsValidatingSave] = useState(false);
  const [saveValidationWarning, setSaveValidationWarning] = useState<{
    message: string;
    status?: string;
  } | null>(null);

  useEffect(() => {
    if (modelToEdit) {
      setName(modelToEdit.name);
      setProvider(modelToEdit.provider);
      setModelId(modelToEdit.modelId);
      const isKnownGemini = GEMINI_MODELS.some((m) => m.id === modelToEdit.modelId);
      setIsCustomGeminiModel(modelToEdit.provider === 'gemini' && !isKnownGemini);
      setBaseUrl(modelToEdit.baseUrl || '');
      setApiKey(modelToEdit.apiKey || '');
      setIsActive(modelToEdit.isActive);
      setIsPrimary(modelToEdit.isPrimary);
      setIsFallback(modelToEdit.isFallback);
      setFallbackOrder(modelToEdit.fallbackOrder || 1);
      setTemperature(modelToEdit.temperature ?? 0.1);
      setTopP(modelToEdit.topP ?? 0.95);
      setMaxTokens(modelToEdit.maxTokens ?? 4096);
      setSystemInstruction(modelToEdit.systemInstruction || '');
      setMaxRpm(modelToEdit.maxRpm || 0);
      setMaxRpd(modelToEdit.maxRpd || 0);
    } else {
      setName('Gemini 3.8 Flash');
      setProvider('gemini');
      setModelId('gemini-3.8-flash');
      setIsCustomGeminiModel(false);
      setBaseUrl('');
      setApiKey('');
      setIsActive(true);
      setIsPrimary(false);
      setIsFallback(true);
      setFallbackOrder(1);
      setTemperature(0.1);
      setTopP(0.95);
      setMaxTokens(4096);
      setSystemInstruction('');
      setMaxRpm(60);
      setMaxRpd(0);
    }
    setTestResult(null);
    setSaveValidationWarning(null);
    setOnlineModels([]);
  }, [modelToEdit, isOpen]);

  const handleProviderChange = (newProvider: AiProviderType) => {
    setProvider(newProvider);
    setSaveValidationWarning(null);
    setOnlineModels([]);
    if (!modelToEdit) {
      if (newProvider === 'gemini') {
        setName('Gemini 3.8 Flash');
        setModelId('gemini-3.8-flash');
        setIsCustomGeminiModel(false);
        setBaseUrl('');
        setMaxRpm(60);
        setMaxTokens(8192);
      } else if (newProvider === 'ollama') {
        setName('Ollama Local (Llama 3.2)');
        setModelId('llama3.2:latest');
        setBaseUrl('http://localhost:11434');
        setMaxRpm(0);
        setMaxTokens(4096);
      } else if (newProvider === 'openrouter') {
        setName('Claude 3.5 Sonnet (OpenRouter)');
        setModelId('anthropic/claude-3.5-sonnet');
        setBaseUrl('https://openrouter.ai/api/v1');
        setMaxRpm(100);
        setMaxTokens(4096);
      } else if (newProvider === 'openai') {
        setName('GPT-4o Mini');
        setModelId('gpt-4o-mini');
        setBaseUrl('https://api.openai.com/v1');
        setMaxRpm(100);
        setMaxTokens(4096);
      } else if (newProvider === 'anthropic') {
        setName('Claude 3.5 Haiku');
        setModelId('claude-3-5-haiku-20241022');
        setBaseUrl('https://api.anthropic.com/v1');
        setMaxRpm(60);
        setMaxTokens(4096);
      }
    }
  };

  const handleGeminiModelSelect = (selectedId: string) => {
    setSaveValidationWarning(null);
    if (selectedId === 'custom') {
      setIsCustomGeminiModel(true);
      setModelId('');
    } else {
      setIsCustomGeminiModel(false);
      setModelId(selectedId);
      if (!modelToEdit) {
        const found = GEMINI_MODELS.find((m) => m.id === selectedId) || onlineModels.find((m) => m.id === selectedId);
        if (found) {
          setName(found.name.split(' (')[0]);
        }
      }
    }
  };

  const handleFetchOnlineModels = async () => {
    setIsFetchingModels(true);
    setSaveValidationWarning(null);
    try {
      const result = await aiConnectionTester.fetchProviderModels(provider, apiKey, baseUrl);
      setIsFetchingModels(false);
      if (result.success && result.models.length > 0) {
        setOnlineModels(result.models);
        toast.success(`Discovered ${result.models.length} online models from ${provider.toUpperCase()}`);
      } else {
        toast.error(result.error || `Could not fetch live models from ${provider}.`);
      }
    } catch (err: any) {
      setIsFetchingModels(false);
      toast.error(`Error querying provider: ${err.message}`);
    }
  };

  const handleTestConnection = async () => {
    if (!modelId) {
      toast.error('Specify Model ID before testing.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setSaveValidationWarning(null);

    const tempConfig: AiModelConfig = {
      id: modelToEdit?.id || 'temp-test',
      name: name || 'Test Model',
      provider,
      modelId,
      baseUrl: baseUrl || undefined,
      apiKey: apiKey || undefined,
      isActive: true,
      isPrimary: false,
      isFallback: false,
      temperature,
      topP,
      maxTokens,
      maxRpm,
      maxRpd,
    };

    const res = await aiConnectionTester.testModelConnection(tempConfig);
    setTestResult(res);
    setIsTesting(false);

    if (res.success) {
      toast.success(res.details || 'Connection verified successfully!');
    } else {
      toast.error(res.error || 'Connection failed.');
    }
  };

  const executeSave = (pingResult?: ConnectionTestResult) => {
    onSave(
      {
        name: name.trim(),
        provider,
        modelId: modelId.trim(),
        baseUrl: baseUrl.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
        isActive,
        isPrimary,
        isFallback,
        fallbackOrder: Number(fallbackOrder) || 1,
        temperature: Number(temperature),
        topP: Number(topP),
        maxTokens: Number(maxTokens),
        systemInstruction: systemInstruction.trim() || undefined,
        maxRpm: Number(maxRpm) || 0,
        maxRpd: Number(maxRpd) || 0,
        lastPingStatus: pingResult ? pingResult.status : undefined,
        lastPingLatencyMs: pingResult?.latencyMs,
        lastPingMessage: pingResult?.details || pingResult?.error,
        lastPingAt: Date.now(),
        supportsTools:
          !modelId.toLowerCase().includes('deepseek-r1') &&
          !modelId.toLowerCase().includes('deepseek_r1') &&
          !modelId.toLowerCase().includes('coder'),
      },
      modelToEdit?.id
    );

    toast.success(modelToEdit ? 'Model configuration updated.' : 'New model configured successfully.');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Friendly name is required.');
      return;
    }
    if (!modelId.trim()) {
      toast.error('Model ID is required.');
      return;
    }

    // If warning was already shown and user clicks Save again, proceed anyway
    if (saveValidationWarning) {
      executeSave();
      return;
    }

    // Validation layer: perform ping test against chosen model before saving
    setIsValidatingSave(true);
    const tempConfig: AiModelConfig = {
      id: modelToEdit?.id || 'temp-save-test',
      name: name.trim(),
      provider,
      modelId: modelId.trim(),
      baseUrl: baseUrl.trim() || undefined,
      apiKey: apiKey.trim() || undefined,
      isActive: true,
      isPrimary: false,
      isFallback: false,
      temperature,
      topP,
      maxTokens,
      maxRpm,
      maxRpd,
    };

    const res = await aiConnectionTester.testModelConnection(tempConfig);
    setIsValidatingSave(false);

    if (res.success) {
      executeSave(res);
    } else {
      setSaveValidationWarning({
        message: res.error || 'The model ping test failed.',
        status: res.status,
      });
      toast.error('Validation test failed: model may be deprecated or unreachable.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#151619] border border-[#2a2b30] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2b30] bg-[#151619]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#2F6BFF]/10 border border-[#2F6BFF]/25 rounded-lg text-[#2F6BFF]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {modelToEdit ? 'Edit AI Model' : 'Configure New AI Model'}
              </h2>
              <p className="text-xs text-[#8E9299]">
                Configure provider endpoint, credentials, api key and inference metrics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8E9299] hover:text-white rounded-lg hover:bg-[#2a2b30]/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto bg-[#0b0c10]">
          {/* Section 1: Provider & Identification */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#2F6BFF] flex items-center gap-2 font-mono">
              <Server className="w-4 h-4" /> 1. Provider & Identification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Service Provider *
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as AiProviderType)}
                  className="w-full bg-[#151619] border border-[#2a2b30] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2F6BFF]"
                >
                  <option value="gemini">Google Gemini (Official / Flash / Pro)</option>
                  <option value="ollama">Ollama (Local / 100% Private)</option>
                  <option value="openrouter">OpenRouter (Multi-Provider Cloud)</option>
                  <option value="openai">OpenAI (Official)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="custom">Custom Endpoint (OpenAI Compatible)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Friendly Model Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gemini 2.5 Flash"
                  className="w-full bg-[#151619] border border-[#2a2b30] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2F6BFF]"
                  required
                />
              </div>
            </div>

            {/* Google Gemini / Provider Model Selector */}
            {provider === 'gemini' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-300">
                    Select Google Gemini Model *
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchOnlineModels}
                    disabled={isFetchingModels}
                    className="flex items-center gap-1.5 text-xs text-[#2F6BFF] hover:text-[#2F6BFF]/80 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingModels ? 'animate-spin' : ''}`} />
                    <span>{isFetchingModels ? 'Fetching Online...' : 'Fetch Live Models Online'}</span>
                  </button>
                </div>

                <select
                  value={isCustomGeminiModel ? 'custom' : modelId}
                  onChange={(e) => handleGeminiModelSelect(e.target.value)}
                  className="w-full bg-[#151619] border border-[#2a2b30] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2F6BFF] font-mono"
                >
                  {onlineModels.length > 0 ? (
                    <>
                      <optgroup label="Discovered Live Models from Google">
                        {onlineModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.isRecommended ? '★ Recommended' : ''}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Custom Option">
                        <option value="custom">Other / Enter Custom Model ID...</option>
                      </optgroup>
                    </>
                  ) : (
                    GEMINI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))
                  )}
                </select>

                {onlineModels.length > 0 && (
                  <span className="text-[10px] text-emerald-400 block flex items-center gap-1">
                    <Cloud className="w-3 h-3" />
                    Synced {onlineModels.length} active models directly from Google Gemini API.
                  </span>
                )}

                {isCustomGeminiModel && (
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Enter Google Gemini Model ID:
                    </label>
                    <input
                      type="text"
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      placeholder="e.g. gemini-3.8-flash, gemini-flash-latest, gemini-3.1-pro-preview"
                      className="w-full bg-[#151619] border border-[#2a2b30] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2F6BFF] font-mono"
                      required
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-300">
                    Model ID / API Identifier *
                  </label>
                  {(provider === 'ollama' || provider === 'openai' || provider === 'openrouter') && (
                    <button
                      type="button"
                      onClick={handleFetchOnlineModels}
                      disabled={isFetchingModels}
                      className="flex items-center gap-1.5 text-xs text-[#2F6BFF] hover:text-[#2F6BFF]/80 transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingModels ? 'animate-spin' : ''}`} />
                      <span>{isFetchingModels ? 'Fetching...' : 'Query Available Models'}</span>
                    </button>
                  )}
                </div>

                {onlineModels.length > 0 ? (
                  <select
                    value={modelId}
                    onChange={(e) => {
                      setModelId(e.target.value);
                      if (!modelToEdit) setName(e.target.value);
                    }}
                    className="w-full bg-[#151619] border border-[#2a2b30] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2F6BFF] font-mono"
                  >
                    {onlineModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    placeholder="e.g. llama3.2:latest, anthropic/claude-3.5-sonnet, gpt-4o-mini"
                    className="w-full bg-[#151619] border border-[#2a2b30] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2F6BFF] font-mono"
                    required
                  />
                )}

                {/* Quick Presets & Tool Compatibility Hints for Ollama */}
                {provider === 'ollama' && (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-[#8E9299]">Atalhos com suporte a Tools:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setModelId('qwen2.5:7b');
                          if (!modelToEdit) setName('Qwen 2.5 7B (Instruct)');
                        }}
                        className="px-2 py-0.5 rounded bg-[#1e1f24] hover:bg-[#282a33] text-emerald-300 border border-emerald-500/30 font-mono transition cursor-pointer"
                      >
                        qwen2.5:7b
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModelId('llama3.1:8b');
                          if (!modelToEdit) setName('Llama 3.1 8B (Instruct)');
                        }}
                        className="px-2 py-0.5 rounded bg-[#1e1f24] hover:bg-[#282a33] text-emerald-300 border border-emerald-500/30 font-mono transition cursor-pointer"
                      >
                        llama3.1:8b
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModelId('mistral-nemo:12b');
                          if (!modelToEdit) setName('Mistral Nemo 12B');
                        }}
                        className="px-2 py-0.5 rounded bg-[#1e1f24] hover:bg-[#282a33] text-emerald-300 border border-emerald-500/30 font-mono transition cursor-pointer"
                      >
                        mistral-nemo:12b
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModelId('llama3.2:3b');
                          if (!modelToEdit) setName('Llama 3.2 3B');
                        }}
                        className="px-2 py-0.5 rounded bg-[#1e1f24] hover:bg-[#282a33] text-emerald-300 border border-emerald-500/30 font-mono transition cursor-pointer"
                      >
                        llama3.2:3b
                      </button>
                    </div>

                    {(modelId.toLowerCase().includes('deepseek-r1') ||
                      modelId.toLowerCase().includes('deepseek_r1') ||
                      modelId.toLowerCase().includes('coder')) && (
                      <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-amber-300">Aviso de Compatibilidade de Ferramentas:</span>{' '}
                          Modelos como DeepSeek-R1 (raciocínio puro) e modelos Coder não executam Function Calling no Ollama. O PIKA bloqueará consultas sobre saldos e posições para proteger contra alucinações. Para interagir com dados de exchanges, utilize modelos instruct como <span className="font-mono text-white">qwen2.5:7b</span> ou <span className="font-mono text-white">llama3.1:8b</span>.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Network, Credentials & API Key */}
          <div className="space-y-4 pt-2 border-t border-[#2a2b30]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 font-mono">
              <Key className="w-4 h-4" /> 2. Connectivity & API Key
            </h3>

            {(provider === 'ollama' || provider === 'openrouter' || provider === 'custom') && (
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Base URL / Endpoint {provider === 'ollama' && '(Default: http://localhost:11434)'}
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full bg-[#151619] border border-[#2a2b30] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2F6BFF] font-mono"
                />
              </div>
            )}

            {/* API Key field for all providers (including Google Gemini) except local Ollama */}
            {provider !== 'ollama' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-300">
                    {provider === 'gemini' ? 'Google Gemini API Key (Optional)' : 'API Key (Stored locally)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-xs text-[#2F6BFF] hover:underline cursor-pointer"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === 'gemini' ? 'Leave blank to use Server Proxy or enter your own AI Studio API Key...' : 'sk-...'}
                  className="w-full bg-[#151619] border border-[#2a2b30] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2F6BFF] font-mono"
                />
                <span className="text-[10px] text-[#8E9299] mt-1 block">
                  {provider === 'gemini'
                    ? 'If left blank, the app will automatically use the built-in server proxy key. Provide your own key to use your individual quota.'
                    : 'Your API key is saved locally in your browser with secure storage.'}
                </span>
              </div>
            )}

            {/* Role toggles: Active, Primary, Fallback */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-[#151619] border border-[#2a2b30] rounded-lg">
              <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2a2b30] text-[#2F6BFF] focus:ring-[#2F6BFF]"
                />
                <span className="font-medium text-white">Active Model</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => {
                    setIsPrimary(e.target.checked);
                    if (e.target.checked) setIsFallback(false);
                  }}
                  className="w-4 h-4 rounded border-[#2a2b30] text-amber-500 focus:ring-amber-500"
                />
                <span className="font-medium text-amber-400">Primary Model</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFallback}
                  onChange={(e) => {
                    setIsFallback(e.target.checked);
                    if (e.target.checked) setIsPrimary(false);
                  }}
                  className="w-4 h-4 rounded border-[#2a2b30] text-cyan-500 focus:ring-cyan-500"
                />
                <span className="font-medium text-cyan-400">Contingency (Fallback)</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  RPM Limit (Req/Min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxRpm}
                  onChange={(e) => setMaxRpm(parseInt(e.target.value) || 0)}
                  placeholder="0 = Unlimited"
                  className="w-full bg-[#151619] border border-[#2a2b30] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#2F6BFF]"
                />
                <span className="text-[10px] text-[#8E9299]">0 for unlimited</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  RPD Limit (Req/Day)
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxRpd}
                  onChange={(e) => setMaxRpd(parseInt(e.target.value) || 0)}
                  placeholder="0 = Unlimited"
                  className="w-full bg-[#151619] border border-[#2a2b30] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#2F6BFF]"
                />
                <span className="text-[10px] text-[#8E9299]">0 for unlimited</span>
              </div>
            </div>
          </div>

          {/* Section 3: Inference Parameters */}
          <div className="space-y-4 pt-2 border-t border-[#2a2b30]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 font-mono">
              <Sliders className="w-4 h-4" /> 3. Inference Parameters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>Temperature</span>
                  <span className="font-mono text-[#2F6BFF]">{temperature.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-[#2F6BFF] cursor-pointer"
                />
                <span className="text-[10px] text-[#8E9299]">0.10 for mathematical precision</span>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>Top P</span>
                  <span className="font-mono text-[#2F6BFF]">{topP.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={topP}
                  onChange={(e) => setTopP(parseFloat(e.target.value))}
                  className="w-full accent-[#2F6BFF] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Max Response Tokens
                </label>
                <input
                  type="number"
                  min="256"
                  max="16384"
                  step="256"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
                  className="w-full bg-[#151619] border border-[#2a2b30] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#2F6BFF]"
                />
              </div>
            </div>
          </div>

          {/* Save Validation Warning Banner */}
          {saveValidationWarning && (
            <div className="p-3.5 rounded-lg border bg-amber-500/10 border-amber-500/30 text-xs text-amber-200 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-amber-300">
                    Model Reachability / Validation Warning
                  </div>
                  <div className="text-[11px] text-amber-200/90 mt-0.5">
                    {saveValidationWarning.message}
                  </div>
                  <div className="text-[10px] text-amber-300/70 mt-1">
                    This model may be deprecated, not yet activated in your account tier, or unreachable. You may still save it, but requests will fail unless automatic fallback is enabled.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setSaveValidationWarning(null)}
                  className="px-2.5 py-1 text-[11px] text-[#8E9299] hover:text-white transition"
                >
                  Adjust Model
                </button>
                <button
                  type="button"
                  onClick={() => executeSave()}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[11px] font-semibold transition"
                >
                  Save Model Anyway
                </button>
              </div>
            </div>
          )}

          {/* Connection Test Output Badge */}
          {testResult && !saveValidationWarning && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold">
                  {testResult.success ? 'Connection Verified!' : 'Connection Failed:'}
                </div>
                <div>{testResult.details || testResult.error}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Latency: {testResult.latencyMs}ms</div>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#2a2b30]">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isValidatingSave}
              className="px-3.5 py-2 bg-[#151619] hover:bg-[#1e1f24] text-white border border-[#2a2b30] rounded-lg text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#2F6BFF]" />}
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isValidatingSave}
                className="px-4 py-2 text-xs font-medium text-[#8E9299] hover:text-white rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isValidatingSave}
                className={`px-5 py-2 rounded-lg text-xs font-semibold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  saveValidationWarning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-[#2F6BFF] hover:bg-[#2F6BFF]/80 text-white'
                }`}
              >
                {isValidatingSave ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                {isValidatingSave ? 'Validating Ping...' : saveValidationWarning ? 'Proceed Anyway & Save' : 'Save Model'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
