import React, { useState } from 'react';
import { usePositionHistory, PositionHistoryPeriod } from '../../hooks/usePositionHistory';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../../utils/exportUtils';
import { Download, ChevronDown, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { HistoryLimitWarning } from '../ui/HistoryLimitWarning';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { getHistoryInverseUsdValues } from '../../utils/inverseUtils';
import { FilterBar } from '../ui/FilterBar';

export function ReportsDashboard() {
  const [period, setPeriod] = useState<PositionHistoryPeriod>('7d');
  const [exchange, setExchange] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const { positions: history, isLoading } = usePositionHistory(period, exchange, searchTerm);
  const formatCurrency = useFormatCurrency();

  const getExportConfig = (): ExportConfig => {
    const headers = ['Date', 'Exchange', 'Symbol', 'Side', 'Size', 'Entry Price', 'Close Price', 'Trading Fee (USD)', 'Funding Fee (USD)', 'Net PnL (USD)'];
    const rows = history.map(pos => {
      const { realizedPnl, fundingFee, tradingFee } = getHistoryInverseUsdValues(pos);
      return [
        format(new Date(pos.closeUpdateTime), 'yyyy-MM-dd HH:mm'),
        pos.exchange,
        pos.symbol,
        pos.side.toUpperCase(),
        pos.size || 0,
        pos.entryPrice || 0,
        pos.closePrice || 0,
        tradingFee || 0,
        fundingFee || 0,
        realizedPnl + (fundingFee || 0) + (tradingFee || 0)
      ];
    });
    return {
      title: 'Trading Performance Report',
      filename: `trading_report_${format(new Date(), 'yyyy-MM-dd')}`,
      headers,
      rows
    };
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    setExportMenuOpen(false);
    if (format === 'csv') exportToCSV(getExportConfig());
    if (format === 'excel') exportToExcel(getExportConfig());
    if (format === 'pdf') exportToPDF(getExportConfig());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4 py-2">
        <div className="flex flex-col space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-[#2F6BFF]" />
            Reports & Exports
          </h2>
          <span className="text-xs text-[#8E9299]">
            USD values are calculated based on positions close price.
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="px-3 py-2 bg-[#1a1b1e] border border-[#2a2b30] text-white flex items-center gap-2 rounded-lg hover:bg-[#2a2b30]/50 transition-colors text-sm focus:outline-none disabled:opacity-50"
            disabled={isLoading || history.length === 0}
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

      <div className="px-0">
        <FilterBar
          exchange={{
            value: exchange,
            onChange: setExchange,
            labelAll: 'All Exchanges',
          }}
          period={{
            value: period,
            onChange: setPeriod,
            options: [
              { value: 'today', label: 'Today' },
              { value: '7d', label: '7 Days' },
              { value: '14d', label: '14 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' },
            ],
          }}
          search={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: 'Search...',
          }}
        />
      </div>

      <HistoryLimitWarning period={period} />

      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#8E9299] bg-[#151619] border-b border-[#2a2b30]">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Exchange</th>
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Side</th>
                <th className="px-4 py-3 font-medium text-right">Net PnL</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#8E9299]">
                    {isLoading ? 'Loading history...' : 'No historical data found for the selected filters.'}
                  </td>
                </tr>
              ) : (
                history.map((pos) => {
                  const { realizedPnl, fundingFee, tradingFee } = getHistoryInverseUsdValues(pos);
                  const net = realizedPnl + (fundingFee || 0) + (tradingFee || 0);
                  return (
                    <tr key={pos.id} className="border-b border-[#2a2b30]/50 hover:bg-[#2a2b30]/20 transition-colors">
                      <td className="px-4 py-3 text-[#8E9299]">{format(new Date(pos.closeUpdateTime), 'MMM dd, HH:mm')}</td>
                      <td data-theme={pos.exchange.toLowerCase()} className="px-4 py-3 capitalize text-white">{pos.exchange}</td>
                      <td className="px-4 py-3 font-medium text-white">{pos.symbol}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${pos.side === 'long' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                          {pos.side.toUpperCase()}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${net >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {formatCurrency(net, 'usd')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
