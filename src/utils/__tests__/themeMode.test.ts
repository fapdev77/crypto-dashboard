import { describe, it, expect, beforeEach } from 'vitest';
import { applyThemeMode, readStoredThemeMode, THEME_MODES } from '../themeMode';
import { useSettingsStore } from '../../store/settingsStore';

describe('themeMode (Terminal Dark / Terminal Light)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-mode');
    document.documentElement.style.colorScheme = '';
    document.head.innerHTML = '<meta name="theme-color" content="#0b0c10" />';
    useSettingsStore.getState().setThemeMode('dark');
  });

  it('exposes exactly the two supported modes', () => {
    expect([...THEME_MODES]).toEqual(['dark', 'light']);
  });

  it('defaults to Terminal Dark when nothing is stored', () => {
    expect(readStoredThemeMode()).toBe('dark');
  });

  it('reads the mode persisted by the settings store', () => {
    localStorage.setItem(
      'terminal-settings',
      JSON.stringify({ state: { themeMode: 'light' }, version: 0 }),
    );
    expect(readStoredThemeMode()).toBe('light');
  });

  it('falls back to Terminal Dark when the stored payload is corrupt', () => {
    localStorage.setItem('terminal-settings', '{not-json');
    expect(readStoredThemeMode()).toBe('dark');
  });

  it('applies the mode to the document root and the browser chrome color', () => {
    applyThemeMode('light');

    const root = document.documentElement;
    expect(root.getAttribute('data-mode')).toBe('light');
    expect(root.style.colorScheme).toBe('light');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#f3f4f7');

    applyThemeMode('dark');
    expect(root.getAttribute('data-mode')).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0b0c10');
  });

  it('switches the theme through the store, repaints the DOM and persists the choice', () => {
    useSettingsStore.getState().setThemeMode('light');

    expect(useSettingsStore.getState().themeMode).toBe('light');
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');

    const persisted = JSON.parse(localStorage.getItem('terminal-settings') || '{}');
    expect(persisted.state.themeMode).toBe('light');

    useSettingsStore.getState().setThemeMode('dark');
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
  });

  it('keeps the per-exchange brand theme independent from the visual mode', () => {
    // O tema de corretora vive em data-theme; trocar o modo não deve removê-lo.
    const exchangeNode = document.createElement('div');
    exchangeNode.setAttribute('data-theme', 'bybit');
    document.body.appendChild(exchangeNode);

    useSettingsStore.getState().setThemeMode('light');

    expect(exchangeNode.getAttribute('data-theme')).toBe('bybit');
    exchangeNode.remove();
  });
});
