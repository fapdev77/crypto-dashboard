import React, { useMemo } from 'react';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { AlertCircle } from 'lucide-react';

const LIMITS: Record<string, { days: number, label: string }> = {
  okx: { days: 90, label: '3 meses (90 dias)' },
  bitget: { days: 90, label: '3 meses (90 dias)' },
  bybit: { days: 730, label: '2 anos' }
};

interface HistoryLimitWarningProps {
  period: string;
  className?: string;
}

export function HistoryLimitWarning({ period, className = '' }: HistoryLimitWarningProps) {
  const keys = useApiKeysStore(state => state.keys);

  const warnings = useMemo(() => {
    if (keys.length === 0) return [];
    
    let daysRequested = 0;
    
    if (period === 'today') {
      daysRequested = 1;
    } else if (period === '7d') {
      daysRequested = 7;
    } else if (period === '14d') {
      daysRequested = 14;
    } else if (period === '30d') {
      daysRequested = 30;
    } else if (period === '90d') {
      daysRequested = 90;
    }

    const warnedExchanges: string[] = [];
    keys.forEach(k => {
      const limit = LIMITS[k.exchange];
      if (limit && daysRequested > limit.days) {
        if (!warnedExchanges.includes(k.exchange)) {
          warnedExchanges.push(k.exchange);
        }
      }
    });

    return warnedExchanges.map(ex => ({ exchange: ex, max: LIMITS[ex].label }));
  }, [keys, period]);

  if (warnings.length === 0) return null;

  return (
    <div className={`bg-[#2A1D0B] border border-[#FFAB00]/30 rounded-xl p-3 flex items-start gap-3 ${className}`}>
      <AlertCircle className="w-5 h-5 text-[#FFAB00] mt-0.5 flex-shrink-0" />
      <div className="text-sm text-[#FFAB00]/90">
        <strong>Lacuna de Dados Históricos:</strong> Algumas de suas corretoras ativas possuem limites na API para consulta de histórico aberto. Dados antes destes limites não serão exibidos:
        <ul className="list-disc pl-5 mt-2 opacity-80 space-y-1">
          {warnings.map(w => (
            <li key={w.exchange} className="capitalize">
              {w.exchange}: Máximo de {w.max}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
