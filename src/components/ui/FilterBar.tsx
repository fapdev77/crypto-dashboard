import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppTooltip } from './Tooltip';
import { Search, X, ChevronDown, Calendar, Users } from 'lucide-react';
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
    tooltip?: string;
  };

  // Account Filter
  account?: {
    value: string;
    onChange: (val: string) => void;
    options: Array<{ id: string; label: string; exchange: string; accountType?: string; tooltip?: string }>;
    disabled?: boolean;
    disabledTooltip?: string;
    labelAll?: string; // Defaults to "All Accounts"
    tooltip?: string;
  };

  // Instrument Filter
  instrument?: {
    value: string;
    onChange: (val: string) => void;
    options: (string | { value: string; label: string; tooltip?: string })[];
    disabled?: boolean;
    labelAll?: string; // Defaults to "All Instruments"
    tooltip?: string;
  };

  // Period Filter
  period?: {
    value: string;
    onChange: (val: any) => void;
    options: Array<{ value: string; label: string; icon?: React.ReactNode; tooltip?: string }>;
    tooltip?: string;
  };

  // Side Filter
  side?: {
    value: string;
    onChange: (val: string) => void;
    options: Array<{ value: string; label: string; icon?: React.ReactNode; tooltip?: string }>;
    labelAll?: string; // Defaults to "All Sides"
    tooltip?: string;
  };

  // Type Filter
  type?: {
    value: string;
    onChange: (val: string) => void;
    options: (string | { value: string; label: string; tooltip?: string })[];
    labelAll?: string;
    tooltip?: string;
  };

  // Status Filter
  statusSelect?: {
    value: string;
    onChange: (val: string) => void;
    options: (string | { value: string; label: string; tooltip?: string })[];
    labelAll?: string; // Defaults to "All Statuses"
    tooltip?: string;
  };
}

type DropdownKey = 'exchange' | 'account' | 'instrument' | 'side' | 'type' | 'status' | 'period' | null;

function getStatusTooltip(status: string): string {
  const s = status.toUpperCase();
  if (s === 'ALL') return 'Show all order statuses';
  if (s === 'FILLED') return 'Orders that have been completely executed';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'Orders that were cancelled before full execution';
  if (s === 'PARTIALLY_FILLED') return 'Orders that were partially executed';
  if (s === 'REJECTED') return 'Orders that were rejected by the exchange';
  if (s === 'OPEN') return 'Active orders currently waiting in the orderbook';
  return `Filter by status: ${status}`;
}

