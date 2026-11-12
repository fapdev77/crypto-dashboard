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
        onClick={onClick}
        className={`p-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas ${
          isOpen
            ? 'text-accent border-accent/30 bg-accent/10 hover:bg-accent/20'
            : 'text-fg-muted hover:text-fg bg-surface border-line hover:bg-elevated-hover hover:border-line-strong'
        }`}
        aria-label={isOpen ? t('common.buttons.helpClose', 'Close help guide') : t('common.buttons.helpOpen', 'Open help guide')}
      >
        <HelpCircle className="w-5 h-5 transition-transform hover:scale-105" />
      </button>
    </AppTooltip>
  );
}
