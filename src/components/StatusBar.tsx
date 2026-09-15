import React, { useMemo } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useConnectionStore } from '../store/connectionStore';
import { useSettingsStore } from '../store/settingsStore';
import { usePwaUpdateStore } from '../store/pwaUpdateStore';
import { Activity, Lock, Unlock, KeyRound, Sparkles, RefreshCw } from 'lucide-react';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { AppTooltip } from './ui/Tooltip';

export function StatusBar() {
  const { keys, isEncrypted } = useApiKeysStore();
  const { statuses, errors } = useConnectionStore();
  const useMockData = useSettingsStore(state => state.useMockData);
  const { needRefresh, isUpdating, triggerUpdate } = usePwaUpdateStore();

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

  const handleVersionClick = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-tab', {
      detail: { tab: 'settings', targetId: 'version-info-card' }
    }));
  };

  const handleSecurityClick = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-tab', {
      detail: { tab: 'settings', targetId: 'security-settings-card' }
    }));
  };

  const handleApiKeysClick = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-tab', {
      detail: 'api-keys'
    }));
  };

  if (keys.length === 0 && !useMockData) {
    return (
      <div className="h-8 bg-[#0b0c10] border-t border-[#1f2937] flex items-center px-4 shrink-0 select-none overflow-x-auto hide-scrollbar">
        <div className="flex items-center justify-between w-full min-w-max">
          <div className="flex items-center gap-3">
            <AppTooltip description={`Security & Backup (Encryption is ${isEncrypted ? 'ON' : 'OFF'})`}>
              <button
                onClick={handleSecurityClick}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded border cursor-pointer hover:opacity-80 transition-all ${isEncrypted ? 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20 hover:border-[#00C853]/50' : 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50'}`}
              >
                {isEncrypted ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span className="text-[10px] hidden md:inline font-medium">{isEncrypted ? 'ENCRYPTED' : 'UNENCRYPTED'}</span>
              </button>
            </AppTooltip>
            <div className="w-px h-4 bg-[#1f2937]/50" />
            <AppTooltip description="Manage API Connections & Status">
              <button
                onClick={handleApiKeysClick}
                className="text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>No connected accounts.</span>
              </button>
            </AppTooltip>
          </div>
          {needRefresh ? (
            <AppTooltip description="New version available! Click to update application now">
              <button
                onClick={() => triggerUpdate()}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-blue-500/40 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:border-blue-400 text-[10px] font-medium font-mono cursor-pointer transition-all animate-pulse shrink-0 shadow-sm shadow-blue-500/20"
              >
                {isUpdating ? (
                  <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-blue-400" />
                )}
                <span>{isUpdating ? 'UPDATING...' : 'UPDATE READY'}</span>
              </button>
            </AppTooltip>
          ) : (
            <AppTooltip description="View Version & Release Notes">
              <button
                onClick={handleVersionClick}
                className="text-[10px] font-mono text-gray-400 hover:text-white hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors cursor-pointer border border-transparent hover:border-gray-700"
              >
                v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}
              </button>
            </AppTooltip>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-8 bg-[#0b0c10] border-t border-[#1f2937] flex items-center px-4 shrink-0 select-none overflow-x-auto hide-scrollbar">
      <div className="flex items-center justify-between w-full min-w-max">
        <div className="flex items-center gap-3">
          <AppTooltip description={`Security & Backup (Encryption is ${isEncrypted ? 'ON' : 'OFF'})`}>
            <button
              onClick={handleSecurityClick}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border cursor-pointer hover:opacity-80 transition-all ${isEncrypted ? 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20 hover:border-[#00C853]/50' : 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50'}`}
            >
              {isEncrypted ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span className="text-[10px] hidden md:inline font-medium">{isEncrypted ? 'ENCRYPTED' : 'UNENCRYPTED'}</span>
            </button>
          </AppTooltip>

          <div className="w-px h-4 bg-white/50" />

          <AppTooltip description="Manage API Connections & Status">
            <button
              onClick={handleApiKeysClick}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
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
              <AppTooltip description="Manage API Connections & Status">
                <button
                  onClick={handleApiKeysClick}
                  className="text-[10px] text-gray-500 hover:text-white italic hidden md:inline cursor-pointer transition-colors"
                >
                  Simulating connections...
                </button>
              </AppTooltip>
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
                  <button
                    onClick={handleApiKeysClick}
                    className="flex items-center gap-1.5 bg-[#1a1d24] px-2 py-0.5 rounded border border-[#2a2d35] cursor-pointer hover:border-gray-500 hover:bg-[#222630] transition-colors"
                  >
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
                  </button>
                </AppTooltip>
              );
            })}
          </div>
        </div>

        {needRefresh ? (
          <AppTooltip description="New version available! Click to update application now">
            <button
              onClick={() => triggerUpdate()}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-blue-500/40 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:border-blue-400 text-[10px] font-medium font-mono cursor-pointer transition-all animate-pulse ml-4 shrink-0 shadow-sm shadow-blue-500/20"
            >
              {isUpdating ? (
                <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 text-blue-400" />
              )}
              <span>{isUpdating ? 'UPDATING...' : 'UPDATE READY'}</span>
            </button>
          </AppTooltip>
        ) : (
          <AppTooltip description="View Version & Release Notes">
            <button
              onClick={handleVersionClick}
              className="text-[10px] font-mono text-gray-400 hover:text-white hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors cursor-pointer border border-transparent hover:border-gray-700 ml-4 shrink-0"
            >
              v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}
            </button>
          </AppTooltip>
        )}
      </div>
    </div>
  );
}
