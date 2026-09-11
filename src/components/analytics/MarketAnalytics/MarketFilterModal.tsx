import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Star,
  Check,
  Globe,
  Layers,
  Sparkles,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react';
import { useMarketAnalyticsStore, ALL_SPECIFIC_MARKETS, ALL_EXCHANGES } from '../../../store/marketAnalyticsStore';
import {
  exchangeCoinCatalog,
  CoinCatalogItem,
} from '../../../services/marketAnalytics/exchangeCoinCatalog';
import { CoinIcon } from '../../ui/CoinIcon';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import {
  ExchangeId,
  SpecificMarketType,
  AssetKind,
} from '../../../types/marketAnalytics';

interface MarketFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterChipId = 'ALL' | 'CRYPTO' | 'TRADFI' | 'STOCK' | 'COMMODITY' | 'POPULAR' | 'FAVORITES';

const FILTER_CHIPS: { id: FilterChipId; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'POPULAR', label: 'Top 20' },
  { id: 'FAVORITES', label: 'Favorites' },
  { id: 'CRYPTO', label: 'Crypto' },
  { id: 'TRADFI', label: 'TradFi' },
  { id: 'STOCK', label: 'Stocks' },
  { id: 'COMMODITY', label: 'Commodities' },
];

const MARKET_DEFINITIONS: { id: SpecificMarketType; label: string; badge: string; desc: string }[] = [
  { id: 'PERP', label: 'USDT Perpetual', badge: 'USDT', desc: 'Linear perpetual futures settled in USDT' },
  { id: 'INVERSE', label: 'Coin-M Inverse', badge: 'USD', desc: 'Inverse futures settled in base cryptocurrency' },
  { id: 'SPOT', label: 'Spot Market', badge: 'SPOT', desc: 'Direct cash market exchange pairs' },
];

const EXCHANGE_DEFINITIONS: { id: ExchangeId; label: string }[] = [
  { id: 'bybit', label: 'Bybit' },
  { id: 'okx', label: 'OKX' },
  { id: 'bitget', label: 'Bitget' },
];

