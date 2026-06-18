import React, { useState, useEffect, useMemo } from 'react';
import { useOrderReports, OrderFilters } from '../../../hooks/useOrderReports';
import { OrderFilters as OrderFiltersUI } from './OrderFilters';
import { OrdersTable } from './OrdersTable';
import { Download, ChevronDown, ArrowLeftRight } from 'lucide-react';

export function OrderReportsDashboard() {
  const { fetchOrders, orders, loading, error } = useOrderReports();
  const [filters, setFilters] = useState<OrderFilters>({
    exchange: 'All',
    instrument: 'All',
    symbols: '',
    type: 'All',
    side: 'All',
    status: 'OPEN',
    timePeriod: 14 * 24 * 60 * 60 * 1000, // default 14 days for history
    accountId: 'All'
  });

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    fetchOrders(filters);
  }, [filters, fetchOrders]);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    setExportMenuOpen(false);
    let content = "Symbol,Exchange,Connection ID,Instrument,Type,Side,Price,Amount,Filled,Status,Time\n";
    orders.forEach(o => {
      const isBuy = o.side === 'buy';
      const sideText = isBuy 
        ? (o.positionSide === 'long' ? 'Open Long' : o.positionSide === 'short' ? 'Close Short' : 'Buy')
        : (o.positionSide === 'short' ? 'Open Short' : o.positionSide === 'long' ? 'Close Long' : 'Sell');

      const d = new Date(o.createdTime);
      const timeStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();

      content += `${o.symbol},${o.exchange},${o.connectionId},${o.category},${o.type},${sideText},${o.price},${o.qty},${o.filledQty},${o.status},${timeStr}\n`;
    });

    const extension = format === 'csv' ? 'csv' : format === 'excel' ? 'xls' : 'pdf';
    const mimeType = format === 'csv' ? 'text/csv' : format === 'excel' ? 'application/vnd.ms-excel' : 'application/pdf';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Order_Reports_${filters.status}_${Date.now()}.${extension}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-8 h-full bg-white dark:bg-[#0b0c10] text-gray-900 dark:text-white rounded-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 md:p-6 pb-2">
         <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
           <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
           Order Reports
         </h2>
         <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="p-2 ml-2 bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] flex items-center gap-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2b30] transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export <ChevronDown className="w-3 h-3" />
            </button>
            {exportMenuOpen && (
              <div className="absolute top-11 right-0 w-32 bg-white dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] rounded-lg shadow-xl z-50 overflow-hidden text-sm">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#2a2b30]">Export CSV</button>
                <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#2a2b30]">Export Excel</button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#2a2b30]">Export PDF</button>
              </div>
            )}
          </div>
      </div>

      <div className="px-4 md:px-6">
        <OrderFiltersUI filters={filters} setFilters={setFilters} />
      </div>

      {error && (
        <div className="mx-4 md:mx-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto hide-scrollbar px-4 md:px-6">
        <OrdersTable orders={orders} loading={loading} />
      </div>
    </div>
  );
}
