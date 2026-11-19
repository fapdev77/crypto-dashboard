import { describe, it, expect, beforeEach } from 'vitest';
import { useAiSettingsStore } from '../aiSettingsStore';

describe('aiSettingsStore (Zero-Trust Security & In-Memory Secrets)', () => {
  beforeEach(() => {
    useAiSettingsStore.getState().resetToDefaults();
  });

  it('keeps apiKey in memory when configuring a model', () => {
    const modelId = useAiSettingsStore.getState().addModel({
      name: 'Custom OpenRouter Model',
      provider: 'openrouter',
      modelId: 'anthropic/claude-3.5-sonnet',
      apiKey: 'sk-or-v1-secret-token-12345',
      isActive: true,
      isPrimary: false,
      isFallback: false,
      temperature: 0.1,
      topP: 0.95,
      maxTokens: 2048,
      maxRpm: 0,
      maxRpd: 0,
    });

    const model = useAiSettingsStore.getState().models.find((m) => m.id === modelId);
    expect(model).toBeDefined();
    expect(model?.apiKey).toBe('sk-or-v1-secret-token-12345');
  });

  it('omits apiKey from the persisted storage representation', () => {
    useAiSettingsStore.getState().addModel({
      name: 'Cloud Gemini with Private Key',
      provider: 'gemini',
      modelId: 'gemini-3.8-flash',
      apiKey: 'AIzaSyPrivateGeminiKeySecret',
      isActive: true,
      isPrimary: false,
      isFallback: false,
      temperature: 0.1,
      topP: 0.95,
      maxTokens: 2048,
      maxRpm: 60,
      maxRpd: 1500,
    });

    const storageItem = localStorage.getItem('pika-ai-settings-v1');
    if (storageItem) {
      expect(storageItem).not.toContain('AIzaSyPrivateGeminiKeySecret');
    }
  });
});
