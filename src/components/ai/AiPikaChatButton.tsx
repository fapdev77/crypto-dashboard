import React from 'react';
import { Bot } from 'lucide-react';
import { AppTooltip } from '../ui/Tooltip';

interface AiPikaChatButtonProps {
  onClick: () => void;
  isEnabled: boolean;
  compactOnMobile?: boolean;
}

export function AiPikaChatButton({
  onClick,
  isEnabled,
  compactOnMobile = false,
}: AiPikaChatButtonProps) {
  const tooltipText = isEnabled
    ? 'Open PIKA Assistant (Ctrl+J)'
    : 'PIKA Assistant (Disabled - Click to configure)';

  return (
    <AppTooltip description={tooltipText} side="bottom" align="end">
      <button
        type="button"
        onClick={onClick}
        aria-label={isEnabled ? 'Open PIKA Assistant' : 'PIKA Assistant Disabled'}
        className={`group relative h-9 inline-flex items-center justify-center rounded-lg border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas select-none whitespace-nowrap shrink-0 cursor-pointer ${
          compactOnMobile
            ? 'w-9 px-0 sm:w-auto sm:px-2.5 sm:gap-1.5'
            : 'gap-1.5 px-2.5'
        } ${
          isEnabled
            ? 'bg-surface hover:bg-elevated-hover border-line hover:border-line-strong text-fg'
            : 'bg-surface/60 hover:bg-elevated-hover border-line hover:border-line-strong text-fg-muted hover:text-fg opacity-70 hover:opacity-100'
        }`}
      >
        <Bot
          className={`w-[18px] h-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105 ${
            isEnabled ? 'text-accent' : 'text-fg-muted'
          } ${compactOnMobile ? 'sm:w-4 sm:h-4' : 'w-4 h-4'}`}
        />

        <span
          className={`items-center gap-1.5 ${
            compactOnMobile ? 'hidden sm:inline-flex' : 'inline-flex'
          }`}
        >
          <span className="font-bold text-[12px] tracking-wider uppercase font-mono text-fg/90 group-hover:text-fg transition-colors">
            PIKA
          </span>
          <span
            className={`inline-flex items-center justify-center text-[10px] font-black px-1.5 py-0.5 rounded leading-none ${
              isEnabled
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-line text-fg-muted border border-line-strong'
            }`}
          >
            AI
          </span>
        </span>
      </button>
    </AppTooltip>
  );
}
