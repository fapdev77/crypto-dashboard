import { describe, it, expect, beforeEach } from 'vitest';
import { LogManager } from '../LogManager';
import { useLogStore } from '../../store/logStore';

describe('LogManager', () => {
  beforeEach(() => {
    useLogStore.setState({ entries: [] });
  });

  // ---------------------------------------------------------------------------
  // Log levels
  // ---------------------------------------------------------------------------
  describe('log levels', () => {
    it('info() should add an INFO entry', () => {
      LogManager.info('TestSrc', 'hello world');
      const { entries } = useLogStore.getState();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe('INFO');
      expect(entries[0].source).toBe('TestSrc');
      expect(entries[0].message).toBe('hello world');
    });

    it('warn() should add a WARN entry', () => {
      LogManager.warn('WarnSrc', 'caution');
      const { entries } = useLogStore.getState();
      expect(entries[0].level).toBe('WARN');
    });

    it('error() should add an ERROR entry', () => {
      LogManager.error('ErrSrc', 'fail');
      const { entries } = useLogStore.getState();
      expect(entries[0].level).toBe('ERROR');
    });

    it('data() should add a DATA entry', () => {
      LogManager.data('DataSrc', 'payload');
      const { entries } = useLogStore.getState();
      expect(entries[0].level).toBe('DATA');
    });

    it('system() should add a SYSTEM entry', () => {
      LogManager.system('SysSrc', 'boot');
      const { entries } = useLogStore.getState();
      expect(entries[0].level).toBe('SYSTEM');
    });

    it('should generate an id and timestamp for each entry', () => {
      LogManager.info('Src', 'msg');
      const entry = useLogStore.getState().entries[0];
      expect(entry.id).toBeDefined();
      expect(typeof entry.id).toBe('string');
      expect(entry.timestamp).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // serializeArg — static private, tested through the public API
  // ---------------------------------------------------------------------------
  describe('serializeArg (via rest args)', () => {
    it('should serialize an Error with stack', () => {
      const err = new Error('boom');
      LogManager.error('Src', 'err:', err);
      const msg = useLogStore.getState().entries[0].message;
      expect(msg).toContain('err:');
      expect(msg).toContain('Error: boom');
      // Stack trace contains file paths or 'at' — sufficient to confirm stack is included
      expect(msg).toMatch(/Error: boom\s+at/);
    });

    it('should serialize an Error without stack', () => {
      const err = new Error('no-stack');
      // Force stack to undefined to simulate environments that don't capture it
      err.stack = undefined;
      LogManager.error('Src', 'err:', err);
      const msg = useLogStore.getState().entries[0].message;
      expect(msg).toContain('no-stack');
    });

    it('should JSON.stringify a plain object', () => {
      LogManager.info('Src', 'data', { key: 'val', num: 42 });
      const msg = useLogStore.getState().entries[0].message;
      expect(msg).toBe('data {"key":"val","num":42}');
    });

    it('should handle an object with circular reference gracefully', () => {
      const obj: Record<string, unknown> = { name: 'circle' };
      obj.self = obj;
      LogManager.info('Src', 'circular', obj);
      const msg = useLogStore.getState().entries[0].message;
      // JSON.stringify throws on circular refs, serializeArg falls back to String(obj) = "[object Object]"
      expect(msg).toBe('circular [object Object]');
    });

    it('should serialize null and undefined', () => {
      LogManager.info('Src', 'null:', null);
      LogManager.info('Src', 'undefined:', undefined);
      const entries = useLogStore.getState().entries;
      expect(entries[0].message).toBe('null: null');
      expect(entries[1].message).toBe('undefined: undefined');
    });

    it('should serialize a number', () => {
      LogManager.info('Src', 'count', 42);
      expect(useLogStore.getState().entries[0].message).toBe('count 42');
    });

    it('should serialize a boolean', () => {
      LogManager.info('Src', 'flag', true);
      expect(useLogStore.getState().entries[0].message).toBe('flag true');
    });

    it('should serialize an array', () => {
      LogManager.info('Src', 'list', [1, 2, 3]);
      expect(useLogStore.getState().entries[0].message).toBe('list [1,2,3]');
    });
  });

  // ---------------------------------------------------------------------------
  // formatMessage — message + various argument combinations
  // ---------------------------------------------------------------------------
  describe('formatMessage', () => {
    it('should log message with no args', () => {
      LogManager.info('Src', 'just a message');
      expect(useLogStore.getState().entries[0].message).toBe('just a message');
    });

    it('should log message with multiple args', () => {
      LogManager.info('Src', 'values', 10, 20, 30);
      expect(useLogStore.getState().entries[0].message).toBe('values 10 20 30');
    });

    it('should log only the extra args when message is empty', () => {
      LogManager.info('Src', '', 'fallback');
      const msg = useLogStore.getState().entries[0].message;
      // empty string is falsy, so message='', extra='fallback' → 'fallback'
      expect(msg).toBe('fallback');
    });

    it('should log empty string when both message and args are empty', () => {
      LogManager.info('Src', '');
      expect(useLogStore.getState().entries[0].message).toBe('');
    });

    it('should handle mixed types in args', () => {
      LogManager.info('Src', 'mix', 'str', 99, { x: 1 }, true);
      const msg = useLogStore.getState().entries[0].message;
      expect(msg).toBe('mix str 99 {"x":1} true');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('should keep source separate from message', () => {
      LogManager.warn('Connection-OKX', 'rate limit hit');
      const entry = useLogStore.getState().entries[0];
      expect(entry.source).toBe('Connection-OKX');
      expect(entry.message).toBe('rate limit hit');
    });

    it('should handle nested Error objects gracefully', () => {
      const inner = new Error('inner failure');
      LogManager.error('Src', 'nested', inner);
      const msg = useLogStore.getState().entries[0].message;
      expect(msg).toContain('nested');
      expect(msg).toContain('inner failure');
    });

    it('should handle deeply nested serializable objects', () => {
      const deep = { level1: { level2: { level3: { value: 'deep' } } } };
      LogManager.data('Src', 'deep', deep);
      const msg = useLogStore.getState().entries[0].message;
      expect(msg).toBe('deep {"level1":{"level2":{"level3":{"value":"deep"}}}}');
    });

    it('should not mutate shared state between successive calls', () => {
      LogManager.info('Src', 'first');
      LogManager.error('Src', 'second');
      const entries = useLogStore.getState().entries;
      expect(entries).toHaveLength(2);
      expect(entries[0].level).toBe('INFO');
      expect(entries[1].level).toBe('ERROR');
    });
  });
});
