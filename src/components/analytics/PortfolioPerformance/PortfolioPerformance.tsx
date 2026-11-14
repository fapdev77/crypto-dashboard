import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  Download,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import {
  usePortfolioPerformance,
  PortfolioPerformanceFilters as FilterType,
  defaultPerformanceFilters,
} from '../../../hooks/usePortfolioPerformance';
import {
  getDenominationDecimals,
  getDefaultMilestoneStepForAsset,
} from '../../../utils/portfolioPerformanceEngine';
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
import { MissingRatesNotice } from '../../transactions/MissingRatesNotice';

export function PortfolioPerformance() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterType>(defaultPerformanceFilters);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const hasUserSelectedDenomRef = useRef(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const { isPrivateMode } = usePrivacy();

  const {
    filteredEntries,
    performanceData,
    isLoading,
    isSyncing,
    isCalculatingUsd,
    error,
    availableCurrencies,
    missingRates,
  } = usePortfolioPerformance(filters);

  // Auto-default denomination to USD if BTC does not exist in scoped currencies,
  // or fall back cleanly if an exchange/account change removes the currently selected coin.
  useEffect(() => {
    if (availableCurrencies.length === 0) return;

    setFilters((prev) => {
      const hasBtc = availableCurrencies.includes('BTC');
      if (!hasUserSelectedDenomRef.current) {
        const targetDenom = hasBtc ? 'BTC' : 'USD';
        if (prev.denomination !== targetDenom) {
          return {
            ...prev,
            denomination: targetDenom,
            milestoneStep: targetDenom === 'BTC' ? 2500 : getDefaultMilestoneStepForAsset(targetDenom),
          };
        }
        return prev;
      }

      if (prev.denomination !== 'USD' && !availableCurrencies.includes(prev.denomination)) {
        const fallbackDenom = hasBtc ? 'BTC' : 'USD';
        return {
          ...prev,
          denomination: fallbackDenom,
          milestoneStep: fallbackDenom === 'BTC' ? 2500 : getDefaultMilestoneStepForAsset(fallbackDenom),
        };
      }
      return prev;
    });
  }, [availableCurrencies]);

  // Close export dropdown on outside click or Escape
  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportMenuOpen]);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    setExportMenuOpen(false);

    const { primaryResult, operations, advancedMetrics, dayOfWeek, timeOfDay, priceMilestones, resolvedMilestoneAsset } = performanceData;
    const decimals = getDenominationDecimals(filters.denomination);

    // Build structured report rows
    const headers = ['Category', 'Metric', 'Value', 'Unit / Note'];
    const rows: Array<Array<string | number>> = [
      // Primary Result
      ['Primary Result', 'Period Range (UTC)', `${primaryResult.earliestDate} to ${primaryResult.latestDate}`, `${primaryResult.durationDays} days`],
      ['Primary Result', 'Percentage Gain (ROI)', `${primaryResult.percentageGain.toFixed(2)}%`, 'Operational return'],
      ['Primary Result', 'Absolute Gain', primaryResult.absoluteGain, filters.denomination],
      ['Primary Result', 'Initial Balance', primaryResult.initialBalance, filters.denomination],
      ['Primary Result', 'Final Balance', primaryResult.finalBalance, filters.denomination],
      ['Primary Result', 'Daily Avg ROI', `${primaryResult.dailyAverageRoi.toFixed(3)}%`, 'Per active UTC day'],
      ['Primary Result', 'Deposits in Period', primaryResult.depositsInPeriod, filters.denomination],
      ['Primary Result', 'Withdrawals in Period', primaryResult.withdrawalsInPeriod ?? '0', filters.denomination],

      // Operations & Cash Flow
      ['Operations', 'Gross Cash Flow', operations.grossCashFlow, filters.denomination],
      ['Operations', 'Trading Fees Paid', operations.feesPaid, filters.denomination],
      ['Operations', 'Net Trading PnL', operations.netTradingPnl, filters.denomination],
      ['Operations', 'Funding Received', operations.fundingReceived, filters.denomination],
      ['Operations', 'Funding Paid', operations.fundingPaid, filters.denomination],
      ['Operations', 'Net Funding', operations.netFunding, filters.denomination],
      ['Operations', 'Funding Received/Paid Ratio', operations.fundingRatio, 'Efficiency multiplier'],
      ['Operations', 'Other Operational Net', operations.otherOperational?.net ?? '0', `${operations.otherOperational?.count ?? 0} events (Liq/Deliv/Int/Rew/Fees)`],
      ['Operations', 'Total Trades', operations.totalTrades, 'Executions'],
      ['Operations', 'Buys / Sells', `${operations.buysCount} (${operations.buysPct.toFixed(1)}%) / ${operations.sellsCount} (${operations.sellsPct.toFixed(1)}%)`, 'Order split'],
      ['Operations', 'Avg Trades / Day', operations.tradesPerDay.toFixed(2), 'Frequency'],
      ['Operations', 'Fee Cost Ratio', `${operations.feeCostPct.toFixed(2)}%`, `Status: ${operations.feeStatus}`],

      // Advanced Performance
      ['Advanced Metrics', 'Win Rate (Daily UTC)', `${advancedMetrics.winRate.toFixed(1)}%`, `${advancedMetrics.positiveDaysCount}/${advancedMetrics.totalDaysEvaluated} positive days`],
      ['Advanced Metrics', 'Profit Factor', advancedMetrics.profitFactor.toFixed(2), `Rating: ${advancedMetrics.profitFactorRating}`],
      ['Advanced Metrics', 'Total Gains', advancedMetrics.totalGains, filters.denomination],
      ['Advanced Metrics', 'Total Losses', advancedMetrics.totalLosses, filters.denomination],
      ['Advanced Metrics', 'Consistency Index (CV)', `${advancedMetrics.consistencyIndexCv.toFixed(1)}%`, `Rating: ${advancedMetrics.consistencyRating}`],

      // Day of Week (UTC)
      ['Temporal (Day of Week UTC)', 'Best Day', dayOfWeek.bestDay.name, `${dayOfWeek.bestDay.gain.toFixed(decimals)} ${filters.denomination}`],
      ['Temporal (Day of Week UTC)', 'Lowest Day', dayOfWeek.worstDay.name, `${dayOfWeek.worstDay.gain.toFixed(decimals)} ${filters.denomination}`],

      // Time of Day (UTC)
      ['Temporal (Time of Day UTC)', 'Best Time Window', timeOfDay.bestTime.period, `${timeOfDay.bestTime.gain.toFixed(decimals)} ${filters.denomination}`],
      ['Temporal (Time of Day UTC)', 'Lowest Time Window', timeOfDay.worstTime.period, `${timeOfDay.worstTime.gain.toFixed(decimals)} ${filters.denomination}`],
    ];

    // Append Price Milestones
    priceMilestones.forEach((m) => {
      rows.push([
        `Price Milestones (${resolvedMilestoneAsset})`,
        `Milestone ${m.formattedMilestone}`,
        `${m.gainLoss >= 0 ? '+' : ''}${m.gainLoss.toFixed(decimals)} ${filters.denomination}`,
        `${m.passages} passages | Return: ${m.gainLossPct.toFixed(2)}%`,
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
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-fg">
            <TrendingUp className="w-5 h-5 text-accent" />
            {t('analytics.portfolio.title', 'Portfolio Performance')}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusAndSyncBadge
              isSyncing={isSyncing}
              syncMessage={isSyncing ? t('analytics.common.syncingTransactions', 'Syncing transactions...') : null}
              syncError={error}
            />
            {isCalculatingUsd && (
              <span className="flex items-center gap-1 text-[11px] text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('analytics.common.calculatingUsd', 'Calculating USD asset valuations...')}
              </span>
            )}
            <span className="text-[11px] text-fg-muted">
              {t('analytics.portfolio.subtitle', 'Institutional evolution, cash flow, funding & volatility analytics')}
            </span>
          </div>
        </div>

        {/* Export Button */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            aria-expanded={exportMenuOpen}
            aria-haspopup="menu"
            className="px-3.5 py-2 bg-elevated border border-line text-fg flex items-center gap-2 rounded-lg hover:bg-line/50 transition-colors text-sm focus:outline-none cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('analytics.common.exportReport', 'Export Report')}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {exportMenuOpen && (
            <div
              role="menu"
              className="absolute top-11 right-0 w-36 bg-elevated border border-line rounded-lg shadow-xl z-50 overflow-hidden text-sm text-fg"
            >
              <button
                role="menuitem"
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2.5 hover:bg-line/50 transition-colors cursor-pointer"
              >
                {t('analytics.common.exportCsv', 'Export CSV')}
              </button>
              <button
                role="menuitem"
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-2.5 hover:bg-line/50 transition-colors cursor-pointer"
              >
                {t('analytics.common.exportExcel', 'Export Excel')}
              </button>
              <button
                role="menuitem"
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-2.5 hover:bg-line/50 transition-colors cursor-pointer"
              >
                {t('analytics.common.exportPdf', 'Export PDF')}
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
        onUserDenominationChange={() => {
          hasUserSelectedDenomRef.current = true;
        }}
      />

      {missingRates.length > 0 && <MissingRatesNotice currencies={missingRates} />}

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
        onStepChange={(step) => setFilters((prev) => ({ ...prev, milestoneStep: step }))}
        resolvedMilestoneAsset={performanceData.resolvedMilestoneAsset}
        availableMilestoneAssets={performanceData.availableMilestoneAssets}
        onAssetChange={(asset) =>
          setFilters((prev) => ({
            ...prev,
            milestoneAsset: asset,
            milestoneStep: getDefaultMilestoneStepForAsset(asset),
          }))
        }
        isPrivateMode={isPrivateMode}
      />
    </div>
  );
}
