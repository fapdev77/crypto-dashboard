import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Moon, Sun, Sliders, RefreshCw, TrendingUp, DollarSign, Activity, Palette } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../../store/settingsStore';
import {
  SUPPORTED_LOCALES,
  SUPPORTED_FIAT_CURRENCIES,
  DEFAULT_FIAT_RATES,
  type SupportedLocale,
  type SupportedFiatCurrency,
} from '../../services/currency/currencyTypes';
import { CurrencyService } from '../../services/currency/CurrencyService';
import { FlagIcon } from '../ui/FlagIcon';
import type { ThemeMode } from '../../utils/themeMode';
import { formatValue } from '../../utils/formatters';
import { Sparkline } from '../ui/Sparkline';

interface StepPreferencesProps {
  onOpenThemeCustomizer: () => void;
}

const THEME_CARDS: Array<{
  id: ThemeMode;
  icon: React.ElementType;
  labelKey: string;
  defaultLabel: string;
  swatches: [string, string, string];
}> = [
  {
    id: 'dark',
    icon: Moon,
    labelKey: 'theme.terminalDark',
    defaultLabel: 'Terminal Dark',
    swatches: ['#0b0c10', '#161922', '#22c55e'],
  },
  {
    id: 'light',
    icon: Sun,
    labelKey: 'theme.terminalLight',
    defaultLabel: 'Terminal Light',
    swatches: ['#f3f4f7', '#ffffff', '#15803d'],
  },
  {
    id: 'wise-dark',
    icon: Moon,
    labelKey: 'theme.wiseDark',
    defaultLabel: 'Wise Dark',
    swatches: ['#0a0a0a', '#171717', '#2b7fff'],
  },
  {
    id: 'wise-light',
    icon: Sun,
    labelKey: 'theme.wiseLight',
    defaultLabel: 'Wise Light',
    swatches: ['#ffffff', '#ffffff', '#2b7fff'],
  },
];

