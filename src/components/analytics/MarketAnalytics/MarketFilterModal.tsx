import React, { useState, useEffect, useMemo, useRef, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
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
  Loader2,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useMarketAnalyticsStore, ALL_SPECIFIC_MARKETS, ALL_EXCHANGES } from '../../../store/marketAnalyticsStore';
import {
  exchangeCoinCatalog,
  CoinCatalogItem,
} from '../../../services/marketAnalytics/exchangeCoinCatalog';
import { CoinIcon } from '../../ui/CoinIcon';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { AppTooltip } from '../../ui/Tooltip';
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

const FILTER_CHIPS: { id: FilterChipId; labelKey: string; fallback: string }[] = [
  { id: 'ALL', labelKey: 'common.all', fallback: 'All' },
  { id: 'POPULAR', labelKey: 'analytics.market.filterModal.chips.popular', fallback: 'Top 20' },
  { id: 'FAVORITES', labelKey: 'analytics.market.filterModal.chips.favorites', fallback: 'Favorites' },
  { id: 'CRYPTO', labelKey: 'analytics.market.filterModal.chips.crypto', fallback: 'Crypto' },
  { id: 'TRADFI', labelKey: 'analytics.market.filterModal.chips.tradfi', fallback: 'TradFi' },
  { id: 'STOCK', labelKey: 'analytics.market.filterModal.chips.stock', fallback: 'Stocks' },
  { id: 'COMMODITY', labelKey: 'analytics.market.filterModal.chips.commodity', fallback: 'Commodities' },
];

const MARKET_DEFINITIONS: { id: SpecificMarketType; labelKey: string; fallbackLabel: string; badge: string; descKey: string; fallbackDesc: string }[] = [
  { id: 'PERP', labelKey: 'analytics.market.filterModal.markets.perpLabel', fallbackLabel: 'USDT Perpetual', badge: 'USDT', descKey: 'analytics.market.filterModal.markets.perpDesc', fallbackDesc: 'Linear perpetual futures settled in USDT' },
  { id: 'INVERSE', labelKey: 'analytics.market.filterModal.markets.inverseLabel', fallbackLabel: 'Coin-M Inverse', badge: 'USD', descKey: 'analytics.market.filterModal.markets.inverseDesc', fallbackDesc: 'Inverse futures settled in base cryptocurrency' },
  { id: 'SPOT', labelKey: 'analytics.market.filterModal.markets.spotLabel', fallbackLabel: 'Spot Market', badge: 'SPOT', descKey: 'analytics.market.filterModal.markets.spotDesc', fallbackDesc: 'Direct cash market exchange pairs' },
];

const EXCHANGE_DEFINITIONS: { id: ExchangeId; label: string }[] = [
  { id: 'bybit', label: 'Bybit' },
  { id: 'okx', label: 'OKX' },
  { id: 'bitget', label: 'Bitget' },
];

