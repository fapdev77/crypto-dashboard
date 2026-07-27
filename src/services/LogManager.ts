import { useLogStore, LogLevel } from '../store/logStore';

/**
 * Explicit logging service that routes messages directly to the LogStore
 * without monkey-patching console.log/warn/error.
 *
 * Usage:
 *   LogManager.info('Tag', 'message');
 *   LogManager.warn('Tag', 'message', err);
 *   LogManager.error('Tag', 'message', error);
 */
export class LogManager {
  private static serializeArg(arg: unknown): string {
    if (arg instanceof Error) {
      return arg.stack || arg.message || String(arg);
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }

  private static formatMessage(message: string, args: unknown[]): string {
    if (args.length === 0) return message;
    const extra = args.map(a => LogManager.serializeArg(a)).join(' ');
    return message ? `${message} ${extra}` : extra;
  }

  static info(source: string, message: string, ...args: unknown[]): void {
    const full = LogManager.formatMessage(message, args);
    useLogStore.getState().addLog('INFO', source, full);
  }

  static warn(source: string, message: string, ...args: unknown[]): void {
    const full = LogManager.formatMessage(message, args);
    useLogStore.getState().addLog('WARN', source, full);
  }

  static error(source: string, message: string, ...args: unknown[]): void {
    const full = LogManager.formatMessage(message, args);
    useLogStore.getState().addLog('ERROR', source, full);
  }

  static data(source: string, message: string, ...args: unknown[]): void {
    const full = LogManager.formatMessage(message, args);
    useLogStore.getState().addLog('DATA', source, full);
  }

  static system(source: string, message: string, ...args: unknown[]): void {
    const full = LogManager.formatMessage(message, args);
    useLogStore.getState().addLog('SYSTEM', source, full);
  }
}
