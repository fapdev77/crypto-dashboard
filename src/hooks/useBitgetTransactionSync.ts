import { useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { BitgetTransactionService } from '../services/bitget/BitgetTransactionService';
import { getBitgetTxLogCache, getBitgetTxLogMeta } from '../services/historyCache';
import { LogManager } from '../services/LogManager';

/**
 * Global background sync hook for Bitget transaction logs.
 * Mounted in WorkSpace.tsx alongside useHistoryCachePolling.
 */
export function useBitgetTransactionSync() {
  const keys = useApiKeysStore(state => state.keys);
  const { useMockData, historyCacheInterval } = useSettingsStore();
  const {
    bitgetTxLastSyncTime,
    setIsBitgetTxSyncing,
    setBitgetTxProgress,
    setBitgetTxLastSyncTime,
    setBitgetTxLatestTransactionTime,
    setBitgetTxOldestTransactionTime,
    setBitgetTxTotalRecords,
    setCachedBitgetTxLog,
  } = useSyncCoordinatorStore();

  useEffect(() => {
    const bitgetKeys = keys.filter(k => k.exchange === 'bitget' && k.isActive);
    if (useMockData || bitgetKeys.length === 0) return;

    const service = new BitgetTransactionService();

    const initialSync = async () => {
      // Skip if synced recently (avoid re-sync on Fast Refresh / HMR)
      const now = Date.now();
      const intervalMs = (historyCacheInterval || 5) * 60 * 1000;
      if (now - bitgetTxLastSyncTime < intervalMs && bitgetTxLastSyncTime > 0) return;

      setIsBitgetTxSyncing(true);
      setBitgetTxProgress({ pct: 0, records: 0 });

      try {
        const startTime = Date.now();
        let totalNewRecords = 0;
        let isIncremental = false;

        for (const key of bitgetKeys) {
          const meta = await getBitgetTxLogMeta(key.id);
          if (meta && meta.latestTransactionTime > 0) {
            isIncremental = true;
            const newRecords = await service.syncIncremental(key, meta.latestTransactionTime);
            totalNewRecords += newRecords.length;
          } else {
            const preMeta = await getBitgetTxLogMeta(key.id);
            const preCount = preMeta?.totalRecords || 0;
            await service.syncAll(key, (pct, records) => {
              setBitgetTxProgress({ pct, records });
            });
            const postMeta = await getBitgetTxLogMeta(key.id);
            totalNewRecords += (postMeta?.totalRecords || 0) - preCount;
          }
        }
        const fetchEndTime = Date.now();

        // Reload full cache after sync
        const allEntries: any[] = [];
        for (const key of bitgetKeys) {
          const cached = await getBitgetTxLogCache(key.id);
          allEntries.push(...cached);
        }
        allEntries.sort((a, b) => b.transactionTime - a.transactionTime);
        setCachedBitgetTxLog(allEntries as any);

        const writeEndTime = Date.now();
        const fetchElapsed = fetchEndTime - startTime;
        const writeElapsed = writeEndTime - fetchEndTime;
        const totalSec = (writeEndTime - startTime) / 1000;

        // Update metadata
        const allTimes = allEntries.map((e: any) => e.transactionTime);
        if (allTimes.length > 0) {
          setBitgetTxLatestTransactionTime(Math.max(...allTimes));
          setBitgetTxOldestTransactionTime(Math.min(...allTimes));
        }
        setBitgetTxTotalRecords(allEntries.length);
        setBitgetTxLastSyncTime(now);

        LogManager.system(
          'BitgetTxSync',
          `=== SYNC COMPLETE === ` +
          `Mode: ${isIncremental ? 'Incremental' : 'Deep'} | ` +
          `Fetch: ${(fetchElapsed / 1000).toFixed(1)}s | ` +
          `Write: ${(writeElapsed / 1000).toFixed(1)}s | ` +
          `Total: ${totalSec.toFixed(1)}s | ` +
          `New: ${totalNewRecords} | ` +
          `Total Cached: ${allEntries.length} records`
        );
      } catch (err) {
        LogManager.error('BitgetTxSync', 'Background sync failed:', err);
      } finally {
        setIsBitgetTxSyncing(false);
      }
    };

    initialSync();

    const handleClearEvent = () => {
      initialSync();
    };
    window.addEventListener('transactions-cache-cleared', handleClearEvent);
    window.addEventListener('history-cache-cleared', handleClearEvent);

    const intervalMs = (historyCacheInterval || 5) * 60 * 1000;
    const interval = setInterval(async () => {
      const activeBitgetKeys = useApiKeysStore.getState().keys.filter(k => k.exchange === 'bitget' && k.isActive);
      if (activeBitgetKeys.length === 0) return;

      setIsBitgetTxSyncing(true);
      try {
        let totalNewRecords = 0;
        for (const key of activeBitgetKeys) {
          const meta = await getBitgetTxLogMeta(key.id);
          if (meta && meta.latestTransactionTime > 0) {
            const newRecords = await service.syncIncremental(key, meta.latestTransactionTime);
            totalNewRecords += newRecords.length;
          }
        }

        if (totalNewRecords > 0) {
          const allEntries: any[] = [];
          for (const key of activeBitgetKeys) {
            const cached = await getBitgetTxLogCache(key.id);
            allEntries.push(...cached);
          }
          allEntries.sort((a, b) => b.transactionTime - a.transactionTime);
          setCachedBitgetTxLog(allEntries as any);
          setBitgetTxTotalRecords(allEntries.length);
        }
        setBitgetTxLastSyncTime(Date.now());
      } catch (err) {
        LogManager.error('BitgetTxSync', 'Periodic sync failed:', err);
      } finally {
        setIsBitgetTxSyncing(false);
      }
    }, intervalMs);

    return () => {
      clearInterval(interval);
      window.removeEventListener('transactions-cache-cleared', handleClearEvent);
      window.removeEventListener('history-cache-cleared', handleClearEvent);
    };
  }, [keys, useMockData, historyCacheInterval]);
}
