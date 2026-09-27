import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';
import { useFundingStore } from '../store/fundingStore';
import { clearFundingSummariesCache } from '../services/historyCache';
import {
  Trash2, Loader2, RefreshCw,
  AlertTriangle, FlaskConical, Gauge, Settings as SettingsIcon, Layers
} from 'lucide-react';
import { LogManager } from '../services/LogManager';
import { AppTooltip } from './ui/Tooltip';
import { FundingSyncTimingPanel } from './sync/FundingSyncTimingPanel';
import { SecurityBackupCard } from './SecurityBackupCard';
import { VersionInfoCard } from './VersionInfoCard';
import { IndexedDBCacheCard } from './IndexedDBCacheCard';
import { exchangeCoinCatalog } from '../services/marketAnalytics/exchangeCoinCatalog';

export function Settings() {
  const {
    useMockData, setUseMockData,
    pollingInterval, setPollingInterval,
    showWelcomeOnStartup, setShowWelcomeOnStartup,
    fundingPollingInterval, setFundingPollingInterval,
    fundingHistoryInterval, setFundingHistoryInterval,
    symbolCatalogRefreshHours, setSymbolCatalogRefreshHours
  } = useSettingsStore();

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
      toast.success('Symbol catalog refreshed', { id: 'symbol-catalog-refresh' });
    } catch (e: any) {
      LogManager.error('Settings', 'Failed to refresh symbol catalog:', e);
      toast.error(`Failed to refresh symbol catalog: ${e.message || 'Unknown error'}`, { id: 'err-symbol-catalog-refresh' });
    } finally {
      setIsRefreshingCatalog(false);
    }
  };

  const handleClearCatalog = async () => {
    setIsClearingCatalog(true);
    try {
      await exchangeCoinCatalog.clearAndSync();
      syncCatalogInfo();
      toast.success('Symbol catalog cleared and re-synced', { id: 'symbol-catalog-clear' });
    } catch (e: any) {
      LogManager.error('Settings', 'Failed to clear symbol catalog:', e);
      toast.error(`Failed to clear symbol catalog: ${e.message || 'Unknown error'}`, { id: 'err-symbol-catalog-clear' });
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
      toast.success('Funding cache cleared — historical sync will start in background.', { id: 'funding-cache-clear' });
    } catch (e: any) {
      LogManager.error('Settings', 'Failed to clear funding cache:', e);
      toast.error(`Failed to clear funding cache: ${e.message || 'Unknown error'}`, { id: 'err-funding-cache-clear' });
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
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <p className="text-xs text-[#8E9299] mt-0.5">Manage application preferences, cache and data</p>
        </div>
      </div>

      {/* Responsive Card Grid: 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">

        {/* Card 1: Preferences & Testing */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#00C853]" />
            Preferences & Testing
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">User preferences and testing tools</p>

          <div className="space-y-5 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <AppTooltip description="Enables testing mode with offline, mock data across all exchanges. API limits won't be hit while this is active. Real balances and positions will be hidden.">
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Use Mock Data</h4>
                </AppTooltip>
                <p className="text-[#8E9299] text-xs mt-1.5 leading-relaxed">
                  Enable to test the interface with dummy data instead of real API connections.
                  Real balances and positions will be hidden while active.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={useMockData}
                  onChange={(e) => {
                    setUseMockData(e.target.checked);
                    toast.success(`Mock Data ${e.target.checked ? 'Enabled' : 'Disabled'}`, { id: 'mock-toggle' });
                  }}
                />
                <div className="w-11 h-6 bg-[#2a2b30] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00C853]"></div>
              </label>
            </div>

            <div className="border-t border-[#2a2b30]/50 pt-4" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <AppTooltip description="If enabled, the Welcome Guide modal (containing tutorials and usage tips) will automatically open every time you start the app.">
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Show Onboarding Guide</h4>
                </AppTooltip>
                <p className="text-[#8E9299] text-xs mt-1.5 leading-relaxed">
                  Show the welcome and help guide modal automatically when the application is launched.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showWelcomeOnStartup}
                  onChange={(e) => {
                    setShowWelcomeOnStartup(e.target.checked);
                    toast.success(`Onboarding Guide ${e.target.checked ? 'Enabled' : 'Disabled'} on Startup`, { id: 'welcome-toggle' });
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
            Exchange Specifications
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">Live data refresh rate configuration</p>

          <div className="flex flex-col flex-1">
            <div className="flex justify-between items-center mb-1">
              <AppTooltip description="Mainly used in Dashboard, Open Positions and Open Orders. Controls how often the application fetches live data like mark prices, open positions, and account balances. Faster updates consume more API limits.">
                <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Background Refresh Interval</h4>
              </AppTooltip>
              <span className="text-[#00C853] font-mono text-xs bg-[#00C853]/10 px-2 py-0.5 rounded-md">{pollingInterval}s</span>
            </div>
            <p className="text-[#8E9299] text-xs mt-1 mb-4 leading-relaxed">
              Periodically polls Mark Price, PnL, and Total Balance across all exchanges (Bybit, Bitget, OKX).
              Lower values provide faster updates but increase network consumption.
            </p>
            <input
              type="range"
              min="1"
              max="60"
              value={pollingInterval}
              onChange={(e) => setPollingInterval(Number(e.target.value))}
              onPointerUp={() => toast.success(`Background Tracking Interval set to ${pollingInterval}s`, { id: 'rest-interval' })}
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
            Symbol Catalog Cache
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">Market Analytics instrument lists (Spot / Perp / Inverse)</p>

          <div className="flex flex-col gap-5 flex-1">
            {/* Refresh Interval */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <AppTooltip description="How often the app re-downloads the full instrument listing (Spot, USDT Perp and Coin-M Inverse) from Bybit, OKX and Bitget. These lists rarely change, so a longer interval saves network and API calls.">
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Refresh Interval</h4>
                </AppTooltip>
                <span className="text-cyan-400 font-mono text-xs bg-cyan-400/10 px-2 py-0.5 rounded-md">{symbolCatalogRefreshHours}h</span>
              </div>
              <p className="text-[#8E9299] text-xs mb-3 leading-relaxed">
                Controls the Market Analytics symbol catalog refresh cadence (1 to 24 hours).
              </p>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={symbolCatalogRefreshHours}
                onChange={(e) => setSymbolCatalogRefreshHours(Number(e.target.value))}
                onPointerUp={() => toast.success(`Symbol catalog refresh set to ${symbolCatalogRefreshHours}h`, { id: 'symbol-catalog-interval' })}
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
                <AppTooltip description="Timestamp of the last successful catalog download across the three exchanges.">
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Last Fetch</h4>
                </AppTooltip>
                <span className="text-cyan-400 font-mono text-xs">
                  {lastCatalogFetch ? new Date(lastCatalogFetch).toLocaleString() : 'Never'}
                </span>
              </div>
              {staleExchanges.length > 0 && (
                <p className="text-[11px] text-amber-400 leading-relaxed">
                  Partial data — kept the previous lists for: {staleExchanges.join(', ')}
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
                  {isRefreshingCatalog ? 'Refreshing...' : 'Refresh Now'}
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
                  {isClearingCatalog ? 'Clearing & Syncing...' : 'Clear Cache & Sync'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4.5: Funding Fees Configuration */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-orange-400" />
            Funding Fees Sync
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">Manage background syncing of funding rates</p>

          <div className="flex flex-col gap-5 flex-1">
            {/* Polling Interval */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <AppTooltip description="Sets the interval for fetching the 'next' funding rate in the background.">
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Live Polling Interval</h4>
                </AppTooltip>
                <span className="text-orange-400 font-mono text-xs bg-orange-400/10 px-2 py-0.5 rounded-md">{fundingPollingInterval}m</span>
              </div>
              <p className="text-[#8E9299] text-xs mb-3 leading-relaxed">
                Periodically fetch the upcoming funding rates (1 to 60 minutes).
              </p>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={fundingPollingInterval}
                onChange={(e) => setFundingPollingInterval(Number(e.target.value))}
                onPointerUp={() => toast.success(`Funding Polling set to ${fundingPollingInterval}m`, { id: 'funding-polling' })}
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
                <AppTooltip description="Controls how often a full history sync is allowed after page load. Auto-sync is triggered 1 minute after each funding settlement (every 8h). This interval acts as a minimum cooldown for additional syncs when the page is reloaded mid-cycle.">
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">History Fetch Interval</h4>
                </AppTooltip>
                <span className="text-orange-400 font-mono text-xs bg-orange-400/10 px-2 py-0.5 rounded-md">{fundingHistoryInterval}h</span>
              </div>
              <p className="text-[#8E9299] text-xs mb-3 leading-relaxed">
                Minimum cooldown between full history syncs (4 to 8 hours). Auto-sync runs each funding cycle regardless of this setting.
              </p>
              <input
                type="range"
                min="4"
                max="8"
                step="1"
                value={fundingHistoryInterval}
                onChange={(e) => setFundingHistoryInterval(Number(e.target.value))}
                onPointerUp={() => toast.success(`History fetch cooldown set to ${fundingHistoryInterval}h`, { id: 'funding-history' })}
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
                <AppTooltip description="Deletes the local funding fee cache causing it to start from scratch.">
                  <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Clear Funding Cache</h4>
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
                {isClearingFunding ? 'Clearing...' : 'Clear Cache Now'}
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
            Danger Zone
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">Irreversible local data actions</p>

          <div className="flex flex-col flex-1">
            <AppTooltip description="WARNING: This action is permanent. It wipes all IndexedDB, LocalStorage data, settings, API Keys, and caches. The app will immediately reload as if newly installed.">
              <h4 className="text-red-400 font-medium text-sm mb-1.5 w-fit cursor-help border-b border-dashed border-red-400/50">Factory Reset</h4>
            </AppTooltip>
            <p className="text-[#8E9299] text-xs mb-4 leading-relaxed">
              Permanently erase all local data from this browser — API keys, settings, historical cache,
              metadata, and mock preferences. Use this on shared computers or to restore factory defaults.
            </p>

            {showWipeConfirm ? (
              <div className="flex flex-col gap-3 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                <span className="text-sm font-medium text-red-400">Are you sure? This cannot be undone.</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFactoryReset}
                    className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Yes, Wipe Everything
                  </button>
                  <button
                    onClick={() => setShowWipeConfirm(false)}
                    className="px-4 py-1.5 bg-[#2a2b30] hover:bg-[#323339] text-[#8E9299] hover:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowWipeConfirm(true)}
                className="self-start flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Wipe All Local Client Data
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
