import React from 'react';
import Big from 'big.js';
import { OkxTransactionLogEntry } from '../../../types';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import { useTokenUsdPrice } from '../../../hooks/useTokenUsdPrice';
import { AppTooltip } from '../../ui/Tooltip';
import { CoinIcon } from '../../ui/CoinIcon';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { usePrivacy } from '../../../context/PrivacyContext';
import { ChevronDown, ChevronUp, Hash, FileText, Percent, Gift } from 'lucide-react';
import { OKX_TX_TYPES, okxTypeColorMap } from './OkxTransactionFilters';
import { formatDateTime } from '../../../utils/formatters';

interface Props {
  entry: OkxTransactionLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

export function OkxTransactionRow({ entry, isExpanded, onToggle }: Props) {
  const formatCurrency = useFormatCurrency();
  const usdPrice = useTokenUsdPrice(entry.currency);
  const { keys } = useApiKeysStore();
  const { isPrivateMode } = usePrivacy();
  const connectionLabel = keys.find(k => k.id === entry.connectionId)?.label || entry.label;

  const isInverse = (entry.currency !== 'USDT' && entry.currency !== 'USDC' && entry.currency !== 'USD' && entry.currency !== '');

  const { dateStr, timeStr } = formatDateTime(entry.transactionTime);

  const sideLower = (entry.side || '').toLowerCase();
  const isBuy = sideLower.includes('buy') || sideLower.includes('long') || sideLower.includes('in');
  const isSell = sideLower.includes('sell') || sideLower.includes('short') || sideLower.includes('out');
  const sideColor = isBuy ? 'text-[#00C853]' : isSell ? 'text-[#FF4444]' : 'text-[#8E9299]';

  const fundingNum = new Big(entry.funding || '0');
  const feeNum = new Big(entry.fee || '0');
  const cashFlowNum = new Big(entry.cashFlow || entry.change || '0');
  const changeNum = new Big(entry.change || entry.amount || '0');
  const balanceNum = new Big(entry.cashBalance || entry.balance || '0');

  const qtyNum = new Big(entry.qty || entry.amount || '0');
  const sizeNum = new Big(entry.size || '0');
  const priceNum = new Big(entry.tradePrice || '0');

  // ─── Formatting helpers ───
  const fmtQty = () => {
    if (isPrivateMode) return '****';
    if (qtyNum.eq(0)) return '-';
    if (isInverse) return formatCurrency(qtyNum.toNumber(), 'usd');
    return formatCurrency(qtyNum.toNumber(), 'crypto', 8) + (entry.currency ? ` ${entry.currency}` : '');
  };

  const fmtSize = () => {
    if (isPrivateMode) return '****';
    if (sizeNum.eq(0)) return '-';
    if (isInverse) return formatCurrency(sizeNum.toNumber(), 'usd');
    return formatCurrency(sizeNum.toNumber(), 'crypto', 8) + (entry.currency ? ` ${entry.currency}` : '');
  };

  const fmtPrice = () => {
    if (priceNum.eq(0)) return '-';
    return formatCurrency(priceNum.toNumber(), 'usd');
  };

  const fmtFinancial = (val: Big) => {
    if (isPrivateMode) return '****';
    if (isInverse) return formatCurrency(val.toNumber(), 'crypto', 8) + (entry.currency ? ` ${entry.currency}` : '');
    return formatCurrency(val.toNumber(), 'usd');
  };

  const fmtUsdApprox = (val: Big) => {
    if (isPrivateMode || !usdPrice || val.eq(0)) return null;
    const usdVal = val.mul(usdPrice);
    return `≈ ${formatCurrency(usdVal.toNumber(), 'usd')}`;
  };

  const typeClass = okxTypeColorMap[entry.type] || 'text-[#8E9299] bg-[#2a2b30]/50 border-[#2a2b30]';
  const typeLabel = OKX_TX_TYPES.find(t => t.value === entry.type)?.label || (entry.type ? entry.type.replace(/_/g, ' ') : '-');

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
          <AppTooltip description={`Currency (${entry.currency || 'USDT'}) and trading pair`}>
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Currency & Symbol
            </span>
          </AppTooltip>
          <div className="flex items-center gap-2">
            <CoinIcon symbol={entry.symbol || entry.currency || 'USDT'} size={20} className="w-5 h-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-white text-xs font-semibold">{entry.currency || '-'}</span>
              {entry.symbol && <span className="text-[10px] text-white/80 truncate max-w-[80px]">{entry.symbol}</span>}
            </div>
          </div>
          <span className="w-max px-1.5 py-0.5 text-[9px] rounded font-semibold border text-white bg-white/10 border-white/20">
            {connectionLabel}
          </span>
        </div>

        {/* Col 3: Type & Category */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <AppTooltip description="Bill type and market category">
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Type & Category
            </span>
          </AppTooltip>
          <span className={`w-max px-1.5 py-0.5 text-[9px] rounded font-semibold border ${typeClass}`}>
            {typeLabel}
          </span>
          {entry.category && (
            <span className="text-[9px] text-white/80 uppercase tracking-wider">{entry.category}</span>
          )}
        </div>

        {/* Col 4: Direction (side) + Quantity (qty) */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <AppTooltip description={`Trade direction and quantity ${isInverse ? '(in USD)' : `(in ${entry.currency || 'coin'})`}`}>
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Side & Qty
            </span>
          </AppTooltip>
          <span className={`text-xs font-mono uppercase ${sideColor}`}>
            {entry.side === 'None' || !entry.side ? '-' : entry.side}
          </span>
          <span className="text-[10px] font-mono text-white/80">{fmtQty()}</span>
        </div>

        {/* Col 5: Filled Price (tradePrice) + Position (size) */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <AppTooltip description={`Trade execution price and size ${isInverse ? '(in USD)' : `(in ${entry.currency || 'coin'})`}`}>
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Filled Price & Size
            </span>
          </AppTooltip>
          <span className="text-xs text-white font-mono">{fmtPrice()}</span>
          <span className="text-[10px] font-mono text-white/80">{fmtSize()}</span>
        </div>

        {/* Col 6: Funding + Fee */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <AppTooltip description={`Funding settlement and trading fee. Values in ${isInverse ? entry.currency : 'USD'}${isInverse && usdPrice ? `. 1 ${entry.currency} ≈ ${formatCurrency(usdPrice, 'usd')}` : ''}.`}>
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Funding & Trade Fee
            </span>
          </AppTooltip>
          <span className={`text-xs font-mono ${fundingNum.gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
            {fmtFinancial(fundingNum)}
          </span>
          {isInverse && fmtUsdApprox(fundingNum) && (
            <span className="text-[8px] font-mono text-white/80">{fmtUsdApprox(fundingNum)}</span>
          )}
          <span className={`text-[10px] font-mono ${feeNum.lt(0) ? 'text-[#FF4444]' : feeNum.gt(0) ? 'text-[#00C853]' : 'text-[#8E9299]'}`}>
            {feeNum.gt(0) ? `+${fmtFinancial(feeNum)}` : fmtFinancial(feeNum)}
          </span>
          {isInverse && fmtUsdApprox(feeNum) && (
            <span className="text-[8px] font-mono text-white/80">{fmtUsdApprox(feeNum)}</span>
          )}
        </div>

        {/* Col 7: Cash Flow + Change */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <AppTooltip description={`Cash flow and Net change. Values in ${isInverse ? entry.currency : 'USD'}${isInverse && usdPrice ? `. USD approx: multiply by ${formatCurrency(usdPrice, 'usd')}` : ''}.`}>
            <span className="text-[10px] text-[#8E9299] uppercase font-semibold tracking-wider border-b border-dashed border-[#8E9299]/30 w-max cursor-help">
              Cash Flow & Change
            </span>
          </AppTooltip>
          <span className={`text-xs font-mono ${cashFlowNum.gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
            {fmtFinancial(cashFlowNum)}
          </span>
          {isInverse && fmtUsdApprox(cashFlowNum) && (
            <span className="text-[8px] font-mono text-white/80">{fmtUsdApprox(cashFlowNum)}</span>
          )}
          <span className={`text-[10px] font-mono ${changeNum.gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
            {fmtFinancial(changeNum)}
          </span>
          {isInverse && fmtUsdApprox(changeNum) && (
            <span className="text-[8px] font-mono text-white/80">{fmtUsdApprox(changeNum)}</span>
          )}
        </div>

        {/* Col 8: Wallet Balance + Expand */}
        <div className="flex flex-col gap-1 lg:border-l border-[#2a2b30] lg:pl-3 col-span-1">
          <div className="flex items-center justify-between w-full">
            <AppTooltip description={`Wallet balance after this bill. Value in ${isInverse ? entry.currency : 'USD'}${isInverse && usdPrice ? `. USD approx: multiply by ${formatCurrency(usdPrice, 'usd')}` : ''}.`}>
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
            <span className="text-[9px] font-mono text-white/80">{fmtUsdApprox(balanceNum)}</span>
          )}
          <span className="text-[9px] text-[#8E9299] font-mono">{entry.currency || 'USDT'}</span>
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
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Bill ID / Raw ID</span>
              </div>
              <span className="text-white font-mono text-xs truncate max-w-[180px]" title={entry.billId || entry.rawId}>
                {entry.billId || entry.rawId || '--'}
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
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Fee Currency / Rate</span>
              </div>
              <span className="text-white font-mono text-xs">{entry.feeCurrency || entry.feeRate || '--'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Gift className="w-3 h-3 text-[#8E9299]" />
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Realized PnL / Extra</span>
              </div>
              <span className="text-white font-mono text-xs">{entry.pnl || entry.extra || '--'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Trade ID</span>
              <span className="text-white font-mono text-xs truncate max-w-[180px]" title={entry.tradeId}>
                {entry.tradeId || '--'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Account</span>
              <span className="text-white font-mono text-xs">{connectionLabel}</span>
            </div>

            <div className="flex flex-col gap-1">
              <AppTooltip description="Bill sub-type description">
                <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max cursor-help">Sub Type</span>
              </AppTooltip>
              <span className="text-white font-mono text-xs">{entry.transSubType || entry.subType || '--'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
