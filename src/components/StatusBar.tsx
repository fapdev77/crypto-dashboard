import React, { useMemo } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useConnectionStore } from '../store/connectionStore';
import { useSettingsStore } from '../store/settingsStore';
import { Activity, Lock, Unlock, KeyRound } from 'lucide-react';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { AppTooltip } from './ui/Tooltip';

export function StatusBar() {
  const { keys, isEncrypted } = useApiKeysStore();
  const { statuses, errors } = useConnectionStore();
  const useMockData = useSettingsStore(state => state.useMockData);

  const activeKeys = keys.filter(apiKey => apiKey.isActive);
  const activeCount = activeKeys.length;


  const exchangeGroups = useMemo(() => {
    const groups: Record<string, typeof keys> = {};
    keys.forEach(k => {
      if (!groups[k.exchange]) groups[k.exchange] = [];
      groups[k.exchange].push(k); 
    });
    return groups;
  }, [keys]);

  if (keys.length === 0 && !useMockData) {
    return (
      <div className="h-8 bg-[#0b0c10] border-t border-[#1f2937] flex items-center px-4 shrink-0 select-none overflow-x-auto hide-scrollbar">
        <div className="flex items-center justify-between w-full min-w-max">
          <div className="flex items-center gap-3">
            <AppTooltip description={`Encryption is ${isEncrypted ? 'ON' : 'OFF'}`}>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${isEncrypted ? 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}`}>
                {isEncrypted ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span className="text-[10px] hidden md:inline font-medium">{isEncrypted ? 'ENCRYPTED' : 'UNENCRYPTED'}</span>
              </div>
            </AppTooltip>
            <div className="w-px h-4 bg-[#1f2937]/50" />
            <span className="text-[10px] text-gray-500">No connected accounts.</span>
          </div>
          <span className="text-xs font-mono text-gray-500 flex items-center">
            <span className="text-[10px]">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-8 bg-[#0b0c10] border-t border-[#1f2937] flex items-center px-4 shrink-0 select-none overflow-x-auto hide-scrollbar">
      <div className="flex items-center justify-between w-full min-w-max">
        <div className="flex items-center gap-3">
          <AppTooltip description={`Encryption is ${isEncrypted ? 'ON' : 'OFF'}`}>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${isEncrypted ? 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}`}>
              {isEncrypted ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span className="text-[10px] hidden md:inline font-medium">{isEncrypted ? 'ENCRYPTED' : 'UNENCRYPTED'}</span>
            </div>
          </AppTooltip>

          <div className="w-px h-4 bg-white/50" />

           <AppTooltip description="Connected Accounts">
            <KeyRound className="w-3.5 h-3.5 text-gray-500 bg-[#00C853]/10 border-[#00C853]/20" />
          </AppTooltip>
          
          <div className="flex items-center gap-2">
            {useMockData && (
              <AppTooltip description="Simulation Mode Active">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Simulation</span>
                </div>
              </AppTooltip>
            )}

            {keys.length === 0 && useMockData && (
              <span className="text-[10px] text-gray-500 italic hidden md:inline">Simulating connections...</span>
            )}

            {Object.entries(exchangeGroups).map(([exchange, xKeysRaw]) => {
              const xKeys = xKeysRaw as typeof keys;
              const connectedCount = xKeys.filter(k => useMockData ? k.isActive : statuses[k.id] === 'connected').length;
              const disconnectedCount = xKeys.length - connectedCount;
              
              return (
                <AppTooltip
                  key={exchange}
                  description={
                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                      <p className="font-semibold text-white text-[13px] capitalize border-b border-gray-700/50 pb-1.5 mb-1">{exchange}</p>
                      {xKeys.map(k => {
                        const status = !k.isActive ? 'disabled' : (useMockData ? 'connected' : statuses[k.id] || 'disconnected');
                        const error = errors[k.id];
                        return (
                          <div key={k.id} className="flex flex-col">
                            <div className="flex justify-between items-center gap-4 text-[11px]">
                              <span className="text-gray-300 font-medium">{k.label}</span>
                              <span className={`capitalize ${status === 'connected' ? 'text-[#00C853]' : status === 'error' ? 'text-rose-400' : 'text-amber-400'}`}>
                                {status}
                              </span>
                            </div>
                            {error && <span className="text-[10px] text-rose-400/80 leading-tight mt-0.5">{error}</span>}
                          </div>
                        );
                      })}
                    </div>
                  }
                >
                  <div className="flex items-center gap-1.5 bg-[#1a1d24] px-2 py-0.5 rounded border border-[#2a2d35] cursor-help hover:border-gray-600 transition-colors">
                    <ExchangeIcon exchange={exchange} className="w-3.5 h-3.5 opacity-80" />
                    <span className="hidden md:inline text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {exchange}
                    </span>
                    <span className="text-[10px] font-mono tracking-wider ml-0.5">
                      <span className={connectedCount > 0 ? 'text-[#00C853]' : 'text-gray-500'}>
                        {connectedCount}
                      </span>
                      <span className="text-gray-500 mx-0.5">/</span>
                      <span className={disconnectedCount > 0 ? 'text-rose-400' : 'text-gray-500'}>
                        {disconnectedCount}
                      </span>
                    </span>
                  </div>
                </AppTooltip>
              );
            })}
          </div>
        </div>

        <span className="text-xs font-mono text-gray-500 flex items-center pr-2 ml-4 shrink-0">
          <span className="text-[10px]">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}</span>
        </span>
      </div>
    </div>
  );
}
