import React, { useState } from 'react';
import { Plus, Power, Edit2, Trash2 } from 'lucide-react';
import { useApiKeysStore, Exchange, ApiCredentials } from '../store/apiKeysStore';
import { useDashboardStore } from '../store/dashboardStore';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { ApiKeyModal } from './ApiKeyModal';
import { Sparkline } from './ui/Sparkline';

const EXCHANGES: { id: Exchange; name: string }[] = [
  { id: 'bitget', name: 'Bitget' },
  { id: 'bybit', name: 'Bybit' },
  { id: 'okx', name: 'OKX' },
];

export function ApiKeys() {
  const { keys, toggleKey, removeKey } = useApiKeysStore();
  const { clearConnectionData, statuses, telemetry } = useDashboardStore(state => state);
  
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

  const handleEdit = (apiKey: ApiCredentials) => {
    setSelectedKey(apiKey);
    setModalMode('edit');
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#111216] overflow-hidden rounded-xl border border-[#2a2b30]">
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-white">API Connections Table</h2>
            <button
              onClick={() => {
                setSelectedKey(undefined);
                setModalMode('create');
                setModalOpen(true);
              }}
              className="flex items-center gap-2 py-2 px-4 bg-[#2F6BFF] hover:bg-[#1E56DF] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New API Key
            </button>
          </div>

          {/* Groups */}
        <div className="space-y-4">
          {EXCHANGES.map(ex => {
            const groupKeys = keys.filter(k => k.exchange === ex.id);
            if (groupKeys.length === 0) return null;
            
            const isExpanded = expandedGroups[ex.id];
            
            return (
              <div key={ex.id} className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden">
                {/* Group Header */}
                <button 
                  onClick={() => toggleGroup(ex.id)}
                  className="w-full flex items-center justify-between p-4 bg-[#1a1b1e] hover:bg-[#202125] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className={`h-4 w-4 text-[#8E9299] transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <ExchangeIcon exchange={ex.id as Exchange} className="w-6 h-6" />
                    <span className="font-medium text-white">{ex.name} Exchange</span>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-[#2a2b30] text-[#8E9299] text-xs font-mono">
                      {groupKeys.filter(k => k.isActive).length} Active
                    </span>
                  </div>
                  
                  {/* Column Headers strictly aligned */}
                  {isExpanded && (
                    <div className="hidden md:grid grid-cols-[80px_120px_120px_140px] gap-4 w-[500px] shrink-0 text-left text-xs font-medium text-[#8E9299]">
                      <div>Status</div>
                      <div>Latency</div>
                      <div>Throughput</div>
                      <div className="text-right pr-4">Actions</div>
                    </div>
                  )}
                </button>

                {/* Group Content */}
                <div 
                  className={`grid transition-[grid-template-rows] duration-300 ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="overflow-hidden">
                    {groupKeys.map((apiKey, idx) => {
                      const status = statuses[apiKey.id] || 'disconnected';
                      const tel = telemetry[apiKey.id] || { latencyHistory: [], throughputHistory: [], lastPingMs: 0, bytesPerSecond: 0 };
                      const isConnected = status === 'connected';
                      
                      const tKB = (tel.bytesPerSecond / 1024).toFixed(1);

                      return (
                        <div key={apiKey.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 ${idx > 0 ? 'border-t border-[#2a2b30]/50' : ''} hover:bg-[#202125]/50 transition-colors`}>
                          
                          {/* Label */}
                          <div className="flex items-center gap-3 mb-3 md:mb-0 md:pl-16">
                             {/* Optional micro icon */}
                             <ExchangeIcon exchange={apiKey.exchange} className="w-4 h-4 opacity-50" />
                             <span className="text-sm font-medium text-white">{apiKey.label}</span>
                             <span className="text-xs text-[#8E9299] uppercase">({apiKey.exchange})</span>
                          </div>

                          {/* Data Columns */}
                          <div className="grid grid-cols-2 md:grid-cols-[80px_120px_120px_140px] gap-4 w-full md:w-[500px] shrink-0 items-center mt-2 md:mt-0">
                            
                            {/* Status */}
                            <div>
                               <span className={`inline-flex px-2 py-1 flex items-center justify-center rounded text-[10px] font-mono leading-none border uppercase tracking-wider ${
                                  !apiKey.isActive ? 'bg-[#8E9299]/10 text-[#8E9299] border-[#8E9299]/20' :
                                  status === 'connected' ? 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/30' :
                                  status === 'connecting' ? 'bg-[#F2C94C]/10 text-[#F2C94C] border-[#F2C94C]/30 animate-pulse' :
                                  status === 'error' ? 'bg-[#FF4444]/10 text-[#FF4444] border-[#FF4444]/30' :
                                  'bg-[#8E9299]/10 text-[#8E9299] border-[#8E9299]/20'
                               }`}>
                                  {!apiKey.isActive ? 'Inactive' : status}
                               </span>
                            </div>

                            {/* Latency */}
                            <div className="flex items-center gap-2">
                               {isConnected ? (
                                 <>
                                   <Sparkline data={tel.latencyHistory} color="emerald" width={50} height={20} />
                                   <span className="text-xs font-mono text-[#8E9299]">{tel.lastPingMs || '--'}ms</span>
                                 </>
                               ) : (
                                 <span className="text-xs font-mono text-[#8E9299]">-- ms</span>
                               )}
                            </div>

                            {/* Throughput */}
                            <div className="flex items-center gap-2">
                               {isConnected ? (
                                  <>
                                     <ThroughputBars history={tel.throughputHistory} />
                                     <span className="text-xs font-mono text-[#8E9299]">{tKB} KB/s</span>
                                  </>
                               ) : (
                                 <span className="text-xs font-mono text-[#8E9299]">-- KB/s</span>
                               )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end pr-0 md:pr-4 gap-3">
                               {keyToDelete === apiKey.id ? (
                                  <div className="flex items-center gap-1.5 bg-[#FF4444]/10 border border-[#FF4444]/20 p-1 rounded">
                                     <span className="text-[10px] font-medium text-[#FF4444] px-1">Sure?</span>
                                     <button 
                                        onClick={() => setKeyToDelete(null)}
                                        className="text-[10px] px-2 py-0.5 bg-[#2a2b30] hover:bg-[#323339] text-[#8E9299] rounded transition-colors"
                                     >
                                        No
                                     </button>
                                     <button 
                                        onClick={() => {
                                          clearConnectionData(apiKey.id);
                                          removeKey(apiKey.id);
                                          setKeyToDelete(null);
                                        }}
                                        className="text-[10px] px-2 py-0.5 bg-[#FF4444] hover:bg-[#CC0000] text-white rounded transition-colors"
                                     >
                                        Yes
                                     </button>
                                  </div>
                               ) : (
                                 <>
                                   <button 
                                      onClick={() => handleEdit(apiKey)}
                                      className="text-[#8E9299] hover:text-[#2F6BFF] transition-all hover:scale-110"
                                      title="Edit Label"
                                   >
                                     <Edit2 className="w-4 h-4" />
                                   </button>
                                   <button 
                                      onClick={() => {
                                         if (apiKey.isActive) {
                                            clearConnectionData(apiKey.id);
                                         }
                                         toggleKey(apiKey.id);
                                      }}
                                      className={`transition-all hover:scale-110 ${apiKey.isActive ? 'text-[#00C853] hover:text-[#FF4444]' : 'text-[#8E9299] hover:text-[#00C853]'}`}
                                      title={apiKey.isActive ? 'Disable' : 'Enable'}
                                   >
                                     <Power className="w-4 h-4" />
                                   </button>
                                   <button 
                                      onClick={() => setKeyToDelete(apiKey.id)}
                                      className="text-[#8E9299] hover:text-[#FF4444] transition-all hover:scale-110"
                                      title="Remove"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                 </>
                               )}
                            </div>

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

function ThroughputBars({ history }: { history: number[] }) {
  if (!history || history.length === 0) return <div className="w-[40px] h-[20px]" />;
  const max = Math.max(...history) || 1;
  
  // Show max 10 bars
  const slice = history.slice(-10);
  
  return (
    <div className="flex items-end gap-[1px] h-[20px] w-[40px]">
      {slice.map((val, i) => {
        const heightPct = Math.max((val / max) * 100, 10); // Minimum 10% height for visibility
        return (
          <div 
            key={i} 
            className="w-[3px] bg-[#2F6BFF] opacity-80" 
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}
