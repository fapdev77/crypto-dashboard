import { AiModelConfig, AiProviderType } from '../../types/aiTypes';

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  status?: 'healthy' | 'unreachable' | 'deprecated' | 'quota_exceeded';
  error?: string;
  details?: string;
}

export interface DiscoveredModel {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  isRecommended?: boolean;
}

export const aiConnectionTester = {
  async testModelConnection(model: AiModelConfig): Promise<ConnectionTestResult> {
    const startTime = performance.now();

    try {
      if (model.provider === 'ollama') {
        const baseUrl = (model.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        try {
          const res = await fetch(`${baseUrl}/api/version`, {
            method: 'GET',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const latencyMs = Math.round(performance.now() - startTime);
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            return {
              success: true,
              latencyMs,
              status: 'healthy',
              details: `Connected to local Ollama successfully (Version: ${data.version || 'active'}).`,
            };
          } else {
            return {
              success: false,
              latencyMs,
              status: 'unreachable',
              error: `Ollama responded with HTTP ${res.status}: ${res.statusText}`,
            };
          }
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          return {
            success: false,
            latencyMs: Math.round(performance.now() - startTime),
            status: 'unreachable',
            error: `Could not reach Ollama at ${baseUrl}. Ensure Ollama is running locally ('ollama serve').`,
          };
        }
      }

      if (model.provider === 'gemini') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        try {
          const res = await fetch('/api/ai/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modelId: model.modelId,
              apiKey: model.apiKey,
              provider: 'gemini',
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const latencyMs = Math.round(performance.now() - startTime);
          const data = await res.json().catch(() => ({}));

          if (res.ok && data.success) {
            return {
              success: true,
              latencyMs,
              status: 'healthy',
              details: `Successfully connected to Google Gemini (${model.modelId}).`,
            };
          } else {
            const status: ConnectionTestResult['status'] =
              data.status === 'deprecated' ? 'deprecated' :
              data.status === 'quota_exceeded' ? 'quota_exceeded' : 'unreachable';

            return {
              success: false,
              latencyMs,
              status,
              error: data.error || `Gemini returned HTTP ${res.status}`,
            };
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          return {
            success: false,
            latencyMs: Math.round(performance.now() - startTime),
            status: 'unreachable',
            error: `Failed to test Gemini model connection: ${err.message}`,
          };
        }
      }

      // OpenRouter / OpenAI / Custom
      const baseUrl = (model.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (model.apiKey) {
          headers['Authorization'] = `Bearer ${model.apiKey}`;
        }

        const res = await fetch(`${baseUrl}/models`, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const latencyMs = Math.round(performance.now() - startTime);
        if (res.ok) {
          return {
            success: true,
            latencyMs,
            status: 'healthy',
            details: `Successfully connected to ${model.provider} endpoint (${model.modelId}).`,
          };
        } else {
          return {
            success: false,
            latencyMs,
            status: res.status === 404 ? 'deprecated' : 'unreachable',
            error: `Endpoint returned HTTP ${res.status}: ${res.statusText}`,
          };
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        return {
          success: false,
          latencyMs: Math.round(performance.now() - startTime),
          status: 'unreachable',
          error: `Network failure connecting to ${baseUrl}: ${err.message}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Math.round(performance.now() - startTime),
        status: 'unreachable',
        error: `Unexpected error: ${err.message || 'Test failed'}`,
      };
    }
  },

  async fetchProviderModels(
    provider: AiProviderType,
    apiKey?: string,
    baseUrl?: string
  ): Promise<{ success: boolean; models: DiscoveredModel[]; error?: string }> {
    try {
      const res = await fetch('/api/ai/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, baseUrl }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return {
          success: false,
          models: [],
          error: data.error || `Failed to fetch models (HTTP ${res.status})`,
        };
      }

      return {
        success: true,
        models: data.models || [],
      };
    } catch (err: any) {
      return {
        success: false,
        models: [],
        error: err.message || 'Network error fetching model list',
      };
    }
  },
};
