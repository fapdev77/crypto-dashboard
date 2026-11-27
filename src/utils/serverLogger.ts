/**
 * Server-side structured logger.
 *
 * Provides the same source-tagged, level-based API as the browser-side LogManager
 * but writes to stdout/stderr instead of a Zustand store (which is browser-only).
 *
 * Usage:
 *   ServerLogger.info('Proxy', `Request to ${url}`);
 *   ServerLogger.warn('Proxy', `Non-JSON response from ${url}`, err);
 *   ServerLogger.error('Proxy', 'Request failed:', error);
 */

type ServerLogLevel = 'INFO' | 'WARN' | 'ERROR';

function timestamp(): string {
  return new Date().toISOString();
}

function serializeArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) return a.stack || a.message || String(a);
      if (typeof a === 'object' && a !== null) {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(' ');
}

function sanitizeLogValue(value: unknown): unknown {
  if (value == null) return value;

  // Redact API keys and secrets
  if (typeof value === 'string') {
    // Common API key patterns
    const keyPatterns = [
      /[a-zA-Z0-9]{32,}/, // Long random strings (API keys)
      /[a-zA-Z0-9]{24}pk[a-zA-Z0-9]*/, // OpenAI-style keys starting with pk
      /sk-[a-zA-Z0-9]{20,}/, // OpenAI secret keys
      /[a-zA-Z0-9]{20,}==$/, // Base64-encoded secrets
      /[a-zA-Z0-9]{16,}aw[a-zA-Z0-9]*/, // AWS-style keys
    ];

    let redacted = value;
    for (const pattern of keyPatterns) {
      if (pattern.test(redacted)) {
        // Mask all but first 4 and last 4 characters
        const match = redacted.match(pattern);
        if (match) {
          const first4 = match[0].substring(0, 4);
          const last4 = match[0].substring(match[0].length - 4);
          redacted = first4 + '*'.repeat(match[0].length - 8) + last4;
        }
      }
    }
    return redacted;
  }

  if (typeof value === 'object') {
    try {
      // Recursively sanitize objects (but not Error stacks to avoid infinite recursion)
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        // Don't recurse into 'stack' property of Errors
        if (key === 'stack') sanitized[key] = val;
        else sanitized[key] = sanitizeLogValue(val);
      }
      return sanitized;
    } catch {
      return '[object sanitized]';
    }
  }

  return value;
}

function formatMessage(level: ServerLogLevel, source: string, message: string, args: unknown[]): string {
  const sanitizedArgs = args.map(sanitizeLogValue);
  const full = sanitizedArgs.length > 0 ? `${message} ${serializeArgs(sanitizedArgs)}` : message;
  return `[${timestamp()}] [${level}] [${source}] ${full}`;
}

export const ServerLogger = {
  info(source: string, message: string, ...args: unknown[]): void {
    console.log(formatMessage('INFO', source, message, args));
  },

  warn(source: string, message: string, ...args: unknown[]): void {
    console.warn(formatMessage('WARN', source, message, args));
  },

  error(source: string, message: string, ...args: unknown[]): void {
    console.error(formatMessage('ERROR', source, message, args));
  },
};
