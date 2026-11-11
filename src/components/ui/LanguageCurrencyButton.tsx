import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/settingsStore';
import { LanguageCurrencyModal } from './LanguageCurrencyModal';
import { SUPPORTED_LOCALES, SUPPORTED_FIAT_CURRENCIES } from '../../services/currency/currencyTypes';
import { AppTooltip } from './Tooltip';
import { FlagIcon } from './FlagIcon';

interface LanguageCurrencyButtonProps {
  className?: string;
  showText?: boolean;
}

export function LanguageCurrencyButton({ className = '', showText = true }: LanguageCurrencyButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLocale = useSettingsStore(state => state.locale);
  const currentFiat = useSettingsStore(state => state.fiatCurrency);

  const langCode = (SUPPORTED_LOCALES[currentLocale]?.code?.split('-')[0] || 'EN').toUpperCase();
  const fiatSymbol = SUPPORTED_FIAT_CURRENCIES[currentFiat]?.symbol || '$';

  return (
    <>
      <AppTooltip description={`${t('selector.title', 'Language & Currency')}: ${currentLocale} / ${currentFiat}`}>
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-fg hover:text-fg bg-elevated hover:bg-line border border-line hover:border-gray-600 rounded-lg transition-all duration-150 cursor-pointer ${className}`}
          aria-label={t('selector.title', 'Language & Currency')}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <FlagIcon code={currentLocale} className="w-4 h-3 rounded-[2px] shadow-xs shrink-0" />
          {showText && (
            <span className="font-semibold tracking-wider text-fg">
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
