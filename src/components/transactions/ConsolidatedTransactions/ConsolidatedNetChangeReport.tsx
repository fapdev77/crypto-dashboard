import React, { useMemo, useState } from 'react';
import Big from 'big.js';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { BybitTransactionLogEntry, BitgetTransactionLogEntry, OkxTransactionLogEntry } from '../../../types';
import { ExchangeStatsBlock } from '../../../hooks/useConsolidatedTransactions';
import { CoinIcon } from '../../ui/CoinIcon';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { getBybitUniversalType, getBitgetUniversalType, getOkxUniversalType } from '../../../utils/transactionTypeMapper';

interface ConsolidatedNetChangeReportProps {
  filteredByExchange: {
    bybit: BybitTransactionLogEntry[];
    bitget: BitgetTransactionLogEntry[];
    okx: OkxTransactionLogEntry[];
  };
  exchangeStats: {
    bybit: ExchangeStatsBlock;
    bitget: ExchangeStatsBlock;
    okx: ExchangeStatsBlock;
  };
  tokenRates: Record<string, number>;
  isPrivateMode?: boolean;
}

interface AssetReportItem {
  currency: string;
  initialBalance: string;
  finalBalance: string;
  totalInflow: string;
  totalOutflow: string;
  ganhoPercentual: number;
  ganhoAbsoluto: string;
  ganhoAbsolutoUSD: string;
  earliestTime: number;
  latestTime: number;
  days: number;
  totalTrades: number;
  buysCount: number;
  sellsCount: number;
  buysPct: number;
  sellsPct: number;
  tradesPerDay: number;
  tradesLiquido: string;
  fundingRate: string;
  cashFlowTotal: string;
  feesPagos: string;
  roiMedioDiario: number;
  isStable: boolean;
}

interface ExchangeGroupData {
  exchange: 'bybit' | 'bitget' | 'okx';
  displayName: string;
  totalTransactions: number;
  netChangeUsd: string;
  totalFundingUsd: string;
  totalFeesUsd: string;
  reports: AssetReportItem[];
}

