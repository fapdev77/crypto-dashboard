import React from 'react';
import { TxFilters } from '../../../hooks/useBybitTransactions';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { FilterBar } from '../../ui/FilterBar';

export const TX_TYPES = [
  { value: 'All', label: 'All Types', tooltip: 'All transaction types.' },
  { value: 'TRANSFER_IN', label: 'Transfer in', tooltip: 'Assets that transferred into Unified wallet' },
  { value: 'TRANSFER_OUT', label: 'Transfer out', tooltip: 'Assets that transferred out from Unified wallet' },
  { value: 'TRADE', label: 'Trade', tooltip: 'Trade execution' },
  { value: 'SETTLEMENT', label: 'Funding Fee', tooltip: 'USDT Perp funding settlement, and USDC Perp funding settlement + USDC 8-hour session settlement' },
  { value: 'DELIVERY', label: 'Delivery', tooltip: 'USDC Futures, Option delivery' },
  { value: 'LIQUIDATION', label: 'Liquidation', tooltip: 'Liquidation' },
  { value: 'BONUS', label: 'Bonus Claimed', tooltip: 'Bonus claimed' },
  { value: 'FEE_REFUND', label: 'Fee Refund', tooltip: 'Trading fee refunded' },
  { value: 'AUTO_DEDUCTION', label: 'Auto Deduction', tooltip: 'Asset auto deducted by system (roll back)' },
  { value: 'INTEREST', label: 'Interest', tooltip: 'Interest occurred due to borrowing' },
  { value: 'CURRENCY_BUY', label: 'Currency Buy', tooltip: 'Currency convert, and the liquidation for borrowing asset(UTA loan)' },
  { value: 'CURRENCY_SELL', label: 'Currency Sell', tooltip: 'Currency convert, and the liquidation for borrowing asset(UTA loan)' },
  { value: 'AIRDROP', label: 'Airdrop', tooltip: 'Airdrop' },
  { value: 'TOKENS_SUBSCRIPTION', label: 'Subscription (Leveraged Tokens)', tooltip: 'Spot leverage token subscription' },
  { value: 'TOKENS_REDEMPTION', label: 'Redemption (Leveraged Tokens)', tooltip: 'Spot leverage token redemption' },
  { value: 'BONUS_RECOLLECT', label: 'Bonus Expired', tooltip: 'Bonus expired' },
  { value: 'BORROW', label: 'Borrow', tooltip: 'Manual loan borrow and auto loan borrow' },
  { value: 'REPAY', label: 'Repay', tooltip: 'Manual loan repay and auto loan repay' },
  { value: 'ADL', label: 'Auto-Deleveraging', tooltip: 'ADL Auto-Deleveraging' },
  { value: 'CONVERT', label: 'Convert Buy/Sell', tooltip: 'Currency convert repayment' }
];
export const typeColorMap: Record<string, string> = {
  TRADE: 'text-[#2F6BFF] bg-[#2F6BFF]/10 border-[#2F6BFF]/20',
  SETTLEMENT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  DELIVERY: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  LIQUIDATION: 'text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20',
  BONUS: 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20',
  TRANSFER: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  TRANSFER_IN: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  TRANSFER_OUT: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  SPOT: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  FEE_REFUND: 'text-green-400 bg-green-400/10 border-green-400/20',
  AUTO_DEDUCTION: 'text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20',
  INTEREST: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  CURRENCY_BUY: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  CURRENCY_SELL: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  AIRDROP: 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20',
  TOKENS_SUBSCRIPTION: 'text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/20',
  TOKENS_REDEMPTION: 'text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/20',
  BONUS_RECOLLECT: 'text-stone-400 bg-stone-400/10 border-stone-400/20',
  BORROW: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  REPAY: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  ADL: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  CONVERT: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
};

export const typeHexColorMap: Record<string, string> = {
  TRADE: '#2F6BFF',
  SETTLEMENT: '#FBBF24',
  DELIVERY: '#C084FC',
  LIQUIDATION: '#FF4444',
  BONUS: '#00C853',
  TRANSFER: '#22D3EE',
  TRANSFER_IN: '#22D3EE',
  TRANSFER_OUT: '#22D3EE',
  SPOT: '#818CF8',
  FEE_REFUND: '#4ADE80',
  AUTO_DEDUCTION: '#FF4444',
  INTEREST: '#FB923C',
  CURRENCY_BUY: '#818CF8',
  CURRENCY_SELL: '#818CF8',
  AIRDROP: '#00C853',
  TOKENS_SUBSCRIPTION: '#E879F9',
  TOKENS_REDEMPTION: '#E879F9',
  BONUS_RECOLLECT: '#A8A29E',
  BORROW: '#FACC15',
  REPAY: '#34D399',
  ADL: '#FB7185',
  CONVERT: '#38BDF8',
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
