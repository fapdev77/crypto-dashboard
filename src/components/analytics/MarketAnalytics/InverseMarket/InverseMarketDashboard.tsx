import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { InverseAssetAggregated } from '../../../../types/marketAnalytics';
import { InverseMarketService } from '../../../../services/marketAnalytics/InverseMarketService';
import { InverseAssetRow } from './InverseAssetRow';
import { ThHeaderTooltip } from './InverseMarketTooltips';
import { CircularCountdownRefresh } from '../CircularCountdownRefresh';
import {
  Search,
  Star,
  Coins,
  DollarSign,
  Layers,
  Zap,
  Activity,
  ChevronsUpDown,
  ChevronsDownUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { SimulationModeBadge } from '../../../ui/SimulationModeBadge';

const INVERSE_FAVORITES_KEY = 'cpm_inverse_market_favorites';

const loadStoredFavorites = (): string[] => {
  try {
    const saved = localStorage.getItem(INVERSE_FAVORITES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore parse error
  }
  return ['BTC', 'ETH', 'SOL'];
};

export const InverseMarketDashboard: React.FC = () => {
  const [data, setData] = useState<InverseAssetAggregated[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(loadStoredFavorites);
  const [expandAll, setExpandAll] = useState(false);

  // Persist favorites exclusively for this tab
  useEffect(() => {
    try {
      localStorage.setItem(INVERSE_FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // Ignore storage errors
    }
  }, [favorites]);

  const toggleFavorite = useCallback((sym: string) => {
    setFavorites((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  }, []);

  const loadData = useCallback(async (force = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await InverseMarketService.fetchInverseMarketOverview(force);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Inverse/Coin-M market data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (showFavoritesOnly && !favorites.includes(item.symbol)) {
        return false;
      }
      return true;
    });
  }, [data, searchTerm, showFavoritesOnly, favorites]);

  // High-level Top KPIs
  const kpis = useMemo(() => {
    const totalAssets = data.length;
    const totalUsdVolume = data.reduce((acc, d) => acc + d.totalVolumeUsd, 0);
    const totalOiUsd = data.reduce((acc, d) => acc + d.totalOiUsd, 0);

    // Find highest spread
    const spreads = data
      .filter((d) => d.maxFundingSpreadApr !== null)
      .sort((a, b) => (b.maxFundingSpreadApr || 0) - (a.maxFundingSpreadApr || 0));
    const topSpreadAsset = spreads[0] || null;

    // Average APR across all coin-m contracts
    const aprs = data
      .map((d) => (d.nextFundingRate !== null ? d.nextFundingRate * 3 * 365 * 100 : null))
      .filter((a): a is number => a !== null);
    const avgApr = aprs.length > 0 ? aprs.reduce((a, b) => a + b, 0) / aprs.length : 0;

    return {
      totalAssets,
      totalUsdVolume,
      totalOiUsd,
      topSpreadAsset,
      avgApr: Number(avgApr.toFixed(2)),
    };
  }, [data]);

  const formatUsd = (val: number): string => {
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };

  return (
    <div className="space-y-5">
      {/* Top Title & Quick Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-cyan-400" />
              Inverse / Coin-M Derivatives Market
            </h2>
            <SimulationModeBadge />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Native Collateralized
            </span>
          </div>
          <p className="text-xs text-[#8E9299] mt-0.5">
            Cross-exchange quantitative scanner for all Coin-M (Inverse) contracts across Bybit, OKX & Bitget. Margined and settled directly in the underlying asset.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CircularCountdownRefresh />
        </div>
      </div>

      {/* Top 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Assets */}
        <div className="bg-[#121318] border border-[#23252d] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block">
            Coin-M Pairs Listed
          </span>
          <div className="text-lg font-bold font-mono text-white flex items-baseline gap-1.5">
            {kpis.totalAssets}
            <span className="text-xs font-normal text-cyan-400 font-sans">contracts</span>
          </div>
          <span className="text-[11px] text-[#8E9299]">Bybit, OKX & Bitget</span>
        </div>

        {/* 24h USD Notional Volume */}
        <div className="bg-[#121318] border border-[#23252d] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block">
            24h Notional Volume
          </span>
          <div className="text-lg font-bold font-mono text-white">
            {formatUsd(kpis.totalUsdVolume)}
          </div>
          <span className="text-[11px] text-cyan-400/90 font-mono">Aggregated Coin-M</span>
        </div>

        {/* Total Open Interest */}
        <div className="bg-[#121318] border border-[#23252d] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block">
            Total Open Interest
          </span>
          <div className="text-lg font-bold font-mono text-amber-400">
            {formatUsd(kpis.totalOiUsd)}
          </div>
          <span className="text-[11px] text-[#8E9299]">Active Margin Locked</span>
        </div>

        {/* Top Funding Spread */}
        <div className="bg-[#121318] border border-[#23252d] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block">
            Max Funding Spread
          </span>
          <div className="text-lg font-bold font-mono text-emerald-400 flex items-baseline gap-1">
            {kpis.topSpreadAsset?.maxFundingSpreadApr ? `+${kpis.topSpreadAsset.maxFundingSpreadApr}%` : '—'}
            {kpis.topSpreadAsset && (
              <span className="text-[11px] font-semibold text-white/80 font-sans">
                ({kpis.topSpreadAsset.symbol})
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#8E9299]">
            {kpis.topSpreadAsset?.bestLongExchange && kpis.topSpreadAsset?.bestShortExchange
              ? `${kpis.topSpreadAsset.bestLongExchange.toUpperCase()} ↔ ${kpis.topSpreadAsset.bestShortExchange.toUpperCase()}`
              : 'Delta-neutral APR'}
          </span>
        </div>

        {/* Average Funding APR */}
        <div className="bg-[#121318] border border-[#23252d] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block">
            Mean Market APR
          </span>
          <div className="text-lg font-bold font-mono text-purple-400">
            {kpis.avgApr > 0 ? '+' : ''}{kpis.avgApr}%
          </div>
          <span className="text-[11px] text-purple-300/80">Annualized Benchmark</span>
        </div>
      </div>

      {/* Control Bar: Search, Favorites Filter, Expand All */}
      <div className="bg-[#121318] border border-[#22242d] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#8E9299] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Coin-M asset (e.g. BTC, ETH, SOL)..."
              className="w-full bg-[#181a22] border border-[#2a2d38] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#6c707d] focus:outline-none focus:border-cyan-400/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Favorites Filter Toggle */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              showFavoritesOnly
                ? 'bg-amber-400/10 text-amber-400 border-amber-400/30 shadow-sm'
                : 'bg-[#181a22] text-[#8E9299] border-[#2a2d38] hover:text-white hover:border-[#383c4b]'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'text-amber-400 fill-amber-400' : ''}`}
            />
            <span>Favorites</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-white/80">
              {favorites.length}
            </span>
          </button>

          {/* Expand/Collapse All Button */}
          <button
            onClick={() => setExpandAll(!expandAll)}
            className="px-3 py-1.5 bg-[#181a22] hover:bg-[#20222c] border border-[#2a2d38] hover:border-[#383c4b] rounded-lg text-xs font-semibold text-[#8E9299] hover:text-white flex items-center gap-1.5 transition-colors"
          >
            {expandAll ? <ChevronsDownUp className="w-3.5 h-3.5" /> : <ChevronsUpDown className="w-3.5 h-3.5" />}
            <span>{expandAll ? 'Collapse All' : 'Expand All'}</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3 text-xs text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => loadData(true)}
            className="ml-auto underline hover:text-white font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && data.length === 0 && (
        <div className="bg-[#121318] border border-[#22242d] rounded-xl p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-[#8E9299]">Scanning Coin-M markets on Bybit, OKX & Bitget...</p>
        </div>
      )}

      {/* Master Coin-M Table */}
      {(!isLoading || data.length > 0) && (
        <div className="bg-[#121318] border border-[#22242d] rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap min-w-[1280px]">
              <thead className="bg-[#151720] text-[#8E9299] border-b border-[#22242d] text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <span className="sr-only">Favorite</span>
                  </th>
                  <th className="py-3 px-3">
                    <ThHeaderTooltip
                      title="Coin-M Asset"
                      description="Underlying cryptocurrency and active exchanges offering native Coin-M margin."
                    >
                      Coin-M Asset
                    </ThHeaderTooltip>
                  </th>
                  <th className="py-3 px-3 text-right">
                    <ThHeaderTooltip
                      title="Price & Change"
                      description="Composite benchmark price across active exchanges and 24h percentage change."
                    >
                      Price / 24h Δ
                    </ThHeaderTooltip>
                  </th>
                  <th className="py-3 px-3 text-right">
                    <ThHeaderTooltip
                      title="24h Range"
                      description="24-hour Low to High trading channel with market direction indicator and intraday momentum."
                    >
                      24h Range (L / H)
                    </ThHeaderTooltip>
                  </th>
                  <th className="py-3 px-3 text-right">
                    <ThHeaderTooltip
                      title="24h Volume"
                      description="Total 24h volume displayed in notional USD and in native coin units."
                    >
                      24h Volume (USD / Coin)
                    </ThHeaderTooltip>
                  </th>
                  <th className="py-3 px-3 text-right">
                    <ThHeaderTooltip
                      title="Open Interest"
                      description="Aggregated Open Interest across all active Coin-M contracts."
                    >
                      Open Interest (USD)
                    </ThHeaderTooltip>
                  </th>
                  <th className="py-3 px-3 text-right">
                    <ThHeaderTooltip
                      title="CVD Flow"
                      description="Estimated Cumulative Volume Delta (net taker buyer vs seller flow in USD)."
                    >
                      CVD Flow (Taker)
                    </ThHeaderTooltip>
                  </th>
                  <th className="py-3 px-3 w-10 text-center">
                    <span className="sr-only">Expand</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1c24]">
                {filteredData.map((asset) => (
                  <InverseAssetRow
                    key={asset.symbol}
                    asset={asset}
                    isFavorite={favorites.includes(asset.symbol)}
                    onToggleFavorite={toggleFavorite}
                    defaultExpanded={expandAll}
                  />
                ))}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#8E9299]">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Coins className="w-8 h-8 text-[#4e515d]" />
                        <p className="text-xs font-semibold text-white">No Coin-M assets found</p>
                        <p className="text-[11px] text-[#6b6e79]">
                          {showFavoritesOnly
                            ? 'You have no favorited Coin-M assets matching this query. Click the star icon to favorite an asset.'
                            : 'Try adjusting your search query.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InverseMarketDashboard;
