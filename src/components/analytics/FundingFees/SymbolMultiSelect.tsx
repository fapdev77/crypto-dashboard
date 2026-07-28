import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { CoinIcon } from '../../ui/CoinIcon';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { ExchangeName } from '../../../types';

export interface SymbolOption {
  id: string;
  coin: string;
  exchange: string;
  symbol: string;
  type: string;
}

interface Props {
  symbols: SymbolOption[];
  selectedSymbols: string[];
  onChange: (symbols: string[]) => void;
  maxSelections?: number;
}

export const SymbolMultiSelect: React.FC<Props> = ({ 
  symbols, 
  selectedSymbols, 
  onChange, 
  maxSelections = 30 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSymbols = symbols.filter(s => 
    s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.exchange.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.coin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSymbol = (id: string) => {
    if (selectedSymbols.includes(id)) {
      onChange(selectedSymbols.filter(s => s !== id));
    } else {
      if (selectedSymbols.length < maxSelections) {
        onChange([...selectedSymbols, id]);
      }
    }
  };

  const removeSymbol = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedSymbols.filter(s => s !== id));
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className="min-h-[42px] bg-[#0e0f11] border border-[#2a2b30] rounded-lg p-2 flex flex-wrap gap-2 items-center cursor-text"
        onClick={() => setIsOpen(true)}
      >
        {selectedSymbols.length === 0 && !isOpen && (
          <span className="text-[#8E9299] text-sm pl-2">Select symbols...</span>
        )}
        
        {selectedSymbols.map(id => {
          const sym = symbols.find(s => s.id === id);
          if (!sym) return null;
          return (
            <span 
              key={id} 
              className="flex items-center gap-1.5 bg-[#1A1C20] border border-[#2a2b30] px-2 py-1 rounded text-xs font-medium text-white max-w-full overflow-hidden"
            >
              <CoinIcon symbol={sym.coin} className="w-3.5 h-3.5 shrink-0" />
              <ExchangeIcon exchange={sym.exchange as ExchangeName} className="w-3 h-3 shrink-0" />
              <span className="truncate">{sym.symbol}</span>
              <span className="text-[10px] text-[#8E9299]">{sym.type === 'USDT-M' ? 'U' : 'C'}</span>
              <button 
                onClick={(e) => removeSymbol(id, e)}
                className="text-[#8E9299] hover:text-white ml-1 focus:outline-none shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}

        <div className="flex-1 min-w-[120px] flex items-center relative group">
          {isOpen && (
            <>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none text-sm text-white pl-2 pr-7 py-1"
                placeholder="Search..."
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                  }}
                  className="absolute right-1.5 text-[#8E9299] hover:text-white bg-[#2a2b30] rounded-full p-0.5 focus:outline-none transition-colors"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-3 pr-2 ml-auto shrink-0">
          <span className={clsx(
            "text-xs font-medium",
            selectedSymbols.length >= maxSelections ? "text-red-400" : "text-[#8E9299]"
          )}>
            {selectedSymbols.length}/{maxSelections}
          </span>
          <ChevronDown className={clsx("w-4 h-4 text-[#8E9299] transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#151619] border border-[#2a2b30] rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {filteredSymbols.length === 0 ? (
            <div className="p-4 text-center text-sm text-[#8E9299]">No symbols found.</div>
          ) : (
            <div className="p-1">
              {filteredSymbols.map(sym => {
                const isSelected = selectedSymbols.includes(sym.id);
                const isDisabled = !isSelected && selectedSymbols.length >= maxSelections;
                
                return (
                  <button
                    key={sym.id}
                    onClick={() => !isDisabled && toggleSymbol(sym.id)}
                    disabled={isDisabled}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                      isDisabled && "opacity-50 cursor-not-allowed",
                      !isDisabled && "hover:bg-[#1A1C20]/80",
                      isSelected ? "text-white" : "text-[#8E9299]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <CoinIcon symbol={sym.coin} className="w-4 h-4 shrink-0" />
                      <ExchangeIcon exchange={sym.exchange as ExchangeName} className="w-4 h-4 shrink-0" />
                      <span className="font-medium truncate">{sym.symbol}</span>
                      <span className="text-xs text-[#8E9299] shrink-0">({sym.type})</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#2F6BFF] shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
