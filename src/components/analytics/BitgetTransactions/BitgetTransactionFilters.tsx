import React from 'react';
import { BitgetTxFilters } from '../../../hooks/useBitgetTransactions';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { FilterBar } from '../../ui/FilterBar';
import { UNIVERSAL_TX_FILTER_OPTIONS } from '../../../utils/transactionTypeMapper';

export const BITGET_TX_TYPES = UNIVERSAL_TX_FILTER_OPTIONS.map(opt => ({
  value: opt.value,
  label: opt.label,
  tooltip: opt.description
}));

export const bitgetTypeColorMap: Record<string, string> = {
  TRADE: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  ORDER_DEALT_IN: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  ORDER_DEALT_OUT: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  OPEN_LONG: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  OPEN_SHORT: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  CLOSE_LONG: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  CLOSE_SHORT: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  SETTLE_FEE: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  FUNDING_FEE: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  CONTRACT_MAIN_SETTLE_FEE: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  SETTLE_FEE_USER_IN: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  SETTLE_FEE_USER_OUT: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  CONTRACT_MAIN_SETTLE_FEE_USER_IN: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  CONTRACT_MAIN_SETTLE_FEE_USER_OUT: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  REALIZED_PNL: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  LIQUIDATION: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
  DELIVERY: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  DELIVERY_FEE: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  BONUS: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  REWARDS: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  TRIAL_FUND: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  TRIAL_FUND_RECYCLE: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  TRANSFER: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  TRANSFER_IN: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  TRANSFER_OUT: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  TRANS_FROM_EXCHANGE: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  TRANS_TO_EXCHANGE: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  CONVERT: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
  DEPOSIT: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  WITHDRAW: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  FEE_REFUND: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  AUTO_DEDUCTION: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
  INTEREST: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  AIRDROP: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  BONUS_RECOLLECT: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  OTHERS: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
};

export const bitgetTypeHexColorMap: Record<string, string> = {
  TRADE: '#3B82F6',
  ORDER_DEALT_IN: '#3B82F6',
  ORDER_DEALT_OUT: '#3B82F6',
  OPEN_LONG: '#3B82F6',
  OPEN_SHORT: '#3B82F6',
  CLOSE_LONG: '#3B82F6',
  CLOSE_SHORT: '#3B82F6',
  SETTLE_FEE: '#A855F7',
  FUNDING_FEE: '#A855F7',
  CONTRACT_MAIN_SETTLE_FEE: '#A855F7',
  SETTLE_FEE_USER_IN: '#A855F7',
  SETTLE_FEE_USER_OUT: '#A855F7',
  CONTRACT_MAIN_SETTLE_FEE_USER_IN: '#A855F7',
  CONTRACT_MAIN_SETTLE_FEE_USER_OUT: '#A855F7',
  REALIZED_PNL: '#3B82F6',
  LIQUIDATION: '#F43F5E',
  DELIVERY: '#06B6D4',
  DELIVERY_FEE: '#06B6D4',
  BONUS: '#EAB308',
  REWARDS: '#EAB308',
  TRIAL_FUND: '#EAB308',
  TRIAL_FUND_RECYCLE: '#EAB308',
  TRANSFER: '#10B981',
  TRANSFER_IN: '#10B981',
  TRANSFER_OUT: '#F59E0B',
  TRANS_FROM_EXCHANGE: '#10B981',
  TRANS_TO_EXCHANGE: '#F59E0B',
  CONVERT: '#64748B',
  DEPOSIT: '#10B981',
  WITHDRAW: '#F59E0B',
  FEE_REFUND: '#EAB308',
  AUTO_DEDUCTION: '#64748B',
  INTEREST: '#F97316',
  AIRDROP: '#EAB308',
  BONUS_RECOLLECT: '#EAB308',
  OTHERS: '#64748B',
};

const CATEGORIES = [
  { value: 'All', label: 'All Categories', tooltip: 'Show all categories.' },
  { value: 'spot', label: 'Spot', tooltip: 'Spot market trades and records.' },
  { value: 'usdt-futures', label: 'USDT-Futures', tooltip: 'USDT-margined perpetual and delivery contracts.' },
  { value: 'coin-futures', label: 'Coin-Futures', tooltip: 'Coin-margined inverse contracts.' },
  { value: 'usdc-futures', label: 'USDC-Futures', tooltip: 'USDC-margined contracts.' },
  { value: 'margin', label: 'Margin', tooltip: 'Margin trading account.' },
  { value: 'other', label: 'Other', tooltip: 'Other account activities.' }
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
  filters: BitgetTxFilters;
  setFilters: React.Dispatch<React.SetStateAction<BitgetTxFilters>>;
  availableCurrencies: Array<{ value: string; label: string; icon?: React.ReactNode }>;
}

export function BitgetTransactionFilters({ filters, setFilters, availableCurrencies }: Props) {
  const { keys } = useApiKeysStore();
  const bitgetKeys = keys.filter(k => k.exchange === 'bitget' && k.isActive);

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
        options: BITGET_TX_TYPES,
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
        options: bitgetKeys.map(k => ({ id: k.id, label: k.label || k.exchange, exchange: 'bitget' })),
        labelAll: 'All Bitget Accounts',
      }}
      period={{
        value: String(filters.timePeriod),
        onChange: (v) => setFilters(prev => ({ ...prev, timePeriod: Number(v) })),
        options: TIME_PERIODS.map(p => ({ value: String(p.ms), label: p.label }))
      }}
    />
  );
}
