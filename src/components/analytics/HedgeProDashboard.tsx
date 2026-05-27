import React, { useState, useMemo } from 'react';
import Big from 'big.js';
import { useDashboardStore } from '../../store/dashboardStore';
import { usePositionHistory } from '../../hooks/usePositionHistory';
import { UnifiedBalance, UnifiedPosition, UnifiedHistoryPosition } from '../../types';
import { TrendingUp, ShieldAlert, Coins, ChevronDown, ChevronRight, Activity, Wallet, PieChart, Shield, Calculator, History } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export function HedgeProDashboard() {
  const { positions, balances } = useDashboardStore();
  const { positions: history } = usePositionHistory('1m', '', '', true); // 30 days history

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Filter inverse positions
  const inversePositions = useMemo(() => {
    return Object.values(positions).filter(pos => {
      const type = (pos.instrumentType || '').toUpperCase();
      if (type === 'INVERSE' || type === 'COIN-FUTURES') return true;
      // OKX fallback for inverse: not USDT/USDC settled, not spot
      if (pos.exchange === 'okx' && type !== 'SPOT' && pos.ccy && !['USDT', 'USDC'].includes(pos.ccy.toUpperCase())) return true;
      return false;
    });
  }, [positions]);

  // Aggregate by Exchange -> Account -> Asset
  // Example: tree[exchange][connectionId][ccy]
  const tree = useMemo(() => {
    const root: Record<string, Record<string, Record<string, {
      balances: UnifiedBalance[];
      positions: UnifiedPosition[];
    }>>> = {};

    inversePositions.forEach(pos => {
      const ex = pos.exchange;
      const cid = pos.connectionId;
      const ccy = (pos.ccy || pos.symbol.split('-')[0]).toUpperCase();

      if (!root[ex]) root[ex] = {};
      if (!root[ex][cid]) root[ex][cid] = {};
      if (!root[ex][cid][ccy]) root[ex][cid][ccy] = { balances: [], positions: [] };

      root[ex][cid][ccy].positions.push(pos);
    });

    // Also bring in balances that have matching ccy (collaterals)
    Object.values(balances).forEach(bal => {
      const ex = bal.exchange;
      const cid = bal.connectionId;
      const ccy = (bal.ccy || '').toUpperCase();

      if (root[ex]?.[cid]?.[ccy]) {
        root[ex][cid][ccy].balances.push(bal as UnifiedBalance);
      }
    });

    return root;
  }, [inversePositions, balances]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-gray-900 dark:text-white">
            Hedge Pro 
          </h1>
          <p className="text-sm font-mono text-gray-500">
            Coin-Margined / Inverse Derivatives Analytics
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.keys(tree).length === 0 && (
          <div className="p-8 text-center text-gray-400 font-mono text-sm border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            No active inverse or coin-margined positions detected.
          </div>
        )}
        
        {Object.entries(tree).map(([exchange, accounts]) => (
          <ExchangeNode 
            key={exchange} 
            exchange={exchange} 
            accounts={accounts} 
            expanded={!!expandedNodes[`ex-${exchange}`]}
            onToggle={() => toggleNode(`ex-${exchange}`)}
            history={history}
            expandedNodes={expandedNodes}
            toggleNode={toggleNode}
          />
        ))}
      </div>
    </div>
  );
}

