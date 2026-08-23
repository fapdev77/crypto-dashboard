import React from 'react';
import { BitgetTxFilters } from '../../../hooks/useBitgetTransactions';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { FilterBar } from '../../ui/FilterBar';

export const BITGET_TX_TYPES = [
  { value: 'All', label: 'All Types', tooltip: 'All transaction types' },
  { value: 'FUNDING_FEE', label: 'Funding Fee', tooltip: 'Funding rate settlement on perpetual futures' },
  { value: 'SETTLE_FEE', label: 'Funding Settlement', tooltip: 'Contract funding fee settlement in/out' },
  { value: 'CONTRACT_MAIN_SETTLE_FEE', label: 'Contract Settlement', tooltip: 'Contract main settlement fee' },
  { value: 'TRADE', label: 'Trade', tooltip: 'Futures or Spot trade execution' },
  { value: 'ORDER_DEALT_IN', label: 'Order Buy / Deal In', tooltip: 'Spot/Futures deal in execution' },
  { value: 'ORDER_DEALT_OUT', label: 'Order Sell / Deal Out', tooltip: 'Spot/Futures deal out execution' },
  { value: 'OPEN_LONG', label: 'Open Long', tooltip: 'Open long futures position' },
  { value: 'OPEN_SHORT', label: 'Open Short', tooltip: 'Open short futures position' },
  { value: 'CLOSE_LONG', label: 'Close Long', tooltip: 'Close long futures position' },
  { value: 'CLOSE_SHORT', label: 'Close Short', tooltip: 'Close short futures position' },
  { value: 'REALIZED_PNL', label: 'Realized PnL', tooltip: 'Realized profit/loss settlement' },
  { value: 'TRANSFER_IN', label: 'Transfer In', tooltip: 'Assets transferred into account/wallet' },
  { value: 'TRANSFER_OUT', label: 'Transfer Out', tooltip: 'Assets transferred out from account/wallet' },
  { value: 'TRANSFER', label: 'Transfer', tooltip: 'Internal or cross-account transfer' },
  { value: 'CONVERT', label: 'Convert / Swap', tooltip: 'Token exchange or swap' },
  { value: 'DEPOSIT', label: 'Deposit', tooltip: 'On-chain or fiat deposit' },
  { value: 'WITHDRAW', label: 'Withdraw', tooltip: 'On-chain or fiat withdrawal' },
  { value: 'LIQUIDATION', label: 'Liquidation', tooltip: 'Forced position liquidation event' },
  { value: 'DELIVERY', label: 'Delivery', tooltip: 'Futures delivery settlement' },
  { value: 'DELIVERY_FEE', label: 'Delivery Fee', tooltip: 'Futures delivery settlement fee' },
  { value: 'BONUS', label: 'Bonus / Trial Fund', tooltip: 'Rewards or trial fund claimed' },
  { value: 'BONUS_RECOLLECT', label: 'Bonus Expired', tooltip: 'Trial fund expired or recollected' },
  { value: 'FEE_REFUND', label: 'Fee Refund / Rebate', tooltip: 'Trading fee refunded or VIP rebate' },
  { value: 'AUTO_DEDUCTION', label: 'Auto Deduction', tooltip: 'Asset auto deducted by system' },
  { value: 'INTEREST', label: 'Interest', tooltip: 'Borrowing or margin interest' },
  { value: 'AIRDROP', label: 'Airdrop', tooltip: 'Promotional airdrop credit' },
];

export const bitgetTypeColorMap: Record<string, string> = {
  TRADE: 'text-[#2F6BFF] bg-[#2F6BFF]/10 border-[#2F6BFF]/20',
  ORDER_DEALT_IN: 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20',
  ORDER_DEALT_OUT: 'text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20',
  OPEN_LONG: 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20',
  OPEN_SHORT: 'text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20',
  CLOSE_LONG: 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20',
  CLOSE_SHORT: 'text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20',
  SETTLE_FEE: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  FUNDING_FEE: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  CONTRACT_MAIN_SETTLE_FEE: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  SETTLE_FEE_USER_IN: 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20',
  SETTLE_FEE_USER_OUT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  CONTRACT_MAIN_SETTLE_FEE_USER_IN: 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20',
  CONTRACT_MAIN_SETTLE_FEE_USER_OUT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  REALIZED_PNL: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  LIQUIDATION: 'text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20',
  DELIVERY: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  DELIVERY_FEE: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  BONUS: 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20',
  TRANSFER: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  TRANSFER_IN: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  TRANSFER_OUT: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  TRANS_FROM_EXCHANGE: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  TRANS_TO_EXCHANGE: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  CONVERT: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  DEPOSIT: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  WITHDRAW: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  FEE_REFUND: 'text-green-400 bg-green-400/10 border-green-400/20',
  AUTO_DEDUCTION: 'text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20',
  INTEREST: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  AIRDROP: 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20',
  BONUS_RECOLLECT: 'text-stone-400 bg-stone-400/10 border-stone-400/20',
};

export const bitgetTypeHexColorMap: Record<string, string> = {
  TRADE: '#2F6BFF',
  ORDER_DEALT_IN: '#00C853',
  ORDER_DEALT_OUT: '#FF4444',
  OPEN_LONG: '#00C853',
  OPEN_SHORT: '#FF4444',
  CLOSE_LONG: '#00C853',
  CLOSE_SHORT: '#FF4444',
  SETTLE_FEE: '#FBBF24',
  FUNDING_FEE: '#FBBF24',
  CONTRACT_MAIN_SETTLE_FEE: '#FBBF24',
  SETTLE_FEE_USER_IN: '#00C853',
  SETTLE_FEE_USER_OUT: '#FBBF24',
  CONTRACT_MAIN_SETTLE_FEE_USER_IN: '#00C853',
  CONTRACT_MAIN_SETTLE_FEE_USER_OUT: '#FBBF24',
  REALIZED_PNL: '#10B981',
  LIQUIDATION: '#FF4444',
  DELIVERY: '#C084FC',
  DELIVERY_FEE: '#C084FC',
  BONUS: '#00C853',
  TRANSFER: '#22D3EE',
  TRANSFER_IN: '#22D3EE',
  TRANSFER_OUT: '#22D3EE',
  TRANS_FROM_EXCHANGE: '#22D3EE',
  TRANS_TO_EXCHANGE: '#22D3EE',
  CONVERT: '#38BDF8',
  DEPOSIT: '#34D399',
  WITHDRAW: '#FB7185',
  FEE_REFUND: '#4ADE80',
  AUTO_DEDUCTION: '#FF4444',
  INTEREST: '#FB923C',
  AIRDROP: '#00C853',
  BONUS_RECOLLECT: '#A8A29E',
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
