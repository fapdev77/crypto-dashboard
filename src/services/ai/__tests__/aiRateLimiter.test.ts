import { describe, it, expect, beforeEach } from 'vitest';
import { aiRateLimiter } from '../aiRateLimiter';
import { AiModelConfig } from '../../../types/aiTypes';

describe('aiRateLimiter', () => {
  beforeEach(() => {
    aiRateLimiter.resetRateLimits();
  });

  const mockModel: AiModelConfig = {
    id: 'test-model',
    name: 'Test Model',
    provider: 'gemini',
    modelId: 'gemini-1.5-flash',
    isActive: true,
    isPrimary: true,
    isFallback: false,
    temperature: 0.1,
    topP: 0.95,
    maxTokens: 2048,
    maxRpm: 3, // only 3 per minute
    maxRpd: 10,
  };

  it('allows requests within RPM limit', () => {
    expect(aiRateLimiter.checkRateLimit(mockModel).allowed).toBe(true);
    aiRateLimiter.recordRequest(mockModel.id);

    expect(aiRateLimiter.checkRateLimit(mockModel).allowed).toBe(true);
    aiRateLimiter.recordRequest(mockModel.id);

    expect(aiRateLimiter.checkRateLimit(mockModel).allowed).toBe(true);
    aiRateLimiter.recordRequest(mockModel.id);

    // 4th request exceeds maxRpm of 3
    const check = aiRateLimiter.checkRateLimit(mockModel);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('RPM');
  });

  it('allows unlimited requests if maxRpm and maxRpd are 0', () => {
    const unlimitedModel: AiModelConfig = {
      ...mockModel,
      id: 'unlimited-model',
      maxRpm: 0,
      maxRpd: 0,
    };

    for (let i = 0; i < 20; i++) {
      expect(aiRateLimiter.checkRateLimit(unlimitedModel).allowed).toBe(true);
      aiRateLimiter.recordRequest(unlimitedModel.id);
    }
  });

  it('blocks requests when RPD is exceeded', () => {
    const rpdModel: AiModelConfig = {
      ...mockModel,
      id: 'rpd-model',
      maxRpm: 0, // no RPM limit
      maxRpd: 2, // only 2 per day
    };

    expect(aiRateLimiter.checkRateLimit(rpdModel).allowed).toBe(true);
    aiRateLimiter.recordRequest(rpdModel.id);

    expect(aiRateLimiter.checkRateLimit(rpdModel).allowed).toBe(true);
    aiRateLimiter.recordRequest(rpdModel.id);

    // 3rd request should exceed RPD
    const check = aiRateLimiter.checkRateLimit(rpdModel);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('RPD');
  });
});
