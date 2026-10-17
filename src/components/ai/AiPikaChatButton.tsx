import React from 'react';
import { Sparkles } from 'lucide-react';
import { AppTooltip } from '../ui/Tooltip';

interface AiPikaChatButtonProps {
  onClick: () => void;
  isEnabled: boolean;
}

export function AiPikaChatButton({ onClick, isEnabled }: AiPikaChatButtonProps) {
  const tooltipText = isEnabled
    ? 'Open PIKA Assistant (Ctrl+J)'
    : 'PIKA Assistant (Disabled - Click to configure)';

  return (
    <AppTooltip description={tooltipText} side="bottom" align="end">
      <button
        onClick={onClick}
        aria-label={isEnabled ? 'Open PIKA Assistant' : 'PIKA Assistant Disabled'}
        className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#2F6BFF] focus:ring-offset-2 dark:focus:ring-offset-[#0b0c10] select-none ${
          isEnabled
            ? 'bg-[#151619] hover:bg-[#1e1f24] border-[#2a2b30] hover:border-[#2F6BFF]/60 text-white shadow-xs cursor-pointer'
            : 'bg-[#151619]/60 border-[#2a2b30] text-gray-500 hover:text-gray-300 opacity-60 hover:opacity-90 cursor-pointer'
        }`}
        style={{ minHeight: '38px' }}
      >
        {/* PIKA Brand Name */}
        <span className="font-extrabold text-[12px] tracking-wider uppercase font-mono text-white/90 group-hover:text-white transition-colors">
          PIKA
        </span>

        {/* Modern Animated AI Badge */}
        <span
          className={`relative flex items-center justify-center text-[10px] font-black px-1.5 py-0.5 rounded leading-none transition-all duration-300 ${
            isEnabled
              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white shadow-xs shadow-cyan-400/30'
              : 'bg-slate-700/60 text-slate-400 border border-slate-600/50'
          }`}
        >
          {/* Animated ping dot for high-tech indicator */}
          {isEnabled && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
          )}

          {/* AI Text with shimmer gradient */}
          <span className="relative z-10 flex items-center gap-0.5">
            AI
            {isEnabled && (
              <Sparkles className="w-2.5 h-2.5 text-cyan-200 animate-pulse ml-0.5 inline-block" />
            )}
          </span>

          {/* Glowing animated background aura */}
          {isEnabled && (
            <span className="absolute inset-0 rounded bg-gradient-to-r from-indigo-400 to-cyan-400 opacity-0 group-hover:opacity-40 blur-xs transition-opacity duration-300 pointer-events-none" />
          )}
        </span>
      </button>
    </AppTooltip>
  );
}
