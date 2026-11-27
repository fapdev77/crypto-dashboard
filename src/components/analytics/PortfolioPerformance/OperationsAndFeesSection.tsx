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
        return 'text-success bg-success/15 border-success/30';
      case 'Acceptable':
        return 'text-tone-yellow bg-tone-yellow/15 border-tone-yellow/30';
      case 'Moderate':
        return 'text-tone-amber bg-warning/15 border-warning/30';
      case 'High':
      default:
        return 'text-danger bg-danger/15 border-danger/30';
    }
  };

  const getLocalizedFeeStatus = (status: string) => {
    const keyMap: Record<string, string> = {
      Excellent: 'analytics.portfolio.operations.feeStatusExcellent',
      Acceptable: 'analytics.portfolio.operations.feeStatusAcceptable',
      Moderate: 'analytics.portfolio.operations.feeStatusModerate',
      High: 'analytics.portfolio.operations.feeStatusHigh',
    };
    return keyMap[status] ? t(keyMap[status], status) : status;
  };

  const getLocalizedFeeInterpretation = (text: string) => {
    const map: Record<string, string> = {
      'No trade or fee data available for this selection.': 'analytics.portfolio.operations.feeInterpNoData',
      'Trading fees incurred without offsetting positive gross cash flow.': 'analytics.portfolio.operations.feeInterpZeroGross',
      'Highly efficient strategy with minimal operational costs.': 'analytics.portfolio.operations.feeInterpExcellent',
      'Within expected range for trading strategy.': 'analytics.portfolio.operations.feeInterpAcceptable',
      'Can be optimized. Consider adjusting trade frequency.': 'analytics.portfolio.operations.feeInterpModerate',
      'Excessive costs are significantly eroding profits.': 'analytics.portfolio.operations.feeInterpHigh',
    };
    return map[text] ? t(map[text], text) : text;
  };

  const getLocalizedFeeAction = (text: string) => {
    const map: Record<string, string> = {
      'Execute trades to monitor fee impact.': 'analytics.portfolio.operations.feeActionNoData',
      'Review execution sizing, maker/taker ratio, and fee tiers.': 'analytics.portfolio.operations.feeActionZeroGross',
      'Maintain current execution parameters.': 'analytics.portfolio.operations.feeActionExcellent',
      'Monitor and look for spot optimizations.': 'analytics.portfolio.operations.feeActionAcceptable',
      'Review maker/taker execution mix to reduce cost drag.': 'analytics.portfolio.operations.feeActionModerate',
      'Immediate optimization required on trade sizing or fee tiers.': 'analytics.portfolio.operations.feeActionHigh',
    };
    return map[text] ? t(map[text], text) : text;
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
        <span className="text-xs text-fg-muted">{t('analytics.portfolio.operations.executionAccounting', 'Execution Accounting')}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Operations Result (Split Trades vs. Funding + Other Operational Events) */}
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold text-fg uppercase tracking-wider mb-3 pb-1 border-b border-line/50 flex items-center justify-between">
              <span>{t('analytics.portfolio.operations.cardTitle', 'Operations Result')}</span>
              <span className="text-[10px] text-fg-muted font-normal">{t('analytics.portfolio.operations.grossVsNet', 'Gross vs. Net')}</span>
            </h4>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono tabular-nums">
              {/* Left: Trades */}
              <div className="space-y-2 pr-2 border-r border-line/40">
                <span className="text-[10px] font-bold text-tone-amber uppercase tracking-wider block">
                  {t('analytics.portfolio.operations.tradesHeading', 'Trades')}
                </span>
                <div>
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.grossCashFlow', 'Gross Cash Flow')}</span>
                  <span className="text-fg font-medium">{maskVal(operations.grossCashFlow)} {denomination}</span>
                </div>
                <div>
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.tradingFeesPaid', 'Fees Paid')}</span>
                  <span className={`font-medium ${isEngineRebate ? 'text-success' : 'text-danger'}`}>
                    {formatFeesDisplay()}
                  </span>
                </div>
                <div className="pt-1 border-t border-line/50">
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.netTradingPnl', 'Net Trading P&L')}</span>
                  <span className={`font-bold ${netTradingNum >= 0 ? 'text-success' : 'text-danger'}`}>
                    {maskVal(operations.netTradingPnl)} {denomination}
                  </span>
                </div>
              </div>

              {/* Right: Funding Rate */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-success uppercase tracking-wider block">
                  {t('analytics.portfolio.operations.fundingHeading', 'Funding Rate')}
                </span>
                <div>
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.fundingReceived', 'Received')}</span>
                  <span className="text-success font-medium">+{maskVal(operations.fundingReceived)} {denomination}</span>
                </div>
                <div>
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.fundingPaid', 'Paid')}</span>
                  <span className="text-danger font-medium">
                    {operations.fundingPaid.startsWith('-') ? '' : '-'}{maskVal(operations.fundingPaid)} {denomination}
                  </span>
                </div>
                <div className="pt-1 border-t border-line/50">
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.netFunding', 'Net Funding')}</span>
                  <span className={`font-bold ${netFundingNum >= 0 ? 'text-success' : 'text-danger'}`}>
                    {maskVal(operations.netFunding)} {denomination}
                  </span>
                </div>
                <div>
                  <span className="text-fg-muted text-[10px] block">{t('analytics.portfolio.operations.recPaidRatio', 'Rec / Paid Ratio')}</span>
                  <span className="text-fg font-mono font-bold text-[11px]">{operations.fundingRatio}</span>
                </div>
              </div>
            </div>
          </div>

          {otherOp && otherOp.count > 0 && (
            <div className="mt-3 pt-2.5 border-t border-line/60 text-[11px] font-mono tabular-nums space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-fg-muted font-sans text-[10px] uppercase tracking-wider">
                  {t('analytics.portfolio.operations.otherOperationalCount', 'Other Operational ({{count}})', { count: otherOp.count })}
                </span>
                <span className={`font-bold ${otherOpNetNum >= 0 ? 'text-success' : 'text-danger'}`}>
                  {isPrivateMode ? '****' : `${otherOpNetNum > 0 && !otherOp.net.startsWith('+') ? '+' : ''}${otherOp.net} ${denomination}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-fg-muted">
                {parseFloat(otherOp.liquidationNet) !== 0 && (
                  <span>{t('analytics.portfolio.operations.otherLiq', 'Liq')}: {maskVal(otherOp.liquidationNet)}</span>
                )}
                {parseFloat(otherOp.deliveryNet) !== 0 && (
                  <span>{t('analytics.portfolio.operations.otherDeliv', 'Deliv')}: {maskVal(otherOp.deliveryNet)}</span>
                )}
                {parseFloat(otherOp.interestNet) !== 0 && (
                  <span>{t('analytics.portfolio.operations.otherInt', 'Int')}: {maskVal(otherOp.interestNet)}</span>
                )}
                {parseFloat(otherOp.rewardsNet) !== 0 && (
                  <span>{t('analytics.portfolio.operations.otherRew', 'Rew')}: {maskVal(otherOp.rewardsNet)}</span>
                )}
                {parseFloat(otherOp.otherFeesNet) !== 0 && (
                  <span>{t('analytics.portfolio.operations.otherFeesAdj', 'Fees/Adj')}: {maskVal(otherOp.otherFeesNet)}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Trade Breakdown */}
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between">
          <h4 className="text-xs font-semibold text-fg uppercase tracking-wider mb-3 pb-1 border-b border-line/50 flex items-center justify-between">
            <span>{t('analytics.portfolio.operations.tradeBreakdown', 'Trade Breakdown')}</span>
            <span className="text-[10px] text-fg-muted font-normal">{t('analytics.portfolio.operations.sideDistribution', 'Side Distribution')}</span>
          </h4>

          <div className="flex flex-col gap-2.5 text-xs font-mono tabular-nums">
            <div className="flex justify-between py-1 border-b border-line/30">
              <span className="text-fg-muted">{t('analytics.portfolio.operations.totalTrades', 'Total Trades')}</span>
              <span className="text-fg font-bold">{operations.totalTrades}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-line/30">
              <span className="text-fg-muted">{t('analytics.portfolio.operations.buysLabel', 'Buys (BUY)')}</span>
              <span className="text-success font-medium">
                {operations.buysCount} ({operations.buysPct.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-line/30">
              <span className="text-fg-muted">{t('analytics.portfolio.operations.sellsLabel', 'Sells (SELL)')}</span>
              <span className="text-danger font-medium">
                {operations.sellsCount} ({operations.sellsPct.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-fg-muted">{t('analytics.portfolio.operations.dailyAverage', 'Daily Average')}</span>
              <span className="text-fg font-medium">
                {t('analytics.portfolio.operations.tradesPerDayUnit', '{{count}} trades/day', { count: operations.tradesPerDay })}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Fee Analysis & Cost Diagnostics */}
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between">
          <h4 className="text-xs font-semibold text-fg uppercase tracking-wider mb-2 pb-1 border-b border-line/50 flex items-center justify-between">
            <span>{t('analytics.portfolio.operations.feeAnalysis', 'Fee Analysis')}</span>
            <span className="text-[10px] text-fg-muted font-normal">{t('analytics.portfolio.operations.costDrag', 'Cost Drag')}</span>
          </h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-fg-muted uppercase tracking-wider block">{t('analytics.portfolio.operations.feeCostLabel', 'Fee Cost')}</span>
                <span className="text-2xl font-bold font-mono tabular-nums text-fg">
                  {operations.feeCostPct.toFixed(2)}%
                </span>
                <span className="text-[10px] text-fg-muted block">{t('analytics.portfolio.operations.ofGrossProfit', 'of gross profit')}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-fg-muted uppercase tracking-wider mb-1">{t('analytics.portfolio.operations.statusLabel', 'Status')}</span>
                <span className={`px-2.5 py-1 text-xs rounded-md font-semibold border ${getStatusColor(operations.feeStatus)}`}>
                  {getLocalizedFeeStatus(operations.feeStatus)}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-elevated rounded-lg border border-line/50 text-xs space-y-1">
              <div className="text-fg">
                <span className="text-fg-muted font-medium">{t('analytics.portfolio.operations.interpretationLabel', 'Interpretation')}: </span>
                {getLocalizedFeeInterpretation(operations.feeInterpretation)}
              </div>
              <div className="text-fg">
                <span className="text-accent font-medium">{t('analytics.portfolio.operations.recommendedActionLabel', 'Recommended Action')}: </span>
                {getLocalizedFeeAction(operations.feeAction)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
