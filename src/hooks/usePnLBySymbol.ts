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
  // We use the existing usePositionHistory to fetch data
  // But wait, usePositionHistory doesn't support 'all' right now.
  // Actually, position history uses cache, so we can fetch custom period or basically history available.
  const mappedPeriod = period === 'all' || period === '3m' || period === 'today' ? 'custom' : period;
  const mappedStart = period === 'all' ? new Date(0).toISOString().split('T')[0] : 
                      period === '3m' ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
                      period === 'today' ? new Date().toISOString().split('T')[0] : customStart;
  const mappedEnd = period === 'all' || period === '3m' || period === 'today' ? new Date().toISOString().split('T')[0] : customEnd;

  const { positions, isLoading } = usePositionHistory(mappedPeriod as any, mappedStart, mappedEnd, triggerSearch);

  const pnlData = useMemo(() => {
    if (!positions || positions.length === 0) return [];

    const symbolMap = new Map<string, SymbolPnLRecord>();

    for (const pos of positions) {
      if (exchangeFilter !== 'All' && pos.exchange.toLowerCase() !== exchangeFilter.toLowerCase()) {
        continue;
      }

      // Infer instrument
      let instrument = 'Unknown';
      if (pos.exchange === 'bitget') {
        instrument = pos.raw?.productType || pos.raw?.marginCoin || 'Futures';
      } else if (pos.exchange === 'bybit') {
        if (pos.symbol.endsWith('USDT')) instrument = 'linear';
        else if (pos.symbol.endsWith('USD')) instrument = 'inverse';
        else instrument = pos.raw?.category || 'Perpetual';
      } else if (pos.exchange === 'okx') {
        instrument = pos.raw?.instType || 'SWAP';
      }

      if (instrumentFilter !== 'All' && instrument.toLowerCase() !== instrumentFilter.toLowerCase()) {
        continue;
      }

      const key = `${pos.exchange}-${pos.symbol}-${instrument}`;
      
      const realizedPnl = new Big(pos.realizedPnl || 0);

      if (!symbolMap.has(key)) {
        symbolMap.set(key, {
          symbol: pos.symbol,
          instrument,
          exchange: pos.exchange,
          totalPnL: new Big(0),
          longPnL: new Big(0),
          shortPnL: new Big(0),
          lastActivity: pos.closeTime,
        });
      }

      const record = symbolMap.get(key)!;
      record.totalPnL = record.totalPnL.plus(realizedPnl);
      
      if (pos.side === 'long') {
        record.longPnL = record.longPnL.plus(realizedPnl);
      } else if (pos.side === 'short') {
        record.shortPnL = record.shortPnL.plus(realizedPnl);
      }

      if (pos.closeTime > record.lastActivity) {
        record.lastActivity = pos.closeTime;
      }
    }

    // Convert Map back to array
    return Array.from(symbolMap.values());
  }, [positions, exchangeFilter, instrumentFilter]);

  return { pnlData, isLoading };
}
