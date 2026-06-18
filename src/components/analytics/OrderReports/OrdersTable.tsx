import React, { useState } from 'react';
import { UnifiedOrder } from '../../../types';
import { OrderRow } from './OrderRow';
import { Loader2 } from 'lucide-react';

interface Props {
  orders: UnifiedOrder[];
  loading: boolean;
}

export function OrdersTable({ orders, loading }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex-1">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-[#2a2b30] sticky top-0 bg-white dark:bg-[#0b0c10] z-10">
          <tr>
            <th className="py-3 font-normal px-4">Symbol</th>
            <th className="py-3 font-normal px-4">Exchange</th>
            <th className="py-3 font-normal px-4">Type</th>
            <th className="py-3 font-normal px-4">Side</th>
            <th className="py-3 font-normal px-4 text-right">Price</th>
            <th className="py-3 font-normal px-4 text-right">Amount</th>
            <th className="py-3 font-normal px-4 text-right">Filled</th>
            <th className="py-3 font-normal px-4 text-right">Status</th>
            <th className="py-3 font-normal px-4 text-center">Time</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <OrderRow 
              key={order.id} 
              order={order} 
              isExpanded={expandedId === order.id}
              onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
            />
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={9} className="py-10 text-center text-gray-500">
                Nenhum dado encontrado para os filtros selecionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
