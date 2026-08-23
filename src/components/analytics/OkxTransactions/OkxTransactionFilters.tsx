import React from 'react';
import { OkxTxFilters } from '../../../hooks/useOkxTransactions';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { FilterBar } from '../../ui/FilterBar';
import { UNIVERSAL_TX_FILTER_OPTIONS } from '../../../utils/transactionTypeMapper';

export const OKX_TX_TYPES = UNIVERSAL_TX_FILTER_OPTIONS.map(opt => ({
  value: opt.value,
  label: opt.label,
  tooltip: opt.description
}));

export const okxTypeColorMap: Record<string, string> = {
  TRADE: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  FUNDING_FEE: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  REALIZED_PNL: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  LIQUIDATION: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
  INTEREST: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  TRANSFER: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  TRANSFER_IN: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  TRANSFER_OUT: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  DEPOSIT: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  WITHDRAW: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  FEE_REFUND: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  REWARDS: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  AUTO_REPAY: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
  CLAWBACK: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
  EXERCISE: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  SETTLEMENT: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  DELIVERY: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  OTHER: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
  OTHERS: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
};

export const okxTypeHexColorMap: Record<string, string> = {
  TRADE: '#3B82F6',
  FUNDING_FEE: '#A855F7',
  REALIZED_PNL: '#3B82F6',
  LIQUIDATION: '#F43F5E',
  INTEREST: '#F97316',
  TRANSFER: '#10B981',
  TRANSFER_IN: '#10B981',
  TRANSFER_OUT: '#F59E0B',
  DEPOSIT: '#10B981',
  WITHDRAW: '#F59E0B',
  FEE_REFUND: '#EAB308',
  REWARDS: '#EAB308',
  AUTO_REPAY: '#64748B',
  CLAWBACK: '#F43F5E',
  EXERCISE: '#06B6D4',
  SETTLEMENT: '#06B6D4',
  DELIVERY: '#06B6D4',
  OTHER: '#64748B',
  OTHERS: '#64748B',
};

const CATEGORIES = [
  { value: 'All', label: 'All Categories', tooltip: 'Show all categories.' },
  { value: 'spot', label: 'Spot', tooltip: 'Spot market trades and bills.' },
  { value: 'swap', label: 'Perpetual Swap', tooltip: 'Perpetual swap contracts.' },
  { value: 'futures', label: 'Futures', tooltip: 'Expiring futures contracts.' },
  { value: 'option', label: 'Options', tooltip: 'Options contracts.' },
  { value: 'margin', label: 'Margin', tooltip: 'Margin trading activities.' },
  { value: 'other', label: 'Other', tooltip: 'Other account bills.' }
];

const TIME_PERIODS = [
  { label: 'All Time', ms: 0 },
  { label: 'Today', ms: 24 * 60 * 60 * 1000 },
  { label: '7 Days', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '14 Days', ms: 14 * 24 * 60 * 60 * 1000 },
  { label: '30 Days', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: '90 Days', ms: 90 * 24 * 60 * 60 * 1000 },
];

interface Props {
  filters: OkxTxFilters;
  setFilters: React.Dispatch<React.SetStateAction<OkxTxFilters>>;
  availableCurrencies: Array<{ value: string; label: string; icon?: React.ReactNode }>;
}

export function OkxTransactionFilters({ filters, setFilters, availableCurrencies }: Props) {
  const { keys } = useApiKeysStore();
  const okxKeys = keys.filter(k => k.exchange === 'okx' && k.isActive);

  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (v) => setFilters(prev => ({ ...prev, search: v })),
        placeholder: 'Search symbol (e.g. BTC, ETH)...'
      }}
      instrument={{
        value: filters.category,
        onChange: (v) => setFilters(prev => ({ ...prev, category: v })),
        options: CATEGORIES,
        labelAll: 'All Categories',
      }}
      type={{
        value: filters.type,
        onChange: (v) => setFilters(prev => ({ ...prev, type: v })),
        options: OKX_TX_TYPES,
        labelAll: 'All Types',
      }}
      side={{
        value: filters.currency,
        onChange: (v) => setFilters(prev => ({ ...prev, currency: v })),
        options: availableCurrencies,
        labelAll: 'All Currencies',
      }}
      account={{
        value: filters.accountId,
        onChange: (v) => setFilters(prev => ({ ...prev, accountId: v })),
        options: okxKeys.map(k => ({ id: k.id, label: k.label || k.exchange, exchange: 'okx' })),
        labelAll: 'All OKX Accounts',
      }}
      period={{
        value: String(filters.timePeriod),
        onChange: (v) => setFilters(prev => ({ ...prev, timePeriod: Number(v) })),
        options: TIME_PERIODS.map(p => ({ value: String(p.ms), label: p.label }))
      }}
    />
  );
}
