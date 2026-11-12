/**
 * Modo visual e paletas da aplicação (independente do tema de marca por corretora,
 * que é aplicado via `data-theme` em elementos específicos).
 *
 * Paletas suportadas:
 * - 'dark': Terminal Dark (esquema original dark)
 * - 'light': Terminal Light (esquema original light)
 * - 'wise-dark': WisePay Fintech Dark (extraído do Figma: #0A0A0A canvas, #171717 surface, #262626 borders)
 * - 'wise-light': WisePay Fintech Light (extraído do Figma: #FFFFFF canvas/surface, #F3F3F5 elevated, #0A0A0A text)
 * - 'custom': Tema customizado pelo usuário com tokens configuráveis
 */

export const THEME_MODES = ['dark', 'light', 'wise-dark', 'wise-light', 'custom'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export interface CustomThemeTokens {
  canvas: string;
  surface: string;
  elevated: string;
  elevatedHover?: string;
  line: string;
  lineStrong?: string;
  fg: string;
  fgMuted: string;
  accent: string;
  accentHover?: string;
  success?: string;
  danger?: string;
  warning?: string;
}

export const DEFAULT_CUSTOM_TOKENS: CustomThemeTokens = {
  canvas: '#0a0a0a',
  surface: '#171717',
  elevated: '#262626',
  elevatedHover: '#2e2e2e',
  line: '#262626',
  lineStrong: '#3a3a3a',
  fg: '#fafafa',
  fgMuted: '#a1a1a1',
  accent: '#2b7fff',
  accentHover: '#1a6ae6',
  success: '#00c950',
  danger: '#d53436',
  warning: '#f0b100',
};

export interface ThemePreset {
  id: string;
  nameKey: string;
  palette: CustomThemeTokens;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'wise-dark',
    nameKey: 'settings.theme.presets.wiseDark',
    palette: {
      canvas: '#0a0a0a',
      surface: '#171717',
      elevated: '#262626',
      elevatedHover: '#2e2e2e',
      line: '#262626',
      lineStrong: '#3a3a3a',
      fg: '#fafafa',
      fgMuted: '#a1a1a1',
      accent: '#2b7fff',
      accentHover: '#1a6ae6',
      success: '#00c950',
      danger: '#d53436',
      warning: '#f0b100',
    },
  },
  {
    id: 'wise-light',
    nameKey: 'settings.theme.presets.wiseLight',
    palette: {
      canvas: '#ffffff',
      surface: '#ffffff',
      elevated: '#f3f3f5',
      elevatedHover: '#eaecef',
      line: '#e5e7eb',
      lineStrong: '#d1d5db',
      fg: '#0a0a0a',
      fgMuted: '#717182',
      accent: '#2b7fff',
      accentHover: '#1a6ae6',
      success: '#00a63e',
      danger: '#d4183d',
      warning: '#fdc700',
    },
  },
  {
    id: 'midnight-navy',
    nameKey: 'settings.theme.presets.midnightNavy',
    palette: {
      canvas: '#0b1120',
      surface: '#111b33',
      elevated: '#1a2747',
      elevatedHover: '#24345d',
      line: '#1e3056',
      lineStrong: '#2b4478',
      fg: '#f1f5f9',
      fgMuted: '#94a3b8',
      accent: '#38bdf8',
      accentHover: '#0ea5e9',
      success: '#34d399',
      danger: '#f87171',
      warning: '#fbbf24',
    },
  },
  {
    id: 'dracula',
    nameKey: 'settings.theme.presets.dracula',
    palette: {
      canvas: '#1e1f29',
      surface: '#282a36',
      elevated: '#343746',
      elevatedHover: '#44475a',
      line: '#44475a',
      lineStrong: '#6272a4',
      fg: '#f8f8f2',
      fgMuted: '#959dc0',
      accent: '#bd93f9',
      accentHover: '#a371f7',
      success: '#50fa7b',
      danger: '#ff5555',
      warning: '#f1fa8c',
    },
  },
];

/** Mesma chave usada pelo persist do settingsStore (zustand). */
const SETTINGS_STORAGE_KEY = 'terminal-settings';

