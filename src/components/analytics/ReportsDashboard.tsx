import React, { useState } from 'react';
import { usePositionHistory, PositionHistoryPeriod } from '../../hooks/usePositionHistory';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../../utils/exportUtils';
import { DownloadCloud, FileText, Table } from 'lucide-react';
import { format } from 'date-fns';
import { HistoryLimitWarning } from '../ui/HistoryLimitWarning';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';

export function ReportsDashboard() {
  const [period, setPeriod] = useState<PositionHistoryPeriod>('30d');
  const { positions: history, isLoading } = usePositionHistory(period);
  const formatCurrency = useFormatCurrency();

  const getExportConfig = (): ExportConfig => {
    const headers = ['Date', 'Exchange', 'Symbol', 'Side', 'Size', 'Entry Price', 'Close Price', 'Trading Fee', 'Funding Fee', 'Net PnL'];
    const rows = history.map(pos => [
      format(new Date(pos.closeUpdateTime), 'yyyy-MM-dd HH:mm'),
      pos.exchange,
      pos.symbol,
      pos.side.toUpperCase(),
      pos.size || 0,
      pos.entryPrice || 0,
      pos.closePrice || 0,
      pos.tradingFee || 0,
      pos.fundingFee || 0,
      pos.realizedPnl + (pos.fundingFee || 0) + (pos.tradingFee || 0)
    ]);
    return {
      title: 'Trading Performance Report',
      filename: `trading_report_${format(new Date(), 'yyyy-MM-dd')}`,
      headers,
      rows
    };
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white tracking-tight">Reports & Exports</h2>
        
        <div className="flex items-center gap-4">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="bg-[#151619] border border-[#2a2b30] text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="14d">Last 14 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <div className="flex gap-2">
            <button 
              onClick={() => exportToCSV(getExportConfig())}
              disabled={isLoading || history.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-[#2a2b30] hover:bg-[#3a3b40] disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Table className="w-4 h-4" /> CSV
            </button>
            <button 
              onClick={() => exportToExcel(getExportConfig())}
              disabled={isLoading || history.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 disabled:opacity-50 rounded-lg transition-colors"
            >
              <DownloadCloud className="w-4 h-4" /> Excel
            </button>
            <button 
              onClick={() => exportToPDF(getExportConfig())}
              disabled={isLoading || history.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/30 disabled:opacity-50 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
      </div>
      
      <HistoryLimitWarning period={period} />

      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 bg-[#0b0c10] border-b border-[#2a2b30]">
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
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {isLoading ? 'Loading history...' : 'No historical data found for the selected period.'}
                  </td>
                </tr>
              ) : (
                history.map((pos) => {
                  const net = pos.realizedPnl + (pos.fundingFee || 0) + (pos.tradingFee || 0);
                  return (
                    <tr key={pos.id} className="border-b border-[#2a2b30]/50 hover:bg-[#2a2b30]/20 transition-colors">
                      <td className="px-4 py-3 text-gray-300">{format(new Date(pos.closeUpdateTime), 'MMM dd, HH:mm')}</td>
                      <td data-theme={pos.exchange.toLowerCase()} className="px-4 py-3 text-brand-normal capitalize">{pos.exchange}</td>
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
