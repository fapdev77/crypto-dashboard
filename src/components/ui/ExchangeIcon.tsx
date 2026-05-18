import React, { useState } from 'react';

interface ExchangeIconProps {
  exchange: string;
  className?: string;
}

export function ExchangeIcon({ exchange, className = "w-4 h-4" }: ExchangeIconProps) {
  const [hasError, setHasError] = useState(false);
  const ex = exchange.toLowerCase();

  const token = 'pk_W-08Gy3bQ66pu3yMO7UNxQ';
  let domain = '';

  if (ex.includes('bitget')) domain = 'bitget.com';
  else if (ex.includes('bybit')) domain = 'bybit.com';
  else if (ex.includes('okx')) domain = 'okx.com';
  else if (ex.includes('binance')) domain = 'binance.com';
  else domain = `${ex}.com`; // Tenta adivinhar o domínio para as outras corretoras

  const handleError = () => setHasError(true);

  if (!hasError && domain) {
    return (
      <img 
        src={`https://img.logo.dev/${domain}?token=${token}`}
        alt={exchange}
        title={exchange}
        className={`rounded-full object-contain shrink-0 ${className}`}
        onError={handleError}
      />
    );
  }

  // -- Fallbacks Originais SVG em caso de falha da logo.dev --
  
  // Cores originais se quiser, mas podemos usar currentColor no fill/stroke
  if (ex.includes('bitget')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.328 14.322l-1.664.96v-5.698l-3.328-1.92v3.774l-1.664.96V8.678l1.664-.96v5.698l3.328 1.92V11.56l1.664-.96v5.722z" fill="#00e5a3"/>
      </svg>
    );
  }

  if (ex.includes('bybit')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.405 13.985c0 1.93-1.572 3.504-3.504 3.504H7.905l3.29-3.29h2.707a.214.214 0 0 0 .215-.214v-2.035a.214.214 0 0 0-.215-.215H8.381l-3.29-3.29h8.81c1.932 0 3.504 1.573 3.504 3.503v1.93h.001v.107z" fill="#f7a600"/>
      </svg>
    );
  }

  if (ex.includes('okx')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.5 12c0 2.485-2.015 4.5-4.5 4.5s-4.5-2.015-4.5-4.5 2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 17.5c-4.142 0-7.5-3.358-7.5-7.5S7.858 4.5 12 4.5s7.5 3.358 7.5 7.5-3.358 7.5-7.5 7.5z" fill="#ffffff"/>
      </svg>
    );
  }

  // Falback genérico em caso de não ter SVG mapeado e falhar o logo.dev
  return (
    <div className={`rounded-full bg-gray-700 flex justify-center items-center ${className}`}>
      <span className="text-[8px] font-bold text-white">{exchange.substring(0, 1).toUpperCase()}</span>
    </div>
  );
}
