import React from 'react';
import { Beer } from 'lucide-react';
import { AppTooltip } from './ui/Tooltip';
import { useTranslation } from 'react-i18next';

interface DonationToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function DonationToggleButton({ isOpen, onClick }: DonationToggleButtonProps) {
  const { t } = useTranslation();

  const label = isOpen
    ? t('donation.buttonTooltipClose', 'Fechar janela de doação')
    : t('donation.buttonTooltipOpen', 'Pague uma cerveja (Doar cripto)');

  return (
    <AppTooltip description={label} side="bottom" align="end">
      <button
        type="button"
        onClick={onClick}
        data-open={isOpen ? 'true' : 'false'}
        className="donation-beer-btn w-9 h-9 inline-flex items-center justify-center shrink-0 border rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas cursor-pointer"
        aria-label={label}
        aria-expanded={isOpen}
      >
        <Beer className="donation-beer-icon w-[18px] h-[18px] transition-transform duration-150 hover:scale-105" />
      </button>
    </AppTooltip>
  );
}
