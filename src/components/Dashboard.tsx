import React, { useMemo } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { DollarSign, Wallet } from 'lucide-react';

export function Dashboard() {
  const { balances, statuses } = useDashboardStore();
  const keys = useApiKeysStore(state => state.keys);

  const balancesList = Object.values(balances);

  const totalEquity = useMemo(() => {
    return balancesList.reduce((acc, curr) => acc + (curr.usdValue || 0), 0);
  }, [balancesList]);

  const filteredBalances = useMemo(() => {
    // filter sizes < $1
    return balancesList.filter(b => (b.usdValue || 0) >= 1).sort((a, b) => b.usdValue - a.usdValue);
  }, [balancesList]);

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

      {/* Connection Status */}
      <div className="flex flex-wrap gap-4">
        {keys.filter(k => k.isActive).map(k => {
           const status = statuses[k.id] || 'disconnected';
           return (
             <div key={k.id} className="flex items-center gap-2 bg-[#151619] border border-[#2a2b30] px-4 py-2 rounded-lg">
               <div className={`w-2 h-2 rounded-full ${
                  status === 'connected' ? 'bg-[#00C853]' : 
                  status === 'connecting' ? 'bg-[#F2C94C] animate-pulse' : 
                  status === 'error' ? 'bg-[#FF4444]' : 'bg-[#8E9299]'
                }`} />
                <span className="text-sm font-medium text-white">{k.label}</span>
                <span className="text-xs text-[#8E9299] uppercase ml-1 opacity-70">({k.exchange})</span>
             </div>
           )
        })}
        {keys.filter(k => k.isActive).length === 0 && (
          <div className="text-sm text-[#8E9299] italic">Nenhuma API ativa.</div>
        )}
      </div>

      {/* Wallets Table */}
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2b30] flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#8E9299]" />
          <h3 className="text-lg font-medium text-white">Balances</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1b1e] border-b border-[#2a2b30]">
                <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right">Value (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2b30]">
              {filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#8E9299] text-sm">
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
                      <span className="text-sm font-medium text-white mr-2">{b.label}</span>
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
