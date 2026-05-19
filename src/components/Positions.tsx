import React, { useMemo, useState } from 'react';
import { Activity, History, Search, X } from 'lucide-react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';
import { format } from 'date-fns';
import { OpenPositions } from './OpenPositions';
import { ClosedPositions } from './ClosedPositions';
import { ExchangeIcon } from './ui/ExchangeIcon';

export function Positions() {
  const keys = useApiKeysStore(state => state.keys);
  const { positions } = useDashboardStore();
  const useMockData = useSettingsStore(state => state.useMockData);
  
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [filterText, setFilterText] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');
  const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);
  
  const [period, setPeriod] = useState<'1w' | '2w' | '1m' | 'custom'>('1w');
  const [customStartDate, setCustomStartDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [triggerSearch, setTriggerSearch] = useState(false);

  const openCount = useMemo(() => {
    const list = Object.values(positions);
    return list.filter(p => 
      (useMockData ? p.connectionId.startsWith('mocked-data') : !p.connectionId.startsWith('mocked-data')) && Math.abs(p.size) > 0
    ).length;
  }, [positions, useMockData]);

  const handleCustomDateSearch = () => {
    setTriggerSearch(!triggerSearch);
  };

  return (
    <div className="space-y-6">
      
      {/* Tabs and Search */}
      <div className="flex flex-col xl:flex-row justify-between gap-4 xl:items-center">
        <div className="flex bg-[#151619] p-1 rounded-lg border border-[#2a2b30] w-max">
          <button
            onClick={() => setActiveTab('open')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'open' ? 'bg-[#2a2b30] text-white' : 'text-[#8E9299] hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            Abertas
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'closed' ? 'bg-[#2a2b30] text-white' : 'text-[#8E9299] hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Histórico
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Exchange Filter - For Both Tabs */}
          <div className="relative z-20">
            <button
              type="button"
              onClick={() => setIsExchangeDropdownOpen(!isExchangeDropdownOpen)}
              className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between min-w-[160px]"
            >
              <div className="flex items-center gap-2">
                {exchangeFilter !== 'all' && (
                  <ExchangeIcon exchange={exchangeFilter} className="w-4 h-4" />
                )}
                <span>
                  {exchangeFilter === 'all' 
                    ? 'Todas Exchanges' 
                    : exchangeFilter.charAt(0).toUpperCase() + exchangeFilter.slice(1)}
                </span>
              </div>
              <svg className={`h-4 w-4 ml-2 text-gray-400 transition-transform ${isExchangeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExchangeDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsExchangeDropdownOpen(false)}
                />
                <div className="absolute z-20 w-full mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setExchangeFilter('all');
                      setIsExchangeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                      exchangeFilter === 'all' ? 'bg-[#2F6BFF] text-white' : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                    }`}
                  >
                    <span>Todas Exchanges</span>
                  </button>
                  {Array.from(new Set(keys.filter(k => k.isActive).map(k => k.exchange))).map(ext => (
                    <button
                      key={ext}
                      type="button"
                      onClick={() => {
                        setExchangeFilter(ext);
                        setIsExchangeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                        exchangeFilter === ext ? 'bg-[#2F6BFF] text-white' : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                      }`}
                    >
                      <ExchangeIcon exchange={ext} className="w-4 h-4" />
                      <span>{ext.charAt(0).toUpperCase() + ext.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {activeTab === 'closed' && (
            <>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors"
              >
                <option value="1w">1 Sem</option>
                <option value="2w">2 Sem</option>
                <option value="1m">1 Mês</option>
                <option value="custom">Personalizado</option>
              </select>
              
              {period === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-[#8E9299] focus:outline-none focus:border-[#2F6BFF]"
                  />
                  <span className="text-[#8E9299]">até</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-[#8E9299] focus:outline-none focus:border-[#2F6BFF]"
                  />
                  <button
                    onClick={handleCustomDateSearch}
                    className="bg-[#2a2b30] hover:bg-[#323339] text-white p-2 rounded-lg transition-colors border border-[#2a2b30] focus:outline-none focus:border-[#2F6BFF]"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#8E9299]" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-10 py-2 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors w-full sm:w-64"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            {filterText && (
              <button 
                onClick={() => setFilterText('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8E9299] hover:text-white transition-colors"
                title="Clear filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'open' ? (
        <OpenPositions filterText={filterText} exchangeFilter={exchangeFilter} />
      ) : (
        <ClosedPositions 
          filterText={filterText} 
          exchangeFilter={exchangeFilter} 
          period={period}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomDateSearch={handleCustomDateSearch}
          triggerSearch={triggerSearch}
        />
      )}
    </div>
  );
}
