import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLogStore, LogLevel } from '../store/logStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { Search, ChevronDown, ArrowDownToLine } from 'lucide-react';

export function ConnectionLogTerminal() {
  const { entries, maxEntries, clearLogs } = useLogStore();
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>(['ERROR', 'WARN', 'SYSTEM']);
  const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<string>('ALL');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const scrollCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newEntriesCount, setNewEntriesCount] = useState(0);
  const prevEntriesLengthRef = useRef(entries.length);

  // ── Auto-scroll logic ────────────────────────────────────────────

  // Check if the container is scrolled near the bottom (within threshold)
  const isNearBottom = useCallback((container: HTMLDivElement) => {
    const threshold = 80; // px from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Detect manual user scroll — disables auto-scroll when user scrolls up,
  // re-enables when user scrolls back to the bottom.
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Debounce to avoid rapid state changes during active scrolling
    if (scrollCheckTimeoutRef.current) {
      clearTimeout(scrollCheckTimeoutRef.current);
    }

    scrollCheckTimeoutRef.current = setTimeout(() => {
      if (isNearBottom(container)) {
        setAutoScrollEnabled(true);
      } else {
        setAutoScrollEnabled(false);
      }
    }, 50);
  }, [isNearBottom]);

  // Cleanup pending scroll check on unmount
  useEffect(() => {
    return () => {
      if (scrollCheckTimeoutRef.current) {
        clearTimeout(scrollCheckTimeoutRef.current);
      }
    };
  }, []);

  // Track new entries count when auto-scroll is disabled
  useEffect(() => {
    const currentLen = entries.length;
    const prevLen = prevEntriesLengthRef.current;

    if (currentLen > prevLen) {
      if (!autoScrollEnabled) {
        // New entries arrived while user was scrolled up — increment badge count
        setNewEntriesCount(prev => prev + (currentLen - prevLen));
      } else {
        // Auto-scroll is enabled, scroll to bottom
        endRef.current?.scrollIntoView({ behavior: 'auto' });
      }
    }

    prevEntriesLengthRef.current = currentLen;
  }, [entries, autoScrollEnabled]);

  // Scroll to the very bottom, re-enable auto-scroll, and reset badge count
  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScrollEnabled(true);
    setNewEntriesCount(0);
  }, []);

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

  // Quick level presets
  const setLevelPreset = useCallback((preset: LogLevel[]) => {
    setSelectedLevels(preset);
  }, []);

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
           <span className="text-xs font-mono text-[#8E9299]">Live Connection Log</span>
           
           {/* Auto-scroll indicator */}
           <button
             type="button"
             onClick={() => {
               if (!autoScrollEnabled) {
                 scrollToEnd();
               }
             }}
             className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border transition-all duration-200 ${
               autoScrollEnabled
                 ? 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/30 hover:bg-[#00C853]/20'
                 : 'bg-[#F2C94C]/10 text-[#F2C94C] border-[#F2C94C]/30 hover:bg-[#F2C94C]/20'
             }`}
             title={autoScrollEnabled ? 'Auto-scroll is ON — follows new entries' : 'Auto-scroll is paused — click to resume'}
           >
             <ArrowDownToLine className={`w-3 h-3 transition-transform ${autoScrollEnabled ? '' : 'animate-bounce'}`} />
             <span>{autoScrollEnabled ? 'Auto' : 'Paused'}</span>
           </button>
           
           <div className="hidden sm:block h-4 w-px bg-[#2a2b30] mx-2" />
           
           {/* Quick filter presets */}
           <div className="flex items-center gap-1">
             {[
               { label: 'All', levels: ['INFO', 'WARN', 'ERROR', 'DATA', 'SYSTEM'] as LogLevel[] },
               { label: 'Important', levels: ['ERROR', 'WARN', 'SYSTEM'] as LogLevel[] },
               { label: 'Errors', levels: ['ERROR'] as LogLevel[] },
             ].map(preset => {
               const isActive = selectedLevels.length === preset.levels.length &&
                 preset.levels.every(l => selectedLevels.includes(l));
               return (
                 <button
                   key={preset.label}
                   type="button"
                   onClick={() => setLevelPreset(preset.levels)}
                   className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-all duration-200 ${
                     isActive
                       ? 'bg-[#2F6BFF]/20 text-[#2F6BFF] border border-[#2F6BFF]/40'
                       : 'text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/50 border border-transparent'
                   }`}
                 >
                   {preset.label}
                 </button>
               );
             })}
           </div>
           
           {/* Filtered count */}
           <span className="text-[10px] font-mono text-[#6B7280]">
             {filteredEntries.length}/{entries.length}
           </span>
           
           
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
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 font-mono text-[11px] md:text-sm relative"
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

        {/* "Go to end" floating button — appears when auto-scroll is disabled */}
        {!autoScrollEnabled && (
          <div className="sticky bottom-0 left-0 right-0 flex justify-center pointer-events-none pb-1">
            <button
              type="button"
              onClick={scrollToEnd}
              className="pointer-events-auto relative flex items-center gap-1.5 bg-[#2F6BFF] hover:bg-[#1a5ae6] text-white text-[11px] font-mono px-3 py-1.5 rounded-full shadow-lg shadow-black/40 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              <span>Go to end</span>
              {newEntriesCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#FF4444] text-white text-[10px] font-bold rounded-full px-1 shadow-lg animate-in zoom-in duration-200">
                  {newEntriesCount > 99 ? '99+' : newEntriesCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="h-6 bg-[#000000] border-t border-[#1a1b1e] flex items-center px-4 justify-between shrink-0">
         <span className="text-[10px] font-mono text-[#8E9299]">
            History: <span className="text-[#FFFFFF]">{entries.length} / {maxEntries} lines</span>
         </span>
      </div>
    </div>
  );
}
