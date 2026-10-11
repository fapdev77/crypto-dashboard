import React, { useState, useEffect, useRef } from 'react';
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
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  Square,
  FileText,
} from 'lucide-react';
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
    toast.success(`Chat docked to ${nextSide === 'left' ? 'Left' : 'Right'}`, { icon: '⚓' });
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
      toast.error('PIKA Assistant is disabled. Enable it in "AI Settings".');
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
      });
    } catch (err: any) {
      const isCancelled = err?.name === 'AbortError' || err?.isCancelled || abortController.signal.aborted;

      if (isCancelled) {
        updateMessage(assistantMsgId, {
          content: 'Análise interrompida pelo usuário.',
          status: 'cancelled',
          errorMessage: 'Operação cancelada pelo usuário.',
          auditLogId: err?.auditLogId,
          rawDebug: err?.rawDebug,
        });
        toast('Análise interrompida', { icon: '⏹️' });
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
    toast.success('New conversation started', { icon: '✨' });
  };

  const confirmClearChat = () => {
    clearMessages();
    setShowClearConfirm(false);
    setIsMenuOpen(false);
    toast.success('Chat history cleared', { icon: '🧹' });
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
        className={`fixed z-50 bg-[#151619] shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? 'inset-0 w-full h-full border-none rounded-none'
            : dockSide === 'left'
            ? 'inset-0 md:left-0 md:right-auto md:top-0 md:bottom-0 md:w-[480px] lg:w-[540px] md:border-r border-[#2a2b30] animate-in slide-in-from-left duration-200'
            : 'inset-0 md:left-auto md:right-0 md:top-0 md:bottom-0 md:w-[480px] lg:w-[540px] md:border-l border-[#2a2b30] animate-in slide-in-from-right duration-200'
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
            <div className="bg-[#151619] border border-[#2a2b30] rounded-2xl p-5 max-w-xs w-full text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Clear Conversation?</h3>
                <p className="text-xs text-[#8E9299] mt-1">
                  Are you sure you want to delete all messages in this conversation? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 bg-[#1e1f24] hover:bg-[#2a2b30] text-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer border border-[#2a2b30] min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmClearChat}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer min-h-[44px]"
                >
                  Yes, Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Streamlined Header: Brand, Model Badge & Consolidated Action Cluster */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#2a2b30] bg-[#151619] shrink-0 min-h-[56px]">
          {/* Zone 1: Brand & Model Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-[#2F6BFF]/10 border border-[#2F6BFF]/25 rounded-xl text-[#2F6BFF] shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight truncate">PIKA Assistant</h2>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#2F6BFF]/10 text-[#2F6BFF] border border-[#2F6BFF]/20 uppercase">
                  AI Auditor
                </span>
              </div>
              <div className="text-[10px] text-[#8E9299] flex items-center gap-1.5 truncate">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isEnabled ? (primaryModel ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400') : 'bg-gray-600'
                  }`}
                />
                <span className="truncate">
                  {isEnabled
                    ? primaryModel
                      ? `${primaryModel.name}`
                      : 'No active model'
                    : 'Disabled by default'}
                </span>
              </div>
            </div>
          </div>

          {/* Zone 2: Direct Primary Actions + 3-Dots Kebab Menu + Close */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Direct New Conversation Button */}
            <AppTooltip description="New conversation" side="bottom">
              <button
                type="button"
                onClick={handleNewConversation}
                className="w-9 h-9 flex items-center justify-center text-[#8E9299] hover:text-[#2F6BFF] rounded-lg hover:bg-[#202127] border border-[#2a2b30] transition cursor-pointer"
                aria-label="New conversation"
              >
                <Plus className="w-4 h-4" />
              </button>
            </AppTooltip>

            {/* Direct Full-Screen Maximize / Restore Button */}
            <AppTooltip description={isMaximized ? "Restore to dock" : "Expand to full screen"} side="bottom">
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg border transition cursor-pointer ${
                  isMaximized
                    ? 'text-[#2F6BFF] bg-[#2F6BFF]/15 border-[#2F6BFF]/40'
                    : 'text-[#8E9299] hover:text-[#2F6BFF] hover:bg-[#202127] border-[#2a2b30]'
                }`}
                aria-label={isMaximized ? "Restore to dock" : "Expand to full screen"}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </AppTooltip>

            {/* 3-Dots Kebab Menu Dropdown */}
            <div className="relative" ref={menuRef}>
              <AppTooltip description="More options" side="bottom">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border transition cursor-pointer ${
                    isMenuOpen
                      ? 'text-[#2F6BFF] bg-[#2F6BFF]/15 border-[#2F6BFF]/40'
                      : 'text-[#8E9299] hover:text-white hover:bg-[#202127] border-[#2a2b30]'
                  }`}
                  aria-label="More options"
                  aria-expanded={isMenuOpen}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </AppTooltip>

              {/* Popover Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-[#18191e] border border-[#2a2b30] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                  {/* Full-Screen Toggle Shortcut */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsMaximized(!isMaximized);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-gray-200 hover:text-white hover:bg-[#23242b] transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {isMaximized ? (
                        <Minimize2 className="w-4 h-4 text-[#2F6BFF]" />
                      ) : (
                        <Maximize2 className="w-4 h-4 text-[#8E9299]" />
                      )}
                      <span>{isMaximized ? 'Restore to Dock' : 'Expand to Full Screen'}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2b30] text-[#A0A4AB] font-mono">
                      {isMaximized ? 'Restore' : 'Full'}
                    </span>
                  </button>

                  {/* Dock Side Switcher (Left vs Right) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      toggleDockSide();
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-gray-200 hover:text-white hover:bg-[#23242b] transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {dockSide === 'right' ? (
                        <PanelLeft className="w-4 h-4 text-[#8E9299]" />
                      ) : (
                        <PanelRight className="w-4 h-4 text-[#8E9299]" />
                      )}
                      <span>{dockSide === 'right' ? 'Dock to Left' : 'Dock to Right'}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2F6BFF]/15 text-[#2F6BFF] font-semibold uppercase">
                      {dockSide}
                    </span>
                  </button>

                  {/* Divider */}
                  <div className="my-1 border-t border-[#2a2b30]/70" />

                  {/* Chat History Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsHistoryOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-gray-200 hover:text-white hover:bg-[#23242b] transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <History className="w-4 h-4 text-[#8E9299]" />
                      <span>Chat History</span>
                    </div>
                    {sessionCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2a2b30] text-[#A0A4AB] font-mono">
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
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-200 hover:text-white hover:bg-[#23242b] transition cursor-pointer text-left"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#8E9299]" />
                    <span>Audit Logs & Telemetry</span>
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
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-200 hover:text-white hover:bg-[#23242b] transition cursor-pointer text-left"
                  >
                    <SettingsIcon className="w-4 h-4 text-[#8E9299]" />
                    <span>AI Settings</span>
                  </button>

                  {/* Divider */}
                  <div className="my-1 border-t border-[#2a2b30]/70" />

                  {/* Clear Chat Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowClearConfirm(true);
                    }}
                    disabled={messages.length === 0}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Clear Conversation</span>
                  </button>
                </div>
              )}
            </div>

            {/* Close Drawer Button */}
            <AppTooltip description="Close Assistant (Ctrl+J)" side="bottom">
              <button
                type="button"
                onClick={closeDrawer}
                className="w-9 h-9 flex items-center justify-center text-[#8E9299] hover:text-rose-400 rounded-lg hover:bg-[#202127] border border-[#2a2b30] transition cursor-pointer"
                aria-label="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </AppTooltip>
          </div>
        </header>

        {/* Optional Active Session Banner */}
        {currentSession && currentSession.title !== 'New Conversation' && (
          <div className="px-4 py-1.5 bg-[#101114] border-b border-[#2a2b30] flex items-center justify-between text-[11px] text-[#8E9299] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="w-3.5 h-3.5 text-[#2F6BFF] shrink-0" />
              <span className={`text-gray-300 font-medium truncate ${isMaximized ? 'max-w-2xl' : 'max-w-[280px]'}`}>
                {currentSession.title}
              </span>
            </div>
            <span className="font-mono text-[10px] text-[#8E9299] shrink-0">
              {messages.length} msgs
            </span>
          </div>
        )}

        {/* Scrollable Message List / Zero State */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 bg-[#0b0c10] ${isMaximized ? 'w-full' : ''}`}>
          <div className={isMaximized ? 'max-w-7xl mx-auto w-full space-y-4' : 'space-y-4'}>
          {!isEnabled ? (
            /* First-Access 1-Click Activation Card */
            <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-4">
              <div className="p-6 bg-gradient-to-b from-[#181a20] to-[#121316] border border-[#2a2b30] rounded-2xl text-gray-300 max-w-md shadow-2xl space-y-4">
                <div className="w-14 h-14 bg-[#2F6BFF]/10 border border-[#2F6BFF]/30 rounded-2xl flex items-center justify-center mx-auto text-[#2F6BFF] shadow-inner">
                  <Sparkles className="w-7 h-7 text-[#2F6BFF] animate-pulse" />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 mb-2 text-[10px] font-bold uppercase tracking-wider bg-[#2F6BFF]/20 text-[#2F6BFF] rounded-full border border-[#2F6BFF]/30">
                    PIKA v2.0 • AI Auditor
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Would you like to enable the PIKA assistant with 1 click?
                  </h3>
                  <p className="text-xs text-[#8E9299] mt-2 leading-relaxed">
                    For strict zero-trust security and privacy, the assistant is disabled by default.
                    Activate instantly to audit consolidated balances, liquidation risks, hedge correlation, and history with mathematical precision.
                  </p>
                </div>

                <div className="bg-[#151619] p-3.5 rounded-xl border border-[#2a2b30]/60 text-left text-[11px] text-[#A0A4AB] space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-medium text-xs mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    Privacy & Security Guaranteed
                  </div>
                  <p>• Your API keys and secrets are never transmitted to the model.</p>
                  <p>• Privacy Mode masks nominal balances with percentage allocations.</p>
                  <p>• Supports local Ollama (100% private) or Google Gemini Cloud.</p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEnabled(true)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#2F6BFF] hover:bg-[#2F6BFF]/85 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#2F6BFF]/25 transition cursor-pointer min-h-[44px]"
                  >
                    <Sparkles className="w-4 h-4" />
                    Enable PIKA Assistant Now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeDrawer();
                      if (onNavigateToSettings) onNavigateToSettings();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#202127] hover:bg-[#2a2b30] text-gray-300 rounded-xl text-xs font-semibold border border-[#2a2b30] transition cursor-pointer min-h-[44px]"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-gray-400" />
                    Advanced Provider Settings
                  </button>
                </div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* Minimalist Empty State with 2x2 Clean Starter Cards */
            <div className="h-full flex flex-col justify-center items-center py-6 px-2 text-center space-y-6">
              <div className="space-y-2 max-w-sm">
                <div className="w-12 h-12 bg-[#2F6BFF]/10 border border-[#2F6BFF]/20 rounded-2xl flex items-center justify-center mx-auto text-[#2F6BFF] mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  How can I audit your portfolio today?
                </h3>
                <p className="text-xs text-[#8E9299] leading-relaxed">
                  Query consolidated balances, liquidation risks, hedge imbalance, and historical fees with mathematical precision.
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
                      <div className="w-6 h-6 rounded-lg bg-[#2F6BFF]/10 border border-[#2F6BFF]/20 flex items-center justify-center text-[#2F6BFF] shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`rounded-2xl p-3.5 shadow-sm leading-relaxed ${
                        isMaximized ? (isUser ? 'max-w-[70%]' : 'max-w-[95%] w-full') : 'max-w-[85%]'
                      } ${
                        isUser
                          ? 'bg-[#2F6BFF] text-white rounded-tr-none'
                          : msg.status === 'cancelled'
                          ? 'bg-[#181613] border border-amber-500/30 text-gray-200 rounded-tl-none'
                          : msg.status === 'error'
                          ? 'bg-[#181215] border border-rose-900/40 text-gray-200 rounded-tl-none'
                          : 'bg-[#151619] border border-[#2a2b30] text-gray-200 rounded-tl-none'
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : msg.status === 'thinking' && !msg.content ? (
                        <div className="flex items-center gap-2 text-[#2F6BFF] py-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-[11px]">Auditing local application metrics...</span>
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
                          <AiMarkdownRenderer content={msg.content} />

                          {/* Footer with Tool badges and Inspector trigger */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#2a2b30]/60 text-[10px] text-[#8E9299]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {msg.usedModelName && (
                                <span className="font-mono text-[#A0A4AB]">
                                  {msg.usedModelName}
                                  {msg.wasFallback && (
                                    <span className="text-amber-400 ml-1">(fallback)</span>
                                  )}
                                </span>
                              )}
                              {msg.toolsInvoked && msg.toolsInvoked.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-[#1e1f24] text-[#A0A4AB] border border-[#2a2b30]">
                                  {msg.toolsInvoked.length} {msg.toolsInvoked.length === 1 ? 'tool' : 'tools'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  exportAiAnalysisToPdf({
                                    title: 'PIKA Quantitative Portfolio Analysis',
                                    markdownContent: msg.content,
                                    modelName: msg.usedModelName,
                                    timestamp: new Date(msg.timestamp).toLocaleString(),
                                    toolsInvoked: msg.toolsInvoked?.map((t) => t.name),
                                  })
                                }
                                className="text-gray-400 hover:text-white cursor-pointer flex items-center gap-1 font-mono text-[10px] transition"
                                title="Download complete analysis as PDF report"
                              >
                                <FileText className="w-3 h-3 text-[#2F6BFF]" />
                                <span>Export PDF</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openDebugForMessage(msg)}
                                className="text-[#2F6BFF] hover:underline cursor-pointer flex items-center gap-1 font-mono text-[10px]"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                <span>Inspect Audit</span>
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
        {isEnabled && (
          <footer className="p-3.5 border-t border-[#2a2b30] bg-[#151619] shrink-0">
            <div className={isMaximized ? 'max-w-7xl mx-auto w-full' : ''}>
              <div className="relative rounded-xl bg-[#0b0c10] border border-[#2a2b30] focus-within:border-[#2F6BFF] transition shadow-inner">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about balances, positions, hedge, or fees..."
                disabled={isThinking}
                className="w-full bg-transparent px-3 py-2 text-xs text-white placeholder-[#8E9299] focus:outline-none resize-none pr-10"
              />

              {isThinking ? (
                <AppTooltip description="Parar requisição (Esc)" side="top">
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-lg transition shadow-md cursor-pointer animate-pulse"
                    aria-label="Parar requisição (Esc)"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                </AppTooltip>
              ) : (
                <AppTooltip description="Enviar mensagem (Enter)" side="top">
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim()}
                    className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center bg-[#2F6BFF] hover:bg-[#2F6BFF]/80 active:scale-95 disabled:bg-[#1e1f24] text-white disabled:text-[#8E9299] rounded-lg transition shadow-md cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Enviar mensagem"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </AppTooltip>
              )}
            </div>

            {/* Disclaimer & Shortcuts */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg mt-2 text-center">
              <AlertCircle className="w-3 h-3 shrink-0 text-amber-400" />
              <span>AI Agent can make mistakes. Please check important numbers.</span>
            </div>

            <div className="flex items-center justify-between text-[9px] text-[#8E9299] mt-1.5 px-0.5">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                Read-Only • Zero orders executed
              </span>
              <span className="hidden sm:inline">Enter to send • Esc to stop • Shift+Enter new line</span>
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
            <div className="relative w-full max-w-5xl bg-[#151619] border border-[#2a2b30] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2b30] bg-[#16171b]">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#2F6BFF]" />
                  <div>
                    <h3 className="text-sm font-bold text-white">AI Audit & Telemetry Center</h3>
                    <p className="text-xs text-[#8E9299]">Inspection of invocations, raw prompts, and token consumption</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuditTableModal(false)}
                  className="p-2 text-[#8E9299] hover:text-white rounded-lg hover:bg-[#1e1f24] transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 bg-[#0b0c10]">
                <AiAuditLogTable />
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
