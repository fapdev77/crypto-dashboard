import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';
import { ExchangeId } from '../../../types/marketAnalytics';
import { ExchangeIcon } from '../../ui/ExchangeIcon';

interface ExchangeOption {
  id: ExchangeId;
  label: string;
}

const EXCHANGES: ExchangeOption[] = [
  { id: 'bybit', label: 'Bybit' },
  { id: 'okx', label: 'OKX' },
  { id: 'bitget', label: 'Bitget' },
];

export const ExchangeSelectDropdown: React.FC = () => {
  const {
    selectedExchanges,
    toggleExchange,
    selectAllExchanges,
  } = useMarketAnalyticsStore();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isAllSelected = selectedExchanges.length === EXCHANGES.length;

  const getButtonLabel = (): string => {
    if (isAllSelected) return 'All Exchanges';
    if (selectedExchanges.length === 1) {
      const match = EXCHANGES.find((e) => e.id === selectedExchanges[0]);
      return match ? match.label : selectedExchanges[0];
    }
    return `${selectedExchanges.length} Exchanges`;
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 bg-[#1a1b22] hover:bg-[#20222b] border rounded-xl px-3 py-2 text-xs font-medium transition-all shadow-sm ${
          isOpen
            ? 'border-[#2F6BFF] text-white'
            : 'border-[#2a2b30] text-[#C5C8D0] hover:text-white'
        }`}
      >
        <Globe className="w-3.5 h-3.5 text-[#2F6BFF]" />
        <span className="font-semibold">{getButtonLabel()}</span>
        <div className="flex items-center -space-x-1 ml-0.5">
          {selectedExchanges.map((ex) => (
            <div
              key={ex}
              className="w-4 h-4 rounded-full bg-[#121318] border border-[#2a2b30] flex items-center justify-center p-0.5"
            >
              <ExchangeIcon exchange={ex} className="w-full h-full" />
            </div>
          ))}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8E9299] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-52 bg-[#16171d] border border-[#2a2b30] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-[#2a2b30] flex items-center justify-between text-[11px] font-semibold text-[#8E9299] uppercase tracking-wider">
            <span>Exchanges</span>
            <button
              type="button"
              onClick={selectAllExchanges}
              className="text-[10px] text-[#2F6BFF] hover:underline font-normal capitalize"
            >
              Select All
            </button>
          </div>

          <div className="p-1 space-y-0.5">
            {/* All Exchanges Toggle Row */}
            <button
              type="button"
              onClick={selectAllExchanges}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                isAllSelected
                  ? 'bg-[#2F6BFF]/15 text-[#2F6BFF]'
                  : 'text-[#C5C8D0] hover:bg-[#1f212a] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isAllSelected
                      ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white'
                      : 'border-[#3a3c45] bg-[#121318]'
                  }`}
                >
                  {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>All Exchanges</span>
              </div>
              <span className="text-[10px] text-[#8E9299]">3 Connected</span>
            </button>

            <div className="my-1 border-t border-[#2a2b30]/60" />

            {/* Individual Exchange Rows */}
            {EXCHANGES.map((ex) => {
              const isChecked = selectedExchanges.includes(ex.id);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => toggleExchange(ex.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isChecked
                      ? 'text-white hover:bg-[#1f212a]'
                      : 'text-[#8E9299] hover:bg-[#1f212a] hover:text-[#C5C8D0]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white'
                          : 'border-[#3a3c45] bg-[#121318]'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <ExchangeIcon exchange={ex.id} className="w-4 h-4" />
                    <span>{ex.label}</span>
                  </div>
                  <span className="text-[10px] text-[#8E9299] uppercase font-mono">
                    Live
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
