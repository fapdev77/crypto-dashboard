import { useState, useEffect, useMemo } from 'react';
import Big from 'big.js';
import { usePositionHistory, PositionHistoryPeriod } from './usePositionHistory';
import { SymbolPnLRecord } from '../types';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { BybitTransactionService } from '../services/bybit/BybitTransactionService';
import { getBybitTxLogCache } from '../services/historyCache';
import { LogManager } from '../services/LogManager';

/**
 * Aggregates PnL data broken down by symbol, exchange, and instrument type.
 *
 * Uses usePositionHistory for closed-position PnL from all exchanges,
 * and supplements Bybit data with real PnL derived from the cached
 * transaction-log entries (IndexedDB — no additional API calls).
 *
 * @param period           Time period for the history query.
 * @param exchangeFilter   Exchange filter ('All' | 'bybit' | 'bitget' | 'okx').
 * @param instrumentFilter Instrument type filter ('All' | 'Linear' | 'Inverse' etc).
 * @returns Object with pnlData, isLoading, isSyncing, syncMessage, isRealPnLSyncing.
 */
export function usePnLBySymbol(
  period: PositionHistoryPeriod,
  exchangeFilter: string,
  instrumentFilter: string
) {
  const { positions, isLoading, isSyncing, syncMessage: historySyncMessage } = usePositionHistory(period);
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const historyCacheVersion = useSettingsStore(state => state.historyCacheVersion);
  const syncStore = useSyncCoordinatorStore();

  const [bybitRealPnL, setBybitRealPnL] = useState<Record<string, string>>(syncStore.cachedPnLRecord);
  const [isBybitLoading, setIsBybitLoading] = useState(() => {
    if (useMockData || keys.length === 0) return false;
    const activeBybitKeys = keys.filter(k => k.exchange === 'bybit' && k.isActive);
    if (activeBybitKeys.length === 0) return false;
    return Object.keys(syncStore.cachedPnLRecord).length === 0;
  });

  // Turn off loading if active Bybit keys count goes to 0
  useEffect(() => {
    if (!useMockData) {
      const activeBybitKeys = keys.filter(k => k.exchange === 'bybit' && k.isActive);
      if (activeBybitKeys.length === 0) {
        setIsBybitLoading(false);
      }
    }
  }, [keys, useMockData]);

  // ── Derive Bybit Real PnL from cached transaction-log ──
  // Uses the same transaction-log cache that BybitTransactions maintains.
  // No network calls — data is already synced by useBybitTransactionSync.
  // While the deep sync is in progress, closed-positions PnL serves as fallback.
  useEffect(() => {
    let isMounted = true;
    setIsBybitLoading(true);
    if (useMockData) {
      setBybitRealPnL({});
      setIsBybitLoading(false);
      return;
    }

    const activeBybitKeys = keys.filter(k => k.exchange === 'bybit' && k.isActive);
    if (activeBybitKeys.length === 0 || (exchangeFilter !== 'All' && exchangeFilter.toLowerCase() !== 'bybit')) {
      setBybitRealPnL({});
      setIsBybitLoading(false);
      return;
    }

    const loadFromTxLog = async () => {
      try {
        // Calculate period time range
        const now = Date.now();
        const periodStartMap: Record<string, number | undefined> = {
          today: new Date(now).setHours(0, 0, 0, 0),
          '7d': now - 7 * 24 * 60 * 60 * 1000,
          '14d': now - 14 * 24 * 60 * 60 * 1000,
          '30d': now - 30 * 24 * 60 * 60 * 1000,
          '90d': now - 90 * 24 * 60 * 60 * 1000,
          '120d': now - 120 * 24 * 60 * 60 * 1000,
          '180d': now - 180 * 24 * 60 * 60 * 1000,
          '365d': now - 365 * 24 * 60 * 60 * 1000,
          'all': undefined,
        };
        const startTime = periodStartMap[period];
        const endTime = startTime !== undefined ? now : undefined;

        const combinedPnL: Record<string, Big> = {};
        let hasAnyData = false;

        for (const key of activeBybitKeys) {
          const cached = await getBybitTxLogCache(key.id);
          if (cached.length > 0) hasAnyData = true;

          const pnlBySymbol = BybitTransactionService.computeRealPnL(cached, startTime, endTime);
          for (const [sym, val] of Object.entries(pnlBySymbol)) {
            if (!combinedPnL[sym]) combinedPnL[sym] = new Big(0);
            combinedPnL[sym] = combinedPnL[sym].plus(new Big(val));
          }
        }

        if (isMounted) {
          if (hasAnyData) {
            const finalObj: Record<string, string> = {};
            for (const [sym, val] of Object.entries(combinedPnL)) finalObj[sym] = val.toString();
            setBybitRealPnL(finalObj);
            useSyncCoordinatorStore.getState().setCachedPnLRecord(finalObj);
          } else if (!syncStore.isBybitTxSyncing) {
            // No tx-log data and sync is not in progress — fallback to empty record
            setBybitRealPnL({});
            useSyncCoordinatorStore.getState().setCachedPnLRecord({});
          }
          setIsBybitLoading(false);
        }
      } catch (err) {
        LogManager.error('PnLBySymbol', 'Error reading tx-log cache for Bybit PnL:', err);
        if (isMounted) setIsBybitLoading(false);
      }
    };

    loadFromTxLog();
    return () => { isMounted = false; };
  }, [keys, period, exchangeFilter, useMockData, historyCacheVersion]);

  // ── Aggregate PnL data from closed positions + tx-log ──
  const pnlData = useMemo(() => {
    if (!positions || positions.length === 0) return [];

    const symbolMap = new Map<string, SymbolPnLRecord>();

    for (const pos of positions) {
      if (exchangeFilter !== 'All' && pos.exchange.toLowerCase() !== exchangeFilter.toLowerCase()) {
        continue;
      }

      let instrument = 'Unknown';
      if (pos.exchange === 'bitget') {
        const pType = pos.raw?.productType as string | undefined;
        if (pType === 'USDT-FUTURES') instrument = 'USDT-M';
        else if (pType === 'COIN-FUTURES') instrument = 'Coin-M';
        else if (pType === 'USDC-FUTURES') instrument = 'USDC-M';
        else if (pos.symbol.endsWith('USDT')) instrument = 'USDT-M';
        else if (pos.symbol.endsWith('USDC')) instrument = 'USDC-M';
        else if (pos.symbol.endsWith('USD')) instrument = 'Coin-M';
        else instrument = pType || (pos.raw?.marginCoin as string | undefined) || 'Futures';
      } else if (pos.exchange === 'bybit') {
        if (pos.symbol.endsWith('USDT') || pos.symbol.endsWith('USDC') || pos.symbol.includes('USDC-') || pos.symbol.includes('USDT-')) instrument = 'Linear';
        else if (pos.symbol.endsWith('USD') || pos.symbol.includes('USD-') || pos.symbol.match(/USD[A-Z0-9]+$/)) instrument = 'Inverse';
        else instrument = (pos.raw?.category as string | undefined) || 'Perpetual';
      } else if (pos.exchange === 'okx') {
        if (pos.symbol.includes('-USDT')) instrument = 'USDT-margined';
        else if (pos.symbol.includes('-USDC')) instrument = 'USDC-margined';
        else if (pos.symbol.includes('-USD')) instrument = 'Coin-margined';
        else instrument = (pos.raw?.instType as string | undefined) || 'SWAP';
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
      // Note: Bybit total PnL is replaced below using transaction-log data
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

    // After aggregating basic closed-pnl, inject Bybit real PnL from tx-log cache
    for (const [key, record] of symbolMap.entries()) {
      if (record.exchange === 'bybit') {
        if (bybitRealPnL[record.symbol]) {
           record.totalPnL = new Big(bybitRealPnL[record.symbol]);
           // Transaction-log doesn't have side info, so set long/short to match total
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

  const currentSyncMessage = historySyncMessage || null;

  return {
    pnlData,
    isLoading: isLoading || isBybitLoading,
    isSyncing: isSyncing || syncStore.isBybitTxSyncing,
    syncMessage: currentSyncMessage,
    isRealPnLSyncing: syncStore.isBybitTxSyncing,
  };
}
