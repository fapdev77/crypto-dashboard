import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  TRADE: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  ORDER_DEALT_IN: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  ORDER_DEALT_OUT: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  OPEN_LONG: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  OPEN_SHORT: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  CLOSE_LONG: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  CLOSE_SHORT: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  SETTLE_FEE: 'text-tone-purple bg-purple-500/15 border-purple-500/30',
  FUNDING_FEE: 'text-tone-purple bg-purple-500/15 border-purple-500/30',
  CONTRACT_MAIN_SETTLE_FEE: 'text-tone-purple bg-purple-500/15 border-purple-500/30',
  SETTLE_FEE_USER_IN: 'text-tone-purple bg-purple-500/15 border-purple-500/30',
  SETTLE_FEE_USER_OUT: 'text-tone-purple bg-purple-500/15 border-purple-500/30',
  CONTRACT_MAIN_SETTLE_FEE_USER_IN: 'text-tone-purple bg-purple-500/15 border-purple-500/30',
  CONTRACT_MAIN_SETTLE_FEE_USER_OUT: 'text-tone-purple bg-purple-500/15 border-purple-500/30',
  REALIZED_PNL: 'text-tone-blue bg-blue-500/15 border-blue-500/30',
  LIQUIDATION: 'text-danger bg-danger/15 border-danger/30',
  DELIVERY: 'text-tone-cyan bg-cyan-500/15 border-cyan-500/30',
  DELIVERY_FEE: 'text-tone-cyan bg-cyan-500/15 border-cyan-500/30',
  BONUS: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  REWARDS: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  TRIAL_FUND: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  TRIAL_FUND_RECYCLE: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  TRANSFER: 'text-success bg-success/15 border-success/30',
  TRANSFER_IN: 'text-success bg-success/15 border-success/30',
  TRANSFER_OUT: 'text-tone-amber bg-amber-500/15 border-amber-500/30',
  TRANS_FROM_EXCHANGE: 'text-success bg-success/15 border-success/30',
  TRANS_TO_EXCHANGE: 'text-tone-amber bg-amber-500/15 border-amber-500/30',
  CONVERT: 'text-tone-slate bg-slate-500/15 border-slate-500/30',
  DEPOSIT: 'text-success bg-success/15 border-success/30',
  WITHDRAW: 'text-tone-amber bg-amber-500/15 border-amber-500/30',
  FEE_REFUND: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  AUTO_DEDUCTION: 'text-tone-slate bg-slate-500/15 border-slate-500/30',
  INTEREST: 'text-tone-orange bg-orange-500/15 border-orange-500/30',
  AIRDROP: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  BONUS_RECOLLECT: 'text-tone-yellow bg-yellow-500/15 border-yellow-500/30',
  OTHERS: 'text-tone-slate bg-slate-500/15 border-slate-500/30',
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

import { getLocalizedTimePeriodOptions } from '../../../utils/dateTimeHelper';

interface Props {
  filters: BitgetTxFilters;
  setFilters: React.Dispatch<React.SetStateAction<BitgetTxFilters>>;
  availableCurrencies: Array<{ value: string; label: string; icon?: React.ReactNode }>;
}

export function BitgetTransactionFilters({ filters, setFilters, availableCurrencies }: Props) {
  const { t } = useTranslation();
  const { keys } = useApiKeysStore();

  const localizedCategories = useMemo(() => [
    { value: 'All', label: t('transactions.filters.allCategories', 'All Categories'), tooltip: 'Show all categories.' },
    { value: 'spot', label: t('transactions.categories.spot', 'Spot'), tooltip: 'Spot market trades and records.' },
    { value: 'usdt-futures', label: t('transactions.categories.mix', 'USDT-Futures'), tooltip: 'USDT-margined perpetual and delivery contracts.' },
    { value: 'coin-futures', label: t('transactions.categories.dmcbl', 'Coin-Futures'), tooltip: 'Coin-margined inverse contracts.' },
    { value: 'usdc-futures', label: t('transactions.categories.umcbl', 'USDC-Futures'), tooltip: 'USDC-margined contracts.' },
    { value: 'margin', label: t('transactions.categories.margin', 'Margin'), tooltip: 'Margin trading account.' },
    { value: 'other', label: t('transactions.categories.others', 'Other'), tooltip: 'Other account activities.' }
  ], [t]);

  const localizedTxTypes = useMemo(() => UNIVERSAL_TX_FILTER_OPTIONS.map(opt => ({
    value: opt.value,
    label: t(`transactions.types.${opt.value}`, opt.label),
    tooltip: opt.description
  })), [t]);
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
        options: localizedCategories,
        labelAll: t('transactions.filters.allCategories', 'All Categories'),
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
        labelAll: t('transactions.filters.allCurrencies', 'All Currencies'),
      }}
      account={{
        value: filters.accountId,
        onChange: (v) => setFilters(prev => ({ ...prev, accountId: v })),
        options: bitgetKeys.map(k => ({ id: k.id, label: k.label || k.exchange, exchange: 'bitget', accountType: k.accountType })),
        labelAll: 'All Bitget Accounts',
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
