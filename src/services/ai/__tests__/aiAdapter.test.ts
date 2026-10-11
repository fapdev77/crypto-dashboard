import { describe, it, expect, beforeEach, vi } from 'vitest';
import { aiAdapter } from '../aiAdapter';
import { useAiSettingsStore } from '../../../store/aiSettingsStore';
import { aiToolRegistry } from '../aiToolRegistry';

describe('aiAdapter', () => {
  beforeEach(() => {
    useAiSettingsStore.getState().resetToDefaults();
  });

  it('rejects execution when AI is globally disabled', async () => {
    useAiSettingsStore.getState().setIsEnabled(false);

    await expect(
      aiAdapter.sendMessage({
        userMessage: 'What is my balance?',
      })
    ).rejects.toThrow(/disabled|desabilitado/i);
  });

  it('resolves primary and fallback models from settings', () => {
    const primary = aiAdapter.getPrimaryActiveModel();
    expect(primary).toBeDefined();
    expect(primary?.isPrimary).toBe(true);

    const fallbacks = aiAdapter.getFallbackModels();
    expect(fallbacks.length).toBeGreaterThan(0);
    expect(fallbacks[0].isFallback).toBe(true);
  });

  it('immediately cancels request when signal is already aborted', async () => {
    useAiSettingsStore.getState().setIsEnabled(true);
    const controller = new AbortController();
    controller.abort();

    await expect(
      aiAdapter.sendMessage({
        userMessage: 'Test prompt',
        signal: controller.signal,
      })
    ).rejects.toThrow(/interrompida|cancelada|aborted/i);
  });

  describe('Ollama endpoint resolution and model compatibility', () => {
    it('properly resolves Ollama /api/chat endpoint from various baseUrl formats', async () => {
      const { getOllamaChatEndpoint } = await import('../aiAdapter');

      expect(getOllamaChatEndpoint('http://localhost:11434')).toBe('http://localhost:11434/api/chat');
      expect(getOllamaChatEndpoint('http://192.168.1.50:11434/api/chat')).toBe('http://192.168.1.50:11434/api/chat');
      expect(getOllamaChatEndpoint('http://192.168.1.50:11434/api/chat/')).toBe('http://192.168.1.50:11434/api/chat');
      expect(getOllamaChatEndpoint('http://192.168.1.50:11434/api')).toBe('http://192.168.1.50:11434/api/chat');
      expect(getOllamaChatEndpoint('http://192.168.1.50:11434/v1')).toBe('http://192.168.1.50:11434/api/chat');
      expect(getOllamaChatEndpoint('http://192.168.1.50:11434/v1/chat/completions')).toBe('http://192.168.1.50:11434/api/chat');
      expect(getOllamaChatEndpoint('')).toBe('http://localhost:11434/api/chat');
    });

    it('correctly identifies gpt-oss:20b as tool-compatible and deepseek-r1 as incompatible', async () => {
      const { isModelKnownIncompatibleWithTools } = await import('../aiAdapter');

      // gpt-oss:20b supports function calling
      expect(
        isModelKnownIncompatibleWithTools({
          id: 'test-1',
          name: 'GPT-OSS 20B',
          provider: 'ollama',
          modelId: 'gpt-oss:20b',
          isActive: true,
          isPrimary: true,
          isFallback: false,
          temperature: 0.1,
          topP: 0.95,
          maxTokens: 2048,
          maxRpm: 0,
          maxRpd: 0,
        })
      ).toBe(false);

      // deepseek-r1:8b does not support tool templates in Ollama
      expect(
        isModelKnownIncompatibleWithTools({
          id: 'test-2',
          name: 'DeepSeek R1 8B',
          provider: 'ollama',
          modelId: 'deepseek-r1:8b',
          isActive: true,
          isPrimary: true,
          isFallback: false,
          temperature: 0.1,
          topP: 0.95,
          maxTokens: 2048,
          maxRpm: 0,
          maxRpd: 0,
        })
      ).toBe(true);

      // User explicit override: supportsTools = true overrides any name/id defaults
      expect(
        isModelKnownIncompatibleWithTools({
          id: 'test-3',
          name: 'Custom Coder Model',
          provider: 'ollama',
          modelId: 'my-custom-model',
          supportsTools: true,
          isActive: true,
          isPrimary: true,
          isFallback: false,
          temperature: 0.1,
          topP: 0.95,
          maxTokens: 2048,
          maxRpm: 0,
          maxRpd: 0,
        })
      ).toBe(false);
    });

    it('detects operational financial queries requiring tools', async () => {
      const { isOperationalFinancialQuery } = await import('../aiAdapter');

      expect(isOperationalFinancialQuery('Qual o meu saldo na Bybit?')).toBe(true);
      expect(isOperationalFinancialQuery('Quais são minhas posições abertas?')).toBe(true);
      expect(isOperationalFinancialQuery('Quanto paguei de taxa de funding hoje?')).toBe(true);
      expect(isOperationalFinancialQuery('Explique o que é análise técnica')).toBe(false);
    });
  });
});
