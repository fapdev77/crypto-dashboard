import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Palette,
  Moon,
  Sun,
  Sparkles,
  Sliders,
  Check,
  RotateCcw,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import {
  THEME_MODES,
  THEME_PRESETS,
  DEFAULT_CUSTOM_TOKENS,
  isHexColorLight,
  type ThemeMode,
  type CustomThemeTokens,
} from '../../utils/themeMode';
import { AppTooltip } from '../ui/Tooltip';

const THEME_OPTIONS: Array<{
  id: ThemeMode;
  icon: React.ElementType;
  labelKey: string;
  descKey: string;
  defaultLabel: string;
  defaultDesc: string;
  swatches: [string, string, string]; // [canvas, surface, accent]
}> = [
  {
    id: 'dark',
    icon: Moon,
    labelKey: 'theme.terminalDark',
    descKey: 'theme.terminalDarkDesc',
    defaultLabel: 'Terminal Dark',
    defaultDesc: 'Interface escura de alto contraste para longas sessões',
    swatches: ['#0b0c10', '#161922', '#22c55e'],
  },
  {
    id: 'light',
    icon: Sun,
    labelKey: 'theme.terminalLight',
    descKey: 'theme.terminalLightDesc',
    defaultLabel: 'Terminal Light',
    defaultDesc: 'Interface clara e nítida para luz diurna',
    swatches: ['#f3f4f7', '#ffffff', '#15803d'],
  },
  {
    id: 'wise-dark',
    icon: Sparkles,
    labelKey: 'theme.wiseDark',
    descKey: 'theme.wiseDarkDesc',
    defaultLabel: 'Wise Dark',
    defaultDesc: 'WisePay Fintech — Obsidian profundo com acentos de foco',
    swatches: ['#0a0a0a', '#171717', '#2b7fff'],
  },
  {
    id: 'wise-light',
    icon: Palette,
    labelKey: 'theme.wiseLight',
    descKey: 'theme.wiseLightDesc',
    defaultLabel: 'Wise Light',
    defaultDesc: 'WisePay Fintech — Branco puro com bordas suaves e obsidian',
    swatches: ['#ffffff', '#ffffff', '#2b7fff'],
  },
  {
    id: 'custom',
    icon: Sliders,
    labelKey: 'theme.custom',
    descKey: 'theme.customDesc',
    defaultLabel: 'Customizado',
    defaultDesc: 'Paleta personalizada configurável por token de cor',
    swatches: ['#0a0a0a', '#171717', '#2b7fff'],
  },
];

interface TokenField {
  key: keyof CustomThemeTokens;
  labelKey: string;
  defaultLabel: string;
}

const TOKEN_FIELDS: TokenField[] = [
  { key: 'canvas', labelKey: 'settings.theme.canvas', defaultLabel: 'Fundo (Canvas)' },
  { key: 'surface', labelKey: 'settings.theme.surface', defaultLabel: 'Cards (Surface)' },
  { key: 'elevated', labelKey: 'settings.theme.elevated', defaultLabel: 'Entradas (Elevated)' },
  { key: 'line', labelKey: 'settings.theme.line', defaultLabel: 'Bordas (Line)' },
  { key: 'fg', labelKey: 'settings.theme.fg', defaultLabel: 'Texto Principal' },
  { key: 'fgMuted', labelKey: 'settings.theme.fgMuted', defaultLabel: 'Texto Secundário' },
  { key: 'accent', labelKey: 'settings.theme.accent', defaultLabel: 'Destaque (Accent)' },
  { key: 'success', labelKey: 'settings.theme.success', defaultLabel: 'Sucesso (Verde)' },
  { key: 'danger', labelKey: 'settings.theme.danger', defaultLabel: 'Alerta / Prejuízo' },
  { key: 'warning', labelKey: 'settings.theme.warning', defaultLabel: 'Aviso (Amarelo)' },
];

