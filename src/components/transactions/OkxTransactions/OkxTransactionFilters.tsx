import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  TRADE: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  FUNDING_FEE: 'text-tone-purple bg-purple-500/15 border-purple-500/30',
  REALIZED_PNL: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  LIQUIDATION: 'text-danger bg-danger/15 border-danger/30',
  INTEREST: 'text-tone-orange bg-orange-500/15 border-orange-500/30',
  TRANSFER: 'text-success bg-success/15 border-success/30',
  TRANSFER_IN: 'text-success bg-success/15 border-success/30',
  TRANSFER_OUT: 'text-tone-amber bg-amber-500/15 border-amber-500/30',
  DEPOSIT: 'text-success bg-success/15 border-success/30',
  WITHDRAW: 'text-tone-amber bg-amber-500/15 border-amber-500/30',
  FEE_REFUND: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  REWARDS: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  AUTO_REPAY: 'text-tone-slate bg-slate-500/15 border-slate-500/30',
  CLAWBACK: 'text-danger bg-danger/15 border-danger/30',
  EXERCISE: 'text-tone-cyan bg-cyan-500/15 border-cyan-500/30',
  SETTLEMENT: 'text-tone-cyan bg-cyan-500/15 border-cyan-500/30',
  DELIVERY: 'text-tone-cyan bg-cyan-500/15 border-cyan-500/30',
  OTHER: 'text-tone-slate bg-slate-500/15 border-slate-500/30',
  OTHERS: 'text-tone-slate bg-slate-500/15 border-slate-500/30',
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

import { getLocalizedTimePeriodOptions } from '../../../utils/dateTimeHelper';

interface Props {
  filters: OkxTxFilters;
  setFilters: React.Dispatch<React.SetStateAction<OkxTxFilters>>;
  availableCurrencies: Array<{ value: string; label: string; icon?: React.ReactNode }>;
}

export function OkxTransactionFilters({ filters, setFilters, availableCurrencies }: Props) {
  const { t } = useTranslation();
  const { keys } = useApiKeysStore();

  const localizedCategories = useMemo(() => [
    { value: 'All', label: t('transactions.filters.allCategories', 'All Categories'), tooltip: 'Show all categories.' },
    { value: 'spot', label: t('transactions.categories.spot', 'Spot'), tooltip: 'Spot market trades and bills.' },
    { value: 'swap', label: t('transactions.categories.swap', 'Perpetual Swap'), tooltip: 'Perpetual swap contracts.' },
    { value: 'futures', label: t('transactions.categories.futures', 'Futures'), tooltip: 'Expiring futures contracts.' },
    { value: 'option', label: t('transactions.categories.option', 'Options'), tooltip: 'Options contracts.' },
    { value: 'margin', label: t('transactions.categories.margin', 'Margin'), tooltip: 'Margin trading activities.' },
    { value: 'other', label: t('transactions.categories.others', 'Other'), tooltip: 'Other account bills.' }
  ], [t]);

  const localizedTxTypes = useMemo(() => OKX_TX_TYPES.map(opt => ({
    value: opt.value,
    label: t(`transactions.types.${opt.value}`, opt.label),
    tooltip: opt.tooltip
  })), [t]);
  const okxKeys = keys.filter(k => k.exchange === 'okx' && k.isActive);

  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (v) => setFilters(prev => ({ ...prev, search: v })),
        placeholder: t('transactions.filters.searchPlaceholder', 'Search symbol (e.g. BTC, ETH)...')
      }}
      instrument={{
        value: filters.category,
        onChange: (v) => setFilters(prev => ({ ...prev, category: v })),
        options: localizedCategories,
        labelAll: t('transactions.filters.allCategories', 'All Categories'),
      }}
      type={{
        value: filters.type,
        onChange: (v) => setFilters(prev => ({ ...prev, type: v })),
        options: localizedTxTypes,
        labelAll: t('transactions.filters.allTypes', 'All Types'),
      }}
      side={{
        value: filters.currency,
        onChange: (v) => setFilters(prev => ({ ...prev, currency: v })),
        options: availableCurrencies,
        labelAll: t('transactions.filters.allCurrencies', 'All Currencies'),
      }}
      account={{
        value: filters.accountId,
        onChange: (v) => setFilters(prev => ({ ...prev, accountId: v })),
        options: okxKeys.map(k => ({ id: k.id, label: k.label || k.exchange, exchange: 'okx' })),
        labelAll: t('transactions.filters.allAccounts', 'All OKX Accounts'),
      }}
      period={{
        value: String(filters.timePeriod),
        onChange: (v) => setFilters(prev => ({
          ...prev,
          timePeriod: v,
          customStartDate: v === 'custom' ? prev.customStartDate : undefined,
          customEndDate: v === 'custom' ? prev.customEndDate : undefined,
        })),
        options: getLocalizedTimePeriodOptions(t).map(p => ({ value: p.value, label: p.label, tooltip: p.tooltip, isCustom: p.isCustom })),
        customStartDate: filters.customStartDate,
        customEndDate: filters.customEndDate,
        onCustomDateChange: (start, end) => setFilters(prev => ({
          ...prev,
          timePeriod: 'custom',
          customStartDate: start,
          customEndDate: end,
        })),
      }}
    />
  );
}
