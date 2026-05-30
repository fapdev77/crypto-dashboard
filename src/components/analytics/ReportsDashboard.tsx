import React, { useState } from 'react';
import { usePositionHistory } from '../../hooks/usePositionHistory';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { DownloadCloud, FileText, Table } from 'lucide-react';
import { format } from 'date-fns';
import { HistoryLimitWarning } from '../ui/HistoryLimitWarning';

export function ReportsDashboard() {
  const [period, setPeriod] = useState<'1w'|'2w'|'1m'|'custom'>('1m');
  const { positions: history, isLoading } = usePositionHistory(period, '', '', true);

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
            <option value="1w">Last 7 Days</option>
            <option value="2w">Last 14 Days</option>
            <option value="1m">Last 30 Days</option>
          </select>

          <div className="flex gap-2">
            <button 
              onClick={() => exportToCSV(history)}
              disabled={isLoading || history.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-[#2a2b30] hover:bg-[#3a3b40] disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Table className="w-4 h-4" /> CSV
            </button>
            <button 
              onClick={() => exportToExcel(history)}
              disabled={isLoading || history.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 disabled:opacity-50 rounded-lg transition-colors"
            >
              <DownloadCloud className="w-4 h-4" /> Excel
            </button>
            <button 
              onClick={() => exportToPDF(history)}
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
                      <td className="px-4 py-3 text-gray-400 capitalize">{pos.exchange}</td>
                      <td className="px-4 py-3 font-medium text-white">{pos.symbol}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${pos.side === 'long' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                          {pos.side.toUpperCase()}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${net >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        ${net.toFixed(2)}
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
