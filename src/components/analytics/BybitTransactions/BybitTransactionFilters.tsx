import React from 'react';
import { TxFilters } from '../../../hooks/useBybitTransactions';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { FilterBar } from '../../ui/FilterBar';

const TX_TYPES = ['All', 'TRADE', 'SETTLEMENT', 'DELIVERY', 'LIQUIDATION', 'BONUS', 'TRANSFER', 'SPOT'];
const CATEGORIES = ['All', 'linear', 'inverse', 'spot', 'option'];
const CURRENCIES = [
  { value: 'USDT', label: 'USDT' },
  { value: 'USDC', label: 'USDC' },
  { value: 'BTC', label: 'BTC' },
  { value: 'ETH', label: 'ETH' },
  { value: 'SOL', label: 'SOL' },
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
  filters: TxFilters;
  setFilters: React.Dispatch<React.SetStateAction<TxFilters>>;
}

export function BybitTransactionFilters({ filters, setFilters }: Props) {
  const { keys } = useApiKeysStore();
  const bybitKeys = keys.filter(k => k.exchange === 'bybit' && k.isActive);

  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (val) => setFilters(p => ({ ...p, search: val })),
        placeholder: 'Search symbol...',
      }}
      // Category filter uses the `instrument` prop (accepts options: string[])
      instrument={{
        value: filters.category,
        onChange: (val) => setFilters(p => ({ ...p, category: val })),
        options: CATEGORIES,
        labelAll: 'All Categories',
      }}
      // Type filter
      type={{
        value: filters.type,
        onChange: (val) => setFilters(p => ({ ...p, type: val })),
        options: TX_TYPES,
        labelAll: 'All Types',
      }}
      // Currency filter uses the `side` prop (accepts options: {value, label}[])
      side={{
        value: filters.currency,
        onChange: (val) => setFilters(p => ({ ...p, currency: val })),
        options: CURRENCIES,
        labelAll: 'All Currencies',
      }}
      // Account filter
      account={{
        value: filters.accountId,
        onChange: (val) => setFilters(p => ({ ...p, accountId: val })),
        options: bybitKeys.map(k => ({ id: k.id, label: k.label || k.exchange, exchange: 'bybit' })),
        labelAll: 'All Accounts',
      }}
      // Period filter
      period={{
        value: String(filters.timePeriod),
        onChange: (val) => setFilters(p => ({ ...p, timePeriod: Number(val) })),
        options: TIME_PERIODS.map(tp => ({ value: String(tp.ms), label: tp.label })),
      }}
    />
  );
}
