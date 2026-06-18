import React, { useMemo } from 'react';
import { OrderFilters as FilterState } from '../../../hooks/useOrderReports';
import { Search } from 'lucide-react';

interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

const ORDER_TYPES = ['All', 'LIMIT', 'MARKET', 'TP', 'SL', 'CONDITIONAL'];
const TIME_PERIODS = [
  { label: 'Today', ms: 24 * 60 * 60 * 1000 },
  { label: '7 Days', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '14 Days', ms: 14 * 24 * 60 * 60 * 1000 },
  { label: '30 Days', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: '90 Days', ms: 90 * 24 * 60 * 60 * 1000 },
];

export function OrderFilters({ filters, setFilters }: Props) {
  
  const instrumentsAvailable = useMemo(() => {
    if (filters.exchange === 'bitget') return ['All', 'USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'];
    if (filters.exchange === 'bybit') return ['All', 'linear', 'inverse', 'spot'];
    if (filters.exchange === 'okx') return ['All', 'SWAP', 'FUTURES', 'SPOT', 'MARGIN'];
    return ['All'];
  }, [filters.exchange]);

  // Handle cross-exchange instrument reset
  React.useEffect(() => {
    if (filters.instrument !== 'All' && !instrumentsAvailable.includes(filters.instrument)) {
      setFilters(p => ({ ...p, instrument: 'All' }));
    }
  }, [filters.exchange, filters.instrument, instrumentsAvailable, setFilters]);

  return (
    <div className="flex flex-wrap items-center gap-3">
        {/* Symbol Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search symbol..."
            className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg pl-9 pr-3 py-1.5 focus:outline-none w-36 focus:w-48 transition-all"
            value={filters.symbols}
            onChange={(e) => setFilters(p => ({ ...p, symbols: e.target.value }))}
          />
        </div>

        {/* Status Toggle */}
        <div className="flex items-center gap-2 ml-1">
          <label className="text-sm text-gray-500 whitespace-nowrap">Status:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters(p => ({ ...p, status: e.target.value as 'OPEN' | 'CLOSED' }))}
            className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="OPEN">Open Orders</option>
            <option value="CLOSED">Order History</option>
          </select>
        </div>

        {/* Exchanges */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">Exchange:</label>
          <select
            value={filters.exchange}
            onChange={(e) => setFilters(p => ({ ...p, exchange: e.target.value }))}
            className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="All">All Exchanges</option>
            <option value="bitget">Bitget</option>
            <option value="bybit">Bybit</option>
            <option value="okx">OKX</option>
          </select>
        </div>

        {/* Instrument */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">Instrument:</label>
          <select
            value={filters.instrument}
            onChange={(e) => setFilters(p => ({ ...p, instrument: e.target.value }))}
            disabled={filters.exchange === 'All'}
            className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer disabled:opacity-50"
          >
            {instrumentsAvailable.map(inst => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">Type:</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))}
            className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            {ORDER_TYPES.map(t => (
              <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
            ))}
          </select>
        </div>

        {/* Time Period (Only for History) */}
        {filters.status === 'CLOSED' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap">Period:</label>
            <select
              value={filters.timePeriod}
              onChange={(e) => setFilters(p => ({ ...p, timePeriod: Number(e.target.value) }))}
              className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              {TIME_PERIODS.map(tp => (
                <option key={tp.label} value={tp.ms}>{tp.label}</option>
              ))}
            </select>
          </div>
        )}
    </div>
  );
}
