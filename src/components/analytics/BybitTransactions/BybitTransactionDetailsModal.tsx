import React from 'react';
import Big from 'big.js';
import { X } from 'lucide-react';
import { TxStats } from '../../../hooks/useBybitTransactions';
import { BybitTransactionLogEntry } from '../../../types';
import { BybitTransactionNetChangeReport } from './BybitTransactionNetChangeReport';
import { TX_TYPES, typeColorMap } from './BybitTransactionFilters';
import { getBybitUniversalType, UNIVERSAL_BADGE_STYLE } from '../../../utils/transactionTypeMapper';

export type DetailsModalType = 'funding' | 'fees' | 'balance' | 'tx' | 'netchange' | null;

interface BybitTransactionDetailsModalProps {
  detailsModalType: DetailsModalType;
  setDetailsModalType: (type: DetailsModalType) => void;
  stats: TxStats;
  filteredEntries: BybitTransactionLogEntry[];
  tokenRates: Record<string, number>;
  maskVal: (val: string | number) => string;
  isPrivateMode: boolean;
}

export function BybitTransactionDetailsModal({
  detailsModalType,
  setDetailsModalType,
  stats,
  filteredEntries,
  tokenRates,
  maskVal,
  isPrivateMode,
}: BybitTransactionDetailsModalProps) {
  if (!detailsModalType) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`bg-[#161b22] border border-[#2a2b30] rounded-xl w-full shadow-2xl flex flex-col max-h-[85vh] transition-all duration-200 ${detailsModalType === 'netchange' ? 'max-w-4xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between p-4 border-b border-[#2a2b30]">
          <h3 className="text-white font-medium">
            {detailsModalType === 'funding' && 'Funding Breakdown'}
            {detailsModalType === 'fees' && 'Fees Breakdown'}
            {detailsModalType === 'balance' && 'Wallet Balance Breakdown'}
            {detailsModalType === 'netchange' && 'Net Change Report (USD)'}
            {detailsModalType === 'tx' && 'Total Transactions Breakdown'}
          </h3>
          <button 
            onClick={() => setDetailsModalType(null)}
            className="text-[#8E9299] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
          {detailsModalType === 'netchange' ? (
            <BybitTransactionNetChangeReport 
              filteredEntries={filteredEntries} 
              stats={stats} 
              tokenRates={tokenRates}
              isPrivateMode={isPrivateMode} 
            />
          ) : detailsModalType === 'tx' ? (
            <>
              {Object.entries(stats.typeBreakdown).length === 0 && (
                <div className="text-[#8E9299] text-sm text-center py-4">No data available</div>
              )}
              {Object.entries(stats.typeBreakdown)
                .sort((a, b) => b[1] - a[1]) // Sort by count descending
                .map(([type, count]) => {
                  const uniType = getBybitUniversalType(type);
                  const badge = UNIVERSAL_BADGE_STYLE[uniType] || UNIVERSAL_BADGE_STYLE.OTHERS;
                  
                  return (
                    <div key={type} className="flex items-center justify-between bg-[#1e232b] p-3 rounded-lg border border-[#2a2b30]/50">
                      <span className={`w-max px-2 py-0.5 text-[10px] rounded font-semibold border ${badge.textColor} ${badge.bgColor} ${badge.borderColor}`}>
                        {badge.label}
                      </span>
                      <span className="font-mono font-medium text-white">
                        {count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
            </>
          ) : (
            <>
              {/* Stablecoin segment */}
              {(() => {
                let val = '0';
                if (detailsModalType === 'funding') val = stats.stable.totalFunding;
                if (detailsModalType === 'fees') val = stats.stable.totalFees;
                if (detailsModalType === 'balance') val = stats.stable.finalBalance;
                
                const valBig = new Big(val);
                if (valBig.eq(0)) return null;

                const isPositive = valBig.gte(0);
                const colorClass = detailsModalType === 'fees' 
                  ? 'text-[#FF4444]' 
                  : (isPositive ? 'text-[#00C853]' : 'text-[#FF4444]');
                  
                return (
                  <div className="flex items-center justify-between bg-[#1e232b] p-3 rounded-lg border border-[#2a2b30]/50">
                    <span className="text-[#8E9299] text-sm">Stablecoins (USDT, USDC, etc.)</span>
                    <span className={`font-mono font-medium ${colorClass}`}>
                      {isPrivateMode ? '****' : (detailsModalType === 'fees' ? (valBig.eq(0) ? '0.00' : (valBig.gte(0) ? `-${valBig.toFixed(4)}` : `+${valBig.abs().toFixed(4)}`)) : (isPositive ? `+${valBig.toFixed(4)}` : valBig.toFixed(4)))}
                    </span>
                  </div>
                );
              })()}

              {/* Per-currency segment */}
              {Object.entries(stats.perCurrency).length === 0 && new Big(stats.stable[detailsModalType === 'funding' ? 'totalFunding' : detailsModalType === 'fees' ? 'totalFees' : 'finalBalance' as any]).eq(0) && (
                <div className="text-[#8E9299] text-sm text-center py-4">No data available</div>
              )}
              
              {Object.entries(stats.perCurrency).map(([cur, vals]) => {
                let val = '0';
                if (detailsModalType === 'funding') val = vals.totalFunding;
                if (detailsModalType === 'fees') val = vals.totalFees;
                if (detailsModalType === 'balance') val = vals.finalBalance;
                
                const valBig = new Big(val);
                if (valBig.eq(0)) return null;

                const isPositive = valBig.gte(0);
                const colorClass = detailsModalType === 'fees' 
                  ? 'text-[#FF4444]' 
                  : (isPositive ? 'text-[#00C853]' : 'text-[#FF4444]');

                return (
                  <div key={cur} className="flex items-center justify-between bg-[#1e232b] p-3 rounded-lg border border-[#2a2b30]/50">
                    <span className="text-[#8E9299] text-sm font-bold">{cur}</span>
                    <span className={`font-mono font-medium ${colorClass}`}>
                      {isPrivateMode ? '****' : (detailsModalType === 'fees' ? (valBig.eq(0) ? '0.00' : (valBig.gte(0) ? `-${valBig.toFixed(8)}` : `+${valBig.abs().toFixed(8)}`)) : (isPositive ? `+${valBig.toFixed(8)}` : valBig.toFixed(8)))} {isPrivateMode ? '' : cur}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-[#2a2b30] flex items-center justify-between">
          <span className="text-[#8E9299] text-sm uppercase tracking-wider">
            {detailsModalType === 'tx' ? 'Total Transactions' : 'Total (USD Eq.)'}
          </span>
          <span className="text-white font-bold font-mono text-lg">
            {(() => {
              if (detailsModalType === 'tx') return stats.totalCount;

              let val = '0';
              if (detailsModalType === 'funding') val = stats.aggregatedUsd.totalFunding;
              if (detailsModalType === 'fees') val = stats.aggregatedUsd.totalFees;
              if (detailsModalType === 'balance') val = stats.aggregatedUsd.finalBalance;
              if (detailsModalType === 'netchange') val = stats.aggregatedUsd.totalChange;
              
              const valBig = new Big(val);
              
              if (detailsModalType === 'fees') {
                if (valBig.eq(0)) return '0.00 USD';
                return valBig.gte(0) ? `-${maskVal(valBig.toString())} USD` : `+${maskVal(valBig.abs().toString())} USD`;
              }
              
              return `${maskVal(valBig.toString())} USD`;
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}
