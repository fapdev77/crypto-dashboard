import React, { useState, useEffect, useMemo } from 'react';
import { useOrderReports, OrderFilters } from '../../../hooks/useOrderReports';
import { OrderFilters as OrderFiltersUI } from './OrderFilters';
import { OrdersTable } from './OrdersTable';
import { Download, ChevronDown, History } from 'lucide-react';
import { useSettingsStore } from '../../../store/settingsStore';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { StatusAndSyncBadge } from '../../ui/StatusAndSyncBadge';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { LogManager } from '../../../services/LogManager';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import Big from 'big.js';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../../../utils/exportUtils';
import { AppTooltip } from '../../ui/Tooltip';
import { Pagination } from '../../ui/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import { detectQtyIsCoin } from '../../../utils/inverseUtils';
import { resolvePeriodDateRange } from '../../../utils/dateTimeHelper';
import { useTranslation } from 'react-i18next';
import { getUsdPrice, PriceExchange } from '../../../services/pricing/usdPrice';
import { MissingRatesNotice, missingRatesNote } from '../../transactions/MissingRatesNotice';

export function OrderHistory() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<OrderFilters>({
    exchange: 'All',
    instrument: 'All',
    symbols: '',
    type: 'All',
    side: 'All',
    status: 'CLOSED',
    timePeriod: 7 * 24 * 60 * 60 * 1000, // default 7 days
    accountId: 'All',
    historyStatus: 'All'
  });

  const { fetchOrders, orders, loading, isSyncing, error } = useOrderReports(filters);
  const historyCacheInterval = useSettingsStore(state => state.historyCacheInterval);
  const formatCurrency = useFormatCurrency();

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const { page: currentPage, setPage: setCurrentPage, paginated: paginatedOrders, totalItems: ordersTotal } = usePagination(
    orders, 50, [filters]
  );

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
  const [missingFundingRates, setMissingFundingRates] = useState<string[]>([]);
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);

  useEffect(() => {
    let isMounted = true;
    const fetchFunding = async () => {
      let total = 0;
      const now = Date.now();
      const { startTime, endTime } = resolvePeriodDateRange(
        filters.timePeriod,
        filters.customStartDate,
        filters.customEndDate
      );
      const start = startTime ?? (now - 7 * 24 * 60 * 60 * 1000);
      const end = endTime ?? now;

      // Shared price cascade (exchange ticker -> OKX). Unpriced currencies are
      // reported instead of being converted with an invented 1:1 rate.
      const unresolved = new Set<string>();
      const getPrice = async (ccy: string, exchange?: PriceExchange) => {
        const price = await getUsdPrice(ccy, { exchange });
        if (price === null) unresolved.add(ccy);
        return price ?? 0;
      };

      if (useMockData) {
        import('../../../mock/bills.json').then(async mod => {
          const mockBills = mod.default as any[];
          for (const b of mockBills) {
             if (b.type === 'funding' && b.timestamp >= start && b.timestamp <= end) {
                if (filters.exchange !== 'All' && b.exchange !== filters.exchange.toLowerCase()) continue;
                const ccyStr = b.ccy ? b.ccy.toUpperCase() : 'USDT';
                const p = await getPrice(ccyStr, b.exchange as PriceExchange | undefined);
                total += (b.amount * p);
             }
          }
          if (isMounted) {
            setTotalFundingFee(total);
            setMissingFundingRates(Array.from(unresolved));
          }
        }).catch(err => {
          LogManager.warn('OrderHistory', 'Could not load mock bills', err);
        });
        return;
      }

      const activeKeys = keys.filter(k => k.isActive);
      if (activeKeys.length === 0) {
        if (isMounted) {
          setTotalFundingFee(0);
          setMissingFundingRates([]);
        }
        return;
      }

      import('../../../services/bills/BillsHistoryService').then(async ({ BillsHistoryService }) => {
        const service = new BillsHistoryService();
        for (const key of activeKeys) {
           if (filters.exchange !== 'All' && key.exchange !== filters.exchange.toLowerCase()) continue;
           if (filters.accountId !== 'All' && key.id !== filters.accountId) continue;
           
           try {
             const bills = await service.fetchBills(key, start, end);
             for (const b of bills) {
               if (b.type === 'funding') {
                 const ccyStr = b.ccy ? b.ccy.toUpperCase() : 'USDT';
                 // Bills come per API key, so the venue is known even when the
                 // record itself does not carry it.
                 const p = await getPrice(ccyStr, key.exchange as PriceExchange);
                 total += Number(b.amount) * p;
               }
             }
           } catch(e) {
             LogManager.error('OrderHistory', 'Failed to fetch bills for funding fee', e);
           }
        }
        if (isMounted) {
          setTotalFundingFee(total);
          setMissingFundingRates(Array.from(unresolved));
        }
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
          const qtyIsCoin = detectQtyIsCoin({ exchange: o.exchange, qty: o.qty, price: p, value: o.value });

          if (o.exchange === 'bybit') {
            // Bybit inverse: o.value is in COIN. Multiply by price to get USD value
            valUsd = o.value && o.value > 0 && p > 0 ? Number(new Big(o.value).times(p)) : o.filledQty;
          } else if (o.exchange === 'bitget') {
            // Bitget inverse: filledQty is contracts in USD. raw quoteVolume is USD volume if available
            const rawQuoteVol = o.raw?.quoteVolume ? parseFloat(o.raw.quoteVolume) : 0;
            valUsd = rawQuoteVol > 0 ? rawQuoteVol : (o.value && o.value > 0 && o.value !== o.filledQty * p ? o.value : o.filledQty);
          } else if (o.value && o.value > 0) {
            valUsd = o.filledQty > 0 && o.filledQty !== o.qty ? (p > 0 ? Number(new Big(o.filledQty).times(p)) : 0) : o.value;
          } else if (!qtyIsCoin) {
            valUsd = o.filledQty; // Qty is mostly in USD already
          } else {
            valUsd = p > 0 ? Number(new Big(o.filledQty).times(p)) : 0;
          }
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
    { name: t('orders.buy', 'Buy'), value: stats.buyCount, color: '#00C853' },
    { name: t('orders.sell', 'Sell'), value: stats.sellCount, color: '#FF4444' }
  ];

  const STATUS_DONUT = [
    { name: t('orders.statuses.filled', 'Filled'), value: stats.filledCount, color: '#00C853' },
    { name: t('orders.statuses.cancelled', 'Cancelled'), value: stats.cancelledCount, color: '#8E9299' },
    { name: t('orders.statuses.rejected', 'Rejected'), value: stats.rejectedCount, color: '#FF4444' }
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

    const note = missingRatesNote(t, missingFundingRates);
    const config: ExportConfig = {
      title: 'Order History Report',
      filename: `Order_History_${Date.now()}`,
      headers,
      rows,
      notes: note ? [note] : undefined,
    };

    if (format === 'csv') exportToCSV(config);
    if (format === 'excel') exportToExcel(config);
    if (format === 'pdf') exportToPDF(config);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
            <History className="w-5 h-5 text-[#2F6BFF]" />
            {t('orders.orderHistoryTitle', 'Orders History')}
          </h2>
          <StatusAndSyncBadge isSyncing={isSyncing} syncMessage={isSyncing ? 'Syncing orders history...' : null} syncError={error} />
        </div>
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="px-3 py-2 bg-[#1a1b1e] border border-[#2a2b30] text-white flex items-center gap-2 rounded-lg hover:bg-[#2a2b30]/50 transition-colors text-sm focus:outline-none"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('positionsHistory.export', 'Export')}</span> <ChevronDown className="w-3 h-3" />
          </button>
          {exportMenuOpen && (
            <div className="absolute top-11 right-0 w-32 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-xl z-50 overflow-hidden text-sm text-white">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-[#2a2b30]/50 transition-colors">{t('positionsHistory.exportCsv', 'Export CSV')}</button>
              <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 hover:bg-[#2a2b30]/50 transition-colors">{t('positionsHistory.exportExcel', 'Export Excel')}</button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-[#2a2b30]/50 transition-colors">{t('positionsHistory.exportPdf', 'Export PDF')}</button>
            </div>
          )}
        </div>
      </div>

      <div className="px-0">
        <OrderFiltersUI filters={filters} setFilters={setFilters} showPeriod={true} showStatusFilter={true} />
      </div>

      {missingFundingRates.length > 0 && (
        <MissingRatesNotice currencies={missingFundingRates} />
      )}

      {orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          {/* Status Breakdown */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
            <div className='flex flex-col'>
              <div className="flex items-center gap-2">
                <span className="text-2xl text-[#8E9299]">{t('orders.stats.totalOrders', 'Total Orders')}: </span>
                <span className="text-xl font-medium text-white">{orders.length}</span>
              </div>
              <div className="flex flex-col text-[13px] gap-0.5 font-mono mt-1">
                <span className="text-[#00C853]">{t('orders.statuses.filled', 'Filled')}: {stats.filledCount}</span>
                <span className="text-[#8E9299]">{t('orders.statuses.cancelled', 'Cancelled')}: {stats.cancelledCount}</span>
                <span className="text-[#FF4444]">{t('orders.statuses.rejected', 'Rejected')}: {stats.rejectedCount}</span>
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
              <span className="text-2xl text-[#8E9299]">{t('orders.buy', 'Buy')} / {t('orders.sell', 'Sell')}</span>
              <div className="flex text-[15px] gap-2 font-mono mt-2">
                <span className="text-[#00C853]">{stats.buyCount} {t('orders.buy', 'Buy')} ({((stats.buyCount / orders.length) * 100 || 0).toFixed(0)}%)</span>
                <span className="text-[#8E9299]"> | </span>
                <span className="text-[#FF4444]">{stats.sellCount} {t('orders.sell', 'Sell')} ({((stats.sellCount / orders.length) * 100 || 0).toFixed(0)}%)</span>
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
              <AppTooltip description="The total estimated USD value of all executed trades in the selected period.">
                <span className="text-[13px] text-[#8E9299] uppercase tracking-wider w-max cursor-help border-b border-dashed border-[#8E9299]/50">{t('trade.tradedVolume', 'Traded Volume')}</span>
              </AppTooltip>
              <span className="text-xl font-medium text-white mt-1">
                {formatCurrency(stats.totalTradedVolume, 'usd')}
              </span>
            </div>
            <div className="border-t border-[#2a2b30] pt-3 flex flex-col">
              <AppTooltip description="The total estimated USD value of trading fees paid for these orders.">
                <span className="text-[11px] text-[#8E9299] uppercase tracking-wider w-max cursor-help border-b border-dashed border-[#8E9299]/50">{t('positions.tradingFee', 'Trading Fees')}</span>
              </AppTooltip>
              <span className="text-[13px] font-medium text-[#FF4444] mt-1 font-mono">
                {stats.totalFees > 0 ? '-' + formatCurrency(stats.totalFees, 'usd') : '0.00 USD'}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 text-red-200 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto hide-scrollbar">          {ordersTotal > 5 && (
          <div className="mb-4">
            <Pagination
              id="orders-pagination-top"
              currentPage={currentPage}
              totalItems={ordersTotal}
              itemsPerPage={50}
              onPageChange={setCurrentPage}                refreshKey={`${filters.exchange}-${filters.instrument}-${filters.type}-${filters.side}-${filters.status}-${filters.timePeriod}-${filters.accountId}-${filters.historyStatus}`}
                refreshLabel="Updating"
                refreshDataReady={!loading}
              />
          </div>
        )}
        <OrdersTable orders={paginatedOrders} loading={loading} />
        {ordersTotal > 0 && (
          <div className="mt-4">
            <Pagination
              id="orders-pagination-bottom"
              currentPage={currentPage}
              totalItems={ordersTotal}
              itemsPerPage={50}
              onPageChange={setCurrentPage}                refreshKey={`${filters.exchange}-${filters.instrument}-${filters.type}-${filters.side}-${filters.status}-${filters.timePeriod}-${filters.accountId}-${filters.historyStatus}`}
                refreshLabel="Updating"
                refreshDataReady={!loading}
              />
          </div>
        )}
      </div>
    </div>
  );
}
