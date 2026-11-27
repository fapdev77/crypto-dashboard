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
  capabilities?: string[];
  supportsTools?: boolean;
  parameterSize?: string;
  family?: string;
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
    // 1. Direct browser fetch for local Ollama instances
    if (provider === 'ollama') {
      const cleanUrl = (baseUrl || 'http://localhost:11434').trim().replace(/\/+$/, '');
      const directEndpoint = cleanUrl.endsWith('/api/tags') ? cleanUrl : `${cleanUrl}/api/tags`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const directRes = await fetch(directEndpoint, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (directRes.ok) {
          const data = await directRes.json();
          const directModels: DiscoveredModel[] = (data.models || []).map((m: any) => {
            const capabilities: string[] = Array.isArray(m.capabilities) ? m.capabilities : [];
            const hasTools = capabilities.length > 0 ? capabilities.includes('tools') : undefined;
            const paramSize = m.details?.parameter_size;
            const family = m.details?.family || (Array.isArray(m.details?.families) ? m.details.families[0] : undefined);
            const sizeGb = Math.round((m.size || 0) / (1024 * 1024 * 1024) * 10) / 10;
            return {
              id: m.name,
              name: m.name,
              displayName: paramSize ? `${m.name} (${paramSize})` : m.name,
              description: `Size: ${sizeGb} GB${paramSize ? ` • Params: ${paramSize}` : ''}${family ? ` • Family: ${family}` : ''}`,
              capabilities,
              supportsTools: hasTools,
              parameterSize: paramSize,
              family,
            };
          });

          if (directModels.length > 0) {
            return { success: true, models: directModels };
          }
        }
      } catch {
        // Direct browser fetch failed (e.g. CORS, Mixed Content or remote container) -> fallback to server proxy below
      }
    }

    // 2. Server proxy fallback
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
