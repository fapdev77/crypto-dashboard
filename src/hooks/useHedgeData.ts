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
import { isStablecoin } from '../utils/formatters';

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

  const activePositions = useMemo(() => {
    if (!useMockData && activeKeyIds.size === 0) return [];
    return useMockData
      ? positionsList.filter(p => p.connectionId.startsWith('mocked-data'))
      : positionsList.filter(
          p => !p.connectionId.startsWith('mocked-data') && activeKeyIds.has(p.connectionId),
        );
  }, [positionsList, useMockData, activeKeyIds]);

  const rawActiveBalances = useMemo(() => {
    if (!useMockData && activeKeyIds.size === 0) return [];
    return useMockData
      ? balancesList.filter(b => b.connectionId.startsWith('mocked-data'))
      : balancesList.filter(
          b => !b.connectionId.startsWith('mocked-data') && activeKeyIds.has(b.connectionId),
        );
  }, [balancesList, useMockData, activeKeyIds]);

  const netActiveBalances = useMemo(() => {
    if (!useMockData && activeKeyIds.size === 0) return [];

    // For Bybit, Bitget, and OKX in Hedge Pro Aggregated Totals: use Net Balance (Equity)
    return rawActiveBalances.map(b => {
      const ex = b.exchange?.toLowerCase();
      if (ex !== 'bybit' && ex !== 'bitget' && ex !== 'okx') {
        return b;
      }

      // Check if raw data has official exchange equity (net balance in coin and USD)
      const rawObj: any = b.raw || {};
      const rawEquity = rawObj.equity !== undefined && rawObj.equity !== null && rawObj.equity !== ''
        ? parseFloat(String(rawObj.equity))
        : (rawObj.eq !== undefined && rawObj.eq !== null && rawObj.eq !== ''
            ? parseFloat(String(rawObj.eq))
            : (b.totalEquity !== undefined && b.totalEquity !== null && b.totalEquity > 0 ? b.totalEquity : NaN));
      const rawUsdValue = rawObj.usdValue !== undefined && rawObj.usdValue !== null && rawObj.usdValue !== ''
        ? parseFloat(String(rawObj.usdValue))
        : (rawObj.eqUsd !== undefined && rawObj.eqUsd !== null && rawObj.eqUsd !== ''
            ? parseFloat(String(rawObj.eqUsd))
            : NaN);

      const coinPrice = (b.amount > 0 && (b.usdValue || 0) > 0)
        ? (b.usdValue / b.amount)
        : 0;

      if (!isNaN(rawEquity) && rawEquity >= 0) {
        const netAmount = rawEquity;
        const netUsdValue = (!isNaN(rawUsdValue) && rawUsdValue > 0)
          ? rawUsdValue
          : (coinPrice > 0 ? netAmount * coinPrice : (b.usdValue || 0));

        return {
          ...b,
          amount: netAmount,
          usdValue: netUsdValue,
        };
      }

      if (rawObj.unrealisedPnl !== undefined && rawObj.unrealisedPnl !== null && rawObj.unrealisedPnl !== '') {
        const uPnl = parseFloat(String(rawObj.unrealisedPnl));
        if (!isNaN(uPnl)) {
          const netAmount = Math.max(0, (b.amount || 0) + uPnl);
          const netUsdValue = coinPrice > 0 ? netAmount * coinPrice : (b.usdValue || 0);
          return {
            ...b,
            amount: netAmount,
            usdValue: netUsdValue,
          };
        }
      }

      // Fallback: derive Net Balance from active positions unrealized PnL if available
      const matchingPositions = activePositions.filter(p =>
        p.connectionId === b.connectionId &&
        (p.ccy?.toUpperCase() === b.ccy.toUpperCase() || p.baseCoin?.toUpperCase() === b.ccy.toUpperCase())
      );

      if (matchingPositions.length > 0) {
        const sumUnrealizedCoin = matchingPositions.reduce((acc, p) => acc + (p.unrealizedPnl || 0), 0);
        const netAmount = Math.max(0, (b.amount || 0) + sumUnrealizedCoin);
        const netUsdValue = coinPrice > 0
          ? netAmount * coinPrice
          : (b.usdValue || 0);

        return {
          ...b,
          amount: netAmount,
          usdValue: netUsdValue,
        };
      }

      return b;
    });
  }, [rawActiveBalances, useMockData, activeKeyIds, activePositions]);

  // Aggregated totalEquity for hedge totals and exposure bar
  const totalEquity = useMemo(() => {
    return Number(
      netActiveBalances.reduce((acc, b) => acc.plus(b.usdValue || 0), new Big(0)),
    );
  }, [netActiveBalances]);

  // Aggregated stablecoins USD balance (liquid assets pegged to USD, inherently protected)
  const stablecoinsEquityUsd = useMemo(() => {
    return Number(
      netActiveBalances
        .filter(b => isStablecoin(b.ccy))
        .reduce((acc, b) => acc.plus(b.usdValue || 0), new Big(0)),
    );
  }, [netActiveBalances]);

  // Individual coin summaries use raw gross balances to preserve gross wallet balance & coin-specific net equity
  const coinSummaries = useMemo(
    () => getHedgeCoinSummaries(activePositions, rawActiveBalances, 'gross'),
    [activePositions, rawActiveBalances],
  );

  const totals = useMemo(
    () => getHedgeTotals(coinSummaries, totalEquity, stablecoinsEquityUsd),
    [coinSummaries, totalEquity, stablecoinsEquityUsd],
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

  const filteredTotalEquity = useMemo(() => {
    if (exchange === 'All') return totalEquity;
    const exBalances = netActiveBalances.filter(
      b => (b.exchange || '').toLowerCase() === exchange.toLowerCase(),
    );
    return Number(
      exBalances.reduce((acc, b) => acc.plus(b.usdValue || 0), new Big(0)),
    );
  }, [netActiveBalances, exchange, totalEquity]);

  const filteredStablecoinsEquityUsd = useMemo(() => {
    const list = exchange === 'All'
      ? netActiveBalances
      : netActiveBalances.filter(b => (b.exchange || '').toLowerCase() === exchange.toLowerCase());
    return Number(
      list
        .filter(b => isStablecoin(b.ccy))
        .reduce((acc, b) => acc.plus(b.usdValue || 0), new Big(0)),
    );
  }, [netActiveBalances, exchange]);

  const filteredTotals = useMemo(
    () => getHedgeTotals(filteredSummaries, filteredTotalEquity, filteredStablecoinsEquityUsd),
    [filteredSummaries, filteredTotalEquity, filteredStablecoinsEquityUsd],
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