export function ConsolidatedNetChangeReport({
  filteredByExchange,
  exchangeStats,
  tokenRates,
  isPrivateMode = false,
}: ConsolidatedNetChangeReportProps) {
  // State for expanded exchange sections (default all open)
  const [expandedExchanges, setExpandedExchanges] = useState<Record<string, boolean>>({
    bybit: true,
    bitget: true,
    okx: true,
  });

  // State for expanded currency accordions inside each exchange: key is `${exchange}-${currency}`
  const [expandedCurrencies, setExpandedCurrencies] = useState<Record<string, boolean>>({});

  const isStable = (currency: string) => ['USDT', 'USDC', 'DAI', 'USD', 'BUSD'].includes(currency.toUpperCase());

  // Build report items for each exchange
  const exchangeGroups = useMemo<ExchangeGroupData[]>(() => {
    const list: ExchangeGroupData[] = [];

    const buildGroup = (
      exchange: 'bybit' | 'bitget' | 'okx',
      displayName: string,
      entries: any[],
      stats: ExchangeStatsBlock,
      getUniversalTypeFn: (e: any) => string,
      getSideFn: (e: any) => string
    ): ExchangeGroupData | null => {
      if (entries.length === 0) return null;

      // Group entries by currency
      const grouped: Record<string, any[]> = {};
      entries.forEach(e => {
        if (e.currency) {
          if (!grouped[e.currency]) grouped[e.currency] = [];
          grouped[e.currency].push(e);
        }
      });

      const reports: AssetReportItem[] = Object.entries(grouped).map(([cur, curEntries]) => {
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
          percentageChange: 0,
        });

        const totalChange = curStats.totalChange;
        const finalBalance = curStats.finalBalance;
        const totalInflow = curStats.totalInflow;
        const totalOutflow = curStats.totalOutflow;
        const initialBalance = curStats.initialBalance;
        const ganhoPercentual = curStats.percentageChange;

        const changeBig = new Big(totalChange);
        const rate = stableMatch ? 1 : (tokenRates[cur.toUpperCase()] || 0);
        const ganhoAbsolutoUSD = changeBig.times(rate).toString();

        const tradeEntries = curEntries.filter(e => getUniversalTypeFn(e) === 'TRADE');
        const totalTrades = tradeEntries.length;

        const buysCount = tradeEntries.filter(e => {
          const side = getSideFn(e).toLowerCase();
          return side.includes('buy') || side.includes('long');
        }).length;

        const sellsCount = tradeEntries.filter(e => {
          const side = getSideFn(e).toLowerCase();
          return side.includes('sell') || side.includes('short');
        }).length;

        const buysPct = totalTrades > 0 ? (buysCount / totalTrades) * 100 : 0;
        const sellsPct = totalTrades > 0 ? (sellsCount / totalTrades) * 100 : 0;
        const tradesPerDay = totalTrades / days;

        const tradesLiquido = tradeEntries
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
          roiMedioDiario,
          isStable: stableMatch,
        };
      }).sort((a, b) => {
        if (a.isStable && !b.isStable) return 1;
        if (!a.isStable && b.isStable) return -1;
        return Math.abs(Number(b.ganhoAbsolutoUSD)) - Math.abs(Number(a.ganhoAbsolutoUSD));
      });

      return {
        exchange,
        displayName,
        totalTransactions: entries.length,
        netChangeUsd: stats.aggregatedUsd.totalChange,
        totalFundingUsd: stats.aggregatedUsd.totalFunding,
        totalFeesUsd: stats.aggregatedUsd.totalFees,
        reports,
      };
    };

    const bybitGroup = buildGroup(
      'bybit',
      'Bybit',
      filteredByExchange.bybit,
      exchangeStats.bybit,
      (e) => getBybitUniversalType(e.type, e.funding),
      (e) => e.side || ''
    );
    if (bybitGroup) list.push(bybitGroup);

    const bitgetGroup = buildGroup(
      'bitget',
      'Bitget',
      filteredByExchange.bitget,
      exchangeStats.bitget,
      (e) => getBitgetUniversalType(e.type, e.funding),
      (e) => e.side || ''
    );
    if (bitgetGroup) list.push(bitgetGroup);

    const okxGroup = buildGroup(
      'okx',
      'OKX',
      filteredByExchange.okx,
      exchangeStats.okx,
      (e) => getOkxUniversalType(e),
      (e) => `${e.side || ''} ${e.transSubType || e.subType || ''}`
    );
    if (okxGroup) list.push(okxGroup);

    return list;
  }, [filteredByExchange, exchangeStats, tokenRates]);

  const handleExpandAll = () => {
    const allExchs: Record<string, boolean> = {};
    const allCurrs: Record<string, boolean> = {};
    exchangeGroups.forEach(grp => {
      allExchs[grp.exchange] = true;
      grp.reports.forEach(r => {
        allCurrs[`${grp.exchange}-${r.currency}`] = true;
      });
    });
    setExpandedExchanges(allExchs);
    setExpandedCurrencies(allCurrs);
  };

  const handleCollapseAll = () => {
    setExpandedCurrencies({});
  };

  if (exchangeGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl text-center">
        <Layers className="w-12 h-12 text-[#8E9299] mb-3 opacity-60" />
        <h3 className="text-base font-semibold text-white mb-1">No Consolidated Transaction Data</h3>
        <p className="text-xs text-[#8E9299] max-w-md">
          No records found matching the active exchange, currency, or timeframe filters. Adjust your filters or wait for synchronization to complete.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-white">
      {/* Controls: Description and Expand/Collapse All */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#2a2b30]/40">
        <div>
          <h3 className="text-sm font-semibold text-white">Exchange & Asset Performance Breakdown</h3>
          <p className="text-xs text-[#8E9299] mt-0.5">
            Grouped by exchange, calculating realized returns, trade distribution, funding fee contributions, and trading costs.
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs shrink-0">
          <button
            type="button"
            onClick={handleExpandAll}
            className="text-[#2F6BFF] hover:text-[#5287ff] transition-colors font-medium px-3 py-1.5 rounded-lg bg-[#2a2b30]/40 hover:bg-[#2a2b30]/70 cursor-pointer"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="text-[#8E9299] hover:text-white transition-colors font-medium px-3 py-1.5 rounded-lg bg-[#2a2b30]/40 hover:bg-[#2a2b30]/70 cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Exchange Groups */}
      <div className="space-y-6">
        {exchangeGroups.map((group) => {
          const isExchangeExpanded = expandedExchanges[group.exchange] !== false;
          const exchNetChangeBig = new Big(group.netChangeUsd || '0');
          const isExchPositive = exchNetChangeBig.gte(0);

          return (
            <div
              key={group.exchange}
              className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden transition-all shadow-sm"
            >
              {/* Exchange Section Header */}
              <div
                onClick={() => {
                  setExpandedExchanges(prev => ({
                    ...prev,
                    [group.exchange]: !isExchangeExpanded,
                  }));
                }}
                className="flex flex-wrap items-center justify-between p-4 bg-[#1a1b1e]/80 hover:bg-[#2a2b30]/40 cursor-pointer transition-colors border-b border-[#2a2b30]/40 gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2a2b30]/50 flex items-center justify-center p-1.5 border border-[#2a2b30]">
                    <ExchangeIcon exchange={group.exchange} className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-white">{group.displayName}</span>
                      <span className="text-[11px] text-[#8E9299] px-2 py-0.5 bg-[#2a2b30]/60 rounded-md font-mono">
                        {group.totalTransactions} transactions
                      </span>
                    </div>
                    <span className="text-[11px] text-[#8E9299]">
                      {group.reports.length} {group.reports.length === 1 ? 'tracked asset' : 'tracked assets'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-auto">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-[#8E9299] uppercase tracking-wider">Exchange Net Change</span>
                    <span className={`font-bold font-mono text-sm sm:text-base ${isExchPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                      {isPrivateMode ? '****' : `${isExchPositive ? '+$' : '-$'}${Math.abs(Number(group.netChangeUsd)).toFixed(2)} USD`}
                    </span>
                  </div>

                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2a2b30]/30 text-gray-400">
                    {isExchangeExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Currency Accordion Cards inside Exchange */}
              {isExchangeExpanded && (
                <div className="p-4 space-y-3 bg-[#111215]/50">
                  {group.reports.map((report) => {
                    const currKey = `${group.exchange}-${report.currency}`;
                    const isCurrencyExpanded = !!expandedCurrencies[currKey];
                    const isPositive = new Big(report.ganhoAbsoluto).gte(0);
                    const hasTrades = report.totalTrades > 0;
                    const feesBig = new Big(report.feesPagos);

                    return (
                      <div
                        key={currKey}
                        className="bg-[#161b22] rounded-lg border border-[#2a2b30] overflow-hidden transition-all duration-200"
                      >
                        {/* Currency Header Bar */}
                        <div
                          onClick={() => {
                            setExpandedCurrencies(prev => ({
                              ...prev,
                              [currKey]: !prev[currKey],
                            }));
                          }}
                          className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-[#2a2b30]/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <CoinIcon symbol={report.currency} size={24} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-base">{report.currency}</span>
                                {report.isStable && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
                                    Stable
                                  </span>
                                )}
                              </div>
                              <span className="text-[#8E9299] text-xs">
                                {report.days} active {report.days === 1 ? 'day' : 'days'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                              <span className={`font-bold font-mono text-sm sm:text-base ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                {isPositive ? '+' : ''}{report.ganhoPercentual.toFixed(2)}%
                              </span>
                              <span className="text-xs text-[#8E9299] font-mono">
                                {isPrivateMode ? '****' : `${isPositive ? '+' : ''}${Number(report.ganhoAbsolutoUSD).toFixed(2)} USD`}
                              </span>
                            </div>

                            <div className="text-[#8E9299]">
                              {isCurrencyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Currency Expanded Details Body */}
                        {isCurrencyExpanded && (
                          <div className="p-4 border-t border-[#2a2b30]/60 bg-[#12161c]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left Column: Primary Result */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between pb-1.5 border-b border-[#2a2b30]">
                                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                                    Primary Result
                                  </h4>
                                  <span className="text-[10px] text-[#8E9299]">Asset Summary</span>
                                </div>

                                <div className="flex flex-col gap-1.5 text-xs font-mono">
                                  <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                    <span className="text-[#8E9299]">Initial Balance</span>
                                    <span className="text-gray-300 font-medium">
                                      {isPrivateMode ? '****' : `${Number(report.initialBalance).toFixed(6)} ${report.currency}`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                    <span className="text-[#8E9299]">Total Inflow</span>
                                    <span className="text-[#00C853] font-medium">
                                      {isPrivateMode ? '****' : `+${Number(report.totalInflow).toFixed(6)} ${report.currency}`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                    <span className="text-[#8E9299]">Total Outflow</span>
                                    <span className="text-[#FF4444] font-medium">
                                      {isPrivateMode ? '****' : `-${Number(report.totalOutflow).toFixed(6)} ${report.currency}`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                    <span className="text-[#8E9299]">Final Balance</span>
                                    <span className="text-white font-bold">
                                      {isPrivateMode ? '****' : `${Number(report.finalBalance).toFixed(6)} ${report.currency}`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                    <span className="text-[#8E9299]">Percentage Gain</span>
                                    <span className={`font-bold ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                      {isPositive ? '+' : ''}{report.ganhoPercentual.toFixed(2)}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                    <span className="text-[#8E9299]">Absolute Gain</span>
                                    <span className={`font-bold ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                      {isPrivateMode ? '****' : `${isPositive ? '+' : ''}${Number(report.ganhoAbsoluto).toFixed(6)} ${report.currency}`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1.5">
                                    <span className="text-[#8E9299]">Absolute Gain (USD)</span>
                                    <span className={`font-bold ${isPositive ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                      {isPrivateMode ? '****' : `${isPositive ? '+$' : '-$'}${Math.abs(Number(report.ganhoAbsolutoUSD)).toFixed(2)}`}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Column: Operational Metrics */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between pb-1.5 border-b border-[#2a2b30]">
                                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                                    Operational Metrics
                                  </h4>
                                  <span className="text-[10px] text-[#8E9299]">Activity Stats</span>
                                </div>

                                <div className="flex flex-col gap-1.5 text-xs font-mono">
                                  <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                    <span className="text-[#8E9299]">Total Trades Executed</span>
                                    <span className="text-gray-300 font-medium">{report.totalTrades} trades</span>
                                  </div>

                                  {hasTrades && (
                                    <>
                                      <div className="flex justify-between py-1 border-b border-[#2a2b30]/20 pl-2">
                                        <span className="text-[#8E9299]/80">─ Buys (BUY)</span>
                                        <span className="text-[#00C853]">
                                          {report.buysCount} ({report.buysPct.toFixed(1)}%)
                                        </span>
                                      </div>
                                      <div className="flex justify-between py-1 border-b border-[#2a2b30]/20 pl-2">
                                        <span className="text-[#8E9299]/80">─ Sells (SELL)</span>
                                        <span className="text-[#FF4444]">
                                          {report.sellsCount} ({report.sellsPct.toFixed(1)}%)
                                        </span>
                                      </div>
                                    </>
                                  )}

                                  <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                    <span className="text-[#8E9299]">Average Trades / Day</span>
                                    <span className="text-gray-300 font-medium">{report.tradesPerDay.toFixed(1)} trades/day</span>
                                  </div>

                                  <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                    <span className="text-[#8E9299]">Net Trading Flow</span>
                                    <span className={`font-medium ${new Big(report.tradesLiquido).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                      {isPrivateMode ? '****' : `${new Big(report.tradesLiquido).gte(0) ? '+' : ''}${Number(report.tradesLiquido).toFixed(6)} ${report.currency}`}
                                    </span>
                                  </div>

                                  <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                    <span className="text-[#8E9299]">Total Funding Fee</span>
                                    <span className={`font-medium ${new Big(report.fundingRate).gte(0) ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                      {isPrivateMode ? '****' : `${new Big(report.fundingRate).gte(0) ? '+' : ''}${Number(report.fundingRate).toFixed(6)} ${report.currency}`}
                                    </span>
                                  </div>

                                  <div className="flex justify-between py-1.5 border-b border-[#2a2b30]/30">
                                    <span className="text-[#8E9299]">Trading Fees Paid</span>
                                    <span className={`font-medium ${feesBig.gt(0) ? 'text-[#FF4444]' : 'text-gray-300'}`}>
                                      {isPrivateMode ? '****' : `${feesBig.gt(0) ? '-' : ''}${feesBig.abs().toFixed(6)} ${report.currency}`}
                                    </span>
                                  </div>

                                  <div className="flex justify-between py-1.5">
                                    <span className="text-[#8E9299]">Average Daily ROI</span>
                                    <span className={`font-bold ${report.roiMedioDiario >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                      {report.roiMedioDiario >= 0 ? '+' : ''}{report.roiMedioDiario.toFixed(3)}%/day
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
        })}
      </div>
    </div>
  );
}
