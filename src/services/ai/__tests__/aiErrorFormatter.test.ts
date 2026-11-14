import { describe, it, expect } from 'vitest';
import { formatUserFriendlyAiError } from '../aiErrorFormatter';

describe('formatUserFriendlyAiError', () => {
  it('correctly handles Gemini 503 high demand JSON error string', () => {
    const rawError = 'Could not complete analysis: {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}';
    const result = formatUserFriendlyAiError(rawError);

    expect(result.friendlyMessage).toContain('temporarily unavailable due to high demand');
    expect(result.friendlyMessage).not.toContain('{');
    expect(result.friendlyMessage).not.toContain('UNAVAILABLE');
    expect(result.technicalDetails).toBe(rawError);
    expect(result.isRetryable).toBe(true);
  });

  it('correctly handles 429 resource exhausted / quota error', () => {
    const rawError = '{"error":{"code":429,"message":"Resource has been exhausted (e.g. check quota).","status":"RESOURCE_EXHAUSTED"}}';
    const result = formatUserFriendlyAiError(rawError);

    expect(result.friendlyMessage).toContain('rate limit or quota exceeded');
    expect(result.isRetryable).toBe(true);
  });

  it('correctly handles 404 deprecated / not found model error', () => {
    const rawError = 'Model gemini-1.0-pro was not found or is deprecated';
    const result = formatUserFriendlyAiError(rawError, 404);

    expect(result.friendlyMessage).toContain('deprecated or no longer available');
    expect(result.isRetryable).toBe(false);
  });

  it('correctly handles network fetch error', () => {
    const rawError = new TypeError('Failed to fetch');
    const result = formatUserFriendlyAiError(rawError);

    expect(result.friendlyMessage).toContain('Could not connect to the AI service');
    expect(result.isRetryable).toBe(true);
  });

  it('correctly handles Ollama unreachable error', () => {
    const rawError = 'Could not reach Ollama at http://localhost:11434';
    const result = formatUserFriendlyAiError(rawError);

    expect(result.friendlyMessage).toContain('Could not connect to local Ollama');
  });
});
