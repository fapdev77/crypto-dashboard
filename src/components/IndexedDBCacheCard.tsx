import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Database,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowLeftRight,
  Briefcase,
  AlertCircle,
  Sliders,
  Check,
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { UnifiedSyncManager } from '../services/sync/UnifiedSyncManager';
import {
  DB_NAME,
  DB_VERSION,
  getComprehensiveCacheStats,
  ComprehensiveCacheStats,
  getAssetMetadataCacheSize,
  clearAssetMetadataCache,
  clearAllCache,
  recoverAndResetIndexedDB,
  checkIndexedDBHealth,
  getBybitTxLogTotalCount,
  getBitgetTxLogTotalCount,
  getOkxTxLogTotalCount,
  pruneHistoricalData,
} from '../services/historyCache';
import { getStorageQuotaEstimate, StorageEstimateResult } from '../services/storageQuota';
import { AppTooltip } from './ui/Tooltip';
import { LogManager } from '../services/LogManager';

export function IndexedDBCacheCard() {
  const keys = useApiKeysStore((state) => state.keys);
  const {
    historyCacheInterval,
    setHistoryCacheInterval,
    metadataCacheTtlHours,
    setMetadataCacheTtlHours,
    historyCacheVersion,
    indexedDBStatus,
    indexedDBError,
    indexedDBVersion,
    setIndexedDBStatus,
    clearIndexedDBError,
  } = useSettingsStore();

  const {
    isBybitTxSyncing,
    isBitgetTxSyncing,
    isOkxTxSyncing,
    bybitTxLastSyncTime,
    bitgetTxLastSyncTime,
    okxTxLastSyncTime,
  } = useSyncCoordinatorStore();

  // State
  const [stats, setStats] = useState<ComprehensiveCacheStats | null>(null);
  const [metaCacheSize, setMetaCacheSize] = useState<number | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthChecked, setHealthChecked] = useState(false);

  // Sync / Clear states
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncedAll, setSyncedAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [clearedAll, setClearedAll] = useState(false);

  // Tx Sync states
  const [isSyncingTx, setIsSyncingTx] = useState(false);
  const [syncedTx, setSyncedTx] = useState(false);
  const [isClearingTx, setIsClearingTx] = useState(false);
  const [clearedTx, setClearedTx] = useState(false);

  // Meta Clear states
  const [isClearingMeta, setIsClearingMeta] = useState(false);

  // Recovery states
  const [isRecovering, setIsRecovering] = useState(false);

  // Storage Quota & Pruning states
  const [storageQuota, setStorageQuota] = useState<StorageEstimateResult | null>(null);
  const [isPruning, setIsPruning] = useState(false);
  const [pruneDays, setPruneDays] = useState(365);

  // Tx counts
  const [txCounts, setTxCounts] = useState({
    bybit: 0,
    bitget: 0,
    okx: 0,
    total: 0,
  });

  const loadAllStats = useCallback(async () => {
    try {
      const [cacheStats, metaSize, bybit, bitget, okx, quota] = await Promise.all([
        getComprehensiveCacheStats().catch(() => null),
        getAssetMetadataCacheSize().catch(() => 0),
        getBybitTxLogTotalCount().catch(() => 0),
        getBitgetTxLogTotalCount().catch(() => 0),
        getOkxTxLogTotalCount().catch(() => 0),
        getStorageQuotaEstimate().catch(() => null),
      ]);

      if (cacheStats) {
        setStats(cacheStats);
      }
      setMetaCacheSize(metaSize);
      if (quota) {
        setStorageQuota(quota);
      }
      setTxCounts({
        bybit,
        bitget,
        okx,
        total: bybit + bitget + okx,
      });
    } catch (err) {
      LogManager.error('IndexedDBCacheCard', 'Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    loadAllStats();
    checkIndexedDBHealth().catch(() => {});
  }, [loadAllStats, historyCacheVersion]);

  const activeKeys = keys.filter((k) => k.isActive);
  const hasTxKeys = activeKeys.some((k) => ['bybit', 'bitget', 'okx'].includes(k.exchange));
  const isGlobalTxSyncing = isSyncingTx || isBybitTxSyncing || isBitgetTxSyncing || isOkxTxSyncing;
  const lastTxSync = Math.max(bybitTxLastSyncTime, bitgetTxLastSyncTime, okxTxLastSyncTime);

  const formatLastSync = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return 'Never';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  };

  // Actions
  const handleCheckHealth = async () => {
    setIsCheckingHealth(true);
    setHealthChecked(false);
    try {
      const res = await checkIndexedDBHealth();
      if (res.status === 'healthy') {
        toast.success(`IndexedDB is healthy (Version ${res.version}, 14 stores active)`, { id: 'idb-health' });
        setHealthChecked(true);
        setTimeout(() => setHealthChecked(false), 2500);
      } else {
        toast.error(`IndexedDB Error: ${res.error || 'Connection failed'}`, { id: 'idb-health-err' });
      }
      await loadAllStats();
    } catch (e: any) {
      toast.error(`Health check failed: ${e?.message || 'Unknown error'}`, { id: 'idb-health-err' });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleForceSyncAll = async () => {
    if (keys.length === 0) {
      toast.error('No API keys configured to sync history', { id: 'sync-all' });
      return;
    }
    setIsSyncingAll(true);
    setSyncedAll(false);
    try {
      await UnifiedSyncManager.syncFullApplication(keys);
      await loadAllStats();
      setSyncedAll(true);
      toast.success('IndexedDB cache fully synchronized across all exchanges!', { id: 'sync-all' });
      setTimeout(() => setSyncedAll(false), 3000);
    } catch (err: any) {
      LogManager.error('IndexedDBCacheCard', 'Force sync all failed:', err);
      toast.error(`Sync failed: ${err.message || 'Unknown error'}`, { id: 'sync-all-err' });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleClearAllCache = async () => {
    setIsClearingAll(true);
    setClearedAll(false);
    try {
      await UnifiedSyncManager.clearAndResyncAll(keys);
      await loadAllStats();
      setClearedAll(true);
      toast.success('IndexedDB cache cleared and re-sync scheduled!', { id: 'clear-all' });
      setTimeout(() => setClearedAll(false), 3000);
    } catch (err: any) {
      LogManager.error('IndexedDBCacheCard', 'Clear all cache failed:', err);
      toast.error(`Clear cache failed: ${err.message || 'Unknown error'}`, { id: 'clear-all-err' });
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleRecoverDatabase = async () => {
    setIsRecovering(true);
    try {
      await recoverAndResetIndexedDB();
      await loadAllStats();
      toast.success('Database reset and restored to healthy state!', { id: 'recover-db' });
    } catch (err: any) {
      LogManager.error('IndexedDBCacheCard', 'Recovery failed:', err);
      toast.error(`Database recovery failed: ${err.message || 'Unknown error'}`, { id: 'recover-db-err' });
    } finally {
      setIsRecovering(false);
    }
  };

  const handleSyncTransactions = async () => {
    if (!hasTxKeys) {
      toast.error('No active Bybit, Bitget, or OKX API keys found', { id: 'tx-sync' });
      return;
    }
    setIsSyncingTx(true);
    setSyncedTx(false);
    try {
      const result = await UnifiedSyncManager.syncAllTransactions(keys);
      await loadAllStats();
      setSyncedTx(true);
      toast.success(
        `Transactions synced (${result.total} records in ${result.elapsedSeconds}s)\nBybit: ${result.bybit} | Bitget: ${result.bitget} | OKX: ${result.okx}`,
        { id: 'tx-sync', duration: 4000 }
      );
      setTimeout(() => setSyncedTx(false), 3000);
    } catch (err: any) {
      LogManager.error('IndexedDBCacheCard', 'Sync transactions failed:', err);
      toast.error(`Transaction sync failed: ${err.message || 'Unknown error'}`, { id: 'tx-sync-err' });
    } finally {
      setIsSyncingTx(false);
    }
  };

  const handleClearTransactions = async () => {
    setIsClearingTx(true);
    setClearedTx(false);
    try {
      await UnifiedSyncManager.clearAndResyncTransactions(keys);
      await loadAllStats();
      setClearedTx(true);
      toast.success('Transaction logs cache cleared and re-synced', { id: 'tx-clear', duration: 4000 });
      setTimeout(() => setClearedTx(false), 3000);
    } catch (err: any) {
      LogManager.error('IndexedDBCacheCard', 'Clear transactions failed:', err);
      toast.error(`Failed to clear tx cache: ${err.message || 'Unknown error'}`, { id: 'tx-clear-err' });
    } finally {
      setIsClearingTx(false);
    }
  };

  const handleClearMetaCache = async () => {
    setIsClearingMeta(true);
    try {
      await clearAssetMetadataCache();
      setMetaCacheSize(0);
      toast.success('Asset metadata cache cleared', { id: 'meta-clear' });
    } catch (err: any) {
      LogManager.error('IndexedDBCacheCard', 'Clear meta failed:', err);
      toast.error(`Failed to clear metadata cache: ${err.message || 'Unknown error'}`, { id: 'meta-clear-err' });
    } finally {
      setIsClearingMeta(false);
    }
  };

  const handlePruneData = async () => {
    if (!window.confirm(`Are you sure you want to prune local cache records older than ${pruneDays} days?`)) {
      return;
    }
    setIsPruning(true);
    try {
      const result = await pruneHistoricalData(pruneDays);
      toast.success(
        `Pruned ${result.totalPruned.toLocaleString()} records older than ${pruneDays} days`,
        { id: 'prune-toast' }
      );
      await loadAllStats();
    } catch (err: any) {
      LogManager.error('IndexedDBCacheCard', 'Failed to prune historical data:', err);
      toast.error(`Pruning failed: ${err.message || 'Unknown error'}`, { id: 'prune-err' });
    } finally {
      setIsPruning(false);
    }
  };

  const totalRecordsCount = (stats?.totalRecords || 0) + (metaCacheSize || 0);

  return (
    <div
      id="indexeddb-cache-card"
      className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full scroll-mt-20 md:col-span-2 xl:col-span-2 shadow-lg"
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              IndexedDB Storage & Cache
            </h3>
            <p className="text-[#8E9299] text-xs">
              Consolidated local database manager for Positions, Orders, Transactions, Funding & Metadata
            </p>
          </div>
        </div>

        {/* Status and Schema Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20"
            title={`Database: ${DB_NAME} (Schema Version ${DB_VERSION})`}
          >
            DB v{indexedDBVersion || DB_VERSION}
          </span>

          {/* Storage Quota badge if supported */}
          {storageQuota?.isSupported && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono ${
                storageQuota.isWarning
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-[#2a2b30]/50 text-gray-300 border-[#2a2b30]'
              }`}
              title={`Browser Storage Quota: ${storageQuota.usageMB} MB of ${storageQuota.quotaMB} MB used (${storageQuota.percentageUsed}%)`}
            >
              <span className="text-[#8E9299] text-[10px]">Disk:</span>
              <span className="font-semibold">
                {storageQuota.usageMB} MB ({storageQuota.percentageUsed}%)
              </span>
            </div>
          )}

          {/* Color-coded health indicator */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              indexedDBStatus === 'healthy'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                indexedDBStatus === 'healthy' ? 'bg-emerald-400' : 'bg-red-500'
              }`}
            />
            {indexedDBStatus === 'healthy'
              ? 'Operational'
              : indexedDBStatus === 'recovering'
              ? 'Recovering...'
              : 'Error / Conflict'}
          </span>

          {/* Total records count */}
          <div className="flex items-center gap-1.5 bg-[#2a2b30]/50 px-2.5 py-1 rounded-md border border-[#2a2b30]">
            <span className="text-[#8E9299] text-[10px]">Total Records:</span>
            <span className="text-blue-400 font-mono text-xs font-semibold">
              {totalRecordsCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Global Error Alert Banner if Conflict Detected */}
      {indexedDBStatus === 'error' && (
        <div className="my-3 p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-red-200 block">
                IndexedDB Version or Permission Conflict Detected
              </span>
              <p className="text-[11px] text-red-300/90 mt-0.5 leading-relaxed">
                {indexedDBError || 'Cache database access failed. Local caching operations are temporarily impaired.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleRecoverDatabase}
            disabled={isRecovering}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white rounded-md text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 shadow-sm shadow-red-900/30 cursor-pointer"
          >
            {isRecovering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{isRecovering ? 'Resetting...' : 'Clear Cache & Rebuild'}</span>
          </button>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
        {/* Section 1: Database Engine & Health Info */}
        <div className="bg-[#0c0d0e] border border-[#2a2b30]/60 rounded-lg p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/90 font-medium flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-400" />
                Database Engine & Schema
              </span>
              <button
                onClick={handleCheckHealth}
                disabled={isCheckingHealth}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer px-2 py-0.5 rounded bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20"
                title="Verify IndexedDB connection and schema"
              >
                {isCheckingHealth ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : healthChecked ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                <span>{isCheckingHealth ? 'Checking...' : healthChecked ? 'Verified' : 'Verify Health'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#2a2b30]/40 text-xs">
              <div className="flex flex-col">
                <span className="text-[#8E9299] text-[10px] uppercase font-semibold">Database Name</span>
                <span className="font-mono text-white/90 font-medium text-xs truncate" title={DB_NAME}>
                  {DB_NAME}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299] text-[10px] uppercase font-semibold">Engine</span>
                <span className="font-mono text-white/90 font-medium text-xs">IndexedDB W3C</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299] text-[10px] uppercase font-semibold">Schema Version</span>
                <span className="font-mono text-blue-400 font-medium text-xs">
                  Version {indexedDBVersion || DB_VERSION}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299] text-[10px] uppercase font-semibold">Active Stores</span>
                <span className="font-mono text-emerald-400 font-medium text-xs">14 Dedicated Stores</span>
              </div>
            </div>
          </div>

          {/* Quick Storage Breakdown */}
          <div className="pt-2 border-t border-[#2a2b30]/40">
            <div
              className="flex items-center justify-between cursor-pointer select-none py-1"
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              <span className="text-xs text-white/90 font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Object Store Records Breakdown
              </span>
              {showBreakdown ? (
                <ChevronUp className="w-3.5 h-3.5 text-[#8E9299]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[#8E9299]" />
              )}
            </div>

            {showBreakdown && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px]">
                <div className="bg-[#151619] p-2 rounded border border-[#2a2b30]/40">
                  <span className="text-[#8E9299] block text-[10px]">Positions</span>
                  <span className="font-mono text-white font-medium">
                    {stats ? stats.positionHistoryCount.toLocaleString() : '-'}
                  </span>
                </div>
                <div className="bg-[#151619] p-2 rounded border border-[#2a2b30]/40">
                  <span className="text-[#8E9299] block text-[10px]">Orders</span>
                  <span className="font-mono text-white font-medium">
                    {stats ? stats.orderHistoryCount.toLocaleString() : '-'}
                  </span>
                </div>
                <div className="bg-[#151619] p-2 rounded border border-[#2a2b30]/40">
                  <span className="text-[#8E9299] block text-[10px]">Transactions</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {txCounts.total.toLocaleString()}
                  </span>
                </div>
                <div className="bg-[#151619] p-2 rounded border border-[#2a2b30]/40">
                  <span className="text-[#8E9299] block text-[10px]">Funding Rates</span>
                  <span className="font-mono text-orange-400 font-medium">
                    {stats ? stats.fundingCount.toLocaleString() : '-'}
                  </span>
                </div>
                <div className="bg-[#151619] p-2 rounded border border-[#2a2b30]/40">
                  <span className="text-[#8E9299] block text-[10px]">Asset Metadata</span>
                  <span className="font-mono text-purple-400 font-medium">
                    {metaCacheSize !== null ? metaCacheSize.toLocaleString() : '-'}
                  </span>
                </div>
                <div className="bg-[#151619] p-2 rounded border border-[#2a2b30]/40">
                  <span className="text-[#8E9299] block text-[10px]">Realized PnL</span>
                  <span className="font-mono text-cyan-400 font-medium">
                    {stats ? (stats.bybitTxCount > 0 ? 'Active' : 'Standby') : '-'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Transaction Logs Cache Consolidation */}
        <div className="bg-[#0c0d0e] border border-[#2a2b30]/60 rounded-lg p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/90 font-medium flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
                Exchange Transaction Logs (Ledger Cache)
              </span>
              <span className="text-[10px] text-[#8E9299] font-mono">
                Last Sync: {formatLastSync(lastTxSync)}
              </span>
            </div>

            {/* Exchange sub-counters */}
            <div className="grid grid-cols-3 gap-2 bg-[#151619] border border-[#2a2b30]/40 p-2.5 rounded-lg mb-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#8E9299] uppercase font-semibold">Bybit</span>
                <span className="text-xs font-mono font-medium text-white">
                  {txCounts.bybit.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col border-l border-[#2a2b30] pl-2">
                <span className="text-[10px] text-[#8E9299] uppercase font-semibold">Bitget</span>
                <span className="text-xs font-mono font-medium text-white">
                  {txCounts.bitget.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col border-l border-[#2a2b30] pl-2">
                <span className="text-[10px] text-[#8E9299] uppercase font-semibold">OKX</span>
                <span className="text-xs font-mono font-medium text-white">
                  {txCounts.okx.toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-[#8E9299] text-[11px] leading-relaxed">
              Stores raw ledger transactions from all 3 exchanges into dedicated IndexedDB stores for deep historical analytics and PnL reporting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2a2b30]/40">
            <button
              onClick={handleSyncTransactions}
              disabled={isGlobalTxSyncing || syncedTx || isClearingTx || !hasTxKeys}
              className="flex items-center gap-1.5 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              {isGlobalTxSyncing ? (
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              ) : syncedTx ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{isGlobalTxSyncing ? 'Syncing...' : syncedTx ? 'Synced!' : 'Sync Tx Logs'}</span>
            </button>

            <button
              onClick={handleClearTransactions}
              disabled={isClearingTx || clearedTx || isGlobalTxSyncing || !hasTxKeys}
              className="flex items-center gap-1.5 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              {isClearingTx ? (
                <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
              ) : clearedTx ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              )}
              <span>{isClearingTx ? 'Clearing...' : clearedTx ? 'Cleared!' : 'Clear Tx Logs'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Sliders and Cadence Configurations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 bg-[#0c0d0e] border border-[#2a2b30]/60 p-4 rounded-lg">
        {/* Background Update Interval */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <AppTooltip description="Sets the interval for the background worker that refreshes cached position history, orders, and ledger updates from exchange APIs.">
              <h4 className="text-white font-medium text-xs w-fit cursor-help border-b border-dashed border-[#8E9299]/50 flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-[#00C853]" />
                History Background Refresh
              </h4>
            </AppTooltip>
            <span className="text-[#00C853] font-mono text-xs bg-[#00C853]/10 px-2 py-0.5 rounded-md font-semibold">
              {historyCacheInterval}m
            </span>
          </div>
          <p className="text-[#8E9299] text-[11px] mb-2 leading-relaxed">
            Periodically checks connected exchanges for new closed positions and orders (1 to 60 min).
          </p>
          <input
            type="range"
            min="1"
            max="60"
            step="1"
            value={historyCacheInterval}
            onChange={(e) => setHistoryCacheInterval(Number(e.target.value))}
            onPointerUp={() =>
              toast.success(`Background interval set to ${historyCacheInterval}m`, { id: 'cache-interval' })
            }
            className="w-full h-1.5 bg-[#2a2b30] rounded-lg appearance-none cursor-pointer accent-[#00C853]"
          />
          <div className="flex justify-between text-[10px] text-[#8E9299] font-mono mt-1">
            <span>1m (Real-time)</span>
            <span>60m (Low API usage)</span>
          </div>
        </div>

        {/* Metadata TTL Hours */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <AppTooltip description="Sets how long asset classifications (e.g. CRYPTO vs STOCK) remain valid in IndexedDB before re-fetching from exchange metadata APIs.">
              <h4 className="text-white font-medium text-xs w-fit cursor-help border-b border-dashed border-[#8E9299]/50 flex items-center gap-1.5">
                <Briefcase className="w-3 h-3 text-purple-400" />
                Asset Metadata TTL
              </h4>
            </AppTooltip>
            <span className="text-purple-400 font-mono text-xs bg-purple-400/10 px-2 py-0.5 rounded-md font-semibold">
              {metadataCacheTtlHours}h
            </span>
          </div>
          <p className="text-[#8E9299] text-[11px] mb-2 leading-relaxed">
            Validity duration of cached symbol definitions in IndexedDB (1 to 24 hours).
          </p>
          <input
            type="range"
            min="1"
            max="24"
            step="1"
            value={metadataCacheTtlHours}
            onChange={(e) => setMetadataCacheTtlHours(Number(e.target.value))}
            onPointerUp={() =>
              toast.success(`Metadata TTL set to ${metadataCacheTtlHours}h`, { id: 'cache-ttl' })
            }
            className="w-full h-1.5 bg-[#2a2b30] rounded-lg appearance-none cursor-pointer accent-purple-400"
          />
          <div className="flex justify-between text-[10px] text-[#8E9299] font-mono mt-1">
            <span>1h</span>
            <span>24h</span>
          </div>
        </div>
      </div>

      {/* Section 3.5: IndexedDB Historical Retention & Quota Pruning */}
      <div className="mt-4 bg-[#0c0d0e] border border-[#2a2b30]/60 p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-amber-400" />
              <h4 className="text-white font-medium text-xs">
                Data Retention & History Pruning
              </h4>
              <span className="text-amber-400 font-mono text-xs bg-amber-400/10 px-2 py-0.5 rounded-md font-semibold">
                {pruneDays}d
              </span>
            </div>
            <p className="text-[#8E9299] text-[11px] leading-relaxed">
              Purge historical records (closed positions, orders, and transaction ledgers) older than the selected threshold to free IndexedDB browser storage.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={pruneDays}
              onChange={(e) => setPruneDays(Number(e.target.value))}
              className="bg-[#1a1b1e] border border-[#2a2b30] text-xs text-white rounded-md px-2.5 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value={30}>Older than 30 days (1 mo)</option>
              <option value={60}>Older than 60 days (2 mo)</option>
              <option value={90}>Older than 90 days (3 mo)</option>
              <option value={180}>Older than 180 days (6 mo)</option>
              <option value={365}>Older than 1 year (Default)</option>
              <option value={730}>Older than 2 years</option>
            </select>
            <button
              onClick={handlePruneData}
              disabled={isPruning}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Prune out-of-scope historical records from IndexedDB"
            >
              {isPruning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{isPruning ? 'Pruning...' : 'Prune History'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Consolidated Maintenance & Recovery Toolbar */}
      <div className="mt-4 pt-4 border-t border-[#2a2b30]/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Force Sync All */}
          <button
            onClick={handleForceSyncAll}
            disabled={isSyncingAll || syncedAll || isClearingAll || keys.length === 0}
            className="flex items-center gap-1.5 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Download latest positions, orders, transactions, and funding data"
          >
            {isSyncingAll ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            ) : syncedAll ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span>{isSyncingAll ? 'Syncing All Stores...' : syncedAll ? 'All Stores Synced!' : 'Force Sync All'}</span>
          </button>

          {/* Clear Metadata Cache */}
          <button
            onClick={handleClearMetaCache}
            disabled={isClearingMeta}
            className="flex items-center gap-1.5 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Wipe cached asset classifications only"
          >
            {isClearingMeta ? (
              <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>{isClearingMeta ? 'Clearing...' : 'Clear Asset Metadata'}</span>
          </button>

          {/* Clear All Cache */}
          <button
            onClick={handleClearAllCache}
            disabled={isClearingAll || clearedAll || isSyncingAll}
            className="flex items-center gap-1.5 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Wipe positions, orders, transactions, and funding stores, then re-sync"
          >
            {isClearingAll ? (
              <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
            ) : clearedAll ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            )}
            <span>{isClearingAll ? 'Clearing & Re-syncing...' : clearedAll ? 'Cleared All!' : 'Clear All Cache'}</span>
          </button>
        </div>

        {/* Disaster Recovery Reset */}
        <button
          onClick={handleRecoverDatabase}
          disabled={isRecovering}
          className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ml-auto"
          title="Completely delete and rebuild IndexedDB schema v12 to resolve version/permission errors"
        >
          {isRecovering ? (
            <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          )}
          <span>{isRecovering ? 'Rebuilding DB...' : 'Rebuild Database'}</span>
        </button>
      </div>
    </div>
  );
}
