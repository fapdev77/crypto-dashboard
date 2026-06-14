import React, { useMemo } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';
import { Activity } from 'lucide-react';
import { ExchangeIcon } from './ui/ExchangeIcon';

export function StatusBar() {
  const { keys } = useApiKeysStore();
  const { statuses, errors, telemetry } = useDashboardStore();
  const useMockData = useSettingsStore(state => state.useMockData);

  const activeKeys = keys.filter(apiKey => apiKey.isActive);
  const activeCount = activeKeys.length;

  let sumLatency = 0;
  let latencyCount = 0;
  let totalThroughput = 0;
  activeKeys.forEach(k => {
    if (telemetry[k.id]) {
       const ping = telemetry[k.id].lastPingMs;
       if (ping > 0) {
         sumLatency += ping;
         latencyCount++;
       }
       totalThroughput += telemetry[k.id].bytesPerSecond || 0;
    }
  });
  const avgLatency = latencyCount > 0 ? Math.round(sumLatency / latencyCount) : 0;
  const throughputKB = (totalThroughput / 1024).toFixed(1);

  const exchangeGroups = useMemo(() => {
    const groups: Record<string, typeof keys> = {};
    activeKeys.forEach(k => {
      if (!groups[k.exchange]) groups[k.exchange] = [];
      groups[k.exchange].push(k);
    });
    return groups;
  }, [activeKeys]);

  if (activeKeys.length === 0 && !useMockData) {
    return (
      <div className="h-8 bg-[#0b0c10] border-t border-[#1f2937] flex items-center px-4 text-xs text-gray-500 shrink-0 select-none">
        Nenhuma conexão API ativa.
      </div>
    );
  }

  return (
    <div className="min-h-8 py-1 bg-[#0b0c10] border-t border-[#1f2937] flex items-center px-4 flex-wrap shrink-0 select-none">
      <div className="flex items-center justify-between gap-6 w-full">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <Activity className="w-3.5 h-3.5" />
              <span>Status das Conexões</span>
            </div>
            {useMockData && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-500 text-[10px] font-bold uppercase tracking-widest shrink-0">
                 <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                 Simulation Mode
              </div>
            )}
          </div>

          <div className="flex items-center gap-5 flex-wrap">
            {activeKeys.length === 0 && useMockData && (
              <span className="text-[10px] text-gray-500 italic">Simulando conexões...</span>
            )}
            {Object.entries(exchangeGroups).map(([exchange, xKeysRaw]) => {
              const xKeys = xKeysRaw as typeof keys;
              return (
                <div key={exchange} className="flex items-center gap-2 border-r border-[#1f2937]/50 pr-5 last:border-0 last:pr-0">
                  <div className="flex items-center gap-1.5 opacity-60">
                    <ExchangeIcon exchange={exchange} className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                      {exchange}:
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {xKeys.map(key => {
                    const status = statuses[key.id] || 'disconnected';
                    const error = errors[key.id];

                    let bgColorClass = 'bg-gray-500';
                    let shadowClass = '';
                    
                    if (status === 'connected') {
                      bgColorClass = 'bg-emerald-500';
                      shadowClass = 'shadow-[0_0_4px_rgba(16,185,129,0.5)]';
                    } else if (status === 'connecting') {
                      bgColorClass = 'bg-amber-500 animate-pulse';
                      shadowClass = 'shadow-[0_0_4px_rgba(245,158,11,0.5)]';
                    } else if (status === 'error') {
                      bgColorClass = 'bg-rose-500';
                      shadowClass = 'shadow-[0_0_4px_rgba(244,63,94,0.5)]';
                    }

                    return (
                      <div 
                        key={key.id}
                        className="group relative cursor-help flex items-center gap-1.5"
                      >
                        <div className={`w-2 h-2 rounded-full ${bgColorClass} ${shadowClass} transition-colors`} />
                        <span className="text-[10px] text-gray-300 font-medium whitespace-nowrap">
                          {key.label}
                        </span>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                          <div className="bg-[#1a1b1e] text-white text-xs py-1.5 px-3 rounded shadow-lg border border-[#2a2b30] whitespace-nowrap">
                            <p className="font-semibold">{key.label}</p>
                            <p className="mt-0.5 text-gray-400 text-[10px] capitalize">{status}</p>
                            {error && <p className="mt-1 text-rose-400 max-w-[200px] text-[10px] whitespace-normal leading-tight">{error}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        </div>

        <span className="text-xs font-mono text-[#8E9299] flex items-center gap-2 pr-2">
            <span>Connections: <span className="text-[#00C853]">{activeCount} Active</span></span>
            <span>|</span>
            <span>Throughput: <span className="text-[#2F6BFF]">{throughputKB} KB/s</span></span>
            <span>|</span>
            <span>Latency: <span className="text-[#00C853]">{avgLatency}ms</span></span>
        </span>
      </div>
    </div>
  );
}
