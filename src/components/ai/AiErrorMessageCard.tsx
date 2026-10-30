import React, { useState } from 'react';
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
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyDetails = () => {
    if (!technicalDetails) return;
    navigator.clipboard.writeText(technicalDetails);
    setCopied(true);
    toast.success('Error details copied to clipboard', { icon: '📋' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2 text-rose-300">
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[11px] text-rose-300">
            AI Execution Notice
          </p>
          <p className="text-xs text-gray-200 leading-relaxed font-normal">
            {message}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-900/30">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-white bg-[#2F6BFF] hover:bg-[#2F6BFF]/80 rounded-lg transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Try again</span>
          </button>
        )}

        {onOpenRawDebug && (
          <button
            onClick={onOpenRawDebug}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 rounded-lg transition cursor-pointer font-sans"
          >
            <span>Inspect Raw Data</span>
          </button>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-300 hover:text-white bg-[#1a1b20] hover:bg-[#25262c] border border-[#2a2b30] rounded-lg transition cursor-pointer"
          >
            <Settings className="w-3 h-3 text-[#2F6BFF]" />
            <span>AI Settings</span>
          </button>
        )}

        {technicalDetails && (
          <button
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-[#8E9299] hover:text-gray-300 hover:bg-[#1a1b20] rounded-lg transition cursor-pointer ml-auto"
          >
            <span>Technical log</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Collapsible Technical Details for debugging */}
      {showDetails && technicalDetails && (
        <div className="mt-2 p-2.5 bg-[#0b0c10] border border-[#2a2b30] rounded-lg text-[10px] font-mono text-gray-400 space-y-1.5 animate-fadeIn">
          <div className="flex items-center justify-between text-[#8E9299] pb-1 border-b border-[#202227]">
            <span>Raw diagnostic error:</span>
            <button
              onClick={handleCopyDetails}
              className="flex items-center gap-1 text-[10px] text-[#2F6BFF] hover:underline cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado' : 'Copiar log'}</span>
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto whitespace-pre-wrap break-all text-rose-300/80 select-text">
            {technicalDetails}
          </div>
        </div>
      )}
    </div>
  );
};
