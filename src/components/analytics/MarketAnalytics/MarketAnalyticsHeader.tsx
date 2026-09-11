import React from 'react';
import { CoinSearchDropdown } from './CoinSearchDropdown';
import { MarketSelectDropdown } from './MarketSelectDropdown';
import { ExchangeSelectDropdown } from './ExchangeSelectDropdown';
import { TimeframeSelectDropdown } from './TimeframeSelectDropdown';
import { CircularCountdownRefresh } from './CircularCountdownRefresh';
import {
  AssetSelectorTooltip,
  MarketTypeSelectorTooltip,
  ExchangeSelectorTooltip,
  TimeframeSelectorTooltip,
  AutoRefreshTooltip,
} from './MarketAnalyticsTooltips';

export const MarketAnalyticsHeader: React.FC = () => {
  return (
    <div className="bg-[#121318] border border-[#2a2b30] rounded-xl p-2.5 sm:p-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left / Center Controls: Asset Search, Market Type, Exchanges, Timeframe */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Asset Search & Favorites Dropdown */}
          <AssetSelectorTooltip>
            <CoinSearchDropdown />
          </AssetSelectorTooltip>

          {/* Market Type Dropdown (All, Perp, Inverse, Spot) */}
          <MarketTypeSelectorTooltip>
            <MarketSelectDropdown />
          </MarketTypeSelectorTooltip>

          {/* Exchanges Dropdown (All, Bybit, OKX, Bitget) */}
          <ExchangeSelectorTooltip>
            <ExchangeSelectDropdown />
          </ExchangeSelectorTooltip>

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
    </div>
  );
};
