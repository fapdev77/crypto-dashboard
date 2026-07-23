import React, { useState, useMemo } from 'react';
import { useFundingData } from '../../../hooks/useFundingData';
import { SymbolMultiSelect, SymbolOption } from './SymbolMultiSelect';
import { PeriodSegmentedControl, PeriodOption } from './PeriodSegmentedControl';
import { FundingComparisonChart, ChartDataPoint } from './FundingComparisonChart';
import { BarChart2, X } from 'lucide-react';
import clsx from 'clsx';

const getBaseCoin = (symbol: string) => {
  let base = symbol.split('-')[0];
  base = base.split('_')[0];
  base = base.replace(/USDT$|USD$|PERP$|FUTURES$/i, '');
  return base.toUpperCase();
};

export const FundingRateComparison = () => {
  const { aggregatedData, isLoading } = useFundingData();
  
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [period, setPeriod] = useState<PeriodOption>('last');

  // Extract unique combinations for the selector
  const availableSymbols: SymbolOption[] = useMemo(() => {
    return aggregatedData.map(row => ({
      id: `${row.exchange}|${row.symbol}|${row.instrumentType}`,
      coin: getBaseCoin(row.symbol),
      exchange: row.exchange,
      symbol: row.symbol,
      type: row.instrumentType
    })).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [aggregatedData]);

  const comparisonData = useMemo(() => {
    if (selectedSymbols.length === 0) return [];

    // Filter to selected symbols
    const filtered = aggregatedData.filter(row => 
      selectedSymbols.includes(`${row.exchange}|${row.symbol}|${row.instrumentType}`)
    );

    const rows: ChartDataPoint[] = filtered.map(row => {
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
  }, [aggregatedData, selectedSymbols, period]);

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <PeriodSegmentedControl 
            value={period}
            onChange={setPeriod}
          />
          {selectedSymbols.length > 0 && (
            <button 
              onClick={() => setSelectedSymbols([])} 
              className="flex items-center gap-1.5 text-sm text-[#8E9299] hover:text-white bg-[#0e0f11] px-3 py-1.5 rounded-lg border border-[#2a2b30] transition-colors"
            >
              <X className="w-4 h-4" /> Clear All
            </button>
          )}
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
        {selectedSymbols.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <div className="w-16 h-16 bg-[#2a2b30] rounded-full flex items-center justify-center mb-4">
              <BarChart2 className="w-8 h-8 text-[#8E9299]" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Select symbols</h3>
            <p className="text-[#8E9299] max-w-sm">
              Choose up to 25 symbols from the dropdown above to compare their funding rates over time.
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

