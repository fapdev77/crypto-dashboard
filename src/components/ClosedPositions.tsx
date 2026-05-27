import React, { useMemo, useState, useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { formatValue, formatCrypto, formatPrice } from '../utils/formatters';
import { usePositionHistory } from '../hooks/usePositionHistory';
import { Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { CoinIcon } from './ui/CoinIcon';
import { ExchangeIcon } from './ui/ExchangeIcon';

import { HistoryLimitWarning } from './ui/HistoryLimitWarning';

interface ClosedPositionsProps {
  filterText: string;
  exchangeFilter: string;
  period: '1w' | '2w' | '1m' | 'custom';
  customStartDate: string;
  customEndDate: string;
  onCustomDateSearch: () => void;
  triggerSearch: boolean; // Just a dummy prop if needed to re-trigger
}

export function ClosedPositions({ filterText, exchangeFilter, period, customStartDate, customEndDate, triggerSearch }: ClosedPositionsProps) {
  const { positions: closedPositions, isLoading } = usePositionHistory(period, customStartDate, customEndDate, triggerSearch);
  const [error, setError] = useState<string | null>(null);

  const filteredClosedPositions = useMemo(() => {
    let filtered = [...closedPositions];
    
    if (exchangeFilter !== 'all') {
      filtered = filtered.filter(p => p.exchange.toLowerCase() === exchangeFilter.toLowerCase());
    }

    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filtered = filtered.filter(p => 
        p.symbol.toLowerCase().includes(lowerFilter) || 
        p.label.toLowerCase().includes(lowerFilter) ||
        p.exchange.toLowerCase().includes(lowerFilter)
      );
    }

    return filtered;
  }, [closedPositions, filterText, exchangeFilter]);

  const closedStats = useMemo(() => {
    if (!filteredClosedPositions.length) return null;
    
    let totalPnl = 0;
    let wins = 0;
    let losses = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let sumWin = 0;
    let sumLoss = 0;

    filteredClosedPositions.forEach(p => {
      const pnlCurrency = p.ccy || p.baseCoin || 'USDT';
      const isFiatCcy = pnlCurrency.includes('USD') || pnlCurrency === 'EUR';
      let pnlInUsd = p.realizedPnl;
      if (!isFiatCcy && p.closePrice) {
        pnlInUsd = p.realizedPnl * p.closePrice;
      }

      totalPnl += pnlInUsd;
      if (pnlInUsd > 0) {
        wins++;
        sumWin += pnlInUsd;
        if (pnlInUsd > largestWin) largestWin = pnlInUsd;
      } else if (pnlInUsd < 0) {
        losses++;
        sumLoss += pnlInUsd;
        if (pnlInUsd < largestLoss) largestLoss = pnlInUsd;
      }
    });

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgWin = wins > 0 ? sumWin / wins : 0;
    const avgLoss = losses > 0 ? sumLoss / losses : 0;

    return {
      totalPnl,
      totalTrades,
      winRate,
      wins,
      losses,
      largestWin,
      largestLoss,
      avgWin,
      avgLoss
    };
  }, [filteredClosedPositions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#2F6BFF] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-[#FF4444] text-sm bg-[#151619] rounded-xl border border-[#2a2b30]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HistoryLimitWarning period={period} customStartDate={customStartDate} customEndDate={customEndDate} />
      
      {closedStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-[#151619] border border-[#2a2b30] p-4 rounded-xl">
            <span className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Total PnL</span>
            <div className={`text-xl font-bold mt-1 ${closedStats.totalPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
              {closedStats.totalPnl >= 0 ? '+' : ''}{closedStats.totalPnl.toFixed(2)} USDT
            </div>
          </div>
          
          <div className="bg-[#151619] border border-[#2a2b30] p-4 rounded-xl">
            <span className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Win Rate</span>
            <div className="text-xl font-bold mt-1 text-white">
              {closedStats.winRate.toFixed(2)}%
            </div>
            <div className="text-xs text-[#8E9299] mt-1">
              {closedStats.wins} W / {closedStats.losses} L
            </div>
          </div>

          <div className="bg-[#151619] border border-[#2a2b30] p-4 rounded-xl">
            <span className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Trades</span>
            <div className="text-xl font-bold mt-1 text-white">
              {closedStats.totalTrades}
            </div>
          </div>

          <div className="bg-[#151619] border border-[#2a2b30] p-4 rounded-xl">
            <span className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Avg Win / Loss</span>
            <div className="text-sm font-medium mt-1">
              <span className="text-[#00C853]">+{closedStats.avgWin.toFixed(2)}</span>
              <span className="text-[#8E9299] mx-1">/</span>
              <span className="text-[#FF4444]">{closedStats.avgLoss.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-[#151619] border border-[#2a2b30] p-4 rounded-xl">
            <span className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Largest W/L</span>
            <div className="text-sm font-medium mt-1">
              <span className="text-[#00C853]">+{closedStats.largestWin.toFixed(2)}</span>
              <span className="text-[#8E9299] mx-1">/</span>
              <span className="text-[#FF4444]">{closedStats.largestLoss.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {filteredClosedPositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl">
          <p className="text-[#8E9299]">Nenhum histórico encontrado para as APIs ativas no período.</p>
        </div>
      ) : (
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-[900px]">
            <thead>
              <tr className="border-b border-[#2a2b30] text-xs text-[#8E9299]">
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Futures</th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Open time</th>
                <th className="px-4 py-3 font-normal">
                  <div className="w-max border-b border-dashed border-[#8E9299]/50">Avg. entry price</div>
                  <div className="w-max border-b border-dashed border-[#8E9299]/50 mt-1">Avg. exit price</div>
                </th>
                <th className="px-4 py-3 font-normal">
                  <div className="w-max border-b border-dashed border-[#8E9299]/50">Closed quantity</div>
                  <div className="w-max border-b border-dashed border-[#8E9299]/50 mt-1">Max position size</div>
                </th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Position PnL</th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Position ROI</th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Closed time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2b30]">
              {filteredClosedPositions.map((p) => {
                const isLong = p.side?.toLowerCase() === 'long' || p.side?.toLowerCase() === 'buy';
                const isShort = p.side?.toLowerCase() === 'short' || p.side?.toLowerCase() === 'sell';
                const sideLabel = isLong ? 'Long' : isShort ? 'Short' : p.side || 'Net';
                const sideColor = isLong ? 'text-[#00C853]' : isShort ? 'text-[#FF4444]' : 'text-gray-400';
                
                const pnlClass = p.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';
                
                const leverage = p.raw?.leverage || p.raw?.lever || '1';
                const marginModeLabel = (p.raw?.marginMode || p.raw?.mgnMode || 'cross').toLowerCase() === 'isolated' ? 'Isolated' : 'Cross';
                const symbolSuffix = p.symbol.replace(/USDT|USDC|USD|-|SWAP/g, '');

                let roiStr = '--';
                let roiValue = 0;
                let hasRoi = false;
                
                // Identify the quote currency for the PnL (e.g. USDT)
                const pnlCurrency = p.ccy || p.baseCoin || 'USDT';
                const isFiatCcy = pnlCurrency.includes('USD') || pnlCurrency === 'EUR';
                const isFiatPair = p.symbol.includes('USD') || p.symbol.includes('EUR');
                const formatCcy = (v: number | undefined | null) => isFiatCcy ? formatValue(v, 2) : formatCrypto(v);
                
                const isInverse = p.instrumentType === 'INVERSE';

                let positionValueUsd = 0;
                let actualCoinSize = p.size || 0;

                if (p.exchange === 'okx' && p.raw?.pnl) {
                  const priceDiff = Math.abs((p.closePrice || 0) - (p.entryPrice || 0));
                  const purePnl = Math.abs(parseFloat(p.raw.pnl));
                  if (priceDiff > 0) {
                    actualCoinSize = purePnl / priceDiff;
                    positionValueUsd = actualCoinSize * (p.entryPrice || 0);
                  } else {
                    positionValueUsd = (p.entryPrice || 0) * (p.size || 0);
                  }
                } else if (p.exchange === 'bybit' && p.raw?.cumEntryValue) {
                  positionValueUsd = parseFloat(p.raw.cumEntryValue);
                  actualCoinSize = p.entryPrice ? positionValueUsd / p.entryPrice : 0;
                } else if (isInverse) {
                  positionValueUsd = p.size || 0;
                  actualCoinSize = p.entryPrice ? positionValueUsd / p.entryPrice : 0;
                } else {
                  positionValueUsd = (p.entryPrice || 0) * (p.size || 0);
                  actualCoinSize = p.size || 0;
                }
                
                if (p.raw?.roi !== undefined && p.raw?.roi !== null) {
                   roiValue = parseFloat(p.raw.roi) * 100;
                   hasRoi = true;
                } else if (p.entryPrice && p.closePrice && p.size && leverage) {
                  const numLeverage = parseFloat(leverage);
                  const initialMargin = positionValueUsd / numLeverage;
                  
                  if (initialMargin > 0) {
                     roiValue = (p.realizedPnl / initialMargin) * 100;
                     hasRoi = true;
                  }
                }

                let displayQuantity = '--';
                let displayUnit = '';
                let displaySecondaryQuantity = '--';
                let displaySecondaryUnit = '';

                if (isInverse) {
                  displayQuantity = p.size ? formatValue(p.size, 2) : '--';
                  displayUnit = 'USD';
                  displaySecondaryQuantity = actualCoinSize ? formatCrypto(actualCoinSize) : '--';
                  displaySecondaryUnit = symbolSuffix;
                } else if (p.exchange === 'okx') {
                  displayQuantity = positionValueUsd ? formatValue(positionValueUsd, 2) : '--';
                  displayUnit = 'USD';
                  displaySecondaryQuantity = actualCoinSize ? formatCrypto(actualCoinSize) : '--';
                  displaySecondaryUnit = symbolSuffix;
                } else {
                  displayQuantity = p.size ? formatCrypto(p.size) : '--';
                  displayUnit = symbolSuffix;
                  displaySecondaryQuantity = positionValueUsd ? formatValue(positionValueUsd, 2) : '--';
                  displaySecondaryUnit = 'USD';
                }
                
                if (hasRoi && isFinite(roiValue)) {
                   roiStr = `${roiValue > 0 ? '+' : ''}${formatValue(roiValue, 2)}%`;
                }
                
                const roiClass = hasRoi ? (roiValue >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]') : 'text-[#8E9299]';

                return (
                  <tr key={p.id} className="hover:bg-[#2a2b30]/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center relative pr-1">
                          <CoinIcon symbol={p.symbol} size={24} className="w-6 h-6" />
                          <div className="bg-[#151619] rounded-full p-[1.5px] absolute -bottom-1.5 -right-1.5">
                            <ExchangeIcon exchange={p.exchange} className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <span className="font-bold text-white text-sm">{p.symbol}</span>
                        <span className="text-[10px] font-medium text-[#8E9299] bg-[#1a1b1e] border border-[#2a2b30] px-1.5 py-0.5 rounded capitalize">
                          {p.exchange} ({p.label})
                        </span>
                      </div>
                      <div className={`text-xs mt-2 flex items-center gap-1 ${sideColor}`}>
                        {sideLabel} · {leverage}x · {marginModeLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#8E9299]">
                      <div className="text-sm font-mono text-white">
                        {p.createdTime && !isNaN(p.createdTime) ? format(new Date(p.createdTime), 'yyyy-MM-dd') : '--'}
                      </div>
                      <div className="font-mono text-white text-sm mt-1">
                        {p.createdTime && !isNaN(p.createdTime) ? format(new Date(p.createdTime), 'HH:mm:ss') : '--'}
                      </div>

                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-white text-sm truncate">{formatPrice(p.entryPrice, isFiatPair)}</div>
                      <div className="font-mono text-white text-sm truncate mt-1">{formatPrice(p.closePrice, isFiatPair)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-white text-sm">{displayQuantity} <span className="font-sans text-xs text-[#8E9299]">{displayUnit}</span></div>
                      {displaySecondaryQuantity !== '--' && (
                        <div className="font-mono text-[#8E9299] text-xs mt-1">{displaySecondaryQuantity} <span className="font-sans text-xs text-[#8E9299]">{displaySecondaryUnit}</span></div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-mono text-sm ${pnlClass}`}>
                        {p.realizedPnl > 0 ? '+' : ''}{formatCcy(p.realizedPnl)} <span className="font-sans text-xs text-[#8E9299]">{pnlCurrency}</span>
                      </div>
                      {!isFiatCcy && p.closePrice ? (
                        <div className={`font-mono text-xs mt-1 ${pnlClass}`}>
                          ≈ {p.realizedPnl > 0 ? '+' : ''}{formatValue(Math.abs(p.realizedPnl) * p.closePrice, 2)} USD
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-sm ${roiClass}`}>{roiStr}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-white text-sm">
                        {p.closeUpdateTime && !isNaN(p.closeUpdateTime) ? format(new Date(p.closeUpdateTime), 'yyyy-MM-dd') : '--'}
                      </div>
                      <div className="font-mono text-white text-sm mt-1">
                        {p.closeUpdateTime && !isNaN(p.closeUpdateTime) ? format(new Date(p.closeUpdateTime), 'HH:mm:ss') : '--'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