function getPeriodTooltip(label: string, value: string): string {
  const l = label.toLowerCase();
  const v = String(value).toLowerCase();
  if (l === 'today' || v === 'today') return 'View records from the last 24 hours';
  if (l.includes('7 day') || v === '7d') return 'View records from the last 7 days';
  if (l.includes('14 day') || v === '14d') return 'View records from the last 14 days';
  if (l.includes('30 day') || v === '30d') return 'View records from the last 30 days';
  if (l.includes('90 day') || v === '90d') return 'View records from the last 90 days';
  if (l === 'all' || v === 'all') return 'View all historical records';
  return `Filter period: ${label}`;
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
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey>(null);
  const activeDropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (key: DropdownKey) => {
    setActiveDropdown(current => (current === key ? null : key));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (activeDropdownRef.current && !activeDropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-start sm:justify-end gap-2 w-full">
      {/* Prepend Component */}
      {prepend && (
        <div className="w-full sm:w-auto">
          {prepend}
        </div>
      )}

      {/* 1. Custom Exchange Dropdown */}
      {exchange && (
        <div
          ref={activeDropdown === 'exchange' ? activeDropdownRef : null}
          className={`relative w-full sm:w-auto ${activeDropdown === 'exchange' ? 'z-40' : 'z-20'}`}
        >
          <AppTooltip description={exchange.tooltip || 'Filter by exchange'} side="top">
            <button
              type="button"
              onClick={() => toggleDropdown('exchange')}
              className="w-full sm:w-auto bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between sm:min-w-[160px] cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                {exchange.value !== 'All' && exchange.value !== 'all' && (
                  <ExchangeIcon exchange={exchange.value} className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate">{getExchangeLabel(exchange.value)}</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 ml-2 text-gray-400 shrink-0 transition-transform duration-200 ${
                  activeDropdown === 'exchange' ? 'rotate-180' : ''
                }`}
              />
            </button>
          </AppTooltip>

          {activeDropdown === 'exchange' && (
            <div className="absolute z-50 left-0 right-0 sm:right-auto sm:w-full min-w-full sm:min-w-[160px] mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
              <AppTooltip description="View all connected exchanges" side="right">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      exchange.onChange('All');
                      setActiveDropdown(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                      exchange.value === 'All' || exchange.value === 'all'
                        ? 'bg-[#2F6BFF] text-white'
                        : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                    }`}
                  >
                    <span>{exchange.labelAll || 'All Exchanges'}</span>
                  </button>
                </div>
              </AppTooltip>
              {activeExchanges.map(ex => (
                <AppTooltip key={ex} description={`Filter by ${ex.toUpperCase()}`} side="right">
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        exchange.onChange(ex);
                        setActiveDropdown(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                        exchange.value.toLowerCase() === ex.toLowerCase()
                          ? 'bg-[#2F6BFF] text-white'
                          : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                      }`}
                    >
                      <ExchangeIcon exchange={ex} className="w-4 h-4 shrink-0" />
                      <span className="capitalize truncate">{ex}</span>
                    </button>
                  </div>
                </AppTooltip>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Custom Account Dropdown */}
      {account && (
        <div
          ref={activeDropdown === 'account' ? activeDropdownRef : null}
          className={`relative w-full sm:w-auto ${activeDropdown === 'account' ? 'z-40' : 'z-20'}`}
        >
          <AppTooltip
            description={
              account.disabled
                ? (account.disabledTooltip || 'Select a specific exchange first to filter accounts')
                : (account.tooltip || 'Filter by connected account')
            }
            side="top"
          >
            <span className="w-full sm:w-auto inline-block">
              <button
                type="button"
                onClick={() => !account.disabled && toggleDropdown('account')}
                disabled={account.disabled}
                className="w-full sm:w-auto bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between sm:min-w-[160px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 truncate">
                  {(() => {
                    const selected = account.options.find(k => k.id === account.value);
                    if (selected) {
                      const accType = selected.accountType || keys.find(item => item.id === selected.id)?.accountType;
                      const extra = selected.exchange === 'bitget' ? (accType === 'uta' ? ' (UTA)' : ' (CLS)') : '';
                      return (
                        <>
                          <ExchangeIcon exchange={selected.exchange} className="w-4 h-4 shrink-0" />
                          <span className="truncate">{selected.label || selected.exchange}{extra}</span>
                        </>
                      );
                    }
                    return (
                      <>
                        <Users className="w-4 h-4 shrink-0 text-[#8E9299]" />
                        <span className="truncate">{account.labelAll || 'All Accounts'}</span>
                      </>
                    );
                  })()}
                </div>
                <ChevronDown
                  className={`h-4 w-4 ml-2 text-gray-400 shrink-0 transition-transform duration-200 ${
                    activeDropdown === 'account' ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </span>
          </AppTooltip>

          {activeDropdown === 'account' && (
            <div className="absolute z-50 left-0 right-0 sm:right-auto sm:w-full min-w-full sm:min-w-[180px] mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
              <AppTooltip description="Show data across all connected accounts" side="right">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      account.onChange('All');
                      setActiveDropdown(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                      account.value === 'All' || !account.value
                        ? 'bg-[#2F6BFF] text-white'
                        : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>{account.labelAll || 'All Accounts'}</span>
                  </button>
                </div>
              </AppTooltip>

              {account.options.map(k => {
                const accType = k.accountType || keys.find(item => item.id === k.id)?.accountType;
                const extra = k.exchange === 'bitget' ? (accType === 'uta' ? ' (UTA)' : ' (CLS)') : '';
                const label = `${k.label || k.exchange}${extra}`;
                const tooltipDesc = k.tooltip || `${label} (${k.exchange.toUpperCase()})`;
                return (
                  <AppTooltip key={k.id} description={tooltipDesc} side="right">
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          account.onChange(k.id);
                          setActiveDropdown(null);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                          account.value === k.id
                            ? 'bg-[#2F6BFF] text-white'
                            : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                        }`}
                      >
                        <ExchangeIcon exchange={k.exchange} className="w-4 h-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </button>
                    </div>
                  </AppTooltip>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Instrument Select */}
      {instrument && (
        <div
          ref={activeDropdown === 'instrument' ? activeDropdownRef : null}
          className={`relative w-full sm:w-auto ${activeDropdown === 'instrument' ? 'z-40' : 'z-20'}`}
        >
          <AppTooltip
            description={
              instrument.disabled
                ? 'Instrument filter disabled'
                : (instrument.tooltip || 'Filter by instrument / category')
            }
            side="top"
          >
            <span className="w-full sm:w-auto inline-block">
              <button
                type="button"
                onClick={() => !instrument.disabled && toggleDropdown('instrument')}
                disabled={instrument.disabled}
                className="w-full sm:w-auto bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between sm:min-w-[140px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="truncate sm:max-w-[120px]">
                  {(() => {
                    if (!instrument.value || instrument.value.toUpperCase() === 'ALL') return instrument.labelAll || 'All Instruments';
                    const opt = instrument.options.find(o => typeof o === 'object' ? o.value === instrument.value : o === instrument.value);
                    return typeof opt === 'object' ? opt.label : opt;
                  })()}
                </span>
                <ChevronDown
                  className={`h-4 w-4 ml-2 text-gray-400 shrink-0 transition-transform duration-200 ${
                    activeDropdown === 'instrument' ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </span>
          </AppTooltip>
          
          {activeDropdown === 'instrument' && (
            <div className="absolute z-50 left-0 right-0 sm:right-auto sm:w-full min-w-full sm:min-w-[140px] mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
              <AppTooltip description="Show all instruments and markets" side="right">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      instrument.onChange('All');
                      setActiveDropdown(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                      instrument.value.toUpperCase() === 'ALL' || !instrument.value
                        ? 'bg-[#2F6BFF] text-white'
                        : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                    }`}
                  >
                    <span>{instrument.labelAll || 'All Instruments'}</span>
                  </button>
                </div>
              </AppTooltip>
              {instrument.options.map((opt, i) => {
                const val = typeof opt === 'object' ? opt.value : (opt as string);
                if (val.toUpperCase() === 'ALL') return null; // handled above
                const label = typeof opt === 'object' ? opt.label : (opt as string);
                const tooltip = typeof opt === 'object' ? opt.tooltip : `Filter by ${label}`;
                
                const btn = (
                  <button
                    key={`${val}-${i}`}
                    type="button"
                    onClick={() => {
                      instrument.onChange(val);
                      setActiveDropdown(null);
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
          )}
        </div>
      )}

      {/* 4. Side Select */}
      {side && (
        <div
          ref={activeDropdown === 'side' ? activeDropdownRef : null}
          className={`relative w-full sm:w-auto ${activeDropdown === 'side' ? 'z-40' : 'z-20'}`}
        >
          <AppTooltip description={side.tooltip || 'Filter by trade side (Buy/Sell)'} side="top">
            <button
              type="button"
              onClick={() => toggleDropdown('side')}
              className="w-full sm:w-auto bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between sm:min-w-[140px] cursor-pointer"
            >
              <span className="truncate sm:max-w-[120px] flex items-center gap-2">
                {(() => {
                  if (!side.value || side.value === 'All') return side.labelAll || 'All Sides';
                  const opt = side.options.find(o => o.value === side.value);
                  return opt ? (
                    <>
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span>{opt.label}</span>
                    </>
                  ) : side.value;
                })()}
              </span>
              <ChevronDown
                className={`h-4 w-4 ml-2 text-gray-400 shrink-0 transition-transform duration-200 ${
                  activeDropdown === 'side' ? 'rotate-180' : ''
                }`}
              />
            </button>
          </AppTooltip>
          
          {activeDropdown === 'side' && (
            <div className="absolute z-50 left-0 right-0 sm:right-auto sm:w-full min-w-full sm:min-w-[140px] mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
              <AppTooltip description="Show all trade sides" side="right">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      side.onChange('All');
                      setActiveDropdown(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                      side.value === 'All' || !side.value
                        ? 'bg-[#2F6BFF] text-white'
                        : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                    }`}
                  >
                    <span>{side.labelAll || 'All Sides'}</span>
                  </button>
                </div>
              </AppTooltip>
              {side.options.map((opt, i) => (
                <AppTooltip key={`${opt.value}-${i}`} description={opt.tooltip || `Filter by ${opt.label}`} side="right">
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        side.onChange(opt.value);
                        setActiveDropdown(null);
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
                  </div>
                </AppTooltip>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Type Select */}
      {type && (
        <div
          ref={activeDropdown === 'type' ? activeDropdownRef : null}
          className={`relative w-full sm:w-auto ${activeDropdown === 'type' ? 'z-40' : 'z-20'}`}
        >
          <AppTooltip description={type.tooltip || 'Filter by order / transaction type'} side="top">
            <button
              type="button"
              onClick={() => toggleDropdown('type')}
              className="w-full sm:w-auto bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between sm:min-w-[140px] cursor-pointer"
            >
              <span className="truncate sm:max-w-[120px]">
                {(() => {
                  if (!type.value || type.value.toUpperCase() === 'ALL') return type.labelAll || 'All Types';
                  const opt = type.options.find(o => typeof o === 'object' ? o.value === type.value : o === type.value);
                  return typeof opt === 'object' ? opt.label : opt;
                })()}
              </span>
              <ChevronDown
                className={`h-4 w-4 ml-2 text-gray-400 shrink-0 transition-transform duration-200 ${
                  activeDropdown === 'type' ? 'rotate-180' : ''
                }`}
              />
            </button>
          </AppTooltip>
          
          {activeDropdown === 'type' && (
            <div className="absolute z-50 left-0 right-0 sm:right-auto sm:w-full min-w-full sm:min-w-[140px] mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
              <AppTooltip description="Show all order / trade types" side="right">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      type.onChange('ALL');
                      setActiveDropdown(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                      !type.value || type.value.toUpperCase() === 'ALL'
                        ? 'bg-[#2F6BFF] text-white'
                        : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                    }`}
                  >
                    <span>{type.labelAll || 'All Types'}</span>
                  </button>
                </div>
              </AppTooltip>
              {type.options.map((opt, i) => {
                const val = typeof opt === 'object' ? opt.value : (opt as string);
                if (val.toUpperCase() === 'ALL') return null; // handled by top All Types button
                const label = typeof opt === 'object' ? opt.label : (opt as string);
                const tooltip = typeof opt === 'object' ? opt.tooltip : `Filter by ${label}`;
                
                return (
                  <AppTooltip key={`${val}-${i}`} description={tooltip} side="right">
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          type.onChange(val);
                          setActiveDropdown(null);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                          type.value === val
                            ? 'bg-[#2F6BFF] text-white'
                            : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{label}</span>
                      </button>
                    </div>
                  </AppTooltip>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Custom Status Select */}
      {statusSelect && (
        <div
          ref={activeDropdown === 'status' ? activeDropdownRef : null}
          className={`relative w-full sm:w-auto ${activeDropdown === 'status' ? 'z-40' : 'z-20'}`}
        >
          <AppTooltip description={statusSelect.tooltip || 'Filter by order status'} side="top">
            <button
              type="button"
              onClick={() => toggleDropdown('status')}
              className="w-full sm:w-auto bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between sm:min-w-[140px] cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  statusSelect.value === 'All' || !statusSelect.value
                    ? 'bg-[#8E9299]'
                    : statusSelect.value.toUpperCase().includes('FILL') || statusSelect.value.toUpperCase().includes('SUCCESS')
                    ? 'bg-[#00C853]'
                    : statusSelect.value.toUpperCase().includes('CANCEL') || statusSelect.value.toUpperCase().includes('FAIL')
                    ? 'bg-[#FF4444]'
                    : statusSelect.value.toUpperCase().includes('PART') || statusSelect.value.toUpperCase().includes('PEND')
                    ? 'bg-[#FFB300]'
                    : 'bg-[#2F6BFF]'
                }`} />
                <span className="truncate">
                  {statusSelect.value === 'All' || !statusSelect.value
                    ? (statusSelect.labelAll || 'All Statuses')
                    : (() => {
                        const opt = statusSelect.options.find(o => (typeof o === 'object' ? o.value : o) === statusSelect.value);
                        return typeof opt === 'object' ? opt.label : (opt || statusSelect.value);
                      })()}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 ml-2 text-gray-400 shrink-0 transition-transform duration-200 ${
                  activeDropdown === 'status' ? 'rotate-180' : ''
                }`}
              />
            </button>
          </AppTooltip>

          {activeDropdown === 'status' && (
            <div className="absolute z-50 left-0 right-0 sm:right-auto sm:w-full min-w-full sm:min-w-[160px] mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
              <AppTooltip description="Show records across all statuses" side="right">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      statusSelect.onChange('All');
                      setActiveDropdown(null);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                      statusSelect.value === 'All' || !statusSelect.value
                        ? 'bg-[#2F6BFF] text-white'
                        : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 bg-[#8E9299]" />
                    <span className="truncate">{statusSelect.labelAll || 'All Statuses'}</span>
                  </button>
                </div>
              </AppTooltip>

              {statusSelect.options.map((st, i) => {
                const val = typeof st === 'object' ? st.value : st;
                if (val.toUpperCase() === 'ALL') return null; // already handled at top
                const label = typeof st === 'object' ? st.label : st;
                const tooltipDesc = typeof st === 'object' && st.tooltip ? st.tooltip : getStatusTooltip(val);

                return (
                  <AppTooltip key={`${val}-${i}`} description={tooltipDesc} side="right">
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          statusSelect.onChange(val);
                          setActiveDropdown(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                          statusSelect.value === val
                            ? 'bg-[#2F6BFF] text-white'
                            : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          val.toUpperCase().includes('FILL') || val.toUpperCase().includes('SUCCESS')
                            ? 'bg-[#00C853]'
                            : val.toUpperCase().includes('CANCEL') || val.toUpperCase().includes('FAIL')
                            ? 'bg-[#FF4444]'
                            : val.toUpperCase().includes('PART') || val.toUpperCase().includes('PEND')
                            ? 'bg-[#FFB300]'
                            : 'bg-[#2F6BFF]'
                        }`} />
                        <span className="truncate">{label}</span>
                      </button>
                    </div>
                  </AppTooltip>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. Custom Period Select */}
      {period && (
        <div
          ref={activeDropdown === 'period' ? activeDropdownRef : null}
          className={`relative w-full sm:w-auto ${activeDropdown === 'period' ? 'z-40' : 'z-20'}`}
        >
          <AppTooltip description={period.tooltip || 'Filter by time period'} side="top">
            <button
              type="button"
              onClick={() => toggleDropdown('period')}
              className="w-full sm:w-auto bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between sm:min-w-[130px] cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                {(() => {
                  const selectedOpt = period.options.find(o => String(o.value) === String(period.value));
                  return (
                    <>
                      {selectedOpt?.icon || <Calendar className="w-4 h-4 shrink-0 text-[#8E9299]" />}
                      <span className="truncate">{selectedOpt?.label || period.value}</span>
                    </>
                  );
                })()}
              </div>
              <ChevronDown
                className={`h-4 w-4 ml-2 text-gray-400 shrink-0 transition-transform duration-200 ${
                  activeDropdown === 'period' ? 'rotate-180' : ''
                }`}
              />
            </button>
          </AppTooltip>

          {activeDropdown === 'period' && (
            <div className="absolute z-50 left-0 right-0 sm:right-auto sm:w-full min-w-full sm:min-w-[150px] mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
              {period.options.map((opt, i) => {
                const tooltipDesc = opt.tooltip || getPeriodTooltip(opt.label, opt.value);
                const isSelected = String(period.value) === String(opt.value);

                return (
                  <AppTooltip key={`${opt.value}-${i}`} description={tooltipDesc} side="right">
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          period.onChange(opt.value);
                          setActiveDropdown(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left cursor-pointer ${
                          isSelected
                            ? 'bg-[#2F6BFF] text-white'
                            : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                        }`}
                      >
                        {opt.icon ? (
                          <span className="shrink-0">{opt.icon}</span>
                        ) : (
                          <Calendar className="w-4 h-4 shrink-0" />
                        )}
                        <span className="truncate">{opt.label}</span>
                      </button>
                    </div>
                  </AppTooltip>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. Search Input */}
      {search && (
        <div className="relative w-full sm:w-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#8E9299]" />
          </div>
          <input
            type="text"
            placeholder={search.placeholder || 'Search...'}
            className="pl-9 pr-10 py-2 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors w-full sm:w-50"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            onFocus={() => setActiveDropdown(null)}
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
