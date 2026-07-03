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

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl flex-1">
        <p className="text-[#8E9299]">No Open Orders found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 flex-1 pb-4">
      {orders.map(order => (
        <OrderRow 
          key={order.id} 
          order={order} 
          isExpanded={expandedId === order.id}
          onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
        />
      ))}
    </div>
  );
}

