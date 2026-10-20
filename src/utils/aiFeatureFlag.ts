/**
 * Utility to check if the AI Chatbot feature is enabled in the application.
 * Reads environment variables:
 * - AI_CHAT_BOT_ENABLED
 * - VITE_AI_CHAT_BOT_ENABLED
 * 
 * Default is true (enabled). When set to 'false' (case-insensitive), completely
 * disables and hides all AI chatbot buttons, drawers, and AI settings from the application.
 */
export function isAiChatbotFeatureEnabled(): boolean {
  try {
    const vals: any[] = [];

    // Check process.env (Node.js runtime or define variables)
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.AI_CHAT_BOT_ENABLED !== undefined) vals.push(process.env.AI_CHAT_BOT_ENABLED);
      if (process.env.VITE_AI_CHAT_BOT_ENABLED !== undefined) vals.push(process.env.VITE_AI_CHAT_BOT_ENABLED);
    }

    // Check import.meta.env (Vite client-side)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const metaEnv = (import.meta as any).env;
      if (metaEnv.AI_CHAT_BOT_ENABLED !== undefined) vals.push(metaEnv.AI_CHAT_BOT_ENABLED);
      if (metaEnv.VITE_AI_CHAT_BOT_ENABLED !== undefined) vals.push(metaEnv.VITE_AI_CHAT_BOT_ENABLED);
    }

    if (vals.length === 0) {
      return true; // Enabled by default
    }

    // If ANY configured environment variable explicitly disables the bot, respect it
    for (const val of vals) {
      if (val === undefined || val === null || val === '') continue;
      const normalized = String(val).trim().toLowerCase();
      if (
        normalized === 'false' ||
        normalized === '0' ||
        normalized === 'disabled' ||
        normalized === 'off' ||
        normalized === 'no'
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return true;
  }
}