export function ThemeSettingsCard() {
  const { t } = useTranslation();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const customThemeTokens = useSettingsStore((s) => s.customThemeTokens);
  const setCustomThemeTokens = useSettingsStore((s) => s.setCustomThemeTokens);
  const resetCustomThemeTokens = useSettingsStore((s) => s.resetCustomThemeTokens);

  const [activeTab, setActiveTab] = useState<'themes' | 'customizer'>('themes');

  const handleSelectMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    const option = THEME_OPTIONS.find((o) => o.id === mode);
    toast.success(
      t('toasts.themeSet', 'Tema alterado para {{theme}}', {
        theme: option ? t(option.labelKey, option.defaultLabel) : mode,
      }),
      { id: 'theme-mode-change' }
    );
  };

  const handleApplyPreset = (presetId: string, palette: CustomThemeTokens, nameKey: string) => {
    setCustomThemeTokens(palette);
    if (themeMode !== 'custom') {
      setThemeMode('custom');
    }
    const presetName = t(nameKey, presetId);
    toast.success(
      t('settings.theme.presetApplied', 'Predefinição {{name}} aplicada ao tema customizado.', {
        name: presetName,
      }),
      { id: 'theme-preset-applied' }
    );
  };

  const handleUpdateToken = (tokenKey: keyof CustomThemeTokens, value: string) => {
    setCustomThemeTokens({ [tokenKey]: value });
  };

  const handleResetTokens = () => {
    resetCustomThemeTokens();
    toast.success(
      t('settings.theme.resetConfirm', 'Paleta customizada restaurada para o padrão com sucesso.'),
      { id: 'theme-reset-tokens' }
    );
  };

  // Determine button text color on accent preview
  const accentIsLight = isHexColorLight(customThemeTokens.accent || '#2b7fff');
  const accentTextColor = accentIsLight ? '#0a0a0a' : '#ffffff';

  return (
    <div className="bg-surface border border-line rounded-xl p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-fg flex items-center gap-2">
            <Palette className="w-4 h-4 text-accent" />
            {t('settings.theme.title', 'Aparência e Temas')}
          </h3>
          <p className="text-fg-muted text-xs mt-1">
            {t(
              'settings.theme.subtitle',
              'Alterne entre os modos oficiais ou personalize completamente a sua própria paleta de cores.'
            )}
          </p>
        </div>
      </div>

      {/* Tabs / Sub-nav */}
      <div className="flex border-b border-line mb-4 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('themes')}
          className={`pb-2 px-1 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'themes'
              ? 'border-accent text-accent'
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          {t('settings.theme.selectTheme', 'Temas do Sistema')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('customizer')}
          className={`pb-2 px-1 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'customizer'
              ? 'border-accent text-accent'
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          {t('settings.theme.customTokensTitle', 'Personalização de Cores')}
          {themeMode === 'custom' && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          )}
        </button>
      </div>

      {/* Content based on tab */}
      {activeTab === 'themes' ? (
        <div className="space-y-4 flex-1 flex flex-col">
          {/* Theme selection grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = themeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectMode(opt.id)}
                  className={`text-left p-3 rounded-lg border transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-accent bg-accent/10 shadow-xs'
                      : 'border-line bg-elevated/40 hover:bg-elevated hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center ${
                          isSelected ? 'bg-accent text-white' : 'bg-surface text-fg-muted'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium text-fg">
                        {t(opt.labelKey, opt.defaultLabel)}
                      </span>
                    </div>

                    {/* Swatch mini preview */}
                    <div className="flex items-center gap-1 bg-surface/80 px-1.5 py-1 rounded border border-line">
                      {opt.swatches.map((color, idx) => (
                        <span
                          key={idx}
                          className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-fg-muted line-clamp-2 leading-relaxed">
                    {t(opt.descKey, opt.defaultDesc)}
                  </p>

                  {isSelected && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Presets Section */}
          <div className="pt-2 border-t border-line">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-fg flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                {t('settings.theme.presetsTitle', 'Predefinições Prontas (Carregar no Custom)')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {THEME_PRESETS.map((preset) => {
                const label = t(preset.nameKey, preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id, preset.palette, preset.nameKey)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-elevated border border-line hover:border-accent/50 text-left transition-colors"
                  >
                    <span className="text-xs text-fg font-medium truncate">{label}</span>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-line"
                        style={{ backgroundColor: preset.palette.canvas }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-line"
                        style={{ backgroundColor: preset.palette.surface }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: preset.palette.accent }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Customizer Tab */
        <div className="space-y-4 flex-1 flex flex-col">
          {themeMode !== 'custom' && (
            <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20 text-xs text-fg flex items-center justify-between">
              <span className="text-[11px] text-fg leading-snug">
                {t(
                  'settings.theme.notCustomWarning',
                  'O tema atual é oficial. Ao ajustar qualquer cor, a aplicação mudará para o tema Customizado.'
                )}
              </span>
              <button
                type="button"
                onClick={() => handleSelectMode('custom')}
                className="shrink-0 px-2 py-1 text-[11px] font-medium bg-accent text-white rounded hover:bg-accent-hover transition-colors ml-2"
              >
                {t('settings.theme.activateCustom', 'Ativar Custom')}
              </button>
            </div>
          )}

          {/* Color Tokens Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
            {TOKEN_FIELDS.map((f) => {
              const val = (customThemeTokens[f.key] as string) || '#000000';
              return (
                <div
                  key={f.key}
                  className="flex items-center justify-between p-2 rounded-lg bg-elevated/60 border border-line"
                >
                  <div className="min-w-0 pr-2">
                    <label className="text-[11px] font-medium text-fg block truncate">
                      {t(f.labelKey, f.defaultLabel)}
                    </label>
                    <span className="text-[10px] font-mono text-fg-muted uppercase">
                      {f.key}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="color"
                      value={val}
                      onChange={(e) => {
                        handleUpdateToken(f.key, e.target.value);
                        if (themeMode !== 'custom') setThemeMode('custom');
                      }}
                      className="w-7 h-7 rounded border border-line cursor-pointer bg-transparent p-0 overflow-hidden"
                      title={t(f.labelKey, f.defaultLabel)}
                    />
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const next = e.target.value;
                        handleUpdateToken(f.key, next);
                        if (themeMode !== 'custom') setThemeMode('custom');
                      }}
                      className="w-18 px-1.5 py-0.5 text-[11px] font-mono text-fg bg-surface border border-line rounded focus:outline-hidden focus:border-accent text-center"
                      maxLength={7}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Mini Preview Box */}
          <div className="pt-2 border-t border-line">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-fg flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-accent" />
                {t('settings.theme.previewTitle', 'Prévia em Tempo Real da Paleta')}
              </span>
              <button
                type="button"
                onClick={handleResetTokens}
                className="text-[11px] text-fg-muted hover:text-accent flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                {t('settings.theme.resetBtn', 'Restaurar Padrão')}
              </button>
            </div>

            {/* Simulated mini card */}
            <div
              className="p-3 rounded-xl border transition-colors shadow-xs"
              style={{
                backgroundColor: customThemeTokens.surface || '#171717',
                borderColor: customThemeTokens.line || '#262626',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: customThemeTokens.success || '#00c950' }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: customThemeTokens.fg || '#fafafa' }}
                  >
                    BTC / USDT Hedge
                  </span>
                </div>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: customThemeTokens.elevated || '#262626',
                    borderColor: customThemeTokens.line || '#262626',
                    color: customThemeTokens.fgMuted || '#a1a1a1',
                  }}
                >
                  OKX Perp
                </span>
              </div>

              <div className="flex items-end justify-between mt-2 pt-2 border-t" style={{ borderColor: customThemeTokens.line || '#262626' }}>
                <div>
                  <span
                    className="text-[10px] block"
                    style={{ color: customThemeTokens.fgMuted || '#a1a1a1' }}
                  >
                    {t('settings.theme.previewMetricLabel', 'Retorno Estimado (24h)')}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-xs font-semibold">
                    <TrendingUp
                      className="w-3 h-3"
                      style={{ color: customThemeTokens.success || '#00c950' }}
                    />
                    <span style={{ color: customThemeTokens.success || '#00c950' }}>
                      +4.82% ($1,248.50)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-2.5 py-1 text-[11px] font-medium rounded-md shadow-xs transition-opacity"
                  style={{
                    backgroundColor: customThemeTokens.accent || '#2b7fff',
                    color: accentTextColor,
                  }}
                >
                  {t('settings.theme.previewActionButton', 'Executar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
