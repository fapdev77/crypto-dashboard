import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        className="min-h-[42px] bg-canvas border border-line rounded-lg p-2 flex flex-wrap gap-2 items-center cursor-text"
        onClick={() => setIsOpen(true)}
      >
        {selectedSymbols.length === 0 && !isOpen && (
          <span className="text-fg-muted text-sm pl-2">
            {t('analytics.funding.comparison.selectSymbols', 'Select symbols...')}
          </span>
        )}
        
        {selectedSymbols.map(id => {
          const sym = symbols.find(s => s.id === id);
          if (!sym) return null;
          return (
            <span 
              key={id} 
              className="flex items-center gap-1.5 bg-elevated border border-line px-2 py-1 rounded text-xs font-medium text-fg max-w-full overflow-hidden"
            >
              <CoinIcon symbol={sym.coin} className="w-3.5 h-3.5 shrink-0" />
              <ExchangeIcon exchange={sym.exchange as ExchangeName} className="w-3 h-3 shrink-0" />
              <span className="truncate">{sym.symbol}</span>
              <span className={clsx(
                "text-[10px] px-1 py-0.2 rounded font-mono shrink-0", 
                sym.type === 'COIN-M' ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-fg-muted"
              )}>
                {sym.type === 'USDT-M' ? 'U' : 'C'}
              </span>
              <button 
                onClick={(e) => removeSymbol(id, e)}
                className="text-fg-muted hover:text-fg ml-1 focus:outline-none shrink-0"
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
                className="w-full bg-transparent border-none focus:outline-none text-sm text-fg pl-2 pr-7 py-1"
                placeholder={t('common.search', 'Search...')}
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                  }}
                  className="absolute right-1.5 text-fg-muted hover:text-fg bg-line rounded-full p-0.5 focus:outline-none transition-colors"
                  title={t('common.clearSearch', 'Clear search')}
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
            selectedSymbols.length >= maxSelections ? "text-red-400" : "text-fg-muted"
          )}>
            {selectedSymbols.length}/{maxSelections}
          </span>
          <ChevronDown className={clsx("w-4 h-4 text-fg-muted transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-line rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {filteredSymbols.length === 0 ? (
            <div className="p-4 text-center text-sm text-fg-muted">
              {t('analytics.funding.comparison.noSymbolsFound', 'No symbols found.')}
            </div>
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
                      !isDisabled && "hover:bg-elevated/80",
                      isSelected ? "text-fg" : "text-fg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <CoinIcon symbol={sym.coin} className="w-4 h-4 shrink-0" />
                      <ExchangeIcon exchange={sym.exchange as ExchangeName} className="w-4 h-4 shrink-0" />
                      <span className="font-medium truncate">{sym.symbol}</span>
                      <span className={clsx(
                        "text-[10px] px-1.5 py-0.5 rounded border shrink-0 font-medium",
                        sym.type === 'COIN-M'
                          ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                          : "bg-line/50 text-fg-muted border-line"
                      )}>
                        {sym.type}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-accent shrink-0 ml-2" />}
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
