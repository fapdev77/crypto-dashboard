import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFundingData } from '../../../hooks/useFundingData';
import { useFundingSync } from '../../../hooks/useFundingSync';
import { useFundingStore } from '../../../store/fundingStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useOpenPositionKeys, getBaseCoin } from '../../../hooks/useOpenPositionKeys';
import { FundingFeeAggregated } from '../../../types';
import { Clock, Loader2, Search, Star, ChevronDown, ChevronRight, AlertTriangle, Briefcase } from 'lucide-react';
import { useKpiMetrics } from '../../../hooks/useKpiMetrics';
import { MarketOverviewCards } from './MarketOverviewCards';
import { FundingRateComparison } from './FundingRateComparison';
import { AppTooltip } from '../../ui/Tooltip';
import { CoinIcon } from '../../ui/CoinIcon';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { FilterBar } from '../../ui/FilterBar';
import { StatusAndSyncBadge } from '../../ui/StatusAndSyncBadge';
import { Pagination } from '../../ui/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import clsx from 'clsx';

const COINS_PER_PAGE = 25;

const formatPercent = (val: number) => (val * 100).toFixed(4) + '%';

/** Return a Tailwind text-color class based on whether the value is positive, negative, or zero. */
const INCOMPLETE_NOTE = 'OKX and Bitget APIs limit historical data to ~3 months. Values beyond 3 months are from our local cache and may be partial until sufficient data accumulates.';
const fundingColor = (val: number | undefined): string => {
  if (val === undefined) return 'text-[#8E9299]';
  if (val > 0) return 'text-green-400';
  if (val < 0) return 'text-red-400';
  return 'text-white';
};

/** Text shared across tooltips explaining what each time-based column means. */
const HISTORICAL_NOTE = `⚠ Does NOT include the current month — only completed months are counted.`;

/** Tooltip content for each rate column header. */
const COLUMN_TOOLTIPS: Record<string, string> = {
  next:
    'The upcoming funding rate and its estimated settlement time. A positive rate (green) means Long positions pay Short positions. A negative rate (red) means Short positions pay Long positions.',
  last:
    'The most recent funding rate that was already settled. Positive = Longs paid Shorts. Negative = Shorts paid Longs.',
  today:
    'Cumulative funding rate sum for today (UTC). Reflects all settled funding intervals so far today.',
  currentMonth:
    'Cumulative funding rate sum for the current calendar month. Includes today.',
  lastMonth: `Cumulative funding rate sum for the previous calendar month. ${HISTORICAL_NOTE}`,
  last3Months: `Cumulative funding rate sum over the last 3 calendar months. ${HISTORICAL_NOTE}`,
  last6Months: `Cumulative funding rate sum over the last 6 calendar months. ${HISTORICAL_NOTE} ${INCOMPLETE_NOTE}`,
  oneYear: `Cumulative funding rate sum over the last 12 calendar months. ${HISTORICAL_NOTE} ${INCOMPLETE_NOTE}`,
};

const ThTooltip = ({ columnKey, children }: { columnKey: string; children: React.ReactNode }) => {
  const description = COLUMN_TOOLTIPS[columnKey];
  if (!description) return <>{children}</>;
  return (
    <AppTooltip description={description}>
      <span className="cursor-help border-b border-dashed border-[#8E9299]/40 hover:border-[#8E9299]/80 transition-colors">
        {children}
      </span>
    </AppTooltip>
  );
};

/**
 * Wraps children and flashes green/red when `value` changes (up/down).
 * Only the `nextFundingRate` changes dynamically, so this is applied exclusively to that column.
 */

