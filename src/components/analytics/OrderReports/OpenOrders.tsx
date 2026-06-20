import React, { useState } from 'react';
import { useOrderReports, OrderFilters } from '../../../hooks/useOrderReports';
import { OrderFilters as OrderFiltersUI } from './OrderFilters';
import { OrdersTable } from './OrdersTable';
import { ArrowLeftRight } from 'lucide-react';

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
