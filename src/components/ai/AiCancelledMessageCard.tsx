import React from 'react';
import { Square, RotateCcw, ShieldCheck } from 'lucide-react';

interface AiCancelledMessageCardProps {
  message?: string;
  onRetry?: () => void;
  onOpenRawDebug?: () => void;
}

export const AiCancelledMessageCard: React.FC<AiCancelledMessageCardProps> = ({
  message = 'Análise interrompida pelo usuário',
  onRetry,
  onOpenRawDebug,
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2.5 text-amber-300">
        <div className="w-5 h-5 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
          <Square className="w-2.5 h-2.5 fill-current" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-[11px] text-amber-300 flex items-center gap-1.5">
            <span>Análise Interrompida</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400/90 font-mono font-normal border border-amber-500/20">
              Abortada
            </span>
          </p>
          <p className="text-xs text-gray-300 leading-relaxed font-normal">
            {message || 'A geração da resposta foi cancelada pelo usuário.'}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-white bg-[#2F6BFF] hover:bg-[#2F6BFF]/85 rounded-lg transition cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Tentar novamente</span>
          </button>
        )}

        {onOpenRawDebug && (
          <button
            type="button"
            onClick={onOpenRawDebug}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-300 hover:text-white bg-[#1a1b20] hover:bg-[#25262c] border border-[#2a2b30] rounded-lg transition cursor-pointer font-sans"
          >
            <ShieldCheck className="w-3 h-3 text-[#2F6BFF]" />
            <span>Inspecionar Auditoria</span>
          </button>
        )}
      </div>
    </div>
  );
};
