import React from 'react';
import Big from 'big.js';
import { X } from 'lucide-react';
import { ConsolidatedStats } from '../../../hooks/useConsolidatedTransactions';
import { UNIVERSAL_BADGE_STYLE, UniversalTxType } from '../../../utils/transactionTypeMapper';
import { getConsolidatedMetric, feeDisplaySign, ConsolidatedMetric } from '../../../utils/consolidatedTotals';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { useTranslation } from 'react-i18next';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';

export type DetailsModalType = 'funding' | 'fees' | 'balance' | 'tx' | 'netchange' | null;

interface ConsolidatedTransactionDetailsModalProps {
  detailsModalType: DetailsModalType;
  setDetailsModalType: (type: DetailsModalType) => void;
  stats: ConsolidatedStats;
  isPrivateMode: boolean;
}

const EXCHANGE_NAMES: Record<'bybit' | 'bitget' | 'okx', string> = {
  bybit: 'Bybit',
  bitget: 'Bitget',
  okx: 'OKX',
};

export function ConsolidatedTransactionDetailsModal({
  detailsModalType,
  setDetailsModalType,
  stats,
  isPrivateMode,
}: ConsolidatedTransactionDetailsModalProps) {
  const { t } = useTranslation();
  const formatCurrency = useFormatCurrency();
  if (!detailsModalType) return null;

  const isFees = detailsModalType === 'fees';
  const metric = isFees ? 'fees' : (detailsModalType as Exclude<ConsolidatedMetric, 'fees'>);
  const breakdown = detailsModalType === 'tx' ? null : getConsolidatedMetric(stats, metric);

  const renderValue = (value: string) => {
    const big = new Big(value || '0');
    if (isFees) {
      return `${feeDisplaySign(big)}${formatCurrency(big.abs(), 'fiat')}`;
    }
    return `${big.gt(0) ? '+' : ''}${formatCurrency(big, 'fiat')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-[#161b22] border border-[#2a2b30] rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2b30]">
          <h3 className="text-white font-medium text-base">
            {detailsModalType === 'funding' && t('transactions.details.consolidatedFunding', 'Consolidated Funding Breakdown')}
            {detailsModalType === 'fees' && t('transactions.details.consolidatedFees', 'Consolidated Trading Fees Breakdown')}
            {detailsModalType === 'balance' && t('transactions.details.consolidatedBalance', 'Consolidated Wallet Balance')}
            {detailsModalType === 'tx' && t('transactions.details.totalTxByType', 'Total Transactions by Type')}
            {detailsModalType === 'netchange' && t('transactions.details.consolidatedNetChange', 'Consolidated Net Change')}
          </h3>
          <button
            onClick={() => setDetailsModalType(null)}
            className="text-[#8E9299] hover:text-white transition-colors p-1 rounded-md hover:bg-[#2a2b30]/50"
            aria-label={t('common.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto hide-scrollbar flex flex-col gap-4">
          {detailsModalType === 'tx' ? (
            <div className="space-y-2">
              {Object.entries(stats.typeBreakdown).length === 0 ? (
                <div className="text-[#8E9299] text-sm text-center py-4">
                  {t('transactions.details.noTxAvailable', 'No transactions available')}
                </div>
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
                <span className="text-sm font-semibold text-white">
                  {t('transactions.details.grandTotal', 'Grand Total')}
                </span>
                <span className="font-mono font-bold text-sm text-[#2F6BFF]">
                  {isPrivateMode ? '****' : renderValue(breakdown?.grandTotal || '0')}
                </span>
              </div>

              {/* By Exchange Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">
                  {t('transactions.details.byExchange', 'Breakdown by Exchange Venue')}
                </h4>

                {breakdown?.rows.map(({ exchange, value, totalCount }) => {
                  const rowBig = new Big(value || '0');
                  const isCost = isFees && rowBig.gt(0);
                  const valueColor = isFees
                    ? (isCost ? 'text-[#FF4444]' : 'text-[#00C853]')
                    : (rowBig.gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]');

                  return (
                    <div key={exchange} className="bg-[#1a1b1e] p-3 rounded-lg border border-[#2a2b30]/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <ExchangeIcon exchange={exchange} className="w-4 h-4" />
                        <span className="text-sm font-medium text-white">{EXCHANGE_NAMES[exchange]}</span>
                        <span className="text-[10px] text-[#8E9299] bg-[#2a2b30]/50 px-1.5 py-0.5 rounded font-mono">
                          {totalCount} {t('transactions.details.txs', 'txs')}
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className={`font-mono font-medium text-sm ${valueColor}`}>
                          {isPrivateMode ? '****' : renderValue(value)}
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
