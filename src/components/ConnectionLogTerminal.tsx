import React, { useState, useEffect, useRef } from 'react';
import { useLogStore, LogLevel } from '../store/logStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';

import { useDashboardStore } from '../store/dashboardStore';

export function ConnectionLogTerminal() {
  const { entries, maxEntries, clearLogs } = useLogStore();
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>(['ERROR', 'WARN']);
  const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<string>('ALL');
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const activeKeys = keys.filter(k => k.isActive);

  // Format Date
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const date = d.toISOString().split('T')[0];
    const time = d.toISOString().split('T')[1].slice(0, 12);
    return `${date} ${time}`;
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'INFO': return 'text-[#00C853]';
      case 'WARN': return 'text-[#F2C94C]';
      case 'ERROR': return 'text-[#FF4444]';
      case 'DATA': return 'text-[#2F6BFF]';
      case 'SYSTEM': return 'text-[#8E9299]';
      default: return 'text-white';
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (!selectedLevels.includes(entry.level)) return false;
    
    if (selectedConnection !== 'ALL') {
       if (!entry.source.includes(selectedConnection) && entry.source !== selectedConnection) return false;
    }
    
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      if (!entry.message.toLowerCase().includes(lowerSearch) && 
          !entry.source.toLowerCase().includes(lowerSearch)) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#111216] overflow-hidden rounded-xl border border-[#2a2b30]">
      {/* Toolbar */}
      <div className="min-h-10 py-2 bg-[#111216] border-b border-[#2a2b30] flex flex-wrap items-center px-4 justify-between shrink-0 gap-y-3 z-20">
        <div className="flex flex-wrap items-center gap-2">
           <span className="text-xs font-mono text-[#8E9299]">Live Connection Log [Terminal View]</span>
           
           <div className="hidden sm:block h-4 w-px bg-[#2a2b30] mx-2" />
           
           <div className="relative">
             <button
               type="button"
               onClick={() => setIsLevelDropdownOpen(!isLevelDropdownOpen)}
               className="bg-[#1a1b1e] text-xs font-mono text-[#8E9299] border border-[#2a2b30] rounded px-3 py-1 flex items-center justify-between min-w-[120px] focus:border-[#2F6BFF] outline-none"
             >
               <span>
                 {selectedLevels.length > 0 
                   ? `${selectedLevels.length} Level${selectedLevels.length > 1 ? 's' : ''}`
                   : 'None selected'}
               </span>
               <ChevronDown className={`w-3 h-3 ml-2 transition-transform duration-200 ${isLevelDropdownOpen ? 'rotate-180' : ''}`} />
             </button>

             {isLevelDropdownOpen && (
               <>
                 <div className="fixed inset-0 z-10" onClick={() => setIsLevelDropdownOpen(false)} />
                 <div className="absolute z-20 top-full mt-1 left-0 bg-[#1a1b1e] border border-[#2a2b30] rounded shadow-lg overflow-hidden flex flex-col p-2 space-y-1 min-w-[140px]">
                   {(['INFO', 'WARN', 'ERROR', 'DATA', 'SYSTEM'] as LogLevel[]).map(level => {
                     const isChecked = selectedLevels.includes(level);
                     return (
                       <label key={level} className="flex items-center gap-2 cursor-pointer hover:bg-[#2a2b30]/50 px-2 py-1 rounded">
                         <input
                           type="checkbox"
                           checked={isChecked}
                           onChange={() => {
                             setSelectedLevels(prev => 
                               isChecked ? prev.filter(l => l !== level) : [...prev, level]
                             );
                           }}
                           className="w-3 h-3 cursor-pointer rounded border-[#2a2b30] bg-[#111216] text-[#2F6BFF] focus:ring-[#2F6BFF] focus:ring-offset-0"
                         />
                         <span className={`text-xs font-mono ${getLevelColor(level)}`}>{level}</span>
                       </label>
                     );
                   })}
                 </div>
               </>
             )}
           </div>

           <select 
             value={selectedConnection} 
             onChange={(e) => setSelectedConnection(e.target.value)}
             className="bg-[#1a1b1e] text-xs font-mono text-[#8E9299] border border-[#2a2b30] rounded px-2 py-0.5"
           >
             <option value="ALL">ALL CONNECTIONS</option>
             {activeKeys.map(k => (
               <option key={k.id} value={k.label}>{k.label} ({k.exchange.toUpperCase()})</option>
             ))}
           </select>
           
           <div className="relative">
             <Search className="w-3 h-3 absolute left-2 top-1.5 text-[#8E9299]" />
             <input 
               type="text" 
               placeholder="Search logs..." 
               value={searchText}
               onChange={(e) => setSearchText(e.target.value)}
               className="bg-[#1a1b1e] text-xs font-mono text-white border border-[#2a2b30] rounded pl-6 pr-2 py-0.5 w-40 focus:border-[#2F6BFF] outline-none"
             />
           </div>
        </div>

        <button 
          onClick={clearLogs}
          className="text-xs font-mono text-[#8E9299] hover:text-[#FF4444] transition-colors ml-4 min-w-max"
        >
          [Clear]
        </button>
      </div>

      {/* Terminal View */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[11px] md:text-sm"
      >
        {filteredEntries.map(entry => (
          <div key={entry.id} className="mb-1">
            <span className="text-[#8E9299]">[{formatDate(entry.timestamp)}]</span>{' '}
            <span className="text-[#FFFFFF]">[{entry.source}]</span>{' '}
            <span className={getLevelColor(entry.level)}>[{entry.level}]</span>{' '}
            <span className="text-[#cccccc] break-words whitespace-pre-wrap">{entry.message}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[#00C853] font-bold">&gt;</span>
          <span className="w-2 h-4 bg-[#00C853] animate-pulse" />
        </div>
        <div ref={endRef} />
      </div>

      <div className="h-6 bg-[#000000] border-t border-[#1a1b1e] flex items-center px-4 justify-between shrink-0">
         <span className="text-[10px] font-mono text-[#8E9299]">
            History: <span className="text-[#FFFFFF]">{entries.length} / {maxEntries} lines</span>
         </span>
      </div>
    </div>
  );
}
