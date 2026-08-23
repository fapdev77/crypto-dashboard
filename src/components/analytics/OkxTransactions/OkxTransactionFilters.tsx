import React from 'react';
import { OkxTxFilters } from '../../../hooks/useOkxTransactions';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { FilterBar } from '../../ui/FilterBar';

export const OKX_TX_TYPES = [
  { value: 'All', label: 'All Types', tooltip: 'All transaction types.' },
  { value: 'TRANSFER_IN', label: 'Transfer in', tooltip: 'Assets transferred into account/sub-account' },
  { value: 'TRANSFER_OUT', label: 'Transfer out', tooltip: 'Assets transferred out from account/sub-account' },
  { value: 'TRANSFER', label: 'Transfer', tooltip: 'Internal or cross-account transfer' },
  { value: 'TRADE', label: 'Trade', tooltip: 'Spot, Margin, Futures, or Swap trade execution' },
  { value: 'FUNDING_FEE', label: 'Funding Fee', tooltip: 'Perpetual swap funding rate payment/collection' },
  { value: 'LIQUIDATION', label: 'Liquidation', tooltip: 'Forced liquidation event or penalty' },
  { value: 'INTEREST', label: 'Interest', tooltip: 'Borrowing or margin loan interest deduction' },
  { value: 'DEPOSIT', label: 'Deposit', tooltip: 'On-chain crypto deposit' },
  { value: 'WITHDRAW', label: 'Withdraw', tooltip: 'On-chain crypto withdrawal' },
  { value: 'FEE_REFUND', label: 'Fee Refund', tooltip: 'Trading fee refund or rebate' },
  { value: 'AUTO_REPAY', label: 'Auto Repay', tooltip: 'Auto repayment of borrowed liability' },
  { value: 'CLAWBACK', label: 'Clawback', tooltip: 'System insurance fund clawback deduction' },
  { value: 'EXERCISE', label: 'Exercise', tooltip: 'Option contract exercise settlement' },
  { value: 'SETTLEMENT', label: 'Settlement', tooltip: 'Futures contract expiry delivery / settlement' },
  { value: 'REALIZED_PNL', label: 'Realized PnL', tooltip: 'Realized profit/loss settlement' },
  { value: 'OTHER', label: 'Other', tooltip: 'Other miscellaneous account activities' },
];

export const okxTypeColorMap: Record<string, string> = {
  TRADE: 'text-[#2F6BFF] bg-[#2F6BFF]/10 border-[#2F6BFF]/20',
  FUNDING_FEE: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  REALIZED_PNL: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  LIQUIDATION: 'text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20',
  INTEREST: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  TRANSFER: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  TRANSFER_IN: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  TRANSFER_OUT: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  DEPOSIT: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  WITHDRAW: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  FEE_REFUND: 'text-green-400 bg-green-400/10 border-green-400/20',
  AUTO_REPAY: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  CLAWBACK: 'text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20',
  EXERCISE: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  SETTLEMENT: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  OTHER: 'text-stone-400 bg-stone-400/10 border-stone-400/20',
};

export const okxTypeHexColorMap: Record<string, string> = {
  TRADE: '#2F6BFF',
  FUNDING_FEE: '#FBBF24',
  REALIZED_PNL: '#10B981',
  LIQUIDATION: '#FF4444',
  INTEREST: '#FB923C',
  TRANSFER: '#22D3EE',
  TRANSFER_IN: '#22D3EE',
  TRANSFER_OUT: '#22D3EE',
  DEPOSIT: '#34D399',
  WITHDRAW: '#FB7185',
  FEE_REFUND: '#4ADE80',
  AUTO_REPAY: '#C084FC',
  CLAWBACK: '#FF4444',
  EXERCISE: '#818CF8',
  SETTLEMENT: '#2DD4BF',
  OTHER: '#A8A29E',
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
