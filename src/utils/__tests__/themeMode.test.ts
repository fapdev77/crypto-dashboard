import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyThemeMode,
  readStoredThemeMode,
  THEME_MODES,
  isHexColorLight,
  DEFAULT_CUSTOM_TOKENS,
} from '../themeMode';
import { useSettingsStore } from '../../store/settingsStore';

describe('themeMode (Terminal, WisePay and Custom Themes)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-mode');
    document.documentElement.removeAttribute('data-theme-palette');
    document.documentElement.style.colorScheme = '';
    document.head.innerHTML = '<meta name="theme-color" content="#0b0c10" />';
    useSettingsStore.getState().setThemeMode('dark');
  });

  it('exposes all 5 supported theme modes', () => {
    expect([...THEME_MODES]).toEqual(['dark', 'light', 'wise-dark', 'wise-light', 'custom']);
  });

  it('defaults to Terminal Dark when nothing is stored', () => {
    localStorage.removeItem('terminal-settings');
    expect(readStoredThemeMode()).toEqual({ mode: 'dark' });
  });

  it('reads the mode persisted by the settings store', () => {
    localStorage.setItem(
      'terminal-settings',
      JSON.stringify({ state: { themeMode: 'wise-dark' }, version: 0 }),
    );
    expect(readStoredThemeMode()).toEqual({ mode: 'wise-dark', customTokens: undefined });
  });

  it('reads custom tokens when custom mode is stored', () => {
    const customTokens = { ...DEFAULT_CUSTOM_TOKENS, canvas: '#112233' };
    localStorage.setItem(
      'terminal-settings',
      JSON.stringify({
        state: { themeMode: 'custom', customThemeTokens: customTokens },
        version: 0,
      }),
    );
    expect(readStoredThemeMode()).toEqual({ mode: 'custom', customTokens });
  });

  it('falls back to Terminal Dark when the stored payload is corrupt', () => {
    localStorage.setItem('terminal-settings', '{not-json');
    expect(readStoredThemeMode()).toEqual({ mode: 'dark' });
  });

  it('applies standard modes to document root and meta theme-color', () => {
    applyThemeMode('wise-dark');
    const root = document.documentElement;
    expect(root.getAttribute('data-mode')).toBe('dark');
    expect(root.getAttribute('data-theme-palette')).toBe('wise-dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0a0a0a');

    applyThemeMode('wise-light');
    expect(root.getAttribute('data-mode')).toBe('light');
    expect(root.getAttribute('data-theme-palette')).toBe('wise-light');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#ffffff');
  });

  it('applies custom tokens dynamically via CSS variables', () => {
    const customTokens = {
      ...DEFAULT_CUSTOM_TOKENS,
      canvas: '#0f172a',
      surface: '#1e293b',
      accent: '#38bdf8',
    };

    applyThemeMode('custom', customTokens);
    const root = document.documentElement;
    expect(root.getAttribute('data-theme-palette')).toBe('custom');
    expect(root.style.getPropertyValue('--canvas')).toBe('#0f172a');
    expect(root.style.getPropertyValue('--surface')).toBe('#1e293b');
    expect(root.style.getPropertyValue('--accent')).toBe('#38bdf8');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0f172a');
  });

  it('correctly calculates perceptual luminance via isHexColorLight', () => {
    expect(isHexColorLight('#ffffff')).toBe(true);
    expect(isHexColorLight('#f3f4f7')).toBe(true);
    expect(isHexColorLight('#0a0a0a')).toBe(false);
    expect(isHexColorLight('#000000')).toBe(false);
    expect(isHexColorLight('#1e293b')).toBe(false);
  });

  it('switches the theme through the store, repaints the DOM and persists the choice', () => {
    useSettingsStore.getState().setThemeMode('wise-light');

    expect(useSettingsStore.getState().themeMode).toBe('wise-light');
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme-palette')).toBe('wise-light');

    const persisted = JSON.parse(localStorage.getItem('terminal-settings') || '{}');
    expect(persisted.state.themeMode).toBe('wise-light');

    useSettingsStore.getState().setThemeMode('wise-dark');
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme-palette')).toBe('wise-dark');
  });

  it('keeps the per-exchange brand theme independent from the visual mode', () => {
    const exchangeNode = document.createElement('div');
    exchangeNode.setAttribute('data-theme', 'bybit');
    document.body.appendChild(exchangeNode);

    useSettingsStore.getState().setThemeMode('wise-light');

    expect(exchangeNode.getAttribute('data-theme')).toBe('bybit');
    exchangeNode.remove();
  });
});
