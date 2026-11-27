import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AiChatMessage, AiChatSession } from '../types/aiTypes';

interface AiChatState {
  isDrawerOpen: boolean;
  isHistoryOpen: boolean;
  sessions: Record<string, AiChatSession>;
  currentSessionId: string | null;
  messages: AiChatMessage[]; // Reflects currentSessionId messages for seamless backward compatibility
  isThinking: boolean;
  activeTools: string[];
  currentThinkingModel: string | null;

  // Drawer & Sidebar Controls
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  toggleHistory: () => void;
  setIsHistoryOpen: (open: boolean) => void;

  // Session Management
  createSession: (initialTitle?: string) => string;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newTitle: string) => void;
  togglePinSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  getCurrentSession: () => AiChatSession | null;

  // Message Actions (Scoped to Current Session)
  addMessage: (message: Omit<AiChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<AiChatMessage>) => void;
  clearMessages: () => void;

  // Diagnostics & Status
  setIsThinking: (thinking: boolean, modelName?: string | null) => void;
  setActiveTools: (tools: string[]) => void;
  addActiveTool: (tool: string) => void;
  removeActiveTool: (tool: string) => void;
}

const generateSessionId = () => `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

const deriveTitleFromPrompt = (prompt: string): string => {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'New Conversation';
  if (cleaned.length <= 36) return cleaned;
  return cleaned.substring(0, 36) + '...';
};

const createDefaultSession = (): AiChatSession => {
  const id = generateSessionId();
  return {
    id,
    title: 'New Conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    pinned: false,
  };
};

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set, get) => {
      const initialDefaultSession = createDefaultSession();

      return {
        isDrawerOpen: false,
        isHistoryOpen: false,
        sessions: {
          [initialDefaultSession.id]: initialDefaultSession,
        },
        currentSessionId: initialDefaultSession.id,
        messages: [],
        isThinking: false,
        activeTools: [],
        currentThinkingModel: null,

        openDrawer: () => set({ isDrawerOpen: true }),
        closeDrawer: () => set({ isDrawerOpen: false }),
        toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
        toggleHistory: () => set((state) => ({ isHistoryOpen: !state.isHistoryOpen })),
        setIsHistoryOpen: (open) => set({ isHistoryOpen: open }),

        createSession: (initialTitle = 'New Conversation') => {
          const newSessionId = generateSessionId();
          const newSession: AiChatSession = {
            id: newSessionId,
            title: initialTitle,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [],
            pinned: false,
          };

          set((state) => ({
            sessions: {
              ...state.sessions,
              [newSessionId]: newSession,
            },
            currentSessionId: newSessionId,
            messages: [],
            isThinking: false,
            activeTools: [],
          }));

          return newSessionId;
        },

        switchSession: (sessionId: string) => {
          const state = get();
          const targetSession = state.sessions[sessionId];
          if (!targetSession) return;

          set({
            currentSessionId: sessionId,
            messages: targetSession.messages || [],
            isThinking: false,
            activeTools: [],
            isHistoryOpen: false, // auto close sidebar on select
          });
        },

        deleteSession: (sessionId: string) => {
          const state = get();
          const updatedSessions = { ...state.sessions };
          delete updatedSessions[sessionId];

          const remainingKeys = Object.keys(updatedSessions);
          if (remainingKeys.length === 0) {
            // If all deleted, create fresh default session
            const fresh = createDefaultSession();
            set({
              sessions: { [fresh.id]: fresh },
              currentSessionId: fresh.id,
              messages: [],
              isThinking: false,
              activeTools: [],
            });
            return;
          }

          // If current session was deleted, switch to the most recently updated session
          let nextActiveId = state.currentSessionId;
          if (state.currentSessionId === sessionId) {
            const sorted = Object.values(updatedSessions).sort((a, b) => b.updatedAt - a.updatedAt);
            nextActiveId = sorted[0].id;
          }

          set({
            sessions: updatedSessions,
            currentSessionId: nextActiveId,
            messages: (nextActiveId && updatedSessions[nextActiveId]?.messages) || [],
          });
        },

        renameSession: (sessionId: string, newTitle: string) => {
          const trimmed = newTitle.trim();
          if (!trimmed) return;

          set((state) => {
            const target = state.sessions[sessionId];
            if (!target) return state;

            return {
              sessions: {
                ...state.sessions,
                [sessionId]: {
                  ...target,
                  title: trimmed,
                  updatedAt: Date.now(),
                },
              },
            };
          });
        },

        togglePinSession: (sessionId: string) => {
          set((state) => {
            const target = state.sessions[sessionId];
            if (!target) return state;

            return {
              sessions: {
                ...state.sessions,
                [sessionId]: {
                  ...target,
                  pinned: !target.pinned,
                },
              },
            };
          });
        },

        clearAllSessions: () => {
          const fresh = createDefaultSession();
          set({
            sessions: { [fresh.id]: fresh },
            currentSessionId: fresh.id,
            messages: [],
            isThinking: false,
            activeTools: [],
          });
        },

        getCurrentSession: () => {
          const state = get();
          if (!state.currentSessionId) return null;
          return state.sessions[state.currentSessionId] || null;
        },

        addMessage: (msgData) => {
          const state = get();
          let sessionId = state.currentSessionId;
          let session = sessionId ? state.sessions[sessionId] : null;

          // If no active session, create one
          if (!session || !sessionId) {
            const fresh = createDefaultSession();
            sessionId = fresh.id;
            session = fresh;
          }

          const id = generateMessageId();
          const newMessage: AiChatMessage = {
            ...msgData,
            id,
            timestamp: Date.now(),
          };

          const isFirstUserMessage =
            msgData.role === 'user' &&
            (session.messages.length === 0 || session.title === 'New Conversation');

          const newTitle = isFirstUserMessage
            ? deriveTitleFromPrompt(msgData.content)
            : session.title;

          const updatedMessages = [...session.messages, newMessage];
          const updatedSession: AiChatSession = {
            ...session,
            title: newTitle,
            updatedAt: Date.now(),
            messages: updatedMessages,
          };

          set((s) => ({
            sessions: {
              ...s.sessions,
              [sessionId!]: updatedSession,
            },
            currentSessionId: sessionId,
            messages: updatedMessages,
          }));

          return id;
        },

        updateMessage: (id, updates) => {
          set((state) => {
            const sessionId = state.currentSessionId;
            if (!sessionId || !state.sessions[sessionId]) return state;

            const session = state.sessions[sessionId];
            const updatedMessages = session.messages.map((m) =>
              m.id === id ? { ...m, ...updates } : m
            );

            const updatedSession: AiChatSession = {
              ...session,
              updatedAt: Date.now(),
              messages: updatedMessages,
            };

            return {
              sessions: {
                ...state.sessions,
                [sessionId]: updatedSession,
              },
              messages: updatedMessages,
            };
          });
        },

        clearMessages: () => {
          set((state) => {
            const sessionId = state.currentSessionId;
            if (!sessionId || !state.sessions[sessionId]) {
              const fresh = createDefaultSession();
              return {
                sessions: { [fresh.id]: fresh },
                currentSessionId: fresh.id,
                messages: [],
                activeTools: [],
                isThinking: false,
              };
            }

            const session = state.sessions[sessionId];
            const updatedSession: AiChatSession = {
              ...session,
              title: 'New Conversation',
              updatedAt: Date.now(),
              messages: [],
            };

            return {
              sessions: {
                ...state.sessions,
                [sessionId]: updatedSession,
              },
              messages: [],
              activeTools: [],
              isThinking: false,
            };
          });
        },

        setIsThinking: (thinking, modelName = null) =>
          set({
            isThinking: thinking,
            currentThinkingModel: modelName,
            activeTools: thinking ? [] : [],
          }),

        setActiveTools: (tools) => set({ activeTools: tools }),

        addActiveTool: (tool) =>
          set((state) => ({
            activeTools: state.activeTools.includes(tool)
              ? state.activeTools
              : [...state.activeTools, tool],
          })),

        removeActiveTool: (tool) =>
          set((state) => ({
            activeTools: state.activeTools.filter((t) => t !== tool),
          })),
      };
    },
    {
      name: 'pika-ai-chat-multi-history-v2',
      partialize: (state) => {
        // Prune older sessions if exceeding 40 sessions, and prune messages to last 60 per session
        const allSessions = Object.values(state.sessions).sort((a, b) => b.updatedAt - a.updatedAt);
        const keptSessions = allSessions.slice(0, 40);
        const prunedMap: Record<string, AiChatSession> = {};

        keptSessions.forEach((s) => {
          prunedMap[s.id] = {
            ...s,
            messages: s.messages.slice(-60),
          };
        });

        return {
          sessions: prunedMap,
          currentSessionId: state.currentSessionId,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Auto-migration: if sessions map is empty or corrupted, build default
        if (!state.sessions || Object.keys(state.sessions).length === 0) {
          const fallback = createDefaultSession();
          state.sessions = { [fallback.id]: fallback };
          state.currentSessionId = fallback.id;
          state.messages = [];
        } else {
          // Verify currentSessionId is valid
          if (!state.currentSessionId || !state.sessions[state.currentSessionId]) {
            const sorted = Object.values(state.sessions).sort((a, b) => b.updatedAt - a.updatedAt);
            state.currentSessionId = sorted[0]?.id || Object.keys(state.sessions)[0];
          }
          state.messages = (state.currentSessionId && state.sessions[state.currentSessionId]?.messages) || [];
        }
      },
    }
  )
);
