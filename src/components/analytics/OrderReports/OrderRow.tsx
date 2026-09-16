import React from 'react';
import { UnifiedOrder } from '../../../types';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import Big from 'big.js';
import { AppTooltip } from '../../ui/Tooltip';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { CoinIcon } from '../../ui/CoinIcon';
import { AccountTypeBadge } from '../../ui/AccountTypeBadge';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { AssetClassifierAggregator } from '../../../services/AssetClassifierAggregator';
import { extractBaseCoin } from '../../../utils/unifiers';
import { detectQtyIsCoin } from '../../../utils/inverseUtils';
import { usePositionsStore } from '../../../store/positionsStore';
import { formatDateTime, formatFullDateTime } from '../../../utils/formatters';

interface Props {
  key?: React.Key;
  order: UnifiedOrder;
  isExpanded: boolean;
  onToggle: () => void;
}

export function OrderRow({ order, isExpanded, onToggle }: Props) {
  const formatCurrency = useFormatCurrency();
  const { keys } = useApiKeysStore();
  const connectionLabel = order.label || keys.find(k => k.id === order.connectionId)?.label || order.connectionId;

  const activePositions = Object.values(usePositionsStore.getState().positions);
  const matchingPos = activePositions.find(p => p.connectionId === order.connectionId && p.symbol === order.symbol);
  const orderLeverage = order.leverage || matchingPos?.leverage || 1;
  const orderMarginMode = order.marginMode || matchingPos?.marginMode || 'cross';
  const capitalizedMarginMode = orderMarginMode === 'cross' ? 'Cross' : orderMarginMode === 'isolated' ? 'Isolated' : 'Cross';

  const isBuy = order.side === 'buy';
  const sideColor = isBuy ? 'text-[#00C853]' : 'text-[#FF4444]';
  const rawSideText = isBuy
    ? (order.positionSide === 'long' ? 'Open Long' : order.positionSide === 'short' ? 'Close Short' : 'Buy')
    : (order.positionSide === 'short' ? 'Open Short' : order.positionSide === 'long' ? 'Close Long' : 'Sell');

  const isDerivative = order.category && order.category.toUpperCase() !== 'SPOT';
  const sideText = isDerivative ? `${rawSideText} · ${orderLeverage}x · ${capitalizedMarginMode}` : rawSideText;

  const statusColorMap: Record<string, string> = {
    NEW: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
    FILLED: 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20',
    CANCELLED: 'text-[#8E9299] bg-[#2a2b30]/50 border-[#2a2b30]',
    PARTIALLY_FILLED: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    REJECTED: 'text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20',
    TRIGGERED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    UNTRIGGERED: 'text-orange-400 bg-orange-400/10 border-orange-400/20'
  };
  const statusClass = statusColorMap[order.status] || 'text-[#8E9299] bg-[#2a2b30]/50 border-[#2a2b30]';

  const progress = order.qty > 0 ? new Big(order.filledQty).div(new Big(order.qty)).times(100).toNumber() : 0;

  const { dateStr, timeStr } = formatDateTime(order.createdTime);

  const category = AssetClassifierAggregator.getGlobalCategorySync(order.symbol);

  const isInverse = order.category === 'INVERSE';
  const symbolSuffix = extractBaseCoin(order.exchange, order.symbol);

  const effPrice = order.price || order.avgPrice || 0;

  let valUsd = 0;
  let actualCoinSize = order.qty || 0;
  let filledValUsd = 0;
  let actualFilledCoinSize = order.filledQty || 0;

  const qtyIsCoin = isInverse && detectQtyIsCoin({ exchange: order.exchange, qty: order.qty, price: effPrice, value: order.value });

  if (order.exchange === 'bybit') {
    if (isInverse) {
      valUsd = order.value && order.value > 0 && effPrice > 0 ? order.value * effPrice : order.qty;
      actualCoinSize = order.value && order.value > 0 ? order.value : (effPrice > 0 ? order.qty / effPrice : 0);
      filledValUsd = order.value && order.value > 0 && effPrice > 0 ? order.value * effPrice : order.filledQty;
      actualFilledCoinSize = order.value && order.value > 0 ? order.value : (effPrice > 0 ? order.filledQty / effPrice : 0);
    } else {
      valUsd = order.value && order.value > 0 ? order.value : (effPrice > 0 ? order.qty * effPrice : 0);
      actualCoinSize = order.qty;
      filledValUsd = order.value && order.value > 0 ? order.value : (effPrice > 0 ? order.filledQty * effPrice : 0);
      actualFilledCoinSize = order.filledQty;
    }
  } else if (order.value && order.value > 0 && order.exchange !== 'bitget') {
    valUsd = order.value;
    actualCoinSize = isInverse ? (effPrice > 0 ? order.value / effPrice : order.qty) : order.qty;
    filledValUsd = order.filledQty > 0 && order.filledQty !== order.qty ? (effPrice > 0 ? order.filledQty * effPrice : 0) : order.value;
    actualFilledCoinSize = isInverse ? (effPrice > 0 ? filledValUsd / effPrice : order.filledQty) : order.filledQty;
  } else if (isInverse && !qtyIsCoin) {
    valUsd = order.qty;
    actualCoinSize = effPrice > 0 ? order.qty / effPrice : 0;
    filledValUsd = order.filledQty;
    actualFilledCoinSize = effPrice > 0 ? order.filledQty / effPrice : 0;
  } else {
    valUsd = order.value || (effPrice > 0 ? order.qty * effPrice : 0);
    actualCoinSize = order.qty;
    filledValUsd = order.filledQty > 0 ? (order.filledQty * effPrice) : 0;
    actualFilledCoinSize = order.filledQty;
  }

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl flex flex-col cursor-pointer transition-colors hover:border-[#3a3b40]" onClick={onToggle}>
      {/* Main Row */}
      <div className="p-4 grid grid-cols-2 lg:grid-cols-7 gap-4">

        {/* Col 1: Asset info */}
        <div className="flex items-center gap-3 w-full border-b border-[#2a2b30] md:border-none pb-3 md:pb-0 col-span-2 lg:col-span-1">
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="flex items-center relative">
              <CoinIcon symbol={order.symbol} size={28} className="w-7 h-7" category={category} />
              <div className="bg-[#151619] rounded-full p-0.5 absolute -bottom-1 -right-1">
                <ExchangeIcon exchange={order.exchange} className="w-3.5 h-3.5" />
              </div>
            </div>
            {(order.category && order.category !== 'All') && (
              <span className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded bg-[#2a2b30] border border-[#3a3b40] text-[#a0a5ad] uppercase">
                {order.category === 'linear' ? 'FUTURES' : order.category === 'spot' ? 'SPOT' : order.category}
              </span>
            )}
            <span className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded bg-[#2a2b30] border border-[#3a3b40] text-[#a0a5ad] uppercase">
              {category}
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-bold text-white text-sm">{order.symbol}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <span className="w-max text-[10px] font-semibold text-white bg-[#202226] border border-[#34373c] py-0.5 px-1.5 rounded-[4px] capitalize">
                {order.exchange}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className="w-max text-[10px] font-semibold text-[#a0a5ad] bg-[#202226] border border-[#34373c] py-0.5 px-1.5 rounded-[4px] truncate max-w-[120px]" title={connectionLabel}>
                {connectionLabel}
              </span>
              <AccountTypeBadge
                exchange={order.exchange}
                accountType={order.accountType || keys.find(k => k.id === order.connectionId)?.accountType}
              />
            </div>
          </div>
        </div>

        {/* Col 2: Side & Type */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
          <AppTooltip description="Indicates if the order is to buy or sell, and its type (e.g., limit, market, conditional).">
            <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Side & Type</span>
          </AppTooltip>
          <span className={`font-mono text-xs ${sideColor}`}>{sideText}</span>
          <div className="flex flex-wrap items-center gap-2 mt-0.5 max-w-[120px]">
            <span className="text-xs text-[#8E9299] font-mono">{order.type}</span>
            {order.reduceOnly && (
              <AppTooltip description="This order will only reduce your position size.">
                <span className="text-[9px] px-1 py-0.5 bg-[#2a2b30] text-[#8E9299] rounded cursor-help font-medium border border-[#3a3b40]">Reduce</span>
              </AppTooltip>
            )}
            {order.timeInForce && (
              <AppTooltip description="Time in Force">
                <span className="text-[9px] px-1 py-0.5 bg-[#2a2b30]/50 text-[#8E9299] rounded-sm font-medium border border-[#3a3b40]/50">{order.timeInForce}</span>
              </AppTooltip>
            )}
          </div>
        </div>

        {/* Col 3: Quantity */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
          <AppTooltip description="The original quantity and estimated total value of the order.">
            <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Order Qty / Value</span>
          </AppTooltip>
          <span className="font-mono text-white text-sm">{formatCurrency(actualCoinSize, 'crypto')} {symbolSuffix}</span>
          <span className="text-xs text-[#8E9299] font-mono">≈ {formatCurrency(valUsd, 'crypto', 2)} USD</span>
        </div>

        {/* Col 4: Price & Trigger */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
          <AppTooltip description="The limit price of the order, and the trigger price (if conditional).">
            <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Order Price / Trig</span>
          </AppTooltip>
          <span className="font-mono text-white text-sm">
            {order.price > 0 ? (
              formatCurrency(order.price, 'crypto', 8)
            ) : order.avgPrice > 0 ? (
              <div className="flex flex-col">
                <span>{formatCurrency(order.avgPrice, 'crypto', 8)}</span>
                <span className="text-[10px] text-[#8E9299]">Market</span>
              </div>
            ) : (
              'Market'
            )}
          </span>
          {order.triggerPrice ? (
            <span className="font-mono text-orange-400 text-xs">
              Trig: {formatCurrency(order.triggerPrice, 'crypto', 8)}
            </span>
          ) : (
            <span className="font-mono text-[#8E9299] text-xs opacity-0">-</span>
          )}
        </div>

        {/* Col 5: Filled Progress */}
        <div className="flex flex-col justify-center gap-1.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
          <AppTooltip description="Shows how much of the order has been executed by the exchange so far.">
            <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Filled Progress</span>
          </AppTooltip>
          <div className="flex flex-col gap-1 w-full max-w-[120px]">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#8E9299]">
              <span>{formatCurrency(actualFilledCoinSize, 'crypto')} {symbolSuffix}</span>
              <span className="text-white">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-[#2a2b30] rounded-full overflow-hidden w-full">
              <div className={`h-full transition-all duration-300 ${progress === 100 ? 'bg-[#00C853]' : 'bg-[#2F6BFF]'}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Col 6: Status */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
          <AppTooltip description="Current execution status of the order.">
            <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Status</span>
          </AppTooltip>
          <span className={`w-max px-2 py-0.5 text-[10px] rounded font-semibold border ${statusClass}`}>
            {order.status}
          </span>
        </div>

        {/* Col 7: Time */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
          <AppTooltip description="When the order was created on the exchange.">
            <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Created Time</span>
          </AppTooltip>
          <span className="font-sans text-white text-sm">{dateStr}</span>
          <span className="font-mono text-[#8E9299] text-xs">{timeStr}</span>
        </div>

      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 bg-[#12131a] border-t border-[#2a2b30] animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-y-5 gap-x-4 text-sm mt-4">

            <div className="flex flex-col gap-1">
              <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Order ID</span>
              <AppTooltip description="Original Order ID from Exchange">
                <div className="text-white font-mono text-sm cursor-help truncate w-max max-w-[200px]">
                  {order.exchangeOrderId}
                </div>
              </AppTooltip>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Connection</span>
              <span className="text-white font-mono text-sm truncate w-max max-w-[200px]">{connectionLabel}</span>
            </div>

            <div className="flex flex-col gap-1">
              <AppTooltip description="The actual average price at which the order was executed.">
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max cursor-help">Avg Fill Price</span>
              </AppTooltip>
              <span className="text-white font-mono text-sm">{order.avgPrice > 0 ? formatCurrency(order.avgPrice, 'crypto', 8) : '--'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <AppTooltip description="The total executed value of the order in USD.">
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max cursor-help">Total Value</span>
              </AppTooltip>
              <span className="text-white font-mono text-sm">{valUsd > 0 ? formatCurrency(valUsd, 'usd') + ' USD' : '--'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <AppTooltip description="Trading fees charged by the exchange for this order execution.">
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max cursor-help">Trading Fees</span>
              </AppTooltip>
              {(() => {
                const hasFees = order.fees !== undefined && order.fees !== null && order.fees !== 0;
                let mainFeeStr = '--';
                let subFeeStr: string | null = null;
                let isFeeNegative = false;

                if (hasFees) {
                  const rawFee = order.fees!;
                  const isCost = (order.exchange === 'okx' || order.exchange === 'bitget') ? rawFee < 0 : rawFee > 0;
                  isFeeNegative = isCost;

                  const absFee = Math.abs(rawFee);

                  if (isInverse) {
                    mainFeeStr = `${isCost ? '-' : ''}${formatCurrency(absFee, 'crypto', 8)} ${symbolSuffix}`;
                    const price = order.avgPrice || order.price || 0;
                    const feeUsd = absFee * price;
                    subFeeStr = `≈ ${isCost ? '-' : ''}${formatCurrency(feeUsd, 'usd')} USD`;
                  } else {
                    mainFeeStr = `${isCost ? '-' : ''}${formatCurrency(absFee, 'usd')} USD`;
                  }
                }

                return (
                  <div className="flex flex-col">
                    <span className={`font-mono text-sm ${isFeeNegative ? 'text-[#FF4444]' : hasFees ? 'text-[#00C853]' : 'text-white'}`}>
                      {mainFeeStr}
                    </span>
                    {subFeeStr && (
                      <span className={`font-mono text-xs ${isFeeNegative ? 'text-[#FF4444]/80' : 'text-[#00C853]/80'} mt-0.5`}>
                        {subFeeStr}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Updated Time</span>
              <span className="text-white font-mono text-sm">{formatFullDateTime(order.updatedTime)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

