import React, { useState, useEffect } from 'react';
import { useOrderReports, OrderFilters } from '../../../hooks/useOrderReports';
import { OrderFilters as OrderFiltersUI } from './OrderFilters';
import { OrdersTable } from './OrdersTable';
import { Download, ChevronDown, History } from 'lucide-react';
import { useSettingsStore } from '../../../store/settingsStore';
import { SyncBadge } from '../../ui/SyncBadge';

export function OrderHistory() {
  const [filters, setFilters] = useState<OrderFilters>({
    exchange: 'All',
    instrument: 'All',
    symbols: '',
    type: 'All',
    side: 'All',
    status: 'CLOSED',
    timePeriod: 7 * 24 * 60 * 60 * 1000, // default 7 days
    accountId: 'All'
  });

  const { fetchOrders, orders, loading, isSyncing, error } = useOrderReports(filters);
  const historyCacheInterval = useSettingsStore(state => state.historyCacheInterval);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Busca inicial
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOrders]);

  // Polling silencioso
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(true); // silent refresh
    }, historyCacheInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [historyCacheInterval, fetchOrders]);

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
    link.setAttribute('download', `Order_History_${Date.now()}.${extension}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#2F6BFF]" />
            Order History
          </div>
          <SyncBadge isSyncing={isSyncing} />
        </h2>
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

      <div className="px-0">
        <OrderFiltersUI filters={filters} setFilters={setFilters} showPeriod={true} />
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 text-red-200 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto hide-scrollbar">
        <OrdersTable orders={orders} loading={loading} />
      </div>
    </div>
  );
}
