/**
 * Modo visual da aplicação (independente do tema de marca por corretora,
 * que é aplicado via `data-theme` em elementos específicos).
 *
 * "Terminal Dark" é o esquema original; "Terminal Light" usa os mesmos
 * tokens com a paleta clara definida em src/index.css.
 */
export const THEME_MODES = ['dark', 'light'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

/** Mesma chave usada pelo persist do settingsStore (zustand). */
const SETTINGS_STORAGE_KEY = 'terminal-settings';

const THEME_COLOR_BY_MODE: Record<ThemeMode, string> = {
  dark: '#0b0c10',
  light: '#f3f4f7',
};

/**
 * Aplica o modo no elemento raiz. O CSS usa `[data-mode="light"]` para
 * sobrescrever os tokens, então trocar o atributo é suficiente para repintar.
 */
export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-mode', mode);
  root.style.colorScheme = mode;

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', THEME_COLOR_BY_MODE[mode]);
  }
}

/**
 * Lê o modo salvo antes do React montar, evitando um flash de tema errado
 * no primeiro paint (o persist do zustand só hidrata depois do render).
 */
export function readStoredThemeMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'dark';

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return 'dark';
    const parsed = JSON.parse(raw) as { state?: { themeMode?: string } };
    return parsed?.state?.themeMode === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}
