import React from 'react';
import Big from 'big.js';
import { X } from 'lucide-react';
import { BitgetTxStats } from '../../../hooks/useBitgetTransactions';
import { BitgetTransactionLogEntry } from '../../../types';
import { BitgetTransactionNetChangeReport } from './BitgetTransactionNetChangeReport';
import { BITGET_TX_TYPES, bitgetTypeColorMap } from './BitgetTransactionFilters';
import { getBitgetUniversalType, UNIVERSAL_BADGE_STYLE } from '../../../utils/transactionTypeMapper';

export type BitgetDetailsModalType = 'funding' | 'fees' | 'balance' | 'tx' | 'netchange' | null;

interface BitgetTransactionDetailsModalProps {
  detailsModalType: BitgetDetailsModalType;
  setDetailsModalType: (type: BitgetDetailsModalType) => void;
  stats: BitgetTxStats;
  filteredEntries: BitgetTransactionLogEntry[];
  tokenRates: Record<string, number>;
  maskVal: (val: string | number) => string;
  isPrivateMode: boolean;
}

export function BitgetTransactionDetailsModal({
  detailsModalType,
  setDetailsModalType,
  stats,
  filteredEntries,
  tokenRates,
  maskVal,
  isPrivateMode,
}: BitgetTransactionDetailsModalProps) {
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
            <BitgetTransactionNetChangeReport 
              filteredEntries={filteredEntries} 
              stats={stats} 
              tokenRates={tokenRates}
              isPrivateMode={isPrivateMode} 
            />
          ) : detailsModalType === 'tx' ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-[#8E9299]">Count by Type</span>
                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                  {Object.entries(stats.typeBreakdown).map(([t, count]) => {
                    const uniType = getBitgetUniversalType(t);
                    const badge = UNIVERSAL_BADGE_STYLE[uniType] || UNIVERSAL_BADGE_STYLE.OTHERS;
                    return (
                      <div key={t} className="flex items-center justify-between p-2.5 rounded-lg bg-[#1e232b] border border-[#2a2b30]/50 text-xs">
                        <span className={`px-2 py-0.5 rounded font-semibold border text-[10px] ${badge.textColor} ${badge.bgColor} ${badge.borderColor}`}>{badge.label}</span>
                        <span className="text-white font-mono font-medium">{count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Grand Total in USD */}
              <div className="flex justify-between items-center bg-[#111215] p-3 rounded-lg border border-[#2a2b30]">
                <span className="text-xs text-[#8E9299]">Total (Aggregated USD)</span>
                <span className={`text-sm font-semibold font-mono ${
                  detailsModalType === 'funding'
                    ? (new Big(stats.aggregatedUsd.totalFunding).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]')
                    : detailsModalType === 'fees'
                    ? (new Big(stats.aggregatedUsd.totalFees).lt(0) ? 'text-[#FF4444]' : new Big(stats.aggregatedUsd.totalFees).gt(0) ? 'text-[#00C853]' : 'text-white')
                    : 'text-white'
                }`}>
                  {detailsModalType === 'funding' && maskVal(stats.aggregatedUsd.totalFunding)}
                  {detailsModalType === 'fees' && maskVal(stats.aggregatedUsd.totalFees)}
                  {detailsModalType === 'balance' && maskVal(stats.aggregatedUsd.finalBalance)}
                </span>
              </div>

              {/* Stablecoin bucket */}
              <div className="flex flex-col gap-1 text-xs">
                <span className="text-[#8E9299] uppercase tracking-wider font-semibold text-[10px]">Stablecoins (USDT, USDC, USD)</span>
                <div className="flex justify-between items-center p-2 rounded bg-[#111215] border border-[#2a2b30]">
                  <span className="text-white font-medium">USD Equivalent</span>
                  <span className={`font-mono ${
                    detailsModalType === 'funding'
                      ? (new Big(stats.stable.totalFunding).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]')
                      : detailsModalType === 'fees'
                      ? (new Big(stats.stable.totalFees).lt(0) ? 'text-[#FF4444]' : new Big(stats.stable.totalFees).gt(0) ? 'text-[#00C853]' : 'text-white')
                      : 'text-white'
                  }`}>
                    {detailsModalType === 'funding' && maskVal(stats.stable.totalFunding)}
                    {detailsModalType === 'fees' && maskVal(stats.stable.totalFees)}
                    {detailsModalType === 'balance' && maskVal(stats.stable.finalBalance)}
                  </span>
                </div>
              </div>

              {/* Non-stable per-currency breakdown */}
              {Object.keys(stats.perCurrency).length > 0 && (
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-[#8E9299] uppercase tracking-wider font-semibold text-[10px]">Crypto Currencies</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {Object.entries(stats.perCurrency).map(([ccy, vals]) => {
                      const rate = tokenRates[ccy] || 0;
                      let coinVal = '0';
                      if (detailsModalType === 'funding') coinVal = vals.totalFunding;
                      if (detailsModalType === 'fees') coinVal = vals.totalFees;
                      if (detailsModalType === 'balance') coinVal = vals.finalBalance;

                      const coinBig = new Big(coinVal);
                      const usdVal = coinBig.times(rate).toNumber();
                      const valColor = detailsModalType === 'funding'
                        ? (coinBig.gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]')
                        : detailsModalType === 'fees'
                        ? (coinBig.lt(0) ? 'text-[#FF4444]' : coinBig.gt(0) ? 'text-[#00C853]' : 'text-white')
                        : 'text-white';

                      return (
                        <div key={ccy} className="flex justify-between items-center p-2 rounded bg-[#111215] border border-[#2a2b30]">
                          <span className="text-white font-medium">{ccy}</span>
                          <div className="text-right">
                            <span className={`font-mono block ${valColor}`}>
                              {isPrivateMode ? '****' : `${Number(coinVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${ccy}`}
                            </span>
                            {rate > 0 && (
                              <span className={`text-[10px] font-mono block ${valColor} opacity-80`}>
                                ≈ {maskVal(usdVal)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
