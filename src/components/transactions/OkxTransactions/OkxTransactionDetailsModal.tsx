import React from 'react';
import Big from 'big.js';
import { X } from 'lucide-react';
import { OkxTxStats } from '../../../hooks/useOkxTransactions';
import { OkxTransactionLogEntry } from '../../../types';
import { OkxTransactionNetChangeReport } from './OkxTransactionNetChangeReport';
import { OKX_TX_TYPES, okxTypeColorMap } from './OkxTransactionFilters';
import { getOkxUniversalType, UNIVERSAL_BADGE_STYLE } from '../../../utils/transactionTypeMapper';
import { useTranslation } from 'react-i18next';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import { isUsdPeggedStablecoin } from '../../../utils/usdAggregation';

export type OkxDetailsModalType = 'funding' | 'fees' | 'balance' | 'tx' | 'netchange' | null;

interface OkxTransactionDetailsModalProps {
  detailsModalType: OkxDetailsModalType;
  setDetailsModalType: (type: OkxDetailsModalType) => void;
  stats: OkxTxStats;
  filteredEntries: OkxTransactionLogEntry[];
  tokenRates: Record<string, number>;
  maskVal: (val: string | number) => string;
  isPrivateMode: boolean;
}

export function OkxTransactionDetailsModal({
  detailsModalType,
  setDetailsModalType,
  stats,
  filteredEntries,
  tokenRates,
  maskVal,
  isPrivateMode,
}: OkxTransactionDetailsModalProps) {
  const { t } = useTranslation();
  const formatCurrency = useFormatCurrency();
  // USD-pegged stablecoins are already summarized in the stablecoin segment.
  const otherCurrencies = Object.entries(stats.perCurrency).filter(([ccy]) => !isUsdPeggedStablecoin(ccy));
  // Fees follow the canonical convention: positive = paid, negative = rebate.
  const formatFee = (value: string | number) => {
    const big = new Big(value || '0');
    if (big.eq(0)) return maskVal(0);
    return `${big.gt(0) ? '-' : '+'}${maskVal(big.abs().toString())}`;
  };
  if (!detailsModalType) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`bg-elevated border border-line rounded-xl w-full shadow-2xl flex flex-col max-h-[85vh] transition-all duration-200 ${detailsModalType === 'netchange' ? 'max-w-4xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h3 className="text-fg font-medium">
            {detailsModalType === 'funding' && t('transactions.details.fundingBreakdown', 'Funding Breakdown')}
            {detailsModalType === 'fees' && t('transactions.details.feesBreakdown', 'Fees Breakdown')}
            {detailsModalType === 'balance' && t('transactions.details.balanceBreakdown', 'Wallet Balance Breakdown')}
            {detailsModalType === 'netchange' && t('transactions.details.netChangeReport', 'Net Change Report')}
            {detailsModalType === 'tx' && t('transactions.details.txBreakdown', 'Total Transactions Breakdown')}
          </h3>
          <button 
            onClick={() => setDetailsModalType(null)}
            className="text-fg-muted hover:text-fg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
          {detailsModalType === 'netchange' ? (
            <OkxTransactionNetChangeReport 
              filteredEntries={filteredEntries} 
              stats={stats} 
              tokenRates={tokenRates}
              isPrivateMode={isPrivateMode} 
            />
          ) : detailsModalType === 'tx' ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-fg-muted">Count by Type</span>
                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                  {Object.entries(stats.typeBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([t, count]) => {
                      const uniType = getOkxUniversalType(t);
                      const badge = UNIVERSAL_BADGE_STYLE[uniType] || UNIVERSAL_BADGE_STYLE.OTHERS;
                      return (
                        <div key={t} className="flex items-center justify-between p-2 rounded bg-canvas border border-line text-xs">
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${badge.textColor} ${badge.bgColor} ${badge.borderColor}`}>{badge.label}</span>
                          <span className="text-fg font-mono font-medium">{count.toLocaleString()}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Grand Total in USD */}
              <div className="flex justify-between items-center bg-canvas p-3 rounded-lg border border-line">
                <span className="text-xs text-fg-muted">Total (Aggregated USD)</span>
                <span className={`text-sm font-semibold font-mono ${
                  detailsModalType === 'funding'
                    ? (new Big(stats.aggregatedUsd.totalFunding).gte(0) ? 'text-success' : 'text-danger')
                    : detailsModalType === 'fees'
                    ? (new Big(stats.aggregatedUsd.totalFees).gt(0) ? 'text-danger' : new Big(stats.aggregatedUsd.totalFees).lt(0) ? 'text-success' : 'text-fg')
                    : 'text-fg'
                }`}>
                  {detailsModalType === 'funding' && maskVal(stats.aggregatedUsd.totalFunding)}
                  {detailsModalType === 'fees' && formatFee(stats.aggregatedUsd.totalFees)}
                  {detailsModalType === 'balance' && maskVal(stats.aggregatedUsd.finalBalance)}
                </span>
              </div>

              {/* Stablecoin bucket */}
              <div className="flex flex-col gap-1 text-xs">
                <span className="text-fg-muted uppercase tracking-wider font-semibold text-[10px]">Stablecoins (USDT, USDC, USD)</span>
                <div className="flex justify-between items-center p-2 rounded bg-canvas border border-line">
                  <span className="text-fg font-medium">USD Equivalent</span>
                  <span className={`font-mono ${
                    detailsModalType === 'funding'
                      ? (new Big(stats.stable.totalFunding).gte(0) ? 'text-success' : 'text-danger')
                      : detailsModalType === 'fees'
                      ? (new Big(stats.stable.totalFees).gt(0) ? 'text-danger' : new Big(stats.stable.totalFees).lt(0) ? 'text-success' : 'text-fg')
                      : 'text-fg'
                  }`}>
                    {detailsModalType === 'funding' && maskVal(stats.stable.totalFunding)}
                    {detailsModalType === 'fees' && formatFee(stats.stable.totalFees)}
                    {detailsModalType === 'balance' && maskVal(stats.stable.finalBalance)}
                  </span>
                </div>
              </div>

              {/* Non-stable per-currency breakdown */}
              {otherCurrencies.length > 0 && (
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-fg-muted uppercase tracking-wider font-semibold text-[10px]">Crypto Currencies</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {otherCurrencies.map(([ccy, vals]) => {
                      const rate = tokenRates[ccy] || 0;
                      let coinVal = '0';
                      if (detailsModalType === 'funding') coinVal = vals.totalFunding;
                      if (detailsModalType === 'fees') coinVal = vals.totalFees;
                      if (detailsModalType === 'balance') coinVal = vals.finalBalance;

                      const coinBig = new Big(coinVal);
                      const usdVal = coinBig.times(rate).toNumber();
                      const valColor = detailsModalType === 'funding'
                        ? (coinBig.gte(0) ? 'text-success' : 'text-danger')
                        : detailsModalType === 'fees'
                        ? (coinBig.gt(0) ? 'text-danger' : coinBig.lt(0) ? 'text-success' : 'text-fg')
                        : 'text-fg';

                      return (
                        <div key={ccy} className="flex justify-between items-center p-2 rounded bg-canvas border border-line">
                          <span className="text-fg font-medium">{ccy}</span>
                          <div className="text-right">
                            <span className={`font-mono block ${valColor}`}>
                              {isPrivateMode ? '****' : `${detailsModalType === 'fees' && coinBig.gt(0) ? '-' : detailsModalType === 'fees' && coinBig.lt(0) ? '+' : ''}${Number(coinBig.abs()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${ccy}`}
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

        <div className="p-4 border-t border-line flex items-center justify-between">
          <span className="text-fg-muted text-sm uppercase tracking-wider">
            {detailsModalType === 'tx' ? t('transactions.common.totalTransactions', 'Total Transactions') : t('transactions.details.totalEq', 'Total Equivalent')}
          </span>
          <span className="text-fg font-bold font-mono text-lg">
            {(() => {
              if (detailsModalType === 'tx') return stats.totalCount.toLocaleString();

              let val = 0;
              if (detailsModalType === 'funding') val = Number(stats.aggregatedUsd.totalFunding || 0);
              if (detailsModalType === 'balance') val = Number(stats.aggregatedUsd.finalBalance || 0);
              if (detailsModalType === 'netchange') val = Number(stats.aggregatedUsd.totalChange || 0);
              
              if (detailsModalType === 'fees') {
                const fees = Number(stats.aggregatedUsd.totalFees || 0);
                if (fees === 0) return formatCurrency(0, 'fiat');
                return `${fees > 0 ? '-' : '+'}${formatCurrency(Math.abs(fees), 'fiat')}`;
              }

              return formatCurrency(val, 'fiat');
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}
