export type AiProviderType = 'gemini' | 'ollama' | 'openrouter' | 'openai' | 'anthropic' | 'custom';

export interface AiModelConfig {
  id: string;
  name: string;
  provider: AiProviderType;
  modelId: string;
  baseUrl?: string;
  apiKey?: string;
  isActive: boolean;
  isPrimary: boolean;
  isFallback: boolean;
  fallbackOrder?: number;

  // Inference parameters
  temperature: number;
  topP: number;
  maxTokens: number;
  systemInstruction?: string;

  // Operational limits
  maxRpm: number; // 0 = unlimited
  maxRpd: number; // 0 = unlimited
  currentRpmCount?: number;
  currentRpdCount?: number;
  lastUsedTimestamp?: number;

  // Validation / health ping status
  lastPingStatus?: 'healthy' | 'unreachable' | 'deprecated' | 'quota_exceeded' | 'unknown';
  lastPingLatencyMs?: number;
  lastPingMessage?: string;
  lastPingAt?: number;

  // Tool / function calling capability flag
  supportsTools?: boolean;
}

export interface AiAuditToolInvocation {
  name: string;
  args: Record<string, any>;
  executionTimeMs: number;
  resultSummary: string;
}

export interface AiRawDebugToolExecution {
  turn: number;
  name: string;
  inputArgs: Record<string, any>;
  rawResult: any;
  executionTimeMs: number;
  error?: string;
}

export interface AiRawDebugData {
  request?: {
    endpoint?: string;
    modelId: string;
    provider?: AiProviderType;
    systemInstruction?: string;
    messages?: any[];
    toolsDeclarations?: any[];
    parameters?: {
      temperature?: number;
      topP?: number;
      maxTokens?: number;
    };
    rawPayload?: any;
    timestamp?: number;
  };
  response?: {
    status?: number;
    text?: string;
    rawContent?: any;
    toolCalls?: any[];
    rawResponse?: any;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    durationMs?: number;
    timestamp?: number;
  };
  toolsExecution?: AiRawDebugToolExecution[];
  error?: {
    message: string;
    rawError?: any;
    statusCode?: number;
    code?: string | number;
    stack?: string;
  };
}

export interface AiAuditLogEntry {
  id: string;
  timestamp: number;
  modelId: string;
  modelName: string;
  provider: AiProviderType;
  wasFallback: boolean;
  fallbackReason?: string;
  type: 'chat_query' | 'diagnostic_chip' | 'tool_execution';
  userMessage: string;
  assistantResponse: string;
  toolsInvoked: AiAuditToolInvocation[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  latencyFirstTokenMs?: number;
  status: 'success' | 'rate_limited' | 'error' | 'refused_out_of_scope' | 'cancelled';
  errorMessage?: string;
  fullPayloadSnapshot?: {
    sentPrompt?: string;
    rawToolResults?: any;
    requestPayload?: any;
    rawResponse?: any;
    rawDebug?: AiRawDebugData;
  };
  rawDebug?: AiRawDebugData;
}

export interface AiGlobalSettings {
  isEnabled: boolean; // CRITICAL: false by default
  defaultTemperature: number;
  defaultTopP: number;
  defaultMaxTokens: number;
  baseSystemPrompt: string;
  autoFallback: boolean;
  obfuscateValues: boolean;
  maxHistoryRounds: number;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status?: 'sending' | 'thinking' | 'streaming' | 'complete' | 'error' | 'cancelled';
  toolsInvoked?: AiAuditToolInvocation[];
  usedModelName?: string;
  wasFallback?: boolean;
  errorMessage?: string;
  auditLogId?: string;
  rawDebug?: AiRawDebugData;
  unverifiedData?: boolean;
  auditWarning?: string;
  incompatibleToolModel?: boolean;
  recommendedModelSuggestion?: string;
}

export interface AiChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AiChatMessage[];
  pinned?: boolean;
}

export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      default?: any;
    }>;
    required?: string[];
  };
}

export interface AiToolCallRequest {
  name: string;
  args: Record<string, any>;
}

export interface AiToolCallResult {
  name: string;
  result: any;
  executionTimeMs: number;
  error?: string;
}

export interface AiTelemetryStats {
  totalCalls: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalDurationMs: number;
  averageLatencyMs: number;
  estimatedCostUsd: number;
  lastActivityTimestamp: number | null;
}

export interface AiModelTelemetrySummary {
  modelId: string;
  modelName: string;
  provider: AiProviderType;
  callsCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  averageDurationMs: number;
  estimatedCostUsd: number;
  lastUsedTimestamp: number | null;
  status: 'active' | 'standby' | 'disabled';
}
