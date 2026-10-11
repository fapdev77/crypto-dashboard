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
  unverifiedData?: boolean;
  auditWarning?: string;
  incompatibleToolModel?: boolean;
  recommendedModelSuggestion?: string;
}

export function isOperationalFinancialQuery(message: string): boolean {
  const normalized = message.toLowerCase();
  const patterns = [
    /\bsaldo\b/,
    /\bsaldos\b/,
    /\bbalance\b/,
    /\bbalances\b/,
    /\bposiç(?:ão|ões)\b/,
    /\bposicoes\b/,
    /\bpositions?\b/,
    /\bfunding\b/,
    /\btaxa(?:s)?\s*(?:de)?\s*(?:financiamento|funding)\b/,
    /\bordens?\b/,
    /\borders?\b/,
    /\btrades?\b/,
    /\boperaç(?:ão|ões)\b/,
    /\boperacoes\b/,
    /\bcarteira\b/,
    /\bportfolio\b/,
    /\bpatrimônio\b/,
    /\bpatrimonio\b/,
    /\bbybit\b/,
    /\bokx\b/,
    /\bbitget\b/,
    /\bbinance\b/,
    /\bquanto tenho\b/,
    /\bmeus ativos\b/,
    /\bminhas contas\b/,
    /\bminha conta\b/,
    /\bhedge\b/,
    /\barbitragem\b/,
    /\blux\b/,
    /\bpnl\b/,
    /\blucro\b/,
    /\bprejuízo\b/,
    /\bprejuizo\b/
  ];
  return patterns.some((p) => p.test(normalized));
}

export function getOllamaChatEndpoint(baseUrl?: string): string {
  const base = (baseUrl || 'http://localhost:11434').trim().replace(/\/+$/, '');
  if (base.endsWith('/api/chat')) return base;
  if (base.endsWith('/api')) return `${base}/chat`;
  if (base.endsWith('/v1/chat/completions')) return `${base.replace(/\/v1\/chat\/completions$/, '')}/api/chat`;
  if (base.endsWith('/v1')) return `${base.replace(/\/v1$/, '')}/api/chat`;
  return `${base}/api/chat`;
}

