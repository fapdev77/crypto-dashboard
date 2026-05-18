import React, { useState } from 'react';

interface CoinIconProps {
  symbol: string;
  className?: string;
  size?: number;
}

export function CoinIcon({ symbol, className = "w-6 h-6", size = 32 }: CoinIconProps) {
  const [hasError, setHasError] = useState(false);
  
  let cleanSymbol = symbol.toLowerCase();

  // Se for formato da OKX (ex: PEPE-USDT-SWAP), pegamos apenas a primeira parte
  if (cleanSymbol.includes('-')) {
    cleanSymbol = cleanSymbol.split('-')[0];
  } else {
    // Remove os sufixos de pares de trading (USDT, USD, USDC, PERP) apenas se não for a própria moeda
    if (cleanSymbol !== 'usdt' && cleanSymbol !== 'usd' && cleanSymbol !== 'usdc') {
      cleanSymbol = cleanSymbol.replace(/usdt$|usdc$|usd$|perp$/g, '');
    }
  }

  // Fallback visual se a imagem não carregar
  if (hasError || !cleanSymbol) {
    return (
      <div className={`rounded-full bg-[#1e2025] border border-[#2a2b30] flex items-center justify-center shrink-0 ${className}`}>
        <span className="text-[10px] sm:text-xs font-bold text-[#8E9299]">
          {(cleanSymbol || symbol).substring(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  // Usando coincap para as moedas
  const iconUrl = `https://assets.coincap.io/assets/icons/${cleanSymbol}@2x.png`;

  return (
    <img 
      src={iconUrl} 
      alt={symbol}
      title={symbol}
      className={`rounded-full object-contain shrink-0 ${className}`}
      onError={() => setHasError(true)}
    />
  );
}
