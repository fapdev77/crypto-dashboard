import React from 'react';
import Big from 'big.js';
import { X } from 'lucide-react';
import { ConsolidatedStats } from '../../../hooks/useConsolidatedTransactions';
import { UNIVERSAL_BADGE_STYLE, UniversalTxType } from '../../../utils/transactionTypeMapper';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { CoinIcon } from '../../ui/CoinIcon';

export type DetailsModalType = 'funding' | 'fees' | 'balance' | 'tx' | 'netchange' | null;

interface ConsolidatedTransactionDetailsModalProps {
  detailsModalType: DetailsModalType;
  setDetailsModalType: (type: DetailsModalType) => void;
  stats: ConsolidatedStats;
  tokenRates: Record<string, number>;
  maskVal: (val: string | number) => string;
  isPrivateMode: boolean;
}

export function ConsolidatedTransactionDetailsModal({
  detailsModalType,
  setDetailsModalType,
  stats,
  tokenRates,
  maskVal,
  isPrivateMode,
}: ConsolidatedTransactionDetailsModalProps) {
  if (!detailsModalType) return null;

  const exchanges: Array<{ id: 'bybit' | 'bitget' | 'okx'; name: string }> = [
    { id: 'bybit', name: 'Bybit' },
    { id: 'bitget', name: 'Bitget' },
    { id: 'okx', name: 'OKX' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-[#161b22] border border-[#2a2b30] rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2b30]">
          <h3 className="text-white font-medium text-base">
            {detailsModalType === 'funding' && 'Consolidated Funding Breakdown (USD)'}
            {detailsModalType === 'fees' && 'Consolidated Trading Fees Breakdown (USD)'}
            {detailsModalType === 'balance' && 'Consolidated Wallet Balance (USD)'}
            {detailsModalType === 'tx' && 'Total Transactions by Type'}
            {detailsModalType === 'netchange' && 'Consolidated Net Change (USD)'}
          </h3>
          <button
            onClick={() => setDetailsModalType(null)}
            className="text-[#8E9299] hover:text-white transition-colors p-1 rounded-md hover:bg-[#2a2b30]/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto hide-scrollbar flex flex-col gap-4">
          {detailsModalType === 'tx' ? (
            <div className="space-y-2">
              {Object.entries(stats.typeBreakdown).length === 0 ? (
                <div className="text-[#8E9299] text-sm text-center py-4">No transactions available</div>
              ) : (
                Object.entries(stats.typeBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const badge = UNIVERSAL_BADGE_STYLE[type as UniversalTxType] || UNIVERSAL_BADGE_STYLE.OTHERS;
                    return (
                      <div key={type} className="flex items-center justify-between bg-[#1e232b] p-3 rounded-lg border border-[#2a2b30]/50">
                        <span className={`px-2 py-0.5 text-xs rounded font-semibold border ${badge.textColor} ${badge.bgColor} ${badge.borderColor}`}>
                          {badge.label}
                        </span>
                        <span className="font-mono font-medium text-white text-sm">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Grand Total Bar */}
              <div className="bg-[#1e232b] p-3.5 rounded-lg border border-[#2a2b30] flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Grand Total (USD)</span>
                <span className="font-mono font-bold text-sm text-[#2F6BFF]">
                  {(() => {
                    if (detailsModalType === 'funding') return `${maskVal(stats.aggregatedUsd.totalFunding)} USD`;
                    if (detailsModalType === 'fees') return `-${maskVal(stats.aggregatedUsd.totalFees)} USD`;
                    if (detailsModalType === 'balance') return `${maskVal(stats.aggregatedUsd.finalBalance)} USD`;
                    if (detailsModalType === 'netchange') return `${maskVal(stats.aggregatedUsd.totalChange)} USD`;
                    return '0.00 USD';
                  })()}
                </span>
              </div>

              {/* By Exchange Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">
                  Breakdown by Exchange Venue
                </h4>

                {exchanges.map(({ id, name }) => {
                  const exchStats = stats.byExchange[id];
                  if (!exchStats || exchStats.totalCount === 0) return null;

                  let usdValue = '0';
                  if (detailsModalType === 'funding') usdValue = exchStats.aggregatedUsd.totalFunding;
                  if (detailsModalType === 'fees') usdValue = exchStats.aggregatedUsd.totalFees;
                  if (detailsModalType === 'balance') usdValue = exchStats.aggregatedUsd.finalBalance;
                  if (detailsModalType === 'netchange') usdValue = exchStats.aggregatedUsd.totalChange;

                  const usdBig = new Big(usdValue || '0');
                  const isPositive = usdBig.gte(0);

                  return (
                    <div key={id} className="bg-[#1a1b1e] p-3 rounded-lg border border-[#2a2b30]/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <ExchangeIcon exchange={id} className="w-4 h-4" />
                        <span className="text-sm font-medium text-white">{name}</span>
                        <span className="text-[10px] text-[#8E9299] bg-[#2a2b30]/50 px-1.5 py-0.5 rounded font-mono">
                          {exchStats.totalCount} txs
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className={`font-mono font-medium text-sm ${detailsModalType === 'fees' ? 'text-[#FF4444]' : (isPositive ? 'text-[#00C853]' : 'text-[#FF4444]')}`}>
                          {isPrivateMode
                            ? '****'
                            : (detailsModalType === 'fees'
                                ? `-${maskVal(usdBig.abs().toString())} USD`
                                : `${isPositive ? '+' : ''}${maskVal(usdBig.toString())} USD`)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
