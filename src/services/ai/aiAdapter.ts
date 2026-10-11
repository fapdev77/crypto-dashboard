import { useAiSettingsStore } from '../../store/aiSettingsStore';
import { useAiTelemetryStore } from '../../store/aiTelemetryStore';
import { aiRateLimiter } from './aiRateLimiter';
import { aiToolRegistry } from './aiToolRegistry';
import { aiAuditLogger } from './aiAuditLogger';
import { formatUserFriendlyAiError } from './aiErrorFormatter';
import {
  AiModelConfig,
  AiAuditToolInvocation,
  AiChatMessage,
  AiRawDebugData,
  AiRawDebugToolExecution,
} from '../../types/aiTypes';

export interface SendMessageOptions {
  userMessage: string;
  conversationHistory?: AiChatMessage[];
  onToolInvoking?: (toolName: string) => void;
  preferredModelId?: string;
  signal?: AbortSignal;
}

export interface SendMessageResult {
  answer: string;
  usedModel: AiModelConfig;
  wasFallback: boolean;
  toolsInvoked: AiAuditToolInvocation[];
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  auditLogId: string;
  rawDebug?: AiRawDebugData;
}

class AiAdapter {
  public getPrimaryActiveModel(): AiModelConfig | null {
    const models = useAiSettingsStore.getState().models;
    return models.find((m) => m.isActive && m.isPrimary) || models.find((m) => m.isActive) || null;
  }

  public getFallbackModels(): AiModelConfig[] {
    const models = useAiSettingsStore.getState().models;
    return models
      .filter((m) => m.isActive && m.isFallback)
      .sort((a, b) => (a.fallbackOrder || 1) - (b.fallbackOrder || 1));
  }

  public async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const { userMessage, conversationHistory = [], onToolInvoking, preferredModelId, signal } = options;
    const globalSettings = useAiSettingsStore.getState().globalSettings;

    if (!globalSettings.isEnabled) {
      throw new Error('PIKA Assistant is disabled in settings. Enable it in "AI Settings" to proceed.');
    }

    if (signal?.aborted) {
      const abortErr = new Error('Análise interrompida pelo usuário.');
      abortErr.name = 'AbortError';
      (abortErr as any).isCancelled = true;
      throw abortErr;
    }

    const startTime = performance.now();
    const models = useAiSettingsStore.getState().models;

    let candidateModels: AiModelConfig[] = [];
    if (preferredModelId) {
      const preferred = models.find((m) => m.id === preferredModelId && m.isActive);
      if (preferred) candidateModels.push(preferred);
    }

    const primary = this.getPrimaryActiveModel();
    if (primary && !candidateModels.some((m) => m.id === primary.id)) {
      candidateModels.push(primary);
    }

    if (globalSettings.autoFallback) {
      const fallbacks = this.getFallbackModels();
      for (const fb of fallbacks) {
        if (!candidateModels.some((m) => m.id === fb.id)) {
          candidateModels.push(fb);
        }
      }
    }

    if (candidateModels.length === 0) {
      throw new Error('No active AI models configured. Add or activate a model in "AI Settings".');
    }

    let lastError: Error | null = null;
    let fallbackAttempted = false;

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      const isFallbackModel = i > 0;

      // Rate limit check
      const rateLimitCheck = aiRateLimiter.checkRateLimit(model);
      if (!rateLimitCheck.allowed) {
        lastError = new Error(rateLimitCheck.reason || 'Request rate limit reached for this model.');
        continue;
      }

