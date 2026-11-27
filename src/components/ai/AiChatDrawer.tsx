import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Send,
  Sparkles,
  Bot,
  Shield,
  Loader2,
  Settings as SettingsIcon,
  History,
  Plus,
  MessageSquare,
  ShieldCheck,
  MoreVertical,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  Square,
  FileText,
  Lock,
  Unlock,
  ArrowRight,
} from 'lucide-react';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { isVaultConfigured } from '../../utils/vaultHelpers';
import { VaultSetupModal } from '../VaultSetupModal';
import { useAiChatStore } from '../../store/aiChatStore';
import { useAiSettingsStore } from '../../store/aiSettingsStore';
import { aiAdapter } from '../../services/ai/aiAdapter';
import { aiAuditLogger } from '../../services/ai/aiAuditLogger';
import { exportAiAnalysisToPdf } from '../../services/ai/aiReportExporter';
import { formatUserFriendlyAiError } from '../../services/ai/aiErrorFormatter';
import { AiAuditLogEntry, AiChatMessage, AiRawDebugData } from '../../types/aiTypes';
import { AiToolCallBadge } from './AiToolCallBadge';
import { AiQuickActionChips } from './AiQuickActionChips';
import { AiChatHistorySidebar } from './AiChatHistorySidebar';
import { AiMarkdownRenderer } from './AiMarkdownRenderer';
import { AiErrorMessageCard } from './AiErrorMessageCard';
import { AiCancelledMessageCard } from './AiCancelledMessageCard';
import { AiAuditDetailsModal } from './AiAuditDetailsModal';
import { AiAuditLogTable } from './AiAuditLogTable';
import { AppTooltip } from '../ui/Tooltip';
import toast from 'react-hot-toast';

