import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { clearAllCache, getCacheSize, getAssetMetadataCacheSize, clearAssetMetadataCache } from '../services/historyCache';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';
import {
  Database, Trash2, CheckCircle2, Loader2, RefreshCw,
  Briefcase, AlertTriangle, FlaskConical, Gauge, Settings as SettingsIcon
} from 'lucide-react';

export function Settings() {
  const {
    useMockData, setUseMockData,
    pollingInterval, setPollingInterval,
    historyCacheInterval, setHistoryCacheInterval,
    metadataCacheTtlHours, setMetadataCacheTtlHours,
    showWelcomeOnStartup, setShowWelcomeOnStartup
  } = useSettingsStore();

  const keys = useApiKeysStore(state => state.keys);

  const [isClearing, setIsClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const [metaCacheSize, setMetaCacheSize] = useState<number | null>(null);
  const [isClearingMeta, setIsClearingMeta] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  useEffect(() => {
    getCacheSize().then(setCacheSize).catch(console.error);
    getAssetMetadataCacheSize().then(setMetaCacheSize).catch(console.error);
  }, []);

  const handleForceSync = async () => {
    if (keys.length === 0) return;
    setIsSyncing(true);
    setSynced(false);
    try {
      const service = new PositionHistoryService();
      await Promise.all(keys.map(apiKey => service.fetchWithCache(apiKey)));
      const newSize = await getCacheSize();
      setCacheSize(newSize);
      setSynced(true);
      toast.success('Cache synced successfully', { id: 'cache-sync' });
      setTimeout(() => setSynced(false), 3000);
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to sync cache: ${e.message || 'Unknown error'}`, { id: 'err-cache-sync' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    setCleared(false);
    try {
      await clearAllCache();
      setCacheSize(0);
      if (keys.length > 0) {
        const service = new PositionHistoryService();
        await Promise.all(keys.map(apiKey => service.fetchWithCache(apiKey)));
        const newSize = await getCacheSize();
        setCacheSize(newSize);
      }
      setCleared(true);
      toast.success('Cache cleared and re-synced successfully', { id: 'cache-clear' });
      setTimeout(() => setCleared(false), 3000);
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to clear and sync cache: ${e.message || 'Unknown error'}`, { id: 'err-cache-clear' });
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearMetaCache = async () => {
    setIsClearingMeta(true);
    try {
      await clearAssetMetadataCache();
      setMetaCacheSize(0);
      toast.success('Metadata cache cleared', { id: 'meta-cache-clear' });
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to clear metadata cache: ${e.message || 'Unknown error'}`, { id: 'err-meta-cache-clear' });
    } finally {
      setIsClearingMeta(false);
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
        }).catch(() => {});
      }
    } catch (e) {}

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
                <h4 className="text-white font-medium text-sm">Use Mock Data</h4>
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
                <h4 className="text-white font-medium text-sm">Show Onboarding Guide</h4>
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

        {/* Card 2: History Cache Management */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            History Cache
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">Manage local position history cache</p>

          <div className="flex flex-col gap-5 flex-1">
            {/* Background Update Interval */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-white font-medium text-sm">Background Update Interval</h4>
                <span className="text-[#00C853] font-mono text-xs bg-[#00C853]/10 px-2 py-0.5 rounded-md">{historyCacheInterval}m</span>
              </div>
              <p className="text-[#8E9299] text-xs mb-3 leading-relaxed">
                Keeps historical PnL sync running periodically in the background. Adjust between 5 and 60 minutes.
              </p>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={historyCacheInterval}
                onChange={(e) => setHistoryCacheInterval(Number(e.target.value))}
                onPointerUp={() => toast.success(`Background Update Interval set to ${historyCacheInterval}m\n(Effective next background run)`, { id: 'cache-interval' })}
                className="w-full h-2 bg-[#2a2b30] rounded-lg appearance-none cursor-pointer accent-[#00C853]"
              />
              <div className="flex justify-between text-[10px] text-[#8E9299] font-mono mt-1">
                <span>5m</span>
                <span>60m</span>
              </div>
            </div>

            <div className="border-t border-[#2a2b30]" />

            {/* Force Sync */}
            <div>
              <button
                onClick={handleForceSync}
                disabled={isSyncing || synced || isClearing || keys.length === 0}
                className="flex items-center gap-2 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isSyncing
                  ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  : synced
                    ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                    : <RefreshCw className="w-4 h-4 text-blue-400" />
                }
                {isSyncing ? 'Syncing Now...' : synced ? 'Synced!' : 'Force Sync Now'}
              </button>
            </div>

            <div className="border-t border-[#2a2b30]" />

            {/* Clear Cache */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h4 className="text-white font-medium text-sm">Clear Local Cache</h4>
                {cacheSize !== null && (
                  <div className="flex items-center gap-1.5 bg-[#2a2b30]/50 px-2 py-0.5 rounded-md border border-[#2a2b30]">
                    <span className="text-[#8E9299] text-[10px]">Records:</span>
                    <span className="text-blue-400 font-mono text-xs font-medium">{cacheSize}</span>
                  </div>
                )}
              </div>
              <p className="text-[#8E9299] text-xs mb-3 leading-relaxed">
                Forces a fresh download of your entire positional history from the exchange.
              </p>
              <button
                onClick={handleClearCache}
                disabled={isClearing || cleared || isSyncing}
                className="flex items-center gap-2 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isClearing
                  ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  : cleared
                    ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                    : <Trash2 className="w-4 h-4 text-red-400" />
                }
                {isClearing ? 'Clearing & Re-syncing...' : cleared ? 'Cache Cleared!' : 'Clear Cache Now'}
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Exchange Specifications */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#00C853]" />
            Exchange Specifications
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">Live data refresh rate configuration</p>

          <div className="flex flex-col flex-1">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-white font-medium text-sm">Background Refresh Interval</h4>
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

        {/* Card 4: Asset Metadata Cache Management */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-purple-400" />
            Asset Metadata Cache
          </h3>
          <p className="text-[#8E9299] text-xs mb-5">Control TTL and clear asset classification cache</p>

          <div className="flex flex-col gap-5 flex-1">
            {/* TTL Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-white font-medium text-sm">Metadata TTL</h4>
                <span className="text-purple-400 font-mono text-xs bg-purple-400/10 px-2 py-0.5 rounded-md">{metadataCacheTtlHours}h</span>
              </div>
              <p className="text-[#8E9299] text-xs mb-3 leading-relaxed">
                Validity duration of cached metadata for market assets (CRYPTO vs STOCK). Assets auto-refetch once TTL expires.
              </p>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={metadataCacheTtlHours}
                onChange={(e) => setMetadataCacheTtlHours(Number(e.target.value))}
                onPointerUp={() => toast.success(`Metadata TTL set to ${metadataCacheTtlHours}h`, { id: 'cache-ttl' })}
                className="w-full h-2 bg-[#2a2b30] rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
              <div className="flex justify-between text-[10px] text-[#8E9299] font-mono mt-1">
                <span>1h</span>
                <span>24h</span>
              </div>
            </div>

            <div className="border-t border-[#2a2b30]" />

            {/* Clear Metadata Cache */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h4 className="text-white font-medium text-sm">Clear Metadata Cache</h4>
                {metaCacheSize !== null && (
                  <div className="flex items-center gap-1.5 bg-[#2a2b30]/50 px-2 py-0.5 rounded-md border border-[#2a2b30]">
                    <span className="text-[#8E9299] text-[10px]">Records:</span>
                    <span className="text-purple-400 font-mono text-xs font-medium">{metaCacheSize}</span>
                  </div>
                )}
              </div>
              <p className="text-[#8E9299] text-xs mb-3 leading-relaxed">
                Force refetch of symbol definitions by clearing cached CRYPTO or STOCK classifications.
              </p>
              <button
                onClick={handleClearMetaCache}
                disabled={isClearingMeta}
                className="flex items-center gap-2 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isClearingMeta
                  ? <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  : <Trash2 className="w-4 h-4 text-red-400" />
                }
                {isClearingMeta ? 'Clearing...' : 'Clear Metadata Cache'}
              </button>
            </div>
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
            <h4 className="text-red-400 font-medium text-sm mb-1.5">Factory Reset</h4>
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
