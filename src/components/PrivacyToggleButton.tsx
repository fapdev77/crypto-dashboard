import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { AppTooltip } from './ui/Tooltip';
import { useTranslation } from 'react-i18next';

export function PrivacyToggleButton() {
  const { t } = useTranslation();
  const { isPrivateMode, togglePrivacyMode } = usePrivacy();

  return (
    <AppTooltip 
      description={isPrivateMode ? t('common.buttons.privacyShow', 'Show sensitive numeric values across the application.') : t('common.buttons.privacyHide', 'Hide sensitive numeric values across the application.')}
      side="bottom"
      align="end"
    >
      <button
        type="button"
        onClick={togglePrivacyMode}
        className="w-9 h-9 inline-flex items-center justify-center shrink-0 text-fg-muted hover:text-fg bg-surface border border-line hover:bg-elevated-hover hover:border-line-strong rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        aria-label={isPrivateMode ? t('common.buttons.privacyShow', 'Enable visible mode') : t('common.buttons.privacyHide', 'Enable private mode')}
      >
        {isPrivateMode ? (
          <EyeOff className="w-[18px] h-[18px] transition-transform hover:scale-105" />
        ) : (
          <Eye className="w-[18px] h-[18px] transition-transform hover:scale-105" />
        )}
      </button>
    </AppTooltip>
  );
}
