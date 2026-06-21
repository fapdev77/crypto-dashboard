import React, { useMemo, useState } from 'react';
import { OrderFilters as FilterState } from '../../../hooks/useOrderReports';
import { Search, X } from 'lucide-react';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { ExchangeIcon } from '../../ui/ExchangeIcon';

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
  const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);
  
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

  // Handle empty text cleaning
  const clearFilterText = () => {
    setFilters(p => ({ ...p, symbols: '' }));
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 w-full">
      
      {/* Exchange Filter Custom Dropdown */}
      <div className="relative z-20">
        <button
          type="button"
          onClick={() => setIsExchangeDropdownOpen(!isExchangeDropdownOpen)}
          className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between min-w-[160px]"
        >
          <div className="flex items-center gap-2">
            {filters.exchange !== 'All' && (
              <ExchangeIcon exchange={filters.exchange} className="w-4 h-4" />
            )}
            <span>
              {filters.exchange === 'All'
                ? 'Todas Exchanges'
                : filters.exchange.charAt(0).toUpperCase() + filters.exchange.slice(1)}
            </span>
          </div>
          <svg className={`h-4 w-4 ml-2 text-gray-400 transition-transform ${isExchangeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExchangeDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsExchangeDropdownOpen(false)}
            />
            <div className="absolute z-20 w-full mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setFilters(p => ({ ...p, exchange: 'All' }));
                  setIsExchangeDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${filters.exchange === 'All' ? 'bg-[#2F6BFF] text-white' : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                  }`}
              >
                <span>Todas Exchanges</span>
              </button>
              {Array.from(new Set(keys.filter(apiKey => apiKey.isActive).map(apiKey => apiKey.exchange))).map(exchange => (
                <button
                  key={exchange}
                  type="button"
                  onClick={() => {
                    setFilters(p => ({ ...p, exchange }));
                    setIsExchangeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${filters.exchange === exchange ? 'bg-[#2F6BFF] text-white' : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                    }`}
                >
                  <ExchangeIcon exchange={exchange} className="w-4 h-4" />
                  <span>{exchange.charAt(0).toUpperCase() + exchange.slice(1)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Account */}
      <select
        value={filters.accountId}
        onChange={(e) => setFilters(p => ({ ...p, accountId: e.target.value }))}
        disabled={filters.exchange === 'All'}
        className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer max-w-[150px] truncate disabled:opacity-50"
      >
        <option value="All">All Accounts</option>
        {activeKeys.map(k => (
          <option key={k.id} value={k.id}>{k.label || k.exchange}</option>
        ))}
      </select>

      {/* Instrument */}
      <select
        value={filters.instrument}
        onChange={(e) => setFilters(p => ({ ...p, instrument: e.target.value }))}
        className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer"
      >
        {instrumentsAvailable.map(inst => (
          <option key={inst} value={inst}>{inst === 'All' ? 'All Instruments' : inst}</option>
        ))}
      </select>

      {/* Side */}
      <select
        value={filters.side}
        onChange={(e) => setFilters(p => ({ ...p, side: e.target.value }))}
        className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer"
      >
        <option value="All">All Sides</option>
        <option value="buy">Buy / Long</option>
        <option value="sell">Sell / Short</option>
      </select>

      {/* Type */}
      <select
        value={filters.type}
        onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))}
        className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer"
      >
        {ORDER_TYPES.map(t => (
          <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
        ))}
      </select>

      {/* Time Period (Only for History) */}
      {showPeriod && (
        <select
          value={filters.timePeriod}
          onChange={(e) => setFilters(p => ({ ...p, timePeriod: Number(e.target.value) }))}
          className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer"
        >
          {TIME_PERIODS.map(tp => (
            <option key={tp.label} value={tp.ms}>{tp.label}</option>
          ))}
        </select>
      )}

      {/* Symbol Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-[#8E9299]" />
        </div>
        <input
          type="text"
          placeholder="Search..."
          className="pl-9 pr-10 py-2 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors w-full sm:w-48"
          value={filters.symbols}
          onChange={(e) => setFilters(p => ({ ...p, symbols: e.target.value }))}
        />
        {filters.symbols && (
          <button
            onClick={clearFilterText}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8E9299] hover:text-white transition-colors"
            title="Clear filter"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

    </div>
  );
}
