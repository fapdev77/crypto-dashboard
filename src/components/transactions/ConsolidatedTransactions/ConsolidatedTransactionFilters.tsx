import React, { useMemo } from 'react';
import { ConsolidatedTxFilters } from '../../../hooks/useConsolidatedTransactions';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { FilterBar } from '../../ui/FilterBar';
import { UNIVERSAL_TX_FILTER_OPTIONS } from '../../../utils/transactionTypeMapper';
import { CoinIcon } from '../../ui/CoinIcon';

export const TX_TYPES = UNIVERSAL_TX_FILTER_OPTIONS.map(opt => ({
  value: opt.value,
  label: opt.label,
  tooltip: opt.description,
}));

const CATEGORIES = [
  { value: 'All', label: 'All Categories', tooltip: 'Show all categories across all exchanges.' },
  { value: 'spot', label: 'Spot', tooltip: 'Spot market cash trading.' },
  { value: 'linear', label: 'Linear', tooltip: 'USDT / USDC perpetual & linear futures contracts.' },
  { value: 'inverse', label: 'Inverse', tooltip: 'Coin-margined inverse perpetual & futures contracts.' },
  { value: 'option', label: 'Options', tooltip: 'European & American style option contracts.' },
  { value: 'margin', label: 'Margin', tooltip: 'Isolated & cross-margin leveraged orders.' },
];

const TIME_PERIODS = [
  { label: 'All Time', ms: 0 },
  { label: 'Today', ms: 24 * 60 * 60 * 1000 },
  { label: '7 Days', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '14 Days', ms: 14 * 24 * 60 * 60 * 1000 },
  { label: '30 Days', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: '90 Days', ms: 90 * 24 * 60 * 60 * 1000 },
  { label: '120 Days', ms: 120 * 24 * 60 * 60 * 1000 },
  { label: '6 Months', ms: 180 * 24 * 60 * 60 * 1000 },
  { label: '1 Year', ms: 365 * 24 * 60 * 60 * 1000 },
];

interface Props {
  filters: ConsolidatedTxFilters;
  setFilters: React.Dispatch<React.SetStateAction<ConsolidatedTxFilters>>;
  availableCurrencies: string[];
}

export function ConsolidatedTransactionFilters({ filters, setFilters, availableCurrencies }: Props) {
  const { keys } = useApiKeysStore();
  const useMockData = useSettingsStore(state => state.useMockData);

  // Available exchanges for filter
  const exchangeOptions = useMemo(() => {
    if (useMockData) return ['bybit', 'bitget', 'okx'];
    const exchs = new Set<string>();
    keys.filter(k => k.isActive).forEach(k => exchs.add(k.exchange.toLowerCase()));
    return Array.from(exchs);
  }, [keys, useMockData]);

  // Account options filtered by selected exchange if one is chosen
  const accountOptions = useMemo(() => {
    if (useMockData) {
      return [
        { id: 'mock-bybit', label: 'Bybit Demo Account', exchange: 'bybit' },
        { id: 'mock-bitget', label: 'Bitget Demo Account', exchange: 'bitget' },
        { id: 'mock-okx', label: 'OKX Demo Account', exchange: 'okx' },
      ].filter(a => filters.exchange.toLowerCase() === 'all' || a.exchange === filters.exchange.toLowerCase());
    }

    return keys
      .filter(k => k.isActive && (filters.exchange.toLowerCase() === 'all' || k.exchange.toLowerCase() === filters.exchange.toLowerCase()))
      .map(k => ({
        id: k.id,
        label: k.label || k.exchange,
        exchange: k.exchange.toLowerCase(),
        accountType: k.accountType,
      }));
  }, [keys, useMockData, filters.exchange]);

  // Format currencies with CoinIcon
  const currencyOptions = useMemo(() => {
    return availableCurrencies.map(c => ({
      value: c,
      label: c,
      icon: <CoinIcon symbol={c} size={16} />,
    }));
  }, [availableCurrencies]);

  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (val) => setFilters(p => ({ ...p, search: val })),
        placeholder: 'Search symbol or asset...',
      }}
      exchange={{
        value: filters.exchange,
        onChange: (val) => setFilters(p => ({ ...p, exchange: val, accountId: 'All' })),
        options: exchangeOptions,
        labelAll: 'All Exchanges',
        tooltip: 'Filter transactions by exchange venue',
      }}
      account={{
        value: filters.accountId,
        onChange: (val) => setFilters(p => ({ ...p, accountId: val })),
        options: accountOptions,
        labelAll: 'All Accounts',
        tooltip: 'Filter transactions by connected API key account',
      }}
      instrument={{
        value: filters.category,
        onChange: (val) => setFilters(p => ({ ...p, category: val })),
        options: CATEGORIES,
        labelAll: 'All Categories',
        tooltip: 'Filter by instrument contract market',
      }}
      type={{
        value: filters.type,
        onChange: (val) => setFilters(p => ({ ...p, type: val })),
        options: TX_TYPES,
        labelAll: 'All Types',
        tooltip: 'Filter by universal transaction activity type',
      }}
      side={{
        value: filters.currency,
        onChange: (val) => setFilters(p => ({ ...p, currency: val })),
        options: currencyOptions,
        labelAll: 'All Currencies',
        tooltip: 'Filter by currency asset',
      }}
      period={{
        value: String(filters.timePeriod),
        onChange: (val) => setFilters(p => ({ ...p, timePeriod: Number(val) })),
        options: TIME_PERIODS.map(tp => ({ value: String(tp.ms), label: tp.label })),
        tooltip: 'Filter by execution time range',
      }}
    />
  );
}
