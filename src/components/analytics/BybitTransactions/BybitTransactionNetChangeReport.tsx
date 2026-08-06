import React, { useMemo, useState } from 'react';
import Big from 'big.js';
import { BybitTransactionLogEntry } from '../../../types';
import { TxStats } from '../../../hooks/useBybitTransactions';

interface BybitTransactionNetChangeReportProps {
  filteredEntries: BybitTransactionLogEntry[];
  stats: TxStats;
  tokenRates: Record<string, number>;
  isPrivateMode?: boolean;
}

export function BybitTransactionNetChangeReport({
  filteredEntries,
  stats,
  tokenRates,
  isPrivateMode = false,
}: BybitTransactionNetChangeReportProps) {
  const [expandedReportCurrencies, setExpandedReportCurrencies] = useState<Record<string, boolean>>({});

  const currencyReports = useMemo(() => {
    if (filteredEntries.length === 0) return [];
    
    const grouped: Record<string, typeof filteredEntries> = {};
    filteredEntries.forEach(e => {
      if (e.currency) {
        if (!grouped[e.currency]) grouped[e.currency] = [];
        grouped[e.currency].push(e);
      }
    });
    
    const isStable = (currency: string) => ['USDT', 'USDC', 'DAI', 'USD'].includes(currency.toUpperCase());
    
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
      
      const totalTrades = curEntries.filter(e => e.type === 'TRADE').length;
      const buysCount = curEntries.filter(e => e.type === 'TRADE' && e.side === 'Buy').length;
      const sellsCount = curEntries.filter(e => e.type === 'TRADE' && e.side === 'Sell').length;
      const buysPct = totalTrades > 0 ? (buysCount / totalTrades) * 100 : 0;
      const sellsPct = totalTrades > 0 ? (sellsCount / totalTrades) * 100 : 0;
      const tradesPerDay = totalTrades / days;
      
      const tradesLiquido = curEntries
        .filter(e => e.type === 'TRADE')
        .reduce((sum, e) => sum.plus(new Big(e.change || '0')), new Big(0))
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
        roiMedioDiario,
        isStable: stableMatch,
      };
    }).sort((a, b) => {
      if (a.isStable && !b.isStable) return 1;
      if (!a.isStable && b.isStable) return -1;
      return Math.abs(Number(b.ganhoAbsolutoUSD)) - Math.abs(Number(a.ganhoAbsolutoUSD));
    });
  }, [filteredEntries, stats, tokenRates]);

  return (
    <div className="flex flex-col gap-4 text-white">
      <p className="text-xs text-[#8E9299]">
        Detailed operational performance by asset, calculating absolute returns, trade distributions, funding impact, and fees.
      </p>
      
      {currencyReports.length === 0 ? (
        <div className="text-[#8E9299] text-sm text-center py-8">No transaction data available for report.</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end gap-2.5 text-xs border-b border-[#2a2b30]/30 pb-2">
            <button
              type="button"
              onClick={() => {
                const allExpanded: Record<string, boolean> = {};
                currencyReports.forEach(r => {
                  allExpanded[r.currency] = true;
                });
                setExpandedReportCurrencies(allExpanded);
              }}
              className="text-[#F0B90B] hover:text-[#f3c73e] transition-colors font-medium px-2.5 py-1 rounded bg-[#2a2b30]/40 hover:bg-[#2a2b30]/70 cursor-pointer"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={() => setExpandedReportCurrencies({})}
              className="text-[#8E9299] hover:text-white transition-colors font-medium px-2.5 py-1 rounded bg-[#2a2b30]/40 hover:bg-[#2a2b30]/70 cursor-pointer"
            >
              Collapse All
            </button>
          </div>

          {currencyReports.map((report) => {
            const isPositive = new Big(report.ganhoAbsoluto).gte(0);
            const hasTrades = report.totalTrades > 0;
            const feesBig = new Big(report.feesPagos);
            const isExpanded = !!expandedReportCurrencies[report.currency];
            
            return (
              <div 
                key={report.currency} 
                className="bg-[#1e232b] rounded-lg border border-[#2a2b30] overflow-hidden transition-all duration-200"
              >
                {/* Header Panel (Accordion Trigger) */}
                <div 
                  onClick={() => {
                    setExpandedReportCurrencies(prev => ({
                      ...prev,
                      [report.currency]: !prev[report.currency]
                    }));
                  }}
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#2a2b30]/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white text-lg">{report.currency}</span>
                    <span className="text-[#8E9299] text-xs px-2 py-0.5 bg-[#2a2b30]/50 rounded-full">
                      {report.days} dias ativos
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className={`font-bold font-mono ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                        {isPositive ? '+' : ''}{report.ganhoPercentual.toFixed(2)}%
                      </span>
                      <span className="text-xs text-[#8E9299] font-mono">
                        {isPrivateMode ? "****" : `${isPositive ? "+" : ""}${Number(report.ganhoAbsolutoUSD).toFixed(2)} USD`}
                      </span>
                    </div>
                    <svg 
                      className={`w-5 h-5 text-[#8E9299] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="p-4 border-t border-[#2a2b30]/50 bg-[#161b22]/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left Column: Balances and Gains */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-white flex items-center justify-between pb-1 border-b border-[#2a2b30]">
                          <span>Resultado Principal</span>
                          <span className="text-[9px] text-[#8E9299]/70 capitalize font-normal">Asset Summary</span>
                        </h4>
                        <div className="flex flex-col gap-1.5 text-xs font-mono">
                          <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                            <span className="text-[#8E9299]">Saldo Inicial</span>
                            <span className="text-[#d1d5db] font-medium">{isPrivateMode ? "****" : `${Number(report.initialBalance).toFixed(6)} ${report.currency}`}</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                            <span className="text-[#8E9299]">Total Inflow</span>
                            <span className="text-[#00C853] font-medium">{isPrivateMode ? "****" : `+${Number(report.totalInflow).toFixed(6)} ${report.currency}`}</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                            <span className="text-[#8E9299]">Total Outflow</span>
                            <span className="text-[#FF4444] font-medium">{isPrivateMode ? "****" : `-${Number(report.totalOutflow).toFixed(6)} ${report.currency}`}</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                            <span className="text-[#8E9299]">Saldo Final</span>
                            <span className="text-white font-bold">{isPrivateMode ? "****" : `${Number(report.finalBalance).toFixed(6)} ${report.currency}`}</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                            <span className="text-[#8E9299]">Ganho Percentual</span>
                            <span className={`font-bold ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                              {isPositive ? '+' : ''}{report.ganhoPercentual.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                            <span className="text-[#8E9299]">Ganho Absoluto</span>
                            <span className={`font-bold ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                              {isPrivateMode ? "****" : `${isPositive ? "+" : ""}${Number(report.ganhoAbsoluto).toFixed(6)} ${report.currency}`}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5">
                            <span className="text-[#8E9299]">Ganho Absoluto em USD</span>
                            <span className={`font-bold ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                              {isPrivateMode ? "****" : `${isPositive ? "+$" : "-$"}${Math.abs(Number(report.ganhoAbsolutoUSD)).toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Operational Metrics */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-white flex items-center justify-between pb-1 border-b border-[#2a2b30]">
                          <span>Métricas Operacionais</span>
                          <span className="text-[9px] text-[#8E9299]/70 capitalize font-normal">Operational Stats</span>
                        </h4>
                        <div className="flex flex-col gap-1.5 text-xs font-mono">
                          <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                            <span className="text-[#8E9299]">Total Trades Realizados</span>
                            <span className="text-[#d1d5db] font-medium">{report.totalTrades} trades</span>
                          </div>
                          
                          {hasTrades && (
                            <>
                              <div className="flex justify-between py-1 border-b border-[#2a2b30]/20 pl-1.5">
                                <span className="text-[#8E9299]/80">─ Compras (BUY)</span>
                                <span className="text-[#00C853] font-medium">
                                  {report.buysCount} ({report.buysPct.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-[#2a2b30]/20 pl-1.5">
                                <span className="text-[#8E9299]/80">─ Vendas (SELL)</span>
                                <span className="text-[#FF4444] font-medium">
                                  {report.sellsCount} ({report.sellsPct.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-[#2a2b30]/20 pl-1.5">
                                <span className="text-[#8E9299]/80">─ Média por Dia</span>
                                <span className="text-[#d1d5db] font-medium">{report.tradesPerDay.toFixed(2)} trades/dia</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-[#2a2b30]/30 pl-1.5">
                                <span className="text-[#8E9299]/80">─ Trades Líquido</span>
                                <span className={`font-medium ${new Big(report.tradesLiquido).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                  {isPrivateMode ? "****" : `${new Big(report.tradesLiquido).gt(0) ? "+" : ""}${Number(report.tradesLiquido).toFixed(6)} ${report.currency}`}
                                </span>
                              </div>
                            </>
                          )}
                          
                          <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                            <span className="text-[#8E9299]">Funding Rate</span>
                            <span className={`font-medium ${new Big(report.fundingRate).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                              {isPrivateMode ? "****" : `${new Big(report.fundingRate).gt(0) ? "+" : ""}${Number(report.fundingRate).toFixed(6)} ${report.currency}`}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                            <span className="text-[#8E9299]">Cash Flow Total</span>
                            <span className="text-[#d1d5db] font-medium">
                              {isPrivateMode ? "****" : `${Number(report.cashFlowTotal).toFixed(6)} ${report.currency}`}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                            <span className="text-[#8E9299]">Fees Pagos</span>
                            <span className="text-[#FF4444] font-medium">
                              {isPrivateMode ? "****" : `${feesBig.gt(0) ? "-" : ""}${Number(report.feesPagos).toFixed(6)} ${report.currency}`}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5">
                            <span className="text-[#8E9299]">ROI Médio Diário</span>
                            <span className={`font-bold ${report.roiMedioDiario >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                              {report.roiMedioDiario >= 0 ? '+' : ''}{report.roiMedioDiario.toFixed(4)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