/** Explanation for a single funding-rate value: who paid whom. */
const RateTooltip = ({
  rate,
  label,
  missingReason,
  children,
}: {
  rate: number | undefined;
  label: string;
  missingReason?: string;
  children: React.ReactNode;
}) => {
  if (rate === undefined) {
    if (missingReason) {
      return (
        <AppTooltip
          description={missingReason}
          rows={[]}
          side="top"
          align="center"
        >
          <span className="cursor-help text-[#8E9299]">{children}</span>
        </AppTooltip>
      );
    }
    return <>{children}</>;
  }
  const isPositive = rate > 0;
  const isNegative = rate < 0;
  const whoPaid = isPositive
    ? 'Long positions are paying Short positions'
    : isNegative
      ? 'Short positions are paying Long positions'
      : 'No payment is exchanged';

  return (
    <AppTooltip
      description={`${label}: ${(rate * 100).toFixed(4)}%`}
      rows={[
        { label: 'Direction', value: isPositive ? 'Longs → Shorts' : isNegative ? 'Shorts → Longs' : 'Neutral' },
        { label: 'Who Pays', value: whoPaid },
      ]}
      side="top"
      align="center"
    >
      <span className="cursor-help">{children}</span>
    </AppTooltip>
  );
};

const FundingTable = ({ 
  title, 
  data, 
  filterKey,
  defaultExpanded = true,
  isSyncing = false
}: { 
  title: string, 
  data: FundingFeeAggregated[], 
  filterKey?: string,
  defaultExpanded?: boolean,
  isSyncing?: boolean
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expandedCoins, setExpandedCoins] = useState<Record<string, boolean>>({});
  const { favorites, toggleFavorite } = useFundingStore();

  const toggleCoin = (coin: string) => {
    setExpandedCoins(prev => ({ ...prev, [coin]: !prev[coin] }));
  };

  const groupedByCoin = useMemo(() => {
    const groups: Record<string, FundingFeeAggregated[]> = {};
    data.forEach(row => {
      const baseCoin = getBaseCoin(row.symbol);
      if (!groups[baseCoin]) groups[baseCoin] = [];
      groups[baseCoin].push(row);
    });
    // Sort by baseCoin
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  // ── Pagination ──
  // Only reset pagination when explicit filters change, not when data refreshes
  const {
    page,
    setPage,
    paginated: paginatedGroups,
    totalItems: groupsTotal,
  } = usePagination(groupedByCoin, COINS_PER_PAGE, [filterKey]);

  const paginationId = `funding-${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

  if (data.length === 0) return null;

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden mb-6">
      <div 
        className="relative px-6 py-4 flex items-center justify-between cursor-pointer bg-[#1A1C20] hover:bg-[#202226] transition-colors overflow-hidden"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4 text-[#8E9299]" /> : <ChevronRight className="w-4 h-4 text-[#8E9299]" />}
          {title} <span className="text-[#8E9299] text-xs font-normal">({groupedByCoin.length} Coins)</span>
        </h3>
        {isSyncing && (
           <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-xs font-medium animate-pulse">
             <Loader2 className="w-3 h-3 animate-spin" />
             Please wait, rates update in progress...
           </div>
        )}
      </div>
      
      {expanded && (
        <div className="overflow-x-auto">
          {/* Top Pagination */}
          {groupsTotal > COINS_PER_PAGE && (
            <div className="px-6 py-3 border-b border-[#2a2b30]/50">
              <Pagination
                id={`${paginationId}-top`}
                currentPage={page}
                totalItems={groupsTotal}
                itemsPerPage={COINS_PER_PAGE}
                onPageChange={setPage}
                refreshKey={`${groupsTotal}-${data.length}`}
                refreshLabel="Filtering"
              />
            </div>
          )}

          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="text-[#8E9299] bg-[#1A1C20]/50 border-y border-[#2a2b30]">
              <tr>
                <th className="px-6 py-3 font-medium w-10"></th>
                <th className="px-6 py-3 font-medium">Asset / Exchange</th>
                <th className="px-6 py-3 font-medium text-right">
                  <ThTooltip columnKey="next">Next (Rate / Time)</ThTooltip>
                </th>
                <th className="px-6 py-3 font-medium text-right">
                  <ThTooltip columnKey="last">Last</ThTooltip>
                </th>
                <th className="px-6 py-3 font-medium text-right">
                  <ThTooltip columnKey="today">Today</ThTooltip>
                </th>
                <th className="px-6 py-3 font-medium text-right">
                  <ThTooltip columnKey="currentMonth">Current Month</ThTooltip>
                </th>
                <th className="px-6 py-3 font-medium text-right text-yellow-500/80">
                  <ThTooltip columnKey="lastMonth">Last Month</ThTooltip>
                </th>
                <th className="px-6 py-3 font-medium text-right text-yellow-500/80">
                  <ThTooltip columnKey="last3Months">Last 3 Months</ThTooltip>
                </th>
                <th className="px-6 py-3 font-medium text-right text-yellow-500/80">
                  <ThTooltip columnKey="last6Months">Last 6 Months</ThTooltip>
                </th>
                <th className="px-6 py-3 font-medium text-right text-yellow-500/80">
                  <ThTooltip columnKey="oneYear">1 Year</ThTooltip>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2b30]/50">
              {paginatedGroups.map(([coin, rows]) => {
                const isExpanded = expandedCoins[coin];
                const instType = rows[0]?.instrumentType || 'USDT-M';
                const rowId = `${coin}_${instType}`;
                const isFav = favorites.includes(rowId) || favorites.includes(coin);

                const maxVal = (key: keyof FundingFeeAggregated, filterFn?: (r: FundingFeeAggregated) => boolean) => {
                  let valid = rows.filter(r => r[key] !== undefined && typeof r[key] === 'number');
                  if (filterFn) valid = valid.filter(filterFn);
                  if (valid.length === 0) return undefined;
                  return Math.max(...valid.map(r => r[key] as number));
                };

                const maxNext = maxVal('nextFundingRate');
                const maxLast = maxVal('lastFundingRate');
                const maxToday = maxVal('todaySum');
                const maxMonth = maxVal('currentMonthSum');
                const maxLastMonth = maxVal('lastMonthSum');
                const max3M = maxVal('last3MonthsSum');
                const max6M = maxVal('last6MonthsSum');
                const maxYear = maxVal('yearSum');

                return (
                  <React.Fragment key={coin}>
                    <tr 
                      className="hover:bg-[#1A1C20]/30 transition-colors cursor-pointer"
                      onClick={() => toggleCoin(coin)}
                    >
                      <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => toggleFavorite(rowId)}
                          className="text-[#8E9299] hover:text-yellow-500 transition-colors"
                        >
                          <Star className={clsx("w-4 h-4", isFav && "fill-yellow-500 text-yellow-500")} />
                        </button>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-[#8E9299]" /> : <ChevronRight className="w-4 h-4 text-[#8E9299]" />}
                          <CoinIcon symbol={coin} className="w-6 h-6" />
                          <span className="text-white font-bold text-sm">{coin}</span>
                          <span className="text-[10px] text-[#8E9299] bg-[#2a2b30] px-1.5 py-0.5 rounded">Max</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <RateTooltip rate={maxNext} label="Max next funding rate">
                          
                            {maxNext !== undefined ? (
                              <span className={maxNext > 0 ? "text-green-400 font-medium" : maxNext < 0 ? "text-red-400 font-medium" : "text-white font-medium"}>
                                {formatPercent(maxNext)}
                              </span>
                            ) : <span className="text-[#8E9299]">---</span>}
                          
                        </RateTooltip>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <RateTooltip rate={maxLast} label="Max last funding rate">
                          {maxLast !== undefined ? (
                            <span className={maxLast > 0 ? "text-green-400 font-medium" : maxLast < 0 ? "text-red-400 font-medium" : "text-white font-medium"}>
                              {formatPercent(maxLast)}
                            </span>
                          ) : <span className="text-[#8E9299]">---</span>}
                        </RateTooltip>
                      </td>
                      <td className="px-6 py-3 text-right font-mono">
                        <RateTooltip rate={maxToday} label="Today cumulative">
                          {maxToday !== undefined ? (
                            <span className={fundingColor(maxToday)}>{formatPercent(maxToday)}</span>
                          ) : <span className="text-[#8E9299]">---</span>}
                        </RateTooltip>
                      </td>
                      <td className="px-6 py-3 text-right font-mono">
                        <RateTooltip rate={maxMonth} label="Current month cumulative">
                          {maxMonth !== undefined ? (
                            <span className={fundingColor(maxMonth)}>{formatPercent(maxMonth)}</span>
                          ) : <span className="text-[#8E9299]">---</span>}
                        </RateTooltip>
                      </td>
                      <td className="px-6 py-3 text-right font-mono">
                        <RateTooltip rate={maxLastMonth} label="Last month cumulative">
                          {maxLastMonth !== undefined ? (
                            <span className={fundingColor(maxLastMonth)}>{formatPercent(maxLastMonth)}</span>
                          ) : <span className="text-[#8E9299]">---</span>}
                        </RateTooltip>
                      </td>
                      <td className="px-6 py-3 text-right font-mono">
                        <RateTooltip rate={max3M} label="3-month cumulative">
                          {max3M !== undefined ? (
                            <span className={fundingColor(max3M)}>{formatPercent(max3M)}</span>
                          ) : <span className="text-[#8E9299]">---</span>}
                        </RateTooltip>
                      </td>
                      <td className="px-6 py-3 text-right font-mono">
                        <RateTooltip rate={max6M} label="6-month cumulative">
                          {max6M !== undefined ? (
                            <span className={fundingColor(max6M)}>{formatPercent(max6M)}</span>
                          ) : <span className="text-[#8E9299]">---</span>}
                        </RateTooltip>
                      </td>
                      <td className="px-6 py-3 text-right font-mono">
                        <RateTooltip rate={maxYear} label="1-year cumulative">
                          {maxYear !== undefined ? (
                            <span className={fundingColor(maxYear)}>{formatPercent(maxYear)}</span>
                          ) : <span className="text-[#8E9299]">---</span>}
                        </RateTooltip>
                      </td>
                    </tr>
                    
                    {isExpanded && rows.map((row) => {
                      return (
                        <tr key={`${row.exchange}-${row.symbol}`} className="bg-[#1A1C20]/40 hover:bg-[#1A1C20]/70 transition-colors">
                          <td className="px-6 py-2 border-l-2 border-l-[#2F6BFF]/30">
                          </td>
                          <td className="px-6 py-2 pl-12">
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-medium capitalize w-max shrink-0",
                                row.exchange === 'bitget' ? "bg-[#03aac7]/10 text-[#03aac7] border-[#03aac7]/20" :
                                row.exchange === 'bybit' ? "bg-[#ff9c2e]/10 text-[#ff9c2e] border-[#ff9c2e]/20" :
                                row.exchange === 'okx' ? "bg-white/10 text-white border-white/20" :
                                "bg-[#2a2b30] text-[#8E9299] border-[#2a2b30]"
                              )}>
                                <ExchangeIcon exchange={row.exchange} className="w-3 h-3" />
                                {row.exchange}
                              </span>
                              <span className="text-white/80 font-medium text-[11px]">{row.symbol}</span>
                            </div>
                          </td>
                          <td className="px-6 py-2 text-right">
                            {row.nextFundingRate !== undefined ? (
                              <div className="flex flex-col items-end">
                                <RateTooltip rate={row.nextFundingRate} label="Next funding rate">
                                  
                                    <span className={row.nextFundingRate > 0 ? "text-green-400" : row.nextFundingRate < 0 ? "text-red-400" : "text-white"}>
                                      {formatPercent(row.nextFundingRate)}
                                    </span>
                                  
                                </RateTooltip>
                                {row.nextFundingTime && (
                                  <AppTooltip
                                    description="Estimated time of the next funding settlement."
                                    rows={[{
                                      label: 'Full Date',
                                      value: new Date(row.nextFundingTime).toLocaleString([], {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                      }),
                                    }]}
                                  >
                                    <span className="inline-flex items-center gap-1 text-[10px] text-[#8E9299] cursor-help border-b border-dashed border-[#8E9299]/30">
                                      <Clock className="w-3 h-3" />
                                      {new Date(row.nextFundingTime).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </AppTooltip>
                                )}
                              </div>
                            ) : <span className="text-[#8E9299]">---</span>}
                          </td>
                          <td className="px-6 py-2 text-right">
                            {row.lastFundingRate !== undefined ? (
                              <RateTooltip rate={row.lastFundingRate} label="Last settled funding rate">
                                <span className={row.lastFundingRate > 0 ? "text-green-400" : row.lastFundingRate < 0 ? "text-red-400" : "text-white"}>
                                  {formatPercent(row.lastFundingRate)}
                                </span>
                              </RateTooltip>
                            ) : <span className="text-[#8E9299]">---</span>}
                          </td>
                          <td className="px-6 py-2 text-right font-mono">
                            <RateTooltip rate={row.todaySum} label="Today cumulative">
                              <span className={fundingColor(row.todaySum)}>{formatPercent(row.todaySum)}</span>
                            </RateTooltip>
                          </td>
                          <td className="px-6 py-2 text-right font-mono">
                            <RateTooltip rate={row.currentMonthSum} label="Current month cumulative">
                              <span className={fundingColor(row.currentMonthSum)}>{formatPercent(row.currentMonthSum)}</span>
                            </RateTooltip>
                          </td>
                          <td className="px-6 py-2 text-right font-mono">
                            <RateTooltip rate={row.lastMonthSum} label="Last month cumulative">
                              <span className={fundingColor(row.lastMonthSum)}>{formatPercent(row.lastMonthSum)}</span>
                            </RateTooltip>
                          </td>
                          <td className="px-6 py-2 text-right font-mono">
                            <RateTooltip rate={row.last3MonthsSum} label="3-month cumulative">
                              <span className={fundingColor(row.last3MonthsSum)}>{formatPercent(row.last3MonthsSum)}</span>
                            </RateTooltip>
                          </td>
                          <td className="px-6 py-2 text-right font-mono">
                            <RateTooltip rate={row.last6MonthsSum} label="6-month cumulative" missingReason={row.last6MonthsSum === undefined ? (row.exchange === 'okx' || row.exchange === 'bitget' ? `The ${row.exchange.toUpperCase()} API limits historical data to ~3 months. Data will accumulate locally over time.` : undefined) : undefined}>
                              {row.last6MonthsSum !== undefined ? (
                                <span className={fundingColor(row.last6MonthsSum)}>{formatPercent(row.last6MonthsSum)}</span>
                              ) : <span className="text-[#8E9299]">---</span>}
                            </RateTooltip>
                          </td>
                          <td className="px-6 py-2 text-right font-mono">
                            <RateTooltip rate={row.yearSum} label="Year cumulative" missingReason={row.yearSum === undefined ? (row.exchange === 'okx' || row.exchange === 'bitget' ? `The ${row.exchange.toUpperCase()} API limits historical data to ~3 months. Data will accumulate locally over time.` : undefined) : undefined}>
                              {row.yearSum !== undefined ? (
                                <span className={fundingColor(row.yearSum)}>{formatPercent(row.yearSum)}</span>
                              ) : <span className="text-[#8E9299]">---</span>}
                            </RateTooltip>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Bottom Pagination */}
          {groupsTotal > COINS_PER_PAGE && (
            <div className="px-6 py-3 border-t border-[#2a2b30]/50">
              <Pagination
                id={`${paginationId}-bottom`}
                currentPage={page}
                totalItems={groupsTotal}
                itemsPerPage={COINS_PER_PAGE}
                onPageChange={setPage}
                refreshKey={`${groupsTotal}-${data.length}`}
                refreshLabel="Filtering"
              />
            </div>
          )}

          <div className="px-6 py-3 bg-[#1A1C20]/20 text-[10px] text-[#8E9299] flex items-center justify-end gap-2 border-t border-[#2a2b30]/50">
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
            Historical columns (Last Month, 3M, 6M, 1Y) do not include the current month. OKX API limits historical data to the last 3 months.
          </div>
        </div>
      )}
    </div>
  );
};

export const FundingDashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison'>('overview');
  const { forceSync } = useFundingSync();
  const { aggregatedData, isLoading } = useFundingData();
  const { isSyncing, syncMessage, favorites, lastHistoryFetch, nextScheduledSyncTime } = useFundingStore();
  const { currentRates } = useFundingStore();
  const fundingHistoryInterval = useSettingsStore(state => state.fundingHistoryInterval);
  const openPositionKeys = useOpenPositionKeys();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');
  // ── KPI metrics ──
  const { marketMetrics, rankings } = useKpiMetrics(
    aggregatedData,
    currentRates,
  );

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(() => {
    return localStorage.getItem('fundingDashboard_showFavoritesOnly') === 'true';
  });
  const [showOpenPositionsOnly, setShowOpenPositionsOnly] = useState(() => {
    return localStorage.getItem('fundingDashboard_showOpenPositionsOnly') === 'true';
  });
  const [expandAll, setExpandAll] = useState(true);

  useEffect(() => {
    localStorage.setItem('fundingDashboard_showFavoritesOnly', String(showFavoritesOnly));
  }, [showFavoritesOnly]);

  useEffect(() => {
    localStorage.setItem('fundingDashboard_showOpenPositionsOnly', String(showOpenPositionsOnly));
  }, [showOpenPositionsOnly]);

  const hasOpenPositions = openPositionKeys.size > 0;

  const filteredData = useMemo(() => {
    return aggregatedData.filter(row => {
      const coin = getBaseCoin(row.symbol);
      const rowId = `${coin}_${row.instrumentType}`;
      
      const isFav = favorites.includes(rowId) || favorites.includes(coin);
      if (showFavoritesOnly && !isFav) return false;
      
      const hasOpenPos = openPositionKeys.has(`${row.exchange}|${coin}|${row.instrumentType}`);
      if (showOpenPositionsOnly && !hasOpenPos) return false;
      
      if (exchangeFilter.toLowerCase() !== 'all' && row.exchange !== exchangeFilter.toLowerCase()) return false;
      if (instrumentFilter.toLowerCase() !== 'all' && row.instrumentType !== instrumentFilter) return false;
      if (searchTerm && !row.symbol.toLowerCase().includes(searchTerm.toLowerCase()) && !coin.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [aggregatedData, searchTerm, exchangeFilter, instrumentFilter, showFavoritesOnly, showOpenPositionsOnly, openPositionKeys, favorites]);

  const groupedData = useMemo(() => {
    const groups: Record<string, FundingFeeAggregated[]> = {
      'USDT-M Perpetual': [],
      'COIN-M (Inverse) Perpetual': []
    };
    
    filteredData.forEach(row => {
      if (row.instrumentType === 'USDT-M') {
        groups['USDT-M Perpetual'].push(row);
      } else {
        groups['COIN-M (Inverse) Perpetual'].push(row);
      }
    });
    
    Object.keys(groups).forEach(k => {
      groups[k].sort((a, b) => a.symbol.localeCompare(b.symbol));
    });
    
    return groups;
  }, [filteredData]);

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Funding Fees Dashboard</h2>
          <p className="text-xs text-[#8E9299] mt-1">
            Real-time and historical funding rates aggregated across exchanges.
          </p>
          <StatusAndSyncBadge
            isSyncing={isSyncing}
            syncMessage={isSyncing ? (syncMessage || 'Syncing funding history...') : null}
            overrideIntervalMs={fundingHistoryInterval * 60 * 60 * 1000}
            overrideLastSyncTime={lastHistoryFetch}
            overrideNextSyncTime={nextScheduledSyncTime}
            onManualSync={forceSync}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-[#2a2b30] pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={clsx(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2",
            activeTab === 'overview' ? "border-[#2F6BFF] text-white" : "border-transparent text-[#8E9299] hover:text-white"
          )}
        >
          Historical Overview
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={clsx(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2",
            activeTab === 'comparison' ? "border-[#2F6BFF] text-white" : "border-transparent text-[#8E9299] hover:text-white"
          )}
        >
          Funding Rate Comparison
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="px-0">
            <FilterBar
          prepend={
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={clsx(
                  "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap overflow-hidden",
                  showFavoritesOnly 
                    ? "border-yellow-500/30 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]" 
                    : "bg-[#1a1b1e] border-[#2a2b30] text-[#8E9299] hover:text-white"
                )}
              >
                {showFavoritesOnly && (
                  <div className="absolute inset-0 bg-yellow-500/10 animate-pulse pointer-events-none" />
                )}
                <Star className={clsx("w-4 h-4 relative z-10", showFavoritesOnly && "fill-yellow-500")} />
                <span className="relative z-10">Favorites</span>
              </button>
              {hasOpenPositions && (
                <button
                  onClick={() => setShowOpenPositionsOnly(!showOpenPositionsOnly)}
                  className={clsx(
                    "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap overflow-hidden",
                    showOpenPositionsOnly 
                      ? "border-[#2F6BFF]/30 text-[#2F6BFF] shadow-[0_0_10px_rgba(47,107,255,0.1)]" 
                      : "bg-[#1a1b1e] border-[#2a2b30] text-[#8E9299] hover:text-white"
                  )}
                >
                  {showOpenPositionsOnly && (
                    <div className="absolute inset-0 bg-[#2F6BFF]/10 animate-pulse pointer-events-none" />
                  )}
                  <Briefcase className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Open Positions</span>
                </button>
              )}
            </div>
          }
          search={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: 'Search symbols (e.g. BTC)...'
          }}
          exchange={{
            value: exchangeFilter,
            onChange: setExchangeFilter,
            labelAll: 'All Exchanges',
            options: ['bybit', 'bitget', 'okx']
          }}
          instrument={{
            value: instrumentFilter,
            onChange: (val) => setInstrumentFilter(val === 'All' ? 'all' : val),
            options: ['All', 'USDT-M', 'COIN-M'],
            labelAll: 'All Instruments'
          }}
        />
      </div>

      {/* ── Market Overview ── */}
      <MarketOverviewCards
        marketMetrics={marketMetrics}
        rankings={rankings}
        isSyncing={isSyncing}
      />

      {isLoading && aggregatedData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 opacity-50">
          <Loader2 className="w-8 h-8 text-[#2F6BFF] animate-spin mb-4" />
          <p className="text-sm text-[#8E9299]">Loading funding data...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-2">
          {Object.entries(groupedData).map(([groupTitle, rows]) => (
            <FundingTable 
              key={groupTitle} 
              title={groupTitle} 
              data={rows} 
              filterKey={`${searchTerm}-${exchangeFilter}-${instrumentFilter}-${showFavoritesOnly}-${showOpenPositionsOnly}`}
              defaultExpanded={expandAll}
              isSyncing={isSyncing}
            />
          ))}
          {filteredData.length === 0 && (
             <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-12 flex flex-col items-center justify-center text-center">
               <div className="w-12 h-12 bg-[#2a2b30] rounded-full flex items-center justify-center mb-4">
                 <Search className="w-6 h-6 text-[#8E9299]" />
               </div>
               <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
               <p className="text-sm text-[#8E9299]">Try adjusting your filters or search term.</p>
             </div>
          )}
        </div>
      )}
      </>
      ) : (
        <div className="flex-1 w-full">
          <FundingRateComparison />
        </div>
      )}
    </div>
  );
};

export default FundingDashboard;
