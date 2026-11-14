import React, { useMemo } from 'react';
import { ShieldAlert, ArrowLeftRight, Coins, LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  const cards: PromptCard[] = useMemo(() => [
    {
      title: t('ai.quickActions.liquidationRisk.title', 'Liquidation Risk'),
      subtitle: t('ai.quickActions.liquidationRisk.subtitle', 'Audit margin levels & liquidation price distance'),
      prompt: t('ai.quickActions.liquidationRisk.prompt', 'Perform a liquidation risk audit on my currently open positions.'),
      icon: ShieldAlert,
    },
    {
      title: t('ai.quickActions.hedgeImbalance.title', 'Hedge Imbalance'),
      subtitle: t('ai.quickActions.hedgeImbalance.subtitle', 'Identify volume delta mismatch across positions'),
      prompt: t('ai.quickActions.hedgeImbalance.prompt', 'Identify any volume mismatch and net delta exposure across my hedged positions.'),
      icon: ArrowLeftRight,
    },
    {
      title: t('ai.quickActions.fundingEfficiency.title', 'Funding Efficiency'),
      subtitle: t('ai.quickActions.fundingEfficiency.subtitle', 'Review 7-day cumulative funding payments'),
      prompt: t('ai.quickActions.fundingEfficiency.prompt', 'Generate a summary of funding fees over the last 7 days: am I net paying or receiving fees?'),
      icon: Coins,
    },
    {
      title: t('ai.quickActions.portfolioOverview.title', 'Portfolio Overview'),
      subtitle: t('ai.quickActions.portfolioOverview.subtitle', 'Consolidated equity, open PnL & exchange shares'),
      prompt: t('ai.quickActions.portfolioOverview.prompt', 'Generate a consolidated executive summary with total net equity, unrealized PnL, and exchange allocation.'),
      icon: LayoutDashboard,
    },
  ], [t]);

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
            className="group flex flex-col text-left p-3 rounded-xl bg-canvas hover:bg-elevated border border-line hover:border-accent/50 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm min-h-[58px]"
          >
            <div className="flex items-center gap-2 mb-1">
              <IconComponent className="w-3.5 h-3.5 text-fg-muted group-hover:text-accent transition-colors shrink-0" />
              <span className="text-xs font-semibold text-fg group-hover:text-fg transition-colors truncate">
                {card.title}
              </span>
            </div>
            <p className="text-[11px] text-fg-muted group-hover:text-fg-muted line-clamp-1 leading-tight">
              {card.subtitle}
            </p>
          </button>
        );
      })}
    </div>
  );
};
