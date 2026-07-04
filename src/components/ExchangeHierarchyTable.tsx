import React, { useState } from 'react';
import { Search, X, Eye, EyeOff, ChevronDown, ChevronRight, Wallet } from 'lucide-react';
import { BalanceItem } from '../store/balancesStore';
import { CoinIcon } from './ui/CoinIcon';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { Sparkline } from './ui/Sparkline';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cleanAccountLabel = (label: string) => {
  return label.replace(/\s*\(.*\)$/, '');
};

const getAssetOrigin = (b: BalanceItem) => {
  const ex = b.exchange.toLowerCase();

  if (ex === 'okx' || ex === 'bybit') {
    return 'UNIFIED';
  }

  // Bitget logic
  const connId = b.connectionId;
  const prefix = connId + '-';
  if (b.id.startsWith(prefix)) {
    const after = b.id.substring(prefix.length);
    const lastDash = after.lastIndexOf('-');
    if (lastDash !== -1) {
      return after.substring(0, lastDash);
    }
  }
  if (b.id.startsWith('bal-')) {
    const numId = parseInt(b.id.replace('bal-', ''), 10);
    const mockTypes = ['SPOT', 'COIN-FUTURES', 'USDT-FUTURES', 'EARN', 'SPOT', 'COIN-FUTURES', 'EARN'];
    return mockTypes[numId % mockTypes.length];
  }
  return null;
};

const formatOriginLabel = (origin: string) => {
  switch (origin.toUpperCase()) {
    case 'SPOT':
      return 'Spot';
    case 'EARN':
      return 'Earn';
    case 'UNIFIED':
      return 'Unified';
    case 'MARGIN_CROSS':
      return 'Margin Cross';
    case 'MARGIN_ISOLATED':
      return 'Margin Isolated';
    case 'USDT-FUTURES':
      return 'USDT Futures';
    case 'COIN-FUTURES':
      return 'COIN Futures';
    case 'USDC-FUTURES':
      return 'USDC Futures';
    default:
      return origin.replace('_', ' ').replace('-', ' ');
  }
};

