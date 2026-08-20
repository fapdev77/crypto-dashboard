import { useMemo } from 'react';
import { usePositionsStore } from '../store/positionsStore';
import { useSettingsStore } from '../store/settingsStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import type { UnifiedPosition } from '../types';

/**
 * Extracts the base coin from a trading symbol.
 * Example: "AVAX-USDT-SWAP" → "AVAX", "BTCUSD_PERP" → "BTC", "ETHUSDT" → "ETH"
 */
export const getBaseCoin = (symbol: string): string => {
  let base = symbol.split('-')[0];
  base = base.split('_')[0];
  base = base.replace(/USDT$|USD$|PERP$|FUTURES$/i, '');
  return base.toUpperCase();
};

/**
 * Guesses the instrument type based on position quote currency.
 */
export const guessInstrumentType = (p: UnifiedPosition): string => {
  if (p.quoteCoin === 'USD' || p.ccy === p.baseCoin) {
    return 'COIN-M';
  }
  if (p.quoteCoin === 'USDC' || p.ccy === 'USDC') {
    return 'USDC-M';
  }
  return 'USDT-M';
};

/**
 * Returns a Set of `exchange|coin|instrumentType` keys for all currently open positions.
 * Used to filter funding data to only show rows matching the exact exchange of open positions.
 */
export function useOpenPositionKeys(): Set<string> {
  const positions = usePositionsStore(state => state.positions);
  const useMockData = useSettingsStore(state => state.useMockData);
  const keys = useApiKeysStore(state => state.keys);

  const activeKeyIds = useMemo(() => new Set(keys.filter(k => k.isActive).map(k => k.id)), [keys]);

  return useMemo(() => {
    const keySet = new Set<string>();
    if (!useMockData && activeKeyIds.size === 0) return keySet;

    Object.values(positions).forEach(p => {
      const isMatch = useMockData
        ? p.connectionId.startsWith('mocked-data')
        : !p.connectionId.startsWith('mocked-data') && activeKeyIds.has(p.connectionId);

      if (isMatch && Math.abs(p.size) > 0) {
        keySet.add(`${p.exchange}|${getBaseCoin(p.symbol)}|${guessInstrumentType(p)}`);
      }
    });
    return keySet;
  }, [positions, useMockData, activeKeyIds]);
}
