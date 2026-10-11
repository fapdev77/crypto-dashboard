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
});
