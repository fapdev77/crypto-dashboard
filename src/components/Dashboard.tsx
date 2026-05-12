import React, { useMemo, useState } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { DollarSign, Wallet, ArrowUpDown, Search, X } from 'lucide-react';

export function Dashboard() {
  const { balances } = useDashboardStore();
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'usdValue', direction: 'desc' });
  const [filterText, setFilterText] = useState('');

  const balancesList = Object.values(balances);

  const activeBalances = useMemo(() => {
    return useMockData 
      ? balancesList.filter(b => b.connectionId === 'mock')
      : balancesList.filter(b => b.connectionId !== 'mock');
  }, [balancesList, useMockData]);

  const totalEquity = useMemo(() => {
    return activeBalances.reduce((acc, curr) => acc + (curr.usdValue || 0), 0);
  }, [activeBalances]);

  const filteredBalances = useMemo(() => {
    // filter sizes < $1 and apply search
    let filtered = activeBalances.filter(b => (b.usdValue || 0) >= 1);
    
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filtered = filtered.filter(b => 
        b.ccy.toLowerCase().includes(lowerFilter) || 
        b.label.toLowerCase().includes(lowerFilter) ||
        b.exchange.toLowerCase().includes(lowerFilter)
      );
    }

    if (sortConfig !== null) {
      filtered.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [activeBalances, sortConfig, filterText]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#151619] border border-[#2a2b30] p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[#8E9299] text-sm font-medium mb-1 uppercase tracking-wider">Total Est. Equity (USD)</p>
            <p className="text-3xl font-semibold text-white font-mono flex items-center gap-1">
              <span className="text-[#2F6BFF]">$</span>
              {totalEquity.toFixed(2)}
            </p>
          </div>
          <div className="w-12 h-12 bg-[#2a2b30]/50 rounded-full flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-[#2F6BFF]" />
          </div>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2b30] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#8E9299]" />
            <h3 className="text-lg font-medium text-white">Balances</h3>
          </div>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1b1e] border-b border-[#2a2b30]">
                <th 
                  className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-pointer hover:bg-[#2a2b30]/50 group"
                  onClick={() => requestSort('ccy')}
                >
                  <div className="flex items-center gap-1">
                    Asset <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-pointer hover:bg-[#2a2b30]/50 group"
                  onClick={() => requestSort('label')}
                >
                  <div className="flex items-center gap-1">
                    Account <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-pointer hover:bg-[#2a2b30]/50 group"
                  onClick={() => requestSort('exchange')}
                >
                  <div className="flex items-center gap-1">
                    Exchange <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right cursor-pointer hover:bg-[#2a2b30]/50 group"
                  onClick={() => requestSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /> Amount
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right cursor-pointer hover:bg-[#2a2b30]/50 group"
                  onClick={() => requestSort('usdValue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /> Value (USD)
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2b30]">
              {filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#8E9299] text-sm">
                    No relevant balances found (or not connected).
                  </td>
                </tr>
              ) : (
                filteredBalances.map((b) => (
                  <tr key={b.id} className="hover:bg-[#2a2b30]/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#2a2b30] flex items-center justify-center text-xs font-medium text-white">
                          {b.ccy.substring(0, 1)}
                        </div>
                        <span className="text-sm font-bold text-white">{b.ccy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">{b.label}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-medium text-[#8E9299] bg-[#1a1b1e] border border-[#2a2b30] px-2 py-1 rounded capitalize">
                        {b.exchange}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono text-right">
                      {b.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono text-right">
                      ${b.usdValue.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

