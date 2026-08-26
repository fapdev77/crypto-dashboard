import React, { useMemo, useState } from 'react';
import Big from 'big.js';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';
import { usePositionsStore } from '../store/positionsStore';
import { useSettingsStore } from '../store/settingsStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { usePrivacy } from '../context/PrivacyContext';
import { getInverseUsdValues } from '../utils/inverseUtils';
import { FilterBar } from './ui/FilterBar';
import { PositionCard } from './PositionCard';
import { usePagination } from '../hooks/usePagination';
import { Pagination } from './ui/Pagination';
import { SimulationModeBadge } from './ui/SimulationModeBadge';

export function OpenPositions() {
  const positions = usePositionsStore(state => state.positions);
  const useMockData = useSettingsStore(state => state.useMockData);
  const hedgeExposedMode = useSettingsStore(state => state.hedgeExposedMode);
  const setHedgeExposedMode = useSettingsStore(state => state.setHedgeExposedMode);
  const keys = useApiKeysStore(state => state.keys);
  const formatCurrency = useFormatCurrency();
  const { isPrivateMode } = usePrivacy();

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [filterText, setFilterText] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('All');

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const positionsList = Object.values(positions);
  const activeKeyIds = useMemo(() => new Set(keys.filter(k => k.isActive).map(k => k.id)), [keys]);

  const activePositions = useMemo(() => {
    if (!useMockData && activeKeyIds.size === 0) {
      return [];
    }

    // First, filter by mock or active API connection
    let filtered = useMockData
      ? positionsList.filter(pos => pos.connectionId.startsWith('mocked-data'))
      : positionsList.filter(pos => !pos.connectionId.startsWith('mocked-data') && activeKeyIds.has(pos.connectionId));

    // Then, apply size filter
    filtered = filtered.filter(pos => Math.abs(pos.size) > 0);

    if (exchangeFilter.toLowerCase() !== 'all') {
      filtered = filtered.filter(pos => pos.exchange.toLowerCase() === exchangeFilter.toLowerCase());
    }

    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filtered = filtered.filter(pos =>
        pos.symbol.toLowerCase().includes(lowerFilter) ||
        pos.label.toLowerCase().includes(lowerFilter) ||
        pos.exchange.toLowerCase().includes(lowerFilter)
      );
    }

    return filtered.sort((a, b) => a.id.localeCompare(b.id));
  }, [positionsList, filterText, exchangeFilter, useMockData, activeKeyIds]);

  const { longs, shorts } = useMemo(() => {
    let longsCount = 0;
    let shortsCount = 0;
    activePositions.forEach(pos => {
      const isLong = pos.side === 'long';
      const isShort = pos.side === 'short';
      if (isLong) longsCount++;
      if (isShort) shortsCount++;
      if (pos.side === 'net') {
        if (pos.size > 0) longsCount++;
        else if (pos.size < 0) shortsCount++;
      }
    });
    return { longs: longsCount, shorts: shortsCount };
  }, [activePositions]);

  const { totalUnrealizedPnl, totalRealizedPnl } = useMemo(() => {
    let uPnl = new Big(0);
    let rPnl = new Big(0);
    activePositions.forEach(pos => {
      const { unrealizedPnl, realizedPnl } = getInverseUsdValues(pos);

      const uVal = new Big(unrealizedPnl || 0);
      const rVal = new Big(realizedPnl || 0);

      uPnl = uPnl.plus(uVal);
      rPnl = rPnl.plus(rVal);
    });
    return { totalUnrealizedPnl: Number(uPnl), totalRealizedPnl: Number(rPnl) };
  }, [activePositions]);

  const { page: currentPage, setPage: setCurrentPage, paginated: paginatedPositions, totalItems } = usePagination(
    activePositions,
    50,
    [filterText, exchangeFilter, useMockData, keys]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-[#2F6BFF]" />
              Open Positions
            </h2>
            <SimulationModeBadge />
          </div>
        </div>
      </div>

      {/* Header Controls */}
      <FilterBar
        prepend={
          <div className="flex items-center gap-2 mr-auto sm:mr-0">
            <span className="text-xs text-[#8E9299] whitespace-nowrap">Show exposed balance by:</span>
            <div className="flex bg-[#0e0f11] p-1 rounded-lg border border-[#2a2b30] w-max">
              <button
                type="button"
                onClick={() => setHedgeExposedMode('gross')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  hedgeExposedMode === 'gross'
                    ? 'bg-[#2a2b30] text-white shadow-sm font-semibold'
                    : 'text-[#8E9299] hover:text-white'
                }`}
                title="Gross: Uses fixed Wallet Balance (without unrealized PnL)"
              >
                Gross
              </button>
              <button
                type="button"
                onClick={() => setHedgeExposedMode('net')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  hedgeExposedMode === 'net'
                    ? 'bg-[#2a2b30] text-white shadow-sm font-semibold'
                    : 'text-[#8E9299] hover:text-white'
                }`}
                title="Net: Uses Net Balance / Account Equity (including unrealized PnL)"
              >
                Net
              </button>
            </div>
          </div>
        }
        exchange={{
          value: exchangeFilter,
          onChange: setExchangeFilter,
          labelAll: 'All Exchanges',
        }}
        search={{
          value: filterText,
          onChange: setFilterText,
          placeholder: 'Search...',
        }}
      />

      {activePositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl">
          <p className="text-[#8E9299]">No open positions found.</p>
        </div>
      ) : (
        <>
          {(() => {
            const POSITIONS_DONUT = [
              { name: 'Long', value: longs, color: '#00C853' },
              { name: 'Short', value: shorts, color: '#FF4444' }
            ];
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
                  <div className='flex flex-col'>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-[#8E9299]">Total Positions: </span>
                      <span className="text-xl font-medium text-white">{activePositions.length}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-medium text-white"></span>
                      {activePositions.length > 0 && (
                        <div className="flex text-xl gap-2 font-mono">
                          <span className="text-[#00C853]">{longs} Longs ({((longs / activePositions.length) * 100).toFixed(0)}%)</span>
                          <span className="text-[#00C853]"> | </span>
                          <span className="text-[#FF4444]">{shorts} Shorts ({((shorts / activePositions.length) * 100).toFixed(0)}%)</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-24 h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#161b22', border: '1px solid #2a2b30', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Pie data={POSITIONS_DONUT} cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" dataKey="value" stroke="none">
                          {POSITIONS_DONUT.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
                  <span className="text-2xl text-[#8E9299] mb-1">Unrealized PnL</span>
                  <span className={`text-xl font-medium ${totalUnrealizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                    {isPrivateMode ? '$••••' : `${totalUnrealizedPnl >= 0 ? '+' : ''}${formatCurrency(totalUnrealizedPnl, 'usd')}`}
                  </span>
                </div>

                <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
                  <span className="text-2xl text-[#8E9299] mb-1">Realized PnL</span>
                  <span className={`text-xl font-medium ${totalRealizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                    {isPrivateMode ? '$••••' : `${totalRealizedPnl >= 0 ? '+' : ''}${formatCurrency(totalRealizedPnl, 'usd')}`}
                  </span>
                </div>
              </div>
            );
          })()}

          {totalItems > 5 && (
            <div className="mb-2 mt-4">
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={50}
                onPageChange={setCurrentPage}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 mt-4">
            {paginatedPositions.map((pos) => (
              <PositionCard
                key={pos.id}
                pos={pos}
                isExpanded={!!expandedRows[pos.id]}
                onToggle={() => toggleRow(pos.id)}
              />
            ))}
          </div>

          {totalItems > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={50}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
