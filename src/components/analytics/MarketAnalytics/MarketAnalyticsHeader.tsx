import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { MarketFilterModal } from './MarketFilterModal';
import { TimeframeSelectDropdown } from './TimeframeSelectDropdown';
import { CircularCountdownRefresh } from './CircularCountdownRefresh';
import { useMarketAnalyticsStore, ALL_SPECIFIC_MARKETS, ALL_EXCHANGES } from '../../../store/marketAnalyticsStore';
import { exchangeCoinCatalog } from '../../../services/marketAnalytics/exchangeCoinCatalog';
import { CoinIcon } from '../../ui/CoinIcon';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import {
  AssetSelectorTooltip,
  TimeframeSelectorTooltip,
  AutoRefreshTooltip,
} from './MarketAnalyticsTooltips';
import { AssetKind } from '../../../types/marketAnalytics';

const getKindBadge = (kind: AssetKind | undefined) => {
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

export const MarketAnalyticsHeader: React.FC = () => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const { selectedSymbol, selectedMarkets, selectedExchanges } = useMarketAnalyticsStore();

  const availability = exchangeCoinCatalog.getAvailability(selectedSymbol);
  const kindBadge = getKindBadge(availability?.kind);

  const getMarketsLabel = (): string => {
    if (selectedMarkets.length === ALL_SPECIFIC_MARKETS.length) return 'All Markets';
    if (selectedMarkets.length === 1) {
      if (selectedMarkets[0] === 'PERP') return 'USDT Perp';
      if (selectedMarkets[0] === 'INVERSE') return 'Inverse';
      return 'Spot';
    }
    return `${selectedMarkets.length} Markets`;
  };

  const getExchangesLabel = (): string => {
    if (selectedExchanges.length === ALL_EXCHANGES.length) return 'All Exchanges';
    return `${selectedExchanges.length} Exch.`;
  };

  return (
    <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-2.5 sm:p-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left / Center Controls: Unified Asset & Market Modal, Timeframe */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Unified Asset & Market Feeds Trigger */}
          <AssetSelectorTooltip>
            <button
              type="button"
              id="market-filter-modal-trigger"
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center gap-2.5 bg-[#1a1b22] hover:bg-[#20222b] border border-[#2a2b30] hover:border-[#2F6BFF]/60 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all shadow-sm group"
            >
              {/* Asset Identity */}
              <div className="flex items-center gap-2">
                <CoinIcon symbol={selectedSymbol} className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm tracking-tight text-white">{selectedSymbol}</span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${kindBadge.bg} ${kindBadge.text} ${kindBadge.border}`}>
                  {kindBadge.label}
                </span>
              </div>

              <div className="w-[1px] h-4 bg-[#2e3038]" />

              {/* Selected Markets Badge */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-medium text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-md">
                  {getMarketsLabel()}
                </span>
              </div>

              <div className="w-[1px] h-4 bg-[#2e3038]" />

              {/* Selected Exchanges Icons */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center -space-x-1">
                  {selectedExchanges.map((ex) => (
                    <div
                      key={ex}
                      className="w-4 h-4 rounded-full bg-[#1e2026] border border-[#2a2b30] flex items-center justify-center"
                      title={ex}
                    >
                      <ExchangeIcon exchange={ex} className="w-3 h-3" />
                    </div>
                  ))}
                </div>
                <span className="hidden sm:inline text-[11px] font-medium text-[#8E9299]">
                  {getExchangesLabel()}
                </span>
              </div>

              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8E9299] group-hover:text-[#2F6BFF] ml-1 transition-colors" />
            </button>
          </AssetSelectorTooltip>

          {/* Timeframe Dropdown (5m, 15m, 30m, 1h, 4h, 1d) */}
          <TimeframeSelectorTooltip>
            <TimeframeSelectDropdown />
          </TimeframeSelectorTooltip>
        </div>

        {/* Right Controls: Unified Circular Countdown & Refresh */}
        <div className="flex items-center gap-2 ml-auto">
          <AutoRefreshTooltip>
            <CircularCountdownRefresh />
          </AutoRefreshTooltip>
        </div>
      </div>

      {/* Unified Filter Modal */}
      <MarketFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
      />
    </div>
  );
};
