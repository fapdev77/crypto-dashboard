import React from 'react';
import Big from 'big.js';
import { BybitTransactionLogEntry } from '../../../types';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import { useTokenUsdPrice } from '../../../hooks/useTokenUsdPrice';
import { AppTooltip } from '../../ui/Tooltip';
import { CoinIcon } from '../../ui/CoinIcon';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { usePrivacy } from '../../../context/PrivacyContext';
import { ChevronDown, ChevronUp, Hash, FileText, Percent, Gift } from 'lucide-react';
import { TX_TYPES, typeColorMap } from './BybitTransactionFilters';

interface Props {
  entry: BybitTransactionLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

export function BybitTransactionRow({ entry, isExpanded, onToggle }: Props) {
  const formatCurrency = useFormatCurrency();
  const usdPrice = useTokenUsdPrice(entry.currency);
  const { keys } = useApiKeysStore();
  const { isPrivateMode } = usePrivacy();
  const connectionLabel = keys.find(k => k.id === entry.connectionId)?.label || entry.label;

  // Inverse detection: category='inverse' or non-USD currency (BTC, ETH, SOL)
  const isInverse = entry.category === 'inverse' || (entry.currency !== 'USDT' && entry.currency !== 'USDC' && entry.currency !== '');

  const d = new Date(entry.transactionTime);
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = d.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });

  const isBuy = entry.side === 'Buy';
  const sideColor = isBuy ? 'text-[#00C853]' : entry.side === 'Sell' ? 'text-[#FF4444]' : 'text-[#8E9299]';

  const fundingNum = new Big(entry.funding || '0');
  const feeNum = new Big(entry.fee || '0');
  const cashFlowNum = new Big(entry.cashFlow || '0');
  const changeNum = new Big(entry.change || '0');
  const balanceNum = new Big(entry.cashBalance || '0');

  const qtyNum = new Big(entry.qty || '0');
  const sizeNum = new Big(entry.size || '0');
  const priceNum = new Big(entry.tradePrice || '0');

  // ─── Formatting helpers ───
  // Inverse: qty/size are in USD → format as 'usd'
  // Linear: qty/size are in coin → format as 'crypto'
  const fmtQty = () => {
    if (isPrivateMode) return '****';
    if (isInverse) return formatCurrency(qtyNum.toNumber(), 'usd');
    return formatCurrency(qtyNum.toNumber(), 'crypto', 8) + (entry.currency ? ` ${entry.currency}` : '');
  };

  const fmtSize = () => {
    if (isPrivateMode) return '****';
    if (isInverse) return formatCurrency(sizeNum.toNumber(), 'usd');
    return formatCurrency(sizeNum.toNumber(), 'crypto', 8) + (entry.currency ? ` ${entry.currency}` : '');
  };

  // Price is always in USD
  const fmtPrice = () => {
    if (priceNum.eq(0)) return '-';
    return formatCurrency(priceNum.toNumber(), 'usd');
  };

  // Inverse: funding/fee/cashFlow/change/balance are in coin → format as crypto
  // Linear: funding/fee/cashFlow/change/balance are in USD → format as 'usd'
  const fmtFinancial = (val: Big) => {
    if (isPrivateMode) return '****';
    if (isInverse) return formatCurrency(val.toNumber(), 'crypto', 8) + (entry.currency ? ` ${entry.currency}` : '');
    return formatCurrency(val.toNumber(), 'usd');
  };

  // USD approximation for inverse contract coin-denominated values
  const fmtUsdApprox = (val: Big) => {
    if (isPrivateMode || !usdPrice || val.eq(0)) return null;
    const usdVal = val.mul(usdPrice);
    return `≈ ${formatCurrency(usdVal.toNumber(), 'usd')}`;
  };

  const typeClass = typeColorMap[entry.type] || 'text-[#8E9299] bg-[#2a2b30]/50 border-[#2a2b30]';
  const typeLabel = TX_TYPES.find(t => t.value === entry.type)?.label || entry.type;

  return (
    <div
      className="bg-[#151619] border border-[#2a2b30] rounded-xl flex flex-col cursor-pointer transition-colors hover:border-[#3a3b40]"
      onClick={onToggle}
    >
      <div className="p-4 grid grid-cols-2 lg:grid-cols-8 gap-4 items-start">
        {/* Col 1: Time */}
        <div className="flex flex-col gap-1 col-span-2 lg:col-span-1">
          <AppTooltip description="Transaction timestamp (UTC)">
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Time
            </span>
          </AppTooltip>
          <span className="text-white text-sm font-sans">{dateStr}</span>
          <span className="text-[10px] text-[#8E9299] font-mono">{timeStr}</span>
        </div>

        {/* Col 2: Currency (ccy) + Contract (symbol) */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <AppTooltip description={`Currency (${entry.currency}) and contract symbol`}>
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Currency · Symbol
            </span>
          </AppTooltip>
          <div className="flex items-center gap-2">
            <CoinIcon symbol={entry.symbol || entry.currency} size={20} className="w-5 h-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-white text-xs font-semibold">{entry.currency}</span>
              {entry.symbol && <span className="text-[10px] text-[#8E9299] truncate max-w-[80px]">{entry.symbol}</span>}
            </div>
          </div>
          <span className="w-max px-1.5 py-0.5 text-[9px] rounded font-semibold border text-white bg-white/10 border-white/20">
            {entry.label}
          </span>
        </div>

        {/* Col 3: Type (type) */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <AppTooltip description="Transaction type and product category">
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Type · Category
            </span>
          </AppTooltip>
          <span className={`w-max px-1.5 py-0.5 text-[9px] rounded font-semibold border ${typeClass}`}>
            {typeLabel}
          </span>
          {entry.category && (
            <span className="text-[9px] text-[#8E9299] uppercase tracking-wider">{entry.category}</span>
          )}
        </div>

        {/* Col 4: Direction (side) + Quantity (qty) */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <AppTooltip description={`Trade direction and quantity ${isInverse ? '(in USD)' : `(in ${entry.currency || 'coin'})`}`}>
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Dir · Qty
            </span>
          </AppTooltip>
          <span className={`text-xs font-mono ${sideColor}`}>
            {entry.side === 'None' ? '-' : entry.side}
          </span>
          <span className="text-[10px] font-mono text-[#8E9299]">{fmtQty()}</span>
        </div>

        {/* Col 5: Filled Price (tradePrice) + Position (size) */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <AppTooltip description={`Trade execution price and remaining position size ${isInverse ? '(in USD)' : `(in ${entry.currency || 'coin'})`}`}>
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Price · Size
            </span>
          </AppTooltip>
          <span className="text-xs text-white font-mono">{fmtPrice()}</span>
          <span className="text-[10px] font-mono text-[#8E9299]">{fmtSize()}</span>
        </div>

        {/* Col 6: Funding + Fee */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <AppTooltip description={`Funding fee and trading fee. Values in ${isInverse ? entry.currency : 'USD'}${isInverse && usdPrice ? `. 1 ${entry.currency} ≈ ${formatCurrency(usdPrice, 'usd')}` : ''}.`}>
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Funding · Fee
            </span>
          </AppTooltip>
          <span className={`text-xs font-mono ${fundingNum.gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
            {fmtFinancial(fundingNum)}
          </span>
          {isInverse && fmtUsdApprox(fundingNum) && (
            <span className="text-[8px] font-mono text-[#8E9299]">{fmtUsdApprox(fundingNum)}</span>
          )}
          <span className={`text-[10px] font-mono ${feeNum.gte(0) ? 'text-[#FF4444]' : 'text-[#00C853]'}`}>
            {fmtFinancial(feeNum)}
          </span>
          {isInverse && fmtUsdApprox(feeNum) && (
            <span className="text-[8px] font-mono text-[#8E9299]">{fmtUsdApprox(feeNum)}</span>
          )}
        </div>

        {/* Col 7: Cash Flow + Change */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <AppTooltip description={`Cash flow and Net change (cashFlow + funding - fee). Values in ${isInverse ? entry.currency : 'USD'}${isInverse && usdPrice ? `. USD approx: multiply by ${formatCurrency(usdPrice, 'usd')}` : ''}.`}>
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Cash Flow · Change
            </span>
          </AppTooltip>
          <span className={`text-xs font-mono ${cashFlowNum.gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
            {fmtFinancial(cashFlowNum)}
          </span>
          {isInverse && fmtUsdApprox(cashFlowNum) && (
            <span className="text-[8px] font-mono text-[#8E9299]">{fmtUsdApprox(cashFlowNum)}</span>
          )}
          <span className={`text-[10px] font-mono ${changeNum.gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
            {fmtFinancial(changeNum)}
          </span>
          {isInverse && fmtUsdApprox(changeNum) && (
            <span className="text-[8px] font-mono text-[#8E9299]">{fmtUsdApprox(changeNum)}</span>
          )}
        </div>

        {/* Col 8: Wallet Balance + Expand */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <div className="flex items-center justify-between w-full">
            <AppTooltip description={`Wallet balance after this transaction (cashBalance). Value in ${isInverse ? entry.currency : 'USD'}${isInverse && usdPrice ? `. USD approx: multiply by ${formatCurrency(usdPrice, 'usd')}` : ''}.`}>
              <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
                Wallet Balance
              </span>
            </AppTooltip>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#8E9299] shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#8E9299] shrink-0" />
            )}
          </div>
          <span className="text-sm font-mono text-white font-semibold">
            {fmtFinancial(balanceNum)}
          </span>
          {isInverse && fmtUsdApprox(balanceNum) && (
            <span className="text-[9px] font-mono text-[#8E9299]">{fmtUsdApprox(balanceNum)}</span>
          )}
          <span className="text-[9px] text-[#8E9299] font-mono">{entry.currency}</span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div
          className="px-4 pb-4 pt-1 bg-[#12131a] border-t border-[#2a2b30]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-5 gap-x-4 text-sm mt-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-[#8E9299]" />
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Trade ID</span>
              </div>
              <span className="text-white font-mono text-xs truncate max-w-[180px]" title={entry.tradeId}>
                {entry.tradeId || '--'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-[#8E9299]" />
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Order ID</span>
              </div>
              <span className="text-white font-mono text-xs truncate max-w-[180px]" title={entry.orderId}>
                {entry.orderId || '--'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Percent className="w-3 h-3 text-[#8E9299]" />
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Fee Rate</span>
              </div>
              <span className="text-white font-mono text-xs">{entry.feeRate || '--'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Gift className="w-3 h-3 text-[#8E9299]" />
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Bonus Change</span>
              </div>
              <span className="text-white font-mono text-xs">{entry.bonusChange || '0'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Order Link ID</span>
              <span className="text-white font-mono text-xs truncate max-w-[180px]" title={entry.orderLinkId}>
                {entry.orderLinkId || '--'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Account</span>
              <span className="text-white font-mono text-xs">{connectionLabel}</span>
            </div>

            <div className="flex flex-col gap-1">
              <AppTooltip description="Transaction sub-type (e.g. movePosition)">
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max cursor-help">Sub Type</span>
              </AppTooltip>
              <span className="text-white font-mono text-xs">{entry.transSubType || '--'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
