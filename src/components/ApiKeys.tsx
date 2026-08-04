import React, { useState } from 'react';
import { Plus, Power, Edit2, Trash2, Shield } from 'lucide-react';
import { useApiKeysStore, Exchange, ApiCredentials } from '../store/apiKeysStore';
import { useConnectionStore } from '../store/connectionStore';
import { clearConnectionData } from '../store/crossStoreCleanup';
import { useSettingsStore } from '../store/settingsStore';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { ApiKeyModal } from './ApiKeyModal';
import { AppTooltip } from './ui/Tooltip';
import { LogManager } from '../services/LogManager';

const EXCHANGES: { id: Exchange; name: string }[] = [
  { id: 'bitget', name: 'Bitget' },
  { id: 'bybit', name: 'Bybit' },
  { id: 'okx', name: 'OKX' },
];

export function ApiKeys() {
  const { keys, toggleKey, removeKey } = useApiKeysStore();
  const { statuses } = useConnectionStore();
  const useMockData = useSettingsStore(state => state.useMockData);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedKey, setSelectedKey] = useState<ApiCredentials | undefined>();
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    bitget: false,
    bybit: false,
    okx: false
  });

  const toggleGroup = (exId: string) => {
    setExpandedGroups(prev => ({ ...prev, [exId]: !prev[exId] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    EXCHANGES.forEach(ex => {
      next[ex.id] = true;
    });
    setExpandedGroups(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    EXCHANGES.forEach(ex => {
      next[ex.id] = false;
    });
    setExpandedGroups(next);
  };

  const handleEdit = (apiKey: ApiCredentials) => {
    setSelectedKey(apiKey);
    setModalMode('edit');
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#111216] overflow-hidden rounded-xl border border-[#2a2b30]">
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-xl font-medium text-white">API Connections and status:</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'settings' }))}
                className="flex items-center gap-2 py-2 px-3 bg-[#1a1b1e] border border-[#2a2b30] hover:bg-[#202125] text-white text-sm font-medium rounded-lg transition-colors shrink-0"
              >
                <Shield className="w-4 h-4 text-[#2F6BFF]" />
                <span className="hidden sm:inline">API Key Import/Export</span>
              </button>
              <div className="flex items-center gap-2 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg p-1">
                <button
                  onClick={expandAll}
                  className="px-4 py-2 text-xs text-[#8E9299] hover:text-white hover:bg-[#2a2b30] rounded-md transition-colors"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="px-4 py-2 text-xs text-[#8E9299] hover:text-white hover:bg-[#2a2b30] rounded-md transition-colors"
                >
                  Collapse All
                </button>
              </div>
              <button
                onClick={() => {
                  setSelectedKey(undefined);
                  setModalMode('create');
                  setModalOpen(true);
                }}
                className="flex items-center gap-2 py-2 px-4 bg-[#2F6BFF] hover:bg-[#1E56DF] text-white text-sm font-medium rounded-lg transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                New API Key
              </button>
            </div>
          </div>

          {/* Groups */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXCHANGES.map(ex => {
              const groupKeys = keys.filter(k => k.exchange === ex.id);
              if (groupKeys.length === 0) return null;

              const isExpanded = expandedGroups[ex.id];

              return (
                <div key={ex.id} className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden flex flex-col h-fit">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(ex.id)}
                    className="w-full flex items-center justify-between p-4 bg-[#1a1b1e] hover:bg-[#202125] transition-colors border-b border-[#2a2b30]/50"
                  >
                    <div className="flex items-center gap-3">
                      <svg className={`h-4 w-4 text-[#8E9299] transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <ExchangeIcon exchange={ex.id as Exchange} className="w-6 h-6" />
                      <span className="font-medium text-white">{ex.name}</span>
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-[#2a2b30] text-[#8E9299] text-xs font-mono">
                        {groupKeys.filter(k => k.isActive).length} Active
                      </span>
                    </div>
                  </button>

                  {/* Group Content */}
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden">
                      {groupKeys.map((apiKey, idx) => {
                        const status = statuses[apiKey.id] || 'disconnected';

                        return (
                          <div key={apiKey.id} className={`p-4 ${idx > 0 ? 'border-t border-[#2a2b30]/50' : ''} hover:bg-[#202125]/50 transition-colors flex flex-col gap-3`}>

                            {/* Label & Status */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <ExchangeIcon exchange={apiKey.exchange} className="w-4 h-4 opacity-50 shrink-0" />
                                <span className="text-sm font-medium text-white truncate" title={apiKey.label}>
                                  {apiKey.label}
                                </span>
                              </div>
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono leading-none border uppercase tracking-wider shrink-0 ${!apiKey.isActive ? 'bg-[#8E9299]/10 text-[#8E9299] border-[#8E9299]/20' :
                                status === 'connected' ? 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/30' :
                                  status === 'connecting' ? 'bg-[#F2C94C]/10 text-[#F2C94C] border-[#F2C94C]/30 animate-pulse' :
                                    status === 'error' ? 'bg-[#FF4444]/10 text-[#FF4444] border-[#FF4444]/30' :
                                      'bg-[#8E9299]/10 text-[#8E9299] border-[#8E9299]/20'
                                }`}>
                                {!apiKey.isActive ? 'Inactive' : status}
                              </span>
                            </div>

                            {/* Actions bar */}
                            <div className="flex items-center justify-end gap-2.5 pt-1">
                              {keyToDelete === apiKey.id ? (
                                <div className="flex items-center gap-1 bg-[#FF4444]/10 border border-[#FF4444]/20 p-0.5 rounded">
                                  <span className="text-[15px] font-medium text-[#FF4444] px-15">Deletar a chave?</span>
                                  <button
                                    onClick={() => {
                                      clearConnectionData(apiKey.id);
                                      removeKey(apiKey.id);
                                      setKeyToDelete(null);
                                    }}
                                    className="text-[15px] px-4 py-0.5 bg-[#FF4444] hover:bg-[#CC0000] text-white rounded transition-colors"
                                  >
                                    Sim
                                  </button>
                                  |
                                  <button
                                    onClick={() => setKeyToDelete(null)}
                                    className="text-[15px] px-4 py-0.5 bg-[#2a2b30] hover:bg-[#323339] text-[#8E9299] rounded transition-colors"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <AppTooltip description="Edit connection label">
                                    <button
                                      onClick={() => handleEdit(apiKey)}
                                      className="text-[#8E9299] hover:text-[#2F6BFF] p-1 rounded hover:bg-[#202125] transition-all hover:scale-105"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </AppTooltip>
                                  <AppTooltip description={apiKey.isActive ? 'Disable connection' : 'Enable connection'}>
                                    <button
                                      onClick={() => {
                                        if (apiKey.isActive) {
                                          clearConnectionData(apiKey.id);
                                        }
                                        toggleKey(apiKey.id);
                                        LogManager.info('ApiKeys', `Key ${apiKey.label} ${apiKey.isActive ? 'disabled' : 'enabled'}`);
                                      }}
                                      className={`p-1 rounded hover:bg-[#202125] transition-all hover:scale-105 ${apiKey.isActive ? 'text-[#00C853] hover:text-[#FF4444]' : 'text-[#8E9299] hover:text-[#00C853]'}`}
                                    >
                                      <Power className="w-3.5 h-3.5" />
                                    </button>
                                  </AppTooltip>
                                  <AppTooltip description="Delete connection">
                                    <button
                                      onClick={() => setKeyToDelete(apiKey.id)}
                                      className="text-[#8E9299] hover:text-[#FF4444] p-1 rounded hover:bg-[#202125] transition-all hover:scale-105"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </AppTooltip>
                                </>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ApiKeyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        existingKey={selectedKey}
      />
    </div>
  );
}