interface AiChatDrawerProps {
  onNavigateToSettings?: () => void;
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({ onNavigateToSettings }) => {
  const { t, i18n } = useTranslation();
  const {
    isDrawerOpen,
    closeDrawer,
    messages,
    addMessage,
    updateMessage,
    clearMessages,
    isThinking,
    setIsThinking,
    activeTools,
    addActiveTool,
    removeActiveTool,
    sessions,
    currentSessionId,
    isHistoryOpen,
    setIsHistoryOpen,
    createSession,
  } = useAiChatStore();

  const currentSession = currentSessionId ? sessions[currentSessionId] : null;
  const isEnabled = useAiSettingsStore((state) => state.globalSettings.isEnabled);
  const setIsEnabled = useAiSettingsStore((state) => state.setIsEnabled);
  const primaryModel = aiAdapter.getPrimaryActiveModel();

  const { isInitialized, encryptedData, isUnlocked } = useApiKeysStore();
  const isVaultActive = isVaultConfigured({ isInitialized, encryptedData });
  const [isVaultSetupModalOpen, setIsVaultSetupModalOpen] = useState(false);

  const [inputMessage, setInputMessage] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Full-screen and dock position preferences
  const [isMaximized, setIsMaximized] = useState(false);
  const [dockSide, setDockSide] = useState<'left' | 'right'>(() => {
    try {
      const saved = localStorage.getItem('pika_chat_dock_side');
      return saved === 'left' ? 'left' : 'right';
    } catch {
      return 'right';
    }
  });

  const toggleDockSide = () => {
    const nextSide = dockSide === 'right' ? 'left' : 'right';
    setDockSide(nextSide);
    try {
      localStorage.setItem('pika_chat_dock_side', nextSide);
    } catch {
      // ignore localStorage quota/privacy errors
    }
    toast.success(
      t('toasts.chatDocked', 'Chat docked to {{side}}', {
        side: nextSide === 'left' ? t('ai.chat.dockLeftLabel', 'Left') : t('ai.chat.dockRightLabel', 'Right'),
      }),
      { icon: '⚓' }
    );
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
  };

  // Debug Inspector & Audit Table Modal States
  const [debugLogEntry, setDebugLogEntry] = useState<AiAuditLogEntry | null>(null);
  const [debugRawData, setDebugRawData] = useState<AiRawDebugData | null>(null);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showAuditTableModal, setShowAuditTableModal] = useState(false);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Keyboard shortcut Ctrl+J / Cmd+J to toggle, ESC to cancel request or close menu/drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        useAiChatStore.getState().toggleDrawer();
        return;
      }

      if (e.key === 'Escape') {
        if (isThinking) {
          e.preventDefault();
          e.stopPropagation();
          handleCancelRequest();
        } else if (isMenuOpen) {
          setIsMenuOpen(false);
        } else if (showClearConfirm) {
          setShowClearConfirm(false);
        } else if (isHistoryOpen) {
          setIsHistoryOpen(false);
        } else if (isMaximized) {
          setIsMaximized(false);
        } else if (isDrawerOpen) {
          closeDrawer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isThinking, isMenuOpen, showClearConfirm, isHistoryOpen, isMaximized, isDrawerOpen, closeDrawer, setIsHistoryOpen]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, isDrawerOpen, activeTools]);

  // Focus input when opened
  useEffect(() => {
    if (isDrawerOpen && isEnabled) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isDrawerOpen, isEnabled]);

  const openDebugForMessage = async (msg: AiChatMessage) => {
    if (msg.auditLogId) {
      const entry = await aiAuditLogger.getLogById(msg.auditLogId);
      if (entry) {
        setDebugLogEntry(entry);
        setDebugRawData(entry.rawDebug || msg.rawDebug || null);
        setShowDebugModal(true);
        return;
      }
    }

    const lastUserPrompt = [...messages]
      .filter((m) => m.timestamp <= msg.timestamp && m.role === 'user')
      .slice(-1)[0]?.content || '';

    const synthesizedEntry: AiAuditLogEntry = {
      id: msg.auditLogId || `msg-${msg.id}`,
      timestamp: msg.timestamp,
      modelId: primaryModel?.modelId || 'gemini-3.8-flash',
      modelName: msg.usedModelName || primaryModel?.name || 'PIKA AI',
      provider: primaryModel?.provider || 'gemini',
      wasFallback: Boolean(msg.wasFallback),
      type: 'chat_query',
      userMessage: lastUserPrompt,
      assistantResponse: msg.content,
      toolsInvoked: msg.toolsInvoked || [],
      promptTokens: msg.rawDebug?.response?.usage?.promptTokens || 0,
      completionTokens: msg.rawDebug?.response?.usage?.completionTokens || 0,
      totalTokens: msg.rawDebug?.response?.usage?.totalTokens || 0,
      durationMs: msg.rawDebug?.response?.durationMs || 0,
      status: msg.status === 'error' ? 'error' : 'success',
      errorMessage: msg.errorMessage,
      rawDebug: msg.rawDebug,
      fullPayloadSnapshot: {
        sentPrompt: msg.rawDebug?.request?.systemInstruction,
        rawToolResults: msg.rawDebug?.toolsExecution,
        requestPayload: msg.rawDebug?.request,
        rawResponse: msg.rawDebug?.response?.rawResponse,
        rawDebug: msg.rawDebug,
      },
    };

    setDebugLogEntry(synthesizedEntry);
    setDebugRawData(msg.rawDebug || null);
    setShowDebugModal(true);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputMessage).trim();
    if (!prompt || isThinking) return;

    if (!isEnabled) {
      toast.error(t('toasts.pikaDisabledNotice', 'PIKA Assistant is disabled. Enable it in "AI Settings".'));
      return;
    }

    setInputMessage('');

    addMessage({
      role: 'user',
      content: prompt,
      status: 'complete',
    });

    const assistantMsgId = addMessage({
      role: 'assistant',
      content: '',
      status: 'thinking',
    });

    setIsThinking(true, primaryModel?.name || 'AI');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await aiAdapter.sendMessage({
        userMessage: prompt,
        conversationHistory: messages,
        signal: abortController.signal,
        onToolInvoking: (toolName) => {
          addActiveTool(toolName);
          setTimeout(() => removeActiveTool(toolName), 1200);
        },
      });

      updateMessage(assistantMsgId, {
        content: response.answer,
        status: 'complete',
        usedModelName: response.usedModel.name,
        wasFallback: response.wasFallback,
        toolsInvoked: response.toolsInvoked,
        auditLogId: response.auditLogId,
        rawDebug: response.rawDebug,
        unverifiedData: response.unverifiedData,
        auditWarning: response.auditWarning,
        incompatibleToolModel: response.incompatibleToolModel,
        recommendedModelSuggestion: response.recommendedModelSuggestion,
      });
    } catch (err: any) {
      const isCancelled = err?.name === 'AbortError' || err?.isCancelled || abortController.signal.aborted;

      if (isCancelled) {
        updateMessage(assistantMsgId, {
          content: t('ai.cancelled.defaultMsg', 'Response generation was cancelled by user.'),
          status: 'cancelled',
          errorMessage: t('ai.chat.cancelledByUser', 'Operation cancelled by user.'),
          auditLogId: err?.auditLogId,
          rawDebug: err?.rawDebug,
        });
        toast(t('toasts.analysisStopped', 'Analysis stopped'), { icon: '⏹️' });
      } else {
        const parsed = formatUserFriendlyAiError(err);
        console.error('[PIKA AI Assistant Error]', parsed.technicalDetails);

        updateMessage(assistantMsgId, {
          content: parsed.friendlyMessage,
          status: 'error',
          errorMessage: parsed.technicalDetails,
          auditLogId: err?.auditLogId,
          rawDebug: err?.rawDebug,
        });
        toast.error(parsed.friendlyMessage, { duration: 4500 });
      }
    } finally {
      setIsThinking(false);
      abortControllerRef.current = null;
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = () => {
    createSession('New Conversation');
    setIsMenuOpen(false);
    toast.success(t('toasts.newConversationStarted', 'New conversation started'), { icon: '✨' });
  };

  const confirmClearChat = () => {
    clearMessages();
    setShowClearConfirm(false);
    setIsMenuOpen(false);
    toast.success(t('toasts.chatHistoryCleared', 'Chat history cleared'), { icon: '🧹' });
  };

  if (!isDrawerOpen) return null;

  const sessionCount = Object.keys(sessions).length;

  return (
    <>
      {/* Backdrop for Desktop and Mobile (dismiss on outside tap) */}
      <div
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity animate-in fade-in-0 duration-200"
        aria-hidden="true"
      />

      {/* Main Responsive Drawer Container (Supports Right Dock, Left Dock, and Full-Screen Maximized) */}
      <aside
        className={`fixed z-50 bg-surface shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? 'inset-0 w-full h-full border-none rounded-none'
            : dockSide === 'left'
            ? 'inset-0 md:left-0 md:right-auto md:top-0 md:bottom-0 md:w-[480px] lg:w-[540px] md:border-r border-line animate-in slide-in-from-left duration-200'
            : 'inset-0 md:left-auto md:right-0 md:top-0 md:bottom-0 md:w-[480px] lg:w-[540px] md:border-l border-line animate-in slide-in-from-right duration-200'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="PIKA Assistant"
      >
        {/* Collapsible History Sidebar Overlay */}
        {isHistoryOpen && <AiChatHistorySidebar onClose={() => setIsHistoryOpen(false)} />}

        {/* Clear Chat Confirmation Modal */}
        {showClearConfirm && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-0">
            <div className="bg-surface border border-line rounded-2xl p-5 max-w-xs w-full text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/20 text-danger flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-fg">{t('ai.chat.clearModalTitle', 'Clear Conversation?')}</h3>
                <p className="text-xs text-fg-muted mt-1">
                  {t('ai.chat.clearModalDesc', 'Are you sure you want to delete all messages in this conversation? This action cannot be undone.')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 bg-elevated hover:bg-line text-fg rounded-xl text-xs font-semibold transition cursor-pointer border border-line min-h-[44px]"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmClearChat}
                  className="flex-1 py-2.5 bg-danger hover:bg-danger/90 text-white rounded-xl text-xs font-semibold transition cursor-pointer min-h-[44px]"
                >
                  {t('ai.chat.confirmClearBtn', 'Yes, Clear')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Streamlined Header: Brand, Model Badge & Consolidated Action Cluster */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface shrink-0 min-h-[56px]">
          {/* Zone 1: Brand & Model Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-accent/10 border border-accent/25 rounded-xl text-accent shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-fg tracking-tight truncate">{t('ai.chat.brandTitle', 'PIKA Assistant')}</h2>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent/10 text-accent border border-accent/20 uppercase">
                  {t('ai.chat.auditorBadge', 'AI Auditor')}
                </span>
              </div>
              <div className="text-[10px] text-fg-muted flex items-center gap-1.5 truncate">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isEnabled ? (primaryModel ? 'bg-success animate-pulse' : 'bg-warning') : 'bg-fg-muted/50'
                  }`}
                />
                <span className="truncate">
                  {isEnabled
                    ? primaryModel
                      ? `${primaryModel.name}`
                      : t('ai.chat.noActiveModel', 'No active model')
                    : t('ai.settings.disabledByDefault', 'Disabled by default')}
                </span>
              </div>
            </div>
          </div>

          {/* Zone 2: Direct Primary Actions + 3-Dots Kebab Menu + Close */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Direct New Conversation Button */}
            <AppTooltip description={t('ai.chat.tooltips.newConversation', 'New conversation')} side="bottom">
              <button
                type="button"
                onClick={handleNewConversation}
                className="w-9 h-9 flex items-center justify-center text-fg-muted hover:text-accent rounded-lg hover:bg-elevated-hover border border-line transition cursor-pointer"
                aria-label={t('ai.chat.tooltips.newConversation', 'New conversation')}
              >
                <Plus className="w-4 h-4" />
              </button>
            </AppTooltip>

            {/* Direct Full-Screen Maximize / Restore Button */}
            <AppTooltip
              description={
                isMaximized
                  ? t('ai.chat.tooltips.restoreDock', 'Restore to dock')
                  : t('ai.chat.tooltips.expandFullScreen', 'Expand to full screen')
              }
              side="bottom"
            >
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg border transition cursor-pointer ${
                  isMaximized
                    ? 'text-accent bg-accent/15 border-accent/40'
                    : 'text-fg-muted hover:text-accent hover:bg-elevated-hover border-line'
                }`}
                aria-label={
                  isMaximized
                    ? t('ai.chat.tooltips.restoreDock', 'Restore to dock')
                    : t('ai.chat.tooltips.expandFullScreen', 'Expand to full screen')
                }
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </AppTooltip>

            {/* 3-Dots Kebab Menu Dropdown */}
            <div className="relative" ref={menuRef}>
              <AppTooltip description={t('ai.chat.tooltips.moreOptions', 'More options')} side="bottom">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border transition cursor-pointer ${
                    isMenuOpen
                      ? 'text-accent bg-accent/15 border-accent/40'
                      : 'text-fg-muted hover:text-fg hover:bg-elevated-hover border-line'
                  }`}
                  aria-label={t('ai.chat.tooltips.moreOptions', 'More options')}
                  aria-expanded={isMenuOpen}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </AppTooltip>

              {/* Popover Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-surface border border-line rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                  {/* Full-Screen Toggle Shortcut */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsMaximized(!isMaximized);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-fg hover:text-fg hover:bg-elevated-hover transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {isMaximized ? (
                        <Minimize2 className="w-4 h-4 text-accent" />
                      ) : (
                        <Maximize2 className="w-4 h-4 text-fg-muted" />
                      )}
                      <span>
                        {isMaximized
                          ? t('ai.chat.menu.restoreDock', 'Restore to Dock')
                          : t('ai.chat.menu.expandFullScreen', 'Expand to Full Screen')}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-elevated text-fg-muted font-mono">
                      {isMaximized ? t('ai.chat.menu.restoreShort', 'Restore') : t('ai.chat.menu.fullShort', 'Full')}
                    </span>
                  </button>

                  {/* Dock Side Switcher (Left vs Right) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      toggleDockSide();
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-fg hover:text-fg hover:bg-elevated-hover transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {dockSide === 'right' ? (
                        <PanelLeft className="w-4 h-4 text-fg-muted" />
                      ) : (
                        <PanelRight className="w-4 h-4 text-fg-muted" />
                      )}
                      <span>
                        {dockSide === 'right'
                          ? t('ai.chat.menu.dockToLeft', 'Dock to Left')
                          : t('ai.chat.menu.dockToRight', 'Dock to Right')}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-semibold uppercase">
                      {dockSide === 'left' ? t('ai.chat.dockLeftLabel', 'Left') : t('ai.chat.dockRightLabel', 'Right')}
                    </span>
                  </button>

                  {/* Divider */}
                  <div className="my-1 border-t border-line/70" />

                  {/* Chat History Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsHistoryOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-fg hover:text-fg hover:bg-elevated-hover transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <History className="w-4 h-4 text-fg-muted" />
                      <span>{t('ai.chatHistory.title', 'Chat History')}</span>
                    </div>
                    {sessionCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-elevated text-fg-muted font-mono">
                        {sessionCount}
                      </span>
                    )}
                  </button>

                  {/* Audit Logs Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowAuditTableModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-fg hover:text-fg hover:bg-elevated-hover transition cursor-pointer text-left"
                  >
                    <ShieldCheck className="w-4 h-4 text-fg-muted" />
                    <span>{t('ai.chat.menu.auditTelemetry', 'Audit Logs & Telemetry')}</span>
                  </button>

                  {/* AI Settings Option (Closes Drawer and navigates to AI Settings screen) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      closeDrawer();
                      if (onNavigateToSettings) onNavigateToSettings();
                      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'ai-settings' }));
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-fg hover:text-fg hover:bg-elevated-hover transition cursor-pointer text-left"
                  >
                    <SettingsIcon className="w-4 h-4 text-fg-muted" />
                    <span>{t('ai.error.settings', 'AI Settings')}</span>
                  </button>

                  {/* Divider */}
                  <div className="my-1 border-t border-line/70" />

                  {/* Clear Chat Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowClearConfirm(true);
                    }}
                    disabled={messages.length === 0}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-danger hover:bg-danger/10 transition cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4 text-danger" />
                    <span>{t('ai.chat.menu.clearConversation', 'Clear Conversation')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Close Drawer Button */}
            <AppTooltip description={t('ai.chat.tooltips.close', 'Close Assistant (Ctrl+J)')} side="bottom">
              <button
                type="button"
                onClick={closeDrawer}
                className="w-9 h-9 flex items-center justify-center text-fg-muted hover:text-danger rounded-lg hover:bg-elevated-hover border border-line transition cursor-pointer"
                aria-label={t('ai.chat.tooltips.close', 'Close Assistant (Ctrl+J)')}
              >
                <X className="w-4 h-4" />
              </button>
            </AppTooltip>
          </div>
        </header>

        {/* Optional Active Session Banner */}
        {currentSession && currentSession.title !== 'New Conversation' && (
          <div className="px-4 py-1.5 bg-elevated border-b border-line flex items-center justify-between text-[11px] text-fg-muted shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className={`text-fg font-medium truncate ${isMaximized ? 'max-w-2xl' : 'max-w-[280px]'}`}>
                {currentSession.title}
              </span>
            </div>
            <span className="font-mono text-[10px] text-fg-muted shrink-0">
              {t('ai.chat.msgsCount', '{{count}} msgs', { count: messages.length })}
            </span>
          </div>
        )}

        {/* Scrollable Message List / Zero State */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 bg-canvas ${isMaximized ? 'w-full' : ''}`}>
          <div className={isMaximized ? 'w-full space-y-4 px-2 xl:px-8 2xl:px-16' : 'space-y-4'}>
          {!isVaultActive ? (
            /* Mandatory Vault Setup Required State */
            <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 my-auto space-y-4">
              <div className="p-6 sm:p-8 bg-gradient-to-b from-surface to-canvas border border-line rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-fg">
                <div className="w-16 h-16 rounded-2xl bg-warning/10 border border-warning/25 flex items-center justify-center mx-auto text-warning shadow-inner">
                  <ShieldAlert className="w-8 h-8 text-warning" />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 mb-2 text-[10px] font-bold uppercase tracking-wider bg-warning/15 text-warning rounded-full border border-warning/30">
                    {t('ai.chat.vaultRequiredBadge', 'Security Lockout • Vault Required')}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-fg">
                    {t('ai.chat.vaultRequiredTitle', 'PIKA AI Assistant Locked')}
                  </h3>
                  <p className="text-xs text-fg-muted mt-2 leading-relaxed">
                    {t('ai.chat.vaultRequiredDesc', 'The PIKA quantitative AI auditor operates exclusively under zero-trust security. Real-time portfolio analysis, balance auditing, and risk metrics are completely locked until your local vault is configured with a master passphrase.')}
                  </p>
                </div>

                <div className="bg-surface p-3.5 rounded-xl border border-line/60 text-left text-[11px] text-fg-muted space-y-1.5">
                  <div className="flex items-center gap-2 text-fg font-medium text-xs mb-1">
                    <Lock className="w-4 h-4 text-accent shrink-0" />
                    {t('ai.chat.zeroTrustProtection', 'Zero-Trust Protection')}
                  </div>
                  <p>• {t('ai.chat.vaultFeature1', 'Military-grade PBKDF2 (600,000 iterations) + AES-GCM-256 client encryption.')}</p>
                  <p>• {t('ai.chat.vaultFeature2', 'API credentials and account balances are never transmitted in plaintext.')}</p>
                  <p>• {t('ai.chat.vaultFeature3', 'Protects against unauthorized local extensions and session hijacking.')}</p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVaultSetupModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-accent hover:bg-accent-hover active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-lg shadow-accent/25 transition cursor-pointer min-h-[44px]"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{t('ai.chat.activateVaultBtn', 'Activate Security Vault to Unlock')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-fg-muted">
                  {t('ai.chat.vaultSimNote', 'You can explore mock simulation data across the dashboard without configuring keys, but PIKA live analysis requires an active vault.')}
                </p>
              </div>
            </div>
          ) : !isUnlocked && encryptedData ? (
            /* Vault Configured but Locked in Memory State */
            <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 my-auto space-y-4">
              <div className="p-6 sm:p-8 bg-gradient-to-b from-surface to-canvas border border-line rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-fg">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center mx-auto text-accent shadow-inner">
                  <Lock className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 mb-2 text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent rounded-full border border-accent/30">
                    {t('ai.chat.vaultLockedBadge', 'Vault Locked')}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-fg">
                    {t('ai.chat.vaultLockedTitle', 'Unlock Vault to Use PIKA')}
                  </h3>
                  <p className="text-xs text-fg-muted mt-2 leading-relaxed">
                    {t('ai.chat.vaultLockedDesc', 'Your security vault is currently locked. Enter your master passphrase to allow PIKA to read audited exchange balances and position calculations.')}
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      closeDrawer();
                      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'settings' }));
                    }}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-accent hover:bg-accent-hover active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-lg shadow-accent/25 transition cursor-pointer min-h-[44px]"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{t('ai.chat.goToSettingsUnlock', 'Go to Settings to Unlock')}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : !isEnabled ? (
            /* First-Access 1-Click Activation Card */
            <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-4">
              <div className="p-6 bg-gradient-to-b from-surface to-canvas border border-line rounded-2xl text-fg max-w-md shadow-2xl space-y-4">
                <div className="w-14 h-14 bg-accent/10 border border-accent/30 rounded-2xl flex items-center justify-center mx-auto text-accent shadow-inner">
                  <Sparkles className="w-7 h-7 text-accent animate-pulse" />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 mb-2 text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent rounded-full border border-accent/30">
                    {t('ai.chat.onboardingBadge', 'PIKA v2.0 • AI Auditor')}
                  </span>
                  <h3 className="text-base font-bold text-fg">
                    {t('ai.chat.onboardingTitle', 'Would you like to enable the PIKA assistant with 1 click?')}
                  </h3>
                  <p className="text-xs text-fg-muted mt-2 leading-relaxed">
                    {t('ai.chat.onboardingDesc', 'For strict zero-trust security and privacy, the assistant is disabled by default. Activate instantly to audit consolidated balances, liquidation risks, hedge correlation, and history with mathematical precision.')}
                  </p>
                </div>

                <div className="bg-surface p-3.5 rounded-xl border border-line/60 text-left text-[11px] text-fg-muted space-y-1.5">
                  <div className="flex items-center gap-2 text-fg font-medium text-xs mb-1">
                    <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                    {t('ai.chat.privacyGuaranteedTitle', 'Privacy & Security Guaranteed')}
                  </div>
                  <p>• {t('ai.chat.privacyBullet1', 'Your API keys and secrets are never transmitted to the model.')}</p>
                  <p>• {t('ai.chat.privacyBullet2', 'Privacy Mode masks nominal balances with percentage allocations.')}</p>
                  <p>• {t('ai.chat.privacyBullet3', 'Supports local Ollama (100% private) or Google Gemini Cloud.')}</p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEnabled(true)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-accent hover:bg-accent-hover active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-lg shadow-accent/25 transition cursor-pointer min-h-[44px]"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('ai.chat.enableNowBtn', 'Enable PIKA Assistant Now')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeDrawer();
                      if (onNavigateToSettings) onNavigateToSettings();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-elevated hover:bg-line text-fg rounded-xl text-xs font-semibold border border-line transition cursor-pointer min-h-[44px]"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-fg-muted" />
                    {t('ai.chat.advancedSettingsBtn', 'Advanced Provider Settings')}
                  </button>
                </div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* Minimalist Empty State with 2x2 Clean Starter Cards */
            <div className="h-full flex flex-col justify-center items-center py-6 px-2 text-center space-y-6">
              <div className="space-y-2 max-w-sm">
                <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto text-accent mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-fg tracking-tight">
                  {t('ai.chat.emptyStateTitle', 'How can I audit your portfolio today?')}
                </h3>
                <p className="text-xs text-fg-muted leading-relaxed">
                  {t('ai.chat.emptyStateDesc', 'Query consolidated balances, liquidation risks, hedge imbalance, and historical fees with mathematical precision.')}
                </p>
              </div>

              <div className="w-full pt-2">
                <AiQuickActionChips onSelectPrompt={(prompt) => handleSendMessage(prompt)} disabled={isThinking} />
              </div>
            </div>
          ) : (
            /* Active Message History */
            <>
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 text-xs ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`rounded-2xl p-3.5 shadow-sm leading-relaxed ${
                        isMaximized ? (isUser ? 'max-w-[70%]' : 'max-w-[95%] w-full') : 'max-w-[85%]'
                      } ${
                        isUser
                          ? 'bg-accent text-white rounded-tr-none'
                          : msg.status === 'cancelled'
                          ? 'bg-warning/5 border border-warning/30 text-fg rounded-tl-none'
                          : msg.status === 'error'
                          ? 'bg-danger/5 border border-danger/30 text-fg rounded-tl-none'
                          : msg.incompatibleToolModel
                          ? 'bg-danger/5 border border-danger/50 text-fg rounded-tl-none'
                          : msg.unverifiedData
                          ? 'bg-warning/5 border border-warning/40 text-fg rounded-tl-none'
                          : 'bg-surface border border-line text-fg rounded-tl-none'
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : msg.status === 'thinking' && !msg.content ? (
                        <div className="flex items-center gap-2 text-accent py-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-[11px]">{t('ai.chat.auditingMetrics', 'Auditing local application metrics...')}</span>
                        </div>
                      ) : msg.status === 'cancelled' ? (
                        <AiCancelledMessageCard
                          message={msg.content}
                          onRetry={() => {
                            const lastUser = [...messages]
                              .reverse()
                              .find((m) => m.role === 'user');
                            if (lastUser) handleSendMessage(lastUser.content);
                          }}
                          onOpenRawDebug={msg.rawDebug || msg.auditLogId ? () => openDebugForMessage(msg) : undefined}
                        />
                      ) : msg.status === 'error' ? (
                        <AiErrorMessageCard
                          message={msg.content}
                          technicalDetails={msg.errorMessage}
                          onRetry={() => {
                            const lastUser = [...messages]
                              .reverse()
                              .find((m) => m.role === 'user');
                            if (lastUser) handleSendMessage(lastUser.content);
                          }}
                          onOpenSettings={() => {
                            closeDrawer();
                            if (onNavigateToSettings) onNavigateToSettings();
                          }}
                        />
                      ) : (
                        <div className="space-y-2">
                          {/* Block Banner for Incompatible Model */}
                          {msg.incompatibleToolModel && (
                            <div className="mb-3 p-3.5 rounded-xl bg-danger/10 border-l-4 border-l-danger border border-danger/30 text-fg space-y-2">
                              <div className="flex items-center gap-2 text-danger font-semibold text-xs">
                                <ShieldAlert className="w-4 h-4 text-danger shrink-0" />
                                <span>{t('ai.chat.queryGuardedTitle', 'Query Guarded: Tools Not Invoked')}</span>
                              </div>
                              <p className="text-[11px] text-fg-muted leading-relaxed">
                                {msg.auditWarning ||
                                  t('ai.chat.queryGuardedDesc', 'The model did not invoke exchange tools in Ollama. Unverified responses were blocked to protect your operations.')}
                              </p>
                              <div className="pt-1 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    closeDrawer();
                                    if (onNavigateToSettings) onNavigateToSettings();
                                    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'ai-settings' }));
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-danger/15 hover:bg-danger/25 text-danger border border-danger/40 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <SettingsIcon className="w-3.5 h-3.5" />
                                  <span>{t('ai.chat.switchCompatibleModelBtn', 'Switch to Tool-Compatible Model (gpt-oss, qwen2.5, llama3.1)')}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Highlight Alert Banner at the Top of Response */}
                          {msg.unverifiedData && !msg.incompatibleToolModel && (
                            <div className="mb-3 p-3 rounded-xl bg-warning/10 border-l-4 border-l-warning border border-warning/30 text-fg space-y-1">
                              <div className="flex items-center gap-2 text-warning font-semibold text-xs">
                                <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                                <span>{t('ai.chat.unverifiedBannerTitle', 'WARNING: Response Generated Without Exchange Tool Verification')}</span>
                              </div>
                              <p className="text-[11px] text-fg-muted leading-relaxed">
                                {msg.auditWarning ||
                                  t('ai.chat.unverifiedBannerDesc', 'This response was generated without verifying live data through exchange tools. Account balance, positions, or fee metrics may be inaccurate or hallucinated.')}
                              </p>
                            </div>
                          )}

                          <AiMarkdownRenderer content={msg.content} />

                          {/* Footer with Tool badges and Inspector trigger */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60 text-[10px] text-fg-muted">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {msg.usedModelName && (
                                <span className="font-mono text-fg-muted">
                                  {msg.usedModelName}
                                  {msg.wasFallback && (
                                    <span className="text-warning ml-1">({t('ai.chat.fallbackLower', 'fallback')})</span>
                                  )}
                                </span>
                              )}
                              {msg.toolsInvoked && msg.toolsInvoked.length > 0 ? (
                                <span className="px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/30 flex items-center gap-1 font-mono">
                                  <CheckCircle2 className="w-3 h-3 text-success" />
                                  <span>
                                    {msg.toolsInvoked.length === 1
                                      ? t('ai.chat.toolVerifiedSingular', '{{count}} tool verified', { count: msg.toolsInvoked.length })
                                      : t('ai.chat.toolVerifiedPlural', '{{count}} tools verified', { count: msg.toolsInvoked.length })}
                                  </span>
                                </span>
                              ) : msg.unverifiedData ? (
                                <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/30 flex items-center gap-1 font-mono">
                                  <AlertTriangle className="w-3 h-3 text-warning" />
                                  <span>{t('ai.chat.noToolsTag', 'No tools')}</span>
                                </span>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  exportAiAnalysisToPdf({
                                    title: t('ai.chat.pdfReportTitle', 'PIKA Quantitative Portfolio Analysis'),
                                    markdownContent: msg.content,
                                    modelName: msg.usedModelName,
                                    timestamp: new Date(msg.timestamp).toLocaleString(i18n.language),
                                    toolsInvoked: msg.toolsInvoked?.map((toolItem) => toolItem.name),
                                  })
                                }
                                className="text-fg-muted hover:text-fg cursor-pointer flex items-center gap-1 font-mono text-[10px] transition"
                                title={t('ai.chat.tooltips.downloadPdf', 'Download complete analysis as PDF report')}
                              >
                                <FileText className="w-3 h-3 text-accent" />
                                <span>{t('ai.chat.exportPdf', 'Export PDF')}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openDebugForMessage(msg)}
                                className="text-accent hover:underline cursor-pointer flex items-center gap-1 font-mono text-[10px]"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                <span>{t('ai.cancelled.inspectAudit', 'Inspect Audit')}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Active Tools in Flight */}
              {isThinking && activeTools.length > 0 && (
                <div className="flex flex-col gap-1 pl-8">
                  {activeTools.map((tool, idx) => (
                    <AiToolCallBadge key={idx} toolName={tool} />
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
          </div>
        </div>

        {/* Footer Input Area */}
        {!isVaultActive ? (
          <footer className="p-3.5 border-t border-line bg-surface shrink-0 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-fg-muted">
              <Lock className="w-3.5 h-3.5 text-warning" />
              <span>{t('ai.chat.footerVaultRequired', 'Security Vault must be activated to enable PIKA AI chat.')}</span>
            </div>
          </footer>
        ) : !isUnlocked && encryptedData ? (
          <footer className="p-3.5 border-t border-line bg-surface shrink-0 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-fg-muted">
              <Lock className="w-3.5 h-3.5 text-warning" />
              <span>{t('ai.chat.footerVaultLocked', 'Security Vault is locked. Enter master passphrase to send messages.')}</span>
            </div>
          </footer>
        ) : isEnabled && (
          <footer className="p-3.5 border-t border-line bg-surface shrink-0">
            <div className={isMaximized ? 'w-full px-2 xl:px-8 2xl:px-16' : ''}>
              <div className="relative rounded-xl bg-canvas border border-line focus-within:border-accent transition shadow-inner">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('ai.chat.inputPlaceholder', 'Ask about balances, positions, hedge, or fees...')}
                disabled={isThinking}
                className="w-full bg-transparent px-3 py-2 text-xs text-fg placeholder-fg-muted focus:outline-none resize-none pr-10"
              />

              {isThinking ? (
                <AppTooltip description={t('ai.chat.tooltips.stop', 'Stop request (Esc)')} side="top">
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center bg-danger hover:bg-danger/90 active:scale-95 text-white rounded-lg transition shadow-md cursor-pointer animate-pulse"
                    aria-label={t('ai.chat.tooltips.stop', 'Stop request (Esc)')}
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                </AppTooltip>
              ) : (
                <AppTooltip description={t('ai.chat.tooltips.send', 'Send message (Enter)')} side="top">
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim()}
                    className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center bg-accent hover:bg-accent-hover active:scale-95 disabled:bg-elevated text-white disabled:text-fg-muted rounded-lg transition shadow-md cursor-pointer disabled:cursor-not-allowed"
                    aria-label={t('ai.chat.tooltips.send', 'Send message (Enter)')}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </AppTooltip>
              )}
            </div>

            {/* Disclaimer & Shortcuts */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-warning bg-warning/10 border border-warning/20 px-2.5 py-1 rounded-lg mt-2 text-center">
              <AlertCircle className="w-3 h-3 shrink-0 text-warning" />
              <span>{t('ai.chat.disclaimer', 'AI Agent can make mistakes. Please check important numbers.')}</span>
            </div>

            <div className="flex items-center justify-between text-[9px] text-fg-muted mt-1.5 px-0.5">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-success" />
                {t('ai.chat.readOnlyFooter', 'Read-Only • Zero orders executed')}
              </span>
              <span className="hidden sm:inline">{t('ai.chat.shortcutsFooter', 'Enter to send • Esc to stop • Shift+Enter new line')}</span>
            </div>
            </div>
          </footer>
        )}

        {/* Detailed Debug Modal (inspects raw prompt, tools & response for any message) */}
        {showDebugModal && (
          <AiAuditDetailsModal
            log={debugLogEntry}
            rawDebug={debugRawData || undefined}
            onClose={() => {
              setShowDebugModal(false);
              setDebugLogEntry(null);
              setDebugRawData(null);
            }}
          />
        )}

        {/* Full Audit Logs Modal */}
        {showAuditTableModal && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-5xl bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-accent" />
                  <div>
                    <h3 className="text-sm font-bold text-fg">{t('ai.chat.auditCenterTitle', 'AI Audit & Telemetry Center')}</h3>
                    <p className="text-xs text-fg-muted">{t('ai.chat.auditCenterSubtitle', 'Inspection of invocations, raw prompts, and token consumption')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuditTableModal(false)}
                  className="p-2 text-fg-muted hover:text-fg rounded-lg hover:bg-elevated transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={t('common.close', 'Close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 bg-canvas">
                <AiAuditLogTable />
              </div>
            </div>
          </div>
        )}

        {/* Vault Setup Modal when invoked from locked drawer */}
        <VaultSetupModal
          isOpen={isVaultSetupModalOpen}
          onClose={() => setIsVaultSetupModalOpen(false)}
          reason={t('ai.chat.vaultSetupReason', 'The PIKA AI Assistant requires an active security vault before auditing financial metrics or connections.')}
        />
      </aside>
    </>
  );
};
