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

function formatMessage(level: ServerLogLevel, source: string, message: string, args: unknown[]): string {
  const full = args.length > 0 ? `${message} ${serializeArgs(args)}` : message;
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
