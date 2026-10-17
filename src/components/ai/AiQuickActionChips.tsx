import React from 'react';
import { ShieldAlert, ArrowLeftRight, Coins, LayoutDashboard } from 'lucide-react';

interface AiQuickActionChipsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

interface PromptCard {
  title: string;
  subtitle: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const AiQuickActionChips: React.FC<AiQuickActionChipsProps> = ({ onSelectPrompt, disabled }) => {
  const cards: PromptCard[] = [
    {
      title: 'Liquidation Risk',
      subtitle: 'Audit margin levels & liquidation price distance',
      prompt: 'Perform a liquidation risk audit on my currently open positions.',
      icon: ShieldAlert,
    },
    {
      title: 'Hedge Imbalance',
      subtitle: 'Identify volume delta mismatch across positions',
      prompt: 'Identify any volume mismatch and net delta exposure across my hedged positions.',
      icon: ArrowLeftRight,
    },
    {
      title: 'Funding Efficiency',
      subtitle: 'Review 7-day cumulative funding payments',
      prompt: 'Generate a summary of funding fees over the last 7 days: am I net paying or receiving fees?',
      icon: Coins,
    },
    {
      title: 'Portfolio Overview',
      subtitle: 'Consolidated equity, open PnL & exchange shares',
      prompt: 'Generate a consolidated executive summary with total net equity, unrealized PnL, and exchange allocation.',
      icon: LayoutDashboard,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md mx-auto">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(card.prompt)}
            disabled={disabled}
            className="group flex flex-col text-left p-3 rounded-xl bg-[#131418] hover:bg-[#1a1b22] border border-[#2a2b30] hover:border-[#2F6BFF]/50 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm min-h-[58px]"
          >
            <div className="flex items-center gap-2 mb-1">
              <IconComponent className="w-3.5 h-3.5 text-[#8E9299] group-hover:text-[#2F6BFF] transition-colors shrink-0" />
              <span className="text-xs font-semibold text-gray-200 group-hover:text-white transition-colors truncate">
                {card.title}
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299] group-hover:text-gray-400 line-clamp-1 leading-tight">
              {card.subtitle}
            </p>
          </button>
        );
      })}
    </div>
  );
};
