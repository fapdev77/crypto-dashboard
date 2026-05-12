import React from 'react';
import { useSettingsStore } from '../store/settingsStore';

export function Settings() {
  const { useMockData, setUseMockData } = useSettingsStore();

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
              onChange={(e) => setUseMockData(e.target.checked)}
            />
            <div className="w-11 h-6 bg-[#2a2b30] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00C853]"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
