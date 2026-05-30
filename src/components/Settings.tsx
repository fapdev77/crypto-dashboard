import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { clearAllCache, getCacheSize } from '../services/historyCache';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';
import { Database, Trash2, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

export function Settings() {
  const { 
    useMockData, setUseMockData, 
    bybitPollingInterval, setBybitPollingInterval,
    historyCacheInterval, setHistoryCacheInterval 
  } = useSettingsStore();

  const keys = useApiKeysStore(state => state.keys);

  const [isClearing, setIsClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [cacheSize, setCacheSize] = useState<number | null>(null);

  useEffect(() => {
    getCacheSize().then(setCacheSize).catch(console.error);
  }, []);

  const handleForceSync = async () => {
    if (keys.length === 0) return;
    setIsSyncing(true);
    setSynced(false);
    try {
      const service = new PositionHistoryService();
      await Promise.all(keys.map(apiKey => service.fetchWithCache(apiKey)));
      
      const newSize = await getCacheSize();
      setCacheSize(newSize);
      
      setSynced(true);
      toast.success('Cache synced successfully', { id: 'cache-sync' });
      setTimeout(() => setSynced(false), 3000);
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to sync cache: ${e.message || 'Unknown error'}`, { id: 'err-cache-sync' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    setCleared(false);
    try {
      await clearAllCache();
      setCacheSize(0);
      
      if (keys.length > 0) {
        // Trigger background sync
        const service = new PositionHistoryService();
        await Promise.all(keys.map(apiKey => service.fetchWithCache(apiKey)));
        
        // Update cache size after syncing
        const newSize = await getCacheSize();
        setCacheSize(newSize);
      }
      
      setCleared(true);
      toast.success('Cache cleared and re-synced successfully', { id: 'cache-clear' });
      setTimeout(() => setCleared(false), 3000);
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to clear and sync cache: ${e.message || 'Unknown error'}`, { id: 'err-cache-clear' });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Development & Testing</h3>
        
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-white font-medium">Use Mock Data</h4>
            <p className="text-[#8E9299] text-sm mt-1">
              Enable this option to test the interface with dummy data (mock) instead of real API connections. 
              When active, no real data will be fetched, and your real balances and positions will be hidden. 
              Useful for UI testing and layout visualization.
            </p>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={useMockData}
              onChange={(e) => {
                setUseMockData(e.target.checked);
                toast.success(`Mock Data ${e.target.checked ? 'Enabled' : 'Disabled'}`, { id: 'mock-toggle' });
              }}
            />
            <div className="w-11 h-6 bg-[#2a2b30] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00C853]"></div>
          </label>
        </div>
      </div>

      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          History Cache Management
        </h3>
        
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 border-b border-[#2a2b30] pb-6">
            <div>
              <div className="flex justify-between mb-1">
                <h4 className="text-white font-medium">Background Update Interval</h4>
                <span className="text-[#00C853] font-mono text-sm">{historyCacheInterval}m</span>
              </div>
              <p className="text-[#8E9299] text-sm mt-1 mb-4">
                To guarantee lightning-fast data loading when you navigate to Analytics or Closed Positions, 
                we keep historical PnL sync running periodically in the background. Adjust the update period between 5 and 60 minutes.
              </p>
            </div>
            
            <input 
              type="range" 
              min="5" 
              max="60" 
              step="5"
              value={historyCacheInterval}
              onChange={(e) => setHistoryCacheInterval(Number(e.target.value))}
              onPointerUp={(e) => toast.success(`Background Update Interval set to ${historyCacheInterval}m\n(Effective next background run)`, { id: 'cache-interval' })}
              className="w-full h-2 bg-[#2a2b30] rounded-lg appearance-none cursor-pointer accent-[#00C853]"
            />
            <div className="flex justify-between text-xs text-[#8E9299] font-mono mb-2">
              <span>5m</span>
              <span>60m</span>
            </div>
            
            <button
              onClick={handleForceSync}
              disabled={isSyncing || synced || isClearing || keys.length === 0}
              className="self-start flex items-center gap-2 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> : synced ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <RefreshCw className="w-4 h-4 text-blue-400" />}
              {isSyncing ? 'Syncing Now...' : synced ? 'Synced!' : 'Force Sync Now'}
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 pt-2">
            <div className="w-full">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-white font-medium">Clear Local Cache</h4>
                {cacheSize !== null && (
                  <div className="flex items-center gap-2 bg-[#2a2b30]/50 px-2.5 py-1 rounded-md border border-[#2a2b30]">
                    <span className="text-[#8E9299] text-xs">Stored records:</span>
                    <span className="text-blue-400 font-mono text-sm font-medium">{cacheSize}</span>
                  </div>
                )}
              </div>
              <p className="text-[#8E9299] text-sm mb-4">
                Experiencing inconsistencies like missing or redundant trades? Clearing the local cache forces a fresh download of your entire positional history directly from the exchange.
              </p>
              <button
                onClick={handleClearCache}
                disabled={isClearing || cleared || isSyncing}
                className="flex items-center gap-2 bg-[#2a2b30] hover:bg-[#323339] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isClearing ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> : cleared ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Trash2 className="w-4 h-4 text-red-400" />}
                {isClearing ? 'Clearing & Re-syncing...' : cleared ? 'Cache Cleared!' : 'Clear Cache Now'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Exchange Specifications</h3>
        
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex justify-between mb-1">
              <h4 className="text-white font-medium">Bybit Refresh Interval</h4>
              <span className="text-[#00C853] font-mono text-sm">{bybitPollingInterval}s</span>
            </div>
            <p className="text-[#8E9299] text-sm mt-1 mb-4">
              Bybit's private WebSocket only pushes data upon order execution or balance changes. 
              To ensure Mark Price, PnL, and Balances update smoothly when the market moves without transactions, 
              we poll the REST API in the background. Choose the refresh rate (1 to 15 seconds). 
              Lower values provide faster updates but increase network consumption.
            </p>
          </div>
          
          <input 
            type="range" 
            min="1" 
            max="15" 
            value={bybitPollingInterval}
            onChange={(e) => setBybitPollingInterval(Number(e.target.value))}
            onPointerUp={(e) => toast.success(`Bybit Refresh Interval set to ${bybitPollingInterval}s`, { id: 'bybit-interval' })}
            className="w-full h-2 bg-[#2a2b30] rounded-lg appearance-none cursor-pointer accent-[#00C853]"
          />
          <div className="flex justify-between text-xs text-[#8E9299] font-mono">
            <span>1s</span>
            <span>15s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
