import React, { useState, useMemo } from 'react';
import { useOrderReports, OrderFilters } from '../../../hooks/useOrderReports';
import { OrderFilters as OrderFiltersUI } from './OrderFilters';
import { OrdersTable } from './OrdersTable';
import { ArrowLeftRight } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import Big from 'big.js';
import { AppTooltip } from '../../ui/Tooltip';

export function OpenOrders() {
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
        valUsd = o.qty; // INVERSE qty is in USD
      } else {
        valUsd = o.value || (o.price > 0 ? Number(new Big(o.qty).times(o.price)) : 0);
      }
      totalVolume += valUsd;
    });

    return { buyCount, sellCount, limitCount, marketCount, conditionalCount, totalVolume };
  }, [orders]);

  const SIDE_DONUT = [
    { name: 'Buy', value: stats.buyCount, color: '#00C853' },
    { name: 'Sell', value: stats.sellCount, color: '#FF4444' }
  ];

  const TYPE_DONUT = [
    { name: 'Limit', value: stats.limitCount, color: '#2F6BFF' },
    { name: 'Market', value: stats.marketCount, color: '#FFB300' },
    { name: 'Conditional', value: stats.conditionalCount, color: '#9C27B0' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
         <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
           <ArrowLeftRight className="w-5 h-5 text-[#2F6BFF]" />
           Open Orders
         </h2>
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
                <span className="text-2xl text-[#8E9299]">Total Orders: </span>
                <span className="text-xl font-medium text-white">{orders.length}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="flex text-[15px] gap-2 font-mono mt-1">
                  <span className="text-[#00C853]">{stats.buyCount} Buys ({((stats.buyCount / orders.length) * 100 || 0).toFixed(0)}%)</span>
                  <span className="text-[#8E9299]"> | </span>
                  <span className="text-[#FF4444]">{stats.sellCount} Sells ({((stats.sellCount / orders.length) * 100 || 0).toFixed(0)}%)</span>
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
              <span className="text-2xl text-[#8E9299]">Order Types</span>
              <div className="flex flex-col text-[13px] gap-0.5 font-mono mt-1">
                <span className="text-[#2F6BFF]">Limit: {stats.limitCount}</span>
                <span className="text-[#FFB300]">Market: {stats.marketCount}</span>
                <span className="text-[#9C27B0]">Conditional: {stats.conditionalCount}</span>
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
              <span className="text-2xl text-[#8E9299] w-max cursor-help border-b border-dashed border-[#8E9299]/50">Total Est. Value</span>
            </AppTooltip>
            <span className="text-xl font-medium text-white mt-1">
              {formatCurrency(stats.totalVolume, 'usd')}
            </span>
            <span className="text-xs text-[#8E9299] mt-2">
              Based on execution at limit trigger price
            </span>
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
