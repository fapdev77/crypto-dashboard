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
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../../store/settingsStore';

interface Props {
  key?: React.Key;
  order: UnifiedOrder;
  isExpanded: boolean;
  onToggle: () => void;
}

export function OrderRow({ order, isExpanded, onToggle }: Props) {
  const { t } = useTranslation();
  const fiatCurrency = useSettingsStore(state => state.fiatCurrency) || 'USD';
  const formatCurrency = useFormatCurrency();
  const { keys } = useApiKeysStore();
  const connectionLabel = order.label || keys.find(k => k.id === order.connectionId)?.label || order.connectionId;

  const activePositions = Object.values(usePositionsStore.getState().positions);
  const matchingPos = activePositions.find(p => p.connectionId === order.connectionId && p.symbol === order.symbol);
  const orderLeverage = order.leverage || matchingPos?.leverage || 1;
  const orderMarginMode = order.marginMode || matchingPos?.marginMode || 'cross';
  const capitalizedMarginMode = orderMarginMode === 'isolated' ? t('positions.isolated', 'Isolated') : t('positions.cross', 'Cross');

  const isBuy = order.side === 'buy';
  const sideColor = isBuy ? 'text-success' : 'text-danger';
  const rawSideText = isBuy
    ? (order.positionSide === 'long' ? t('orders.openLong', 'Open Long') : order.positionSide === 'short' ? t('orders.closeShort', 'Close Short') : t('orders.buy', 'Buy'))
    : (order.positionSide === 'short' ? t('orders.openShort', 'Open Short') : order.positionSide === 'long' ? t('orders.closeLong', 'Close Long') : t('orders.sell', 'Sell'));

  const isDerivative = order.category && order.category.toUpperCase() !== 'SPOT';
  const sideText = isDerivative ? `${rawSideText} · ${orderLeverage}x · ${capitalizedMarginMode}` : rawSideText;

  const statusColorMap: Record<string, string> = {
    NEW: 'text-tone-blue bg-tone-blue/10 border-tone-blue/20',
    FILLED: 'text-success bg-success/10 border-success/20',
    CANCELLED: 'text-fg-muted bg-line/50 border-line',
    PARTIALLY_FILLED: 'text-tone-yellow bg-tone-yellow/10 border-tone-yellow/20',
    REJECTED: 'text-danger bg-danger/10 border-danger/20',
    TRIGGERED: 'text-tone-blue bg-tone-blue/10 border-tone-blue/20',
    UNTRIGGERED: 'text-tone-orange bg-tone-orange/10 border-tone-orange/20'
  };
  const statusClass = statusColorMap[order.status] || 'text-fg-muted bg-line/50 border-line';

  const progress = order.qty > 0 ? new Big(order.filledQty).div(new Big(order.qty)).times(100).toNumber() : 0;

  const { dateStr, timeStr } = formatDateTime(order.createdTime);

  const category = AssetClassifierAggregator.getGlobalCategorySync(order.symbol);

  const isInverse = order.category === 'INVERSE';
  const symbolSuffix = extractBaseCoin(order.exchange, order.symbol);

  const effPrice = order.price || order.avgPrice || 0;

  const isTp = order.type.toUpperCase().includes('TAKE_PROFIT') || order.type.toUpperCase() === 'TP';
  const isSl = order.type.toUpperCase().includes('STOP_LOSS') || order.type.toUpperCase() === 'SL';
  const isTrailing = order.type.toUpperCase().includes('TRAILING');
  const isScopeFull = order.executionScope === 'FULL_POSITION';
  const isScopePartial = order.executionScope === 'PARTIAL';

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
  } else if (order.exchange === 'bitget') {
    if (isInverse) {
      const rawQuoteVol = order.raw?.quoteVolume ? parseFloat(order.raw.quoteVolume) : 0;
      valUsd = rawQuoteVol > 0 ? rawQuoteVol : (order.value && order.value > 0 && order.value !== order.qty * effPrice ? order.value : order.qty);
      actualCoinSize = effPrice > 0 ? valUsd / effPrice : 0;
      filledValUsd = rawQuoteVol > 0 ? rawQuoteVol : (order.filledQty > 0 ? order.filledQty : 0);
      actualFilledCoinSize = effPrice > 0 ? filledValUsd / effPrice : 0;
    } else {
      valUsd = order.value && order.value > 0 ? order.value : (effPrice > 0 ? order.qty * effPrice : 0);
      actualCoinSize = order.qty;
      filledValUsd = order.value && order.value > 0 && order.filledQty === order.qty
        ? order.value
        : (effPrice > 0 ? order.filledQty * effPrice : 0);
      actualFilledCoinSize = order.filledQty;
    }
  } else if (order.value && order.value > 0) {
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
    <div className="bg-surface border border-line rounded-xl flex flex-col cursor-pointer transition-colors hover:border-line-strong" onClick={onToggle}>
      {/* Main Row */}
      <div className="p-4 grid grid-cols-2 lg:grid-cols-7 gap-4">

        {/* Col 1: Asset info */}
        <div className="flex items-center gap-3 w-full border-b border-line md:border-none pb-3 md:pb-0 col-span-2 lg:col-span-1">
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="flex items-center relative">
              <CoinIcon symbol={order.symbol} size={28} className="w-7 h-7" category={category} />
              <div className="bg-surface rounded-full p-0.5 absolute -bottom-1 -right-1">
                <ExchangeIcon exchange={order.exchange} className="w-3.5 h-3.5" />
              </div>
            </div>
            {(order.category && order.category !== 'All') && (
              <span className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded bg-line border border-line-strong text-fg-muted uppercase">
                {order.category === 'linear' ? 'FUTURES' : order.category === 'spot' ? 'SPOT' : order.category}
              </span>
            )}
            <span className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded bg-line border border-line-strong text-fg-muted uppercase">
              {category}
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-bold text-fg text-sm">{order.symbol}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <span className="w-max text-[10px] font-semibold text-fg bg-elevated border border-line-strong py-0.5 px-1.5 rounded-[4px] capitalize">
                {order.exchange}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className="w-max text-[10px] font-semibold text-fg-muted bg-elevated border border-line-strong py-0.5 px-1.5 rounded-[4px] truncate max-w-[120px]" title={connectionLabel}>
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
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-line lg:pl-4 col-span-1">
          <AppTooltip description={t('orders.tooltips.sideType')}>
            <span className="text-[10px] text-fg-muted uppercase w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('orders.side', 'Side')} & {t('orders.type', 'Type')}</span>
          </AppTooltip>
          <span className={`font-mono text-xs ${sideColor}`}>{sideText}</span>
          <div className="flex flex-wrap items-center gap-1 mt-0.5 max-w-[140px]">
            <span className="text-xs text-fg-muted font-mono">{order.type}</span>
            {isTp && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-success/10 text-success font-medium border border-success/20">
                TP
              </span>
            )}
            {isSl && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-danger/10 text-danger font-medium border border-danger/20">
                SL
              </span>
            )}
            {isTrailing && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-tone-purple/10 text-tone-purple font-medium border border-tone-purple/20">
                {t('orders.badges.trailing', 'Trailing')}
              </span>
            )}
            {isScopeFull && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-tone-cyan/10 text-tone-cyan font-medium border border-tone-cyan/20" title={t('orders.tooltips.fullPositionScope')}>
                {t('orders.badges.fullPos', 'Full Pos')}
              </span>
            )}
            {isScopePartial && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-tone-blue/10 text-tone-blue font-medium border border-tone-blue/20" title={t('orders.tooltips.partialClose')}>
                {t('orders.badges.partial', 'Partial')}{order.closeFraction ? ` ${(order.closeFraction * 100).toFixed(0)}%` : ''}
              </span>
            )}
            {order.isPositionTpsl && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-warning/10 text-tone-amber font-medium border border-warning/20" title={t('orders.tooltips.linkedTpSl')}>
                {t('orders.badges.posTpSl', 'Pos TP/SL')}
              </span>
            )}
            {order.reduceOnly && (
              <AppTooltip description={t('orders.tooltips.reduceOnly')}>
                <span className="text-[9px] px-1 py-0.5 bg-line text-fg-muted rounded cursor-help font-medium border border-line-strong">{t('orders.badges.reduce', 'Reduce')}</span>
              </AppTooltip>
            )}
            {order.timeInForce && (
              <AppTooltip description={t('orders.tooltips.timeInForce')}>
                <span className="text-[9px] px-1 py-0.5 bg-line/50 text-fg-muted rounded-sm font-medium border border-line-strong/50">{order.timeInForce}</span>
              </AppTooltip>
            )}
          </div>
        </div>

        {/* Col 3: Quantity */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-line lg:pl-4 col-span-1">
          <AppTooltip description={t('orders.tooltips.originalQuantity')}>
            <span className="text-[10px] text-fg-muted uppercase w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('orders.amount', 'Order Qty')} / {t('orders.orderValue', 'Value')}</span>
          </AppTooltip>
          <span className="font-mono text-fg text-sm">{formatCurrency(actualCoinSize, 'crypto')} {symbolSuffix}</span>
          <span className="text-xs text-fg-muted font-mono">≈ {formatCurrency(valUsd, 'usd', 2)}</span>
        </div>

        {/* Col 4: Price & Trigger */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-line lg:pl-4 col-span-1">
          <AppTooltip description={t('orders.tooltips.limitTrigger')}>
            <span className="text-[10px] text-fg-muted uppercase w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('orders.price', 'Order Price')} / {t('orders.triggerPrice', 'Trig')}</span>
          </AppTooltip>
          <span className="font-mono text-fg text-sm">
            {order.price > 0 ? (
              formatCurrency(order.price, 'crypto', 8)
            ) : order.avgPrice > 0 ? (
              <div className="flex flex-col">
                <span>{formatCurrency(order.avgPrice, 'crypto', 8)}</span>
                <span className="text-[10px] text-fg-muted">{t('orders.types.market', 'Market')}</span>
              </div>
            ) : (
              t('orders.types.market', 'Market')
            )}
          </span>
          {order.tpTriggerPrice || order.slTriggerPrice ? (
            <div className="flex flex-col text-xs font-mono">
              {order.tpTriggerPrice && (
                <span className="text-success">TP: {formatCurrency(order.tpTriggerPrice, 'crypto', 8)}</span>
              )}
              {order.slTriggerPrice && (
                <span className="text-danger">SL: {formatCurrency(order.slTriggerPrice, 'crypto', 8)}</span>
              )}
            </div>
          ) : order.triggerPrice ? (
            <span className={`font-mono text-xs ${isTp ? 'text-success' : isSl ? 'text-danger' : 'text-tone-orange'}`}>
              {t('orders.triggerShort', 'Trig:')} {formatCurrency(order.triggerPrice, 'crypto', 8)}
            </span>
          ) : (
            <span className="font-mono text-fg-muted text-xs opacity-0">-</span>
          )}
        </div>

        {/* Col 5: Filled Progress */}
        <div className="flex flex-col justify-center gap-1.5 lg:border-l border-line lg:pl-4 col-span-1">
          <AppTooltip description={t('orders.tooltips.progress')}>
            <span className="text-[10px] text-fg-muted uppercase w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('orders.filled', 'Filled')} / {t('orders.progress', 'Progress')}</span>
          </AppTooltip>
          <div className="flex flex-col gap-1 w-full max-w-[120px]">
            <div className="flex justify-between items-center text-[10px] font-mono text-fg-muted">
              <span>{formatCurrency(actualFilledCoinSize, 'crypto')} {symbolSuffix}</span>
              <span className="text-fg">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-line rounded-full overflow-hidden w-full">
              <div className={`h-full transition-all duration-300 ${progress === 100 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Col 6: Status */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-line lg:pl-4 col-span-1">
          {(() => {
            const statusKey = order.status?.toLowerCase();
            const localizedStatus =
              statusKey === 'filled' ? t('orders.statuses.filled', 'Filled') :
              statusKey === 'cancelled' ? t('orders.statuses.cancelled', 'Cancelled') :
              statusKey === 'partially_filled' ? t('orders.statuses.partiallyFilled', 'Partially Filled') :
              statusKey === 'rejected' ? t('orders.statuses.rejected', 'Rejected') :
              statusKey === 'triggered' ? t('orders.statuses.triggered', 'Triggered') :
              statusKey === 'untriggered' ? t('orders.statuses.untriggered', 'Untriggered') :
              statusKey === 'new' ? t('orders.statuses.new', 'New') :
              order.status;

            const tooltipDesc =
              statusKey === 'filled' ? t('orders.statuses.filledTooltip', 'Order filled completely.') :
              statusKey === 'cancelled' ? t('orders.statuses.cancelledTooltip', 'Order cancelled prior to full execution.') :
              statusKey === 'partially_filled' ? t('orders.statuses.partiallyFilledTooltip', 'Part of order filled; remainder awaiting fills.') :
              statusKey === 'rejected' ? t('orders.statuses.rejectedTooltip', 'Order rejected by exchange or risk engine.') :
              statusKey === 'triggered' ? t('orders.statuses.triggeredTooltip', 'Trigger price reached; order submitted to book.') :
              statusKey === 'untriggered' ? t('orders.statuses.untriggeredTooltip', 'Awaiting trigger condition before book placement.') :
              statusKey === 'new' ? t('orders.statuses.newTooltip', 'Order placed and acknowledged by exchange.') :
              t('orders.statuses.defaultTooltip', 'Current execution status of the order.');

            return (
              <>
                <AppTooltip description={tooltipDesc}>
                  <span className="text-[10px] text-fg-muted uppercase w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('orders.status', 'Status')}</span>
                </AppTooltip>
                <span className={`w-max px-2 py-0.5 text-[10px] rounded font-semibold border ${statusClass}`}>
                  {localizedStatus}
                </span>
              </>
            );
          })()}
        </div>

        {/* Col 7: Time */}
        <div className="flex flex-col justify-center gap-0.5 lg:border-l border-line lg:pl-4 col-span-1">
          <AppTooltip description={t('orders.tooltips.createdAt')}>
            <span className="text-[10px] text-fg-muted uppercase w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('orders.dateTime', 'Created Time')}</span>
          </AppTooltip>
          <span className="font-sans text-fg text-sm">{dateStr}</span>
          <span className="font-mono text-fg-muted text-xs">{timeStr}</span>
        </div>

      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 bg-elevated/70 border-t border-line animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-y-5 gap-x-4 text-sm mt-4">

            <div className="flex flex-col gap-1">
              <span className="text-fg-muted text-xs border-b border-dashed border-fg-muted/50 w-max">{t('orders.details.orderId', 'Order ID')}</span>
              <AppTooltip description={t('orders.tooltips.exchangeOrderId')}>
                <div className="text-fg font-mono text-sm cursor-help truncate w-max max-w-[200px]">
                  {order.exchangeOrderId}
                </div>
              </AppTooltip>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-fg-muted text-xs border-b border-dashed border-fg-muted/50 w-max">{t('orders.account', 'Connection')}</span>
              <span className="text-fg font-mono text-sm truncate w-max max-w-[200px]">{connectionLabel}</span>
            </div>

            <div className="flex flex-col gap-1">
              <AppTooltip description={t('orders.tooltips.avgFillPrice')}>
                <span className="text-fg-muted text-xs border-b border-dashed border-fg-muted/50 w-max cursor-help">{t('trade.filledPrice', 'Avg Fill Price')}</span>
              </AppTooltip>
              <span className="text-fg font-mono text-sm">{order.avgPrice > 0 ? formatCurrency(order.avgPrice, 'crypto', 8) : '--'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <AppTooltip description={t('orders.tooltips.executedValue', { currency: fiatCurrency })}>
                <span className="text-fg-muted text-xs border-b border-dashed border-fg-muted/50 w-max cursor-help">{t('orders.orderValue', 'Total Value')}</span>
              </AppTooltip>
              <span className="text-fg font-mono text-sm">{valUsd > 0 ? formatCurrency(valUsd, 'usd') : '--'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <AppTooltip description={t('orders.tooltips.fees')}>
                <span className="text-fg-muted text-xs border-b border-dashed border-fg-muted/50 w-max cursor-help">{t('positions.tradingFee', 'Trading Fees')}</span>
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
                    subFeeStr = `≈ ${isCost ? '-' : ''}${formatCurrency(feeUsd, 'usd')}`;
                  } else {
                    mainFeeStr = `${isCost ? '-' : ''}${formatCurrency(absFee, 'usd')}`;
                  }
                }

                return (
                  <div className="flex flex-col">
                    <span className={`font-mono text-sm ${isFeeNegative ? 'text-danger' : hasFees ? 'text-success' : 'text-fg'}`}>
                      {mainFeeStr}
                    </span>
                    {subFeeStr && (
                      <span className={`font-mono text-xs ${isFeeNegative ? 'text-danger/80' : 'text-success/80'} mt-0.5`}>
                        {subFeeStr}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-fg-muted text-xs border-b border-dashed border-fg-muted/50 w-max">{t('positionsHistory.closeTime', 'Updated Time')}</span>
              <span className="text-fg font-mono text-sm">{formatFullDateTime(order.updatedTime)}</span>
            </div>

            {order.executionScope && (
              <div className="flex flex-col gap-1">
                <span className="text-fg-muted text-xs border-b border-dashed border-fg-muted/50 w-max">{t('orders.details.scope', 'Scope')}</span>
                <span className="text-fg font-mono text-sm">
                  {order.executionScope === 'FULL_POSITION'
                    ? t('orders.details.entirePositionFull', 'Entire Position (Full)')
                    : `${t('orders.tooltips.partialClose', 'Partial Close')}${order.closeFraction ? ` (${(order.closeFraction * 100).toFixed(0)}%)` : ''}`}
                </span>
              </div>
            )}

            {order.isPositionTpsl !== undefined && (
              <div className="flex flex-col gap-1">
                <span className="text-fg-muted text-xs border-b border-dashed border-fg-muted/50 w-max">{t('orders.details.positionTpSl', 'Position TP/SL')}</span>
                <span className="text-fg font-mono text-sm">
                  {order.isPositionTpsl
                    ? t('orders.details.positionLevelTpSl', 'Position-level TP/SL')
                    : t('orders.details.independentOrder', 'Independent Order')}
                </span>
              </div>
            )}

            {order.tpTriggerPrice !== undefined && (
              <div className="flex flex-col gap-1">
                <span className="text-fg-muted text-xs border-b border-dashed border-fg-muted/50 w-max">{t('orders.details.tpTrigger', 'TP Trigger')}</span>
                <span className="text-success font-mono text-sm">{formatCurrency(order.tpTriggerPrice, 'crypto', 8)}</span>
              </div>
            )}

            {order.slTriggerPrice !== undefined && (
              <div className="flex flex-col gap-1">
                <span className="text-fg-muted text-xs border-b border-dashed border-fg-muted/50 w-max">{t('orders.details.slTrigger', 'SL Trigger')}</span>
                <span className="text-danger font-mono text-sm">{formatCurrency(order.slTriggerPrice, 'crypto', 8)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

