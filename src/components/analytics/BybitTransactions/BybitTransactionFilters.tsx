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
const CATEGORIES = [
  { value: 'All', label: 'All Categories', tooltip: 'Show all categories.' },
  { value: 'spot', label: 'Spot', tooltip: 'Mercado a vista Spot.' },
  { value: 'linear', label: 'Linear', tooltip: 'USDT perpetual, USDT Futures and USDC contract, including USDC perp, USDC futures.' },
  { value: 'inverse', label: 'Inverse', tooltip: 'Inverse contracts including Inverse perpetual and Inverse futures.' },
  { value: 'option', label: 'Options', tooltip: 'Options contracts.' }
];
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
