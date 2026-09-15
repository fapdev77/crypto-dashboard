import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeftRight, RefreshCw, Trash2, CheckCircle2, Loader2, Database } from 'lucide-react';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { useSyncCoordinatorStore } from '../../store/syncCoordinatorStore';
import { UnifiedSyncManager } from '../../services/sync/UnifiedSyncManager';
import {
  getBybitTxLogTotalCount,
  getBitgetTxLogTotalCount,
  getOkxTxLogTotalCount,
} from '../../services/historyCache';
import { AppTooltip } from '../ui/Tooltip';
import { LogManager } from '../../services/LogManager';

export function TransactionLogsCacheCard() {
  const keys = useApiKeysStore(state => state.keys);
  const {
    isBybitTxSyncing,
    isBitgetTxSyncing,
    isOkxTxSyncing,
    bybitTxTotalRecords,
    bitgetTxTotalRecords,
    okxTxTotalRecords,
    bybitTxLastSyncTime,
    bitgetTxLastSyncTime,
    okxTxLastSyncTime,
  } = useSyncCoordinatorStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const [dbCounts, setDbCounts] = useState({
    bybit: 0,
    bitget: 0,
    okx: 0,
    total: 0,
  });

  const loadCounts = async () => {
    try {
      const [bybit, bitget, okx] = await Promise.all([
        getBybitTxLogTotalCount().catch(() => 0),
        getBitgetTxLogTotalCount().catch(() => 0),
        getOkxTxLogTotalCount().catch(() => 0),
      ]);
      setDbCounts({
        bybit,
        bitget,
        okx,
        total: bybit + bitget + okx,
      });
    } catch (err) {
      LogManager.error('TransactionLogsCacheCard', 'Failed to load tx counts:', err);
    }
  };

  useEffect(() => {
    loadCounts();
  }, [
    bybitTxTotalRecords,
    bitgetTxTotalRecords,
    okxTxTotalRecords,
    bybitTxLastSyncTime,
    bitgetTxLastSyncTime,
    okxTxLastSyncTime,
  ]);

  const activeKeys = keys.filter(k => k.isActive);
  const hasTxKeys = activeKeys.some(k => ['bybit', 'bitget', 'okx'].includes(k.exchange));
  const isGlobalSyncing = isSyncing || isBybitTxSyncing || isBitgetTxSyncing || isOkxTxSyncing;

  // Latest sync timestamp across all 3
  const lastSyncTime = Math.max(bybitTxLastSyncTime, bitgetTxLastSyncTime, okxTxLastSyncTime);

  const handleForceSync = async () => {
    if (!hasTxKeys) {
      toast.error('No active Bybit, Bitget, or OKX API keys found', { id: 'tx-sync' });
      return;
    }

    setIsSyncing(true);
    setSynced(false);

    try {
      const result = await UnifiedSyncManager.syncAllTransactions(keys);
      await loadCounts();
      setSynced(true);
      toast.success(
        `Transactions synced (${result.total} records in ${result.elapsedSeconds}s)\nBybit: ${result.bybit} | Bitget: ${result.bitget} | OKX: ${result.okx}`,
        { id: 'tx-sync', duration: 4000 }
      );
      setTimeout(() => setSynced(false), 3000);
    } catch (err: any) {
      LogManager.error('TransactionLogsCacheCard', 'Force sync failed:', err);
      toast.error(`Transaction sync failed: ${err.message || 'Unknown error'}`, { id: 'tx-sync-err' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    setCleared(false);

    try {
      await UnifiedSyncManager.clearAndResyncTransactions(keys);
      await loadCounts();
      setCleared(true);
      toast.success('Transaction logs cleared and re-synced from exchanges', { id: 'tx-clear', duration: 4000 });
      setTimeout(() => setCleared(false), 3000);
    } catch (err: any) {
      LogManager.error('TransactionLogsCacheCard', 'Clear cache failed:', err);
      toast.error(`Failed to clear transaction cache: ${err.message || 'Unknown error'}`, { id: 'tx-clear-err' });
    } finally {
      setIsClearing(false);
    }
  };

  const formatLastSync = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return 'Never';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  };

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
          Transaction Logs Cache
        </h3>
        <div className="flex items-center gap-1.5 bg-[#2a2b30]/50 px-2 py-0.5 rounded-md border border-[#2a2b30]">
          <span className="text-[#8E9299] text-[10px]">Total Tx:</span>
          <span className="text-emerald-400 font-mono text-xs font-medium">
            {dbCounts.total.toLocaleString()}
          </span>
        </div>
      </div>
      <p className="text-[#8E9299] text-xs mb-4">
        Granular cache & sync controls for Bybit, Bitget and OKX transaction logs
      </p>

      <div className="flex flex-col gap-4 flex-1">
        {/* Exchange breakdown badges */}
        <div className="grid grid-cols-3 gap-2 bg-[#0c0d0e] border border-[#2a2b30]/60 p-3 rounded-lg">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold">Bybit Tx</span>
            <span className="text-sm font-mono font-medium text-white">
              {dbCounts.bybit.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col border-l border-[#2a2b30] pl-2.5">
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold">Bitget Tx</span>
            <span className="text-sm font-mono font-medium text-white">
              {dbCounts.bitget.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col border-l border-[#2a2b30] pl-2.5">
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold">OKX Tx</span>
            <span className="text-sm font-mono font-medium text-white">
              {dbCounts.okx.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Sync Status info */}
        <div className="flex justify-between items-center text-xs text-[#8E9299]">
          <span>Last Synchronized:</span>
          <span className="font-mono text-white/90">{formatLastSync(lastSyncTime)}</span>
        </div>

        <div className="border-t border-[#2a2b30]" />

        {/* Force Sync Transactions */}
        <div>
          <div className="mb-2">
            <AppTooltip description="Performs parallel transaction log synchronization for all active Bybit, Bitget, and OKX connections without waiting for background interval.">
              <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">
                Force Sync Transactions
              </h4>
            </AppTooltip>
            <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
              Downloads the latest transaction histories across all 3 exchanges simultaneously.
            </p>
          </div>

          <button
            onClick={handleForceSync}
            disabled={isGlobalSyncing || synced || isClearing || !hasTxKeys}
            className="flex items-center gap-2 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {isGlobalSyncing ? (
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : synced ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <RefreshCw className="w-4 h-4 text-emerald-400" />
            )}
            {isGlobalSyncing ? 'Syncing Transactions...' : synced ? 'Transactions Synced!' : 'Sync Transactions Now'}
          </button>
        </div>

        <div className="border-t border-[#2a2b30]" />

        {/* Clear Transactions Cache */}
        <div>
          <div className="mb-2">
            <AppTooltip description="Wipes cached Bybit, Bitget, and OKX transaction logs and triggers a clean multi-month backfill download from exchange APIs.">
              <h4 className="text-white font-medium text-sm w-fit cursor-help border-b border-dashed border-[#8E9299]/50">
                Clear Transactions Cache
              </h4>
            </AppTooltip>
            <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
              Forces a full deep re-fetch of all transaction ledger entries from scratch.
            </p>
          </div>

          <button
            onClick={handleClearCache}
            disabled={isClearing || cleared || isGlobalSyncing || !hasTxKeys}
            className="flex items-center gap-2 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {isClearing ? (
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : cleared ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Trash2 className="w-4 h-4 text-red-400" />
            )}
            {isClearing ? 'Clearing & Re-syncing...' : cleared ? 'Transactions Cleared!' : 'Clear Tx Cache Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
