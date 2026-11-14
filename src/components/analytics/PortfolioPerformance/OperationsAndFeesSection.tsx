import React from 'react';
import { useTranslation } from 'react-i18next';
import { OperationsResultMetrics } from '../../../hooks/usePortfolioPerformance';
import { Scale } from 'lucide-react';

interface Props {
  operations: OperationsResultMetrics;
  denomination: string;
  isPrivateMode: boolean;
}

export const OperationsAndFeesSection = React.memo(function OperationsAndFeesSection({
  operations,
  denomination,
  isPrivateMode,
}: Props) {
  const { t } = useTranslation();
  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return String(val);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent':
        return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
      case 'Acceptable':
        return 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30';
      case 'Moderate':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
      case 'High':
      default:
        return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
    }
  };

  const netTradingNum = parseFloat(operations.netTradingPnl) || 0;
  const netFundingNum = parseFloat(operations.netFunding) || 0;
  const feesRawNum = parseFloat(operations.feesPaid) || 0;
  const isEngineRebate = operations.otherOperational !== undefined && feesRawNum < 0;

  const formatFeesDisplay = () => {
    if (isPrivateMode) return '****';
    if (isEngineRebate) {
      return `+${operations.feesPaid.replace(/^-/, '')} ${denomination}`;
    }
    const val = operations.feesPaid.startsWith('-') ? operations.feesPaid : `-${operations.feesPaid}`;
    return `${val} ${denomination}`;
  };

  const otherOp = operations.otherOperational;
  const otherOpNetNum = otherOp ? parseFloat(otherOp.net) || 0 : 0;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line/60">
        <h3 className="text-base font-bold text-fg flex items-center gap-2">
          <Scale className="w-4 h-4 text-accent" />
          {t('analytics.portfolio.operations.title', 'Operations Result & Fee Efficiency')}
        </h3>
        <span className="text-xs text-fg-muted">Execution Accounting</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Operations Result (Split Trades vs. Funding + Other Operational Events) */}
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold text-fg uppercase tracking-wider mb-3 pb-1 border-b border-line/50 flex items-center justify-between">
              <span>{t('analytics.portfolio.operations.cardTitle', 'Operations Result')}</span>
              <span className="text-[10px] text-fg-muted font-normal">Gross vs. Net</span>
            </h4>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono tabular-nums">
              {/* Left: Trades */}
              <div className="space-y-2 pr-2 border-r border-line/40">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Trades
                </span>
                <div>
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.grossCashFlow', 'Gross Cash Flow')}</span>
                  <span className="text-fg font-medium">{maskVal(operations.grossCashFlow)} {denomination}</span>
                </div>
                <div>
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.tradingFeesPaid', 'Fees Paid')}</span>
                  <span className={`font-medium ${isEngineRebate ? 'text-emerald-400' : 'text-danger'}`}>
                    {formatFeesDisplay()}
                  </span>
                </div>
                <div className="pt-1 border-t border-line/50">
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.netTradingPnl', 'Net Trading P&L')}</span>
                  <span className={`font-bold ${netTradingNum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {maskVal(operations.netTradingPnl)} {denomination}
                  </span>
                </div>
              </div>

              {/* Right: Funding Rate */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Funding Rate
                </span>
                <div>
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.fundingReceived', 'Received')}</span>
                  <span className="text-emerald-400 font-medium">+{maskVal(operations.fundingReceived)} {denomination}</span>
                </div>
                <div>
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.fundingPaid', 'Paid')}</span>
                  <span className="text-danger font-medium">
                    {operations.fundingPaid.startsWith('-') ? '' : '-'}{maskVal(operations.fundingPaid)} {denomination}
                  </span>
                </div>
                <div className="pt-1 border-t border-line/50">
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.netFunding', 'Net Funding')}</span>
                  <span className={`font-bold ${netFundingNum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {maskVal(operations.netFunding)} {denomination}
                  </span>
                </div>
                <div>
                  <span className="text-fg-muted text-[10px] block">Rec / Paid Ratio</span>
                  <span className="text-fg font-mono font-bold text-[11px]">{operations.fundingRatio}</span>
                </div>
              </div>
            </div>
          </div>

          {otherOp && otherOp.count > 0 && (
            <div className="mt-3 pt-2.5 border-t border-line/60 text-[11px] font-mono tabular-nums space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-fg-muted font-sans text-[10px] uppercase tracking-wider">
                  Other Operational ({otherOp.count})
                </span>
                <span className={`font-bold ${otherOpNetNum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPrivateMode ? '****' : `${otherOpNetNum > 0 && !otherOp.net.startsWith('+') ? '+' : ''}${otherOp.net} ${denomination}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-fg-muted">
                {parseFloat(otherOp.liquidationNet) !== 0 && (
                  <span>Liq: {maskVal(otherOp.liquidationNet)}</span>
                )}
                {parseFloat(otherOp.deliveryNet) !== 0 && (
                  <span>Deliv: {maskVal(otherOp.deliveryNet)}</span>
                )}
                {parseFloat(otherOp.interestNet) !== 0 && (
                  <span>Int: {maskVal(otherOp.interestNet)}</span>
                )}
                {parseFloat(otherOp.rewardsNet) !== 0 && (
                  <span>Rew: {maskVal(otherOp.rewardsNet)}</span>
                )}
                {parseFloat(otherOp.otherFeesNet) !== 0 && (
                  <span>Fees/Adj: {maskVal(otherOp.otherFeesNet)}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Trade Breakdown */}
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between">
          <h4 className="text-xs font-semibold text-fg uppercase tracking-wider mb-3 pb-1 border-b border-line/50 flex items-center justify-between">
            <span>{t('analytics.portfolio.operations.tradeBreakdown', 'Trade Breakdown')}</span>
            <span className="text-[10px] text-fg-muted font-normal">Side Distribution</span>
          </h4>

          <div className="flex flex-col gap-2.5 text-xs font-mono tabular-nums">
            <div className="flex justify-between py-1 border-b border-line/30">
              <span className="text-fg-muted">Total Trades</span>
              <span className="text-fg font-bold">{operations.totalTrades}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-line/30">
              <span className="text-fg-muted">Buys (BUY)</span>
              <span className="text-success font-medium">
                {operations.buysCount} ({operations.buysPct.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-line/30">
              <span className="text-fg-muted">Sells (SELL)</span>
              <span className="text-danger font-medium">
                {operations.sellsCount} ({operations.sellsPct.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-fg-muted">Daily Average</span>
              <span className="text-fg font-medium">
                {operations.tradesPerDay.toFixed(2)} trades/day
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Fee Analysis & Cost Diagnostics */}
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between">
          <h4 className="text-xs font-semibold text-fg uppercase tracking-wider mb-2 pb-1 border-b border-line/50 flex items-center justify-between">
            <span>{t('analytics.portfolio.operations.feeAnalysis', 'Fee Analysis')}</span>
            <span className="text-[10px] text-fg-muted font-normal">Cost Drag</span>
          </h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-fg-muted uppercase tracking-wider block">Fee Cost</span>
                <span className="text-2xl font-bold font-mono tabular-nums text-fg">
                  {operations.feeCostPct.toFixed(2)}%
                </span>
                <span className="text-[10px] text-fg-muted block">of gross profit</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-fg-muted uppercase tracking-wider mb-1">Status</span>
                <span className={`px-2.5 py-1 text-xs rounded-md font-semibold border ${getStatusColor(operations.feeStatus)}`}>
                  {operations.feeStatus}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-elevated rounded-lg border border-line/50 text-xs space-y-1">
              <div className="text-fg">
                <span className="text-fg-muted font-medium">Interpretation: </span>
                {operations.feeInterpretation}
              </div>
              <div className="text-fg">
                <span className="text-accent font-medium">Recommended Action: </span>
                {operations.feeAction}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
