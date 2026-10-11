import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAiChatbotFeatureEnabled } from '../aiFeatureFlag';

describe('aiFeatureFlag - isAiChatbotFeatureEnabled', () => {
  const originalEnv = process.env.AI_CHAT_BOT_ENABLED;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.AI_CHAT_BOT_ENABLED = originalEnv;
    } else {
      delete process.env.AI_CHAT_BOT_ENABLED;
    }
  });

  it('defaults to true when environment variable is not defined or empty', () => {
    delete process.env.AI_CHAT_BOT_ENABLED;
    expect(isAiChatbotFeatureEnabled()).toBe(true);
  });

  it('returns true when AI_CHAT_BOT_ENABLED is "true"', () => {
    process.env.AI_CHAT_BOT_ENABLED = 'true';
    expect(isAiChatbotFeatureEnabled()).toBe(true);

    process.env.AI_CHAT_BOT_ENABLED = 'True';
    expect(isAiChatbotFeatureEnabled()).toBe(true);
  });

  it('returns false when AI_CHAT_BOT_ENABLED is "false"', () => {
    process.env.AI_CHAT_BOT_ENABLED = 'false';
    expect(isAiChatbotFeatureEnabled()).toBe(false);

    process.env.AI_CHAT_BOT_ENABLED = 'False';
    expect(isAiChatbotFeatureEnabled()).toBe(false);
  });

  it('returns false when AI_CHAT_BOT_ENABLED is "0" or "disabled"', () => {
    process.env.AI_CHAT_BOT_ENABLED = '0';
    expect(isAiChatbotFeatureEnabled()).toBe(false);

    process.env.AI_CHAT_BOT_ENABLED = 'disabled';
    expect(isAiChatbotFeatureEnabled()).toBe(false);
  });
});
