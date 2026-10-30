import React, { useState } from 'react';
import {
  TrendingUp,
  Download,
  ChevronDown,
  BarChart3,
  Loader2,
} from 'lucide-react';
import {
  usePortfolioPerformance,
  PortfolioPerformanceFilters as FilterType,
  defaultPerformanceFilters,
} from '../../../hooks/usePortfolioPerformance';
import { usePrivacy } from '../../../context/PrivacyContext';
import { StatusAndSyncBadge } from '../../ui/StatusAndSyncBadge';
import { TabLoadingSkeleton } from '../../ui/TabLoadingSkeleton';
import { PortfolioPerformanceFilters } from './PortfolioPerformanceFilters';
import { PrimaryResultSection } from './PrimaryResultSection';
import { BalanceEvolutionSection } from './BalanceEvolutionSection';
import { OperationsAndFeesSection } from './OperationsAndFeesSection';
import { AdvancedPerformanceSection } from './AdvancedPerformanceSection';
import { TemporalPerformanceSection } from './TemporalPerformanceSection';
import { PriceMilestoneSection } from './PriceMilestoneSection';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../../../utils/exportUtils';
import { LogManager } from '../../../services/LogManager';

export function PortfolioPerformance() {
  const [filters, setFilters] = useState<FilterType>(defaultPerformanceFilters);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const { isPrivateMode } = usePrivacy();

  const {
    filteredEntries,
    performanceData,
    isLoading,
    isSyncing,
    isCalculatingUsd,
    error,
    availableCurrencies,
  } = usePortfolioPerformance(filters);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    setExportMenuOpen(false);

    const { primaryResult, operations, advancedMetrics, dayOfWeek, timeOfDay, priceMilestones } = performanceData;

    // Build structured report rows
    const headers = ['Category', 'Metric', 'Value', 'Unit / Note'];
    const rows: Array<Array<string | number>> = [
      // Primary Result
      ['Primary Result', 'Period Range', `${primaryResult.earliestDate} to ${primaryResult.latestDate}`, `${primaryResult.durationDays} days`],
      ['Primary Result', 'Percentage Gain (ROI)', `${primaryResult.percentageGain.toFixed(2)}%`, 'Operational return'],
      ['Primary Result', 'Absolute Gain', primaryResult.absoluteGain, filters.denomination],
      ['Primary Result', 'Initial Balance', primaryResult.initialBalance, filters.denomination],
      ['Primary Result', 'Final Balance', primaryResult.finalBalance, filters.denomination],
      ['Primary Result', 'Daily Avg ROI', `${primaryResult.dailyAverageRoi.toFixed(3)}%`, 'Per active day'],
      ['Primary Result', 'Deposits in Period', primaryResult.depositsInPeriod, filters.denomination],

      // Operations & Cash Flow
      ['Operations', 'Gross Cash Flow', operations.grossCashFlow, filters.denomination],
      ['Operations', 'Trading Fees Paid', operations.feesPaid, filters.denomination],
      ['Operations', 'Net Trading PnL', operations.netTradingPnl, filters.denomination],
      ['Operations', 'Funding Received', operations.fundingReceived, filters.denomination],
      ['Operations', 'Funding Paid', operations.fundingPaid, filters.denomination],
      ['Operations', 'Net Funding', operations.netFunding, filters.denomination],
      ['Operations', 'Funding Received/Paid Ratio', operations.fundingRatio, 'Efficiency multiplier'],
      ['Operations', 'Total Trades', operations.totalTrades, 'Executions'],
      ['Operations', 'Buys / Sells', `${operations.buysCount} (${operations.buysPct}%) / ${operations.sellsCount} (${operations.sellsPct}%)`, 'Order split'],
      ['Operations', 'Avg Trades / Day', operations.tradesPerDay.toFixed(1), 'Frequency'],
      ['Operations', 'Fee Cost Ratio', `${operations.feeCostPct.toFixed(2)}%`, `Status: ${operations.feeStatus}`],

      // Advanced Performance
      ['Advanced Metrics', 'Win Rate (Daily)', `${advancedMetrics.winRate.toFixed(1)}%`, `${advancedMetrics.positiveDaysCount}/${advancedMetrics.totalDaysEvaluated} positive days`],
      ['Advanced Metrics', 'Profit Factor', advancedMetrics.profitFactor.toFixed(2), `Rating: ${advancedMetrics.profitFactorRating}`],
      ['Advanced Metrics', 'Total Gains', advancedMetrics.totalGains, filters.denomination],
      ['Advanced Metrics', 'Total Losses', advancedMetrics.totalLosses, filters.denomination],
      ['Advanced Metrics', 'Consistency Index (CV)', `${advancedMetrics.consistencyIndexCv.toFixed(1)}%`, `Rating: ${advancedMetrics.consistencyRating}`],

      // Day of Week
      ['Temporal (Day of Week)', 'Best Day', dayOfWeek.bestDay.name, `${dayOfWeek.bestDay.gain.toFixed(4)} ${filters.denomination}`],
      ['Temporal (Day of Week)', 'Lowest Day', dayOfWeek.worstDay.name, `${dayOfWeek.worstDay.gain.toFixed(4)} ${filters.denomination}`],

      // Time of Day
      ['Temporal (Time of Day)', 'Best Time Window', timeOfDay.bestTime.period, `${timeOfDay.bestTime.gain.toFixed(4)} ${filters.denomination}`],
      ['Temporal (Time of Day)', 'Lowest Time Window', timeOfDay.worstTime.period, `${timeOfDay.worstTime.gain.toFixed(4)} ${filters.denomination}`],
    ];

    // Append Price Milestones
    priceMilestones.forEach(m => {
      rows.push([
        'Price Milestones',
        `Milestone ${m.formattedMilestone}`,
        `${m.gainLoss >= 0 ? '+' : ''}${m.gainLoss.toFixed(4)} ${filters.denomination}`,
        `${m.passages} passages | Return: ${m.gainLossPct.toFixed(2)}%`
      ]);
    });

    const config: ExportConfig = {
      filename: `portfolio-performance-${filters.denomination.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`,
      title: `Portfolio Performance Report (${filters.denomination})`,
      headers,
      rows,
    };

    if (format === 'csv') exportToCSV(config);
    if (format === 'excel') exportToExcel(config);
    if (format === 'pdf') exportToPDF(config);

    LogManager.info('PortfolioPerformance', `Exported performance report as ${format}`);
  };

  if (isLoading && filteredEntries.length === 0) {
    return <TabLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-[#2F6BFF]" />
            Portfolio Performance
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusAndSyncBadge
              isSyncing={isSyncing}
              syncMessage={isSyncing ? 'Syncing transactions...' : null}
              syncError={error}
            />
            {isCalculatingUsd && (
              <span className="flex items-center gap-1 text-[11px] text-[#2F6BFF] bg-[#2F6BFF]/10 px-2 py-0.5 rounded-full border border-[#2F6BFF]/20">
                <Loader2 className="w-3 h-3 animate-spin" />
                Calculating USD asset valuations...
              </span>
            )}
            <span className="text-[11px] text-[#8E9299]">
              Institutional evolution, cash flow, funding & volatility analytics
            </span>
          </div>
        </div>

        {/* Export Button */}
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="px-3.5 py-2 bg-[#1a1b1e] border border-[#2a2b30] text-white flex items-center gap-2 rounded-lg hover:bg-[#2a2b30]/50 transition-colors text-sm focus:outline-none cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Report</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {exportMenuOpen && (
            <div className="absolute top-11 right-0 w-36 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-xl z-50 overflow-hidden text-sm text-white">
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2.5 hover:bg-[#2a2b30]/50 transition-colors cursor-pointer"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-2.5 hover:bg-[#2a2b30]/50 transition-colors cursor-pointer"
              >
                Export Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-2.5 hover:bg-[#2a2b30]/50 transition-colors cursor-pointer"
              >
                Export PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <PortfolioPerformanceFilters
        filters={filters}
        onFilterChange={setFilters}
        availableCurrencies={availableCurrencies}
      />

      {/* 1. Primary Result */}
      <PrimaryResultSection
        metrics={performanceData.primaryResult}
        denomination={filters.denomination}
        isPrivateMode={isPrivateMode}
      />

      {/* 2. Balance Evolution (Curves) */}
      <BalanceEvolutionSection
        evolutionSeries={performanceData.evolutionSeries}
        denomination={filters.denomination}
        isPrivateMode={isPrivateMode}
      />

      {/* 3. Operational Result & Fee Efficiency */}
      <OperationsAndFeesSection
        operations={performanceData.operations}
        denomination={filters.denomination}
        isPrivateMode={isPrivateMode}
      />

      {/* 4. Advanced Performance Metrics (Win Rate, Profit Factor, Consistency CV) */}
      <AdvancedPerformanceSection
        metrics={performanceData.advancedMetrics}
        denomination={filters.denomination}
        isPrivateMode={isPrivateMode}
      />

      {/* 5. Temporal Analysis (Day of Week & Time of Day) */}
      <TemporalPerformanceSection
        dayOfWeek={performanceData.dayOfWeek}
        timeOfDay={performanceData.timeOfDay}
        denomination={filters.denomination}
        isPrivateMode={isPrivateMode}
      />

      {/* 6. Price Milestone / Range Passage Analysis */}
      <PriceMilestoneSection
        milestones={performanceData.priceMilestones}
        denomination={filters.denomination}
        milestoneStep={filters.milestoneStep}
        onStepChange={(step) => setFilters(prev => ({ ...prev, milestoneStep: step }))}
        isPrivateMode={isPrivateMode}
      />
    </div>
  );
}
