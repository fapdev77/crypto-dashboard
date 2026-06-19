import React, { useMemo } from 'react';
import { OrderFilters as FilterState } from '../../../hooks/useOrderReports';
import { Search } from 'lucide-react';
import { useApiKeysStore } from '../../../store/apiKeysStore';

interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  showPeriod?: boolean;
}

const ORDER_TYPES = ['All', 'LIMIT', 'MARKET', 'TP', 'SL', 'CONDITIONAL'];
const TIME_PERIODS = [
  { label: 'Today', ms: 24 * 60 * 60 * 1000 },
  { label: '7 Days', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '14 Days', ms: 14 * 24 * 60 * 60 * 1000 },
  { label: '30 Days', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: '90 Days', ms: 90 * 24 * 60 * 60 * 1000 },
];

export function OrderFilters({ filters, setFilters, showPeriod = false }: Props) {
  const { keys } = useApiKeysStore();
  
  const instrumentsAvailable = useMemo(() => {
    return ['All', 'PERP', 'INVERSE', 'SPOT', 'FUTURES', 'OPTION'];
  }, []);

  const activeKeys = useMemo(() => {
    return keys.filter(k => filters.exchange === 'All' || k.exchange === filters.exchange);
  }, [keys, filters.exchange]);

  // Handle cross-exchange instrument reset
  React.useEffect(() => {
    if (filters.instrument !== 'All' && !instrumentsAvailable.includes(filters.instrument)) {
      setFilters(p => ({ ...p, instrument: 'All' }));
    }
    if (filters.exchange === 'All' && filters.accountId !== 'All') {
      setFilters(p => ({ ...p, accountId: 'All' }));
    } else if (filters.accountId !== 'All' && !activeKeys.some(k => k.id === filters.accountId)) {
      setFilters(p => ({ ...p, accountId: 'All' }));
    }
  }, [filters.exchange, filters.instrument, filters.accountId, instrumentsAvailable, activeKeys, setFilters]);

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

        {/* Account */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">Account:</label>
          <select
            value={filters.accountId}
            onChange={(e) => setFilters(p => ({ ...p, accountId: e.target.value }))}
            disabled={filters.exchange === 'All'}
            className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer max-w-[150px] truncate disabled:opacity-50"
          >
            <option value="All">All Accounts</option>
            {activeKeys.map(k => (
              <option key={k.id} value={k.id}>{k.label || k.exchange}</option>
            ))}
          </select>
        </div>

        {/* Instrument */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">Instrument:</label>
          <select
            value={filters.instrument}
            onChange={(e) => setFilters(p => ({ ...p, instrument: e.target.value }))}
            className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
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

        {/* Side */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">Side:</label>
          <select
            value={filters.side}
            onChange={(e) => setFilters(p => ({ ...p, side: e.target.value }))}
            className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="All">All Sides</option>
            <option value="buy">Buy / Long</option>
            <option value="sell">Sell / Short</option>
          </select>
        </div>

        {/* Time Period (Only for History) */}
        {showPeriod && (
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
