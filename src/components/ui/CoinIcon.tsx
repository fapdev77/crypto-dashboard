import React, { useState, useEffect } from 'react';
import { UnifiedAssetCategory } from '../../types';

interface CoinIconProps {
  symbol: string;
  className?: string;
  size?: number;
  category?: UnifiedAssetCategory | string;
  name?: string;
}

export function CoinIcon({ symbol, className = "w-6 h-6", size = 32, category, name }: CoinIconProps) {
  const initialState = 'okx';
  const [imageState, setImageState] = useState<'okx' | 'logodev-crypto' | 'logodev-ticker' | 'logodev-name' | 'coincap' | 'error'>(initialState);
  
  // Refaz o initialState caso a propriedade category mude fora
  useEffect(() => {
    setImageState('okx');
  }, [category, symbol]);
  
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
  
  // OKX CDN
  const okxUrl = `https://www.okx.com/cdn/oksupport/asset/currency/icon/${cleanSymbol}.png`;

  // Logo.dev (Crypto API)
  const logoDevCryptoUrl = `https://img.logo.dev/crypto/${cleanSymbol.toUpperCase()}?token=${token}&fallback=404`;
  // Logo.dev (Ticker API para mercado tradicional)
  const logoDevTickerUrl = `https://img.logo.dev/ticker/${cleanSymbol.toUpperCase()}?token=${token}&fallback=404`;
  // Logo.dev (Name API) - útil para stocks
  const nameToUse = name || cleanSymbol;
  // encodeURIComponent treats spaces as %20, which is fine
  const encodedName = encodeURIComponent(nameToUse);
  const logoDevNameUrl = `https://img.logo.dev/name/${encodedName}?token=${token}&fallback=404`;
  
  // Fallback para o CoinCap
  const coinCapUrl = `https://assets.coincap.io/assets/icons/${cleanSymbol}@2x.png`;

  let currentUrl = '';
  if (imageState === 'okx') currentUrl = okxUrl;
  else if (imageState === 'logodev-crypto') currentUrl = logoDevCryptoUrl;
  else if (imageState === 'logodev-ticker') currentUrl = logoDevTickerUrl;
  else if (imageState === 'logodev-name') currentUrl = logoDevNameUrl;
  else currentUrl = coinCapUrl;

  const handleError = () => {
    if (imageState === 'okx') {
      setImageState('logodev-crypto');
    } else if (imageState === 'logodev-crypto') {
      setImageState('logodev-ticker');
    } else if (imageState === 'logodev-ticker') {
      if (category === 'STOCK') {
        setImageState('logodev-name');
      } else {
        setImageState('coincap');
      }
    } else if (imageState === 'logodev-name') {
      setImageState('coincap');
    } else if (imageState === 'coincap') {
      setImageState('error');
    } else {
      setImageState('error');
    }
  };

  return (
    <img 
      src={currentUrl} 
      alt={name || symbol}
      title={name || symbol}
      className={`rounded-full object-contain bg-white shrink-0 ${className}`}
      onError={handleError}
    />
  );
}
