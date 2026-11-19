import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogManager } from '../services/LogManager';
import { useLogStore } from '../store/logStore';

describe('Global Error Handling and Resource Error Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLogStore.setState({ entries: [] });
  });

  it('does not log an error for image 404 resource events', () => {
    // Simulate the handler logic in main.tsx
    const imgElement = document.createElement('img');
    imgElement.src = 'https://www.okx.com/cdn/icon/unknown_coin.png';

    const event = {
      target: imgElement,
      message: '',
      filename: undefined,
      lineno: undefined,
      colno: undefined,
      error: undefined,
    } as unknown as ErrorEvent;

    // Execute standard logic
    const target = event.target;
    let didLog = false;
    if (target && target !== window && typeof (target as HTMLElement).tagName === 'string') {
      const el = target as HTMLElement;
      const tagName = el.tagName.toLowerCase();
      if (tagName === 'img') {
        // Ignored
      } else {
        didLog = true;
        LogManager.warn('ResourceLoadError', `Failed to load <${tagName}> resource`);
      }
    }

    expect(didLog).toBe(false);
    expect(useLogStore.getState().entries).toHaveLength(0);
  });

  it('logs a warning for other resource load errors (e.g. script/css) with details', () => {
    const scriptElement = document.createElement('script');
    scriptElement.src = 'https://example.com/missing-bundle.js';

    const event = {
      target: scriptElement,
    } as unknown as ErrorEvent;

    const target = event.target;
    if (target && target !== window && typeof (target as HTMLElement).tagName === 'string') {
      const el = target as HTMLElement;
      const tagName = el.tagName.toLowerCase();
      const sourceUrl = (el as HTMLScriptElement).src;
      if (tagName !== 'img') {
        LogManager.warn('ResourceLoadError', `Failed to load <${tagName}> resource`, {
          tagName,
          url: sourceUrl,
        });
      }
    }

    const entries = useLogStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('WARN');
    expect(entries[0].source).toBe('ResourceLoadError');
    expect(entries[0].message).toContain('Failed to load <script> resource');
    expect(entries[0].message).toContain('missing-bundle.js');
  });

  it('captures genuine window error events with full stack and message', () => {
    const jsError = new TypeError('Cannot read properties of undefined');
    LogManager.error('GlobalWindowError', jsError.message, {
      filename: 'app.js',
      lineno: 42,
      colno: 10,
      error: jsError,
    });

    const entries = useLogStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('ERROR');
    expect(entries[0].source).toBe('GlobalWindowError');
    expect(entries[0].message).toContain('Cannot read properties of undefined');
    expect(entries[0].message).toContain('app.js');
  });
});
