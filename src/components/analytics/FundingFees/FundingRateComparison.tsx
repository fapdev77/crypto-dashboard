import React, { useState, useMemo, useEffect } from 'react';
import { useFundingData } from '../../../hooks/useFundingData';
import { useFundingStore } from '../../../store/fundingStore';
import { useOpenPositionKeys, getBaseCoin } from '../../../hooks/useOpenPositionKeys';
import { SymbolMultiSelect, SymbolOption } from './SymbolMultiSelect';
import { PeriodSegmentedControl, PeriodOption } from './PeriodSegmentedControl';
import { FundingComparisonChart, ChartDataPoint } from './FundingComparisonChart';
import { BarChart2, X, Star, Briefcase } from 'lucide-react';
import clsx from 'clsx';

export const FundingRateComparison = () => {
  const { aggregatedData, isLoading } = useFundingData();
  const { comparisonFavorites } = useFundingStore();
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [period, setPeriod] = useState<PeriodOption>('last');

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(() => {
    return localStorage.getItem('fundingComparison_showFavoritesOnly') === 'true';
  });
  const [showOpenPositionsOnly, setShowOpenPositionsOnly] = useState(() => {
    return localStorage.getItem('fundingComparison_showOpenPositionsOnly') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('fundingComparison_showFavoritesOnly', String(showFavoritesOnly));
  }, [showFavoritesOnly]);

  useEffect(() => {
    localStorage.setItem('fundingComparison_showOpenPositionsOnly', String(showOpenPositionsOnly));
  }, [showOpenPositionsOnly]);

  // Set default to favorites if they have any and no explicit preference was previously set
  useEffect(() => {
    if (comparisonFavorites.length > 0 && localStorage.getItem('fundingComparison_showFavoritesOnly') === null) {
      setShowFavoritesOnly(true);
      localStorage.setItem('fundingComparison_showFavoritesOnly', 'true');
    }
  }, [comparisonFavorites.length]);

  const openPositionKeys = useOpenPositionKeys();
  const hasOpenPositions = openPositionKeys.size > 0;
  
  const filteredAggregatedData = useMemo(() => {
    return aggregatedData.filter(row => {
      const coin = getBaseCoin(row.symbol);
      const individualId = `${row.exchange}|${row.symbol}|${row.instrumentType}`;
      
      const isFav = comparisonFavorites.includes(individualId);
      if (showFavoritesOnly && !isFav) return false;
      
      const hasOpenPos = openPositionKeys.has(`${row.exchange}|${coin}|${row.instrumentType}`);
      if (showOpenPositionsOnly && !hasOpenPos) return false;
      
      return true;
    });
  }, [aggregatedData, showFavoritesOnly, showOpenPositionsOnly, openPositionKeys, comparisonFavorites]);

  // Extract unique combinations for the selector
  const availableSymbols: SymbolOption[] = useMemo(() => {
    return filteredAggregatedData.map(row => ({
      id: `${row.exchange}|${row.symbol}|${row.instrumentType}`,
      coin: getBaseCoin(row.symbol),
      exchange: row.exchange,
      symbol: row.symbol,
      type: row.instrumentType
    })).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [filteredAggregatedData]);

  const comparisonData = useMemo(() => {
    // If no filters are active and nothing is selected, we should show empty state
    const isNothingSelected = selectedSymbols.length === 0 && !showFavoritesOnly && !showOpenPositionsOnly;
    if (isNothingSelected) return [];

    let targetData = filteredAggregatedData;
    
    // If user explicitly selected symbols, filter by those
    if (selectedSymbols.length > 0) {
      targetData = targetData.filter(row => 
        selectedSymbols.includes(`${row.exchange}|${row.symbol}|${row.instrumentType}`)
      );
    }

    let rows: ChartDataPoint[] = targetData.map(row => {
      let value = 0;
      switch (period) {
        case 'last': value = row.lastFundingRate || 0; break;
        case 'day': value = row.todaySum || 0; break;
        case 'current_month': value = row.currentMonthSum || 0; break;
        case 'last_month': value = row.lastMonthSum || 0; break;
        case '3_months': value = row.last3MonthsSum || 0; break;
      }
      
      const coin = getBaseCoin(row.symbol);
      const label = `${row.symbol} (${row.exchange})`;

      return {
        id: `${row.exchange}|${row.symbol}|${row.instrumentType}`,
        symbol: row.symbol,
        exchange: row.exchange,
        coin,
        label,
        value,
        type: row.instrumentType,
        color: '' // Will populate below
      };
    });

    // Sort from highest to lowest
    rows.sort((a, b) => b.value - a.value);

    // Calculate colors based on intensity
    const posValues = rows.filter(r => r.value > 0).map(r => r.value);
    const negValues = rows.filter(r => r.value < 0).map(r => Math.abs(r.value));
    
    const maxPos = posValues.length ? Math.max(...posValues) : 1;
    const maxNeg = negValues.length ? Math.max(...negValues) : 1;
    
    rows.forEach(row => {
      if (row.value > 0) {
        const intensity = 0.4 + 0.6 * (row.value / maxPos); 
        row.color = `rgba(74, 222, 128, ${intensity})`; // #4ade80 with variable opacity
      } else if (row.value < 0) {
        const intensity = 0.4 + 0.6 * (Math.abs(row.value) / maxNeg);
        row.color = `rgba(248, 113, 113, ${intensity})`; // #f87171 with variable opacity
      } else {
        row.color = '#8E9299';
      }
    });

    return rows;
  }, [filteredAggregatedData, selectedSymbols, period]);

  const periodLabels: Record<PeriodOption, string> = {
    'last': 'Last Funding Rate',
    'day': 'Today (Cumulative)',
    'current_month': 'Current Month',
    'last_month': 'Last Month',
    '3_months': 'Last 3 Months'
  };

  return (
    <div className="flex flex-col bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden">
      {/* Header Controls */}
      <div className="p-4 border-b border-[#2a2b30] flex flex-col gap-4 bg-[#1A1C20]/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <PeriodSegmentedControl 
            value={period}
            onChange={setPeriod}
          />
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                showFavoritesOnly 
                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" 
                  : "bg-[#0e0f11] text-[#8E9299] border-[#2a2b30] hover:text-white"
              )}
            >
              <Star className={clsx("w-3.5 h-3.5", showFavoritesOnly && "fill-yellow-500")} />
              Favorites
            </button>
            {hasOpenPositions && (
              <button
                onClick={() => setShowOpenPositionsOnly(!showOpenPositionsOnly)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  showOpenPositionsOnly 
                    ? "bg-[#2F6BFF]/10 text-[#2F6BFF] border-[#2F6BFF]/20" 
                    : "bg-[#0e0f11] text-[#8E9299] border-[#2a2b30] hover:text-white"
                )}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Open Positions
              </button>
            )}
            
            {selectedSymbols.length > 0 && (
              <button 
                onClick={() => setSelectedSymbols([])} 
                className="flex items-center gap-1.5 text-sm text-[#8E9299] hover:text-white bg-[#0e0f11] px-3 py-1.5 rounded-lg border border-[#2a2b30] transition-colors ml-2"
              >
                <X className="w-4 h-4" /> Clear Selection
              </button>
            )}
          </div>
        </div>
        
        <div className="w-full">
          <SymbolMultiSelect 
            symbols={availableSymbols}
            selectedSymbols={selectedSymbols}
            onChange={setSelectedSymbols}
            maxSelections={25}
          />
        </div>
      </div>

      {/* Chart Area */}
      <div className="w-full p-6 min-h-[400px]">
        {(selectedSymbols.length === 0 && !showFavoritesOnly && !showOpenPositionsOnly) ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <div className="w-16 h-16 bg-[#2a2b30] rounded-full flex items-center justify-center mb-4">
              <BarChart2 className="w-8 h-8 text-[#8E9299]" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Select symbols</h3>
            <p className="text-[#8E9299] max-w-sm">
              Choose up to 25 symbols from the dropdown above to compare their funding rates over time.
            </p>
          </div>
        ) : comparisonData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <div className="w-16 h-16 bg-[#2a2b30] rounded-full flex items-center justify-center mb-4">
              <BarChart2 className="w-8 h-8 text-[#8E9299]" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No matching symbols</h3>
            <p className="text-[#8E9299] max-w-sm">
              Adjust your filters or manual selection to see data.
            </p>
          </div>
        ) : isLoading && aggregatedData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-full h-full bg-[#1A1C20]/50 animate-pulse rounded-lg" />
          </div>
        ) : (
          <FundingComparisonChart 
            data={comparisonData} 
            periodLabel={periodLabels[period]}
          />
        )}
      </div>
    </div>
  );
};

