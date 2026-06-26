import { useState, useEffect, useMemo, useRef } from 'react';
import Big from 'big.js';
import { usePositionHistory, PositionHistoryPeriod } from './usePositionHistory';
import { SymbolPnLRecord } from '../types';
import { useApiKeysStore } from '../store/apiKeysStore';
import { BybitAdapter } from '../services/adapters/BybitAdapter';
import { useSettingsStore } from '../store/settingsStore';
import { getBybitRealPnLCache, saveBybitRealPnLCache } from '../services/historyCache';

// Module-level state to persist across unmounts/remounts of different views
let globalCachedPnLRecord: Record<string, string> = {};
let globalLastPnlSyncedVersion: number | null = null;
let globalLastPnlSyncTimestamp: number = 0;

export function usePnLBySymbol(
  period: PositionHistoryPeriod,
  exchangeFilter: string,
  instrumentFilter: string
) {
  const { positions, isLoading, isSyncing, syncMessage: historySyncMessage } = usePositionHistory(period);
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const historyCacheVersion = useSettingsStore(state => state.historyCacheVersion);
  const historyCacheInterval = useSettingsStore(state => state.historyCacheInterval);
  const lastSyncTime = useSettingsStore(state => state.lastSyncTime);
  const setLastSyncTime = useSettingsStore(state => state.setLastSyncTime);
  
  const [bybitRealPnL, setBybitRealPnL] = useState<Record<string, string>>(globalCachedPnLRecord);
  const [isBybitLoading, setIsBybitLoading] = useState(() => {
    if (useMockData || keys.length === 0) return false;
    const bybitKeys = keys.filter(k => k.exchange === 'bybit');
    if (bybitKeys.length === 0) return false;
    return Object.keys(globalCachedPnLRecord).length === 0;
  });
  const [bybitSyncMessage, setBybitSyncMessage] = useState<string | null>(null);

  const periodRef = useRef(period);
  const exchangeFilterRef = useRef(exchangeFilter);

  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  useEffect(() => {
    exchangeFilterRef.current = exchangeFilter;
  }, [exchangeFilter]);

  // 1. Load Local Cache Effect (Runs on keys, period, exchangeFilter, useMockData, or historyCacheVersion change)
  useEffect(() => {
    let isMounted = true;
    if (useMockData) {
      setBybitRealPnL({});
      setIsBybitLoading(false);
      setBybitSyncMessage(null);
      return;
    }

    const bybitKeys = keys.filter(k => k.exchange === 'bybit');
    if (bybitKeys.length === 0 || (exchangeFilter !== 'All' && exchangeFilter.toLowerCase() !== 'bybit')) {
      setBybitRealPnL({});
      setIsBybitLoading(false);
      setBybitSyncMessage(null);
      return;
    }

    const loadCache = async () => {
      try {
        const cachedCombined: Record<string, Big> = {};
        let hasAnyCache = false;

        const cachePromises = bybitKeys.map(key => getBybitRealPnLCache(key.id, period));
        const cacheResults = await Promise.all(cachePromises);

        cacheResults.forEach((res) => {
          if (res) {
            hasAnyCache = true;
            for (const [sym, val] of Object.entries(res)) {
              if (!cachedCombined[sym]) cachedCombined[sym] = new Big(0);
              cachedCombined[sym] = cachedCombined[sym].plus(new Big(val));
            }
          }
        });

        if (isMounted) {
          if (hasAnyCache) {
            const finalCached: Record<string, string> = {};
            for (const [sym, val] of Object.entries(cachedCombined)) {
              finalCached[sym] = val.toString();
            }
            setBybitRealPnL(finalCached);
            globalCachedPnLRecord = finalCached;
            setIsBybitLoading(false);
          } else {
            if (Object.keys(globalCachedPnLRecord).length === 0) {
              setIsBybitLoading(true);
            }
          }
        }
      } catch (err) {
        console.error('[usePnLBySymbol] Error reading Bybit Real PnL cache for SWR:', err);
        if (isMounted) setIsBybitLoading(true);
      }
    };

    loadCache();

    return () => {
      isMounted = false;
    };
  }, [keys, period, exchangeFilter, useMockData, historyCacheVersion]);

  // 2. Background REST API Sync Effect (Runs ONLY on keys, useMockData, or historyCacheVersion change)
  useEffect(() => {
    let isMounted = true;
    if (useMockData || keys.length === 0) return;

    const syncNetwork = async () => {
      const bybitKeys = keys.filter(k => k.exchange === 'bybit' && k.isActive);
      if (bybitKeys.length === 0) return;

      const currentExchangeFilter = exchangeFilterRef.current;
      if (currentExchangeFilter !== 'All' && currentExchangeFilter.toLowerCase() !== 'bybit') {
        return;
      }

      // If a force sync is requested globally, reset local sync timestamp to force fetch
      if (lastSyncTime === 0) {
        globalLastPnlSyncTimestamp = 0;
      }

      const now = Date.now();
      const intervalMs = (historyCacheInterval || 5) * 60 * 1000;
      const hasRecentSync = (now - globalLastPnlSyncTimestamp) < intervalMs;

      // Skip network fetch if already done recently
      if (
        hasRecentSync &&
        globalLastPnlSyncTimestamp > 0
      ) {
        return;
      }

      if (isMounted) {
        setIsBybitLoading(true);
        setBybitSyncMessage('Iniciando sincronização...');
      }

      const currentPeriod = periodRef.current;
      let startTime = now - 90 * 24 * 60 * 60 * 1000; // default 90d
      if (currentPeriod === 'today') startTime = new Date(now).setHours(0, 0, 0, 0);
      else if (currentPeriod === '7d') startTime = now - 7 * 24 * 60 * 60 * 1000;
      else if (currentPeriod === '14d') startTime = now - 14 * 24 * 60 * 60 * 1000;
      else if (currentPeriod === '30d') startTime = now - 30 * 24 * 60 * 60 * 1000;

      const adapter = new BybitAdapter();
      const combinedPnL: Record<string, Big> = {};

      for (const key of bybitKeys) {
        try {
          if (isMounted) setBybitSyncMessage(`Aguarde: sincronizando Bybit real PnL (${key.label})...`);
          const res = await adapter.fetchBybitRealPnLBySymbol(key, startTime, now, (msg) => {
            if (isMounted) setBybitSyncMessage(msg);
          });
          
          await saveBybitRealPnLCache(key.id, currentPeriod, res);

          for (const [sym, val] of Object.entries(res)) {
            if (!combinedPnL[sym]) combinedPnL[sym] = new Big(0);
            combinedPnL[sym] = combinedPnL[sym].plus(new Big(val));
          }
        } catch (err) {
          console.warn('[usePnLBySymbol] Failed to fetch Bybit Real PnL for key', key.label, err);
        }
      }

      if (isMounted && periodRef.current === currentPeriod) {
        const finalObj: Record<string, string> = {};
        for (const [sym, val] of Object.entries(combinedPnL)) {
          finalObj[sym] = val.toString();
        }
        setBybitRealPnL(finalObj);
        globalCachedPnLRecord = finalObj;
        setIsBybitLoading(false);
        setBybitSyncMessage(null);

        globalLastPnlSyncedVersion = historyCacheVersion;
        globalLastPnlSyncTimestamp = Date.now();

        // If we were the one that finished a manual force sync, we restore the global lastSyncTime
        if (lastSyncTime === 0) {
          setLastSyncTime(Date.now());
        }
      }
    };

    syncNetwork();

    return () => {
      isMounted = false;
    };
  }, [keys, useMockData, historyCacheVersion, lastSyncTime, historyCacheInterval, setLastSyncTime]);

  const pnlData = useMemo(() => {
    if (!positions || positions.length === 0) return [];

    const symbolMap = new Map<string, SymbolPnLRecord>();

    for (const pos of positions) {
      if (exchangeFilter !== 'All' && pos.exchange.toLowerCase() !== exchangeFilter.toLowerCase()) {
        continue;
      }

      let instrument = 'Unknown';
      if (pos.exchange === 'bitget') {
        const pType = pos.raw?.productType;
        if (pType === 'USDT-FUTURES') instrument = 'USDT-M';
        else if (pType === 'COIN-FUTURES') instrument = 'Coin-M';
        else if (pType === 'USDC-FUTURES') instrument = 'USDC-M';
        else if (pos.symbol.endsWith('USDT')) instrument = 'USDT-M';
        else if (pos.symbol.endsWith('USDC')) instrument = 'USDC-M';
        else if (pos.symbol.endsWith('USD')) instrument = 'Coin-M';
        else instrument = pType || pos.raw?.marginCoin || 'Futures';
      } else if (pos.exchange === 'bybit') {
        if (pos.symbol.endsWith('USDT') || pos.symbol.endsWith('USDC') || pos.symbol.includes('USDC-') || pos.symbol.includes('USDT-')) instrument = 'Linear';
        else if (pos.symbol.endsWith('USD') || pos.symbol.includes('USD-') || pos.symbol.match(/USD[A-Z0-9]+$/)) instrument = 'Inverse';
        else instrument = pos.raw?.category || 'Perpetual';
      } else if (pos.exchange === 'okx') {
        if (pos.symbol.includes('-USDT')) instrument = 'USDT-margined';
        else if (pos.symbol.includes('-USDC')) instrument = 'USDC-margined';
        else if (pos.symbol.includes('-USD')) instrument = 'Coin-margined';
        else instrument = pos.raw?.instType || 'SWAP';
      }

      if (instrumentFilter !== 'All' && instrument.toLowerCase() !== instrumentFilter.toLowerCase()) {
        continue;
      }

      const ccy = pos.ccy || pos.baseCoin || 'USDT';

      const key = `${pos.exchange}-${pos.symbol}-${instrument}-${ccy}`;
      
      const realizedPnl = new Big(pos.realizedPnl || 0);

      if (!symbolMap.has(key)) {
        symbolMap.set(key, {
          symbol: pos.symbol,
          instrument,
          ccy,
          exchange: pos.exchange as any,
          totalPnL: new Big(0),
          longPnL: new Big(0),
          shortPnL: new Big(0),
          lastActivity: pos.closeUpdateTime,
        });
      }

      const record = symbolMap.get(key)!;
      // Note: Bybit total PnL is replaced below using transaction log
      record.totalPnL = record.totalPnL.plus(realizedPnl);
      
      if (pos.side === 'long') {
        record.longPnL = record.longPnL.plus(realizedPnl);
      } else if (pos.side === 'short') {
        record.shortPnL = record.shortPnL.plus(realizedPnl);
      }

      if (pos.closeUpdateTime > record.lastActivity) {
        record.lastActivity = pos.closeUpdateTime;
      }
    }

    // After aggregating basic closed-pnl, inject Bybit real PnL
    for (const [key, record] of symbolMap.entries()) {
      if (record.exchange === 'bybit') {
        if (bybitRealPnL[record.symbol]) {
           record.totalPnL = new Big(bybitRealPnL[record.symbol]);
           // Overwrite long/short just to match the total visually (transaction-log doesn't have side)
           // If we don't zero them, the UI will show mismatch. We can just set longPnL to total and short to 0 
           // if positive, or vice versa, to avoid confusion.
           if (record.totalPnL.gte(0)) {
             record.longPnL = record.totalPnL;
             record.shortPnL = new Big(0);
           } else {
             record.shortPnL = record.totalPnL;
             record.longPnL = new Big(0);
           }
        }
      }
    }

    return Array.from(symbolMap.values());
  }, [positions, exchangeFilter, instrumentFilter, bybitRealPnL]);

  const currentSyncMessage = bybitSyncMessage || historySyncMessage || null;

  return { 
    pnlData, 
    isLoading: isLoading || isBybitLoading, 
    isSyncing: isSyncing || isBybitLoading,
    syncMessage: currentSyncMessage
  };
}
