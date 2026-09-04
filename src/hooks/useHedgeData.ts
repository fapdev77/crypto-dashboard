import { useMemo, useState } from 'react';
import Big from 'big.js';
import { usePositionsStore } from '../store/positionsStore';
import { useBalancesStore } from '../store/balancesStore';
import { useSettingsStore } from '../store/settingsStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import {
  getHedgeCoinSummaries,
  getHedgeTotals,
  HedgeCoinSummary,
  HedgeTotals,
} from '../utils/hedgeUtils';

export interface UseHedgeDataReturn {
  search: string;
  setSearch: (value: string) => void;
  exchange: string;
  setExchange: (value: string) => void;
  side: string;
  setSide: (value: string) => void;
  exchanges: string[];
  totalEquity: number;
  coinSummaries: HedgeCoinSummary[];
  totals: HedgeTotals;
  filteredSummaries: HedgeCoinSummary[];
  filteredTotals: HedgeTotals;
  sideOptions: Array<{ value: string; label: string }>;
}

/**
 * useHedgeData — Custom hook decoupling store subscriptions and filtering logic
 * from presentation components in the Hedge Pro analytical dashboard.
 *
 * Derives inverse (Coin-M) positions, matching balances, totals and filters in memory
 * strictly based on Gross (wallet balance) values.
 */
export function useHedgeData(): UseHedgeDataReturn {
  const balances = useBalancesStore(state => state.balances);
  const positions = usePositionsStore(state => state.positions);
  const useMockData = useSettingsStore(state => state.useMockData);
  const keys = useApiKeysStore(state => state.keys);

  const [search, setSearch] = useState('');
  const [exchange, setExchange] = useState('All');
  const [side, setSide] = useState('All');

  const balancesList = useMemo(() => Object.values(balances), [balances]);
  const positionsList = useMemo(() => Object.values(positions), [positions]);
  const activeKeyIds = useMemo(
    () => new Set(keys.filter(k => k.isActive).map(k => k.id)),
    [keys],
  );

  const activeBalances = useMemo(() => {
    if (!useMockData && activeKeyIds.size === 0) return [];
    return useMockData
      ? balancesList.filter(b => b.connectionId.startsWith('mocked-data'))
      : balancesList.filter(
          b => !b.connectionId.startsWith('mocked-data') && activeKeyIds.has(b.connectionId),
        );
  }, [balancesList, useMockData, activeKeyIds]);

  const activePositions = useMemo(() => {
    if (!useMockData && activeKeyIds.size === 0) return [];
    return useMockData
      ? positionsList.filter(p => p.connectionId.startsWith('mocked-data'))
      : positionsList.filter(
          p => !p.connectionId.startsWith('mocked-data') && activeKeyIds.has(p.connectionId),
        );
  }, [positionsList, useMockData, activeKeyIds]);

  // Same totalEquity source as the main dashboard (Σ balance usdValue).
  const totalEquity = useMemo(() => {
    return Number(
      activeBalances.reduce((acc, b) => acc.plus(b.usdValue || 0), new Big(0)),
    );
  }, [activeBalances]);

  const coinSummaries = useMemo(
    () => getHedgeCoinSummaries(activePositions, activeBalances, 'gross'),
    [activePositions, activeBalances],
  );

  const totals = useMemo(
    () => getHedgeTotals(coinSummaries, totalEquity),
    [coinSummaries, totalEquity],
  );

  // Available unique exchanges for filter dropdown
  const exchanges = useMemo(
    () => Array.from(new Set(coinSummaries.map(c => c.exchange))),
    [coinSummaries],
  );

  const filteredSummaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coinSummaries.filter(c => {
      if (exchange !== 'All' && c.exchange !== exchange) return false;
      if (side !== 'All') {
        if (side === 'long' && c.longCount === 0) return false;
        if (side === 'short' && c.shortCount === 0) return false;
      }
      if (
        q &&
        !c.baseCoin.toLowerCase().includes(q) &&
        !c.accountLabel.toLowerCase().includes(q) &&
        !c.exchange.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [coinSummaries, exchange, side, search]);

  const filteredTotals = useMemo(
    () => getHedgeTotals(filteredSummaries, totalEquity),
    [filteredSummaries, totalEquity],
  );

  const sideOptions = useMemo(
    () => [
      { value: 'long', label: 'Longs' },
      { value: 'short', label: 'Shorts' },
    ],
    [],
  );

  return {
    search,
    setSearch,
    exchange,
    setExchange,
    side,
    setSide,
    exchanges,
    totalEquity,
    coinSummaries,
    totals,
    filteredSummaries,
    filteredTotals,
    sideOptions,
  };
}
