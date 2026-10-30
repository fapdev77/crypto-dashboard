import React, { useState, useMemo } from 'react';
import Big from 'big.js';
import { Layers, Download, ChevronDown, FileText, TrendingUp, CreditCard, Wallet, Loader2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useConsolidatedTransactions, ConsolidatedTxFilters, defaultConsolidatedFilters } from '../../../hooks/useConsolidatedTransactions';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import { usePrivacy } from '../../../context/PrivacyContext';
import { StatusAndSyncBadge } from '../../ui/StatusAndSyncBadge';
import { AppTooltip } from '../../ui/Tooltip';
import { ConsolidatedTransactionFilters } from './ConsolidatedTransactionFilters';
import { ConsolidatedNetChangeReport } from './ConsolidatedNetChangeReport';
import { ConsolidatedTransactionDetailsModal, DetailsModalType } from './ConsolidatedTransactionDetailsModal';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../../../utils/exportUtils';
import { LogManager } from '../../../services/LogManager';
import { TabLoadingSkeleton } from '../../ui/TabLoadingSkeleton';
import { UNIVERSAL_BADGE_STYLE, UNIVERSAL_HEX_COLOR_MAP, UniversalTxType } from '../../../utils/transactionTypeMapper';
import { getBybitUniversalType, getBitgetUniversalType, getOkxUniversalType } from '../../../utils/transactionTypeMapper';

