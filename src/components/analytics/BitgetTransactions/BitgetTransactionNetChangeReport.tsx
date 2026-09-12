import React, { useMemo, useState } from 'react';
import Big from 'big.js';
import { BitgetTransactionLogEntry } from '../../../types';
import { BitgetTxStats } from '../../../hooks/useBitgetTransactions';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Activity } from 'lucide-react';
import { CoinIcon } from '../../ui/CoinIcon';

interface BitgetTransactionNetChangeReportProps {
  filteredEntries: BitgetTransactionLogEntry[];
  stats: BitgetTxStats;
  tokenRates: Record<string, number>;
  isPrivateMode?: boolean;
}

export function BitgetTransactionNetChangeReport({
  filteredEntries,
  stats,
  tokenRates,
  isPrivateMode = false,
}: BitgetTransactionNetChangeReportProps) {
  const [expandedReportCurrencies, setExpandedReportCurrencies] = useState<Record<string, boolean>>({});
  const formatCurrency = useFormatCurrency();

  const currencyReports = useMemo(() => {
    if (filteredEntries.length === 0) return [];
    
    const grouped: Record<string, typeof filteredEntries> = {};
    filteredEntries.forEach(e => {
      if (e.currency) {
        if (!grouped[e.currency]) grouped[e.currency] = [];
        grouped[e.currency].push(e);
      }
    });
    
    const isStable = (currency: string) => ['USDT', 'USDC', 'DAI', 'USD', 'BUSD'].includes(currency.toUpperCase());
    
    return Object.entries(grouped).map(([cur, curEntries]) => {
      const sorted = [...curEntries].sort((a, b) => a.transactionTime - b.transactionTime);
      const earliestTx = sorted[0];
      const latestTx = sorted[sorted.length - 1];
      
      const earliestTime = earliestTx?.transactionTime || Date.now();
      const latestTime = latestTx?.transactionTime || Date.now();
      const days = Math.max(1, Math.ceil((latestTime - earliestTime) / (1000 * 60 * 60 * 24)));
      
      const stableMatch = isStable(cur);
      const curStats = stableMatch ? stats.stable : (stats.perCurrency[cur] || {
        totalFunding: '0',
        totalFees: '0',
        totalCashFlow: '0',
        totalChange: '0',
        finalBalance: '0',
        totalInflow: '0',
        totalOutflow: '0',
        initialBalance: '0',
        percentageChange: 0
      });
      
      const totalChange = curStats.totalChange;
      const finalBalance = curStats.finalBalance;
      const totalInflow = curStats.totalInflow;
      const totalOutflow = curStats.totalOutflow;
      const initialBalance = curStats.initialBalance;
      const ganhoPercentual = curStats.percentageChange;
      
      const changeBig = new Big(totalChange);
      
      const rate = stableMatch ? 1 : (tokenRates[cur] || 0);
      const ganhoAbsolutoUSD = changeBig.times(rate).toString();
      
      const totalTrades = curEntries.filter(e => e.type.toUpperCase().includes('TRADE') || e.type.toUpperCase().includes('LONG') || e.type.toUpperCase().includes('SHORT')).length;
      const buysCount = curEntries.filter(e => e.side.toLowerCase().includes('buy') || e.side.toLowerCase().includes('long')).length;
      const sellsCount = curEntries.filter(e => e.side.toLowerCase().includes('sell') || e.side.toLowerCase().includes('short')).length;
      const buysPct = totalTrades > 0 ? (buysCount / totalTrades) * 100 : 0;
      const sellsPct = totalTrades > 0 ? (sellsCount / totalTrades) * 100 : 0;
      const tradesPerDay = totalTrades / days;
      
      const tradesLiquido = curEntries
        .filter(e => e.type.toUpperCase().includes('TRADE') || e.type.toUpperCase().includes('LONG') || e.type.toUpperCase().includes('SHORT'))
        .reduce((sum, e) => sum.plus(new Big(e.change || e.cashFlow || '0')), new Big(0))
        .toString();
        
      const fundingRate = curStats.totalFunding;
      const cashFlowTotal = curStats.totalCashFlow;
      const feesPagos = curStats.totalFees;
      
      const roiMedioDiario = days > 0 ? (ganhoPercentual / days) : 0;
      
      return {
        currency: cur,
        initialBalance,
        finalBalance,
        totalInflow,
        totalOutflow,
        ganhoPercentual,
        ganhoAbsoluto: totalChange,
        ganhoAbsolutoUSD,
        earliestTime,
        latestTime,
        days,
        totalTrades,
        buysCount,
        sellsCount,
        buysPct,
        sellsPct,
        tradesPerDay,
        tradesLiquido,
        fundingRate,
        cashFlowTotal,
        feesPagos,
        roiMedioDiario
      };
    });
  }, [filteredEntries, stats, tokenRates]);

  const toggleCurrency = (cur: string) => {
    setExpandedReportCurrencies(prev => ({
      ...prev,
      [cur]: !prev[cur]
    }));
  };

  const maskVal = (val: string | number, isFiat: boolean = true) => {
    if (isPrivateMode) return '****';
    const num = Number(val);
    return isFiat ? formatCurrency(num, 'usd') : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  if (currencyReports.length === 0) {
    return <div className="text-center py-6 text-sm text-[#8E9299]">No transactions found for the selected filters.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Overview Totals Card */}
      <div className="bg-[#111215] border border-[#2a2b30] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs text-[#8E9299] block mb-1">Total Net Change (Aggregated USD)</span>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold font-mono ${Number(stats.aggregatedUsd.totalChange) >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
              {maskVal(stats.aggregatedUsd.totalChange)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${stats.aggregatedUsd.percentageChange >= 0 ? 'bg-[#00C853]/10 text-[#00C853]' : 'bg-[#FF4444]/10 text-[#FF4444]'}`}>
              {stats.aggregatedUsd.percentageChange >= 0 ? '+' : ''}{stats.aggregatedUsd.percentageChange.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs text-[#8E9299]">
          <div>
            <span>Initial (Est): </span>
            <span className="text-white font-mono">{maskVal(stats.aggregatedUsd.initialBalance)}</span>
          </div>
          <div>
            <span>Final: </span>
            <span className="text-white font-mono">{maskVal(stats.aggregatedUsd.finalBalance)}</span>
          </div>
        </div>
      </div>

      {/* Currency breakdown */}
      <div className="space-y-3">
        {currencyReports.map((rep) => {
          const isExpanded = !!expandedReportCurrencies[rep.currency];
          const isProfit = Number(rep.ganhoAbsoluto) >= 0;

          return (
            <div key={rep.currency} className="bg-[#111215] border border-[#2a2b30] rounded-xl overflow-hidden">
              <div 
                onClick={() => toggleCurrency(rep.currency)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#161b22] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CoinIcon symbol={rep.currency} size={24} />
                  <div>
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      {rep.currency}
                      <span className="text-[11px] font-normal text-[#8E9299]">({rep.days} days)</span>
                    </span>
                    <span className="text-xs text-[#8E9299] font-mono">
                      {maskVal(rep.initialBalance, false)} → {maskVal(rep.finalBalance, false)} {rep.currency}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`text-sm font-bold font-mono block ${isProfit ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                      {isProfit ? '+' : ''}{maskVal(rep.ganhoAbsoluto, false)} {rep.currency}
                    </span>
                    <span className="text-[11px] font-mono text-[#8E9299]">
                      ≈ {maskVal(rep.ganhoAbsolutoUSD)} ({rep.ganhoPercentual >= 0 ? '+' : ''}{rep.ganhoPercentual.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="text-[#8E9299] p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 bg-[#0d0e11] border-t border-[#2a2b30] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[#8E9299] block mb-1">Total Inflow / Deposits:</span>
                    <span className="text-[#00C853] font-mono font-medium">+{maskVal(rep.totalInflow, false)} {rep.currency}</span>
                  </div>
                  <div>
                    <span className="text-[#8E9299] block mb-1">Total Outflow / Withdrawals:</span>
                    <span className="text-[#FF4444] font-mono font-medium">-{maskVal(rep.totalOutflow, false)} {rep.currency}</span>
                  </div>
                  <div>
                    <span className="text-[#8E9299] block mb-1">Fees Paid:</span>
                    <span className="text-[#FF4444] font-mono font-medium">{maskVal(rep.feesPagos, false)} {rep.currency}</span>
                  </div>
                  <div>
                    <span className="text-[#8E9299] block mb-1">Funding Settled:</span>
                    <span className="text-white font-mono font-medium">{maskVal(rep.fundingRate, false)} {rep.currency}</span>
                  </div>
                  <div>
                    <span className="text-[#8E9299] block mb-1">Trades Count:</span>
                    <span className="text-white font-mono font-medium">{rep.totalTrades} ({rep.tradesPerDay.toFixed(1)}/day)</span>
                  </div>
                  <div>
                    <span className="text-[#8E9299] block mb-1">Buy / Sell Ratio:</span>
                    <span className="text-white font-mono font-medium">{rep.buysCount} ({rep.buysPct.toFixed(0)}%) / {rep.sellsCount} ({rep.sellsPct.toFixed(0)}%)</span>
                  </div>
                  <div>
                    <span className="text-[#8E9299] block mb-1">Daily Avg ROI:</span>
                    <span className={`font-mono font-medium ${rep.roiMedioDiario >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                      {rep.roiMedioDiario >= 0 ? '+' : ''}{rep.roiMedioDiario.toFixed(2)}%/day
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8E9299] block mb-1">Cash Flow Net:</span>
                    <span className="text-white font-mono font-medium">{maskVal(rep.cashFlowTotal, false)} {rep.currency}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
