import React from 'react';
import { TxFilters } from '../../../hooks/useBybitTransactions';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { FilterBar } from '../../ui/FilterBar';
import { UNIVERSAL_TX_FILTER_OPTIONS } from '../../../utils/transactionTypeMapper';

export const TX_TYPES = UNIVERSAL_TX_FILTER_OPTIONS.map(opt => ({
  value: opt.value,
  label: opt.label,
  tooltip: opt.description
}));
export const typeColorMap: Record<string, string> = {
  TRADE: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  SETTLEMENT: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  FUNDING_FEE: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  DELIVERY: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  LIQUIDATION: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
  BONUS: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  REWARDS: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  TRANSFER: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  TRANSFER_IN: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  TRANSFER_OUT: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  SPOT: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  FEE_REFUND: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  AUTO_DEDUCTION: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
  INTEREST: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  CURRENCY_BUY: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  CURRENCY_SELL: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  AIRDROP: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  TOKENS_SUBSCRIPTION: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
  TOKENS_REDEMPTION: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
  BONUS_RECOLLECT: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  BORROW: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  REPAY: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  ADL: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
  CONVERT: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
  OTHERS: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
};

export const typeHexColorMap: Record<string, string> = {
  TRADE: '#3B82F6',
  SETTLEMENT: '#A855F7',
  FUNDING_FEE: '#A855F7',
  DELIVERY: '#06B6D4',
  LIQUIDATION: '#F43F5E',
  BONUS: '#EAB308',
  REWARDS: '#EAB308',
  TRANSFER: '#10B981',
  TRANSFER_IN: '#10B981',
  TRANSFER_OUT: '#F59E0B',
  SPOT: '#3B82F6',
  FEE_REFUND: '#EAB308',
  AUTO_DEDUCTION: '#64748B',
  INTEREST: '#F97316',
  CURRENCY_BUY: '#3B82F6',
  CURRENCY_SELL: '#3B82F6',
  AIRDROP: '#EAB308',
  TOKENS_SUBSCRIPTION: '#64748B',
  TOKENS_REDEMPTION: '#64748B',
  BONUS_RECOLLECT: '#EAB308',
  BORROW: '#F97316',
  REPAY: '#F97316',
  ADL: '#F43F5E',
  CONVERT: '#64748B',
  OTHERS: '#64748B',
};

const CATEGORIES = [
  { value: 'All', label: 'All Categories', tooltip: 'Show all categories.' },
  { value: 'spot', label: 'Spot', tooltip: 'Mercado a vista Spot.' },
  { value: 'linear', label: 'Linear', tooltip: 'USDT perpetual, USDT Futures and USDC contract, including USDC perp, USDC futures.' },
  { value: 'inverse', label: 'Inverse', tooltip: 'Inverse contracts including Inverse perpetual and Inverse futures.' },
  { value: 'option', label: 'Options', tooltip: 'Options contracts.' }
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
  availableCurrencies: { value: string; label: string; icon?: React.ReactNode }[];
}

export function BybitTransactionFilters({ filters, setFilters, availableCurrencies }: Props) {
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
        options: availableCurrencies,
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