export function ConsolidatedTransactions() {
  const [filters, setFilters] = useState<ConsolidatedTxFilters>(defaultConsolidatedFilters);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [detailsModalType, setDetailsModalType] = useState<DetailsModalType>(null);

  const {
    bybitEntries,
    bitgetEntries,
    okxEntries,
    filteredByExchange,
    isLoading,
    isSyncing,
    isCalculatingUsd,
    error,
    stats,
    tokenRates,
    activeExchanges,
  } = useConsolidatedTransactions(filters);

  const formatCurrency = useFormatCurrency();
  const { isPrivateMode } = usePrivacy();

  // Collect all unique currencies across all loaded transactions
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>();
    [...bybitEntries, ...bitgetEntries, ...okxEntries].forEach(e => {
      if (e.currency) set.add(e.currency);
    });
    return Array.from(set).sort();
  }, [bybitEntries, bitgetEntries, okxEntries]);

  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return formatCurrency(Number(val), 'usd');
  };

  // Export summary report handler
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    setExportMenuOpen(false);

    const headers = [
      'Exchange',
      'Asset',
      'Active Days',
      'Initial Balance',
      'Total Inflow',
      'Total Outflow',
      'Final Balance',
      'Gain (%)',
      'Absolute Gain (Asset)',
      'Absolute Gain (USD)',
      'Total Trades',
      'Buys Count',
      'Sells Count',
      'Avg Trades/Day',
      'Net Trading Flow',
      'Total Funding Fee',
      'Trading Fees Paid',
      'Daily Avg ROI (%)',
    ];

    const rows: Array<Array<string | number>> = [];

    const isStable = (currency: string) => ['USDT', 'USDC', 'DAI', 'USD', 'BUSD'].includes(currency.toUpperCase());

    const appendExchangeRows = (
      exchangeName: string,
      entries: any[],
      statsBlock: typeof stats.byExchange.bybit,
      getUniversalTypeFn: (e: any) => string,
      getSideFn: (e: any) => string
    ) => {
      const grouped: Record<string, any[]> = {};
      entries.forEach(e => {
        if (e.currency) {
          if (!grouped[e.currency]) grouped[e.currency] = [];
          grouped[e.currency].push(e);
        }
      });

      Object.entries(grouped).forEach(([cur, curEntries]) => {
        const sorted = [...curEntries].sort((a, b) => a.transactionTime - b.transactionTime);
        const earliestTime = sorted[0]?.transactionTime || Date.now();
        const latestTime = sorted[sorted.length - 1]?.transactionTime || Date.now();
        const days = Math.max(1, Math.ceil((latestTime - earliestTime) / (1000 * 60 * 60 * 24)));

        const stableMatch = isStable(cur);
        const curStats = stableMatch ? statsBlock.stable : (statsBlock.perCurrency[cur] || {
          totalFunding: '0',
          totalFees: '0',
          totalCashFlow: '0',
          totalChange: '0',
          finalBalance: '0',
          totalInflow: '0',
          totalOutflow: '0',
          initialBalance: '0',
          percentageChange: 0,
        });

        const rate = stableMatch ? 1 : (tokenRates[cur.toUpperCase()] || 0);
        const ganhoAbsolutoUSD = new Big(curStats.totalChange).times(rate).toFixed(2);

        const tradeEntries = curEntries.filter(e => getUniversalTypeFn(e) === 'TRADE');
        const totalTrades = tradeEntries.length;
        const buysCount = tradeEntries.filter(e => {
          const side = getSideFn(e).toLowerCase();
          return side.includes('buy') || side.includes('long');
        }).length;
        const sellsCount = tradeEntries.filter(e => {
          const side = getSideFn(e).toLowerCase();
          return side.includes('sell') || side.includes('short');
        }).length;

        const tradesLiquido = tradeEntries
          .reduce((sum, e) => sum.plus(new Big(e.change || e.cashFlow || '0')), new Big(0))
          .toFixed(6);

        const roiMedioDiario = days > 0 ? (curStats.percentageChange / days).toFixed(3) : '0';

        rows.push([
          exchangeName,
          cur,
          days,
          curStats.initialBalance,
          curStats.totalInflow,
          curStats.totalOutflow,
          curStats.finalBalance,
          curStats.percentageChange.toFixed(2),
          curStats.totalChange,
          ganhoAbsolutoUSD,
          totalTrades,
          buysCount,
          sellsCount,
          (totalTrades / days).toFixed(1),
          tradesLiquido,
          curStats.totalFunding,
          curStats.totalFees,
          roiMedioDiario,
        ]);
      });
    };

    appendExchangeRows(
      'Bybit',
      filteredByExchange.bybit,
      stats.byExchange.bybit,
      (e) => getBybitUniversalType(e.type, e.funding),
      (e) => e.side || ''
    );
    appendExchangeRows(
      'Bitget',
      filteredByExchange.bitget,
      stats.byExchange.bitget,
      (e) => getBitgetUniversalType(e.type, e.funding),
      (e) => e.side || ''
    );
    appendExchangeRows(
      'OKX',
      filteredByExchange.okx,
      stats.byExchange.okx,
      (e) => getOkxUniversalType(e),
      (e) => `${e.side || ''} ${e.transSubType || e.subType || ''}`
    );

    const config: ExportConfig = {
      title: 'Consolidated Net Change Summary Report',
      filename: `Consolidated_Net_Change_${Date.now()}`,
      headers,
      rows,
    };

    if (format === 'csv') exportToCSV(config);
    if (format === 'excel') exportToExcel(config);
    if (format === 'pdf') exportToPDF(config);

    LogManager.info('ConsolidatedTransactions', `Exported ${rows.length} asset rows as ${format}`);
  };

  const totalFilteredCount = stats.totalCount;

  if (isLoading && totalFilteredCount === 0) {
    return <TabLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
            <Layers className="w-5 h-5 text-[#2F6BFF]" />
            Consolidated Net Change
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusAndSyncBadge
              isSyncing={isSyncing}
              syncMessage={isSyncing ? 'Syncing exchange transactions...' : null}
              syncError={error}
            />
            <span className="text-[11px] text-[#8E9299]">
              Aggregating {activeExchanges.length} {activeExchanges.length === 1 ? 'exchange' : 'exchanges'}
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

      {/* Filter Bar */}
      <ConsolidatedTransactionFilters
        filters={filters}
        setFilters={setFilters}
        availableCurrencies={availableCurrencies}
      />

      {/* 4 Macro KPI Cards */}
      {totalFilteredCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Transactions & Pie Chart */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2F6BFF] shrink-0" />
                <AppTooltip description="Total number of transactions across all selected exchanges. Click for breakdown.">
                  <span
                    onClick={() => setDetailsModalType('tx')}
                    className="text-[11px] text-[#8E9299] uppercase tracking-wider cursor-pointer border-b border-dashed border-[#8E9299]/50 hover:text-white transition-colors"
                  >
                    Total Transactions
                  </span>
                </AppTooltip>
              </div>
              <span className="text-2xl font-bold text-white mt-1 font-mono">{stats.totalCount.toLocaleString()}</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(stats.typeBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([type, count]) => {
                    const badge = UNIVERSAL_BADGE_STYLE[type as UniversalTxType] || UNIVERSAL_BADGE_STYLE.OTHERS;
                    return (
                      <span
                        key={type}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${badge.textColor} ${badge.bgColor} ${badge.borderColor}`}
                      >
                        {badge.label}: {count}
                      </span>
                    );
                  })}
              </div>
            </div>

            <div className="w-20 h-20 shrink-0">
              {Object.keys(stats.typeBreakdown).length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161b22',
                        border: '1px solid #2a2b30',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value, name) => {
                        const badge = UNIVERSAL_BADGE_STYLE[name as UniversalTxType] || UNIVERSAL_BADGE_STYLE.OTHERS;
                        return [value, badge.label];
                      }}
                    />
                    <Pie
                      data={Object.entries(stats.typeBreakdown).map(([type, count]) => ({
                        name: type,
                        value: count,
                        color: UNIVERSAL_HEX_COLOR_MAP[type as UniversalTxType] || '#8E9299',
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="100%"
                      dataKey="value"
                      stroke="none"
                    >
                      {Object.entries(stats.typeBreakdown).map(([type], i) => (
                        <Cell key={i} fill={UNIVERSAL_HEX_COLOR_MAP[type as UniversalTxType] || '#8E9299'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Card 2: Total Funding (USD) */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#00C853] shrink-0" />
              <AppTooltip description="Sum of contract funding fees across all selected exchanges in USD. Click for details.">
                <span
                  onClick={() => setDetailsModalType('funding')}
                  className="text-[11px] text-[#8E9299] uppercase tracking-wider cursor-pointer border-b border-dashed border-[#8E9299]/50 hover:text-white transition-colors"
                >
                  Total Funding (USD)
                </span>
              </AppTooltip>
            </div>
            <span
              className={`text-xl font-bold font-mono ${
                new Big(stats.aggregatedUsd.totalFunding).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'
              }`}
            >
              {maskVal(stats.aggregatedUsd.totalFunding)} USD
            </span>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-[#8E9299]">
                Funding {new Big(stats.aggregatedUsd.totalFunding).gte(0) ? 'received' : 'paid'}
              </span>
              {isCalculatingUsd && (
                <AppTooltip description="Fetching real-time USD prices for non-stable assets...">
                  <span className="flex items-center gap-1 text-[10px] text-[#FF9C2E] ml-auto">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Calculating USD...
                  </span>
                </AppTooltip>
              )}
            </div>
          </div>

          {/* Card 3: Total Fees (USD) */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-[#FF4444] shrink-0" />
              <AppTooltip description="Sum of trading fees across all selected exchanges in USD. Click for details.">
                <span
                  onClick={() => setDetailsModalType('fees')}
                  className="text-[11px] text-[#8E9299] uppercase tracking-wider cursor-pointer border-b border-dashed border-[#8E9299]/50 hover:text-white transition-colors"
                >
                  Total Fees (USD)
                </span>
              </AppTooltip>
            </div>
            <span
              className={`text-xl font-bold font-mono ${
                new Big(stats.aggregatedUsd.totalFees).gte(0) ? 'text-[#FF4444]' : 'text-[#00C853]'
              }`}
            >
              {(() => {
                const feeBig = new Big(stats.aggregatedUsd.totalFees);
                if (feeBig.abs().toString() === '0') return `${maskVal(feeBig.toFixed(2))} USD`;
                if (feeBig.gte(0)) return `-${maskVal(feeBig.toString())} USD`;
                return `+${maskVal(feeBig.abs().toString())} USD`;
              })()}
            </span>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-[#8E9299]">Trading fees paid</span>
              {isCalculatingUsd && (
                <AppTooltip description="Fetching real-time USD prices for non-stable assets...">
                  <span className="flex items-center gap-1 text-[10px] text-[#FF9C2E] ml-auto">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Calculating USD...
                  </span>
                </AppTooltip>
              )}
            </div>
          </div>

          {/* Card 4: Net Change & Final Balance (USD) */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#8E9299] shrink-0" />
              <AppTooltip description="Combined Net Change in USD across all selected exchanges. Click for details.">
                <span
                  onClick={() => setDetailsModalType('netchange')}
                  className="text-[11px] text-[#8E9299] uppercase tracking-wider cursor-pointer border-b border-dashed border-[#8E9299]/50 hover:text-white transition-colors"
                >
                  Net Change (USD)
                </span>
              </AppTooltip>
            </div>
            <span
              className={`text-lg font-bold font-mono ${
                new Big(stats.aggregatedUsd.totalChange).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'
              }`}
            >
              {maskVal(stats.aggregatedUsd.totalChange)} USD
            </span>

            <div className="border-t border-[#2a2b30] pt-2 flex flex-col">
              <div className="flex items-center gap-2">
                <AppTooltip description="Aggregated final wallet balance across all exchanges. Click for details.">
                  <span
                    onClick={() => setDetailsModalType('balance')}
                    className="text-[9px] text-[#8E9299] uppercase tracking-wider cursor-pointer border-b border-dashed border-[#8E9299]/50 hover:text-white transition-colors"
                  >
                    Wallet Balance (USD)
                  </span>
                </AppTooltip>
              </div>
              <span className="text-[13px] font-bold text-white mt-0.5 font-mono">
                {maskVal(stats.aggregatedUsd.finalBalance)} USD
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 text-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Main Consolidated Net Change Report */}
      <ConsolidatedNetChangeReport
        filteredByExchange={filteredByExchange}
        exchangeStats={stats.byExchange}
        tokenRates={tokenRates}
        isPrivateMode={isPrivateMode}
      />

      {/* Drilldown Details Modal */}
      <ConsolidatedTransactionDetailsModal
        detailsModalType={detailsModalType}
        setDetailsModalType={setDetailsModalType}
        stats={stats}
        tokenRates={tokenRates}
        maskVal={maskVal}
        isPrivateMode={isPrivateMode}
      />
    </div>
  );
}
