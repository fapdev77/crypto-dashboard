import React, { useState, useMemo } from 'react';
import { useFundingData } from '../../../hooks/useFundingData';
import { useFundingStore } from '../../../store/fundingStore';
import { useFundingSync } from '../../../hooks/useFundingSync';
import { FundingFeeAggregated } from '../../../types';
import { Loader2, Search, Star, RefreshCw, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { AppTooltip } from '../../ui/Tooltip';
import { CoinIcon } from '../../ui/CoinIcon';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { FilterBar } from '../../ui/FilterBar';
import clsx from 'clsx';
import { format } from 'date-fns';

const getBaseCoin = (symbol: string) => {
  let base = symbol.split('-')[0];
  base = base.split('_')[0];
  base = base.replace(/USDT$|USD$|PERP$|FUTURES$/i, '');
  return base.toUpperCase();
};

const formatPercent = (val: number) => (val * 100).toFixed(4) + '%';

const FundingTable = ({ 
  title, 
  data, 
  defaultExpanded = true 
}: { 
  title: string, 
  data: FundingFeeAggregated[], 
  defaultExpanded?: boolean 
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

  if (data.length === 0) return null;

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden mb-6">
      <div 
        className="px-6 py-4 flex items-center justify-between cursor-pointer bg-[#1A1C20] hover:bg-[#202226] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4 text-[#8E9299]" /> : <ChevronRight className="w-4 h-4 text-[#8E9299]" />}
          {title} <span className="text-[#8E9299] text-xs font-normal">({groupedByCoin.length} Coins)</span>
        </h3>
      </div>
      
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="text-[#8E9299] bg-[#1A1C20]/50 border-y border-[#2a2b30]">
              <tr>
                <th className="px-6 py-3 font-medium w-10"></th>
                <th className="px-6 py-3 font-medium">Asset / Exchange</th>
                <th className="px-6 py-3 font-medium text-right">Next (Rate / Time)</th>
                <th className="px-6 py-3 font-medium text-right">Last</th>
                <th className="px-6 py-3 font-medium text-right">Today</th>
                <th className="px-6 py-3 font-medium text-right">Current Month</th>
                <th className="px-6 py-3 font-medium text-right text-yellow-500/80">Last Month</th>
                <th className="px-6 py-3 font-medium text-right text-yellow-500/80">Last 3 Months</th>
                <th className="px-6 py-3 font-medium text-right text-yellow-500/80">Last 6 Months</th>
                <th className="px-6 py-3 font-medium text-right text-yellow-500/80">1 Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2b30]/50">
              {groupedByCoin.map(([coin, rows]) => {
                const isExpanded = expandedCoins[coin];
                // Check if the group is favorited
                const isFav = favorites.includes(coin);
                
                // Averages for the parent row
                const avg = (key: keyof FundingFeeAggregated) => {
                  const valid = rows.filter(r => r[key] !== undefined && typeof r[key] === 'number');
                  if (valid.length === 0) return undefined;
                  const sum = valid.reduce((acc, r) => acc + (r[key] as number), 0);
                  return sum / valid.length;
                };

                const avgNext = avg('nextFundingRate');
                const avgLast = avg('lastFundingRate');
                const avgToday = avg('todaySum');
                const avgMonth = avg('currentMonthSum');
                const avgLastMonth = avg('lastMonthSum');
                const avg3M = avg('last3MonthsSum');
                const avg6M = avg('last6MonthsSum');
                const avgYear = avg('yearSum');

                return (
                  <React.Fragment key={coin}>
                    <tr 
                      className="hover:bg-[#1A1C20]/30 transition-colors cursor-pointer"
                      onClick={() => toggleCoin(coin)}
                    >
                      <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => toggleFavorite(coin)}
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
                          <span className="text-[10px] text-[#8E9299] bg-[#2a2b30] px-1.5 py-0.5 rounded">Avg</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {avgNext !== undefined ? (
                          <span className={avgNext > 0 ? "text-green-400 font-medium" : avgNext < 0 ? "text-red-400 font-medium" : "text-white font-medium"}>
                            {formatPercent(avgNext)}
                          </span>
                        ) : <span className="text-[#8E9299]">---</span>}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {avgLast !== undefined ? (
                          <span className={avgLast > 0 ? "text-green-400 font-medium" : avgLast < 0 ? "text-red-400 font-medium" : "text-white font-medium"}>
                            {formatPercent(avgLast)}
                          </span>
                        ) : <span className="text-[#8E9299]">---</span>}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-white opacity-90">{avgToday !== undefined ? formatPercent(avgToday) : '---'}</td>
                      <td className="px-6 py-3 text-right font-mono text-white opacity-90">{avgMonth !== undefined ? formatPercent(avgMonth) : '---'}</td>
                      <td className="px-6 py-3 text-right font-mono text-white opacity-50">{avgLastMonth !== undefined ? formatPercent(avgLastMonth) : '---'}</td>
                      <td className="px-6 py-3 text-right font-mono text-white opacity-50">{avg3M !== undefined ? formatPercent(avg3M) : '---'}</td>
                      <td className="px-6 py-3 text-right font-mono text-white opacity-50">{avg6M !== undefined ? formatPercent(avg6M) : '---'}</td>
                      <td className="px-6 py-3 text-right font-mono text-white opacity-50">{avgYear !== undefined ? formatPercent(avgYear) : '---'}</td>
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
                                <span className={row.nextFundingRate > 0 ? "text-green-400" : row.nextFundingRate < 0 ? "text-red-400" : "text-white"}>
                                  {formatPercent(row.nextFundingRate)}
                                </span>
                                {row.nextFundingTime && (
                                  <span className="text-[10px] text-[#8E9299]">
                                    {format(row.nextFundingTime, 'MM/dd HH:mm')}
                                  </span>
                                )}
                              </div>
                            ) : <span className="text-[#8E9299]">---</span>}
                          </td>
                          <td className="px-6 py-2 text-right">
                            <span className={row.lastFundingRate > 0 ? "text-green-400" : row.lastFundingRate < 0 ? "text-red-400" : "text-white"}>
                              {formatPercent(row.lastFundingRate)}
                            </span>
                          </td>
                          <td className="px-6 py-2 text-right font-mono text-white/80">
                            {formatPercent(row.todaySum)}
                          </td>
                          <td className="px-6 py-2 text-right font-mono text-white/80">
                            {formatPercent(row.currentMonthSum)}
                          </td>
                          <td className="px-6 py-2 text-right font-mono text-white/60">
                            {row.exchange === 'okx' ? '---' : formatPercent(row.lastMonthSum)}
                          </td>
                          <td className="px-6 py-2 text-right font-mono text-white/60">
                            {row.exchange === 'okx' ? '---' : formatPercent(row.last3MonthsSum)}
                          </td>
                          <td className="px-6 py-2 text-right font-mono text-white/60">
                            {row.exchange === 'okx' ? '---' : formatPercent(row.last6MonthsSum)}
                          </td>
                          <td className="px-6 py-2 text-right font-mono text-white/60">
                            {row.exchange === 'okx' ? '---' : formatPercent(row.yearSum)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
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
  const { aggregatedData, isLoading } = useFundingData();
  const { forceSync } = useFundingSync();
  const { isSyncing, syncProgress, syncMessage, favorites } = useFundingStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [expandAll, setExpandAll] = useState(true); // Default true

  const filteredData = useMemo(() => {
    return aggregatedData.filter(row => {
      const coin = getBaseCoin(row.symbol);
      if (showFavoritesOnly && !favorites.includes(coin)) return false;
      if (exchangeFilter.toLowerCase() !== 'all' && row.exchange !== exchangeFilter.toLowerCase()) return false;
      if (instrumentFilter.toLowerCase() !== 'all' && row.instrumentType !== instrumentFilter) return false;
      if (searchTerm && !row.symbol.toLowerCase().includes(searchTerm.toLowerCase()) && !coin.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [aggregatedData, searchTerm, exchangeFilter, instrumentFilter, showFavoritesOnly, favorites]);

  // Group by instrument type
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
    
    // Sort within groups by symbol
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
        </div>
        <div className="flex items-center gap-3">
          {isSyncing && (
            <div className="flex items-center gap-2 bg-[#2F6BFF]/10 text-[#2F6BFF] px-3 py-1.5 rounded-lg border border-[#2F6BFF]/20 text-xs font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{syncMessage} ({syncProgress}%)</span>
            </div>
          )}
          <button
            onClick={() => forceSync()}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", isSyncing && "animate-spin")} />
            Sync Now
          </button>
        </div>
      </div>
      
      <div className="px-0">
        <FilterBar
          prepend={
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap",
                showFavoritesOnly 
                  ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" 
                  : "bg-[#1a1b1e] border-[#2a2b30] text-[#8E9299] hover:text-white"
              )}
            >
              <Star className={clsx("w-4 h-4", showFavoritesOnly && "fill-yellow-500")} />
              Favorites
            </button>
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
              defaultExpanded={expandAll} 
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
    </div>
  );
};

export default FundingDashboard;
