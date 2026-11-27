import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronDown, ChevronUp, Copy, Check, RotateCcw, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface AiErrorMessageCardProps {
  message: string;
  technicalDetails?: string;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  onOpenRawDebug?: () => void;
}

export const AiErrorMessageCard: React.FC<AiErrorMessageCardProps> = ({
  message,
  technicalDetails,
  onRetry,
  onOpenSettings,
  onOpenRawDebug,
}) => {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyDetails = () => {
    if (!technicalDetails) return;
    navigator.clipboard.writeText(technicalDetails);
    setCopied(true);
    toast.success(t('toasts.errorDetailsCopied', 'Error details copied to clipboard'), { icon: '📋' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2 text-danger">
        <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[11px] text-danger">
            {t('ai.error.title', 'AI Execution Notice')}
          </p>
          <p className="text-xs text-fg leading-relaxed font-normal">
            {message}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-danger/20">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t('ai.error.retry', 'Try again')}</span>
          </button>
        )}

        {onOpenRawDebug && (
          <button
            onClick={onOpenRawDebug}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-tone-cyan bg-tone-cyan/10 hover:bg-tone-cyan/20 border border-tone-cyan/30 rounded-lg transition cursor-pointer font-sans"
          >
            <span>{t('ai.error.inspectRaw', 'Inspect Raw Data')}</span>
          </button>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-fg hover:text-fg bg-elevated hover:bg-elevated-hover border border-line rounded-lg transition cursor-pointer"
          >
            <Settings className="w-3 h-3 text-accent" />
            <span>{t('ai.error.settings', 'AI Settings')}</span>
          </button>
        )}

        {technicalDetails && (
          <button
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-fg-muted hover:text-fg hover:bg-elevated rounded-lg transition cursor-pointer ml-auto"
          >
            <span>{t('ai.error.technicalLog', 'Technical log')}</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Collapsible Technical Details for debugging */}
      {showDetails && technicalDetails && (
        <div className="mt-2 p-2.5 bg-canvas border border-line rounded-lg text-[10px] font-mono text-fg-muted space-y-1.5 animate-fadeIn">
          <div className="flex items-center justify-between text-fg-muted pb-1 border-b border-line">
            <span>{t('ai.error.rawDiagnostic', 'Raw diagnostic error:')}</span>
            <button
              onClick={handleCopyDetails}
              className="flex items-center gap-1 text-[10px] text-accent hover:underline cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? t('common.copied', 'Copied!') : t('ai.error.copyLog', 'Copy log')}</span>
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto whitespace-pre-wrap break-all text-danger select-text">
            {technicalDetails}
          </div>
        </div>
      )}
    </div>
  );
};
