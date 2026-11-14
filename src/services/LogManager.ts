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
      // Check if it is a DOM Event
      if ('target' in arg && 'type' in arg && typeof (arg as any).type === 'string') {
        const evt = arg as any;
        const targetTag = evt.target?.tagName ? `<${evt.target.tagName.toLowerCase()}>` : 'unknown target';
        return `[Event: ${evt.type} on ${targetTag}]`;
      }
      try {
        const json = JSON.stringify(arg);
        if (json === '{}') {
          // If all keys had undefined values (like { filename: undefined, ... }), do not output {}
          const nonNullEntries = Object.entries(arg).filter(([_, v]) => v !== undefined && v !== null);
          if (nonNullEntries.length === 0) {
            return '';
          }
        }
        return json;
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }

  private static formatMessage(message: string, args: unknown[]): string {
    if (args.length === 0) return message;
    const extraParts = args
      .map(a => LogManager.serializeArg(a))
      .filter(s => s && s.trim().length > 0 && s !== '{}');
    const extra = extraParts.join(' ');
    return message ? (extra ? `${message} ${extra}` : message) : extra;
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
