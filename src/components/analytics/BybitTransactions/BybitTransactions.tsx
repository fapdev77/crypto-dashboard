import React, { useState, useMemo } from 'react';
import Big from 'big.js';
import { FileText, Download, ChevronDown, Activity, TrendingUp, CreditCard, Wallet, Loader2, X } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useBybitTransactions, TxFilters } from '../../../hooks/useBybitTransactions';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import { usePrivacy } from '../../../context/PrivacyContext';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../../ui/Pagination';
import { StatusAndSyncBadge } from '../../ui/StatusAndSyncBadge';
import { AppTooltip } from '../../ui/Tooltip';
import { BybitTransactionRow } from './BybitTransactionRow';
import { BybitTransactionFilters, TX_TYPES, typeColorMap, typeHexColorMap } from './BybitTransactionFilters';
import { BybitTransactionProgress } from './BybitTransactionProgress';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../../../utils/exportUtils';
import { LogManager } from '../../../services/LogManager';
import { CoinIcon } from '../../ui/CoinIcon';

export type DetailsModalType = 'funding' | 'fees' | 'balance' | 'tx' | 'netchange' | null;

export function BybitTransactions() {
  const [filters, setFilters] = useState<TxFilters>({
    search: '',
    category: 'All',
    type: 'All',
    currency: 'All',
    accountId: 'All',
    timePeriod: 0, // Default: All Time
  });

  // ── Refresh animation indicator key ──
  const filterMonitorKey = `${filters.category}-${filters.type}-${filters.currency}-${filters.accountId}-${filters.timePeriod}`;
  
  const { entries, filteredEntries, isLoading, isSyncing, isCalculatingUsd, progress, error, stats, tokenRates } = useBybitTransactions(filters);
  const formatCurrency = useFormatCurrency();
  const { isPrivateMode } = usePrivacy();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [detailsModalType, setDetailsModalType] = useState<DetailsModalType>(null);
  const [expandedReportCurrencies, setExpandedReportCurrencies] = useState<Record<string, boolean>>({});

  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    entries.forEach(e => {
      if (e.currency) currencies.add(e.currency);
    });
    return Array.from(currencies).sort().map(c => ({ 
      value: c, 
      label: c,
      icon: <CoinIcon symbol={c} size={16} /> 
    }));
  }, [entries]);

  const { page: currentPage, setPage: setCurrentPage, paginated: paginatedEntries, totalItems: entriesTotal } = usePagination(
    filteredEntries, 50, [filters]
  );

  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return formatCurrency(Number(val), 'usd');
  };

  const currencyReports = useMemo(() => {
    if (filteredEntries.length === 0) return [];
    
    const grouped: Record<string, typeof filteredEntries> = {};
    filteredEntries.forEach(e => {
      if (e.currency) {
        if (!grouped[e.currency]) grouped[e.currency] = [];
        grouped[e.currency].push(e);
      }
    });
    
    const isStable = (currency: string) => ['USDT', 'USDC', 'DAI', 'USD'].includes(currency.toUpperCase());
    
    return Object.entries(grouped).map(([cur, curEntries]) => {
      const sorted = [...curEntries].sort((a, b) => a.transactionTime - b.transactionTime);
      const earliestTx = sorted[0];
      const latestTx = sorted[sorted.length - 1];
      
      const earliestTime = earliestTx?.transactionTime || Date.now();
      const latestTime = latestTx?.transactionTime || Date.now();
      const days = Math.max(1, Math.ceil((latestTime - earliestTime) / (1000 * 60 * 60 * 24)));
      
      const stableMatch = isStable(cur);
      const curStats = stableMatch ? stats.stable : (stats.perCurrency[cur] || {
        totalFunding: '0',
        totalFees: '0',
        totalCashFlow: '0',
        totalChange: '0',
        finalBalance: '0',
        totalInflow: '0',
        totalOutflow: '0'
      });
      
      const totalChange = curStats.totalChange;
      const finalBalance = curStats.finalBalance;
      const totalInflow = curStats.totalInflow;
      const totalOutflow = curStats.totalOutflow;

      // Initial Balance = Final Balance - Trading Change - Inflows + Outflows
      const initialBalance = new Big(finalBalance)
        .minus(new Big(totalChange))
        .minus(new Big(totalInflow))
        .plus(new Big(totalOutflow))
        .toString();
      
      const initBig = new Big(initialBalance);
      const changeBig = new Big(totalChange);
      const basisBig = initBig.plus(new Big(totalInflow));
      let ganhoPercentual = 0;
      if (basisBig.gt(0)) {
        ganhoPercentual = changeBig.div(basisBig).times(100).toNumber();
      } else if (basisBig.eq(0) && changeBig.gt(0)) {
        ganhoPercentual = 100;
      }
      
      const rate = stableMatch ? 1 : (tokenRates[cur] || 0);
      const ganhoAbsolutoUSD = changeBig.times(rate).toString();
      
      const totalTrades = curEntries.filter(e => e.type === 'TRADE').length;
      const buysCount = curEntries.filter(e => e.type === 'TRADE' && e.side === 'Buy').length;
      const sellsCount = curEntries.filter(e => e.type === 'TRADE' && e.side === 'Sell').length;
      const buysPct = totalTrades > 0 ? (buysCount / totalTrades) * 100 : 0;
      const sellsPct = totalTrades > 0 ? (sellsCount / totalTrades) * 100 : 0;
      const tradesPerDay = totalTrades / days;
      
      const tradesLiquido = curEntries
        .filter(e => e.type === 'TRADE')
        .reduce((sum, e) => sum.plus(new Big(e.change || '0')), new Big(0))
        .toString();
        
      const fundingRate = curStats.totalFunding;
      const cashFlowTotal = curStats.totalCashFlow;
      const feesPagos = curStats.totalFees;
      
      const roiMedioDiario = days > 0 ? (ganhoPercentual / days) : 0;
      
      return {
        currency: cur,
        initialBalance,
        finalBalance,
        totalInflow,
        totalOutflow,
        ganhoPercentual,
        ganhoAbsoluto: totalChange,
        ganhoAbsolutoUSD,
        earliestTime,
        latestTime,
        days,
        totalTrades,
        buysCount,
        sellsCount,
        buysPct,
        sellsPct,
        tradesPerDay,
        tradesLiquido,
        fundingRate,
        cashFlowTotal,
        feesPagos,
        roiMedioDiario,
        isStable: stableMatch,
      };
    }).sort((a, b) => {
      // Sort stablecoins to the end, higher absolute USD value to the front
      if (a.isStable && !b.isStable) return 1;
      if (!a.isStable && b.isStable) return -1;
      return Math.abs(Number(b.ganhoAbsolutoUSD)) - Math.abs(Number(a.ganhoAbsolutoUSD));
    });
  }, [filteredEntries, stats, tokenRates, isPrivateMode]);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    setExportMenuOpen(false);
    const headers = [
      'Time', 'Currency', 'Symbol', 'Category', 'Type', 'Side',
      'Qty', 'Size', 'Trade Price', 'Funding', 'Fee',
      'Cash Flow', 'Change', 'Wallet Balance',
      'Trade ID', 'Order ID', 'Fee Rate', 'Bonus Change'
    ];
    const rows = filteredEntries.map(e => [
      new Date(e.transactionTime).toISOString(),
      e.currency,
      e.symbol,
      e.category,
      e.type,
      e.side,
      e.qty,
      e.size,
      e.tradePrice,
      e.funding,
      e.fee,
      e.cashFlow,
      e.change,
      e.cashBalance,
      e.tradeId,
      e.orderId,
      e.feeRate,
      e.bonusChange,
    ]);

    const config: ExportConfig = {
      title: 'Bybit Transactions Report',
      filename: `Bybit_Transactions_${Date.now()}`,
      headers,
      rows,
    };

    if (format === 'csv') exportToCSV(config);
    if (format === 'excel') exportToExcel(config);
    if (format === 'pdf') exportToPDF(config);
    LogManager.info('BybitTransactions', `Exported ${rows.length} rows as ${format}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
            <Activity className="w-5 h-5 text-[#2F6BFF]" />
            Bybit Transactions
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusAndSyncBadge isSyncing={isSyncing} syncMessage={isSyncing ? 'Syncing Bybit transactions...' : null} />
            <BybitTransactionProgress isSyncing={isSyncing} progress={progress} />
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="px-3 py-2 bg-[#1a1b1e] border border-[#2a2b30] text-white flex items-center gap-2 rounded-lg hover:bg-[#2a2b30]/50 transition-colors text-sm focus:outline-none"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span> <ChevronDown className="w-3 h-3" />
          </button>
          {exportMenuOpen && (
            <div className="absolute top-11 right-0 w-32 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-xl z-50 overflow-hidden text-sm text-white">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-[#2a2b30]/50 transition-colors">Export CSV</button>
              <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 hover:bg-[#2a2b30]/50 transition-colors">Export Excel</button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-[#2a2b30]/50 transition-colors">Export PDF</button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <BybitTransactionFilters filters={filters} setFilters={setFilters} availableCurrencies={availableCurrencies} />

      {/* Stats Cards */}
      {filteredEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Transactions + PieChart by Type */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2F6BFF] shrink-0" />
                <AppTooltip description="Total number of transactions matching the current filters. Click here for details.">
                  <span onClick={() => setDetailsModalType('tx')} className="text-[11px] text-[#8E9299] uppercase tracking-wider w-max cursor-pointer border-b border-dashed border-[#8E9299]/50 hover:text-white transition-colors">
                    Total Transactions
                  </span>
                </AppTooltip>
              </div>
              <span className="text-2xl font-bold text-white mt-1">{stats.totalCount}</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(stats.typeBreakdown).slice(0, 4).map(([type, count]) => {
                  const typeLabel = TX_TYPES.find(t => t.value === type)?.label || type;
                  const typeClass = typeColorMap[type] || 'text-[#8E9299] bg-[#2a2b30]/50 border-[#2a2b30]';
                  return (
                    <span key={type} className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${typeClass}`}>
                      {typeLabel}: {count}
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
                      contentStyle={{ backgroundColor: '#161b22', border: '1px solid #2a2b30', borderRadius: '8px', fontSize: '11px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value, name) => {
                        const typeLabel = TX_TYPES.find(t => t.value === name)?.label || name;
                        return [value, typeLabel];
                      }}
                    />
                    <Pie
                      data={Object.entries(stats.typeBreakdown).map(([type, count]) => ({
                        name: type,
                        value: count,
                        color: typeHexColorMap[type] || '#8E9299'
                      }))}
                      cx="50%" cy="50%" innerRadius="55%" outerRadius="100%"
                      dataKey="value" stroke="none"
                    >
                      {Object.entries(stats.typeBreakdown).map(([type, _], i) => (
                        <Cell key={i} fill={typeHexColorMap[type] || '#8E9299'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Card 2: Total Funding (aggregated USD) */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#00C853] shrink-0" />
              <AppTooltip description="Sum of funding fees in USD. Click here for details.">
                <span onClick={() => setDetailsModalType('funding')} className="text-[11px] text-[#8E9299] uppercase tracking-wider w-max cursor-pointer border-b border-dashed border-[#8E9299]/50 hover:text-white transition-colors">
                  Total Funding (USD)
                </span>
              </AppTooltip>
            </div>
            <span className={`text-xl font-bold ${new Big(stats.aggregatedUsd.totalFunding).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
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

          {/* Card 3: Total Fees (aggregated USD) */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-[#FF4444] shrink-0" />
              <AppTooltip description="Sum of trading fees in USD. Click here for details.">
                <span onClick={() => setDetailsModalType('fees')} className="text-[11px] text-[#8E9299] uppercase tracking-wider w-max cursor-pointer border-b border-dashed border-[#8E9299]/50 hover:text-white transition-colors">
                  Total Fees (USD)
                </span>
              </AppTooltip>
            </div>
            <span className={`text-xl font-bold ${new Big(stats.aggregatedUsd.totalFees).gte(0) ? 'text-[#FF4444]' : 'text-[#00C853]'}`}>
              {(() => {
                const feeBig = new Big(stats.aggregatedUsd.totalFees);
                if (feeBig.abs().toString() === '0') return '0.00 USD';
                if (feeBig.gte(0)) return `-${maskVal(feeBig.toString())} USD`;
                return `+${maskVal(feeBig.abs().toString())} USD`;
              })()}
            </span>
            
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-[#8E9299]">
                Trading fees paid
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

          {/* Card 4: Net Change + Wallet Balance */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#8E9299] shrink-0" />
              <AppTooltip description="Net change in USD (stablecoins + non-stables value). Click here for details.">
                <span onClick={() => setDetailsModalType('netchange')} className="text-[11px] text-[#8E9299] uppercase tracking-wider w-max cursor-pointer border-b border-dashed border-[#8E9299]/50 hover:text-white transition-colors">
                  Net Change (USD)
                </span>
              </AppTooltip>
            </div>
            <span className={`text-lg font-bold ${new Big(stats.aggregatedUsd.totalChange).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
              {maskVal(stats.aggregatedUsd.totalChange)} USD
            </span>
            <div className="border-t border-[#2a2b30] pt-2 flex flex-col">
              <div className="flex items-center gap-2">
                <AppTooltip description="Aggregated final wallet balance across currencies. Click here for details.">
                  <span onClick={() => setDetailsModalType('balance')} className="text-[9px] text-[#8E9299] uppercase tracking-wider w-max cursor-pointer border-b border-dashed border-[#8E9299]/50 hover:text-white transition-colors">
                    Wallet Balance (USD)
                  </span>
                </AppTooltip>
              </div>
              <span className="text-[13px] font-bold text-white mt-0.5">{maskVal(stats.aggregatedUsd.finalBalance)} USD</span>
              
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 text-red-200 rounded text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && filteredEntries.length === 0 && (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F6BFF]"></div>
        </div>
      )}

      {/* Empty */}
      {!isLoading && filteredEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl">
          <FileText className="w-12 h-12 text-[#8E9299] mb-3" />
          <p className="text-[#8E9299] text-center">
            {entriesTotal > 0 ? 'No transactions match the current filters.' : 'No Bybit transactions found. Add Bybit API keys to start syncing.'}
          </p>
        </div>
      )}

      {/* Table */}
      {filteredEntries.length > 0 && (
        <div className="flex-1 overflow-auto hide-scrollbar">
          {entriesTotal > 5 && (
            <div className="mb-4">
              <Pagination
                id="bybit-tx-pagination-top"
                currentPage={currentPage}
                totalItems={entriesTotal}
                itemsPerPage={50}
                onPageChange={setCurrentPage}
                refreshKey={filterMonitorKey}
                refreshLabel="Filtering"
                refreshDataReady={!isLoading}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 flex-1 pb-4">
            {paginatedEntries.map(entry => (
              <BybitTransactionRow
                key={entry.id}
                entry={entry}
                isExpanded={expandedId === entry.id}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              />
            ))}
          </div>

          {entriesTotal > 0 && (
            <div className="mt-4">
            <Pagination
              id="bybit-tx-pagination-bottom"
              currentPage={currentPage}
              totalItems={entriesTotal}
              itemsPerPage={50}
              onPageChange={setCurrentPage}
              refreshKey={filterMonitorKey}
              refreshLabel="Filtering"
            />
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {detailsModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`bg-[#161b22] border border-[#2a2b30] rounded-xl w-full shadow-2xl flex flex-col max-h-[85vh] transition-all duration-200 ${detailsModalType === 'netchange' ? 'max-w-4xl' : 'max-w-md'}`}>
            <div className="flex items-center justify-between p-4 border-b border-[#2a2b30]">
              <h3 className="text-white font-medium">
                {detailsModalType === 'funding' && 'Funding Breakdown'}
                {detailsModalType === 'fees' && 'Fees Breakdown'}
                {detailsModalType === 'balance' && 'Wallet Balance Breakdown'}
                {detailsModalType === 'netchange' && 'Net Change Report (USD)'}
                {detailsModalType === 'tx' && 'Total Transactions Breakdown'}
              </h3>
              <button 
                onClick={() => setDetailsModalType(null)}
                className="text-[#8E9299] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
                  <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              {detailsModalType === 'netchange' ? (
                <div className="flex flex-col gap-4 text-white">
                  <p className="text-xs text-[#8E9299]">
                    Detailed operational performance by asset, calculating absolute returns, trade distributions, funding impact, and fees.
                  </p>
                  
                  {currencyReports.length === 0 ? (
                    <div className="text-[#8E9299] text-sm text-center py-8">No transaction data available for report.</div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-end gap-2.5 text-xs border-b border-[#2a2b30]/30 pb-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allExpanded: Record<string, boolean> = {};
                            currencyReports.forEach(r => {
                              allExpanded[r.currency] = true;
                            });
                            setExpandedReportCurrencies(allExpanded);
                          }}
                          className="text-[#F0B90B] hover:text-[#f3c73e] transition-colors font-medium px-2.5 py-1 rounded bg-[#2a2b30]/40 hover:bg-[#2a2b30]/70 cursor-pointer"
                        >
                          Expand All
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedReportCurrencies({})}
                          className="text-[#8E9299] hover:text-white transition-colors font-medium px-2.5 py-1 rounded bg-[#2a2b30]/40 hover:bg-[#2a2b30]/70 cursor-pointer"
                        >
                          Collapse All
                        </button>
                      </div>

                      {currencyReports.map((report) => {
                        const isPositive = new Big(report.ganhoAbsoluto).gte(0);
                        const hasTrades = report.totalTrades > 0;
                        const feesBig = new Big(report.feesPagos);
                        const isExpanded = !!expandedReportCurrencies[report.currency];
                        
                        return (
                          <div 
                            key={report.currency} 
                            className="bg-[#1e232b] rounded-lg border border-[#2a2b30] overflow-hidden transition-all duration-200"
                          >
                            {/* Header Panel (Accordion Trigger) */}
                            <div 
                              onClick={() => {
                                setExpandedReportCurrencies(prev => ({
                                  ...prev,
                                  [report.currency]: !prev[report.currency]
                                }));
                              }}
                              className={`p-3.5 bg-[#161b22]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-[#1f2631] transition-colors select-none ${isExpanded ? 'border-b border-[#2a2b30]' : ''}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <CoinIcon symbol={report.currency} size={22} />
                                <div>
                                  <span className="font-bold text-white text-[15px]">{report.currency}</span>
                                  <span className="text-[10px] text-[#8E9299] ml-2 font-mono">
                                    {report.days} {report.days === 1 ? 'day' : 'days'} period
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between sm:justify-end gap-3.5 font-mono w-full sm:w-auto">
                                <div className="text-right">
                                  <div className={`text-sm font-bold ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                    {isPositive ? '+' : ''}{Number(report.ganhoAbsoluto).toFixed(6)} {report.currency}
                                  </div>
                                  <div className="text-xs text-[#8E9299]">
                                    ~ {maskVal(report.ganhoAbsolutoUSD)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isPositive ? 'bg-[#00C853]/10 text-[#00C853] border border-[#00C853]/20' : 'bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/20'}`}>
                                    {isPositive ? '+' : ''}{report.ganhoPercentual.toFixed(2)}%
                                  </span>
                                  <ChevronDown className={`w-4 h-4 text-[#8E9299] shrink-0 transition-transform duration-200 ${isExpanded ? 'transform rotate-180 text-white' : ''}`} />
                                </div>
                              </div>
                            </div>
                            
                            {/* Report Tables Grid (Accordion Content) */}
                            {isExpanded && (
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#181a1e]/40 animate-fadeIn">
                                
                                {/* Left Column: Resultado Principal */}
                                <div className="flex flex-col gap-2">
                                  <h4 className="text-[11px] font-bold text-[#8E9299] uppercase tracking-wider mb-1 border-b border-[#2a2b30]/40 pb-1 flex items-center justify-between">
                                    <span>Resultado Principal</span>
                                    <span className="text-[9px] text-[#8E9299]/70 capitalize font-normal">Asset Summary</span>
                                  </h4>
                                  <div className="flex flex-col gap-1.5 text-xs font-mono">
                                    <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                      <span className="text-[#8E9299]">Saldo Inicial</span>
                                      <span className="text-[#d1d5db] font-medium">{Number(report.initialBalance).toFixed(6)} {report.currency}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                      <span className="text-[#8E9299]">Total Inflow</span>
                                      <span className="text-[#00C853] font-medium">+{Number(report.totalInflow).toFixed(6)} {report.currency}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                      <span className="text-[#8E9299]">Total Outflow</span>
                                      <span className="text-[#FF4444] font-medium">-{Number(report.totalOutflow).toFixed(6)} {report.currency}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                      <span className="text-[#8E9299]">Saldo Final</span>
                                      <span className="text-white font-bold">{Number(report.finalBalance).toFixed(6)} {report.currency}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                      <span className="text-[#8E9299]">Ganho Percentual</span>
                                      <span className={`font-bold ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                        {isPositive ? '+' : ''}{report.ganhoPercentual.toFixed(2)}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                      <span className="text-[#8E9299]">Ganho Absoluto</span>
                                      <span className={`font-bold ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                        {isPositive ? '+' : ''}{Number(report.ganhoAbsoluto).toFixed(6)} {report.currency}
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-1.5">
                                      <span className="text-[#8E9299]">Ganho Absoluto em USD</span>
                                      <span className={`font-bold ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                        {isPositive ? '+' : ''}{maskVal(report.ganhoAbsolutoUSD)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Right Column: Resultado das Operações */}
                                <div className="flex flex-col gap-2">
                                  <h4 className="text-[11px] font-bold text-[#8E9299] uppercase tracking-wider mb-1 border-b border-[#2a2b30]/40 pb-1 flex items-center justify-between">
                                    <span>Resultado das Operações</span>
                                    <span className="text-[9px] text-[#8E9299]/70 capitalize font-normal">Trades & Metrics</span>
                                  </h4>
                                  <div className="flex flex-col gap-1.5 text-xs font-mono">
                                    <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                      <span className="text-[#8E9299]">Período</span>
                                      <span className="text-[#d1d5db] font-medium text-[10px] text-right">
                                        {new Date(report.earliestTime).toLocaleDateString()} a {new Date(report.latestTime).toLocaleDateString()} ({report.days} {report.days === 1 ? 'dia' : 'dias'})
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                      <span className="text-[#8E9299]">Total de Trades</span>
                                      <span className="text-white font-medium">{report.totalTrades}</span>
                                    </div>
                                    
                                    {hasTrades && (
                                      <>
                                        <div className="flex justify-between py-1 border-b border-[#2a2b30]/20 pl-1.5">
                                          <span className="text-[#8E9299]/80">─ Compras (BUY)</span>
                                          <span className="text-[#00C853] font-medium">
                                            {report.buysCount} ({report.buysPct.toFixed(1)}%)
                                          </span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-[#2a2b30]/20 pl-1.5">
                                          <span className="text-[#8E9299]/80">─ Vendas (SELL)</span>
                                          <span className="text-[#FF4444] font-medium">
                                            {report.sellsCount} ({report.sellsPct.toFixed(1)}%)
                                          </span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-[#2a2b30]/20 pl-1.5">
                                          <span className="text-[#8E9299]/80">─ Média por Dia</span>
                                          <span className="text-[#d1d5db] font-medium">{report.tradesPerDay.toFixed(2)} trades/dia</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-[#2a2b30]/30 pl-1.5">
                                          <span className="text-[#8E9299]/80">─ Trades Líquido</span>
                                          <span className={`font-medium ${new Big(report.tradesLiquido).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                            {new Big(report.tradesLiquido).gt(0) ? '+' : ''}{Number(report.tradesLiquido).toFixed(6)} {report.currency}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                    
                                    <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                      <span className="text-[#8E9299]">Funding Rate</span>
                                      <span className={`font-medium ${new Big(report.fundingRate).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                        {new Big(report.fundingRate).gt(0) ? '+' : ''}{Number(report.fundingRate).toFixed(6)} {report.currency}
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                      <span className="text-[#8E9299]">Cash Flow Total</span>
                                      <span className="text-[#d1d5db] font-medium">
                                        {Number(report.cashFlowTotal).toFixed(6)} {report.currency}
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                      <span className="text-[#8E9299]">Fees Pagos</span>
                                      <span className="text-[#FF4444] font-medium">
                                        {feesBig.gt(0) ? '-' : ''}{Number(report.feesPagos).toFixed(6)} {report.currency}
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-1.5">
                                      <span className="text-[#8E9299]">ROI Médio Diário</span>
                                      <span className={`font-bold ${report.roiMedioDiario >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                        {report.roiMedioDiario >= 0 ? '+' : ''}{report.roiMedioDiario.toFixed(4)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : detailsModalType === 'tx' ? (
                <>
                  {Object.entries(stats.typeBreakdown).length === 0 && (
                    <div className="text-[#8E9299] text-sm text-center py-4">No data available</div>
                  )}
                  {Object.entries(stats.typeBreakdown)
                    .sort((a, b) => b[1] - a[1]) // Sort by count descending
                    .map(([type, count]) => {
                      const typeLabel = TX_TYPES.find(t => t.value === type)?.label || type;
                      const typeClass = typeColorMap[type] || 'text-[#8E9299] bg-[#2a2b30]/50 border-[#2a2b30]';
                      
                      return (
                        <div key={type} className="flex items-center justify-between bg-[#1e232b] p-3 rounded-lg border border-[#2a2b30]/50">
                          <span className={`w-max px-2 py-0.5 text-[10px] rounded font-semibold border ${typeClass}`}>
                            {typeLabel}
                          </span>
                          <span className="font-mono font-medium text-white">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                </>
              ) : (
                <>
                  {/* Stablecoin segment */}
                  {(() => {
                    let val = '0';
                    if (detailsModalType === 'funding') val = stats.stable.totalFunding;
                    if (detailsModalType === 'fees') val = stats.stable.totalFees;
                    if (detailsModalType === 'balance') val = stats.stable.finalBalance;
                    
                    const valBig = new Big(val);
                    if (valBig.eq(0)) return null;

                    const isPositive = valBig.gte(0);
                    const colorClass = detailsModalType === 'fees' 
                      ? 'text-[#FF4444]' 
                      : (isPositive ? 'text-[#00C853]' : 'text-[#FF4444]');
                      
                    return (
                      <div className="flex items-center justify-between bg-[#1e232b] p-3 rounded-lg border border-[#2a2b30]/50">
                        <span className="text-[#8E9299] text-sm">Stablecoins (USDT, USDC, etc.)</span>
                        <span className={`font-mono font-medium ${colorClass}`}>
                          {detailsModalType === 'fees' 
                            ? (valBig.eq(0) ? '0.00' : (valBig.gte(0) ? `-${valBig.toFixed(4)}` : `+${valBig.abs().toFixed(4)}`))
                            : (isPositive ? `+${valBig.toFixed(4)}` : valBig.toFixed(4))}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Per-currency segment */}
                  {Object.entries(stats.perCurrency).length === 0 && new Big(stats.stable[detailsModalType === 'funding' ? 'totalFunding' : detailsModalType === 'fees' ? 'totalFees' : 'finalBalance' as any]).eq(0) && (
                    <div className="text-[#8E9299] text-sm text-center py-4">No data available</div>
                  )}
                  
                  {Object.entries(stats.perCurrency).map(([cur, vals]) => {
                    let val = '0';
                    if (detailsModalType === 'funding') val = vals.totalFunding;
                    if (detailsModalType === 'fees') val = vals.totalFees;
                    if (detailsModalType === 'balance') val = vals.finalBalance;
                    
                    const valBig = new Big(val);
                    if (valBig.eq(0)) return null;

                    const isPositive = valBig.gte(0);
                    const colorClass = detailsModalType === 'fees' 
                      ? 'text-[#FF4444]' 
                      : (isPositive ? 'text-[#00C853]' : 'text-[#FF4444]');

                    return (
                      <div key={cur} className="flex items-center justify-between bg-[#1e232b] p-3 rounded-lg border border-[#2a2b30]/50">
                        <span className="text-[#8E9299] text-sm font-bold">{cur}</span>
                        <span className={`font-mono font-medium ${colorClass}`}>
                          {detailsModalType === 'fees' 
                            ? (valBig.eq(0) ? '0.00' : (valBig.gte(0) ? `-${valBig.toFixed(8)}` : `+${valBig.abs().toFixed(8)}`))
                            : (isPositive ? `+${valBig.toFixed(8)}` : valBig.toFixed(8))} {cur}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            
            <div className="p-4 border-t border-[#2a2b30] flex items-center justify-between">
              <span className="text-[#8E9299] text-sm uppercase tracking-wider">
                {detailsModalType === 'tx' ? 'Total Transactions' : 'Total (USD Eq.)'}
              </span>
              <span className="text-white font-bold font-mono text-lg">
                {(() => {
                  if (detailsModalType === 'tx') return stats.totalCount;

                  let val = '0';
                  if (detailsModalType === 'funding') val = stats.aggregatedUsd.totalFunding;
                  if (detailsModalType === 'fees') val = stats.aggregatedUsd.totalFees;
                  if (detailsModalType === 'balance') val = stats.aggregatedUsd.finalBalance;
                  if (detailsModalType === 'netchange') val = stats.aggregatedUsd.totalChange;
                  
                  const valBig = new Big(val);
                  
                  if (detailsModalType === 'fees') {
                    if (valBig.eq(0)) return '0.00 USD';
                    return valBig.gte(0) ? `-${maskVal(valBig.toString())} USD` : `+${maskVal(valBig.abs().toString())} USD`;
                  }
                  
                  return `${maskVal(valBig.toString())} USD`;
                })()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