      try {
        aiRateLimiter.recordRequest(model.id);

        const result = await this.executeChatWithModel({
          model,
          userMessage,
          conversationHistory,
          systemPrompt: model.systemInstruction || globalSettings.baseSystemPrompt,
          onToolInvoking,
          signal,
        });

        const durationMs = Math.round(performance.now() - startTime);

        // Record audit with complete raw payload snapshot and debug trace
        const logId = await aiAuditLogger.logEntry({
          timestamp: Date.now(),
          modelId: model.id,
          modelName: model.name,
          provider: model.provider,
          wasFallback: isFallbackModel,
          fallbackReason: isFallbackModel ? lastError?.message : undefined,
          type: 'chat_query',
          userMessage,
          assistantResponse: result.answer,
          toolsInvoked: result.toolsInvoked,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          totalTokens: result.promptTokens + result.completionTokens,
          durationMs,
          status: 'success',
          fullPayloadSnapshot: {
            sentPrompt: model.systemInstruction || globalSettings.baseSystemPrompt,
            rawToolResults: result.rawDebug?.toolsExecution,
            requestPayload: result.rawDebug?.request,
            rawResponse: result.rawDebug?.response?.rawResponse,
            rawDebug: result.rawDebug,
          },
          rawDebug: result.rawDebug,
        });

        // Record telemetry
        useAiTelemetryStore.getState().recordExecution({
          modelId: model.id,
          modelName: model.name,
          provider: model.provider,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          durationMs,
          status: 'success',
        });

        return {
          answer: result.answer,
          usedModel: model,
          wasFallback: isFallbackModel,
          toolsInvoked: result.toolsInvoked,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          durationMs,
          auditLogId: logId,
          rawDebug: result.rawDebug,
        };
      } catch (err: any) {
        lastError = err;
        // Do not attempt fallback models if the user cancelled the request
        if (signal?.aborted || err?.name === 'AbortError' || err?.message?.toLowerCase().includes('aborted')) {
          break;
        }
        fallbackAttempted = true;
        if (!globalSettings.autoFallback) {
          break;
        }
      }
    }

    const durationMs = Math.round(performance.now() - startTime);
    const failedModel = candidateModels[0];

    // Handle cancellation gracefully without marking as an application failure
    const isCancelled = signal?.aborted || lastError?.name === 'AbortError' || lastError?.message?.toLowerCase().includes('aborted');
    if (isCancelled) {
      let cancelAuditLogId: string | undefined;
      try {
        cancelAuditLogId = await aiAuditLogger.logEntry({
          timestamp: Date.now(),
          modelId: failedModel?.id || 'unknown',
          modelName: failedModel?.name || 'Unknown',
          provider: failedModel?.provider || 'custom',
          wasFallback: false,
          type: 'chat_query',
          userMessage,
          assistantResponse: '',
          toolsInvoked: [],
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          durationMs,
          status: 'cancelled',
          errorMessage: 'Análise cancelada pelo usuário.',
          fullPayloadSnapshot: {
            sentPrompt: failedModel?.systemInstruction || globalSettings.baseSystemPrompt,
          },
        });
      } catch (auditErr) {
        console.warn('Failed to record cancelled audit log:', auditErr);
      }

      const cancelledErr = new Error('Análise interrompida pelo usuário.');
      cancelledErr.name = 'AbortError';
      (cancelledErr as any).isCancelled = true;
      (cancelledErr as any).auditLogId = cancelAuditLogId;
      (cancelledErr as any).rawDebug = (lastError as any)?.rawDebug;
      throw cancelledErr;
    }
    const parsedError = formatUserFriendlyAiError(lastError);

    // Full technical error recorded in audit logs and console
    console.error('[AI Assistant Error]:', parsedError.technicalDetails);

    const errorAuditLogId = await aiAuditLogger.logEntry({
      timestamp: Date.now(),
      modelId: failedModel?.id || 'unknown',
      modelName: failedModel?.name || 'Unknown',
      provider: failedModel?.provider || 'custom',
      wasFallback: fallbackAttempted,
      type: 'chat_query',
      userMessage,
      assistantResponse: '',
      toolsInvoked: (lastError as any)?.rawDebug?.toolsExecution?.map((t: any) => ({
        name: t.name,
        args: t.inputArgs,
        executionTimeMs: t.executionTimeMs,
        resultSummary: t.error || 'Executed with error',
      })) || [],
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs,
      status: 'error',
      errorMessage: parsedError.technicalDetails,
      fullPayloadSnapshot: {
        sentPrompt: failedModel?.systemInstruction || globalSettings.baseSystemPrompt,
        rawToolResults: (lastError as any)?.rawDebug?.toolsExecution,
        requestPayload: (lastError as any)?.rawDebug?.request,
        rawResponse: (lastError as any)?.rawDebug?.response,
        rawDebug: (lastError as any)?.rawDebug,
      },
      rawDebug: (lastError as any)?.rawDebug,
    });

    const userFacingError = new Error(parsedError.friendlyMessage);
    (userFacingError as any).rawDetails = parsedError.technicalDetails;
    (userFacingError as any).isRetryable = parsedError.isRetryable;
    (userFacingError as any).code = parsedError.code;
    (userFacingError as any).auditLogId = errorAuditLogId;
    (userFacingError as any).rawDebug = (lastError as any)?.rawDebug;

    throw userFacingError;
  }

  private async executeChatWithModel(params: {
    model: AiModelConfig;
    userMessage: string;
    conversationHistory: AiChatMessage[];
    systemPrompt: string;
    onToolInvoking?: (toolName: string) => void;
    signal?: AbortSignal;
  }): Promise<{
    answer: string;
    toolsInvoked: AiAuditToolInvocation[];
    promptTokens: number;
    completionTokens: number;
    rawDebug: AiRawDebugData;
  }> {
    const { model, userMessage, conversationHistory, systemPrompt, onToolInvoking, signal } = params;

    if (signal?.aborted) {
      const abortErr = new Error('Análise interrompida pelo usuário.');
      abortErr.name = 'AbortError';
      (abortErr as any).isCancelled = true;
      throw abortErr;
    }

    if (model.provider === 'gemini') {
      return this.executeWithGeminiBackend({
        model,
        userMessage,
        conversationHistory,
        systemPrompt,
        onToolInvoking,
        signal,
      });
    }

    return this.executeWithOpenAiCompatible({
      model,
      userMessage,
      conversationHistory,
      systemPrompt,
      onToolInvoking,
      signal,
    });
  }

  private async executeWithOpenAiCompatible(params: {
    model: AiModelConfig;
    userMessage: string;
    conversationHistory: AiChatMessage[];
    systemPrompt: string;
    onToolInvoking?: (toolName: string) => void;
    signal?: AbortSignal;
  }): Promise<{
    answer: string;
    toolsInvoked: AiAuditToolInvocation[];
    promptTokens: number;
    completionTokens: number;
    rawDebug: AiRawDebugData;
  }> {
    const { model, userMessage, conversationHistory, systemPrompt, onToolInvoking, signal } = params;

    let baseUrl = model.baseUrl || (model.provider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1');
    baseUrl = baseUrl.replace(/\/+$/, '');
    const endpoint = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

    const tools = aiToolRegistry.getOpenAiToolsSchema();
    const toolsInvoked: AiAuditToolInvocation[] = [];
    const toolsExecutionDebug: AiRawDebugToolExecution[] = [];

    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    const maxRounds = useAiSettingsStore.getState().globalSettings?.maxHistoryRounds || 20;
    for (const h of conversationHistory.slice(-maxRounds)) {
      if (h.role === 'user' || h.role === 'assistant') {
        messages.push({ role: h.role, content: h.content });
      }
    }

    messages.push({ role: 'user', content: userMessage });

    const rawDebug: AiRawDebugData = {
      request: {
        endpoint,
        modelId: model.modelId,
        provider: model.provider,
        systemInstruction: systemPrompt,
        messages: JSON.parse(JSON.stringify(messages)),
        toolsDeclarations: tools,
        parameters: {
          temperature: model.temperature ?? 0.1,
          topP: model.topP ?? 0.95,
          maxTokens: model.maxTokens ?? 2048,
        },
        rawPayload: {
          model: model.modelId,
          messages,
          tools: tools.length > 0 ? tools : undefined,
          temperature: model.temperature ?? 0.1,
          top_p: model.topP ?? 0.95,
          max_tokens: model.maxTokens ?? 2048,
        },
        timestamp: Date.now(),
      },
      toolsExecution: toolsExecutionDebug,
    };

    let promptTokens = 0;
    let completionTokens = 0;
    let turns = 0;
    const maxTurns = 5;

    while (turns < maxTurns) {
      if (signal?.aborted) {
        const abortErr = new Error('Análise interrompida pelo usuário.');
        abortErr.name = 'AbortError';
        (abortErr as any).isCancelled = true;
        (abortErr as any).rawDebug = rawDebug;
        throw abortErr;
      }

      turns++;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (model.apiKey) {
        headers['Authorization'] = `Bearer ${model.apiKey}`;
      }

      const bodyPayload = {
        model: model.modelId,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: model.temperature ?? 0.1,
        top_p: model.topP ?? 0.95,
        max_tokens: model.maxTokens ?? 2048,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
        signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        rawDebug.error = {
          message: `HTTP ${res.status}: ${errorText}`,
          rawError: errorText,
          statusCode: res.status,
        };
        const err = new Error(`HTTP ${res.status}: ${errorText}`);
        (err as any).rawDetails = errorText;
        (err as any).status = res.status;
        (err as any).rawDebug = rawDebug;
        throw err;
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const message = choice?.message;

      if (data.usage) {
        promptTokens += data.usage.prompt_tokens || 0;
        completionTokens += data.usage.completion_tokens || 0;
      }

      rawDebug.response = {
        status: res.status,
        text: message?.content || '',
        rawContent: message,
        toolCalls: message?.tool_calls,
        rawResponse: data,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        timestamp: Date.now(),
      };

      if (!message) {
        const err = new Error('No valid response returned by the model.');
        (err as any).rawDebug = rawDebug;
        throw err;
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        messages.push(message);

        for (const toolCall of message.tool_calls) {
          if (signal?.aborted) {
            const abortErr = new Error('Análise interrompida pelo usuário.');
            abortErr.name = 'AbortError';
            (abortErr as any).isCancelled = true;
            (abortErr as any).rawDebug = rawDebug;
            throw abortErr;
          }

          const fnName = toolCall.function?.name;
          let parsedArgs = {};
          try {
            parsedArgs = toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
          } catch {
            parsedArgs = {};
          }

          if (onToolInvoking && fnName) {
            onToolInvoking(fnName);
          }

          const toolRes = await aiToolRegistry.executeToolCall(fnName, parsedArgs);

          toolsInvoked.push({
            name: fnName,
            args: parsedArgs,
            executionTimeMs: toolRes.executionTimeMs,
            resultSummary: toolRes.error || 'Executado com sucesso',
          });

          toolsExecutionDebug.push({
            turn: turns,
            name: fnName,
            inputArgs: parsedArgs,
            rawResult: toolRes.result,
            executionTimeMs: toolRes.executionTimeMs,
            error: toolRes.error,
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: fnName,
            content: JSON.stringify(toolRes.result || { error: toolRes.error }),
          });
        }
      } else {
        return {
          answer: message.content || '',
          toolsInvoked,
          promptTokens: promptTokens || Math.round(userMessage.length / 4) + 200,
          completionTokens: completionTokens || Math.round((message.content?.length || 0) / 4),
          rawDebug,
        };
      }
    }

    const err = new Error('Tool reasoning iteration limit exceeded.');
    (err as any).rawDebug = rawDebug;
    throw err;
  }

  private async executeWithGeminiBackend(params: {
    model: AiModelConfig;
    userMessage: string;
    conversationHistory: AiChatMessage[];
    systemPrompt: string;
    onToolInvoking?: (toolName: string) => void;
    signal?: AbortSignal;
  }): Promise<{
    answer: string;
    toolsInvoked: AiAuditToolInvocation[];
    promptTokens: number;
    completionTokens: number;
    rawDebug: AiRawDebugData;
  }> {
    const { model, userMessage, conversationHistory, systemPrompt, onToolInvoking, signal } = params;
    const tools = aiToolRegistry.getGeminiToolsSchema();
    const toolsInvoked: AiAuditToolInvocation[] = [];
    const toolsExecutionDebug: AiRawDebugToolExecution[] = [];

    const maxRounds = useAiSettingsStore.getState().globalSettings?.maxHistoryRounds || 20;
    let currentMessages: any[] = conversationHistory
      .slice(-maxRounds)
      .filter((h) => h.role === 'user' || h.role === 'assistant')
      .map((h) => ({ role: h.role, content: h.content }));

    currentMessages.push({ role: 'user', content: userMessage });

    const rawDebug: AiRawDebugData = {
      request: {
        endpoint: '/api/ai/chat',
        modelId: model.modelId,
        provider: 'gemini',
        systemInstruction: systemPrompt,
        messages: JSON.parse(JSON.stringify(currentMessages)),
        toolsDeclarations: tools,
        parameters: {
          temperature: model.temperature ?? 0.1,
          maxTokens: model.maxTokens ?? 2048,
        },
        rawPayload: {
          modelId: model.modelId,
          messages: currentMessages,
          systemInstruction: systemPrompt,
          tools,
          temperature: model.temperature ?? 0.1,
          maxTokens: model.maxTokens ?? 2048,
        },
        timestamp: Date.now(),
      },
      toolsExecution: toolsExecutionDebug,
    };

    let promptTokens = 0;
    let completionTokens = 0;
    let turns = 0;
    const maxTurns = 5;

    while (turns < maxTurns) {
      if (signal?.aborted) {
        const abortErr = new Error('Análise interrompida pelo usuário.');
        abortErr.name = 'AbortError';
        (abortErr as any).isCancelled = true;
        (abortErr as any).rawDebug = rawDebug;
        throw abortErr;
      }

      turns++;

      const payloadToSend = {
        modelId: model.modelId,
        apiKey: model.apiKey,
        messages: currentMessages,
        systemInstruction: systemPrompt,
        tools,
        temperature: model.temperature ?? 0.1,
        maxTokens: model.maxTokens ?? 2048,
      };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSend),
        signal,
      });

      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        let rawMessage = `Gemini backend returned status ${res.status}`;
        let rawDetails: any = null;
        if (contentType.includes('application/json')) {
          const errorData = await res.json().catch(() => ({}));
          rawMessage = errorData.rawError || errorData.error || rawMessage;
          rawDetails = errorData;
        } else {
          const rawText = await res.text().catch(() => '');
          rawDetails = rawText;
          if (rawText.toLowerCase().includes('<!doctype') || rawText.toLowerCase().includes('<html')) {
            rawMessage = `Backend service unavailable or invalid route (HTTP ${res.status}).`;
          } else {
            rawMessage = rawText.slice(0, 300) || rawMessage;
          }
        }

        rawDebug.error = {
          message: rawMessage,
          rawError: rawDetails,
          statusCode: res.status,
        };

        const err = new Error(rawMessage);
        (err as any).rawDetails = rawMessage;
        (err as any).status = res.status;
        (err as any).rawDebug = rawDebug;
        throw err;
      }

      if (!contentType.includes('application/json')) {
        const rawText = await res.text().catch(() => '');
        rawDebug.error = {
          message: `Invalid server response (HTTP ${res.status})`,
          rawError: rawText,
          statusCode: res.status,
        };
        const err = new Error(`Invalid server response (HTTP ${res.status}): ${rawText.slice(0, 100)}`);
        (err as any).rawDebug = rawDebug;
        throw err;
      }

      const data = await res.json();

      if (data.usage) {
        promptTokens += data.usage.promptTokens || 0;
        completionTokens += data.usage.completionTokens || 0;
      }

      rawDebug.response = {
        status: res.status,
        text: data.text || '',
        rawContent: data.rawContent,
        toolCalls: data.toolCalls,
        rawResponse: data.rawResponse,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        timestamp: Date.now(),
      };

      if (data.toolCalls && data.toolCalls.length > 0) {
        const responseParts: any[] = [];

        for (const tc of data.toolCalls) {
          if (signal?.aborted) {
            const abortErr = new Error('Análise interrompida pelo usuário.');
            abortErr.name = 'AbortError';
            (abortErr as any).isCancelled = true;
            (abortErr as any).rawDebug = rawDebug;
            throw abortErr;
          }

          if (onToolInvoking) {
            onToolInvoking(tc.name);
          }
          const toolRes = await aiToolRegistry.executeToolCall(tc.name, tc.args);
          toolsInvoked.push({
            name: tc.name,
            args: tc.args,
            executionTimeMs: toolRes.executionTimeMs,
            resultSummary: toolRes.error || 'Executed successfully',
          });

          toolsExecutionDebug.push({
            turn: turns,
            name: tc.name,
            inputArgs: tc.args,
            rawResult: toolRes.result,
            executionTimeMs: toolRes.executionTimeMs,
            error: toolRes.error,
          });

          responseParts.push({
            functionResponse: {
              name: tc.name,
              response: toolRes.result || { error: toolRes.error },
            },
          });
        }

        // Push model's raw content preserving thought signatures, function call IDs, and metadata
        if (data.rawContent) {
          currentMessages.push(data.rawContent);
        } else {
          currentMessages.push({
            role: 'model',
            parts: data.toolCalls.map((tc: any) => ({
              functionCall: { name: tc.name, args: tc.args },
            })),
          });
        }

        // Push function execution results
        currentMessages.push({
          role: 'user',
          parts: responseParts,
        });
      } else {
        return {
          answer: data.text || '',
          toolsInvoked,
          promptTokens: promptTokens || data.usage?.promptTokens || 350,
          completionTokens: completionTokens || data.usage?.completionTokens || 120,
          rawDebug,
        };
      }
    }

    const err = new Error('Tool execution turn limit reached for Gemini assistant.');
    (err as any).rawDebug = rawDebug;
    throw err;
  }
}

export const aiAdapter = new AiAdapter();
