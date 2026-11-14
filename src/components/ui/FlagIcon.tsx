import React from 'react';

interface FlagIconProps {
  code: string;
  className?: string;
  title?: string;
}

/**
 * Standard vector SVG flags for all supported locales and fiat currencies.
 * Eliminates platform-dependent emoji rendering (e.g. Windows rendering country
 * emoji flags as two-letter regional indicator text "US", "BR", "IT", "GB", etc.).
 */
export function FlagIcon({ code, className = 'w-6 h-4.5', title }: FlagIconProps) {
  const normalized = (code || '').toLowerCase().trim();

  // Helper wrapper for 32x24 aspect ratio flags
  const renderSvg = (children: React.ReactNode, label: string) => (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 overflow-hidden rounded-[2px] border border-white/10 shadow-xs ${className}`}
      role="img"
      aria-label={title || label}
    >
      {children}
    </svg>
  );

  // 1. Brazil (pt-BR / BRL)
  if (normalized === 'pt-br' || normalized === 'brl' || normalized === 'br') {
    return renderSvg(
      <>
        <rect width="32" height="24" fill="#009C3B" />
        <polygon points="16,3.5 28.5,12 16,20.5 3.5,12" fill="#FFDF00" />
        <circle cx="16" cy="12" r="5" fill="#002776" />
        <path
          d="M 11.5,13.2 C 13,11.5 18,11.2 20.6,13"
          stroke="#FFFFFF"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="15.5" cy="14" r="0.4" fill="#FFFFFF" />
        <circle cx="16.5" cy="14.5" r="0.4" fill="#FFFFFF" />
        <circle cx="14" cy="14.8" r="0.35" fill="#FFFFFF" />
      </>,
      'Brazil Flag'
    );
  }

  // 2. Portugal (pt-PT / PT)
  if (normalized === 'pt-pt' || normalized === 'pt') {
    return renderSvg(
      <>
        <rect width="13" height="24" fill="#006600" />
        <rect x="13" width="19" height="24" fill="#FF0000" />
        {/* Armillary sphere */}
        <circle cx="13" cy="12" r="4.8" fill="#FFCC00" stroke="#000000" strokeWidth="0.4" />
        <ellipse cx="13" cy="12" rx="4.8" ry="1.8" fill="none" stroke="#000000" strokeWidth="0.4" />
        <line x1="13" y1="7.2" x2="13" y2="16.8" stroke="#000000" strokeWidth="0.4" />
        {/* Portuguese Shield */}
        <rect x="11.2" y="9.8" width="3.6" height="4.4" fill="#FFFFFF" stroke="#C8102E" strokeWidth="0.8" rx="0.4" />
        <circle cx="13" cy="12" r="0.6" fill="#002776" />
      </>,
      'Portugal Flag'
    );
  }

  // 3. United States (en-US / USD / US)
  if (normalized === 'en-us' || normalized === 'usd' || normalized === 'us') {
    return renderSvg(
      <>
        <rect width="32" height="24" fill="#FFFFFF" />
        {/* 7 red stripes */}
        <rect y="0" width="32" height="1.85" fill="#B22234" />
        <rect y="3.69" width="32" height="1.85" fill="#B22234" />
        <rect y="7.38" width="32" height="1.85" fill="#B22234" />
        <rect y="11.08" width="32" height="1.85" fill="#B22234" />
        <rect y="14.77" width="32" height="1.85" fill="#B22234" />
        <rect y="18.46" width="32" height="1.85" fill="#B22234" />
        <rect y="22.15" width="32" height="1.85" fill="#B22234" />
        {/* Canton */}
        <rect width="13.5" height="12.92" fill="#3C3B6E" />
        {/* Star grid */}
        <circle cx="3" cy="2.5" r="0.65" fill="#FFFFFF" />
        <circle cx="6.7" cy="2.5" r="0.65" fill="#FFFFFF" />
        <circle cx="10.5" cy="2.5" r="0.65" fill="#FFFFFF" />
        <circle cx="4.8" cy="4.5" r="0.65" fill="#FFFFFF" />
        <circle cx="8.6" cy="4.5" r="0.65" fill="#FFFFFF" />
        <circle cx="3" cy="6.5" r="0.65" fill="#FFFFFF" />
        <circle cx="6.7" cy="6.5" r="0.65" fill="#FFFFFF" />
        <circle cx="10.5" cy="6.5" r="0.65" fill="#FFFFFF" />
        <circle cx="4.8" cy="8.5" r="0.65" fill="#FFFFFF" />
        <circle cx="8.6" cy="8.5" r="0.65" fill="#FFFFFF" />
        <circle cx="3" cy="10.5" r="0.65" fill="#FFFFFF" />
        <circle cx="6.7" cy="10.5" r="0.65" fill="#FFFFFF" />
        <circle cx="10.5" cy="10.5" r="0.65" fill="#FFFFFF" />
      </>,
      'United States Flag'
    );
  }

  // 4. United Kingdom (en-GB / GBP / GB / UK)
  if (normalized === 'en-gb' || normalized === 'gbp' || normalized === 'gb' || normalized === 'uk') {
    return renderSvg(
      <>
        <rect width="32" height="24" fill="#012169" />
        {/* White saltire */}
        <line x1="0" y1="0" x2="32" y2="24" stroke="#FFFFFF" strokeWidth="4.5" />
        <line x1="32" y1="0" x2="0" y2="24" stroke="#FFFFFF" strokeWidth="4.5" />
        {/* Red saltire */}
        <line x1="0" y1="0" x2="32" y2="24" stroke="#C8102E" strokeWidth="1.8" />
        <line x1="32" y1="0" x2="0" y2="24" stroke="#C8102E" strokeWidth="1.8" />
        {/* White cross */}
        <rect x="13.2" y="0" width="5.6" height="24" fill="#FFFFFF" />
        <rect x="0" y="9.2" width="32" height="5.6" fill="#FFFFFF" />
        {/* Red cross */}
        <rect x="14.4" y="0" width="3.2" height="24" fill="#C8102E" />
        <rect x="0" y="10.4" width="32" height="3.2" fill="#C8102E" />
      </>,
      'United Kingdom Flag'
    );
  }

  // 5. Italy (it-IT / IT)
  if (normalized === 'it-it' || normalized === 'it') {
    return renderSvg(
      <>
        <rect x="0" width="10.67" height="24" fill="#009246" />
        <rect x="10.67" width="10.67" height="24" fill="#FFFFFF" />
        <rect x="21.34" width="10.66" height="24" fill="#CE2B37" />
      </>,
      'Italy Flag'
    );
  }

  // 6. Spanish (Latin America) (es-419 / ES)
  if (normalized === 'es-419' || normalized === 'es') {
    return renderSvg(
      <>
        {/* Spain/Latin America vibrant horizontal tricolor */}
        <rect y="0" width="32" height="6" fill="#AA151B" />
        <rect y="6" width="32" height="12" fill="#F1BF00" />
        <rect y="18" width="32" height="6" fill="#AA151B" />
        {/* Stylized Latin America / Hispanic emblem */}
        <circle cx="10" cy="12" r="3.2" fill="#AA151B" fillOpacity="0.85" />
        <circle cx="10" cy="12" r="2.2" fill="#F1BF00" />
        <path d="M 9.2,10.8 L 10.8,10.8 L 11.2,13.2 L 8.8,13.2 Z" fill="#AA151B" />
      </>,
      'Spanish (Latin America) Flag'
    );
  }

  // 7. European Union (EUR / EU)
  if (normalized === 'eur' || normalized === 'eu') {
    const starRadius = 6.2;
    const cx = 16;
    const cy = 12;
    const stars = Array.from({ length: 12 }).map((_, i) => {
      const angle = (i * 30 * Math.PI) / 180;
      const x = cx + starRadius * Math.sin(angle);
      const y = cy - starRadius * Math.cos(angle);
      return <circle key={i} cx={x} cy={y} r="0.8" fill="#FFCC00" />;
    });

    return renderSvg(
      <>
        <rect width="32" height="24" fill="#003399" />
        {stars}
      </>,
      'European Union Flag'
    );
  }

  // Fallback default: clean neutral globe / world badge
  return renderSvg(
    <>
      <rect width="32" height="24" fill="#1e2024" />
      <circle cx="16" cy="12" r="7" stroke="#2F6BFF" strokeWidth="1.2" fill="none" />
      <ellipse cx="16" cy="12" rx="3.5" ry="7" stroke="#2F6BFF" strokeWidth="1" fill="none" />
      <line x1="9" y1="12" x2="23" y2="12" stroke="#2F6BFF" strokeWidth="1" />
    </>,
    code.toUpperCase()
  );
}
