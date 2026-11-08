import React, { useState, useMemo } from 'react';
import { useOrderReports, OrderFilters } from '../../../hooks/useOrderReports';
import { OrderFilters as OrderFiltersUI } from './OrderFilters';
import { OrdersTable } from './OrdersTable';
import { ArrowLeftRight } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import Big from 'big.js';
import { AppTooltip } from '../../ui/Tooltip';
import { detectQtyIsCoin } from '../../../utils/inverseUtils';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../../ui/Pagination';
import { SimulationModeBadge } from '../../ui/SimulationModeBadge';
import { useTranslation } from 'react-i18next';

export function OpenOrders() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<OrderFilters>({
    exchange: 'All',
    instrument: 'All',
    symbols: '',
    type: 'All',
    side: 'All',
    status: 'OPEN',
    timePeriod: 0,
    accountId: 'All'
  });

  // Orders come directly from the global background polling cache — no fetch required on mount.
  const { orders, loading, error } = useOrderReports(filters);
  const formatCurrency = useFormatCurrency();

  const { page: currentPage, setPage: setCurrentPage, paginated: paginatedOrders, totalItems } = usePagination(
    orders,
    50,
    [filters]
  );

  const stats = useMemo(() => {
    let buyCount = 0;
    let sellCount = 0;
    let limitCount = 0;
    let marketCount = 0;
    let conditionalCount = 0;
    let totalVolume = 0;

    orders.forEach(o => {
      if (o.side === 'buy') buyCount++;
      else if (o.side === 'sell') sellCount++;

      if (o.type === 'LIMIT') limitCount++;
      else if (o.type === 'MARKET') marketCount++;
      else conditionalCount++;

      let valUsd = 0;
      if (o.category === 'INVERSE') {
        if (o.exchange === 'bitget') {
          const rawQuoteVol = o.raw?.quoteVolume ? parseFloat(o.raw.quoteVolume) : 0;
          valUsd = rawQuoteVol > 0 ? rawQuoteVol : (o.value && o.value > 0 && o.value !== o.qty * o.price ? o.value : o.qty);
        } else {
          const qtyIsCoin = detectQtyIsCoin({ exchange: o.exchange, qty: o.qty, price: o.price, value: o.value });

          if (qtyIsCoin) {
            valUsd = o.value || (o.price > 0 ? Number(new Big(o.qty).times(o.price)) : 0);
          } else {
            valUsd = o.qty;
          }
        }
      } else {
        valUsd = o.value || (o.price > 0 ? Number(new Big(o.qty).times(o.price)) : 0);
      }
      totalVolume += valUsd;
    });

    return { buyCount, sellCount, limitCount, marketCount, conditionalCount, totalVolume };
  }, [orders]);

  const SIDE_DONUT = [
    { name: t('orders.buy', 'Buy'), value: stats.buyCount, color: '#00C853' },
    { name: t('orders.sell', 'Sell'), value: stats.sellCount, color: '#FF4444' }
  ];

  const TYPE_DONUT = [
    { name: t('orders.types.limit', 'Limit'), value: stats.limitCount, color: '#2F6BFF' },
    { name: t('orders.types.market', 'Market'), value: stats.marketCount, color: '#FFB300' },
    { name: t('orders.types.conditional', 'Conditional'), value: stats.conditionalCount, color: '#9C27B0' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
              <ArrowLeftRight className="w-5 h-5 text-[#2F6BFF]" />
              {t('orders.openOrdersTitle', 'Open Orders')}
            </h2>
            <SimulationModeBadge />
          </div>
        </div>
      </div>

      <div className="px-0">
        <OrderFiltersUI filters={filters} setFilters={setFilters} showPeriod={false} />
      </div>

      {orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          {/* Total Orders / Sides */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
            <div className='flex flex-col'>
              <div className="flex items-center gap-2">
                <span className="text-2xl text-[#8E9299]">{t('orders.stats.totalOrders', 'Total Orders')}: </span>
                <span className="text-xl font-medium text-white">{orders.length}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="flex text-[15px] gap-2 font-mono mt-1">
                  <span className="text-[#00C853]">{stats.buyCount} {t('orders.stats.buyCount', 'Buy')} ({((stats.buyCount / orders.length) * 100 || 0).toFixed(0)}%)</span>
                  <span className="text-[#8E9299]"> | </span>
                  <span className="text-[#FF4444]">{stats.sellCount} {t('orders.stats.sellCount', 'Sell')} ({((stats.sellCount / orders.length) * 100 || 0).toFixed(0)}%)</span>
                </div>
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
                    {SIDE_DONUT.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order Types */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
            <div className='flex flex-col'>
              <span className="text-2xl text-[#8E9299]">{t('orders.allTypes', 'Order Types')}</span>
              <div className="flex flex-col text-[13px] gap-0.5 font-mono mt-1">
                <span className="text-[#2F6BFF]">{t('orders.stats.limitCount', 'Limit')}: {stats.limitCount}</span>
                <span className="text-[#FFB300]">{t('orders.stats.marketCount', 'Market')}: {stats.marketCount}</span>
                <span className="text-[#9C27B0]">{t('orders.stats.conditionalCount', 'Conditional')}: {stats.conditionalCount}</span>
              </div>
            </div>
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161b22', border: '1px solid #2a2b30', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Pie data={TYPE_DONUT} cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" dataKey="value" stroke="none">
                    {TYPE_DONUT.map((entry, index) => <Cell key={`type-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Total Value */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
            <AppTooltip description="The total estimated USD value of all open orders, calculated based on their limit trigger prices.">
              <span className="text-2xl text-[#8E9299] w-max cursor-help border-b border-dashed border-[#8E9299]/50">{t('orders.stats.totalVolume', 'Est. Total Volume')}</span>
            </AppTooltip>
            <span className="text-xl font-medium text-white mt-1">
              {formatCurrency(stats.totalVolume, 'usd')}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 text-red-200 rounded text-sm">
          {error}
        </div>
      )}

      {totalItems > 5 && (
        <div className="mb-2">
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={50}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto hide-scrollbar">
        <OrdersTable orders={paginatedOrders} loading={loading} />
      </div>

      {totalItems > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={50}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
