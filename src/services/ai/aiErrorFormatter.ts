export interface ParsedAiError {
  friendlyMessage: string;
  technicalDetails: string;
  code?: string | number;
  status?: string;
  isRetryable: boolean;
}

/**
 * Parses and sanitizes errors from AI providers (Gemini, OpenAI, Ollama, Anthropic, etc.)
 * returning a friendly message for regular users while isolating technical jargon for logs.
 */
export function formatUserFriendlyAiError(error: any, fallbackStatusCode?: number): ParsedAiError {
  let rawText = '';

  if (typeof error === 'string') {
    rawText = error;
  } else if (error && typeof error === 'object') {
    rawText = error.rawDetails || error.message || error.error || JSON.stringify(error);
  } else {
    rawText = 'Unknown error occurred.';
  }

  let extractedMessage = rawText;
  let statusCode = fallbackStatusCode;
  let statusStr = '';
  let errorCode: string | number | undefined;

  // Attempt to parse JSON string if present (e.g., Gemini SDK error serialized JSON)
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*"error"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error) {
        if (typeof parsed.error.message === 'string') {
          extractedMessage = parsed.error.message;
        }
        if (parsed.error.code) {
          errorCode = parsed.error.code;
          if (typeof parsed.error.code === 'number') {
            statusCode = parsed.error.code;
          }
        }
        if (parsed.error.status) {
          statusStr = parsed.error.status;
        }
      }
    }
  } catch {
    // Keep rawText as extractedMessage
  }

  const lower = (rawText + ' ' + extractedMessage + ' ' + statusStr).toLowerCase();

  let friendlyMessage = '';
  let isRetryable = false;

  // 1. Service unavailable / High demand (503 / UNAVAILABLE)
  if (
    statusCode === 503 ||
    statusStr === 'UNAVAILABLE' ||
    lower.includes('high demand') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('service unavailable')
  ) {
    friendlyMessage = 'The AI model is temporarily unavailable due to high demand on Google servers. Please try again in a few moments.';
    isRetryable = true;
  }
  // 2. Quota / Rate limit (429 / RESOURCE_EXHAUSTED)
  else if (
    statusCode === 429 ||
    statusStr === 'RESOURCE_EXHAUSTED' ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    friendlyMessage = 'Request rate limit or quota exceeded. Please wait a moment before sending another query or select a different model in AI Settings.';
    isRetryable = true;
  }
  // 3. Model not found / deprecated (404 / NOT_FOUND)
  else if (
    statusCode === 404 ||
    statusStr === 'NOT_FOUND' ||
    lower.includes('not_found') ||
    lower.includes('not found') ||
    lower.includes('is not supported') ||
    lower.includes('deprecated') ||
    lower.includes('is not available for new users')
  ) {
    friendlyMessage = 'The selected AI model is deprecated or no longer available. Please open AI Settings to select a newer model (e.g., Gemini 3.8 Flash).';
    isRetryable = false;
  }
  // 4. Authentication / Permission denied (401 / 403 / UNAUTHENTICATED / PERMISSION_DENIED)
  else if (
    statusCode === 401 ||
    statusCode === 403 ||
    statusStr === 'UNAUTHENTICATED' ||
    statusStr === 'PERMISSION_DENIED' ||
    lower.includes('unauthenticated') ||
    lower.includes('permission_denied') ||
    lower.includes('api_key') ||
    lower.includes('invalid api key') ||
    lower.includes('unauthorized')
  ) {
    friendlyMessage = 'Authentication failed with the AI provider. Please verify your API Key is valid and properly configured.';
    isRetryable = false;
  }
  // 5. Invalid argument / schema error (400 / INVALID_ARGUMENT)
  else if (
    statusCode === 400 ||
    statusStr === 'INVALID_ARGUMENT' ||
    lower.includes('invalid_argument') ||
    lower.includes('thought_signature') ||
    lower.includes('bad request')
  ) {
    friendlyMessage = 'The query format or parameters are not supported by the model. Please try asking your question differently.';
    isRetryable = true;
  }
  // 6. Network / Offline / Timeout
  else if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('abort') ||
    lower.includes('econnrefused') ||
    lower.includes('timeout')
  ) {
    friendlyMessage = 'Could not connect to the AI service. Please check your internet connection or verify the service status.';
    isRetryable = true;
  }
  // 7. Server syntax / Unexpected HTML / Non-JSON responses
  else if (
    lower.includes('unexpected token') ||
    lower.includes('<!doctype') ||
    lower.includes('<html') ||
    lower.includes('not valid json') ||
    lower.includes('syntaxerror')
  ) {
    friendlyMessage = 'An instability occurred while communicating with the AI server. Please try again in a few moments.';
    isRetryable = true;
  }
  // 7. Ollama local connection error
  else if (lower.includes('ollama') && (lower.includes('could not reach') || lower.includes('connect'))) {
    friendlyMessage = 'Could not connect to local Ollama. Ensure Ollama is running on your machine.';
    isRetryable = true;
  }
  // 8. Turn limit
  else if (lower.includes('turn limit reached')) {
    friendlyMessage = 'The assistant reached the maximum tool reasoning steps for this query. Try asking a more specific question.';
    isRetryable = false;
  }
  // 9. Clean extract if already human readable without technical wrappers
  else if (
    extractedMessage &&
    !extractedMessage.includes('{') &&
    !extractedMessage.includes('[object') &&
    extractedMessage.length < 200 &&
    !extractedMessage.toLowerCase().includes('syntaxerror') &&
    !extractedMessage.toLowerCase().includes('typeerror')
  ) {
    friendlyMessage = extractedMessage;
  }
  // 10. Generic fallback
  else {
    friendlyMessage = 'Could not complete analysis due to temporary instability in the AI engine. Please try again.';
    isRetryable = true;
  }

  return {
    friendlyMessage,
    technicalDetails: rawText,
    code: errorCode || statusCode,
    status: statusStr,
    isRetryable,
  };
}