const THEME_COLOR_BY_MODE: Record<ThemeMode, string> = {
  dark: '#0b0c10',
  light: '#f3f4f7',
  'wise-dark': '#0a0a0a',
  'wise-light': '#ffffff',
  custom: '#0a0a0a',
};

/**
 * Retorna se o tema ativo é considerado de fundo claro.
 */
export function isLightTheme(mode: ThemeMode): boolean {
  return mode === 'light' || mode === 'wise-light';
}

const CUSTOM_CSS_VARS = [
  '--canvas',
  '--surface',
  '--elevated',
  '--elevated-hover',
  '--line',
  '--line-strong',
  '--fg',
  '--fg-muted',
  '--accent',
  '--accent-hover',
  '--success',
  '--danger',
  '--warning',
];

/**
 * Limpa propriedades CSS inline injetadas no elemento raiz para que as regras
 * de classe ou atributos data-* voltem a operar normalmente.
 */
function clearCustomCssVariables(root: HTMLElement): void {
  for (const varName of CUSTOM_CSS_VARS) {
    root.style.removeProperty(varName);
  }
}

/**
 * Determina se uma cor hexadecimal é considerada clara para fins de WCAG / color-scheme.
 */
export function isHexColorLight(hex: string): boolean {
  if (!hex || typeof hex !== 'string') return false;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 3 && cleanHex.length !== 6) return false;
  const r = parseInt(cleanHex.length === 3 ? cleanHex[0] + cleanHex[0] : cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.length === 3 ? cleanHex[1] + cleanHex[1] : cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.length === 3 ? cleanHex[2] + cleanHex[2] : cleanHex.substring(4, 6), 16);
  // Fórmula padrão de luminância perceptual ITU-R BT.601
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

/**
 * Aplica o modo e os tokens no elemento raiz.
 */
export function applyThemeMode(mode: ThemeMode, customTokens?: CustomThemeTokens): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const light = mode === 'light' || mode === 'wise-light' || (mode === 'custom' && customTokens ? isHexColorLight(customTokens.canvas) : false);
  const effectiveMode = light ? 'light' : 'dark';

  root.setAttribute('data-mode', effectiveMode);
  root.setAttribute('data-theme-palette', mode);
  root.style.colorScheme = effectiveMode;

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  if (mode === 'custom' && customTokens) {
    root.style.setProperty('--canvas', customTokens.canvas);
    root.style.setProperty('--surface', customTokens.surface);
    root.style.setProperty('--elevated', customTokens.elevated);
    root.style.setProperty('--elevated-hover', customTokens.elevatedHover || customTokens.elevated);
    root.style.setProperty('--line', customTokens.line);
    root.style.setProperty('--line-strong', customTokens.lineStrong || customTokens.line);
    root.style.setProperty('--fg', customTokens.fg);
    root.style.setProperty('--fg-muted', customTokens.fgMuted);
    root.style.setProperty('--accent', customTokens.accent);
    root.style.setProperty('--accent-hover', customTokens.accentHover || customTokens.accent);
    if (customTokens.success) root.style.setProperty('--success', customTokens.success);
    if (customTokens.danger) root.style.setProperty('--danger', customTokens.danger);
    if (customTokens.warning) root.style.setProperty('--warning', customTokens.warning);

    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', customTokens.canvas);
    }
  } else {
    clearCustomCssVariables(root);
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', THEME_COLOR_BY_MODE[mode] ?? '#0b0c10');
    }
  }
}

/**
 * Lê o modo salvo antes do React montar, evitando um flash de tema errado
 * no primeiro paint (o persist do zustand só hidrata depois do render).
 */
export function readStoredThemeMode(): { mode: ThemeMode; customTokens?: CustomThemeTokens } {
  if (typeof localStorage === 'undefined') return { mode: 'dark' };

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { mode: 'dark' };
    const parsed = JSON.parse(raw) as {
      state?: { themeMode?: ThemeMode; customThemeTokens?: CustomThemeTokens };
    };
    const mode = parsed?.state?.themeMode;
    const customTokens = parsed?.state?.customThemeTokens;
    if (mode && (THEME_MODES as readonly string[]).includes(mode)) {
      return { mode, customTokens };
    }
    return { mode: 'dark' };
  } catch {
    return { mode: 'dark' };
  }
}
