import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  ShieldCheck,
  AlertCircle,
  Wrench,
  Copy,
  Check,
  Download,
  Terminal,
  FileCode,
  Layers,
  Sparkles,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react';
import { AiAuditLogEntry, AiRawDebugData } from '../../types/aiTypes';
import { AiRawJsonViewer } from './AiRawJsonViewer';
import toast from 'react-hot-toast';

interface AiAuditDetailsModalProps {
  log: AiAuditLogEntry | null;
  rawDebug?: AiRawDebugData;
  initialTab?: 'overview' | 'request' | 'tools' | 'response' | 'bundle';
  onClose: () => void;
}

export const AiAuditDetailsModal: React.FC<AiAuditDetailsModalProps> = ({
  log,
  rawDebug: propRawDebug,
  initialTab = 'overview',
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'request' | 'tools' | 'response' | 'bundle'>(initialTab);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!log && !propRawDebug) return null;

  // Resolve debug data from either log entry or passed rawDebug
  const debugData: AiRawDebugData | undefined =
    log?.rawDebug || log?.fullPayloadSnapshot?.rawDebug || propRawDebug;

  const modelName = log?.modelName || debugData?.request?.modelId || t('ai.auditModal.unknownModel', 'Unknown Model');
  const provider = log?.provider || debugData?.request?.provider || 'gemini';
  const status = log?.status || (debugData?.error ? 'error' : 'success');
  const durationMs = log?.durationMs || debugData?.response?.durationMs || 0;
  const promptTokens = log?.promptTokens || debugData?.response?.usage?.promptTokens || 0;
  const completionTokens = log?.completionTokens || debugData?.response?.usage?.completionTokens || 0;
  const totalTokens = log?.totalTokens || (promptTokens + completionTokens);
  const userMessage = log?.userMessage || debugData?.request?.messages?.slice(-1)[0]?.content || '';
  const assistantResponse = log?.assistantResponse || debugData?.response?.text || '';
  const errorMessage = log?.errorMessage || debugData?.error?.message;

  const toolsInvoked = log?.toolsInvoked || [];
  const toolsExecution = debugData?.toolsExecution || [];

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleCopyFullBundle = () => {
    const fullBundle = {
      auditLog: log,
      rawDebug: debugData,
      exportedAt: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(fullBundle, null, 2));
    setCopiedAll(true);
    toast.success(t('toasts.debugBundleCopied', 'Debug bundle copied to clipboard!'), { icon: '📋' });
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadFullBundle = () => {
    const fullBundle = {
      auditLog: log,
      rawDebug: debugData,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(fullBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pika-debug-audit-${log?.id || Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('toasts.logFileDownloaded', 'Log file downloaded'));
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-canvas border border-line rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 border border-accent/30 rounded-xl text-accent">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-fg tracking-tight">{t('ai.settings.audit.modalTitle', 'PIKA AI Auditor & Debugger')}</h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    status === 'success'
                      ? 'bg-success/10 text-success border border-success/30'
                      : 'bg-danger/10 text-danger border border-danger/30'
                  }`}
                >
                  {status === 'success' ? t('common.success', 'Success') : t('common.error', 'Error')}
                </span>
                {log?.wasFallback && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-tone-cyan/10 text-tone-cyan border border-tone-cyan/30">
                    {t('ai.settings.models.fallbackBadge', 'Fallback')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-fg-muted">
                {log?.timestamp ? formatTime(log.timestamp) : t('ai.auditModal.realTimeSession', 'Real-Time Session')} — ID: {log?.id || t('ai.auditModal.liveSessionId', 'live-session')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyFullBundle}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-elevated hover:bg-elevated-hover text-fg hover:text-fg rounded-lg text-xs font-medium border border-line transition cursor-pointer"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-accent" />}
              <span>{copiedAll ? t('common.copied', 'Copied!') : t('common.copyJson', 'Copy All (JSON)')}</span>
            </button>
            <button
              onClick={handleDownloadFullBundle}
              className="p-1.5 bg-elevated hover:bg-elevated-hover text-fg-muted hover:text-fg rounded-lg border border-line transition cursor-pointer"
              title={t('ai.audit.tooltips.downloadLog', 'Download Complete Log')}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-fg-muted hover:text-fg rounded-lg hover:bg-elevated transition cursor-pointer ml-1"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-line bg-canvas overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'bg-accent text-white shadow-md'
                : 'text-fg-muted hover:text-fg hover:bg-elevated'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('common.overview', 'Overview')}</span>
          </button>

          <button
            onClick={() => setActiveTab('request')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'request'
                ? 'bg-accent text-white shadow-md'
                : 'text-fg-muted hover:text-fg hover:bg-elevated'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{t('ai.settings.audit.promptRequest', 'Prompt & Request (Raw)')}</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'tools'
                ? 'bg-accent text-white shadow-md'
                : 'text-fg-muted hover:text-fg hover:bg-elevated'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t('ai.settings.audit.toolsContext', 'Tools & Local Context')} ({toolsExecution.length || toolsInvoked.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('response')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'response'
                ? 'bg-accent text-white shadow-md'
                : 'text-fg-muted hover:text-fg hover:bg-elevated'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {t('ai.auditModal.tabRawResponse', 'Raw Response ({{status}})', {
                status: status === 'error' ? t('common.error', 'Error') : t('common.success', 'Success'),
              })}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bundle')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'bundle'
                ? 'bg-accent text-white shadow-md'
                : 'text-fg-muted hover:text-fg hover:bg-elevated'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('ai.auditModal.tabFullBundle', 'Full Bundle')}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-fg bg-canvas">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Metric Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 bg-surface border border-line rounded-xl">
                  <span className="text-[10px] text-fg-muted uppercase tracking-wider block">{t('ai.settings.audit.model', 'Model')}</span>
                  <span className="font-semibold text-fg truncate block">{modelName}</span>
                  <span className="text-[10px] text-accent uppercase">{provider}</span>
                </div>
                <div className="p-3 bg-surface border border-line rounded-xl">
                  <span className="text-[10px] text-fg-muted uppercase tracking-wider block">{t('ai.auditModal.totalDuration', 'Total Duration')}</span>
                  <span className="font-semibold text-warning text-sm block">{durationMs} ms</span>
                  <span className="text-[10px] text-fg-muted">{t('ai.auditModal.e2eLatency', 'E2E Latency')}</span>
                </div>
                <div className="p-3 bg-surface border border-line rounded-xl">
                  <span className="text-[10px] text-fg-muted uppercase tracking-wider block">{t('ai.auditModal.tokensConsumed', 'Tokens Consumed')}</span>
                  <span className="font-semibold text-success text-sm block">{totalTokens}</span>
                  <span className="text-[10px] text-fg-muted">
                    {t('ai.auditModal.tokensInOut', '{{inCount}} in / {{outCount}} out', { inCount: promptTokens, outCount: completionTokens })}
                  </span>
                </div>
                <div className="p-3 bg-surface border border-line rounded-xl">
                  <span className="text-[10px] text-fg-muted uppercase tracking-wider block">{t('ai.auditModal.executionStatus', 'Execution Status')}</span>
                  <span
                    className={`font-semibold uppercase text-xs block ${
                      status === 'success' ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {status === 'success' ? t('common.success', 'Success') : t('common.error', 'Error')}
                  </span>
                  <span className="text-[10px] text-fg-muted">
                    {t('ai.auditModal.toolsCount', '{{count}} tool(s)', { count: toolsExecution.length || toolsInvoked.length })}
                  </span>
                </div>
              </div>

              {log?.wasFallback && (
                <div className="p-3 bg-tone-cyan/10 border border-tone-cyan/30 rounded-xl text-tone-cyan flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-tone-cyan shrink-0" />
                  <span>
                    {t('ai.auditModal.executedViaFallback', 'Executed via contingency (Fallback).')}{' '}
                    {log.fallbackReason ? t('ai.auditModal.fallbackReason', 'Reason: {{reason}}', { reason: log.fallbackReason }) : ''}
                  </span>
                </div>
              )}

              {/* User Message */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted block mb-1.5 flex items-center justify-between">
                  <span>{t('ai.auditModal.userPrompt', 'User Prompt')}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userMessage);
                      toast.success(t('toasts.userPromptCopied', 'User prompt copied!'));
                    }}
                    className="text-[10px] text-accent hover:underline flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Copy className="w-3 h-3" /> {t('common.copy', 'Copy')}
                  </button>
                </span>
                <div className="p-3.5 bg-surface border border-line rounded-xl text-fg font-mono whitespace-pre-wrap leading-relaxed select-text">
                  {userMessage || t('ai.auditModal.emptyMessage', '[Empty message]')}
                </div>
              </div>

              {/* Tools Invocation Summary */}
              {(toolsExecution.length > 0 || toolsInvoked.length > 0) && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-warning block mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" /> {t('ai.auditModal.invokedTools', 'Invoked Local Tools')} ({toolsExecution.length || toolsInvoked.length})
                    </span>
                    <button
                      onClick={() => setActiveTab('tools')}
                      className="text-[10px] text-accent hover:underline flex items-center gap-1 cursor-pointer font-sans"
                    >
                      {t('ai.auditModal.viewRawStoreData', 'View raw store data')} <ArrowRight className="w-3 h-3" />
                    </button>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(toolsExecution.length > 0 ? toolsExecution : toolsInvoked).map((toolItem: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-surface border border-line rounded-xl font-mono text-[11px]">
                        <div className="flex items-center justify-between text-accent font-semibold mb-1">
                          <span className="truncate">{toolItem.name}</span>
                          <span className="text-warning text-[10px]">{toolItem.executionTimeMs} ms</span>
                        </div>
                        <div className="text-[10px] text-fg-muted truncate">
                          {t('ai.auditModal.argsPrefix', 'Args:')} {JSON.stringify(toolItem.inputArgs || toolItem.args || {})}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assistant Response or Error */}
              <div>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 flex items-center justify-between ${
                    status === 'error' ? 'text-danger' : 'text-success'
                  }`}
                >
                  <span>{status === 'error' ? t('ai.auditModal.modelTechnicalError', 'Model Technical Error') : t('ai.auditModal.assistantResponse', 'Assistant Response')}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(errorMessage || assistantResponse);
                      toast.success(t('toasts.responseCopied', 'Response copied!'));
                    }}
                    className="text-[10px] text-accent hover:underline flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Copy className="w-3 h-3" /> {t('common.copy', 'Copy')}
                  </button>
                </span>
                <div
                  className={`p-3.5 rounded-xl whitespace-pre-wrap select-text leading-relaxed font-mono ${
                    status === 'error'
                      ? 'bg-danger/10 border border-danger/30 text-danger'
                      : 'bg-surface border border-line text-fg'
                  }`}
                >
                  {errorMessage || assistantResponse || t('ai.auditModal.noResponseGenerated', '[No response generated]')}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROMPT & REQUEST */}
          {activeTab === 'request' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="p-3 bg-surface border border-line rounded-xl flex items-center gap-2 text-xs text-fg-muted">
                <Info className="w-4 h-4 text-accent shrink-0" />
                <span>
                  {t('ai.auditModal.requestInfoBanner', 'Detailed view of everything transmitted to the model: system prompt, message history, tool declarations, and inference parameters.')}
                </span>
              </div>

              {/* System Instruction */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-tone-purple">
                    {t('ai.auditModal.systemInstructionTitle', 'System Instruction (System Prompt)')}
                  </span>
                  <button
                    onClick={() => {
                      const sys = debugData?.request?.systemInstruction || log?.fullPayloadSnapshot?.sentPrompt || '';
                      navigator.clipboard.writeText(sys);
                      toast.success(t('toasts.systemPromptCopied', 'System prompt copied!'));
                    }}
                    className="text-[10px] text-accent hover:underline flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Copy className="w-3 h-3" /> {t('ai.auditModal.copySystemPrompt', 'Copy System Prompt')}
                  </button>
                </div>
                <div className="p-3.5 bg-surface border border-line rounded-xl text-fg font-mono max-h-48 overflow-y-auto select-text whitespace-pre-wrap text-[11px]">
                  {debugData?.request?.systemInstruction || log?.fullPayloadSnapshot?.sentPrompt || t('ai.auditModal.defaultSystemPrompt', '[Default system prompt]')}
                </div>
              </div>

              {/* Messages Array Sent */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent block mb-1">
                  {t('ai.auditModal.messageHistorySent', 'Message History Sent ({{count}} turns)', { count: debugData?.request?.messages?.length || 0 })}
                </span>
                <div className="space-y-2">
                  {(debugData?.request?.messages || []).map((msg: any, idx: number) => {
                    const role = msg.role || (msg.parts ? 'model' : 'user');
                    return (
                      <div key={idx} className="p-3 bg-surface border border-line rounded-xl font-mono text-[11px]">
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-line">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              role === 'user'
                                ? 'bg-tone-blue/10 text-tone-blue'
                                : role === 'assistant' || role === 'model'
                                ? 'bg-success/10 text-success'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {t('ai.auditModal.turnLabel', 'Turn {{num}}', { num: idx + 1 })} • {role}
                          </span>
                          <span className="text-fg-muted text-[10px]">
                            {Array.isArray(msg.parts)
                              ? t('ai.auditModal.partsCount', '{{count}} parts', { count: msg.parts.length })
                              : t('ai.auditModal.directText', 'Direct text')}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap select-text text-fg">
                          {msg.content || (msg.parts ? JSON.stringify(msg.parts, null, 2) : JSON.stringify(msg))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Raw Request Payload */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted block mb-1">
                  {t('ai.auditModal.completeRequestRawJson', 'Complete Request Raw JSON')}
                </span>
                <AiRawJsonViewer
                  title={t('ai.audit.tooltips.requestPayload', 'Request Payload JSON')}
                  data={debugData?.request?.rawPayload || debugData?.request || log?.fullPayloadSnapshot?.requestPayload || {}}
                />
              </div>
            </div>
          )}

          {/* TAB 3: TOOLS TRACE & DATA */}
          {activeTab === 'tools' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="p-3 bg-surface border border-line rounded-xl flex items-center gap-2 text-xs text-warning">
                <Database className="w-4 h-4 text-warning shrink-0" />
                <span>
                  {t('ai.auditModal.toolsInfoBanner', 'Raw data returned by local tools (IndexedDB / Zustand store). This is the exact context fed to the LLM to ground its response.')}
                </span>
              </div>

              {toolsExecution.length === 0 && toolsInvoked.length === 0 ? (
                <div className="text-center py-10 text-fg-muted space-y-2">
                  <Wrench className="w-8 h-8 mx-auto text-fg-muted/50" />
                  <p>{t('ai.auditModal.noToolsInvoked', 'No local tools were invoked in this query.')}</p>
                  <p className="text-[10px] text-fg-muted">
                    {t('ai.auditModal.noToolsDesc', 'The model responded directly from the prompt and conversation history.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(toolsExecution.length > 0 ? toolsExecution : toolsInvoked.map((toolItem, idx) => ({
                    turn: 1,
                    name: toolItem.name,
                    inputArgs: toolItem.args,
                    rawResult: log?.fullPayloadSnapshot?.rawToolResults?.[idx] || toolItem.resultSummary,
                    executionTimeMs: toolItem.executionTimeMs,
                    error: toolItem.resultSummary.includes('error') ? toolItem.resultSummary : undefined,
                  }))).map((toolExec, idx) => (
                    <div key={idx} className="bg-surface border border-line rounded-xl p-4 space-y-3 shadow-md">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-accent/10 text-accent border border-accent/20 flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </span>
                          <span className="font-mono font-bold text-sm text-fg">{toolExec.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-warning/10 text-warning border border-warning/20">
                            {toolExec.executionTimeMs} ms
                          </span>
                        </div>
                        <span className="text-[10px] text-fg-muted font-mono">
                          {t('ai.auditModal.executionTurn', 'Execution turn: #{{turn}}', { turn: toolExec.turn || 1 })}
                        </span>
                      </div>

                      {/* Arguments */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-fg-muted block mb-1">
                          {t('ai.auditModal.inputArgsLabel', 'Parameters Received from Model (Input Args):')}
                        </span>
                        <div className="p-2.5 bg-canvas border border-line rounded-lg font-mono text-[11px] text-tone-cyan">
                          {JSON.stringify(toolExec.inputArgs || {}, null, 2)}
                        </div>
                      </div>

                      {/* Raw Result from Local DB */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-success block mb-1 flex items-center justify-between">
                          <span>{t('ai.auditModal.rawReturnLabel', 'Raw Data Extracted from Local Store (Raw Return):')}</span>
                        </span>
                        <AiRawJsonViewer
                          title={`${t('ai.auditModal.rawResultPrefix', 'Raw Result:')} ${toolExec.name}`}
                          data={toolExec.rawResult}
                          defaultExpanded={true}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RAW RESPONSE */}
          {activeTab === 'response' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Status & Timing */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                <div className="p-3 bg-surface border border-line rounded-xl">
                  <span className="text-[10px] text-fg-muted uppercase block">{t('ai.auditModal.httpStatus', 'HTTP Status')}</span>
                  <span
                    className={`font-semibold text-sm ${
                      debugData?.response?.status === 200 || status === 'success'
                        ? 'text-success'
                        : 'text-danger'
                    }`}
                  >
                    {debugData?.response?.status || (status === 'success' ? '200 OK' : t('common.error', 'Error'))}
                  </span>
                </div>
                <div className="p-3 bg-surface border border-line rounded-xl">
                  <span className="text-[10px] text-fg-muted uppercase block">{t('ai.settings.audit.tokens', 'Tokens')}</span>
                  <span className="font-semibold text-fg text-sm">
                    {debugData?.response?.usage?.totalTokens || totalTokens}
                  </span>
                </div>
                <div className="p-3 bg-surface border border-line rounded-xl">
                  <span className="text-[10px] text-fg-muted uppercase block">{t('ai.auditModal.modelToolCalls', 'Model Tool Calls')}</span>
                  <span className="font-semibold text-accent text-sm">
                    {debugData?.response?.toolCalls?.length || toolsExecution.length || 0}
                  </span>
                </div>
              </div>

              {/* Error Details if any */}
              {debugData?.error && (
                <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-danger flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {t('ai.auditModal.apiErrorDetails', 'API / Server Error Details')}
                  </span>
                  <div className="p-3 bg-canvas border border-danger/30 rounded-lg text-danger font-mono text-[11px] whitespace-pre-wrap select-text">
                    {JSON.stringify(debugData.error, null, 2)}
                  </div>
                </div>
              )}

              {/* Raw Response Text */}
              {debugData?.response?.text && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-success block mb-1">
                    {t('ai.auditModal.generatedOutput', 'Generated Text (Output)')}
                  </span>
                  <div className="p-3.5 bg-surface border border-line rounded-xl text-fg font-mono whitespace-pre-wrap select-text text-[11px]">
                    {debugData.response.text}
                  </div>
                </div>
              )}

              {/* Full Raw Response Object */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted block mb-1">
                  {t('ai.auditModal.rawProviderResponseObject', 'Raw Provider Response JSON Object')}
                </span>
                <AiRawJsonViewer
                  title={t('ai.audit.tooltips.rawResponse', 'Raw Provider Response JSON')}
                  data={
                    debugData?.response?.rawResponse ||
                    debugData?.response ||
                    log?.fullPayloadSnapshot?.rawResponse ||
                    {}
                  }
                  defaultExpanded={true}
                />
              </div>
            </div>
          )}

          {/* TAB 5: FULL BUNDLE */}
          {activeTab === 'bundle' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="p-3 bg-surface border border-line rounded-xl flex items-center justify-between gap-3 text-xs">
                <span className="text-fg-muted">
                  {t('ai.auditModal.fullBundleDesc', 'Full export of all telemetry metadata, prompt snapshots, tool data, and raw response.')}
                </span>
                <button
                  onClick={handleCopyFullBundle}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold transition cursor-pointer shrink-0"
                >
                  {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAll ? t('common.copied', 'Copied!') : t('ai.auditModal.copyFullBundle', 'Copy Full Bundle')}</span>
                </button>
              </div>

              <AiRawJsonViewer
                title={t('ai.audit.tooltips.fullRecord', 'Full Execution Audit Record')}
                data={{
                  auditLog: log,
                  rawDebug: debugData,
                }}
                defaultExpanded={true}
                maxHeight="max-h-[60vh]"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-line bg-surface flex items-center justify-between shrink-0">
          <div className="text-[11px] text-fg-muted flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span>{t('ai.auditModal.footerSecurityNote', '100% Isolated & secure audit (Zero credentials exposed)')}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-elevated hover:bg-elevated-hover text-fg rounded-lg text-xs font-medium transition cursor-pointer border border-line"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};
