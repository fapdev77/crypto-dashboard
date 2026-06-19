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
    <div className="w-full flex flex-col gap-6 pb-8 h-full bg-white dark:bg-[#0b0c10] text-gray-900 dark:text-white rounded-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 md:p-6 pb-2">
         <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
           <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
           Open Orders
         </h2>
      </div>

      <div className="px-4 md:px-6">
        <OrderFiltersUI filters={filters} setFilters={setFilters} showPeriod={false} />
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
