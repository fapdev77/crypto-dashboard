import React, { useMemo } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useConnectionStore } from '../store/connectionStore';
import { useSettingsStore } from '../store/settingsStore';
import { usePwaUpdateStore } from '../store/pwaUpdateStore';
import { Lock, Unlock, KeyRound, Sparkles, RefreshCw } from 'lucide-react';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { AppTooltip } from './ui/Tooltip';
import { useTranslation } from 'react-i18next';

export function StatusBar() {
  const { t } = useTranslation();
  const { keys, isEncrypted } = useApiKeysStore();
  const { statuses, errors } = useConnectionStore();
  const useMockData = useSettingsStore(state => state.useMockData);
  const { needRefresh, isUpdating, triggerUpdate } = usePwaUpdateStore();

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
      <div className="h-8 bg-canvas border-t border-line flex items-center px-4 shrink-0 select-none overflow-x-auto hide-scrollbar">
        <div className="flex items-center justify-between w-full min-w-max">
          <div className="flex items-center gap-3">
            <AppTooltip description={isEncrypted ? t('common.statusBar.encryptionOn', 'Security & Backup (Encryption is ON)') : t('common.statusBar.encryptionOff', 'Security & Backup (Encryption is OFF)')}>
              <button
                onClick={handleSecurityClick}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded border cursor-pointer hover:opacity-80 transition-all ${isEncrypted ? 'text-success bg-success/10 border-success/20 hover:border-success/50' : 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50'}`}
              >
                {isEncrypted ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span className="text-[10px] hidden md:inline font-medium">
                  {isEncrypted ? t('common.statusBar.encrypted', 'ENCRYPTED') : t('common.statusBar.unencrypted', 'UNENCRYPTED')}
                </span>
              </button>
            </AppTooltip>
            <div className="w-px h-4 bg-line" />
            <AppTooltip description={t('common.statusBar.manageApi', 'Manage API Connections & Status')}>
              <button
                onClick={handleApiKeysClick}
                className="text-[10px] text-fg-muted hover:text-fg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>{t('common.statusBar.noAccounts', 'No connected accounts.')}</span>
              </button>
            </AppTooltip>
          </div>
          {needRefresh ? (
            <AppTooltip description={t('common.statusBar.newVersionAvailable', 'New version available! Click to update application now')}>
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
                <span>{isUpdating ? t('common.statusBar.updating', 'UPDATING...') : t('common.statusBar.updateReady', 'UPDATE READY')}</span>
              </button>
            </AppTooltip>
          ) : (
            <AppTooltip description={t('common.statusBar.viewVersion', 'View Version & Release Notes')}>
              <button
                onClick={handleVersionClick}
                className="text-[10px] font-mono text-fg-muted hover:text-fg hover:bg-elevated px-1.5 py-0.5 rounded transition-colors cursor-pointer border border-transparent hover:border-line-strong"
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
    <div className="h-8 bg-canvas border-t border-line flex items-center px-4 shrink-0 select-none overflow-x-auto hide-scrollbar">
      <div className="flex items-center justify-between w-full min-w-max">
        <div className="flex items-center gap-3">
          <AppTooltip description={isEncrypted ? t('common.statusBar.encryptionOn', 'Security & Backup (Encryption is ON)') : t('common.statusBar.encryptionOff', 'Security & Backup (Encryption is OFF)')}>
            <button
              onClick={handleSecurityClick}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border cursor-pointer hover:opacity-80 transition-all ${isEncrypted ? 'text-success bg-success/10 border-success/20 hover:border-success/50' : 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50'}`}
            >
              {isEncrypted ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span className="text-[10px] hidden md:inline font-medium">
                {isEncrypted ? t('common.statusBar.encrypted', 'ENCRYPTED') : t('common.statusBar.unencrypted', 'UNENCRYPTED')}
              </span>
            </button>
          </AppTooltip>

          <div className="w-px h-4 bg-line" />

          <AppTooltip description={t('common.statusBar.manageApi', 'Manage API Connections & Status')}>
            <button
              onClick={handleApiKeysClick}
              className="p-1 rounded text-fg-muted hover:text-fg hover:bg-elevated transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          </AppTooltip>
          
          <div className="flex items-center gap-2">
            {useMockData && (
              <AppTooltip description={t('common.statusBar.simulationActive', 'Simulation Mode Active')}>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">
                    {t('common.simulation', 'Simulation')}
                  </span>
                </div>
              </AppTooltip>
            )}

            {keys.length === 0 && useMockData && (
              <AppTooltip description={t('common.statusBar.manageApi', 'Manage API Connections & Status')}>
                <button
                  onClick={handleApiKeysClick}
                  className="text-[10px] text-fg-muted hover:text-fg italic hidden md:inline cursor-pointer transition-colors"
                >
                  {t('common.statusBar.simulating', 'Simulating connections...')}
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
                      <p className="font-semibold text-fg text-[13px] capitalize border-b border-line pb-1.5 mb-1">{exchange}</p>
                      {xKeys.map(k => {
                        const status = !k.isActive ? 'disabled' : (useMockData ? 'connected' : statuses[k.id] || 'disconnected');
                        const error = errors[k.id];
                        return (
                          <div key={k.id} className="flex flex-col">
                            <div className="flex justify-between items-center gap-4 text-[11px]">
                              <span className="text-fg font-medium">{k.label}</span>
                              <span className={`capitalize ${status === 'connected' ? 'text-success' : status === 'error' ? 'text-rose-400' : 'text-amber-400'}`}>
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
                    className="flex items-center gap-1.5 bg-elevated px-2 py-0.5 rounded border border-line cursor-pointer hover:border-line-strong hover:bg-elevated-hover transition-colors"
                  >
                    <ExchangeIcon exchange={exchange} className="w-3.5 h-3.5 opacity-80" />
                    <span className="hidden md:inline text-[10px] uppercase font-bold text-fg-muted tracking-wider">
                      {exchange}
                    </span>
                    <span className="text-[10px] font-mono tracking-wider ml-0.5">
                      <span className={connectedCount > 0 ? 'text-success' : 'text-fg-muted'}>
                        {connectedCount}
                      </span>
                      <span className="text-fg-muted mx-0.5">/</span>
                      <span className={disconnectedCount > 0 ? 'text-rose-400' : 'text-fg-muted'}>
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
          <AppTooltip description={t('common.statusBar.newVersionAvailable', 'New version available! Click to update application now')}>
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
              <span>{isUpdating ? t('common.statusBar.updating', 'UPDATING...') : t('common.statusBar.updateReady', 'UPDATE READY')}</span>
            </button>
          </AppTooltip>
        ) : (
          <AppTooltip description={t('common.statusBar.viewVersion', 'View Version & Release Notes')}>
            <button
              onClick={handleVersionClick}
              className="text-[10px] font-mono text-fg-muted hover:text-fg hover:bg-elevated px-1.5 py-0.5 rounded transition-colors cursor-pointer border border-transparent hover:border-line-strong ml-4 shrink-0"
            >
              v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}
            </button>
          </AppTooltip>
        )}
      </div>
    </div>
  );
}