export function isModelKnownIncompatibleWithTools(model: AiModelConfig): boolean {
  // 1. Explicit user configuration in the UI takes absolute precedence
  if (model.supportsTools === true) return false;
  if (model.supportsTools === false) return true;

  const id = (model.modelId || '').toLowerCase();

  // 2. Models with verified function calling / tool support
  if (
    id.includes('gpt-oss') ||
    id.includes('gpt_oss') ||
    id.includes('llama3') ||
    id.includes('mistral') ||
    id.includes('gemini') ||
    (id.includes('qwen2.5') && !id.includes('coder'))
  ) {
    return false;
  }

  // 3. DeepSeek-R1 (reasoning with <think>) does not support Ollama tool calling templates
  if (id.includes('deepseek-r1') || id.includes('deepseek_r1')) {
    return true;
  }

  // 4. Code-only models that lack standard tool calling templates in Ollama
  if (
    id.includes('qwen2.5-coder') ||
    id.includes('deepseek-coder') ||
    id.includes('codellama') ||
    id.includes('starcoder')
  ) {
    return true;
  }

  return false;
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
          unverifiedData: result.unverifiedData,
          auditWarning: result.auditWarning,
          incompatibleToolModel: result.incompatibleToolModel,
          recommendedModelSuggestion: result.recommendedModelSuggestion,
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
    unverifiedData?: boolean;
    auditWarning?: string;
    incompatibleToolModel?: boolean;
    recommendedModelSuggestion?: string;
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

    if (model.provider === 'ollama') {
      return this.executeWithOllamaChat({
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
    unverifiedData?: boolean;
    auditWarning?: string;
    incompatibleToolModel?: boolean;
    recommendedModelSuggestion?: string;
  }> {
    const { model, userMessage, conversationHistory, systemPrompt, onToolInvoking, signal } = params;

    let baseUrl = model.baseUrl || (model.provider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1');
    baseUrl = baseUrl.replace(/\/+$/, '');
    const endpoint = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

    const tools = aiToolRegistry.getOpenAiToolsSchema();
    const toolsInvoked: AiAuditToolInvocation[] = [];
    const toolsExecutionDebug: AiRawDebugToolExecution[] = [];

    const isFinancialQuery = isOperationalFinancialQuery(userMessage);
    const isIncompatible = isModelKnownIncompatibleWithTools(model);

    let effectiveSystemPrompt = systemPrompt;
    if (isFinancialQuery) {
      effectiveSystemPrompt += `\n\n[STRICT AUDIT MANDATE]: The user is asking about specific exchange portfolio metrics (balances, open positions, funding fees, liquidation risk, or orders). You MUST call the corresponding tools (e.g. get_balances, get_positions, get_funding_fees, get_account_summary) to inspect the actual database and connected exchanges. DO NOT fabricate, hallucinate, extrapolate or invent nominal amounts or positions under any circumstances.`;
    }

    const messages: any[] = [{ role: 'system', content: effectiveSystemPrompt }];

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
        systemInstruction: effectiveSystemPrompt,
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
          tool_choice: tools.length > 0 ? 'auto' : undefined,
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

      const bodyPayload: any = {
        model: model.modelId,
        messages,
        temperature: model.temperature ?? 0.1,
        top_p: model.topP ?? 0.95,
        max_tokens: model.maxTokens ?? 2048,
      };

      if (tools.length > 0) {
        bodyPayload.tools = tools;
        bodyPayload.tool_choice = 'auto';
      }

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
        // Model returned text without invoking tools
        if (isFinancialQuery && isIncompatible) {
          const blockedAnswer = `### ⚠️ Query Guarded: Model Incompatible with Function Calling

The model **${model.name}** (\`${model.modelId}\`) does not support tool execution (*Function Calling*) in Ollama.

Pure reasoning models (such as **DeepSeek-R1** with \`<think>\` blocks) and raw code models ignore tool calling specifications and fabricate financial figures, balances, and positions.

To protect your live operations from hallucinated data:
- **The unverified response was blocked.**
- Please switch to a recommended model with verified tool support:
  - **\`gpt-oss:20b\`** (OpenAI Open-Weight in Ollama)
  - **\`qwen2.5:7b\`** (General Instruct)
  - **\`llama3.1:8b\`** or **\`llama3.2:3b\`**
  - **\`mistral-nemo:12b\`**
  - **\`gemini-3.8-flash\`** (Cloud)`;

          return {
            answer: blockedAnswer,
            toolsInvoked: [],
            promptTokens: promptTokens || Math.round(userMessage.length / 4) + 100,
            completionTokens: completionTokens || Math.round(blockedAnswer.length / 4),
            rawDebug,
            incompatibleToolModel: true,
            unverifiedData: true,
            auditWarning: `Model ${model.modelId} does not support tool execution. Unverified portfolio metrics were blocked for safety.`,
            recommendedModelSuggestion: 'gpt-oss:20b, qwen2.5:7b or llama3.1:8b',
          };
        }

        const unverified = isFinancialQuery && toolsInvoked.length === 0;

        return {
          answer: message.content || '',
          toolsInvoked,
          promptTokens: promptTokens || Math.round(userMessage.length / 4) + 200,
          completionTokens: completionTokens || Math.round((message.content?.length || 0) / 4),
          rawDebug,
          unverifiedData: unverified,
          auditWarning: unverified
            ? 'Warning: This response was generated without invoking exchange tools (Function Calling). Balance, positions, or fee metrics may be inaccurate or hallucinated.'
            : undefined,
        };
      }
    }

    const err = new Error('Tool reasoning iteration limit exceeded.');
    (err as any).rawDebug = rawDebug;
    throw err;
  }

  private async executeWithOllamaChat(params: {
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
    unverifiedData?: boolean;
    auditWarning?: string;
    incompatibleToolModel?: boolean;
    recommendedModelSuggestion?: string;
  }> {
    const { model, userMessage, conversationHistory, systemPrompt, onToolInvoking, signal } = params;

    const endpoint = getOllamaChatEndpoint(model.baseUrl);
    const tools = aiToolRegistry.getOpenAiToolsSchema();
    const toolsInvoked: AiAuditToolInvocation[] = [];
    const toolsExecutionDebug: AiRawDebugToolExecution[] = [];

    const isFinancialQuery = isOperationalFinancialQuery(userMessage);
    const isIncompatible = isModelKnownIncompatibleWithTools(model);

    let effectiveSystemPrompt = systemPrompt;
    if (isFinancialQuery) {
      effectiveSystemPrompt += `\n\n[STRICT AUDIT MANDATE]: The user is asking about specific exchange portfolio metrics (balances, open positions, funding fees, liquidation risk, or orders). You MUST invoke the appropriate local tool (get_balances, get_positions, get_funding_fees, get_account_summary) to read real metrics from the active databases and exchanges. DO NOT invent nominal amounts or open positions.`;
    }

    const messages: any[] = [{ role: 'system', content: effectiveSystemPrompt }];

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
        provider: 'ollama',
        systemInstruction: effectiveSystemPrompt,
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
          stream: false,
          tools: tools.length > 0 && !isIncompatible ? tools : undefined,
          options: {
            temperature: model.temperature ?? 0.1,
            top_p: model.topP ?? 0.95,
            num_predict: model.maxTokens ?? 2048,
          },
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

      const bodyPayload: any = {
        model: model.modelId,
        messages,
        stream: false,
        options: {
          temperature: model.temperature ?? 0.1,
          top_p: model.topP ?? 0.95,
          num_predict: model.maxTokens ?? 2048,
        },
      };

      if (tools.length > 0 && !isIncompatible) {
        bodyPayload.tools = tools;
      }

      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
          signal,
        });
      } catch (directErr: any) {
        // Fallback to server-side Ollama proxy if direct browser fetch fails (CORS / Mixed Content)
        const isNetworkOrCors = directErr?.name === 'TypeError' || directErr?.message?.includes('fetch');
        if (isNetworkOrCors && !signal?.aborted) {
          try {
            res = await fetch('/api/ai/ollama-chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                endpoint,
                headers,
                payload: bodyPayload,
              }),
              signal,
            });
          } catch (proxyErr: any) {
            rawDebug.error = {
              message: `Ollama connection error (direct & proxy failed): ${proxyErr.message}`,
              rawError: proxyErr.message,
            };
            const err = new Error(`Could not reach Ollama at ${endpoint}. Ensure Ollama is running ('ollama serve') and accessible.`);
            (err as any).rawDebug = rawDebug;
            throw err;
          }
        } else {
          rawDebug.error = {
            message: `Ollama network error: ${directErr.message}`,
            rawError: directErr.message,
          };
          const err = new Error(`Could not reach Ollama at ${endpoint}: ${directErr.message}`);
          (err as any).rawDebug = rawDebug;
          throw err;
        }
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        rawDebug.error = {
          message: `Ollama HTTP ${res.status}: ${errorText}`,
          rawError: errorText,
          statusCode: res.status,
        };
        const err = new Error(`Ollama HTTP ${res.status}: ${errorText}`);
        (err as any).rawDetails = errorText;
        (err as any).status = res.status;
        (err as any).rawDebug = rawDebug;
        throw err;
      }

      const data = await res.json();
      const message = data.message;

      if (data.prompt_eval_count) promptTokens += data.prompt_eval_count;
      if (data.eval_count) completionTokens += data.eval_count;

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
        const err = new Error('No valid message returned by Ollama /api/chat.');
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
          const rawArgs = toolCall.function?.arguments;
          if (typeof rawArgs === 'object' && rawArgs !== null) {
            parsedArgs = rawArgs;
          } else if (typeof rawArgs === 'string') {
            try {
              parsedArgs = JSON.parse(rawArgs);
            } catch {
              parsedArgs = {};
            }
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

          // In Ollama native /api/chat, return tool output as role: 'tool'
          messages.push({
            role: 'tool',
            content: JSON.stringify(toolRes.result || { error: toolRes.error }),
          });
        }
      } else {
        // Model returned text response without invoking tools
        if (isFinancialQuery && isIncompatible) {
          const blockedAnswer = `### ⚠️ Query Guarded: Model Incompatible with Function Calling

The model **${model.name}** (\`${model.modelId}\`) does not support tool execution (*Function Calling*) in Ollama.

Pure reasoning models (such as **DeepSeek-R1** with \`<think>\` blocks) ignore tool calling specifications and fabricate financial figures, balances, and positions.

To protect your live operations from hallucinated data:
- **The unverified response was blocked.**
- Please switch to a recommended model with verified tool support:
  - **\`gpt-oss:20b\`** (OpenAI Open-Weight in Ollama)
  - **\`qwen2.5:7b\`** (General Instruct)
  - **\`llama3.1:8b\`** ou **\`llama3.2:3b\`**
  - **\`mistral-nemo:12b\`**
  - **\`gemini-3.8-flash\`** (Cloud)`;

          return {
            answer: blockedAnswer,
            toolsInvoked: [],
            promptTokens: promptTokens || Math.round(userMessage.length / 4) + 100,
            completionTokens: completionTokens || Math.round(blockedAnswer.length / 4),
            rawDebug,
            incompatibleToolModel: true,
            unverifiedData: true,
            auditWarning: `Model ${model.modelId} does not support function calling in Ollama. Unverified portfolio metrics were blocked for safety.`,
            recommendedModelSuggestion: 'gpt-oss:20b, qwen2.5:7b or llama3.1:8b',
          };
        }

        const unverified = isFinancialQuery && toolsInvoked.length === 0;

        return {
          answer: message.content || '',
          toolsInvoked,
          promptTokens: promptTokens || Math.round(userMessage.length / 4) + 200,
          completionTokens: completionTokens || Math.round((message.content?.length || 0) / 4),
          rawDebug,
          unverifiedData: unverified,
          auditWarning: unverified
            ? 'Warning: This response was generated without invoking exchange tools (Function Calling). Balance, positions, or fee metrics may be inaccurate or hallucinated.'
            : undefined,
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
    unverifiedData?: boolean;
    auditWarning?: string;
    incompatibleToolModel?: boolean;
    recommendedModelSuggestion?: string;
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
        const isFinancialQuery = isOperationalFinancialQuery(userMessage);
        const unverified = isFinancialQuery && toolsInvoked.length === 0;

        return {
          answer: data.text || '',
          toolsInvoked,
          promptTokens: promptTokens || data.usage?.promptTokens || 350,
          completionTokens: completionTokens || data.usage?.completionTokens || 120,
          rawDebug,
          unverifiedData: unverified,
          auditWarning: unverified
            ? 'Atenção: Esta resposta foi gerada sem consulta prévia às ferramentas locais de exchange (Function Calling). Números de saldo e posições não foram auditados.'
            : undefined,
        };
      }
    }

    const err = new Error('Tool execution turn limit reached for Gemini assistant.');
    (err as any).rawDebug = rawDebug;
    throw err;
  }
}

export const aiAdapter = new AiAdapter();
