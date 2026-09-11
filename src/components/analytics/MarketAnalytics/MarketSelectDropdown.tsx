import React, { useState, useRef, useEffect } from 'react';
import { Layers, ChevronDown, Check } from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';
import { SpecificMarketType } from '../../../types/marketAnalytics';

interface MarketOption {
  id: SpecificMarketType;
  label: string;
  badge: string;
}

const MARKET_OPTIONS: MarketOption[] = [
  { id: 'PERP', label: 'USDT Perpetual', badge: 'USDT' },
  { id: 'INVERSE', label: 'Coin-M Inverse', badge: 'USD' },
  { id: 'SPOT', label: 'Spot Market', badge: 'SPOT' },
];

export const MarketSelectDropdown: React.FC = () => {
  const {
    selectedMarkets,
    selectedMarket,
    toggleMarket,
    selectAllMarkets,
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

  const isAllSelected = selectedMarkets.length === MARKET_OPTIONS.length;

  // Label representation
  const getButtonLabel = (): string => {
    if (isAllSelected || selectedMarket === 'ALL') return 'All Markets';
    if (selectedMarkets.length === 1) {
      const match = MARKET_OPTIONS.find((m) => m.id === selectedMarkets[0]);
      return match ? match.label.split(' ')[0] : selectedMarkets[0];
    }
    return `${selectedMarkets.length} Markets`;
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
        <Layers className="w-3.5 h-3.5 text-[#2F6BFF]" />
        <span className="font-semibold">{getButtonLabel()}</span>
        <span className="text-[10px] bg-[#121318] px-1.5 py-0.5 rounded text-[#8E9299] border border-[#2a2b30]">
          {isAllSelected ? '3/3' : `${selectedMarkets.length}/3`}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8E9299] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-[#16171d] border border-[#2a2b30] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-[#2a2b30] flex items-center justify-between text-[11px] font-semibold text-[#8E9299] uppercase tracking-wider">
            <span>Market Type</span>
            <button
              type="button"
              onClick={selectAllMarkets}
              className="text-[10px] text-[#2F6BFF] hover:underline font-normal capitalize"
            >
              Select All
            </button>
          </div>

          <div className="p-1 space-y-0.5">
            {/* All Markets Toggle Row */}
            <button
              type="button"
              onClick={selectAllMarkets}
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
                <span>All Markets</span>
              </div>
              <span className="text-[10px] text-[#8E9299]">Perp, Inv, Spot</span>
            </button>

            <div className="my-1 border-t border-[#2a2b30]/60" />

            {/* Individual Market Rows */}
            {MARKET_OPTIONS.map((opt) => {
              const isChecked = selectedMarkets.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleMarket(opt.id)}
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
                    <span>{opt.label}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-[#121318] px-1.5 py-0.5 rounded text-[#8E9299] border border-[#2a2b30]">
                    {opt.badge}
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
