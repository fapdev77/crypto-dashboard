import React from 'react';
import { AccountType, Exchange } from '../../store/apiKeysStore';

interface AccountTypeBadgeProps {
  exchange?: Exchange | string;
  accountType?: AccountType | string;
  className?: string;
  size?: 'xs' | 'sm';
}

export function AccountTypeBadge({ exchange, accountType, className = '', size = 'xs' }: AccountTypeBadgeProps) {
  if (exchange !== 'bitget') return null;

  const isUta = accountType === 'uta';
  const sizeClasses = size === 'xs' 
    ? 'text-[9px] px-1.5 py-0.5 leading-tight' 
    : 'text-[10px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center font-mono uppercase tracking-wider rounded border font-medium shrink-0 select-none ${
        isUta
          ? 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/30'
          : 'bg-[#8E9299]/15 text-[#8E9299] border-[#8E9299]/25'
      } ${sizeClasses} ${className}`}
      title={`Bitget ${isUta ? 'Unified Trading Account (UTA / v3)' : 'Classic Account (v2 / CLS)'}`}
    >
      {isUta ? 'UTA' : 'CLS'}
    </span>
  );
}

