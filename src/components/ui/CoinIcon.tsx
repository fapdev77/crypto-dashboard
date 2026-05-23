import React, { useState } from 'react';

interface CoinIconProps {
  symbol: string;
  className?: string;
  size?: number;
}

export function CoinIcon({ symbol, className = "w-6 h-6", size = 32 }: CoinIconProps) {
  const [imageState, setImageState] = useState<'logodev-crypto' | 'logodev-ticker' | 'coincap' | 'error'>('logodev-crypto');
  
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

  // Fallback visual se nenhuma imagem carregar
  if (imageState === 'error' || !cleanSymbol) {
    return (
      <div className={`rounded-full bg-[#1e2025] border border-[#2a2b30] flex items-center justify-center shrink-0 ${className}`}>
        <span className="text-[10px] sm:text-xs font-bold text-[#8E9299]">
          {(cleanSymbol || symbol).substring(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  const token = 'pk_W-08Gy3bQ66pu3yMO7UNxQ';
  
  // Logo.dev (Crypto API)
  const logoDevCryptoUrl = `https://img.logo.dev/crypto/${cleanSymbol.toUpperCase()}?token=${token}`;
  // Logo.dev (Ticker API para mercado tradicional)
  const logoDevTickerUrl = `https://img.logo.dev/ticker/${cleanSymbol.toUpperCase()}?token=${token}`;
  // Fallback para o CoinCap
  const coinCapUrl = `https://assets.coincap.io/assets/icons/${cleanSymbol}@2x.png`;

  let currentUrl = '';
  if (imageState === 'logodev-crypto') currentUrl = logoDevCryptoUrl;
  else if (imageState === 'logodev-ticker') currentUrl = logoDevTickerUrl;
  else currentUrl = coinCapUrl;

  const handleError = () => {
    if (imageState === 'logodev-crypto') {
      setImageState('logodev-ticker');
    } else if (imageState === 'logodev-ticker') {
      setImageState('coincap');
    } else {
      setImageState('error');
    }
  };

  return (
    <img 
      src={currentUrl} 
      alt={symbol}
      title={symbol}
      className={`rounded-full object-contain shrink-0 ${className}`}
      onError={handleError}
    />
  );
}