const getAssetKindBadge = (kind: AssetKind | undefined, t: (key: string, fallback: string) => string) => {
  switch (kind) {
    case 'STOCK':
      return { label: t('analytics.market.assetKinds.STOCK', 'STOCK'), bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' };
    case 'COMMODITY':
      return { label: t('analytics.market.assetKinds.COMMODITY', 'COMMODITY'), bg: 'bg-tone-amber/10', text: 'text-tone-amber', border: 'border-tone-amber/20' };
    case 'METAL':
      return { label: t('analytics.market.assetKinds.METAL', 'METAL'), bg: 'bg-tone-yellow/10', text: 'text-tone-yellow', border: 'border-tone-yellow/20' };
    case 'OTHER':
      return { label: t('analytics.market.assetKinds.OTHER', 'OTHER'), bg: 'bg-tone-slate/10', text: 'text-tone-slate', border: 'border-tone-slate/20' };
    case 'CRYPTO':
    default:
      return { label: t('analytics.market.assetKinds.CRYPTO', 'CRYPTO'), bg: 'bg-tone-cyan/10', text: 'text-tone-cyan', border: 'border-tone-cyan/20' };
  }
};

export const MarketFilterModal: React.FC<MarketFilterModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
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
  const [isPendingFilter, startFilterTransition] = useTransition();
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(60);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Switch category chip with immediate responsive feedback
  const handleChipChange = (chipId: FilterChipId) => {
    if (chipId === activeChip) return;
    setIsFiltering(true);
    startFilterTransition(() => {
      setActiveChip(chipId);
      setVisibleCount(60);
    });
  };

  // Turn off isFiltering once state settles
  useEffect(() => {
    if (!isPendingFilter && isFiltering) {
      const timer = setTimeout(() => setIsFiltering(false), 50);
      return () => clearTimeout(timer);
    }
  }, [isPendingFilter, isFiltering]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPendingSymbol(selectedSymbol);
      setPendingMarkets(selectedMarkets);
      setPendingExchanges(selectedExchanges);
      setSearchQuery('');
      setActiveChip('ALL');
      setVisibleCount(60);
      setIsFiltering(false);
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

  const currentBadge = getAssetKindBadge(assetAvailability.kind, t);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-canvas border border-line rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-fg tracking-wide">
                {t('analytics.market.filterModal.modalTitle', 'Market & Asset Filters')}
              </h2>
              <p className="text-[11px] text-fg-muted">
                {t('analytics.market.filterModal.modalSubtitle', 'Configure active instrument, markets and exchange data feeds')}
              </p>
              <div className="mt-1">
                <AppTooltip
                  description={t('analytics.market.filterModal.cacheHint', 'If you notice data inconsistencies or outdated pairs, open the cache and polling settings to force a refresh or adjust the symbol catalog cache expiration time.')}
                  side="bottom"
                  align="start"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(
                        new CustomEvent('navigate-to-tab', {
                          detail: {
                            tab: 'settings',
                            targetId: 'symbol-catalog-settings-card',
                          },
                        })
                      );
                    }}
                    className="group inline-flex items-center gap-1.5 text-[11px] text-tone-cyan hover:text-tone-cyan/80 transition-colors font-medium cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-tone-cyan/90 group-hover:text-tone-cyan shrink-0" />
                    <span className="underline underline-offset-2 decoration-tone-cyan/40 group-hover:decoration-tone-cyan">
                      {t('analytics.market.filterModal.cacheSettingsLink', 'Cache and polling settings')}
                    </span>
                    <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                </AppTooltip>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-fg-muted hover:text-fg rounded-lg hover:bg-elevated transition-colors"
            title={t('analytics.market.filterModal.close', 'Close (Esc)')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Two-Zone Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-line overflow-hidden">
          {/* ── Zone 1: Asset Selection (Left, 7 cols) ── */}
          <div className="lg:col-span-7 flex flex-col p-4 min-h-0 bg-canvas">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-fg uppercase tracking-wider">
                {t('analytics.market.filterModal.step1Title', '1. Select Asset')}
              </span>
              <span className="text-[11px] text-fg-muted">
                {t('analytics.market.filterModal.currentLabel', 'Current:')} <strong className="text-fg font-mono">{pendingSymbol}</strong>
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('analytics.market.filterModal.searchPlaceholder', 'Search by ticker or name (e.g. BTC, ETH, AAPL)...')}
                className="w-full bg-elevated border border-line focus:border-accent rounded-xl pl-9 pr-8 py-2 text-xs text-fg placeholder:text-fg-muted/70 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
              {FILTER_CHIPS.map((chip) => {
                const isActive = activeChip === chip.id;
                const isChipLoading = isActive && (isFiltering || isPendingFilter);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleChipChange(chip.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-accent text-white shadow-sm'
                        : 'bg-elevated text-fg-muted hover:text-fg hover:bg-elevated-hover border border-line/60'
                    }`}
                  >
                    {isChipLoading && (
                      <Loader2 className="w-3 h-3 animate-spin text-fg/90" />
                    )}
                    <span>{t(chip.labelKey, chip.fallback)}</span>
                  </button>
                );
              })}
            </div>

            {/* Coin List with loading feedback */}
            <div className="relative flex-1 min-h-[160px] max-h-[260px] lg:max-h-none overflow-y-auto pr-1 space-y-1 divide-y divide-line/40">
              {/* Spinning loading overlay during transition */}
              {(isFiltering || isPendingFilter) && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-canvas/70 backdrop-blur-[1.5px] rounded-xl animate-in fade-in duration-100">
                  <div className="flex items-center gap-2.5 px-3 py-2 bg-elevated border border-line rounded-xl shadow-xl">
                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                    <span className="text-xs font-medium text-fg">{t('analytics.market.filterModal.filteringAssets', 'Filtering assets...')}</span>
                  </div>
                </div>
              )}

              {/* Custom Ticker Option if not found */}
              {customOption && (
                <div
                  onClick={() => handleSelectCoin(customOption.symbol)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                    pendingSymbol === customOption.symbol
                      ? 'bg-accent/15 border-accent text-fg'
                      : 'bg-elevated border-dashed border-accent/40 text-fg hover:bg-elevated-hover'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-fg">{customOption.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-accent/20 text-tone-cyan rounded font-mono">
                          {t('analytics.market.filterModal.customBadge', 'Custom')}
                        </span>
                      </div>
                      <p className="text-[10px] text-fg-muted">{t('analytics.market.filterModal.queryUncataloged', 'Query uncataloged ticker')}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-accent font-medium">{t('analytics.market.filterModal.selectBtn', 'Select')}</span>
                </div>
              )}

              {coinResults.slice(0, visibleCount).map((coin) => {
                const isSelected = pendingSymbol === coin.symbol;
                const isFav = favorites.includes(coin.symbol);
                const isBtc = coin.symbol === 'BTC';
                const kindBadge = getAssetKindBadge(coin.kind, t);

                return (
                  <div
                    key={coin.symbol}
                    onClick={() => handleSelectCoin(coin.symbol)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-accent/15 border border-accent/60 text-fg shadow-sm'
                        : 'hover:bg-elevated text-fg border border-transparent'
                    }`}
                  >
                    {/* Left: Icon, Ticker, Name, Badge */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CoinIcon symbol={coin.symbol} name={coin.name} className="w-6 h-6 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-fg truncate">{coin.symbol}</span>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${kindBadge.bg} ${kindBadge.text} ${kindBadge.border}`}
                          >
                            {kindBadge.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-fg-muted truncate max-w-[140px] sm:max-w-[200px]">
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
                            className="w-4 h-4 rounded bg-surface flex items-center justify-center text-[9px] text-fg-muted"
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
                            ? 'text-warning hover:text-warning/80'
                            : 'text-fg-muted/50 hover:text-fg-muted'
                        }`}
                        title={
                          isBtc
                            ? t('analytics.market.filterModal.btcFixedFav', 'BTC is fixed favorite')
                            : isFav
                            ? t('analytics.market.filterModal.removeFavorite', 'Remove from favorites')
                            : t('analytics.market.filterModal.addFavorite', 'Add to favorites')
                        }
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-warning' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Show more button if coin results exceed visible batch */}
              {coinResults.length > visibleCount && (
                <div className="pt-2 pb-1 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 60)}
                    className="px-3 py-1.5 rounded-lg bg-elevated hover:bg-elevated-hover text-fg-muted hover:text-fg border border-line text-[11px] font-medium transition-colors"
                  >
                    {t('analytics.market.filterModal.showMore', { count: coinResults.length - visibleCount, defaultValue: `Show more (${coinResults.length - visibleCount} remaining)` })}
                  </button>
                </div>
              )}

              {coinResults.length === 0 && !customOption && !isFiltering && !isPendingFilter && (
                <div className="p-8 text-center text-fg-muted text-xs">
                  {t('analytics.market.filterModal.noAssetsPrefix', 'No assets found matching')}{' '}
                  <strong className="text-fg font-mono">"{searchQuery}"</strong>.
                </div>
              )}
            </div>
          </div>

          {/* ── Zone 2: Markets & Exchanges Options for Selected Asset (Right, 5 cols) ── */}
          <div className="lg:col-span-5 flex flex-col p-4 min-h-0 bg-surface space-y-4">
            {/* Header of Zone 2 */}
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div>
                <span className="text-xs font-semibold text-fg uppercase tracking-wider">
                  {t('analytics.market.filterModal.step2Title', '2. Configure Feeds')}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-bold text-fg font-mono">{pendingSymbol}</span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${currentBadge.bg} ${currentBadge.text} ${currentBadge.border}`}>
                    {currentBadge.label}
                  </span>
                </div>
              </div>
              {!assetAvailability.isVerified && (
                <div
                  className="flex items-center gap-1 text-[10px] text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded"
                  title={t('analytics.market.filterModal.unverifiedBadge', 'Asset availability not verified in exchange listings catalog; fallback to standard feeds')}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>{t('analytics.market.filterModal.unverified', 'Unverified')}</span>
                </div>
              )}
            </div>

            {/* Markets Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-tone-cyan" />
                  <span className="text-xs font-medium text-fg">{t('analytics.market.filterModal.marketsLabel', 'Markets')}</span>
                  <span className="text-[10px] text-tone-cyan bg-tone-cyan/10 px-1.5 py-0.2 rounded-full font-mono">
                    {pendingMarkets.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllMarkets}
                  className="text-[10px] text-accent hover:text-accent-hover font-medium"
                >
                  {t('analytics.market.filterModal.selectAll', 'Select All')}
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
                          ? 'opacity-40 bg-canvas/60 border-line cursor-not-allowed text-fg-muted'
                          : isChecked
                          ? 'bg-elevated border-accent/60 text-fg cursor-pointer shadow-sm'
                          : 'bg-canvas border-line text-fg-muted hover:text-fg cursor-pointer hover:bg-elevated-hover'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-accent border-accent text-white'
                              : 'border-line-strong bg-canvas'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs text-fg">{t(m.labelKey, m.fallbackLabel)}</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 bg-elevated-hover text-fg-muted rounded">
                              {m.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-fg-muted leading-tight">{t(m.descKey, m.fallbackDesc)}</p>
                        </div>
                      </div>

                      {!isAvailable && (
                        <span className="text-[9px] text-fg-muted bg-elevated px-1.5 py-0.5 rounded border border-line">
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
                  <Globe className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-medium text-fg">{t('analytics.market.filterModal.exchanges', 'Exchanges')}</span>
                  <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.2 rounded-full font-mono">
                    {pendingExchanges.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllExchanges}
                  className="text-[10px] text-accent hover:text-accent-hover font-medium"
                >
                  {t('analytics.market.filterModal.selectAll', 'Select All')}
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
                          ? 'opacity-40 bg-canvas/60 border-line cursor-not-allowed text-fg-muted'
                          : isChecked
                          ? 'bg-elevated border-accent/60 text-fg cursor-pointer shadow-sm'
                          : 'bg-canvas border-line text-fg-muted hover:text-fg cursor-pointer hover:bg-elevated-hover'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-accent border-accent text-white'
                              : 'border-line-strong bg-canvas'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <ExchangeIcon exchange={ex.id} className="w-4 h-4" />
                          <span className="font-medium text-xs text-fg">{ex.label}</span>
                        </div>
                      </div>

                      {!isAvailable && (
                        <span className="text-[9px] text-fg-muted bg-elevated px-1.5 py-0.5 rounded border border-line">
                          {t('analytics.market.filterModal.notListed', 'Not Listed')}
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
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-line bg-surface">
          <div className="text-xs text-fg-muted">
            {t('analytics.market.filterModal.activeSelection', 'Active selection:')}{' '}
            <span className="text-fg font-mono font-bold">{pendingSymbol}</span> •{' '}
            <span className="text-tone-cyan font-medium">
              {t('analytics.market.header.marketsCount', { count: pendingMarkets.length, defaultValue: `${pendingMarkets.length} market${pendingMarkets.length > 1 ? 's' : ''}` })}
            </span>{' '}•{' '}
            <span className="text-accent font-medium">
              {t('analytics.market.filterModal.exchangesSummaryCount', { count: pendingExchanges.length, defaultValue: `${pendingExchanges.length} exchange${pendingExchanges.length > 1 ? 's' : ''}` })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-fg-muted hover:text-fg hover:bg-elevated transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              id="apply-market-filter-btn"
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold shadow-lg shadow-accent/20 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              {t('analytics.market.filterModal.apply', 'Apply Filters')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
