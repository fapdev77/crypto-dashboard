import React, { useMemo } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatValue, formatCrypto, formatPrice } from '../utils/formatters';

export function PositionsTicker() {
  const { positions } = useDashboardStore();
  const useMockData = useSettingsStore(state => state.useMockData);

  const activePositions = useMemo(() => {
    const list = Object.values(positions);
    return useMockData
      ? list.filter(p => p.connectionId.startsWith('mocked-data'))
      : list.filter(p => !p.connectionId.startsWith('mocked-data'));
  }, [positions, useMockData]);

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
    const priceColor = isPriceUp ? 'text-emerald-500' : isPriceDown ? 'text-red-500' : 'text-gray-400';

    const isPositive = variation > 0;
    const isNegative = variation < 0;
    const isNeutral = variation === 0;

    const isFiatPair = pos.symbol.includes('USD') || pos.symbol.includes('EUR');

    return (
      <div
        key={pos.id}
        className="flex items-center gap-4 px-6 py-2 border-r border-[#2a2b30]/50 shrink-0 cursor-default"
        title={`Exchange: ${pos.exchange}\nAtivo: ${pos.symbol}\nPosição: ${pos.side.toUpperCase()} ${pos.leverage}x\nPreço Atual: $${formatPrice(pos.markPrice, isFiatPair)}\nPreço de Entrada: ${pos.entryPrice ? '$' + formatPrice(pos.entryPrice, isFiatPair) : 'N/A'}\nVariação de Preço (desde entrada): ${formatValue(priceVariation, 2)}%\nLucro/Prejuízo (ROE): ${formatValue(variation, 2)}%`}
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

        <div className={`flex items-center gap-1 text-sm font-medium ml-1 ${isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-gray-400'}`}>
          {isPositive && <TrendingUp className="w-4 h-4" />}
          {isNegative && <TrendingDown className="w-4 h-4" />}
          {isNeutral && <Minus className="w-4 h-4" />}
          <span>
            {isPositive ? '+' : ''}{formatValue(variation, 2)}%
          </span>
        </div>
      </div>
    );
  });

  // Calcula o tempo total baseado na quantidade de itens.
  // Assumimos ~4 segundos por item para uma leitura confortável.
  const duration = Math.max(activePositions.length * 4, 20); // Minimo de 20s

  return (
    <div className="bg-[#151619] border-b border-[#2a2b30] flex items-center overflow-hidden shrink-0 h-10 w-full relative z-10 group">
      <div
        className="flex w-max animate-marquee"
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
