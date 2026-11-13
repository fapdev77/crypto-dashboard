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
        className="donation-beer-btn p-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-warning/60 focus:ring-offset-2 focus:ring-offset-canvas cursor-pointer"
        aria-label={label}
        aria-expanded={isOpen}
      >
        <Beer className="donation-beer-icon w-5 h-5 transition-transform duration-200 hover:scale-105" />
      </button>
    </AppTooltip>
  );
}
