import { useState, useEffect, useMemo } from 'react';
import Big from 'big.js';
import { usePositionHistory } from './usePositionHistory';
import { SymbolPnLRecord } from '../types';

export function usePnLBySymbol(
  period: 'today' | '1w' | '2w' | '1m' | '3m' | 'all' | 'custom',
  customStart: string,
  customEnd: string,
  triggerSearch: boolean,
  exchangeFilter: string,
  instrumentFilter: string
) {
  // Map PnLBySymbol periods to the usePositionHistory period enum.
  // 'today' is passed directly so the hook uses local-time boundaries (avoids UTC offset bug).
  // 'all' and '3m' are converted to 'custom' with epoch/offset-based ISO strings.
  const mappedPeriod: 'today' | '7d' | '30d' | '90d' | 'custom' =
    period === 'today' ? 'today' :
    period === '1w'    ? '7d' :
    period === '2w'    ? '7d' :
    period === '1m'    ? '30d' :
    period === '3m'    ? '90d' :
    'custom'; // 'all'

  const mappedStart = period === 'all' ? new Date(0).toISOString().split('T')[0] : customStart;
  const mappedEnd   = period === 'all' ? new Date().toISOString().split('T')[0]  : customEnd;

  const { positions, isLoading, isSyncing } = usePositionHistory(mappedPeriod, mappedStart, mappedEnd, triggerSearch);

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

    return Array.from(symbolMap.values());
  }, [positions, exchangeFilter, instrumentFilter]);

  return { pnlData, isLoading, isSyncing };
}
