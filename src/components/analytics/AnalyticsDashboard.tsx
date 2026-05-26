import React, { useState, useMemo } from 'react';
import { usePositionHistory } from '../../hooks/usePositionHistory';
import { useBillsHistory } from '../../hooks/useBillsHistory';
import { useDashboardStore } from '../../store/dashboardStore';
import { useSettingsStore } from '../../store/settingsStore';
import { calculateWinRate, calculateProfitFactor, calculateTotalFees, calculateDailyROI, getSeasonalityData } from '../../utils/analyticsMath';
import { calculateMilestones } from '../../utils/milestoneMath';
import { Target, DollarSign, PieChart, Calendar, Activity, ArrowRightLeft, ShieldAlert, Mountain } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { HistoryLimitWarning } from '../ui/HistoryLimitWarning';

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<'1w'|'2w'|'1m'|'custom'>('1m');
  const { positions: history, isLoading: isHistoryLoading } = usePositionHistory(period, '', '', true);
  const { bills, isLoading: isBillsLoading } = useBillsHistory(period, '', '', true);
  
  const { balances } = useDashboardStore();
  const useMockData = useSettingsStore(state => state.useMockData);

  const winRate = calculateWinRate(history);
  const profitFactor = calculateProfitFactor(history);
  const { tradingFees, netFundingFees } = calculateTotalFees(history);
  const dailyROI = calculateDailyROI(history);
  const { dayData, hourData } = getSeasonalityData(history);
  
  // Basic trading vs funding decomp
  const grossTradingPnl = history.reduce((sum, p) => sum + p.realizedPnl, 0);
  const totalFunding = history.reduce((sum, p) => sum + (p.fundingFee || 0), 0);
  const netNominalReturn = grossTradingPnl + totalFunding + tradingFees; // roughly net

  // External Flow logic
  const totalDeposits = bills.filter(b => b.type === 'deposit').reduce((sum, b) => sum + Math.abs(b.amount), 0);
  const totalWithdrawals = bills.filter(b => b.type === 'withdrawal').reduce((sum, b) => sum + Math.abs(b.amount), 0);
  const netExternalFlow = totalDeposits - totalWithdrawals;

  // Pure Operational PnL logic
  const activeBalances = useMemo(() => {
    const list = Object.values(balances);
    return useMockData 
      ? list.filter(b => b.connectionId.startsWith('mocked-data'))
      : list.filter(b => !b.connectionId.startsWith('mocked-data'));
  }, [balances, useMockData]);

  const currentTotalEquity = activeBalances.reduce((sum, b) => sum + (b.usdValue || 0), 0);
  // Pure Operational Equity = Current Equity - Net Deposits
  const pureOperationalEquity = currentTotalEquity - netExternalFlow;

  // Milestone Tracker
  const milestones = calculateMilestones(history, bills, currentTotalEquity);

  return (
    <div className="w-full flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white tracking-tight">Analytics Overview</h2>
        <select 
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="bg-[#151619] border border-[#2a2b30] text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none"
        >
          <option value="1w">Last 7 Days</option>
          <option value="2w">Last 14 Days</option>
          <option value="1m">Last 30 Days</option>
        </select>
      </div>
      
      <HistoryLimitWarning period={period} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quality & Consistency Metrics */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><Target className="w-4 h-4"/> Strategy Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0b0c10] p-4 rounded-lg border border-[#2a2b30]">
              <span className="text-xs text-gray-500 block mb-1">Win Rate</span>
              <span className="text-xl text-white font-bold">{winRate.toFixed(1)}%</span>
            </div>
            <div className="bg-[#0b0c10] p-4 rounded-lg border border-[#2a2b30]">
              <span className="text-xs text-gray-500 block mb-1">Profit Factor</span>
              <span className={`text-xl font-bold ${profitFactor >= 2 ? 'text-[#10B981]' : profitFactor >= 1 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                {profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
              </span>
            </div>
            <div className="bg-[#0b0c10] p-4 rounded-lg border border-[#2a2b30]">
              <span className="text-xs text-gray-500 block mb-1">Total Trades</span>
              <span className="text-xl text-white font-bold">{history.length}</span>
            </div>
            <div className="bg-[#0b0c10] p-4 rounded-lg border border-[#2a2b30] flex flex-col justify-center">
              <span className="text-xs text-gray-500 block mb-1">Status</span>
              {profitFactor >= 2 ? <span className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-1 rounded w-max">Excellent</span> : 
               profitFactor >= 1 ? <span className="text-xs font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-1 rounded w-max">Acceptable</span> : 
               <span className="text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 px-2 py-1 rounded w-max">Needs Review</span>}
            </div>
          </div>
        </div>

        {/* Basic Fee Auditor */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4"/> Cost Intelligence</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-[#0b0c10] p-3 rounded-lg border border-[#2a2b30]">
              <span className="text-xs text-gray-500">Trading Fees Paid</span>
              <span className="text-sm text-white font-mono">${tradingFees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center bg-[#0b0c10] p-3 rounded-lg border border-[#2a2b30]">
              <span className="text-xs text-gray-500">Net Funding Fees</span>
              <span className={`text-sm font-mono ${netFundingFees >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                ${Math.abs(netFundingFees).toFixed(2)} {netFundingFees >= 0 ? '(Recv)' : '(Paid)'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Results Decomposition & External Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4"/> Results Decomposition</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0b0c10] p-4 rounded-lg border border-[#2a2b30]">
                <span className="text-xs text-gray-500 block mb-1">Gross Trading PnL</span>
                <span className={`text-2xl font-bold ${grossTradingPnl >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  ${grossTradingPnl.toFixed(2)}
                </span>
              </div>
              <div className="bg-[#0b0c10] p-4 rounded-lg border border-[#2a2b30]">
                <span className="text-xs text-gray-500 block mb-1">Total Funding Impact</span>
                <span className={`text-2xl font-bold ${totalFunding >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  ${totalFunding.toFixed(2)}
                </span>
              </div>
          </div>
        </div>

        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4"/> External Flow Control</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0b0c10] p-4 rounded-lg border border-[#2a2b30]">
                <span className="text-xs text-gray-500 block mb-1">Total Deposits</span>
                <span className="text-2xl font-bold text-[#10B981]">
                  +${totalDeposits.toFixed(2)}
                </span>
              </div>
              <div className="bg-[#0b0c10] p-4 rounded-lg border border-[#2a2b30]">
                <span className="text-xs text-gray-500 block mb-1">Total Withdrawals</span>
                <span className="text-2xl font-bold text-[#EF4444]">
                  -${totalWithdrawals.toFixed(2)}
                </span>
              </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Executive Summary Panel */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><Activity className="w-4 h-4"/> Executive Summary</h3>
          <div className="space-y-4">
            <div className="bg-[#0b0c10] p-4 rounded-lg border border-[#2a2b30]">
              <span className="text-xs text-gray-500 block mb-1">Average Daily ROI (USD)</span>
              <span className={`text-2xl font-bold ${dailyROI >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                ${dailyROI.toFixed(2)} <span className="text-xs text-gray-500 font-normal">/ day</span>
              </span>
            </div>
            <div className="bg-[#0b0c10] p-4 rounded-lg border border-[#2a2b30]">
              <span className="text-xs text-gray-500 block mb-1">Net Nominal Return</span>
              <span className={`text-2xl font-bold ${netNominalReturn >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                ${netNominalReturn.toFixed(2)}
              </span>
            </div>
            
            {/* Pure Operational PnL Context */}
            {currentTotalEquity > 0 && (
              <div className="bg-[#10B981]/5 border border-[#10B981]/20 p-3 rounded-lg flex items-start gap-3 mt-2">
                <ShieldAlert className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-[#10B981] block mb-0.5">Pure Operational PnL</span>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Excluding net external flow (${netExternalFlow.toFixed(2)}), your pure traded equity stands at <strong className="text-white">${pureOperationalEquity.toFixed(2)}</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seasonality Charts */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4"/> Seasonality Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Day of Week */}
            <div className="h-48">
              <span className="text-xs text-gray-500 block mb-2 text-center">Performance by Day of Week</span>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#8E9299" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <RechartsTooltip cursor={{fill: '#2a2b30', opacity: 0.4}} contentStyle={{ backgroundColor: '#151619', borderColor: '#2a2b30', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="PnL" radius={[4, 4, 0, 0]}>
                    {dayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.PnL >= 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Time of Day */}
            <div className="h-48">
              <span className="text-xs text-gray-500 block mb-2 text-center">Performance by 4-Hour Window</span>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#8E9299" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <RechartsTooltip cursor={{fill: '#2a2b30', opacity: 0.4}} contentStyle={{ backgroundColor: '#151619', borderColor: '#2a2b30', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="PnL" radius={[4, 4, 0, 0]}>
                    {hourData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.PnL >= 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      </div>

      {/* Milestone Tracker Matrix */}
      {milestones.length > 0 && (
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 overflow-hidden">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><Mountain className="w-4 h-4"/> Price Evolution Matrix (BTC)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 bg-[#0b0c10] border-b border-[#2a2b30]">
                <tr>
                  <th className="px-4 py-3 font-medium">BTC Price Bracket</th>
                  <th className="px-4 py-3 font-medium text-center">Days Spent</th>
                  <th className="px-4 py-3 font-medium text-right">Portfolio Start</th>
                  <th className="px-4 py-3 font-medium text-right">Portfolio End</th>
                  <th className="px-4 py-3 font-medium text-right">Bracket Net Flow</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m, idx) => (
                  <tr key={idx} className="border-b border-[#2a2b30]/50 hover:bg-[#2a2b30]/20 transition-colors">
                    <td className="px-4 py-3 text-gray-300 font-mono">{m.threshold}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{m.daysSpent}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300">${m.equityStart.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">${m.equityEnd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${m.equityChange >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {m.equityChange >= 0 ? '+' : ''}${m.equityChange.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

