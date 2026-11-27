import React from 'react';
import { useTranslation } from 'react-i18next';
import { AccountType, ApiEnvironment, BybitRegion, Exchange } from '../../store/apiKeysStore';
import { getBybitRegionOption } from '../../utils/bybitEndpoints';

interface AccountTypeBadgeProps {
  exchange?: Exchange | string;
  accountType?: AccountType | string;
  environment?: ApiEnvironment | string;
  bybitRegion?: BybitRegion | string;
  isSubAccount?: boolean;
  className?: string;
  size?: 'xs' | 'sm';
}

export function AccountTypeBadge({
  exchange,
  accountType,
  environment,
  bybitRegion,
  isSubAccount,
  className = '',
  size = 'xs'
}: AccountTypeBadgeProps) {
  const { t } = useTranslation();
  const sizeClasses = size === 'xs' 
    ? 'text-[9px] px-1.5 py-0.5 leading-tight' 
    : 'text-[10px] px-2 py-0.5';

  const subBadge = isSubAccount ? (
    <span
      className={`inline-flex items-center font-mono uppercase tracking-wider rounded border font-medium bg-purple-500/15 text-tone-purple border-purple-500/30 select-none ${sizeClasses}`}
      title={t('apiKeys.card.subAccount', 'Sub-Account')}
    >
      SUB
    </span>
  ) : null;

  if (exchange === 'bitget') {
    const isUta = accountType === 'uta';
    return (
      <span className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
        <span
          className={`inline-flex items-center font-mono uppercase tracking-wider rounded border font-medium select-none ${
            isUta
              ? 'bg-success/10 text-success border-success/30'
              : 'bg-fg-muted/15 text-fg-muted border-fg-muted/25'
          } ${sizeClasses}`}
          title={`Bitget ${isUta ? 'Unified Trading Account (UTA / v3)' : 'Classic Account (v2 / CLS)'}`}
        >
          {isUta ? 'UTA' : 'CLS'}
        </span>
        {subBadge}
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
              ? 'bg-amber-500/15 text-tone-amber border-amber-500/35'
              : 'bg-accent/10 text-accent border-accent/30'
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
                ? 'bg-purple-500/15 text-tone-purple border-purple-500/40'
                : bybitRegion === 'brazil' || bybitRegion === 'argentina'
                ? 'bg-success/15 text-success border-success/30'
                : 'bg-fg-muted/15 text-fg border-fg-muted/30'
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
