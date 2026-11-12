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
        onClick={togglePrivacyMode}
        className="p-2 text-fg-muted hover:text-fg bg-surface border border-line hover:bg-elevated-hover hover:border-line-strong rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas"
        aria-label={isPrivateMode ? t('common.buttons.privacyShow', 'Enable visible mode') : t('common.buttons.privacyHide', 'Enable private mode')}
      >
        {isPrivateMode ? (
          <EyeOff className="w-5 h-5 transition-transform hover:scale-105" />
        ) : (
          <Eye className="w-5 h-5 transition-transform hover:scale-105" />
        )}
      </button>
    </AppTooltip>
  );
}
