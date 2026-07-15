import React, { useState, useMemo } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { ExchangeIcon } from './ExchangeIcon';
import { AppTooltip } from './Tooltip';

export interface FilterBarProps {
  // Search Filter
  search?: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
  };

  // Optional component to prepend
  prepend?: React.ReactNode;

  // Exchange Filter
  exchange?: {
    value: string;
    onChange: (val: string) => void;
    labelAll?: string; // Defaults to "All Exchanges"
    options?: string[]; // If provided, uses these instead of connected activeExchanges
  };

  // Account Filter
  account?: {
    value: string;
    onChange: (val: string) => void;
    options: Array<{ id: string; label: string; exchange: string }>;
    disabled?: boolean;
    labelAll?: string; // Defaults to "All Accounts"
  };

  // Instrument Filter
  instrument?: {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    disabled?: boolean;
    labelAll?: string; // Defaults to "All Instruments"
  };

  // Period Filter
  period?: {
    value: string;
    onChange: (val: any) => void;
    options: Array<{ value: string; label: string }>;
  };

  // Side Filter
  side?: {
    value: string;
    onChange: (val: string) => void;
    options: Array<{ value: string; label: string }>;
    labelAll?: string; // Defaults to "All Sides"
  };

  // Type Filter
  type?: {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    labelAll?: string; // Defaults to "All Types"
  };

  // Status Filter
  statusSelect?: {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    labelAll?: string; // Defaults to "All Statuses"
  };
}

export function FilterBar({
  search,
  prepend,
  exchange,
  account,
  instrument,
  period,
  side,
  type,
  statusSelect,
}: FilterBarProps) {
  const { keys } = useApiKeysStore();
  const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);

  // Extract unique active exchanges from keys or options
  const activeExchanges = useMemo(() => {
    if (exchange?.options) return exchange.options;
    return Array.from(new Set(keys.filter(k => k.isActive).map(k => k.exchange)));
  }, [keys, exchange?.options]);

  // Clean value for presentation
  const getExchangeLabel = (val: string) => {
    if (!val || val === 'All' || val === 'all') {
      return exchange?.labelAll || 'All Exchanges';
    }
    return val.charAt(0).toUpperCase() + val.slice(1);
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 w-full">
      
      {/* Prepend Component */}
      {prepend}

      {/* 1. Custom Exchange Dropdown */}
      {exchange && (
        <div className="relative z-20">
          <button
            type="button"
            onClick={() => setIsExchangeDropdownOpen(!isExchangeDropdownOpen)}
            className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between min-w-[160px] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {exchange.value !== 'All' && exchange.value !== 'all' && (
                <ExchangeIcon exchange={exchange.value} className="w-4 h-4" />
              )}
              <span>{getExchangeLabel(exchange.value)}</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 ml-2 text-gray-400 transition-transform duration-200 ${
                isExchangeDropdownOpen ? 'rotate-180' : ''
              }`}
            />
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
                    exchange.onChange('All');
                    setIsExchangeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                    exchange.value === 'All' || exchange.value === 'all'
                      ? 'bg-[#2F6BFF] text-white'
                      : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                  }`}
                >
                  <span>{exchange.labelAll || 'All Exchanges'}</span>
                </button>
                {activeExchanges.map(ex => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      exchange.onChange(ex);
                      setIsExchangeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                      exchange.value.toLowerCase() === ex.toLowerCase()
                        ? 'bg-[#2F6BFF] text-white'
                        : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                    }`}
                  >
                    <ExchangeIcon exchange={ex} className="w-4 h-4" />
                    <span className="capitalize">{ex}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. Account Select */}
      {account && (
        <select
          value={account.value}
          onChange={(e) => account.onChange(e.target.value)}
          disabled={account.disabled}
          className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer max-w-[150px] truncate disabled:opacity-50"
        >
          <option value="All">{account.labelAll || 'All Accounts'}</option>
          {account.options.map(k => (
            <option key={k.id} value={k.id}>
              {k.label || k.exchange}
            </option>
          ))}
        </select>
      )}

      {/* 3. Instrument Select */}
      {instrument && (
        <select
          value={instrument.value}
          onChange={(e) => instrument.onChange(e.target.value)}
          disabled={instrument.disabled}
          className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer disabled:opacity-50"
        >
          {instrument.options.map(inst => (
            <option key={inst} value={inst}>
              {inst === 'All' ? (instrument.labelAll || 'All Instruments') : inst}
            </option>
          ))}
        </select>
      )}

      {/* 4. Side Select */}
      {side && (
        <select
          value={side.value}
          onChange={(e) => side.onChange(e.target.value)}
          className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer"
        >
          <option value="All">{side.labelAll || 'All Sides'}</option>
          {side.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* 5. Type Select */}
      {type && (
        <select
          value={type.value}
          onChange={(e) => type.onChange(e.target.value)}
          className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer"
        >
          {type.options.map(t => (
            <option key={t} value={t}>
              {t === 'All' ? (type.labelAll || 'All Types') : t}
            </option>
          ))}
        </select>
      )}

      {/* Status Select */}
      {statusSelect && (
        <select
          value={statusSelect.value}
          onChange={(e) => statusSelect.onChange(e.target.value)}
          className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer"
        >
          {statusSelect.options.map(st => (
            <option key={st} value={st}>
              {st === 'All' ? (statusSelect.labelAll || 'All Statuses') : st}
            </option>
          ))}
        </select>
      )}

      {/* 6. Period Select */}
      {period && (
        <select
          value={period.value}
          onChange={(e) => period.onChange(e.target.value)}
          className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer"
        >
          {period.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* 7. Search Input */}
      {search && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#8E9299]" />
          </div>
          <input
            type="text"
            placeholder={search.placeholder || 'Search...'}
            className="pl-9 pr-10 py-2 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors w-full sm:w-50"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
          />
          {search.value && (
            <AppTooltip description="Clear search">
              <button
                type="button"
                onClick={() => search.onChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8E9299] hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </AppTooltip>
          )}
        </div>
      )}

    </div>
  );
}
