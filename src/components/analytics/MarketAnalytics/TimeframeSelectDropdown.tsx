import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';
import { MarketTimeframe } from '../../../types/marketAnalytics';

interface TimeframeOption {
  id: MarketTimeframe;
  label: string;
  desc: string;
}

const TIMEFRAMES: TimeframeOption[] = [
  { id: '5m', label: '5m', desc: '5 Minutes' },
  { id: '15m', label: '15m', desc: '15 Minutes' },
  { id: '30m', label: '30m', desc: '30 Minutes' },
  { id: '1h', label: '1h', desc: '1 Hour (Default)' },
  { id: '4h', label: '4h', desc: '4 Hours' },
  { id: '1d', label: '1d', desc: '1 Day' },
];

export const TimeframeSelectDropdown: React.FC = () => {
  const { selectedTimeframe, setSelectedTimeframe } = useMarketAnalyticsStore();

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

  const activeOption = TIMEFRAMES.find((tf) => tf.id === selectedTimeframe) || TIMEFRAMES[3];

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
        <Clock className="w-3.5 h-3.5 text-[#2F6BFF]" />
        <span className="font-semibold">{activeOption.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8E9299] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-44 bg-[#16171d] border border-[#2a2b30] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-[#2a2b30] text-[11px] font-semibold text-[#8E9299] uppercase tracking-wider">
            Timeframe
          </div>

          <div className="p-1 space-y-0.5">
            {TIMEFRAMES.map((tf) => {
              const isSelected = selectedTimeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => {
                    setSelectedTimeframe(tf.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#2F6BFF]/15 text-[#2F6BFF]'
                      : 'text-[#C5C8D0] hover:bg-[#1f212a] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF]" />
                    )}
                    <span className="font-bold">{tf.label}</span>
                    <span className="text-[10px] text-[#8E9299] font-normal">
                      ({tf.desc.split(' ')[0]})
                    </span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#2F6BFF]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
