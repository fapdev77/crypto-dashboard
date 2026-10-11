import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Download,
  Pin,
  Calendar,
  Clock,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react';
import { useAiChatStore } from '../../store/aiChatStore';
import { AiChatSession } from '../../types/aiTypes';
import { AppTooltip } from '../ui/Tooltip';
import toast from 'react-hot-toast';

interface AiChatHistorySidebarProps {
  onClose: () => void;
}

export const AiChatHistorySidebar: React.FC<AiChatHistorySidebarProps> = ({ onClose }) => {
  const {
    sessions,
    currentSessionId,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    togglePinSession,
    clearAllSessions,
  } = useAiChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const sessionList = useMemo(() => {
    return Object.values(sessions).sort((a, b) => {
      // Pinned sessions always come first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessionList;
    const query = searchQuery.toLowerCase();
    return sessionList.filter((s) => {
      const matchTitle = s.title.toLowerCase().includes(query);
      const matchMessages = s.messages.some((m) => m.content.toLowerCase().includes(query));
      return matchTitle || matchMessages;
    });
  }, [sessionList, searchQuery]);

  // Grouping into date categories
  const groupedSessions = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const yesterdayStart = todayStart - oneDayMs;
    const sevenDaysAgo = todayStart - 6 * oneDayMs;

    const pinned: AiChatSession[] = [];
    const today: AiChatSession[] = [];
    const yesterday: AiChatSession[] = [];
    const last7Days: AiChatSession[] = [];
    const older: AiChatSession[] = [];

    filteredSessions.forEach((s) => {
      if (s.pinned) {
        pinned.push(s);
      } else if (s.updatedAt >= todayStart) {
        today.push(s);
      } else if (s.updatedAt >= yesterdayStart) {
        yesterday.push(s);
      } else if (s.updatedAt >= sevenDaysAgo) {
        last7Days.push(s);
      } else {
        older.push(s);
      }
    });

    return { pinned, today, yesterday, last7Days, older };
  }, [filteredSessions]);

  const handleStartRename = (session: AiChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = (sessionId: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      renameSession(sessionId, editingTitle.trim());
      toast.success('Conversation renamed', { id: 'rename-session' });
    }
    setEditingSessionId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const handleExportSession = (session: AiChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session.messages.length) {
      toast.error('Session has no messages to export');
      return;
    }

    const header = `# PIKA Assistant Audit Export: ${session.title}\n`;
    const meta = `*Date:* ${new Date(session.createdAt).toLocaleString('en-US')}\n*Messages:* ${session.messages.length}\n*Session ID:* ${session.id}\n\n---\n\n`;

    const body = session.messages
      .map((m) => {
        const role = m.role === 'user' ? '👤 **User**' : '🤖 **PIKA Assistant**';
        const time = new Date(m.timestamp).toLocaleTimeString('en-US');
        const tools =
          m.toolsInvoked && m.toolsInvoked.length > 0
            ? `\n\n*Diagnostics Invoked:* ${m.toolsInvoked.map((t) => `\`${t.name}\``).join(', ')}`
            : '';
        return `### ${role} (${time})\n\n${m.content}${tools}\n\n---\n`;
      })
      .join('\n');

    const markdown = header + meta + body;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pika-chat-${session.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Conversation exported to Markdown');
  };

  const handleNewChat = () => {
    createSession('New Conversation');
    onClose();
    toast.success('New conversation started', { icon: '✨' });
  };

  const renderSessionItem = (session: AiChatSession) => {
    const isCurrent = session.id === currentSessionId;
    const isEditing = editingSessionId === session.id;
    const isConfirmingDelete = confirmDeleteId === session.id;

    return (
      <div
        key={session.id}
        onClick={() => {
          if (!isEditing && !isConfirmingDelete) {
            switchSession(session.id);
            onClose();
          }
        }}
        className={`group relative flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer border ${
          isCurrent
            ? 'bg-[#2F6BFF]/15 border-[#2F6BFF]/40 text-white font-medium shadow-sm'
            : 'bg-[#151619] hover:bg-[#1e1f24] border-[#2a2b30] text-[#c9cbcf] hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              isCurrent ? 'bg-[#2F6BFF] ring-2 ring-[#2F6BFF]/30' : 'bg-gray-600 group-hover:bg-gray-400'
            }`}
          />

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(session.id, e);
                    if (e.key === 'Escape') setEditingSessionId(null);
                  }}
                  autoFocus
                  className="w-full bg-[#0b0c10] border border-[#2F6BFF] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                />
                <button
                  onClick={(e) => handleSaveRename(session.id, e)}
                  className="p-1 text-emerald-400 hover:bg-[#2a2b30] rounded"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleCancelRename} className="p-1 text-gray-400 hover:bg-[#2a2b30] rounded">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : isConfirmingDelete ? (
              <div
                className="flex items-center justify-between gap-1 bg-rose-500/10 border border-rose-500/30 rounded p-1"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[10px] text-rose-300 font-semibold truncate">Delete chat?</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                      setConfirmDeleteId(null);
                      toast.success('Conversation deleted');
                    }}
                    className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                  >
                    Yes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(null);
                    }}
                    className="px-1.5 py-0.5 bg-[#2a2b30] hover:bg-[#34373c] text-gray-300 rounded text-[10px]"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="truncate text-xs leading-snug">{session.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-[#8E9299] mt-0.5 font-mono">
                  <span>{session.messages.length} msgs</span>
                  <span>•</span>
                  <span>{new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action icons on hover */}
        {!isEditing && !isConfirmingDelete && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition bg-[#151619] pl-1 rounded">
            <AppTooltip description={session.pinned ? 'Unpin' : 'Pin to top'} side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinSession(session.id);
                }}
                className={`p-1 rounded hover:bg-[#2a2b30] transition cursor-pointer ${
                  session.pinned ? 'text-amber-400' : 'text-[#8E9299] hover:text-white'
                }`}
              >
                <Pin className="w-3 h-3" />
              </button>
            </AppTooltip>

            <AppTooltip description="Export as Markdown" side="top">
              <button
                onClick={(e) => handleExportSession(session, e)}
                className="p-1 text-[#8E9299] hover:text-white rounded hover:bg-[#2a2b30] transition cursor-pointer"
              >
                <Download className="w-3 h-3" />
              </button>
            </AppTooltip>

            <AppTooltip description="Rename" side="top">
              <button
                onClick={(e) => handleStartRename(session, e)}
                className="p-1 text-[#8E9299] hover:text-white rounded hover:bg-[#2a2b30] transition cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </AppTooltip>

            <AppTooltip description="Delete conversation" side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteId(session.id);
                }}
                className="p-1 text-[#8E9299] hover:text-rose-400 rounded hover:bg-[#2a2b30] transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </AppTooltip>
          </div>
        )}
      </div>
    );
  };

  const renderGroup = (label: string, items: AiChatSession[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1.5 mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] px-2 flex items-center gap-1.5">
          {label === 'Pinned' && <Pin className="w-2.5 h-2.5 text-amber-400" />}
          <span>{label}</span>
          <span className="text-[9px] text-[#8E9299] font-normal font-mono">({items.length})</span>
        </div>
        <div className="space-y-1">{items.map(renderSessionItem)}</div>
      </div>
    );
  };

  return (
    <div className="absolute inset-y-0 left-0 w-72 sm:w-80 bg-[#111215] border-r border-[#2a2b30] z-40 flex flex-col shadow-2xl animate-in slide-in-from-left-4 duration-200">
      {/* Header */}
      <div className="p-3 border-b border-[#2a2b30] flex items-center justify-between shrink-0 bg-[#151619]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#2F6BFF]/10 text-[#2F6BFF] rounded-lg border border-[#2F6BFF]/20">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">Chat History</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-[#2a2b30] text-[#8E9299]">
            {sessionList.length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-[#8E9299] hover:text-white rounded-lg hover:bg-[#2a2b30] transition cursor-pointer"
          aria-label="Close history"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Top Action Bar */}
      <div className="p-3 space-y-2 border-b border-[#2a2b30] shrink-0 bg-[#151619]">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#2F6BFF] hover:bg-[#2F6BFF]/85 text-white rounded-xl text-xs font-semibold shadow-md shadow-[#2F6BFF]/20 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E9299]" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0b0c10] border border-[#2a2b30] rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-[#8E9299] focus:outline-none focus:border-[#2F6BFF] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredSessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#8E9299]">
            <Clock className="w-7 h-7 mb-2 text-[#43464d]" />
            <p className="text-xs font-medium text-white mb-0.5">No conversations found</p>
            <p className="text-[11px] max-w-[180px]">
              {searchQuery ? 'Try a different search term.' : 'Click "+ New Chat" to begin a conversation.'}
            </p>
          </div>
        ) : (
          <>
            {renderGroup('Pinned', groupedSessions.pinned)}
            {renderGroup('Today', groupedSessions.today)}
            {renderGroup('Yesterday', groupedSessions.yesterday)}
            {renderGroup('Previous 7 Days', groupedSessions.last7Days)}
            {renderGroup('Older', groupedSessions.older)}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-2.5 border-t border-[#2a2b30] bg-[#151619] shrink-0">
        {confirmClearAll ? (
          <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-2.5 space-y-2 text-center animate-in fade-in-0">
            <p className="text-[11px] font-bold text-rose-300">Clear all chat history?</p>
            <p className="text-[10px] text-[#8E9299]">All conversation threads will be permanently erased.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmClearAll(false)}
                className="flex-1 py-1 text-xs bg-[#1e1f24] hover:bg-[#2a2b30] text-gray-300 rounded font-medium border border-[#2a2b30]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllSessions();
                  setConfirmClearAll(false);
                  toast.success('All conversation history cleared', { icon: '🧹' });
                }}
                className="flex-1 py-1 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClearAll(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-[#8E9299] hover:text-rose-400 hover:bg-[#1e1f24] rounded-lg text-[11px] transition cursor-pointer border border-transparent hover:border-[#2a2b30]"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear All History</span>
          </button>
        )}
      </div>
    </div>
  );
};
