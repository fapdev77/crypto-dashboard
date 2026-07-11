import React, { useState } from 'react';
import Big from 'big.js';
import { FileText, Download, ChevronDown, Activity, TrendingUp, CreditCard, Wallet } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useBybitTransactions, TxFilters } from '../../../hooks/useBybitTransactions';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import { usePrivacy } from '../../../context/PrivacyContext';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../../ui/Pagination';
import { StatusAndSyncBadge } from '../../ui/StatusAndSyncBadge';
import { AppTooltip } from '../../ui/Tooltip';
import { BybitTransactionRow } from './BybitTransactionRow';
import { BybitTransactionFilters } from './BybitTransactionFilters';
import { BybitTransactionProgress } from './BybitTransactionProgress';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../../../utils/exportUtils';
import { LogManager } from '../../../services/LogManager';

export function BybitTransactions() {
  const [filters, setFilters] = useState<TxFilters>({
    search: '',
    category: 'All',
    type: 'All',
    currency: 'All',
    accountId: 'All',
    timePeriod: 0, // Default: All Time
  });

  const { filteredEntries, isLoading, isSyncing, progress, error, stats } = useBybitTransactions(filters);
  const formatCurrency = useFormatCurrency();
  const { isPrivateMode } = usePrivacy();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const { page: currentPage, setPage: setCurrentPage, paginated: paginatedEntries, totalItems: entriesTotal } = usePagination(
    filteredEntries, 50, [filters]
  );

  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return formatCurrency(Number(val), 'usd');
  };

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
      <BybitTransactionFilters filters={filters} setFilters={setFilters} />

      {/* Stats Cards */}
      {filteredEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Transactions + PieChart by Type */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2F6BFF] shrink-0" />
                <AppTooltip description="Total number of transactions matching the current filters.">
                  <span className="text-[11px] text-[#8E9299] uppercase tracking-wider w-max cursor-help border-b border-dashed border-[#8E9299]/50">
                    Total Tx
                  </span>
                </AppTooltip>
              </div>
              <span className="text-2xl font-bold text-white mt-1">{stats.totalCount}</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(stats.typeBreakdown).slice(0, 4).map(([type, count]) => (
                  <span key={type} className="text-[8px] px-1.5 py-0.5 rounded bg-[#2a2b30] text-[#8E9299] font-mono">
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
            <div className="w-20 h-20 shrink-0">
              {Object.keys(stats.typeBreakdown).length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#161b22', border: '1px solid #2a2b30', borderRadius: '8px', fontSize: '11px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Pie
                      data={Object.entries(stats.typeBreakdown).slice(0, 5).map(([type, count], i) => ({
                        name: type,
                        value: count,
                        color: ['#2F6BFF', '#FF9C2E', '#00C853', '#FF4444', '#A855F7'][i % 5]
                      }))}
                      cx="50%" cy="50%" innerRadius="55%" outerRadius="100%"
                      dataKey="value" stroke="none"
                    >
                      {Object.entries(stats.typeBreakdown).slice(0, 5).map((_, i) => (
                        <Cell key={i} fill={['#2F6BFF', '#FF9C2E', '#00C853', '#FF4444', '#A855F7'][i % 5]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Card 2: Total Funding (stable only) */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#00C853] shrink-0" />
              <AppTooltip description="Sum of funding fees in USD stablecoins (USDT/USDC). Non-stable values shown separately.">
                <span className="text-[11px] text-[#8E9299] uppercase tracking-wider w-max cursor-help border-b border-dashed border-[#8E9299]/50">
                  Total Funding (USD)
                </span>
              </AppTooltip>
            </div>
            <span className={`text-xl font-bold ${new Big(stats.stable.totalFunding).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
              {maskVal(stats.stable.totalFunding)} USD
            </span>
            {Object.entries(stats.perCurrency).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(stats.perCurrency).map(([cur, vals]) => (
                  <AppTooltip key={cur} description={`Funding in ${cur}`}>
                    <span className={`text-[8px] px-1 py-0.5 rounded font-mono ${new Big(vals.totalFunding).gte(0) ? 'text-[#00C853] bg-[#00C853]/10' : 'text-[#FF4444] bg-[#FF4444]/10'}`}>
                      {new Big(vals.totalFunding).toFixed(8)} {cur}
                    </span>
                  </AppTooltip>
                ))}
              </div>
            )}
            <span className="text-[10px] text-[#8E9299] mt-1">
              Funding {new Big(stats.stable.totalFunding).gte(0) ? 'received' : 'paid'}
            </span>
          </div>

          {/* Card 3: Total Fees (stable only) */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-[#FF4444] shrink-0" />
              <AppTooltip description="Sum of trading fees in USD stablecoins (USDT/USDC). Non-stable values shown separately.">
                <span className="text-[11px] text-[#8E9299] uppercase tracking-wider w-max cursor-help border-b border-dashed border-[#8E9299]/50">
                  Total Fees (USD)
                </span>
              </AppTooltip>
            </div>
            <span className={`text-xl font-bold ${new Big(stats.stable.totalFees).gte(0) ? 'text-[#FF4444]' : 'text-[#00C853]'}`}>
              {(() => {
                const feeBig = new Big(stats.stable.totalFees);
                if (feeBig.abs().toString() === '0') return '0.00 USD';
                if (feeBig.gte(0)) return `-${maskVal(feeBig.toString())} USD`;
                return `+${maskVal(feeBig.abs().toString())} USD`;
              })()}
            </span>
            {Object.entries(stats.perCurrency).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(stats.perCurrency).map(([cur, vals]) => (
                  <AppTooltip key={cur} description={`Fees in ${cur}`}>
                    <span className="text-[8px] px-1 py-0.5 rounded font-mono text-[#FF4444] bg-[#FF4444]/10">
                      {new Big(vals.totalFees).abs().toFixed(8)} {cur}
                    </span>
                  </AppTooltip>
                ))}
              </div>
            )}
            <span className="text-[10px] text-[#8E9299] mt-1">
              Trading fees paid
            </span>
          </div>

          {/* Card 4: Net Change + Wallet Balance */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#8E9299] shrink-0" />
              <AppTooltip description="Net change and wallet balance in USD stablecoins. Non-stable balances shown separately.">
                <span className="text-[11px] text-[#8E9299] uppercase tracking-wider w-max cursor-help border-b border-dashed border-[#8E9299]/50">
                  Net Change (USD)
                </span>
              </AppTooltip>
            </div>
            <span className={`text-lg font-bold ${new Big(stats.stable.totalChange).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
              {maskVal(stats.stable.totalChange)} USD
            </span>
            <div className="border-t border-[#2a2b30] pt-2 flex flex-col">
              <AppTooltip description="Wallet balance after the most recent stablecoin transaction.">
                <span className="text-[9px] text-[#8E9299] uppercase tracking-wider w-max cursor-help border-b border-dashed border-[#8E9299]/50">
                  Wallet Balance (USD)
                </span>
              </AppTooltip>
              <span className="text-[13px] font-bold text-white mt-0.5">{maskVal(stats.stable.finalBalance)} USD</span>
              {Object.entries(stats.perCurrency).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(stats.perCurrency).map(([cur, vals]) => (
                    <AppTooltip key={cur} description={`Balance in ${cur}`}>
                      <span className="text-[8px] px-1 py-0.5 rounded font-mono bg-[#2a2b30] text-[#8E9299]">
                        {new Big(vals.finalBalance).toFixed(8)} {cur}
                      </span>
                    </AppTooltip>
                  ))}
                </div>
              )}
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
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