const getOriginBadgeStyle = (origin: string) => {
  switch (origin.toUpperCase()) {
    case 'SPOT':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'EARN':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'USDT-FUTURES':
    case 'COIN-FUTURES':
      return 'bg-[#03aac7]/10 text-[#03aac7] border border-[#03aac7]/20';
    case 'USDC-FUTURES':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case 'MARGIN_CROSS':
    case 'UNIFIED':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'MARGIN_ISOLATED':
      return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    default:
      return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
  }
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExchangeHierarchyData {
  total: number;
  accounts: Record<string, { label: string; total: number; balances: BalanceItem[] }>;
}

type FormatCurrencyFn = (value: any, type: 'usd' | 'crypto', decimals?: number) => string;

export interface ExchangeHierarchyTableProps {
  hierarchy: Record<string, ExchangeHierarchyData>;
  formatCurrency: FormatCurrencyFn;
  filterText: string;
  setFilterText: (text: string) => void;
  hideSmallBalances: boolean;
  setHideSmallBalances: (hide: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExchangeHierarchyTable({
  hierarchy,
  formatCurrency,
  filterText,
  setFilterText,
  hideSmallBalances,
  setHideSmallBalances,
}: ExchangeHierarchyTableProps) {
  const [expandedExchanges, setExpandedExchanges] = useState<Record<string, boolean>>({});
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  const toggleExchange = (exchange: string) => {
    setExpandedExchanges(prev => ({ ...prev, [exchange]: !(prev[exchange] ?? false) }));
  };

  const toggleAccount = (connId: string) => {
    setExpandedAccounts(prev => ({ ...prev, [connId]: !(prev[connId] ?? false) }));
  };

  const expandAll = () => {
    const ex: Record<string, boolean> = {};
    const ac: Record<string, boolean> = {};
    Object.keys(hierarchy).forEach(ek => {
      ex[ek] = true;
      Object.keys(hierarchy[ek].accounts).forEach(ak => {
        ac[ak] = true;
      });
    });
    setExpandedExchanges(ex);
    setExpandedAccounts(ac);
  };

  const collapseAll = () => {
    const ex: Record<string, boolean> = {};
    const ac: Record<string, boolean> = {};
    Object.keys(hierarchy).forEach(ek => {
      ex[ek] = false;
      Object.keys(hierarchy[ek].accounts).forEach(ak => {
        ac[ak] = false;
      });
    });
    setExpandedExchanges(ex);
    setExpandedAccounts(ac);
  };

  const hierarchyEntries = Object.entries(hierarchy) as [string, ExchangeHierarchyData][];

  const cards = hierarchyEntries.map(([exchange, exData]) => {
    const totalExchangeValue = exData.total;
    const isExExpanded = expandedExchanges[exchange] ?? false;

    return (
      <div key={exchange} data-theme={exchange.toLowerCase().trim()} className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg overflow-hidden flex flex-col w-full">
        {/* Exchange Header */}
        <button
          onClick={() => toggleExchange(exchange)}
          className="w-full flex items-center justify-between p-4 bg-[#1a1b1e] hover:bg-[#2a2b30]/30 transition-colors border-b border-[#2a2b30] group"
        >
          <div className="flex items-center gap-3">
            <ExchangeIcon exchange={exchange} className="w-8 h-8 rounded-md bg-[#2a2b30] p-1" />
            <div className="text-left">
              <h4 className="text-base font-bold text-brand-normal capitalize">{exchange}</h4>
              <div className="text-xs text-[#8E9299] font-medium tracking-wide">
                Total Balance: <span className="font-mono text-white">{formatCurrency(totalExchangeValue, 'usd')}</span>
              </div>
            </div>
          </div>
          <div className="text-[#8E9299] group-hover:text-white transition-colors">
            {isExExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
        </button>

        {/* Accounts List */}
        {isExExpanded && (
          <div className="flex-1 overflow-hidden flex flex-col bg-[#111216]">
            {Object.entries(exData.accounts).map(([connId, accData]) => {
              const isAccExpanded = expandedAccounts[connId] ?? false;

              // Deterministic fake sparkline based on account total
              const hash = (accData.total * 13) % 100;
              const isPositive = hash > 50;
              const sparkData = [
                hash,
                (hash * 1.5) % 100,
                (hash * 0.8) % 100,
                (hash * 1.2) % 100,
                isPositive ? hash + 20 : Math.max(10, hash - 20),
              ];

              return (
                <div key={connId} className="border-b border-[#2a2b30] last:border-0">
                  <button
                    onClick={() => toggleAccount(connId)}
                    className="w-full flex items-center justify-between p-3 pl-4 bg-[#151619] hover:bg-[#2a2b30]/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-[#8E9299] group-hover:text-white transition-colors">
                        {isAccExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div className="hidden sm:block ml-4 pl-4 border-l border-[#2a2b30] opacity-70 group-hover:opacity-100 transition-opacity">
                        <Sparkline data={sparkData} color={isPositive ? 'emerald' : 'red'} width={60} height={20} />
                      </div>
                      <span className="text-sm font-medium text-gray-300 min-w-[120px] text-left">{cleanAccountLabel(accData.label)}</span>
                    </div>
                    <span className="text-sm font-bold text-white font-mono">{formatCurrency(accData.total, 'usd')}</span>
                  </button>

                  {/* Assets Table */}
                  {isAccExpanded && (
                    <div className="bg-[#111216]">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#111216]">
                          <tr>
                            <th className="px-4 py-2 text-[10px] font-medium text-[#8E9299] uppercase tracking-wider">Asset</th>
                            <th className="px-4 py-2 text-[10px] font-medium text-[#8E9299] uppercase tracking-wider text-right">Amount</th>
                            <th className="px-4 py-2 text-[10px] font-medium text-[#8E9299] uppercase tracking-wider text-right">Value (≈USD)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2a2b30]">
                          {accData.balances.map(b => {
                            const origin = getAssetOrigin(b);
                            const formattedOrigin = origin ? formatOriginLabel(origin) : null;
                            const badgeStyle = origin ? getOriginBadgeStyle(origin) : null;

                            return (
                              <tr key={b.id} className="hover:bg-[#1a1b1e] transition-colors">
                                <td className="px-4 py-2.5 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <CoinIcon symbol={b.ccy} size={20} className="w-5 h-5" />
                                    <span className="text-sm font-bold text-white leading-none mt-0.5 mr-1">{b.ccy}</span>
                                    {formattedOrigin && (
                                      <span className={`text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded border leading-none ${badgeStyle}`}>
                                        {formattedOrigin}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap text-xs text-white font-mono text-right">
                                  {formatCurrency(b.amount, 'crypto', 6)}
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap text-xs text-white font-mono text-right">
                                  {formatCurrency(b.usdValue, 'usd')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden p-4 md:p-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <h3 className="text-xl font-semibold text-white">Balances</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#8E9299]" />
            </div>
            <input
              type="text"
              placeholder="Search asset..."
              className="pl-9 pr-10 py-2 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors w-full"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8E9299] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setHideSmallBalances(!hideSmallBalances)}
            className="flex items-center gap-2 px-3 py-2 bg-[#1a1b1e] border border-[#2a2b30] hover:bg-[#2a2b30]/50 rounded-lg text-sm text-[#8E9299] hover:text-white transition-colors"
          >
            {hideSmallBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">Hide &lt; $1</span>
          </button>

          <div className="flex items-center gap-2 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg p-1">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-sm text-[#8E9299] hover:text-white hover:bg-[#2a2b30] rounded-md transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-sm text-[#8E9299] hover:text-white hover:bg-[#2a2b30] rounded-md transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {hierarchyEntries.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center bg-[#1a1b1e] rounded-lg border border-[#2a2b30] border-dashed">
          <Wallet className="h-10 w-10 text-[#2a2b30] mb-3" />
          <p className="text-[#8E9299] font-medium">No balances found</p>
          <p className="text-[#8E9299]/60 text-sm mt-1">Connect your accounts to view balances.</p>
        </div>
      ) : (
        <div className="w-full">
          {/* Mobile (1 col) */}
          <div className="flex xl:hidden flex-col gap-6">
            {cards.filter((_, i) => i % 1 === 0)}
          </div>
          {/* XL (2 cols) */}
          <div className="hidden xl:flex 2xl:hidden gap-6 items-start">
            <div className="flex-1 flex flex-col gap-6">
              {cards.filter((_, i) => i % 2 === 0)}
            </div>
            <div className="flex-1 flex flex-col gap-6">
              {cards.filter((_, i) => i % 2 === 1)}
            </div>
          </div>
          {/* 2XL (3 cols) */}
          <div className="hidden 2xl:flex gap-6 items-start">
            <div className="flex-1 flex flex-col gap-6">
              {cards.filter((_, i) => i % 3 === 0)}
            </div>
            <div className="flex-1 flex flex-col gap-6">
              {cards.filter((_, i) => i % 3 === 1)}
            </div>
            <div className="flex-1 flex flex-col gap-6">
              {cards.filter((_, i) => i % 3 === 2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