const getAssetKindBadge = (kind: AssetKind | undefined) => {
  switch (kind) {
    case 'STOCK':
      return { label: 'STOCK', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    case 'COMMODITY':
      return { label: 'COMMODITY', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
    case 'METAL':
      return { label: 'METAL', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' };
    case 'OTHER':
      return { label: 'OTHER', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
    case 'CRYPTO':
    default:
      return { label: 'CRYPTO', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' };
  }
};

export const MarketFilterModal: React.FC<MarketFilterModalProps> = ({ isOpen, onClose }) => {
  const {
    selectedSymbol,
    selectedMarkets,
    selectedExchanges,
    favorites,
    toggleFavorite,
    applyFilters,
  } = useMarketAnalyticsStore();

  // Draft / pending selection state
  const [pendingSymbol, setPendingSymbol] = useState<string>(selectedSymbol);
  const [pendingMarkets, setPendingMarkets] = useState<SpecificMarketType[]>(selectedMarkets);
  const [pendingExchanges, setPendingExchanges] = useState<ExchangeId[]>(selectedExchanges);

  // Search and tabs state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChip, setActiveChip] = useState<FilterChipId>('ALL');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPendingSymbol(selectedSymbol);
      setPendingMarkets(selectedMarkets);
      setPendingExchanges(selectedExchanges);
      setSearchQuery('');
      setActiveChip('ALL');
      setTimeout(() => searchInputRef.current?.focus(), 80);
    }
  }, [isOpen, selectedSymbol, selectedMarkets, selectedExchanges]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Availability of the currently selected pending asset
  const assetAvailability = useMemo(() => {
    const av = exchangeCoinCatalog.getAvailability(pendingSymbol);
    if (av) {
      return {
        isVerified: true,
        kind: av.kind,
        markets: av.markets.length > 0 ? av.markets : ALL_SPECIFIC_MARKETS,
        exchanges: av.exchanges.length > 0 ? av.exchanges : ALL_EXCHANGES,
      };
    }
    return {
      isVerified: false,
      kind: 'CRYPTO' as AssetKind,
      markets: ALL_SPECIFIC_MARKETS,
      exchanges: ALL_EXCHANGES,
    };
  }, [pendingSymbol]);

  // When user selects a different coin, reconcile markets & exchanges with its availability
  const handleSelectCoin = (symbol: string) => {
    const clean = symbol.toUpperCase().replace(/USDT$|USD$|-SWAP$/, '');
    setPendingSymbol(clean);

    const av = exchangeCoinCatalog.getAvailability(clean);
    const availableMarkets = av && av.markets.length > 0 ? av.markets : ALL_SPECIFIC_MARKETS;
    const availableExchanges = av && av.exchanges.length > 0 ? av.exchanges : ALL_EXCHANGES;

    // Prune selections to available ones; if none remain, select all available
    setPendingMarkets((prev) => {
      const valid = prev.filter((m) => availableMarkets.includes(m));
      return valid.length > 0 ? valid : [...availableMarkets];
    });

    setPendingExchanges((prev) => {
      const valid = prev.filter((e) => availableExchanges.includes(e));
      return valid.length > 0 ? valid : [...availableExchanges];
    });
  };

  // Search filtered coins
  const { results: coinResults, customOption } = useMemo(() => {
    return exchangeCoinCatalog.searchCoins({
      query: searchQuery,
      category: activeChip,
      favorites,
    });
  }, [searchQuery, activeChip, favorites]);

  // Toggle a single market in pending state
  const handleToggleMarket = (marketId: SpecificMarketType) => {
    if (!assetAvailability.markets.includes(marketId)) return;
    setPendingMarkets((prev) => {
      if (prev.includes(marketId)) {
        if (prev.length === 1) return prev; // Prevent empty
        return prev.filter((m) => m !== marketId);
      }
      return [...prev, marketId];
    });
  };

  const handleSelectAllMarkets = () => {
    setPendingMarkets([...assetAvailability.markets]);
  };

  // Toggle a single exchange in pending state
  const handleToggleExchange = (exchangeId: ExchangeId) => {
    if (!assetAvailability.exchanges.includes(exchangeId)) return;
    setPendingExchanges((prev) => {
      if (prev.includes(exchangeId)) {
        if (prev.length === 1) return prev; // Prevent empty
        return prev.filter((e) => e !== exchangeId);
      }
      return [...prev, exchangeId];
    });
  };

  const handleSelectAllExchanges = () => {
    setPendingExchanges([...assetAvailability.exchanges]);
  };

  // Apply changes to store in a single dispatch
  const handleApply = () => {
    applyFilters(pendingSymbol, pendingMarkets, pendingExchanges);
    onClose();
  };

  if (!isOpen) return null;

  const currentBadge = getAssetKindBadge(assetAvailability.kind);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#131418] border border-[#2a2b30] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#22242a] bg-[#17191f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2F6BFF]/10 border border-[#2F6BFF]/30 flex items-center justify-center text-[#2F6BFF]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Market & Asset Filters</h2>
              <p className="text-[11px] text-[#8E9299]">Configure active instrument, markets and exchange data feeds</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8E9299] hover:text-white rounded-lg hover:bg-[#20222b] transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Two-Zone Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[#22242a] overflow-hidden">
          {/* ── Zone 1: Asset Selection (Left, 7 cols) ── */}
          <div className="lg:col-span-7 flex flex-col p-4 min-h-0 bg-[#131418]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#C5C8D0] uppercase tracking-wider">1. Select Asset</span>
              <span className="text-[11px] text-[#8E9299]">
                Current: <strong className="text-white font-mono">{pendingSymbol}</strong>
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9299]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ticker or name (e.g. BTC, ETH, AAPL)..."
                className="w-full bg-[#1a1b22] border border-[#2a2b30] focus:border-[#2F6BFF] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-[#686c75] focus:outline-none focus:ring-1 focus:ring-[#2F6BFF]/30 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
              {FILTER_CHIPS.map((chip) => {
                const isActive = activeChip === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setActiveChip(chip.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#2F6BFF] text-white shadow-sm'
                        : 'bg-[#1a1b22] text-[#8E9299] hover:text-white hover:bg-[#22242e] border border-[#2a2b30]/60'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Coin List */}
            <div className="flex-1 min-h-[160px] max-h-[260px] lg:max-h-none overflow-y-auto pr-1 space-y-1 divide-y divide-[#1e2027]/60">
              {/* Custom Ticker Option if not found */}
              {customOption && (
                <div
                  onClick={() => handleSelectCoin(customOption.symbol)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                    pendingSymbol === customOption.symbol
                      ? 'bg-[#2F6BFF]/15 border-[#2F6BFF] text-white'
                      : 'bg-[#181a22] border-dashed border-[#2F6BFF]/40 text-[#C5C8D0] hover:bg-[#1f212c]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#2F6BFF]/20 flex items-center justify-center text-[#2F6BFF]">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white">{customOption.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-[#2F6BFF]/20 text-cyan-300 rounded font-mono">Custom</span>
                      </div>
                      <p className="text-[10px] text-[#8E9299]">Query uncataloged ticker</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#2F6BFF] font-medium">Select</span>
                </div>
              )}

              {coinResults.map((coin) => {
                const isSelected = pendingSymbol === coin.symbol;
                const isFav = favorites.includes(coin.symbol);
                const isBtc = coin.symbol === 'BTC';
                const kindBadge = getAssetKindBadge(coin.kind);

                return (
                  <div
                    key={coin.symbol}
                    onClick={() => handleSelectCoin(coin.symbol)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#2F6BFF]/15 border border-[#2F6BFF]/60 text-white shadow-sm'
                        : 'hover:bg-[#1a1b22] text-[#C5C8D0] border border-transparent'
                    }`}
                  >
                    {/* Left: Icon, Ticker, Name, Badge */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CoinIcon symbol={coin.symbol} name={coin.name} className="w-6 h-6 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white truncate">{coin.symbol}</span>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${kindBadge.bg} ${kindBadge.text} ${kindBadge.border}`}
                          >
                            {kindBadge.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8E9299] truncate max-w-[140px] sm:max-w-[200px]">
                          {coin.name}
                        </p>
                      </div>
                    </div>

                    {/* Right: Exchange Seals & Favorite Star */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Exchange presence seals */}
                      <div className="hidden sm:flex items-center gap-1">
                        {coin.exchanges.map((ex) => (
                          <div
                            key={ex}
                            className="w-4 h-4 rounded bg-[#1e2026] flex items-center justify-center text-[9px] text-[#8E9299]"
                            title={ex}
                          >
                            <ExchangeIcon exchange={ex} className="w-3 h-3" />
                          </div>
                        ))}
                      </div>

                      {/* Favorite button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(coin.symbol);
                        }}
                        disabled={isBtc}
                        className={`p-1 rounded-md transition-colors ${
                          isFav
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-[#50545e] hover:text-[#8E9299]'
                        }`}
                        title={isBtc ? 'BTC is fixed favorite' : isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {coinResults.length === 0 && !customOption && (
                <div className="p-8 text-center text-[#8E9299] text-xs">
                  No assets found matching <strong className="text-white font-mono">"{searchQuery}"</strong>.
                </div>
              )}
            </div>
          </div>

          {/* ── Zone 2: Markets & Exchanges Options for Selected Asset (Right, 5 cols) ── */}
          <div className="lg:col-span-5 flex flex-col p-4 min-h-0 bg-[#15171d] space-y-4">
            {/* Header of Zone 2 */}
            <div className="flex items-center justify-between pb-2 border-b border-[#22242a]">
              <div>
                <span className="text-xs font-semibold text-[#C5C8D0] uppercase tracking-wider">2. Configure Feeds</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-bold text-white font-mono">{pendingSymbol}</span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${currentBadge.bg} ${currentBadge.text} ${currentBadge.border}`}>
                    {currentBadge.label}
                  </span>
                </div>
              </div>
              {!assetAvailability.isVerified && (
                <div
                  className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded"
                  title="Asset availability not verified in exchange listings catalog; fallback to standard feeds"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Unverified</span>
                </div>
              )}
            </div>

            {/* Markets Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-medium text-white">Markets</span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-400/10 px-1.5 py-0.2 rounded-full font-mono">
                    {pendingMarkets.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllMarkets}
                  className="text-[10px] text-[#2F6BFF] hover:text-[#5287ff] font-medium"
                >
                  Select All
                </button>
              </div>

              <div className="space-y-1.5">
                {MARKET_DEFINITIONS.map((m) => {
                  const isAvailable = assetAvailability.markets.includes(m.id);
                  const isChecked = pendingMarkets.includes(m.id);

                  return (
                    <div
                      key={m.id}
                      onClick={() => isAvailable && handleToggleMarket(m.id)}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                        !isAvailable
                          ? 'opacity-40 bg-[#121317] border-[#22242a] cursor-not-allowed text-[#686c75]'
                          : isChecked
                          ? 'bg-[#1e2028] border-[#2F6BFF]/60 text-white cursor-pointer shadow-sm'
                          : 'bg-[#181920] border-[#2a2b30] text-[#8E9299] hover:text-white cursor-pointer hover:bg-[#1c1e26]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white'
                              : 'border-[#3a3c45] bg-[#15161b]'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs text-white">{m.label}</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 bg-[#2a2c35] text-[#A0A5B0] rounded">
                              {m.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#8E9299] leading-tight">{m.desc}</p>
                        </div>
                      </div>

                      {!isAvailable && (
                        <span className="text-[9px] text-[#686c75] bg-[#1a1b20] px-1.5 py-0.5 rounded border border-[#22242a]">
                          N/A
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Exchanges Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#2F6BFF]" />
                  <span className="text-xs font-medium text-white">Exchanges</span>
                  <span className="text-[10px] text-[#2F6BFF] bg-[#2F6BFF]/10 px-1.5 py-0.2 rounded-full font-mono">
                    {pendingExchanges.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllExchanges}
                  className="text-[10px] text-[#2F6BFF] hover:text-[#5287ff] font-medium"
                >
                  Select All
                </button>
              </div>

              <div className="space-y-1.5">
                {EXCHANGE_DEFINITIONS.map((ex) => {
                  const isAvailable = assetAvailability.exchanges.includes(ex.id);
                  const isChecked = pendingExchanges.includes(ex.id);

                  return (
                    <div
                      key={ex.id}
                      onClick={() => isAvailable && handleToggleExchange(ex.id)}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                        !isAvailable
                          ? 'opacity-40 bg-[#121317] border-[#22242a] cursor-not-allowed text-[#686c75]'
                          : isChecked
                          ? 'bg-[#1e2028] border-[#2F6BFF]/60 text-white cursor-pointer shadow-sm'
                          : 'bg-[#181920] border-[#2a2b30] text-[#8E9299] hover:text-white cursor-pointer hover:bg-[#1c1e26]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white'
                              : 'border-[#3a3c45] bg-[#15161b]'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <ExchangeIcon exchange={ex.id} className="w-4 h-4" />
                          <span className="font-medium text-xs text-white">{ex.label}</span>
                        </div>
                      </div>

                      {!isAvailable && (
                        <span className="text-[9px] text-[#686c75] bg-[#1a1b20] px-1.5 py-0.5 rounded border border-[#22242a]">
                          Not Listed
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Apply / Cancel) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#22242a] bg-[#17191f]">
          <div className="text-xs text-[#8E9299]">
            Active selection:{' '}
            <span className="text-white font-mono font-bold">{pendingSymbol}</span> •{' '}
            <span className="text-cyan-400 font-medium">{pendingMarkets.length} market{pendingMarkets.length > 1 ? 's' : ''}</span> •{' '}
            <span className="text-[#2F6BFF] font-medium">{pendingExchanges.length} exchange{pendingExchanges.length > 1 ? 's' : ''}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#8E9299] hover:text-white hover:bg-[#20222b] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="apply-market-filter-btn"
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2 bg-[#2F6BFF] hover:bg-[#2458db] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#2F6BFF]/20 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
