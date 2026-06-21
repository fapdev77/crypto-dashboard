import React from 'react';
import { HelpCircle } from 'lucide-react';
import { AppTooltip } from './ui/Tooltip';

interface HelpToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function HelpToggleButton({ isOpen, onClick }: HelpToggleButtonProps) {
  return (
    <AppTooltip
      description={isOpen ? 'Close welcome & help guide' : 'Open welcome & help guide'}
      side="bottom"
      align="end"
    >
      <button
        onClick={onClick}
        className={`p-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6BFF] focus:ring-offset-2 dark:focus:ring-offset-[#0b0c10] ${
          isOpen
            ? 'text-[#2F6BFF] border-[#2F6BFF]/30 bg-[#2F6BFF]/10 hover:bg-[#2F6BFF]/20'
            : 'text-gray-400 hover:text-white bg-gray-100 dark:bg-[#151619] border-gray-200 dark:border-[#2a2b30] hover:bg-gray-200 dark:hover:bg-[#2a2b30]'
        }`}
        aria-label={isOpen ? 'Close help guide' : 'Open help guide'}
      >
        <HelpCircle className="w-5 h-5 transition-transform hover:scale-105" />
      </button>
    </AppTooltip>
  );
}
