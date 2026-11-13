import React from 'react';
import { Square, RotateCcw, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AiCancelledMessageCardProps {
  message?: string;
  onRetry?: () => void;
  onOpenRawDebug?: () => void;
}

export const AiCancelledMessageCard: React.FC<AiCancelledMessageCardProps> = ({
  message,
  onRetry,
  onOpenRawDebug,
}) => {
  const { t } = useTranslation();
  const displayMsg = message || t('ai.cancelled.defaultMsg', 'Response generation was cancelled by user.');

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2.5 text-amber-300">
        <div className="w-5 h-5 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
          <Square className="w-2.5 h-2.5 fill-current" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-[11px] text-amber-300 flex items-center gap-1.5">
            <span>{t('ai.cancelled.title', 'Analysis Interrupted')}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400/90 font-mono font-normal border border-amber-500/20">
              {t('ai.cancelled.badge', 'Aborted')}
            </span>
          </p>
          <p className="text-xs text-fg leading-relaxed font-normal">
            {displayMsg}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-white bg-accent hover:bg-accent/85 rounded-lg transition cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t('ai.cancelled.retry', 'Retry')}</span>
          </button>
        )}

        {onOpenRawDebug && (
          <button
            type="button"
            onClick={onOpenRawDebug}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-fg hover:text-fg bg-elevated hover:bg-elevated-hover border border-line rounded-lg transition cursor-pointer font-sans"
          >
            <ShieldCheck className="w-3 h-3 text-accent" />
            <span>{t('ai.cancelled.inspectAudit', 'Inspect Audit')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
