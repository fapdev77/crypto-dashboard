import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Star,
  ChevronDown,
  Check,
  Globe,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';
import {
  exchangeCoinCatalog,
  CoinCatalogItem,
  CoinCategory,
} from '../../../services/marketAnalytics/exchangeCoinCatalog';
import { CoinIcon } from '../../ui/CoinIcon';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { ExchangeId } from '../../../types/marketAnalytics';

interface CoinSearchDropdownProps {
  className?: string;
}

const CATEGORY_TABS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'POPULAR', label: 'Top 20' },
  { id: 'FAVORITES', label: 'Favorites' },
  { id: 'Layer 1', label: 'L1' },
  { id: 'Layer 2', label: 'L2' },
  { id: 'DeFi', label: 'DeFi' },
  { id: 'Meme', label: 'Memes' },
  { id: 'AI & Data', label: 'AI' },
  { id: 'Gaming', label: 'Gaming' },
];

export const CoinSearchDropdown: React.FC<CoinSearchDropdownProps> = ({ className = '' }) => {
  const {
    selectedSymbol,
    setSelectedSymbol,
    favorites,
    toggleFavorite,
    snapshot,
  } = useMarketAnalyticsStore();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [exchangeFilter, setExchangeFilter] = useState<ExchangeId | 'ALL'>('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Background fetch of exchange tickers on first mount
  useEffect(() => {
    exchangeCoinCatalog.loadLiveExchanges().catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Filter coins
  const { results: filteredCoins, customOption } = useMemo(() => {
    return exchangeCoinCatalog.searchCoins({
      query: searchQuery,
      category: activeCategory,
      exchange: exchangeFilter,
      favorites,
    });
  }, [searchQuery, activeCategory, exchangeFilter, favorites]);

  // Combined items for keyboard navigation
  const selectableItems = useMemo(() => {
    const items: CoinCatalogItem[] = [...filteredCoins];
    if (customOption) {
      items.unshift(customOption);
    }
    return items;
  }, [filteredCoins, customOption]);

  // Reset highlight index if list shrinks
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, activeCategory, exchangeFilter]);

  const handleSelectCoin = (symbol: string) => {
    setSelectedSymbol(symbol);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < selectableItems.length - 1 ? prev + 1 : 0
      );
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : Math.max(0, selectableItems.length - 1)
      );
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectableItems.length > 0 && selectableItems[highlightedIndex]) {
        handleSelectCoin(selectableItems[highlightedIndex].symbol);
      } else if (searchQuery.trim()) {
        handleSelectCoin(searchQuery.trim().toUpperCase());
      }
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (!listRef.current) return;
    const itemEl = listRef.current.children[index] as HTMLElement;
    if (itemEl) {
      itemEl.scrollIntoView({ block: 'nearest' });
    }
  };

  const handleSyncExchanges = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    await exchangeCoinCatalog.loadLiveExchanges();
    setTimeout(() => setIsSyncing(false), 600);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id="coin-search-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`flex items-center gap-2.5 bg-[#1a1b22] border px-3 py-1.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm ${
          isOpen
            ? 'border-[#2F6BFF] ring-2 ring-[#2F6BFF]/30 bg-[#20222b]'
            : 'border-[#2a2b30] hover:border-[#3a3b45] hover:bg-[#20222b]'
        }`}
      >
        <CoinIcon symbol={selectedSymbol} className="w-5 h-5 rounded-full" />
        <div className="flex items-baseline gap-1">
          <span className="text-white font-bold text-sm tracking-wide">
            {selectedSymbol}
          </span>
          <span className="text-[11px] text-[#8E9299]">/USDT</span>
        </div>

        {snapshot && (
          <span
            className={`text-xs font-mono font-medium hidden sm:inline ml-1 ${
              snapshot.priceChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {snapshot.priceChange24h >= 0 ? '+' : ''}
            {snapshot.priceChange24h}%
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8E9299] transition-transform duration-200 ml-0.5 ${
            isOpen ? 'rotate-180 text-[#2F6BFF]' : ''
          }`}
        />
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 sm:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dropdown / Mobile Modal Panel */}
      {isOpen && (
        <div
          id="coin-search-dropdown-panel"
          className="fixed inset-x-3 top-16 max-h-[82vh] sm:max-h-[85vh] sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 w-auto sm:w-[380px] md:w-[460px] max-w-[calc(100vw-24px)] sm:max-w-[calc(100vw-48px)] bg-[#14151b] border border-[#2a2b30] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Header & Search Field */}
          <div className="p-3 sm:p-3.5 border-b border-[#2a2b30]/80 space-y-2.5 sm:space-y-3 bg-[#171821]">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 absolute left-3 text-[#8E9299] pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  id="coin-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search coin by ticker or name..."
                  className="w-full bg-[#0f1015] border border-[#2a2b30] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-[#8E9299] focus:outline-none focus:border-[#2F6BFF] focus:ring-1 focus:ring-[#2F6BFF]/40 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 p-1 text-[#8E9299] hover:text-white rounded-md transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="sm:hidden p-2 rounded-xl bg-[#1e2029] border border-[#2a2b30] text-[#8E9299] hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
              {CATEGORY_TABS.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#2F6BFF] text-white shadow-sm'
                        : 'bg-[#1e2029] text-[#8E9299] hover:text-white hover:bg-[#272935] border border-transparent'
                    }`}
                  >
                    {cat.id === 'FAVORITES' && (
                      <Star className="w-3 h-3 inline mr-1 fill-amber-400 text-amber-400" />
                    )}
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Exchange Filter Quick Bar */}
            <div className="flex items-center justify-between pt-0.5 text-[11px] text-[#8E9299] flex-wrap gap-1">
              <span className="flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-[#8E9299]" />
                <span className="text-[10px] sm:text-[11px]">Exchange:</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExchangeFilter('ALL')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    exchangeFilter === 'ALL'
                      ? 'bg-[#2F6BFF]/20 text-[#2F6BFF] font-bold border border-[#2F6BFF]/40'
                      : 'hover:text-white'
                  }`}
                >
                  All (3)
                </button>
                {(['bybit', 'okx', 'bitget'] as ExchangeId[]).map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setExchangeFilter(exchangeFilter === ex ? 'ALL' : ex)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                      exchangeFilter === ex
                        ? 'bg-[#2F6BFF]/20 text-[#2F6BFF] font-bold border border-[#2F6BFF]/40'
                        : 'text-[#8E9299] hover:text-white'
                    }`}
                  >
                    <ExchangeIcon exchange={ex} className="w-2.5 h-2.5" />
                    <span className="capitalize">{ex}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto max-h-[48vh] sm:max-h-[360px] p-2 space-y-1 divide-y divide-[#2a2b30]/30"
          >
            {/* Custom Option Banner (if searching an uncataloged ticker) */}
            {customOption && (
              <div
                onClick={() => handleSelectCoin(customOption.symbol)}
                className={`p-2.5 rounded-xl cursor-pointer transition-all border flex items-center justify-between mb-1 ${
                  highlightedIndex === 0
                    ? 'bg-[#2F6BFF]/15 border-[#2F6BFF]/50 text-white'
                    : 'bg-[#1b1d26] border-[#2a2b30] hover:border-[#3a3b45] text-[#d1d5db]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#2F6BFF]/20 text-[#2F6BFF]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Analyze Custom Ticker: <strong>{customOption.symbol}</strong></span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                        Any Pair
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8E9299] mt-0.5">
                      Fetch derivatives & spot metrics across Bybit, OKX, and Bitget
                    </p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-[#2F6BFF] text-white font-semibold">
                  Select
                </span>
              </div>
            )}

            {selectableItems.length === 0 && (
              <div className="py-10 text-center space-y-2">
                <Globe className="w-7 h-7 text-[#8E9299] mx-auto opacity-50" />
                <p className="text-xs text-[#8E9299]">No matching coins found.</p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSelectCoin(searchQuery.trim().toUpperCase())}
                    className="px-3 py-1.5 bg-[#2F6BFF] hover:bg-[#2558d4] text-white text-xs font-semibold rounded-lg transition-colors shadow"
                  >
                    Analyze &quot;{searchQuery.trim().toUpperCase()}&quot; as custom ticker
                  </button>
                )}
              </div>
            )}

            {filteredCoins.map((coin, index) => {
              const itemIdx = customOption ? index + 1 : index;
              const isSelected = selectedSymbol === coin.symbol;
              const isHighlighted = highlightedIndex === itemIdx;
              const isBtc = coin.symbol === 'BTC';
              const isFav = isBtc || favorites.includes(coin.symbol);

              return (
                <div
                  key={coin.symbol}
                  onClick={() => handleSelectCoin(coin.symbol)}
                  onMouseEnter={() => setHighlightedIndex(itemIdx)}
                  className={`group px-3 py-2 rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#2F6BFF]/20 border border-[#2F6BFF]/40 text-white'
                      : isHighlighted
                      ? 'bg-[#1f212c] text-white'
                      : 'hover:bg-[#1a1b24] text-[#d1d5db]'
                  }`}
                >
                  {/* Left: Coin Icon, Symbol, Name & Category */}
                  <div className="flex items-center gap-3 min-w-0">
                    <CoinIcon symbol={coin.symbol} className="w-7 h-7 rounded-full shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-white tracking-wide">
                          {coin.symbol}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2b35] text-[#8E9299] font-medium truncate max-w-[80px]">
                          {coin.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8E9299] truncate max-w-[150px] sm:max-w-[200px]">
                        {coin.name}
                      </div>
                    </div>
                  </div>

                  {/* Right: Exchange Badges, Favorite & Check */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Exchanges Icons Pill */}
                    <div className="hidden sm:flex items-center gap-1 bg-[#121318] px-2 py-1 rounded-lg border border-[#2a2b30]/60">
                      {coin.exchanges.map((ex) => (
                        <div key={ex} title={`Available on ${ex}`}>
                          <ExchangeIcon exchange={ex} className="w-3.5 h-3.5" />
                        </div>
                      ))}
                    </div>

                    {/* Star Favorite Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isBtc) {
                          toggleFavorite(coin.symbol);
                        }
                      }}
                      title={
                        isBtc
                          ? 'BTC is fixed as permanent favorite'
                          : isFav
                          ? 'Remove favorite'
                          : 'Add favorite'
                      }
                      className={`p-1.5 rounded-lg transition-colors ${
                        isFav
                          ? 'text-amber-400 hover:bg-amber-500/10'
                          : 'text-[#8E9299] opacity-40 group-hover:opacity-100 hover:text-amber-400 hover:bg-amber-500/10'
                      } ${isBtc ? 'cursor-default' : ''}`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#2F6BFF] text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 bg-[#121318] border-t border-[#2a2b30] flex items-center justify-between text-[11px] text-[#8E9299] px-3.5">
            <span className="flex items-center gap-1.5">
              <span>{filteredCoins.length} coins loaded</span>
              <span>•</span>
              <span className="text-[#a1a5b0]">Bybit, OKX & Bitget</span>
            </span>

            <button
              type="button"
              onClick={handleSyncExchanges}
              title="Sync live tickers from all 3 exchanges"
              className="flex items-center gap-1 text-[#8E9299] hover:text-[#2F6BFF] transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#2F6BFF]' : ''}`} />
              <span className="hidden sm:inline">Sync Tickers</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
