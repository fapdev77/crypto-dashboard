import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  PieChart,
  Table2,
  SlidersHorizontal,
  EyeOff,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  Activity,
  BarChart2,
  Wallet,
  Search,
  Lock,
  KeyRound,
  Moon,
  Sun,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { DASHBOARD_ZONES, type DashboardZoneId } from './onboardingData';
import { Sparkline } from '../ui/Sparkline';
import { ExchangeIcon } from '../ui/ExchangeIcon';
import { CoinIcon } from '../ui/CoinIcon';
import { useSettingsStore } from '../../store/settingsStore';
import {
  DEFAULT_FIAT_RATES,
  SUPPORTED_FIAT_CURRENCIES,
  SUPPORTED_LOCALES,
} from '../../services/currency/currencyTypes';
import { formatValue } from '../../utils/formatters';
import { isHexColorLight } from '../../utils/themeMode';
import { EXCHANGE_COLORS, EXCHANGE_COLORS_LIGHT } from '../analytics/MacroCapitalChart';

const ZONE_ICONS: Record<DashboardZoneId, React.ElementType> = {
  kpis: LayoutDashboard,
  charts: PieChart,
  hierarchy: Table2,
  controls: SlidersHorizontal,
};

export function StepDashboardExplorer() {
  const { t, i18n } = useTranslation();
  const [selectedZone, setSelectedZone] = useState<DashboardZoneId>(DASHBOARD_ZONES[0].id);
  const [isAutoCycling, setIsAutoCycling] = useState(true);

  const fiatCurrency = useSettingsStore((s) => s.fiatCurrency);
  const fiatRates = useSettingsStore((s) => s.fiatRates);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const customTokens = useSettingsStore((s) => s.customThemeTokens);

  const isLight =
    themeMode === 'light' ||
    themeMode === 'wise-light' ||
    (themeMode === 'custom' && isHexColorLight(customTokens.canvas));
  const exchangePalette = isLight ? EXCHANGE_COLORS_LIGHT : EXCHANGE_COLORS;

  const activeLocale =
    i18n.language && i18n.language in SUPPORTED_LOCALES ? i18n.language : 'en-US';
  const localeConfig = SUPPORTED_LOCALES[activeLocale as keyof typeof SUPPORTED_LOCALES];
  const currencyConfig =
    SUPPORTED_FIAT_CURRENCIES[fiatCurrency] || SUPPORTED_FIAT_CURRENCIES.USD;
  const activeRate = fiatRates?.[fiatCurrency] || DEFAULT_FIAT_RATES[fiatCurrency] || 1;

  const formatMoney = (usdAmount: number, decimals = 0) => {
    const val = fiatCurrency === 'USD' ? usdAmount : usdAmount * activeRate;
    const spacing = fiatCurrency === 'BRL' ? ' ' : '';
    return `${currencyConfig.symbol}${spacing}${formatValue(val, decimals, localeConfig?.numberLocale || 'en-US')}`;
  };

  useEffect(() => {
    if (!isAutoCycling) return;
    const timer = window.setInterval(() => {
      setSelectedZone((prev) => {
        const idx = DASHBOARD_ZONES.findIndex((z) => z.id === prev);
        const nextIdx = (idx + 1) % DASHBOARD_ZONES.length;
        return DASHBOARD_ZONES[nextIdx].id;
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isAutoCycling]);

  const handleSelectZone = (zoneId: DashboardZoneId) => {
    setIsAutoCycling(false);
    setSelectedZone(zoneId);
  };

  const activeMeta = DASHBOARD_ZONES.find((z) => z.id === selectedZone) || DASHBOARD_ZONES[0];

  const zoneBoxClass = (zoneId: DashboardZoneId) =>
    `w-full rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
      selectedZone === zoneId
        ? 'border-accent ring-1 ring-accent/40 bg-accent/5'
        : 'border-line bg-surface hover:border-line-strong'
    }`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.25fr] gap-5 items-stretch">
      {/* Left Column: Zone Selector */}
      <div className="flex flex-col justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-accent">
            {t('onboarding.step3.kicker', 'Main Workspace')}
          </p>
          <h3 className="text-lg sm:text-xl font-semibold text-fg tracking-tight text-balance">
            {t('onboarding.step3.title', 'Understand the Main Dashboard at a glance')}
          </h3>
          <p className="text-xs text-fg-muted leading-relaxed">
            {t(
              'onboarding.step3.desc',
              'Select any region below to inspect how capital, risk, and global toolbar controls are organized.'
            )}
          </p>
        </div>

        <div className="space-y-2">
          {DASHBOARD_ZONES.map((zone) => {
            const Icon = ZONE_ICONS[zone.id];
            const isSelected = selectedZone === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => handleSelectZone(zone.id)}
                aria-pressed={isSelected}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? 'bg-accent/10 border-accent text-fg'
                    : 'bg-elevated border-line text-fg-muted hover:text-fg hover:border-line-strong'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface text-fg-muted border-line'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-fg truncate">
                      {t(zone.titleKey, zone.defaultTitle)}
                    </span>
                    {isSelected && isAutoCycling ? (
                      <Loader2 className="w-3.5 h-3.5 shrink-0 text-accent/80 animate-spin" aria-hidden="true" />
                    ) : (
                      <ArrowUpRight
                        className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                          isSelected ? 'text-accent opacity-100' : 'opacity-40'
                        }`}
                      />
                    )}
                  </div>
                  <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                    {t(zone.descKey, zone.defaultDesc)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Authentic Miniature Replica of Real Dashboard */}
      <div className="bg-canvas border border-line rounded-xl p-4 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-line">
          <span className="text-xs font-semibold text-fg">
            {t('onboarding.step3.previewBadge', 'Interactive Dashboard Map')}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-fg-muted">
            {isAutoCycling && (
              <Loader2 className="w-3 h-3 text-accent/80 animate-spin" aria-hidden="true" />
            )}
            <span>
              {isAutoCycling
                ? t('onboarding.autoCycleActive', 'Auto-cycling every 3s · Click to inspect')
                : t('onboarding.autoCyclePaused', 'Auto-cycle paused')}
            </span>
          </span>
        </div>

        <div className="space-y-2.5 flex-1 flex flex-col justify-center">
          {/* 1. Real App Header Bar Replica */}
          <button
            type="button"
            onClick={() => handleSelectZone('controls')}
            className={`${zoneBoxClass('controls')} px-3 py-2 flex items-center justify-between gap-2`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <LayoutDashboard className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="text-xs font-semibold text-fg truncate">
                {t('nav.dashboard', 'Dashboard')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-fg-muted">
              <span className="px-1.5 py-0.5 rounded bg-elevated border border-line text-fg">
                {localeConfig?.code || 'EN'} · {fiatCurrency}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-elevated border border-line inline-flex items-center gap-1">
                {isLight ? <Sun className="w-2.5 h-2.5 text-accent" /> : <Moon className="w-2.5 h-2.5 text-accent" />}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-elevated border border-line hidden sm:inline-flex items-center">
                <HelpCircle className="w-2.5 h-2.5 text-fg-muted" />
              </span>
              <span className="px-1.5 py-0.5 rounded bg-elevated border border-line inline-flex items-center">
                <EyeOff className="w-2.5 h-2.5 text-accent" />
              </span>
            </div>
          </button>

          {/* 2. Real Top 4 KPI Cards Replica */}
          <button
            type="button"
            onClick={() => handleSelectZone('kpis')}
            className={`${zoneBoxClass('kpis')} p-2`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Card 1: Total Equity */}
              <div className="bg-elevated border border-line rounded-lg p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-medium text-fg-muted uppercase truncate">
                    {t('dashboardExtra.totalEquityUsd', 'Total Equity ({{currency}})', {
                      currency: fiatCurrency,
                    })}
                  </span>
                  <DollarSign className="w-3 h-3 text-fg-muted/60 shrink-0" />
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xs font-bold font-mono text-fg tabular-nums truncate">
                    {formatMoney(24850)}
                  </span>
                  <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
                </div>
              </div>

              {/* Card 2: Open Positions P&L */}
              <div className="bg-elevated border border-line rounded-lg p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-medium text-fg-muted uppercase truncate">
                    {t('dashboardExtra.openPositionsPnl', 'Open Positions P&L')}
                  </span>
                  <Activity className="w-3 h-3 text-fg-muted/70 shrink-0" />
                </div>
                <div className="flex items-center justify-between gap-1 mt-1">
                  <span className="text-xs font-bold font-mono text-emerald-500 tabular-nums">
                    +{formatMoney(942)}
                  </span>
                  <Sparkline data={[14, 18, 16, 26, 32, 41]} color="emerald" width={30} height={12} />
                </div>
              </div>

              {/* Card 3: Active Positions */}
              <div className="bg-elevated border border-line rounded-lg p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-medium text-fg-muted uppercase truncate">
                    {t('dashboardExtra.activePositionsCount', 'Active Positions')}
                  </span>
                  <BarChart2 className="w-3 h-3 text-accent/70 shrink-0" />
                </div>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-semibold">
                    <span className="text-emerald-500">4L</span>
                    <span className="text-red-500">2S</span>
                  </div>
                  <div className="h-1 w-full bg-surface rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: '67%' }} />
                    <div className="h-full bg-red-500" style={{ width: '33%' }} />
                  </div>
                </div>
              </div>

              {/* Card 4: Hedge Mode (Inverse) */}
              <div className="bg-elevated border border-line rounded-lg p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-medium text-fg-muted uppercase truncate">
                    {t('dashboardExtra.hedgeModeInverseCard', 'Hedge Mode')}
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-mono">
                    <span className="text-emerald-500">57%</span>
                    <span className="text-fg-muted">43%</span>
                  </div>
                  <div className="h-1 w-full bg-surface rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500/80" style={{ width: '57%' }} />
                    <div className="h-full bg-fg/75" style={{ width: '43%' }} />
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* 3. Real 2-Column Charts Replica (MacroCapitalChart + CrossExchangeAssetsChart) */}
          <button
            type="button"
            onClick={() => handleSelectZone('charts')}
            className={`${zoneBoxClass('charts')} p-2.5`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Macro Capital Donut */}
              <div className="bg-elevated border border-line rounded-lg p-2.5 flex items-center gap-3">
                <svg viewBox="0 0 64 64" className="w-12 h-12 shrink-0 -rotate-90" aria-hidden="true">
                  <circle
                    cx="32"
                    cy="32"
                    r="22"
                    fill="none"
                    stroke={exchangePalette.bybit}
                    strokeWidth="8"
                    strokeDasharray="60 138"
                    strokeDashoffset="0"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="22"
                    fill="none"
                    stroke={exchangePalette.bitget}
                    strokeWidth="8"
                    strokeDasharray="44 138"
                    strokeDashoffset="-63"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="22"
                    fill="none"
                    stroke={exchangePalette.okx}
                    strokeWidth="8"
                    strokeDasharray="30 138"
                    strokeDashoffset="-110"
                  />
                </svg>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10px] font-semibold text-fg block truncate">
                    {t('dashboardExtra.macroCapitalDistribution', 'Macro Capital Distribution')}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-mono text-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: exchangePalette.bybit }} />
                      Bybit 44%
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: exchangePalette.bitget }} />
                      Bitget 32%
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: exchangePalette.okx }} />
                      OKX 24%
                    </span>
                  </div>
                </div>
              </div>

              {/* Cross-Exchange Assets Stacked Bars */}
              <div className="bg-elevated border border-line rounded-lg p-2.5 space-y-1.5">
                <span className="text-[10px] font-semibold text-fg block truncate">
                  {t('dashboardExtra.crossExchangeAssets', 'Cross-Exchange Assets')}
                </span>
                {[
                  { ex: 'bybit', color: exchangePalette.bybit, segs: ['58%', '28%', '14%'] },
                  { ex: 'bitget', color: exchangePalette.bitget, segs: ['48%', '35%', '17%'] },
                  { ex: 'okx', color: exchangePalette.okx, segs: ['65%', '35%'] },
                ].map((row) => (
                  <div key={row.ex} className="flex items-center gap-2">
                    <ExchangeIcon exchange={row.ex} className="w-3.5 h-3.5 shrink-0" />
                    <div className="flex-1 h-2.5 rounded overflow-hidden flex gap-0.5">
                      {row.segs.map((w, i) => (
                        <div
                          key={i}
                          style={{
                            width: w,
                            backgroundColor: row.color,
                            opacity: i === 0 ? 1 : i === 1 ? 0.72 : 0.45,
                          }}
                          className="h-full"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </button>

          {/* 4. Real ExchangeHierarchyTable Replica */}
          <button
            type="button"
            onClick={() => handleSelectZone('hierarchy')}
            className={`${zoneBoxClass('hierarchy')} p-2.5`}
          >
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-line">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-fg">
                <Wallet className="w-3.5 h-3.5 text-accent" />
                <span>{t('balances.title', 'Balances')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-fg-muted">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-elevated border border-line">
                  <Search className="w-2.5 h-2.5" />
                  <span>BTC...</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-elevated border border-line font-mono">
                  &gt; $1
                </span>
              </div>
            </div>

            <div className="bg-elevated border border-line rounded-lg overflow-hidden">
              <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-line">
                <div className="flex items-center gap-2">
                  <ExchangeIcon exchange="bybit" className="w-4 h-4" />
                  <span className="text-[11px] font-bold text-fg">Bybit</span>
                  <span className="text-[10px] text-fg-muted font-mono">{formatMoney(10934)}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-fg-muted" />
              </div>
              <div className="px-3 py-1.5 bg-surface/60 flex items-center justify-between border-b border-line text-[10px]">
                <div className="flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3 text-fg-muted" />
                  <span className="font-medium text-fg">Main UTA</span>
                  <span className="text-[9px] font-mono text-accent">UNIFIED</span>
                </div>
                <span className="font-mono text-fg tabular-nums">{formatMoney(10934)}</span>
              </div>
              <div className="px-3 py-1.5 flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <CoinIcon symbol="BTC" className="w-3.5 h-3.5" />
                  <span className="font-semibold text-fg">BTC</span>
                  <span className="text-[9px] text-fg-muted">· Spot</span>
                </div>
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="text-fg-muted">0.112</span>
                  <span className="text-fg font-semibold">{formatMoney(7410)}</span>
                </div>
              </div>
            </div>
          </button>

          {/* 5. Real StatusBar Footer Replica */}
          <button
            type="button"
            onClick={() => handleSelectZone('controls')}
            className={`${zoneBoxClass('controls')} px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success/10 border border-success/20 text-success shrink-0">
                <Lock className="w-2.5 h-2.5" />
                <span>ENCRYPTED</span>
              </span>
              <KeyRound className="w-3 h-3 text-fg-muted shrink-0" />
              <span className="text-fg-muted truncate">Bybit 1/0 · Bitget 1/0 · OKX 1/0</span>
            </div>
            <span className="text-fg-muted shrink-0">v2.50.0</span>
          </button>
        </div>

        {/* Active Zone Summary */}
        <div className="border-t border-line pt-2.5 flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-fg truncate">
            {t(activeMeta.titleKey, activeMeta.defaultTitle)}
          </span>
          <span className="text-fg-muted font-mono text-[11px] shrink-0">
            {t(activeMeta.metricKey, activeMeta.defaultMetric)}
          </span>
        </div>
      </div>
    </div>
  );
}
