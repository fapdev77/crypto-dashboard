import React from 'react';
import { AccountType, ApiEnvironment, BybitRegion, Exchange } from '../../store/apiKeysStore';
import { getBybitRegionOption } from '../../utils/bybitEndpoints';

interface AccountTypeBadgeProps {
  exchange?: Exchange | string;
  accountType?: AccountType | string;
  environment?: ApiEnvironment | string;
  bybitRegion?: BybitRegion | string;
  className?: string;
  size?: 'xs' | 'sm';
}

export function AccountTypeBadge({
  exchange,
  accountType,
  environment,
  bybitRegion,
  className = '',
  size = 'xs'
}: AccountTypeBadgeProps) {
  const sizeClasses = size === 'xs' 
    ? 'text-[9px] px-1.5 py-0.5 leading-tight' 
    : 'text-[10px] px-2 py-0.5';

  if (exchange === 'bitget') {
    const isUta = accountType === 'uta';
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

  if (exchange === 'bybit') {
    const regionOpt = getBybitRegionOption(bybitRegion as BybitRegion);
    const regionBadge = regionOpt.badge || 'GLOBAL';
    const isTestnet = environment === 'testnet';
    const envLabel = isTestnet ? 'TESTNET' : 'MAINNET';

    return (
      <span className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
        {/* Environment Badge (MainNet / TestNet) */}
        <span
          className={`inline-flex items-center font-mono uppercase tracking-wider rounded border font-medium select-none ${
            isTestnet
              ? 'bg-[#F2C94C]/15 text-[#F2C94C] border-[#F2C94C]/35'
              : 'bg-[#2F6BFF]/10 text-[#60A5FA] border-[#2F6BFF]/30'
          } ${sizeClasses}`}
          title={`Bybit Environment: ${isTestnet ? 'Testnet' : 'Mainnet'}`}
        >
          {envLabel}
        </span>

        {/* Region Badge (BR, BR-Int, ARG, GLOBAL, etc.) */}
        {regionBadge && (
          <span
            className={`inline-flex items-center font-mono uppercase tracking-wider rounded border font-medium select-none ${
              bybitRegion === 'brazil_int' || bybitRegion === 'argentina_int'
                ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border-[#8B5CF6]/40'
                : bybitRegion === 'brazil' || bybitRegion === 'argentina'
                ? 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30'
                : 'bg-[#8E9299]/15 text-[#D1D5DB] border-[#8E9299]/30'
            } ${sizeClasses}`}
            title={`${regionOpt.name} - ${regionOpt.description}`}
          >
            {regionBadge}
          </span>
        )}
      </span>
    );
  }

  return null;
}
