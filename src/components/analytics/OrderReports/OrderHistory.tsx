import React, { useState, useEffect, useMemo } from 'react';
import { useOrderReports, OrderFilters } from '../../../hooks/useOrderReports';
import { OrderFilters as OrderFiltersUI } from './OrderFilters';
import { OrdersTable } from './OrdersTable';
import { Download, ChevronDown, History } from 'lucide-react';
import { useSettingsStore } from '../../../store/settingsStore';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { SyncBadge } from '../../ui/SyncBadge';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import Big from 'big.js';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../../../utils/exportUtils';

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
  const formatCurrency = useFormatCurrency();

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

  const [totalFundingFee, setTotalFundingFee] = useState<number>(0);
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);

  useEffect(() => {
    let isMounted = true;
    const fetchFunding = async () => {
      let total = 0;
      const now = Date.now();
      const start = now - filters.timePeriod;
      const end = now;

      // Helper to lazily fetch prices for non-USD currencies if needed
      const priceCache: Record<string, number> = {};
      const getPrice = async (ccy: string) => {
        if (ccy.includes('USD') || ccy === 'EUR') return 1;
        if (priceCache[ccy]) return priceCache[ccy];
        try {
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${ccy}USDT`);
          if (res.ok) {
            const data = await res.json();
            priceCache[ccy] = parseFloat(data.price);
            return priceCache[ccy];
          }
        } catch { /* ignore fallback to 0 */ }
        return 0;
      };

      if (useMockData) {
        import('../../../mock/bills.json').then(async mod => {
          const mockBills = mod.default as any[];
          for (const b of mockBills) {
             if (b.type === 'funding' && b.timestamp >= start && b.timestamp <= end) {
                if (filters.exchange !== 'All' && b.exchange !== filters.exchange.toLowerCase()) continue;
                const ccyStr = b.ccy ? b.ccy.toUpperCase() : 'USDT';
                const p = await getPrice(ccyStr);
                total += (b.amount * p);
             }
          }
          if (isMounted) setTotalFundingFee(total);
        }).catch(err => {
          console.warn('Could not load mock bills', err);
        });
        return;
      }

      import('../../../services/bills/BillsHistoryService').then(async ({ BillsHistoryService }) => {
        const service = new BillsHistoryService();
        for (const key of keys) {
           if (filters.exchange !== 'All' && key.exchange !== filters.exchange.toLowerCase()) continue;
           if (filters.accountId !== 'All' && key.id !== filters.accountId) continue;
           
           try {
             const bills = await service.fetchBills(key, start, end);
             for (const b of bills) {
               if (b.type === 'funding') {
                 const ccyStr = b.ccy ? b.ccy.toUpperCase() : 'USDT';
                 const p = await getPrice(ccyStr);
                 total += Number(b.amount) * p;
               }
             }
           } catch(e) {
             console.error('Failed to fetch bills for funding fee', e);
           }
        }
        if (isMounted) setTotalFundingFee(total);
      });
    };
    fetchFunding();
    return () => { isMounted = false; };
  }, [filters.timePeriod, filters.exchange, filters.accountId, keys, useMockData]);

  const stats = useMemo(() => {
    let buyCount = 0;
    let sellCount = 0;
    
    let filledCount = 0;
    let cancelledCount = 0;
    let rejectedCount = 0;

    let totalTradedVolume = 0;
    let totalFees = 0;

    orders.forEach(o => {
      if (o.side === 'buy') buyCount++;
      else if (o.side === 'sell') sellCount++;

      if (o.status === 'FILLED' || o.status === 'PARTIALLY_FILLED') filledCount++;
      else if (o.status === 'CANCELLED') cancelledCount++;
      else if (o.status === 'REJECTED') rejectedCount++;

      if (o.filledQty > 0) {
        const p = o.avgPrice > 0 ? o.avgPrice : o.price || 0;
        let valUsd = 0;
        if (o.category === 'INVERSE') {
           valUsd = o.filledQty; // Qty is mostly in USD already
        } else {
           valUsd = o.value || (p > 0 ? Number(new Big(o.filledQty).times(p)) : 0);
        }
        totalTradedVolume += valUsd;
      }
      
      if (o.fees && o.filledQty > 0) {
        if (o.category === 'INVERSE') {
          const p = o.avgPrice > 0 ? o.avgPrice : o.price || 0;
          totalFees += Math.abs(o.fees) * p;
        } else {
          totalFees += Math.abs(o.fees);
        }
      }
    });

    return { buyCount, sellCount, filledCount, cancelledCount, rejectedCount, totalTradedVolume, totalFees };
  }, [orders]);

  const SIDE_DONUT = [
    { name: 'Buy', value: stats.buyCount, color: '#00C853' },
    { name: 'Sell', value: stats.sellCount, color: '#FF4444' }
  ];

  const STATUS_DONUT = [
    { name: 'Filled / Part', value: stats.filledCount, color: '#00C853' },
    { name: 'Cancelled', value: stats.cancelledCount, color: '#8E9299' },
    { name: 'Rejected', value: stats.rejectedCount, color: '#FF4444' }
  ];

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    setExportMenuOpen(false);
    
    const headers = ['Symbol', 'Exchange', 'Connection ID', 'Instrument', 'Type', 'Side', 'Price', 'Amount', 'Filled', 'Status', 'Time'];
    const rows = orders.map(o => {
      const isBuy = o.side === 'buy';
      const sideText = isBuy
        ? (o.positionSide === 'long' ? 'Open Long' : o.positionSide === 'short' ? 'Close Short' : 'Buy')
        : (o.positionSide === 'short' ? 'Open Short' : o.positionSide === 'long' ? 'Close Long' : 'Sell');

      const d = new Date(o.createdTime);
      const timeStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();

      return [o.symbol, o.exchange, o.connectionId, o.category, o.type, sideText, o.price, o.qty, o.filledQty, o.status, timeStr];
    });

    const config: ExportConfig = {
      title: 'Order History Report',
      filename: `Order_History_${Date.now()}`,
      headers,
      rows
    };

    if (format === 'csv') exportToCSV(config);
    if (format === 'excel') exportToExcel(config);
    if (format === 'pdf') exportToPDF(config);
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

      {orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          {/* Status Breakdown */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
            <div className='flex flex-col'>
              <div className="flex items-center gap-2">
                <span className="text-2xl text-[#8E9299]">Total Orders: </span>
                <span className="text-xl font-medium text-white">{orders.length}</span>
              </div>
              <div className="flex flex-col text-[13px] gap-0.5 font-mono mt-1">
                <span className="text-[#00C853]">Filled: {stats.filledCount}</span>
                <span className="text-[#8E9299]">Cancelled: {stats.cancelledCount}</span>
                <span className="text-[#FF4444]">Rejected: {stats.rejectedCount}</span>
              </div>
            </div>
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161b22', border: '1px solid #2a2b30', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Pie data={STATUS_DONUT} cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" dataKey="value" stroke="none">
                    {STATUS_DONUT.map((entry, index) => <Cell key={`status-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Buy vs Sell */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
            <div className='flex flex-col'>
              <span className="text-2xl text-[#8E9299]">Buy vs Sell</span>
              <div className="flex text-[15px] gap-2 font-mono mt-2">
                <span className="text-[#00C853]">{stats.buyCount} B ({((stats.buyCount / orders.length) * 100 || 0).toFixed(0)}%)</span>
                <span className="text-[#8E9299]"> | </span>
                <span className="text-[#FF4444]">{stats.sellCount} S ({((stats.sellCount / orders.length) * 100 || 0).toFixed(0)}%)</span>
              </div>
            </div>
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161b22', border: '1px solid #2a2b30', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Pie data={SIDE_DONUT} cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" dataKey="value" stroke="none">
                    {SIDE_DONUT.map((entry, index) => <Cell key={`side-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Volume and Fees */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center gap-3">
            <div className="flex flex-col">
              <span className="text-[13px] text-[#8E9299] uppercase tracking-wider">Traded Volume</span>
              <span className="text-xl font-medium text-white">
                {formatCurrency(stats.totalTradedVolume, 'usd')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-[#2a2b30] pt-3">
              <div className="flex flex-col">
                <span className="text-[11px] text-[#8E9299] uppercase tracking-wider">Trading Fees</span>
                <span className="text-[13px] font-medium text-[#FF4444]">
                  {stats.totalFees > 0 ? '-' + formatCurrency(stats.totalFees, 'usd') : '0.00 USD'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#8E9299] uppercase tracking-wider">Funding Fees</span>
                <span className={`text-[13px] font-medium ${totalFundingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                  {totalFundingFee > 0 ? '+' : ''}{totalFundingFee !== 0 ? formatCurrency(totalFundingFee, 'usd') : '0.00 USD'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

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
