import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';
import { useFundingStore } from '../store/fundingStore';
import { clearFundingSummariesCache } from '../services/historyCache';
import {
  Trash2, Loader2, RefreshCw,
  AlertTriangle, FlaskConical, Gauge, Settings as SettingsIcon, Layers, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LogManager } from '../services/LogManager';
import { AppTooltip } from './ui/Tooltip';
import { FundingSyncTimingPanel } from './sync/FundingSyncTimingPanel';
import { SecurityBackupCard } from './SecurityBackupCard';
import { VersionInfoCard } from './VersionInfoCard';
import { IndexedDBCacheCard } from './IndexedDBCacheCard';
import { exchangeCoinCatalog } from '../services/marketAnalytics/exchangeCoinCatalog';
import {
  SUPPORTED_LOCALES,
  SUPPORTED_FIAT_CURRENCIES,
  SupportedLocale,
  SupportedFiatCurrency,
} from '../services/currency/currencyTypes';
import { CurrencyService } from '../services/currency/CurrencyService';
import { CurrencyApiDiagnostics } from './currency/CurrencyApiDiagnostics';

export function Settings() {
  const { t } = useTranslation();
  const {
    useMockData, setUseMockData,
    pollingInterval, setPollingInterval,
    showWelcomeOnStartup, setShowWelcomeOnStartup,
    fundingPollingInterval, setFundingPollingInterval,
    fundingHistoryInterval, setFundingHistoryInterval,
    symbolCatalogRefreshHours, setSymbolCatalogRefreshHours,
    locale, setLocale,
    fiatCurrency, setFiatCurrency,
    fiatRates, fiatRatesLastUpdated,
    fiatRatesTtlMinutes, setFiatRatesTtlMinutes,
    fiatRatesSource, fiatRatesStatus,
  } = useSettingsStore();

  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  const [isClearingFunding, setIsClearingFunding] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState(false);
  const [isClearingCatalog, setIsClearingCatalog] = useState(false);
  const [lastCatalogFetch, setLastCatalogFetch] = useState<number | null>(null);
  const [staleExchanges, setStaleExchanges] = useState<string[]>([]);

  const syncCatalogInfo = () => {
    setLastCatalogFetch(exchangeCoinCatalog.getRegistryUpdatedAt());
    setStaleExchanges(exchangeCoinCatalog.getStaleExchanges());
  };

  const handleRefreshCatalog = async () => {
    setIsRefreshingCatalog(true);
    try {
      await exchangeCoinCatalog.refresh();
      syncCatalogInfo();
      toast.success(t('toasts.symbolCatalogRefreshed', 'Symbol catalog refreshed'), { id: 'symbol-catalog-refresh' });
    } catch (e: any) {
      LogManager.error('Settings', 'Failed to refresh symbol catalog:', e);
      toast.error(t('toasts.symbolCatalogRefreshFailed', 'Failed to refresh symbol catalog: {{error}}', { error: e.message || 'Unknown error' }), { id: 'err-symbol-catalog-refresh' });
    } finally {
      setIsRefreshingCatalog(false);
    }
  };

  const handleClearCatalog = async () => {
    setIsClearingCatalog(true);
    try {
      await exchangeCoinCatalog.clearAndSync();
      syncCatalogInfo();
      toast.success(t('toasts.symbolCatalogCleared', 'Symbol catalog cleared and re-synced'), { id: 'symbol-catalog-clear' });
    } catch (e: any) {
      LogManager.error('Settings', 'Failed to clear symbol catalog:', e);
      toast.error(t('toasts.symbolCatalogClearFailed', 'Failed to clear symbol catalog: {{error}}', { error: e.message || 'Unknown error' }), { id: 'err-symbol-catalog-clear' });
    } finally {
      setIsClearingCatalog(false);
    }
  };

  useEffect(() => {
    syncCatalogInfo();
  }, []);

  const handleClearFundingCache = async () => {
    setIsClearingFunding(true);
    try {
      await clearFundingSummariesCache();
      // Reset the sync guard so the next useFundingSync cycle triggers a full re-sync.
      useFundingStore.getState().setLastHistoryFetch(0);
      // Notify any mounted funding sync hook to start syncing immediately.
      window.dispatchEvent(new CustomEvent('funding-cache-cleared'));
      toast.success(t('toasts.fundingCacheCleared', 'Funding cache cleared — historical sync will start in background.'), { id: 'funding-cache-clear' });
    } catch (e: any) {
      LogManager.error('Settings', 'Failed to clear funding cache:', e);
      toast.error(t('toasts.fundingCacheClearFailed', 'Failed to clear funding cache: {{error}}', { error: e.message || 'Unknown error' }), { id: 'err-funding-cache-clear' });
    } finally {
      setIsClearingFunding(false);
    }
  };

  const handleFactoryReset = () => {
    try {
      window.indexedDB.deleteDatabase('crypto-dashboard-cache');
      if (window.indexedDB.databases) {
        window.indexedDB.databases().then((dbs) => {
          for (const db of dbs) {
            if (db.name) window.indexedDB.deleteDatabase(db.name);
          }
        }).catch((e) => {
          LogManager.warn('Settings', 'Factory reset — failed to enumerate IndexedDB databases:', e);
        });
      }
    } catch (e) {
      LogManager.warn('Settings', 'Factory reset — failed to delete IndexedDB databases:', e);
    }

    window.localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#2F6BFF]/10 border border-[#2F6BFF]/20 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-[#2F6BFF]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">{t('settings.title', 'Settings')}</h2>
          <p className="text-xs text-[#8E9299] mt-0.5">{t('settings.subtitle', 'Manage application preferences, cache and data')}</p>
        </div>
      </div>

      {/* Responsive Card Grid: 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">

        {/* Card 0: Language & Currency */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#2F6BFF]" />
            {t('settings.languageAndCurrency', 'Language & Currency')}
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">
            {t('settings.languageDesc', 'Configure your display language and preferred currency for portfolio calculations.')}
          </p>

          <div className="space-y-4 flex-1 flex flex-col">
            {/* Language Selection */}
            <div>
              <label className="text-white font-medium text-xs block mb-1.5">
                {t('settings.languageLabel', 'Language')}
              </label>
              <select
                value={locale}
                onChange={(e) => {
                  const newLocale = e.target.value as SupportedLocale;
                  setLocale(newLocale);
                  toast.success(t('toasts.languageSet', 'Language set to {{language}}', { language: SUPPORTED_LOCALES[newLocale]?.name || newLocale }), { id: 'lang-change' });
                }}
                className="w-full bg-[#1e2024] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-[#2F6BFF] transition-colors"
              >
                {Object.values(SUPPORTED_LOCALES).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.flag} {loc.name} ({loc.englishName})
                  </option>
                ))}
              </select>
            </div>

            {/* Currency Selection */}
            <div>
              <label className="text-white font-medium text-xs block mb-1.5">
                {t('settings.currencyLabel', 'Display Currency')}
              </label>
              <select
                value={fiatCurrency}
                onChange={(e) => {
                  const newCurr = e.target.value as SupportedFiatCurrency;
                  setFiatCurrency(newCurr);
                  toast.success(t('toasts.currencySet', 'Display currency set to {{currency}}', { currency: newCurr }), { id: 'curr-change' });
                }}
                className="w-full bg-[#1e2024] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-[#2F6BFF] transition-colors"
              >
                {Object.values(SUPPORTED_FIAT_CURRENCIES).map((curr) => {
                  const rate = fiatRates?.[curr.id] || 1;
                  return (
                    <option key={curr.id} value={curr.id}>
                      {curr.flag} {curr.code} ({curr.symbol}) — {curr.nativeName} [1 USD ≈ {rate.toFixed(curr.id === 'USD' ? 2 : 3)}]
                    </option>
                  );
                })}
              </select>
            </div>

            {/* TTL Cache Configuration Slider */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <AppTooltip description="Defines how long exchange rates remain cached in the browser before querying api.frankfurter.dev again (5 to 60 minutes).">
                  <label className="text-white font-medium text-xs cursor-help border-b border-dashed border-[#8E9299]/50">
                    {t('settings.ttlLabel', 'Exchange Rates Cache TTL')}
                  </label>
                </AppTooltip>
                <span className="text-xs font-mono font-semibold text-[#2F6BFF] bg-[#2F6BFF]/10 px-2 py-0.5 rounded">
                  {t('settings.ttlMinutes', { minutes: fiatRatesTtlMinutes })}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={fiatRatesTtlMinutes}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFiatRatesTtlMinutes(val);
                }}
                className="w-full h-1.5 bg-[#2a2b30] rounded-lg appearance-none cursor-pointer accent-[#2F6BFF]"
              />
              <div className="flex justify-between text-[10px] text-[#8E9299] mt-1 font-mono">
                <span>5m</span>
                <span>30m (Default)</span>
                <span>60m</span>
              </div>
            </div>

            {/* Source & Resilient Fallback Status Box */}
            <div className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg p-3 space-y-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-white flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      fiatRatesStatus === 'live'
                        ? 'bg-emerald-400 animate-pulse'
                        : fiatRatesStatus === 'cached'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  {t('settings.sourceTitle', 'Exchange Rates Source Status')}
                </span>
                <span
                  className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                    fiatRatesStatus === 'live'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : fiatRatesStatus === 'cached'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {fiatRatesStatus}
                </span>
              </div>

              <p className="text-[11px] text-[#8E9299] leading-relaxed">
                {fiatRatesStatus === 'live' && t('settings.sourceLive', { source: fiatRatesSource })}
                {fiatRatesStatus === 'cached' && t('settings.sourceCached', { source: fiatRatesSource })}
                {fiatRatesStatus === 'fallback' && t('settings.sourceFallback')}
              </p>

              <div className="text-[10px] text-[#6b6f76] leading-normal pt-1 border-t border-[#2a2b30]/60">
                {t('settings.fallbackExplanation')}
              </div>

              <button
                onClick={async () => {
                  setIsRefreshingRates(true);
                  try {
                    await CurrencyService.fetchFiatRates(0);
                    toast.success(t('currencyWidget.refreshedSuccess', 'Currency rates refreshed successfully'), { id: 'rates-refresh-settings' });
                  } catch {
                    toast.error(t('currencyWidget.refreshedError', 'Could not refresh live rates. Using cached rates.'), { id: 'rates-refresh-err-settings' });
                  } finally {
                    setIsRefreshingRates(false);
                  }
                }}
                disabled={isRefreshingRates}
                className="w-full mt-1 py-1.5 px-3 bg-[#1e2024] hover:bg-[#2a2b30] border border-[#2a2b30] hover:border-[#3d4047] text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingRates ? 'animate-spin text-[#2F6BFF]' : 'text-[#8E9299]'}`} />
                <span>{t('settings.refreshNow', 'Refresh Rates Now')}</span>
              </button>
            </div>

            {/* Currency API Connection Diagnostics */}
            <div className="pt-2">
              <CurrencyApiDiagnostics />
            </div>

            <div className="border-t border-[#2a2b30]/50 pt-3 mt-auto">
              <p className="text-[11px] text-[#8E9299]">
                {t('selector.ratesNote', 'Balances and KPIs are converted in real-time from USD/USDT.')}
              </p>
            </div>
          </div>
        </div>

        {/* Card 1: Preferences & Testing */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#00C853]" />
            {t('settings.preferencesTesting', 'Preferences & Testing')}
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">{t('settings.preferencesDesc', 'User preferences and testing tools')}</p>

          <div className="space-y-5 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <AppTooltip description={t('settings.simulationMode.tooltip', "Enables testing mode with offline, mock data across all exchanges. API limits won't be hit while this is active. Real balances and positions will be hidden.")}>
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">{t('settings.simulationMode.title', 'Simulation Mode (Mock Data)')}</h4>
                </AppTooltip>
                <p className="text-[#8E9299] text-xs mt-1.5 leading-relaxed">
                  {t('settings.simulationMode.desc', 'Simulate exchange balances, positions and transactions without API keys.')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={useMockData}
                  onChange={(e) => {
                    setUseMockData(e.target.checked);
                    toast.success(
                      e.target.checked
                        ? t('settings.simulationMode.enabledToast', 'Mock Data Enabled')
                        : t('settings.simulationMode.disabledToast', 'Mock Data Disabled'),
                      { id: 'mock-toggle' }
                    );
                  }}
                />
                <div className="w-11 h-6 bg-[#2a2b30] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00C853]"></div>
              </label>
            </div>

            <div className="border-t border-[#2a2b30]/50 pt-4" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <AppTooltip description={t('settings.onboardingTooltip', 'If enabled, the Welcome Guide modal (containing tutorials and usage tips) will automatically open every time you start the app.')}>
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">{t('settings.showOnboarding', 'Show Onboarding Guide')}</h4>
                </AppTooltip>
                <p className="text-[#8E9299] text-xs mt-1.5 leading-relaxed">
                  {t('settings.onboardingDesc', 'Show the welcome and help guide modal automatically when the application is launched.')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showWelcomeOnStartup}
                  onChange={(e) => {
                    setShowWelcomeOnStartup(e.target.checked);
                    toast.success(
                      e.target.checked
                        ? t('settings.onboardingEnabledToast', 'Onboarding Guide Enabled on Startup')
                        : t('settings.onboardingDisabledToast', 'Onboarding Guide Disabled on Startup'),
                      { id: 'welcome-toggle' }
                    );
                  }}
                />
                <div className="w-11 h-6 bg-[#2a2b30] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00C853]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Card 1.5: Security & Backup */}
        <SecurityBackupCard />

        {/* Card 1.8: Version & Changelog Details */}
        <VersionInfoCard />

        {/* Card 2: Consolidated IndexedDB Storage & Cache */}
        <IndexedDBCacheCard />

        {/* Card 3: Exchange Specifications */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#00C853]" />
            {t('settings.exchangeSpecs', 'Exchange Specifications')}
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">{t('settings.exchangeSpecsDesc', 'Live data refresh rate configuration')}</p>

          <div className="flex flex-col flex-1">
            <div className="flex justify-between items-center mb-1">
              <AppTooltip description={t('settings.polling.dashboardTooltip', 'Mainly used in Dashboard, Open Positions and Open Orders. Controls how often the application fetches live data like mark prices, open positions, and account balances. Faster updates consume more API limits.')}>
                <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">{t('settings.polling.dashboardLabel', 'Background Refresh Interval')}</h4>
              </AppTooltip>
              <span className="text-[#00C853] font-mono text-xs bg-[#00C853]/10 px-2 py-0.5 rounded-md">{pollingInterval}s</span>
            </div>
            <p className="text-[#8E9299] text-xs mt-1 mb-4 leading-relaxed">
              {t('settings.polling.dashboardDesc', 'Periodically polls Mark Price, PnL, and Total Balance across all exchanges (Bybit, Bitget, OKX). Lower values provide faster updates but increase network consumption.')}
            </p>
            <input
              type="range"
              min="1"
              max="60"
              value={pollingInterval}
              onChange={(e) => setPollingInterval(Number(e.target.value))}
              onPointerUp={() => toast.success(t('settings.polling.dashboardToast', 'Background Tracking Interval set to {{seconds}}s', { seconds: pollingInterval }), { id: 'rest-interval' })}
              className="w-full h-2 bg-[#2a2b30] rounded-lg appearance-none cursor-pointer accent-[#00C853]"
            />
            <div className="flex justify-between text-[10px] text-[#8E9299] font-mono mt-1">
              <span>1s</span>
              <span>60s</span>
            </div>
          </div>
        </div>

        {/* Card 4.2: Market Analytics Symbol Catalog */}
        <div id="symbol-catalog-settings-card" className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            {t('settings.catalog.title', 'Symbol Catalog Cache')}
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">{t('settings.catalog.desc', 'Market Analytics instrument lists (Spot / Perp / Inverse)')}</p>

          <div className="flex flex-col gap-5 flex-1">
            {/* Refresh Interval */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <AppTooltip description={t('settings.catalog.intervalTooltip', 'How often the app re-downloads the full instrument listing (Spot, USDT Perp and Coin-M Inverse) from Bybit, OKX and Bitget. These lists rarely change, so a longer interval saves network and API calls.')}>
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">{t('settings.catalog.refreshInterval', 'Refresh Interval')}</h4>
                </AppTooltip>
                <span className="text-cyan-400 font-mono text-xs bg-cyan-400/10 px-2 py-0.5 rounded-md">{symbolCatalogRefreshHours}h</span>
              </div>
              <p className="text-[#8E9299] text-xs mb-3 leading-relaxed">
                {t('settings.catalog.intervalDesc', 'Controls the Market Analytics symbol catalog refresh cadence (1 to 24 hours).')}
              </p>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={symbolCatalogRefreshHours}
                onChange={(e) => setSymbolCatalogRefreshHours(Number(e.target.value))}
                onPointerUp={() => toast.success(t('settings.catalog.refreshIntervalToast', 'Symbol catalog refresh set to {{hours}}h', { hours: symbolCatalogRefreshHours }), { id: 'symbol-catalog-interval' })}
                className="w-full h-2 bg-[#2a2b30] rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-[#8E9299] font-mono mt-1">
                <span>1h</span>
                <span>24h</span>
              </div>
            </div>

            <div className="border-t border-[#2a2b30]" />

            {/* Last fetch, stale warning and actions */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <AppTooltip description={t('settings.catalog.lastFetchTooltip', 'Timestamp of the last successful catalog download across the three exchanges.')}>
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">{t('settings.catalog.lastFetch', 'Last Fetch')}</h4>
                </AppTooltip>
                <span className="text-cyan-400 font-mono text-xs">
                  {lastCatalogFetch ? new Date(lastCatalogFetch).toLocaleString() : t('common.never', 'Never')}
                </span>
              </div>
              {staleExchanges.length > 0 && (
                <p className="text-[11px] text-amber-400 leading-relaxed">
                  {t('settings.catalog.partialData', 'Partial data — kept the previous lists for:')} {staleExchanges.join(', ')}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  onClick={handleRefreshCatalog}
                  disabled={isRefreshingCatalog || isClearingCatalog}
                  className="flex items-center gap-2 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isRefreshingCatalog
                    ? <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    : <RefreshCw className="w-4 h-4 text-cyan-400" />
                  }
                  {isRefreshingCatalog ? t('common.refreshing', 'Refreshing...') : t('settings.catalog.refreshBtn', 'Refresh Now')}
                </button>

                <button
                  onClick={handleClearCatalog}
                  disabled={isRefreshingCatalog || isClearingCatalog}
                  className="flex items-center gap-2 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isClearingCatalog
                    ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                    : <Trash2 className="w-4 h-4 text-red-400" />
                  }
                  {isClearingCatalog ? t('common.clearingSyncing', 'Clearing & Syncing...') : t('settings.catalog.clearBtn', 'Clear Cache & Sync')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4.5: Funding Fees Configuration */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-orange-400" />
            {t('settings.fundingSync', 'Funding Fees Sync')}
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">{t('settings.fundingSyncDesc', 'Manage background syncing of funding rates')}</p>

          <div className="flex flex-col gap-5 flex-1">
            {/* Polling Interval */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <AppTooltip description={t('settings.polling.fundingIntervalTooltip', "Sets the interval for fetching the 'next' funding rate in the background.")}>
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">{t('settings.polling.fundingIntervalLabel', 'Live Polling Interval')}</h4>
                </AppTooltip>
                <span className="text-orange-400 font-mono text-xs bg-orange-400/10 px-2 py-0.5 rounded-md">{fundingPollingInterval}m</span>
              </div>
              <p className="text-[#8E9299] text-xs mb-3 leading-relaxed">
                {t('settings.polling.fundingDesc', 'Periodically fetch the upcoming funding rates (1 to 60 minutes).')}
              </p>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={fundingPollingInterval}
                onChange={(e) => setFundingPollingInterval(Number(e.target.value))}
                onPointerUp={() => toast.success(t('settings.polling.fundingPollingToast', 'Funding Polling set to {{minutes}}m', { minutes: fundingPollingInterval }), { id: 'funding-polling' })}
                className="w-full h-2 bg-[#2a2b30] rounded-lg appearance-none cursor-pointer accent-orange-400"
              />
              <div className="flex justify-between text-[10px] text-[#8E9299] font-mono mt-1">
                <span>1m</span>
                <span>60m</span>
              </div>
            </div>

            <div className="border-t border-[#2a2b30]" />

            {/* History Interval */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <AppTooltip description={t('settings.polling.fundingHistoryTooltip', 'Controls how often a full history sync is allowed after page load. Auto-sync is triggered 1 minute after each funding settlement (every 8h). This interval acts as a minimum cooldown for additional syncs when the page is reloaded mid-cycle.')}>
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">{t('settings.fundingHistoryInterval', 'History Fetch Interval')}</h4>
                </AppTooltip>
                <span className="text-orange-400 font-mono text-xs bg-orange-400/10 px-2 py-0.5 rounded-md">{fundingHistoryInterval}h</span>
              </div>
              <p className="text-[#8E9299] text-xs mb-3 leading-relaxed">
                {t('settings.polling.fundingHistoryDesc', 'Minimum cooldown between full history syncs (4 to 8 hours). Auto-sync runs each funding cycle regardless of this setting.')}
              </p>
              <input
                type="range"
                min="4"
                max="8"
                step="1"
                value={fundingHistoryInterval}
                onChange={(e) => setFundingHistoryInterval(Number(e.target.value))}
                onPointerUp={() => toast.success(t('settings.polling.fundingHistoryToast', 'History fetch cooldown set to {{hours}}h', { hours: fundingHistoryInterval }), { id: 'funding-history' })}
                className="w-full h-2 bg-[#2a2b30] rounded-lg appearance-none cursor-pointer accent-orange-400"
              />
              <div className="flex justify-between text-[10px] text-[#8E9299] font-mono mt-1">
                <span>4h</span>
                <span>8h</span>
              </div>
            </div>

            <div className="border-t border-[#2a2b30]" />

            {/* Clear Funding Cache */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <AppTooltip description={t('settings.cache.clearFundingTooltip', 'Deletes the local funding fee cache causing it to start from scratch.')}>
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">{t('settings.cache.clearFundingBtn', 'Clear Funding Cache')}</h4>
                </AppTooltip>
              </div>
              <button
                onClick={handleClearFundingCache}
                disabled={isClearingFunding}
                className="flex items-center gap-2 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors mt-2"
              >
                {isClearingFunding
                  ? <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                  : <Trash2 className="w-4 h-4 text-red-400" />
                }
                {isClearingFunding ? t('common.clearing', 'Clearing...') : t('settings.cache.clearFundingBtn', 'Clear Cache Now')}
              </button>
            </div>

            {/* Sync Timing Performance Panel */}
            <FundingSyncTimingPanel />
          </div>
        </div>

        {/* Card 5: Danger Zone */}
        <div className="bg-[#151619] border border-[#2a2b30] border-t-2 border-t-red-500/40 rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-base font-semibold text-red-500 mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {t('settings.dangerZone', 'Danger Zone')}
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">{t('settings.dangerZoneDesc', 'Irreversible local data actions')}</p>

          <div className="flex flex-col flex-1">
            <AppTooltip description={t('settings.dangerZoneTooltip', 'WARNING: This action is permanent. It wipes all IndexedDB, LocalStorage data, settings, API Keys, and caches. The app will immediately reload as if newly installed.')}>
              <h4 className="text-red-400 font-medium text-sm mb-1.5 w-fit cursor-help border-b border-dashed border-red-400/50">{t('settings.cache.factoryResetBtn', 'Factory Reset')}</h4>
            </AppTooltip>
            <p className="text-[#8E9299] text-xs mb-4 leading-relaxed">
              {t('settings.cache.factoryResetConfirmDesc', 'Permanently erase all local data from this browser — API keys, settings, historical cache, metadata, and mock preferences. Use this on shared computers or to restore factory defaults.')}
            </p>

            {showWipeConfirm ? (
              <div className="flex flex-col gap-3 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                <span className="text-sm font-medium text-red-400">{t('settings.areYouSure', 'Are you sure? This cannot be undone.')}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFactoryReset}
                    className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {t('settings.wipeEverything', 'Yes, Wipe Everything')}
                  </button>
                  <button
                    onClick={() => setShowWipeConfirm(false)}
                    className="px-4 py-1.5 bg-[#2a2b30] hover:bg-[#323339] text-[#8E9299] hover:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowWipeConfirm(true)}
                className="self-start flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('settings.wipeBtn', 'Wipe All Local Client Data')}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
