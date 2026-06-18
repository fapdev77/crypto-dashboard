import React from 'react';
import { UnifiedOrder } from '../../../types';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import Big from 'big.js';
import { AppTooltip } from '../../ui/Tooltip';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { CoinIcon } from '../../ui/CoinIcon';
import { useApiKeysStore } from '../../../store/apiKeysStore';

interface Props {
  key?: React.Key;
  order: UnifiedOrder;
  isExpanded: boolean;
  onToggle: () => void;
}

export function OrderRow({ order, isExpanded, onToggle }: Props) {
  const formatCurrency = useFormatCurrency();
  const { keys } = useApiKeysStore();
  const connectionLabel = keys.find(k => k.id === order.connectionId)?.label || order.connectionId;

  const isBuy = order.side === 'buy';
  const sideColor = isBuy ? 'text-green-600 dark:text-green-500' : 'text-red-500 dark:text-pink-500';
  const sideText = isBuy 
    ? (order.positionSide === 'long' ? 'Open Long' : order.positionSide === 'short' ? 'Close Short' : 'Buy')
    : (order.positionSide === 'short' ? 'Open Short' : order.positionSide === 'long' ? 'Close Long' : 'Sell');

  const statusColorMap: Record<string, string> = {
    NEW: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-400/10 border-indigo-200 dark:border-indigo-400/20',
    FILLED: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-400/20',
    CANCELLED: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    PARTIALLY_FILLED: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-400/10 border-yellow-200 dark:border-yellow-400/20',
    REJECTED: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-400/10 border-red-200 dark:border-red-400/20',
    TRIGGERED: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/10 border-blue-200 dark:border-blue-400/20',
    UNTRIGGERED: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-400/10 border-orange-200 dark:border-orange-400/20'
  };
  const statusClass = statusColorMap[order.status] || 'text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';

  const progress = order.qty > 0 ? new Big(order.filledQty).div(new Big(order.qty)).times(100).toNumber() : 0;
  
  const d = new Date(order.createdTime);
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <React.Fragment>
      <tr 
        onClick={onToggle}
        className={`border-b border-gray-50 dark:border-[#2a2b30]/50 hover:bg-gray-50 dark:hover:bg-[#2a2b30]/20 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50 dark:bg-[#2a2b30]/10' : ''}`}
      >
        <td className="px-4 py-4 font-bold text-[15px]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <CoinIcon symbol={order.symbol} className="w-5 h-5 rounded-full" />
              <span className="text-gray-900 dark:text-gray-200">{order.symbol}</span>
            </div>
            <span className="text-[10px] text-gray-500 ml-7 tracking-tight">{order.category}</span>
          </div>
        </td>
        <td className="px-4 py-4">
          <div data-theme={order.exchange.toLowerCase()} className="flex items-center gap-2 text-brand-normal font-medium">
             <ExchangeIcon exchange={order.exchange} className="w-4 h-4 rounded-sm" />
             <span className="capitalize">{order.exchange}</span>
          </div>
        </td>
        <td className="px-4 py-4">
          <span className="text-gray-800 dark:text-gray-300 font-medium truncate max-w-[120px] block">
            {connectionLabel}
          </span>
        </td>
        <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
           {order.type}
           {order.reduceOnly && (
              <AppTooltip description="This order will only reduce your position size.">
                <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded cursor-help font-medium">Reduce</span>
              </AppTooltip>
           )}
        </td>
        <td className={`px-4 py-4 font-medium ${sideColor}`}>
          {sideText}
        </td>
        <td className="px-4 py-4 text-right">
          <div className="flex flex-col items-end">
            <span className="text-gray-900 dark:text-gray-200 font-mono text-sm tracking-tight">
              {order.price > 0 ? formatCurrency(order.price, 'crypto', 8) : 'Market'}
            </span>
            {order.triggerPrice ? (
              <AppTooltip description="Price at which this order is triggered on the exchange.">
                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-mono cursor-help">
                  Trig: {formatCurrency(order.triggerPrice, 'crypto', 8)}
                </span>
              </AppTooltip>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-4 text-right text-gray-900 dark:text-gray-200 font-mono text-sm tracking-tight">
          {formatCurrency(order.qty, 'crypto', 8)}
        </td>
        <td className="px-4 py-4 text-right">
          <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-2">
               <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">{progress.toFixed(1)}%</span>
             </div>
             <div className="w-16 h-1.5 bg-gray-200 dark:bg-[#1a1c23] rounded-full overflow-hidden border border-gray-300 dark:border-gray-800">
                <div className="h-full bg-indigo-500" style={{ width: `${progress}%` }} />
             </div>
          </div>
        </td>
        <td className="px-4 py-4 text-right">
          <span className={`px-2 py-1 text-[11px] rounded font-semibold border ${statusClass}`}>
            {order.status}
          </span>
        </td>
        <td className="px-4 py-4 text-center">
          <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400">
            <span>{dateStr}</span>
            <span className="font-mono">{timeStr}</span>
          </div>
        </td>
      </tr>
      
      {isExpanded && (
        <tr>
          <td colSpan={10} className="p-0 border-b border-gray-50 dark:border-[#2a2b30]/50">
            <div className="bg-gray-50/80 dark:bg-[#111216]/50 px-6 py-5 flex flex-wrap gap-x-12 gap-y-4 shadow-inner">
                
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 text-xs tracking-wider uppercase font-medium">Order ID</span>
                  <AppTooltip description="Original Order ID from Exchange">
                    <span className="text-gray-800 dark:text-gray-300 font-mono text-sm truncate max-w-[150px] cursor-help">
                       {order.exchangeOrderId}
                    </span>
                  </AppTooltip>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 text-xs tracking-wider uppercase font-medium">Connection ID</span>
                  <span className="text-gray-800 dark:text-gray-300 font-mono text-sm truncate max-w-[150px]">{order.connectionId}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 text-xs tracking-wider uppercase font-medium">Avg Fill Price</span>
                  <span className="text-gray-800 dark:text-gray-300 font-mono text-sm">{order.avgPrice > 0 ? formatCurrency(order.avgPrice, 'crypto', 8) : '--'}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 text-xs tracking-wider uppercase font-medium">Value / Fees</span>
                  <div className="flex flex-col">
                    <span className="text-gray-800 dark:text-gray-300 font-mono text-sm">Val: {order.value ? formatCurrency(order.value, 'usd') : '--'}</span>
                    <span className="text-gray-500 dark:text-gray-400 font-mono text-xs mt-0.5">Fee: {order.fees ? formatCurrency(order.fees, 'usd') : '--'}</span>
                  </div>
                </div>

            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}
