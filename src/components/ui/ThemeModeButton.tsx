import React, { useEffect, useRef, useState } from 'react';
import { Check, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/settingsStore';
import type { ThemeMode } from '../../utils/themeMode';
import { AppTooltip } from './Tooltip';

const THEME_ICONS: Record<ThemeMode, React.ElementType> = {
  dark: Moon,
  light: Sun,
};

interface ThemeModeButtonProps {
  className?: string;
  showText?: boolean;
}

/**
 * Seletor de tema do aplicativo (Terminal Dark / Terminal Light).
 * Fica ao lado do seletor de idioma e não interfere nos temas de marca
 * por corretora, que continuam sendo aplicados via `data-theme`.
 */
export function ThemeModeButton({ className = '', showText = true }: ThemeModeButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const themeMode = useSettingsStore(state => state.themeMode);
  const setThemeMode = useSettingsStore(state => state.setThemeMode);

  const CurrentIcon = THEME_ICONS[themeMode] ?? Moon;

  const options: Array<{ id: ThemeMode; label: string; description: string }> = [
    {
      id: 'dark',
      label: t('theme.terminalDark', 'Terminal Dark'),
      description: t('theme.terminalDarkDesc', 'Low-light interface for long sessions'),
    },
    {
      id: 'light',
      label: t('theme.terminalLight', 'Terminal Light'),
      description: t('theme.terminalLightDesc', 'High-contrast interface for daylight'),
    },
  ];

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentLabel = options.find(option => option.id === themeMode)?.label ?? themeMode;

  return (
    <div ref={containerRef} className="relative">
      <AppTooltip description={`${t('theme.title', 'Interface theme')}: ${currentLabel}`}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(open => !open)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:text-fg bg-elevated hover:bg-line border border-line hover:border-line-strong rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
          aria-label={`${t('theme.title', 'Interface theme')}: ${currentLabel}`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <CurrentIcon className="w-4 h-4 shrink-0" />
          {showText && (
            <span className="font-semibold tracking-wide hidden sm:inline">{currentLabel}</span>
          )}
        </button>
      </AppTooltip>

      {isOpen && (
        <div
          role="menu"
          aria-label={t('theme.title', 'Interface theme')}
          className="absolute right-0 mt-1.5 w-64 z-50 p-1.5 bg-surface border border-line rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          {options.map(option => {
            const Icon = THEME_ICONS[option.id];
            const isSelected = themeMode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => {
                  setThemeMode(option.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? 'bg-accent/10 text-fg'
                    : 'text-fg-muted hover:text-fg hover:bg-line/50'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-accent' : ''}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold tracking-wide">{option.label}</span>
                  <span className="block text-[11px] text-fg-muted mt-0.5 leading-snug">
                    {option.description}
                  </span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
