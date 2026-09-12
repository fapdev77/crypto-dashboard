import React, { useMemo } from 'react';
import { usePositionsStore } from '../store/positionsStore';
import { useSettingsStore } from '../store/settingsStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatValue, formatCrypto, formatPrice } from '../utils/formatters';
import { AppTooltip } from './ui/Tooltip';

export function PositionsTicker() {
  const positions = usePositionsStore(state => state.positions);
  const useMockData = useSettingsStore(state => state.useMockData);
  const keys = useApiKeysStore(state => state.keys);

  const activeKeyIds = useMemo(() => new Set(keys.filter(k => k.isActive).map(k => k.id)), [keys]);

  const activePositions = useMemo(() => {
    if (!useMockData && activeKeyIds.size === 0) return [];
    const list = Object.values(positions);
    const filtered = useMockData
      ? list.filter(pos => pos.connectionId.startsWith('mocked-data'))
      : list.filter(pos => !pos.connectionId.startsWith('mocked-data') && activeKeyIds.has(pos.connectionId));

    // Sort by largest absolute PnL to show the most relevant positions first
    filtered.sort((a, b) => {
      const pnlA = Math.abs(a.unrealizedPnl || 0);
      const pnlB = Math.abs(b.unrealizedPnl || 0);
      return pnlB - pnlA;
    });

    // Limit to top 20 to improve performance and reduce DOM node count
    const top20 = filtered.slice(0, 20);

    // Sort to ensure stable element order for CSS animation caching
    return top20.sort((a, b) => a.id.localeCompare(b.id));
  }, [positions, useMockData, activeKeyIds]);

  // Se nao há posicoes abertas, retorne null
  if (activePositions.length === 0) return null;

  const content = activePositions.map((pos) => {
    const isLong = pos.side === 'long';
    let variation = pos.roe;
    if (variation === undefined) {
      const priceDiff = pos.markPrice - pos.entryPrice;
      const rawRoe = (priceDiff / (pos.entryPrice || 1)) * 100 * (pos.leverage || 1);
      variation = isLong ? rawRoe : -rawRoe;
    }

    const priceVariation = pos.entryPrice ? ((pos.markPrice - pos.entryPrice) / pos.entryPrice) * 100 : 0;
    const isPriceUp = priceVariation > 0;
    const isPriceDown = priceVariation < 0;
    const priceColor = isPriceUp ? 'text-[#00C853]' : isPriceDown ? 'text-[#FF4444]' : 'text-gray-400';

    const isPositive = variation > 0;
    const isNegative = variation < 0;
    const isNeutral = variation === 0;

    const isFiatPair = pos.symbol.includes('USD') || pos.symbol.includes('EUR');

    return (
      <AppTooltip
        key={pos.id}
        description={
          <div className="flex flex-col gap-1 w-full min-w-[160px]">
            <span className="text-[14px] font-bold text-white leading-none">
              {pos.symbol}
            </span>
            <span className="text-[12px] font-medium text-[#8E9299]">Exchange: {pos.exchange.toUpperCase()}</span>
          </div>
        }
        side="bottom"
        rows={[
          { label: 'Current Price', value: `$${formatPrice(pos.markPrice, isFiatPair)}`, labelClassName: 'text-[13px] text-[#8E9299]', valueClassName: 'text-[13px] text-white font-mono' },
          { label: 'Entry Price', value: pos.entryPrice ? `$${formatPrice(pos.entryPrice, isFiatPair)}` : 'N/A', labelClassName: 'text-[13px] text-[#8E9299]', valueClassName: 'text-[13px] text-white font-mono' },
          { label: 'Price Variation', value: `${priceVariation > 0 ? '+' : ''}${formatValue(priceVariation, 2)}%`, labelClassName: 'text-[13px] text-[#8E9299]', valueClassName: `text-[13px] font-mono font-bold ${priceVariation >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}` },
          { label: 'ROE', value: `${variation > 0 ? '+' : ''}${formatValue(variation, 2)}%`, labelClassName: 'text-[13px] text-[#8E9299]', valueClassName: `text-[13px] font-mono font-bold ${variation >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}` }
        ]}
      >
        <div
          className="flex items-center gap-4 px-6 py-2 border-r border-[#2a2b30]/50 shrink-0 cursor-default focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm tracking-wide">
              | {pos.symbol}
            </span>

            <div className={`flex items-center gap-1 text-sm font-medium ml-1 ${priceColor}`}>
              {isPriceUp && <TrendingUp className="w-3.5 h-3.5" />}
              {isPriceDown && <TrendingDown className="w-3.5 h-3.5" />}
              {!isPriceUp && !isPriceDown && <Minus className="w-3.5 h-3.5" />}
              <span>{Math.abs(priceVariation).toFixed(2)}%</span>
            </div>

            <span className={`font-mono text-sm ml-1 ${priceColor}`}>
              ${formatPrice(pos.markPrice, isFiatPair)}
            </span>

            <span className="text-xs ml-2 px-1.5 py-0.5 rounded uppercase font-medium bg-[#1a1b1e] text-[#8E9299]">
              Pos: {pos.side} {pos.leverage}x
            </span>
          </div>

          <div className={`flex items-center gap-1 text-sm font-medium ml-1 ${isPositive ? 'text-[#00C853]' : isNegative ? 'text-[#FF4444]' : 'text-gray-400'}`}>
            {isPositive && <TrendingUp className="w-4 h-4" />}
            {isNegative && <TrendingDown className="w-4 h-4" />}
            {isNeutral && <Minus className="w-4 h-4" />}
            <span>
              {isPositive ? '+' : ''}{formatValue(variation, 2)}%
            </span>
          </div>
        </div>
      </AppTooltip>
    );
  });

  // Calcula o tempo total baseado na quantidade de itens.
  // Assumimos ~4 segundos por item para uma leitura confortável.
  const duration = Math.max(activePositions.length * 4, 20); // Minimo de 20s

  return (
    <div className="bg-[#151619] border-b border-[#2a2b30] flex items-center overflow-hidden shrink-0 h-10 w-full relative z-10 group">
      <div
        className="flex w-max animate-marquee hover:[animation-play-state:paused] will-change-transform"
        style={{ animationDuration: `${duration}s` }}
      >
        <div className="flex shrink-0">
          {content}
        </div>
        <div className="flex shrink-0">
          {content}
        </div>
      </div>
    </div>
  );
}
