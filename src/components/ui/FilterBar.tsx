import React, { useState, useMemo } from 'react';
import { AppTooltip } from './Tooltip';
import { Search, X, ChevronDown } from 'lucide-react';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { ExchangeIcon } from './ExchangeIcon';

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
    options: (string | { value: string; label: string; tooltip?: string })[];
    disabled?: boolean;
    labelAll?: string; // Defaults to "All Instruments"
  };

  // Period Filter
  period?: {
    value: string;
    onChange: (val: any) => void;
    options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  };

  // Side Filter
  side?: {
    value: string;
    onChange: (val: string) => void;
    options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
    labelAll?: string; // Defaults to "All Sides"
  };

  // Type Filter
  type?: {
    value: string;
    onChange: (val: string) => void;
    options: (string | { value: string; label: string; tooltip?: string })[];
    labelAll?: string;
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
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isInstrumentDropdownOpen, setIsInstrumentDropdownOpen] = useState(false);
  const [isSideDropdownOpen, setIsSideDropdownOpen] = useState(false);

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
        <div className="relative z-20">
          <button
            type="button"
            onClick={() => setIsInstrumentDropdownOpen(!isInstrumentDropdownOpen)}
            disabled={instrument.disabled}
            className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between min-w-[140px] cursor-pointer disabled:opacity-50"
          >
            <span className="truncate max-w-[120px]">
              {(() => {
                if (!instrument.value || instrument.value.toUpperCase() === 'ALL') return instrument.labelAll || 'All Instruments';
                const opt = instrument.options.find(o => typeof o === 'object' ? o.value === instrument.value : o === instrument.value);
                return typeof opt === 'object' ? opt.label : opt;
              })()}
            </span>
            <ChevronDown
              className={`h-4 w-4 ml-2 text-gray-400 shrink-0 transition-transform duration-200 ${
                isInstrumentDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          
          {isInstrumentDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsInstrumentDropdownOpen(false)}
              />
              <div className="absolute z-20 w-full mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-lg overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    instrument.onChange('All');
                    setIsInstrumentDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                    instrument.value.toUpperCase() === 'ALL' || !instrument.value
                      ? 'bg-[#2F6BFF] text-white'
                      : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                  }`}
                >
                  <span>{instrument.labelAll || 'All Instruments'}</span>
                </button>
                {instrument.options.map((opt, i) => {
                  const val = typeof opt === 'object' ? opt.value : (opt as string);
                  if (val.toUpperCase() === 'ALL') return null; // handled above
                  const label = typeof opt === 'object' ? opt.label : (opt as string);
                  const tooltip = typeof opt === 'object' ? opt.tooltip : undefined;
                  
                  const btn = (
                    <button
                      key={`${val}-${i}`}
                      type="button"
                      onClick={() => {
                        instrument.onChange(val);
                        setIsInstrumentDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                        instrument.value === val
                          ? 'bg-[#2F6BFF] text-white'
                          : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                    </button>
                  );

                  if (tooltip) {
                    return (
                      <AppTooltip key={`${val}-${i}`} description={tooltip} side="right">
                        <div>{btn}</div>
                      </AppTooltip>
                    );
                  }
                  return btn;
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. Side Select */}
      {side && (
        <div className="relative z-20">
          <button
            type="button"
            onClick={() => setIsSideDropdownOpen(!isSideDropdownOpen)}
            className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between min-w-[140px] cursor-pointer"
          >
            <span className="truncate max-w-[120px] flex items-center gap-2">
              {(() => {
                if (!side.value || side.value === 'All') return side.labelAll || 'All Sides';
                const opt = side.options.find(o => o.value === side.value);
                return (
                  <>
                    {opt?.icon}
                    {opt ? opt.label : side.value}
                  </>
                );
              })()}
            </span>
            <ChevronDown
              className={`h-4 w-4 ml-2 text-gray-400 shrink-0 transition-transform duration-200 ${
                isSideDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          
          {isSideDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsSideDropdownOpen(false)}
              />
              <div className="absolute z-20 w-full mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-lg overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    side.onChange('All');
                    setIsSideDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                    side.value === 'All' || !side.value
                      ? 'bg-[#2F6BFF] text-white'
                      : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                  }`}
                >
                  <span>{side.labelAll || 'All Sides'}</span>
                </button>
                {side.options.map((opt, i) => (
                  <button
                    key={`${opt.value}-${i}`}
                    type="button"
                    onClick={() => {
                      side.onChange(opt.value);
                      setIsSideDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                      side.value === opt.value
                        ? 'bg-[#2F6BFF] text-white'
                        : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                    }`}
                  >
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 5. Type Select */}
      {type && (
        <div className="relative z-20">
          <button
            type="button"
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between min-w-[140px] cursor-pointer"
          >
            <span className="truncate max-w-[120px]">
              {(() => {
                if (!type.value || type.value === 'All') return type.labelAll || 'All Types';
                const opt = type.options.find(o => typeof o === 'object' ? o.value === type.value : o === type.value);
                return typeof opt === 'object' ? opt.label : opt;
              })()}
            </span>
            <ChevronDown
              className={`h-4 w-4 ml-2 text-gray-400 shrink-0 transition-transform duration-200 ${
                isTypeDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          
          {isTypeDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsTypeDropdownOpen(false)}
              />
              <div className="absolute z-20 w-full mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-lg overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    type.onChange('All');
                    setIsTypeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                    type.value === 'All' || !type.value
                      ? 'bg-[#2F6BFF] text-white'
                      : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                  }`}
                >
                  <span>{type.labelAll || 'All Types'}</span>
                </button>
                {type.options.map((opt, i) => {
                  const val = typeof opt === 'object' ? opt.value : (opt as string);
                  if (val === 'All') return null; // handled above
                  const label = typeof opt === 'object' ? opt.label : (opt as string);
                  const tooltip = typeof opt === 'object' ? opt.tooltip : undefined;
                  
                  const btn = (
                    <button
                      key={`${val}-${i}`}
                      type="button"
                      onClick={() => {
                        type.onChange(val);
                        setIsTypeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                        type.value === val
                          ? 'bg-[#2F6BFF] text-white'
                          : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                    </button>
                  );

                  if (tooltip) {
                    return (
                      <AppTooltip key={`${val}-${i}`} description={tooltip} side="right">
                        <div>{btn}</div>
                      </AppTooltip>
                    );
                  }
                  return btn;
                })}
              </div>
            </>
          )}
        </div>
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
