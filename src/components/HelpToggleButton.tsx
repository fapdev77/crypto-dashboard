import React from 'react';
import { HelpCircle } from 'lucide-react';
import { AppTooltip } from './ui/Tooltip';
import { useTranslation } from 'react-i18next';

interface HelpToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function HelpToggleButton({ isOpen, onClick }: HelpToggleButtonProps) {
  const { t } = useTranslation();

  return (
    <AppTooltip
      description={isOpen ? t('common.buttons.helpClose', 'Close welcome & help guide') : t('common.buttons.helpOpen', 'Open welcome & help guide')}
      side="bottom"
      align="end"
    >
      <button
        type="button"
        onClick={onClick}
        className={`w-9 h-9 inline-flex items-center justify-center shrink-0 border rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
          isOpen
            ? 'text-accent border-accent/30 bg-accent/10 hover:bg-accent/20'
            : 'text-fg-muted hover:text-fg bg-surface border-line hover:bg-elevated-hover hover:border-line-strong'
        }`}
        aria-label={isOpen ? t('common.buttons.helpClose', 'Close help guide') : t('common.buttons.helpOpen', 'Open help guide')}
      >
        <HelpCircle className="w-[18px] h-[18px] transition-transform hover:scale-105" />
      </button>
    </AppTooltip>
  );
}