export function StepPreferences({ onOpenThemeCustomizer }: StepPreferencesProps) {
  const { t, i18n } = useTranslation();
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const fiatCurrency = useSettingsStore((s) => s.fiatCurrency);
  const setFiatCurrency = useSettingsStore((s) => s.setFiatCurrency);
  const fiatRates = useSettingsStore((s) => s.fiatRates);
  const setFiatRates = useSettingsStore((s) => s.setFiatRates);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const customThemeName = useSettingsStore((s) => s.customThemeName);

  // Guarantee strict adherence between displayed language (i18n) and highlighted selector state
  const displayedLocale: SupportedLocale =
    i18n.language && i18n.language in SUPPORTED_LOCALES
      ? (i18n.language as SupportedLocale)
      : locale;

  useEffect(() => {
    if (i18n.language && i18n.language in SUPPORTED_LOCALES && locale !== i18n.language) {
      setLocale(i18n.language as SupportedLocale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const locales = Object.values(SUPPORTED_LOCALES);
  const currencies = Object.values(SUPPORTED_FIAT_CURRENCIES);
  const activeRate = fiatRates?.[fiatCurrency] || DEFAULT_FIAT_RATES[fiatCurrency] || 1;
  const currencyConfig = SUPPORTED_FIAT_CURRENCIES[fiatCurrency] || SUPPORTED_FIAT_CURRENCIES.USD;
  const numberLocale = SUPPORTED_LOCALES[displayedLocale]?.numberLocale || 'en-US';

  const formatPreviewCurrency = (usdAmount: number) => {
    const converted = fiatCurrency === 'USD' ? usdAmount : usdAmount * activeRate;
    const formatted = formatValue(Math.abs(converted), 2, numberLocale);
    const spacing = fiatCurrency === 'BRL' ? ' ' : '';
    return `${currencyConfig.symbol}${spacing}${formatted}`;
  };

  const handleRefreshRates = async () => {
    setIsRefreshingRates(true);
    try {
      const rates = await CurrencyService.fetchFiatRates();
      setFiatRates(rates);
      toast.success(t('currencyWidget.refreshedSuccess', 'Currency rates refreshed successfully'), {
        id: 'onboarding-rates-refresh',
      });
    } catch {
      toast.error(t('currencyWidget.refreshedError', 'Could not refresh live rates. Using cached rates.'), {
        id: 'onboarding-rates-refresh-err',
      });
    } finally {
      setIsRefreshingRates(false);
    }
  };

  const activeThemeLabel =
    themeMode === 'custom'
      ? `${t('theme.custom', 'Custom')} (${customThemeName || 'Custom'})`
      : t(
          THEME_CARDS.find((c) => c.id === themeMode)?.labelKey || 'theme.terminalDark',
          THEME_CARDS.find((c) => c.id === themeMode)?.defaultLabel || 'Terminal Dark'
        );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.06fr_1.14fr] gap-6 items-stretch">
      {/* Left Column: Live Controls for Language, Currency, Theme */}
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-medium text-accent">
            {t('onboarding.step2.kicker', 'Personalization')}
          </p>
          <h3 className="text-lg sm:text-xl font-semibold text-fg tracking-tight text-balance">
            {t('onboarding.step2.title', 'Choose your language, currency, and theme')}
          </h3>
          <p className="text-xs text-fg-muted leading-relaxed">
            {t('onboarding.step2.desc', 'Changes apply immediately across the entire terminal. You can also build custom palettes anytime in Settings.')}
          </p>
        </div>

        {/* Language Grid */}
        <div>
          <label className="block text-xs font-medium text-fg mb-2">
            {t('onboarding.step2.languageLabel', 'Interface Language')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {locales.map((loc) => {
              const isSelected = displayedLocale === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setLocale(loc.id as SupportedLocale)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isSelected
                      ? 'bg-accent/10 border-accent text-fg'
                      : 'bg-elevated border-line text-fg-muted hover:text-fg hover:border-line-strong'
                  }`}
                >
                  <FlagIcon code={loc.id} className="w-5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium truncate flex-1">{loc.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Display Currency Grid */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-xs font-medium text-fg">
              {t('onboarding.step2.currencyLabel', 'Display Currency')}
            </label>
            <button
              type="button"
              onClick={handleRefreshRates}
              disabled={isRefreshingRates}
              className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingRates ? 'animate-spin' : ''}`} />
              <span>{t('onboarding.step2.refreshRates', 'Refresh rates')}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {currencies.map((curr) => {
              const isSelected = fiatCurrency === curr.id;
              return (
                <button
                  key={curr.id}
                  type="button"
                  onClick={() => setFiatCurrency(curr.id as SupportedFiatCurrency)}
                  aria-pressed={isSelected}
                  className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isSelected
                      ? 'bg-accent/10 border-accent text-fg'
                      : 'bg-elevated border-line text-fg-muted hover:text-fg hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FlagIcon code={curr.id} className="w-4 h-3 shrink-0" />
                    <span className="text-xs font-semibold font-mono">{curr.code}</span>
                  </div>
                  <span className="text-[11px] font-mono text-fg-muted">{curr.symbol}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual Theme Grid */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-xs font-medium text-fg">
              {t('onboarding.step2.themeLabel', 'Visual Theme')}
            </label>
            <button
              type="button"
              onClick={onOpenThemeCustomizer}
              className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sliders className="w-3 h-3" />
              <span>{t('onboarding.step2.customThemeHint', 'Custom theme studio in Settings')}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {THEME_CARDS.map((card) => {
              const Icon = card.icon;
              const isSelected = themeMode === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setThemeMode(card.id)}
                  aria-pressed={isSelected}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isSelected
                      ? 'bg-accent/10 border-accent text-fg'
                      : 'bg-elevated border-line text-fg-muted hover:text-fg hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-accent' : ''}`} />
                    <span className="text-xs font-medium truncate">
                      {t(card.labelKey, card.defaultLabel)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {card.swatches.map((hex, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full border border-line-strong"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Live Dashboard KPI Cards Preview (Matches Real Dashboard.tsx) */}
      <div className="bg-canvas border border-line rounded-xl p-5 flex flex-col justify-between gap-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-line">
          <div className="flex items-center gap-2 min-w-0">
            <Palette className="w-4 h-4 text-accent shrink-0" />
            <span className="text-sm font-semibold text-fg truncate">
              {t('onboarding.step2.previewLabel', 'Live Terminal Preview')}
            </span>
          </div>
          <span className="text-xs font-mono text-fg-muted whitespace-nowrap shrink-0">
            {SUPPORTED_LOCALES[displayedLocale]?.code} · {fiatCurrency}
          </span>
        </div>

        <div className="space-y-3 flex-1 flex flex-col justify-center">
          {/* Card 1 Replica: Total Equity */}
          <div className="bg-surface border border-line rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-fg-muted text-[11px] font-medium tracking-wider uppercase">
                {t('dashboardExtra.totalEquityUsd', 'Total Equity ({{currency}})', { currency: fiatCurrency })}
              </span>
              <DollarSign className="w-4 h-4 text-fg-muted/60" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-fg font-mono tabular-nums tracking-tight">
                {formatPreviewCurrency(24850.42)}
              </p>
              <TrendingUp className="w-4 h-4 text-emerald-500/80 shrink-0" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-fg-muted">
              <span className="truncate">{t('dashboardExtra.netBalanceDesc', 'Net balance across all connected exchanges')}</span>
              <span className="font-mono tabular-nums shrink-0">
                1 USD ≈ {activeRate.toFixed(fiatCurrency === 'USD' ? 2 : 3)} {fiatCurrency}
              </span>
            </div>
          </div>

          {/* Card 2 + Card 4 Replicas: Open Positions P&L & Hedge Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Open Positions P&L Replica */}
            <div className="bg-surface border border-line rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-fg-muted text-[10px] font-medium tracking-wider uppercase">
                  {t('dashboardExtra.openPositionsPnl', 'Open Positions P&L')}
                </span>
                <Activity className="w-3.5 h-3.5 text-fg-muted/70" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] text-fg-muted uppercase tracking-wider">
                    {t('dashboardExtra.unrealizedPnlLabel', 'Unrealized P&L')}
                  </div>
                  <p className="text-sm font-bold font-mono tabular-nums text-emerald-500">
                    +{formatPreviewCurrency(942.1)}
                  </p>
                </div>
                <Sparkline data={[12, 18, 15, 28, 26, 39, 44, 52]} color="emerald" width={46} height={18} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] text-fg-muted uppercase tracking-wider">
                    {t('dashboardExtra.realizedPnlLabel', 'Realized P&L')}
                  </div>
                  <p className="text-sm font-bold font-mono tabular-nums text-emerald-500">
                    +{formatPreviewCurrency(306.4)}
                  </p>
                </div>
                <Sparkline data={[10, 14, 19, 17, 25, 29, 34, 41]} color="emerald" width={46} height={18} />
              </div>
            </div>

            {/* Hedge Mode (Inverse) Replica */}
            <div className="bg-surface border border-line rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-fg-muted text-[10px] font-medium tracking-wider uppercase truncate">
                    {t('dashboardExtra.hedgeModeInverseCard', 'Hedge Mode (Inverse)')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className="text-emerald-500">{t('dashboardExtra.hedged', 'Hedged')}: 2</span>
                  <span className="text-fg-muted">|</span>
                  <span className="text-amber-400">{t('dashboardExtra.leveraged', 'Leveraged')}: 1</span>
                </div>
              </div>
              <div className="space-y-1.5 mt-3">
                <div className="flex justify-between text-[11px] font-mono tabular-nums">
                  <span className="text-emerald-500/90">
                    {t('dashboardExtra.prot', 'Prot:')} {formatPreviewCurrency(14200)}
                  </span>
                  <span className="text-fg">
                    {t('dashboardExtra.exp', 'Exp:')} {formatPreviewCurrency(10650.42)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-elevated rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500/80" style={{ width: '57.1%' }} />
                  <div className="h-full bg-fg/80" style={{ width: '42.9%' }} />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-fg-muted">
                  <span className="text-emerald-500/90">57.14%</span>
                  <span className="text-fg">42.86%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-line pt-3 flex items-center justify-between gap-2 text-xs text-fg-muted">
          <span>
            {t('onboarding.step2.previewActiveTheme', 'Active theme: {{theme}}', {
              theme: activeThemeLabel,
            })}
          </span>
          <span className="font-mono text-accent">{SUPPORTED_FIAT_CURRENCIES[fiatCurrency]?.symbol}</span>
        </div>
      </div>
    </div>
  );
}