function ExchangeNode({ exchange, accounts, expanded, onToggle, history, expandedNodes, toggleNode }: any) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden transition-all duration-300">
      <div 
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3">
          {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          <h2 className="text-lg font-medium text-gray-900 dark:text-white capitalize tracking-tight">
            {exchange}
          </h2>
        </div>
      </div>
      
      {expanded && (
        <div className="px-6 pb-6 pt-2 space-y-4 border-t border-gray-100 dark:border-gray-800">
          {Object.entries(accounts).map(([connectionId, assets]: any) => (
            <AccountNode 
              key={connectionId} 
              connectionId={connectionId} 
              assets={assets} 
              expanded={!!expandedNodes[`acc-${connectionId}`]}
              onToggle={() => toggleNode(`acc-${connectionId}`)}
              history={history}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountNode({ connectionId, assets, expanded, onToggle, history }: any) {
  // We can derive label from the first position
  const firstAsset = Object.values(assets)[0] as any;
  const label = firstAsset?.positions?.[0]?.label || connectionId.substring(0, 8);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/50">
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          <h3 className="font-mono text-sm text-gray-700 dark:text-gray-300">Account: {label}</h3>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-6">
          {Object.entries(assets).map(([ccy, data]: any) => (
            <AssetNode 
              key={ccy} 
              ccy={ccy} 
              balances={data.balances} 
              positions={data.positions} 
              history={history}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetNode({ ccy, balances, positions, history }: any) {
  // Aggregate balance
  const walletBal = balances.reduce((sum: Big, b: UnifiedBalance) => sum.plus(new Big(b.walletBalance || b.amount || 0)), new Big(0));
  const usdValue = balances.reduce((sum: Big, b: UnifiedBalance) => sum.plus(new Big(b.usdValue || 0)), new Big(0));
  const availableMargin = balances.reduce((sum: Big, b: UnifiedBalance) => sum.plus(new Big(b.availableMargin || 0)), new Big(0));
  const unrealizedPnl = balances.reduce((sum: Big, b: UnifiedBalance) => sum.plus(new Big(b.unrealizedPnl || 0)), new Big(0));
  const marginBalance = walletBal.plus(unrealizedPnl); // typical logic: margin balance = wallet balance + unrealized pnl
  const positionMargin = marginBalance.minus(availableMargin); // typical logic: isolated/cross used margin

  
  // Calculate mark price generically from positions if available, or deduce from usdValue
  let currentPrice = new Big(0);
  if (positions.length > 0 && positions[0].markPrice) {
    currentPrice = new Big(positions[0].markPrice);
  } else if (!walletBal.eq(0)) {
    currentPrice = usdValue.div(walletBal);
  }

  // Hedge consolidation check
  const symbols = Array.from(new Set(positions.map((p: UnifiedPosition) => p.symbol)));

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center space-x-2">
          <Coins className="w-5 h-5 text-blue-500" />
          <span>{ccy} Context</span>
        </h4>
        <div className="text-sm font-mono text-gray-500">
          Ref Price: ${currentPrice.toFixed(2)}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard title="Wallet Balance" assetVal={walletBal} price={currentPrice} ccy={ccy} icon={<Wallet />} />
        <MetricCard title="Unrealized PnL" assetVal={unrealizedPnl} price={currentPrice} ccy={ccy} />
        <MetricCard title="Margin Balance" assetVal={marginBalance} price={currentPrice} ccy={ccy} />
        <MetricCard title="Position Margin" assetVal={positionMargin} price={currentPrice} ccy={ccy} />
        <MetricCard title="Available Margin" assetVal={availableMargin} price={currentPrice} ccy={ccy} />
      </div>

      <div className="space-y-6">
        {symbols.map(sym => {
          const symPositions = positions.filter((p: UnifiedPosition) => p.symbol === sym);
          const longs = symPositions.filter((p: UnifiedPosition) => p.side === 'long');
          const shorts = symPositions.filter((p: UnifiedPosition) => p.side === 'short');
          const isHedged = longs.length > 0 && shorts.length > 0;

          return (
            <div key={sym} className="space-y-4">
              <h5 className="font-mono text-sm text-gray-500">{sym} Positions</h5>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {symPositions.map((pos: UnifiedPosition) => (
                  <PositionCard key={pos.id} position={pos} ccy={ccy} />
                ))}
              </div>
              {isHedged && (
                <HedgeNetCard longs={longs} shorts={shorts} ccy={ccy} price={currentPrice} />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PerformanceSimulator currentBalance={walletBal} currentPrice={currentPrice} ccy={ccy} />
        <AssetPnLChart history={history} ccy={ccy} currentPrice={currentPrice} />
      </div>

      <div className="mt-8">
        <TradesAccordion history={history} symbols={symbols} ccy={ccy} />
      </div>
    </div>
  );
}

function MetricCard({ title, assetVal, price, ccy, icon }: any) {
  const usdVal = assetVal.times(price);
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
      <p className="text-xs font-mono text-gray-500 mb-2 flex items-center space-x-1">
        {icon && <span className="w-4 h-4 mr-1">{icon}</span>}
        {title}
      </p>
      <div className="flex flex-col">
        <span className="text-lg font-medium text-gray-900 dark:text-white">
          {assetVal.toFixed(8)} {ccy}
        </span>
        <span className="text-sm font-mono text-gray-500">
          ≈ ${usdVal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function PositionCard({ position, ccy }: any) {
  const size = new Big(position.size || 0);
  const upnl = new Big(position.unrealizedPnl || 0);
  const mark = new Big(position.markPrice || 0);
  const entry = new Big(position.entryPrice || 0);
  
  // Logic: 
  // Short = Protection / Delta Neutral
  // Long = Double Exposure
  const isShort = position.side === 'short';
  
  const upnlUsd = upnl.times(mark);
  const notionalUsd = size.times(mark); // Rough estimate for inverse if size is in contracts. Wait, size in UnifiedPosition should be normalized to base asset. If normalized to base asset, it's correct.
  
  return (
    <div className="flex flex-col p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${isShort ? 'bg-red-500' : 'bg-green-500'}`}></div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${isShort ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
            {position.side.toUpperCase()} {position.leverage}x
          </span>
          <h4 className="mt-2 text-lg font-medium tracking-tight dark:text-white">{position.symbol}</h4>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-gray-500">Unrealized PnL</p>
          <p className={`text-lg font-medium ${upnl.gte(0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {upnl.gte(0) ? '+' : ''}{upnl.toFixed(8)} {ccy}
          </p>
          <p className="text-xs font-mono text-gray-500">≈ ${upnlUsd.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div>
          <p className="text-xs font-mono text-gray-500">Size</p>
          <p className="text-sm font-medium dark:text-gray-300">{size.toFixed(8)} {ccy}</p>
        </div>
        <div>
          <p className="text-xs font-mono text-gray-500">Entry / Mark</p>
          <p className="text-sm font-mono dark:text-gray-300">${entry.toFixed(2)} / ${mark.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/50">
        <p className="text-xs font-medium text-blue-800 dark:text-blue-300 flex items-center mb-1">
          <ShieldAlert className="w-3 h-3 mr-1" />
          {isShort ? 'Delta Neutral Hedge' : 'Double Exposure'}
        </p>
        <p className="text-xs text-blue-700/80 dark:text-blue-400/80 font-mono">
          {isShort 
            ? `Locks ~${size.toFixed(4)} ${ccy} value at $${entry.toFixed(2)}. Protective PnL offsets collateral USD devaluation.`
            : `Gains/Losses compound on both ${ccy} price movement and position PnL.`}
        </p>
      </div>
    </div>
  );
}

function HedgeNetCard({ longs, shorts, ccy, price }: any) {
  const longSize = longs.reduce((sum: Big, p: UnifiedPosition) => sum.plus(new Big(p.size || 0)), new Big(0));
  const shortSize = shorts.reduce((sum: Big, p: UnifiedPosition) => sum.plus(new Big(p.size || 0)), new Big(0));
  const netSize = longSize.minus(shortSize);
  
  const longUpl = longs.reduce((sum: Big, p: UnifiedPosition) => sum.plus(new Big(p.unrealizedPnl || 0)), new Big(0));
  const shortUpl = shorts.reduce((sum: Big, p: UnifiedPosition) => sum.plus(new Big(p.unrealizedPnl || 0)), new Big(0));
  const netUpl = longUpl.plus(shortUpl);

  const isNetLong = netSize.gt(0);
  const isNeutral = netSize.eq(0);

  return (
    <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-indigo-500" />
        <h4 className="text-lg font-medium text-gray-900 dark:text-indigo-100">Consolidated Net Hedge</h4>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-mono text-indigo-800/60 dark:text-indigo-300/60">Net Exposure</p>
          <p className="text-lg font-medium text-indigo-900 dark:text-indigo-100">
            {isNeutral ? 'Neutral' : (isNetLong ? 'Long' : 'Short')}
          </p>
        </div>
        <div>
          <p className="text-xs font-mono text-indigo-800/60 dark:text-indigo-300/60">Net Size ({ccy})</p>
          <p className="text-lg font-mono text-indigo-900 dark:text-indigo-100">{netSize.abs().toFixed(8)}</p>
        </div>
        <div>
          <p className="text-xs font-mono text-indigo-800/60 dark:text-indigo-300/60">Net PnL</p>
          <p className={`text-lg font-mono ${netUpl.gte(0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {netUpl.gte(0) ? '+' : ''}{netUpl.toFixed(8)}
          </p>
        </div>
      </div>
    </div>
  );
}

function PerformanceSimulator({ currentBalance, currentPrice, ccy }: any) {
  const [initialAsset, setInitialAsset] = useState<string>('');
  const [initialUsdPrice, setInitialUsdPrice] = useState<string>('');

  const initAssetNum = parseFloat(initialAsset || '0');
  const initUsdPriceNum = parseFloat(initialUsdPrice || '0');

  const initialUsdValue = initAssetNum * initUsdPriceNum;
  const currentUsdValue = currentBalance.times(currentPrice).toNumber();
  const currentAssetNum = currentBalance.toNumber();

  const assetDiff = currentAssetNum - initAssetNum;
  const assetPct = initAssetNum > 0 ? (assetDiff / initAssetNum) * 100 : 0;

  const usdDiff = currentUsdValue - initialUsdValue;
  const usdPct = initialUsdValue > 0 ? (usdDiff / initialUsdValue) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <div className="flex items-center space-x-2 mb-4">
        <Calculator className="w-5 h-5 text-gray-400" />
        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Performance Simulator</h4>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-mono text-gray-500 mb-1">Initial Balance ({ccy})</label>
          <input 
            type="number"
            value={initialAsset}
            onChange={(e) => setInitialAsset(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-lg px-3 py-2 text-sm font-mono dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-gray-500 mb-1">Initial Avg Price ($)</label>
          <input 
            type="number"
            value={initialUsdPrice}
            onChange={(e) => setInitialUsdPrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-lg px-3 py-2 text-sm font-mono dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Total Asset Growth</span>
          <div className="text-right">
            <span className={`text-sm font-medium ${assetDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {assetDiff > 0 ? '+' : ''}{assetDiff.toFixed(8)} {ccy}
            </span>
            <span className="text-xs font-mono text-gray-400 ml-2">({assetPct > 0 ? '+' : ''}{assetPct.toFixed(2)}%)</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Total USD Yield (Hedge + Spot)</span>
          <div className="text-right">
            <span className={`text-sm font-medium ${usdDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {usdDiff > 0 ? '+$' : '-$'}{Math.abs(usdDiff).toFixed(2)}
            </span>
            <span className="text-xs font-mono text-gray-400 ml-2">({usdPct > 0 ? '+' : ''}{usdPct.toFixed(2)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetPnLChart({ history, ccy, currentPrice }: any) {
  // Filter history to this exact ccy
  const ccyHistory = history.filter((h: UnifiedHistoryPosition) => {
    const isBase = h.ccy?.toUpperCase() === ccy;
    const isSym = h.symbol.split('-')[0].toUpperCase() === ccy; // e.g. BTC-USD
    return isBase || isSym;
  }).reverse(); // chronological

  if (ccyHistory.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col items-center justify-center min-h-[250px]">
        <TrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-2" />
        <p className="text-sm font-mono text-gray-500">Not enough history for {ccy}</p>
      </div>
    );
  }

  let cumulativeAssetPnL = new Big(0);
  const data = ccyHistory.map((h: UnifiedHistoryPosition) => {
    cumulativeAssetPnL = cumulativeAssetPnL.plus(new Big(h.realizedPnl || 0));
    return {
      time: format(h.closeUpdateTime ? new Date(Math.floor(Number(h.closeUpdateTime))) : new Date(), 'MMM dd HH:mm'),
      pnl: cumulativeAssetPnL.toNumber(),
      usd: cumulativeAssetPnL.times(currentPrice).toNumber()
    };
  });

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
       <div className="flex items-center space-x-2 mb-6">
        <TrendingUp className="w-5 h-5 text-gray-400" />
        <h4 className="text-lg font-medium text-gray-900 dark:text-white">90-Day Evolution</h4>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} minTickGap={30} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={(v) => v.toFixed(4)} domain={['auto', 'auto']} width={60} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
              labelStyle={{ color: '#9CA3AF' }}
              formatter={(val: any, name: string) => [
                name === 'pnl' ? `${val.toFixed(8)} ${ccy}` : `$${val.toFixed(2)}`,
                name === 'pnl' ? 'Asset PnL' : 'Est. USD'
              ]}
            />
            <Line type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#3B82F6', stroke: '#fff' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TradesAccordion({ history, symbols, ccy }: any) {
  const [expanded, setExpanded] = useState(false);
  
  const relevantTrades = history.filter((h: UnifiedHistoryPosition) => symbols.includes(h.symbol));
  
  if (relevantTrades.length === 0) return null;

  const totalBuy = relevantTrades.filter((h: UnifiedHistoryPosition) => h.side === 'long').length;
  const totalSell = relevantTrades.filter((h: UnifiedHistoryPosition) => h.side === 'short').length;
  
  const netPnl = relevantTrades.reduce((sum: Big, h: UnifiedHistoryPosition) => sum.plus(new Big(h.realizedPnl || 0)), new Big(0));

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3">
          <History className="w-5 h-5 text-gray-400" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">Recent Settlements</h4>
        </div>
        <div className="flex items-center space-x-6">
          <div className="hidden md:flex items-center space-x-4 text-sm font-mono">
            <span className="text-green-600 dark:text-green-400">{totalBuy} Longs</span>
            <span className="text-red-600 dark:text-red-400">{totalSell} Shorts</span>
            <span className={`${netPnl.gte(0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Net PnL: {netPnl.gte(0) ? '+' : ''}{netPnl.toFixed(8)} {ccy}
            </span>
          </div>
          {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 font-mono text-xs">
                <tr>
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium">Symbol</th>
                  <th className="px-5 py-3 font-medium">Side</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium">Avg Entry</th>
                  <th className="px-5 py-3 font-medium">Avg Exit</th>
                  <th className="px-5 py-3 font-medium text-right">Realized PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {relevantTrades.slice(0, 30).map((t: UnifiedHistoryPosition) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/20">
                    <td className="px-5 py-4 font-mono text-gray-900 dark:text-gray-300">
                      {format(t.closeUpdateTime ? new Date(Math.floor(Number(t.closeUpdateTime))) : new Date(), 'MM-dd HH:mm')}
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                      {t.symbol}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-mono ${t.side === 'long' ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30' : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'}`}>
                        {t.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-600 dark:text-gray-400">
                      {t.size} {ccy}
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-600 dark:text-gray-400">
                      ${t.entryPrice?.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-600 dark:text-gray-400">
                      ${t.closePrice?.toFixed(2)}
                    </td>
                    <td className={`px-5 py-4 font-mono text-right ${new Big(t.realizedPnl || 0).gte(0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {new Big(t.realizedPnl || 0).gte(0) ? '+' : ''}{new Big(t.realizedPnl || 0).toFixed(8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
