import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  TRADE: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  SETTLEMENT: 'text-tone-purple bg-purple-500/15 border-purple-500/30',
  FUNDING_FEE: 'text-tone-purple bg-purple-500/15 border-purple-500/30',
  DELIVERY: 'text-tone-cyan bg-cyan-500/15 border-cyan-500/30',
  LIQUIDATION: 'text-danger bg-danger/15 border-danger/30',
  BONUS: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  REWARDS: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  TRANSFER: 'text-success bg-success/15 border-success/30',
  TRANSFER_IN: 'text-success bg-success/15 border-success/30',
  TRANSFER_OUT: 'text-tone-amber bg-amber-500/15 border-amber-500/30',
  SPOT: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  FEE_REFUND: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  AUTO_DEDUCTION: 'text-tone-slate bg-slate-500/15 border-slate-500/30',
  INTEREST: 'text-tone-orange bg-orange-500/15 border-orange-500/30',
  CURRENCY_BUY: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  CURRENCY_SELL: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  AIRDROP: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  TOKENS_SUBSCRIPTION: 'text-tone-slate bg-slate-500/15 border-slate-500/30',
  TOKENS_REDEMPTION: 'text-tone-slate bg-slate-500/15 border-slate-500/30',
  BONUS_RECOLLECT: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  BORROW: 'text-tone-orange bg-orange-500/15 border-orange-500/30',
  REPAY: 'text-tone-orange bg-orange-500/15 border-orange-500/30',
  ADL: 'text-danger bg-danger/15 border-danger/30',
  CONVERT: 'text-tone-slate bg-slate-500/15 border-slate-500/30',
  OTHERS: 'text-tone-slate bg-slate-500/15 border-slate-500/30',
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
import { getLocalizedTimePeriodOptions } from '../../../utils/dateTimeHelper';

interface Props {
  filters: TxFilters;
  setFilters: React.Dispatch<React.SetStateAction<TxFilters>>;
  availableCurrencies: { value: string; label: string; icon?: React.ReactNode }[];
}

export function BybitTransactionFilters({ filters, setFilters, availableCurrencies }: Props) {
  const { t } = useTranslation();
  const { keys } = useApiKeysStore();

  const localizedCategories = useMemo(() => [
    { value: 'All', label: t('transactions.filters.allCategories', 'All Categories'), tooltip: 'Show all categories.' },
    { value: 'spot', label: t('transactions.categories.spot', 'Spot'), tooltip: 'Mercado a vista Spot.' },
    { value: 'linear', label: t('transactions.categories.linear', 'Linear'), tooltip: 'USDT perpetual, USDT Futures and USDC contract, including USDC perp, USDC futures.' },
    { value: 'inverse', label: t('transactions.categories.inverse', 'Inverse'), tooltip: 'Inverse contracts including Inverse perpetual and Inverse futures.' },
    { value: 'option', label: t('transactions.categories.option', 'Options'), tooltip: 'Options contracts.' }
  ], [t]);

  const localizedTxTypes = useMemo(() => UNIVERSAL_TX_FILTER_OPTIONS.map(opt => ({
    value: opt.value,
    label: t(`transactions.types.${opt.value}`, opt.label),
    tooltip: opt.description
  })), [t]);
  const bybitKeys = keys.filter(k => k.exchange === 'bybit' && k.isActive);

  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (val) => setFilters(p => ({ ...p, search: val })),
        placeholder: t('transactions.filters.searchPlaceholder', 'Search symbol...'),
      }}
      // Category filter uses the `instrument` prop (accepts options: string[])
      instrument={{
        value: filters.category,
        onChange: (val) => setFilters(p => ({ ...p, category: val })),
        options: localizedCategories,
        labelAll: t('transactions.filters.allCategories', 'All Categories'),
      }}
      // Type filter
      type={{
        value: filters.type,
        onChange: (val) => setFilters(p => ({ ...p, type: val })),
        options: localizedTxTypes,
        labelAll: t('transactions.filters.allTypes', 'All Types'),
      }}
      // Currency filter uses the `side` prop (accepts options: {value, label}[])
      side={{
        value: filters.currency,
        onChange: (val) => setFilters(p => ({ ...p, currency: val })),
        options: availableCurrencies,
        labelAll: t('transactions.filters.allCurrencies', 'All Currencies'),
      }}
      // Account filter
      account={{
        value: filters.accountId,
        onChange: (val) => setFilters(p => ({ ...p, accountId: val })),
        options: bybitKeys.map(k => ({ id: k.id, label: k.label || k.exchange, exchange: 'bybit' })),
        labelAll: t('transactions.filters.allAccounts', 'All Accounts'),
      }}
      // Period filter
      period={{
        value: String(filters.timePeriod),
        onChange: (val) => setFilters(p => ({
          ...p,
          timePeriod: val,
          customStartDate: val === 'custom' ? p.customStartDate : undefined,
          customEndDate: val === 'custom' ? p.customEndDate : undefined,
        })),
        options: getLocalizedTimePeriodOptions(t).map(tp => ({ value: tp.value, label: tp.label, tooltip: tp.tooltip, isCustom: tp.isCustom })),
        customStartDate: filters.customStartDate,
        customEndDate: filters.customEndDate,
        onCustomDateChange: (start, end) => setFilters(p => ({
          ...p,
          timePeriod: 'custom',
          customStartDate: start,
          customEndDate: end,
        })),
      }}
    />
  );
}
