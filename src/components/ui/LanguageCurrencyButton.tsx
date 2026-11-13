import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/settingsStore';
import { LanguageCurrencyModal } from './LanguageCurrencyModal';
import { SUPPORTED_LOCALES } from '../../services/currency/currencyTypes';
import { AppTooltip } from './Tooltip';
import { FlagIcon } from './FlagIcon';

interface LanguageCurrencyButtonProps {
  className?: string;
  showText?: boolean;
  compactOnMobile?: boolean;
}

export function LanguageCurrencyButton({
  className = '',
  showText = true,
  compactOnMobile = false,
}: LanguageCurrencyButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLocale = useSettingsStore(state => state.locale);
  const currentFiat = useSettingsStore(state => state.fiatCurrency);

  const langCode = (SUPPORTED_LOCALES[currentLocale]?.code?.split('-')[0] || 'EN').toUpperCase();
  const accessibleLabel = `${t('selector.title', 'Language & Currency')}: ${langCode} / ${currentFiat}`;

  return (
    <>
      <AppTooltip description={`${t('selector.title', 'Language & Currency')}: ${currentLocale} / ${currentFiat}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`h-9 inline-flex items-center justify-center text-xs font-medium text-fg bg-surface hover:bg-elevated-hover border border-line hover:border-line-strong rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas whitespace-nowrap shrink-0 ${
            compactOnMobile
              ? 'w-9 px-0 sm:w-auto sm:px-2.5 sm:gap-1.5'
              : 'gap-1.5 px-2.5'
          } ${className}`}
          aria-label={accessibleLabel}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <FlagIcon
            code={currentLocale}
            className={`${compactOnMobile ? 'w-[18px] h-3.5 sm:w-4 sm:h-3' : 'w-4 h-3'} rounded-[2px] shadow-xs shrink-0`}
          />
          {showText && (
            <span
              className={`font-semibold tracking-wider text-fg whitespace-nowrap ${
                compactOnMobile ? 'hidden sm:inline' : ''
              }`}
            >
              {langCode} <span className="text-fg-muted">/</span> {currentFiat}
            </span>
          )}
        </button>
      </AppTooltip>

      <LanguageCurrencyModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
