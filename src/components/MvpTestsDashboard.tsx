import React from 'react';
import { Info } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { CoinIcon } from './ui/CoinIcon';

// Mock Data
const PORTFOLIO_HEALTH = 69;
const DONUT_DATA = [
  { name: 'Healthy', value: PORTFOLIO_HEALTH, color: '#00c594' },
  { name: 'Risk', value: 100 - PORTFOLIO_HEALTH, color: '#161b22' }
];

const PNL_DATA = Array.from({ length: 20 }, (_, i) => ({
  value: Math.random() * 5000 + 10000 + (i * 500)
}));

const POSITIONS_DONUT = [
  { name: 'Long', value: 75, color: '#00c594' },
  { name: 'Short', value: 25, color: '#ff4a5a' }
];

const MOCK_POSITIONS = [
  {
    id: '1',
    symbol: 'BTCUSDT',
    baseCoin: 'BTC',
    side: 'long',
    leverage: 3,
    positionValue: 245000.50,
    pnl: 12450.20,
    entryPrice: 76668.50,
    markPrice: 77200.00,
    liqPrice: 24440.36,
    margin: 81666.83,
    distToLiq: 69
  },
  {
    id: '2',
    symbol: 'ETHUSDT',
    baseCoin: 'ETH',
    side: 'short',
    leverage: 5,
    positionValue: 85200.00,
    pnl: -2100.50,
    entryPrice: 3450.00,
    markPrice: 3500.00,
    liqPrice: 4100.00,
    margin: 17040.00,
    distToLiq: 35
  }
];

export function MvpTestsDashboard() {
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({'1': true});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-6 text-gray-200 animate-in fade-in duration-500">
      {/* Top Section: Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Portfolio Health */}
        <div className="bg-[#161b22] rounded-xl p-5 border border-[#2a2b30] flex flex-col relative w-full h-48">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-gray-400">Portfolio Health</h3>
            <Info className="w-4 h-4 text-gray-500" />
          </div>
          
          <div className="flex-1 relative mt-4 h-[100px] w-full flex align-bottom overflow-hidden">
            <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={DONUT_DATA}
                    cx="50%"
                    cy={100}
                    startAngle={180}
                    endAngle={0}
                    innerRadius={70}
                    outerRadius={95}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={5}
                  >
                    {DONUT_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end items-center mb-1">
              <span className="text-[#00c594] font-semibold text-lg tracking-wide uppercase">Healthy</span>
            </div>
          </div>

          <div className="mt-auto text-[10px] text-gray-500 flex justify-between">
            <span>{PORTFOLIO_HEALTH.toFixed(2)}% | Avail. Margin: $45,230.00 | Total Margin Used: $12,450.00</span>
            <span>Exposure: Crypto 65%, Stocks 20%, Stables: 15%</span>
          </div>
        </div>

        {/* Total Unrealized PnL */}
        <div className="bg-[#161b22] rounded-xl p-5 border border-[#2a2b30] flex flex-col relative w-full h-48">
           <h3 className="text-sm font-medium text-gray-400 mb-2">Total Unrealized PnL</h3>
           <div className="flex flex-1 items-end justify-between">
              <div className="flex flex-col">
                <span className="text-4xl text-[#00c594] font-medium tracking-tight">$14,580.42</span>
              </div>
              <div className="w-1/2 h-24 relative overflow-hidden">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={PNL_DATA}>
                       <Line 
                         type="monotone" 
                         dataKey="value" 
                         stroke="#00c594" 
                         strokeWidth={3} 
                         dot={false}
                       />
                       <defs>
                        <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00c594" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00c594" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </LineChart>
                 </ResponsiveContainer>
                 {/* Fake Gradient Under Line */}
                 <div className="absolute inset-x-0 bottom-0 top-[20%] bg-gradient-to-t from-[#00c594]/20 to-transparent pointer-events-none fade-in"></div>
              </div>
           </div>
           
           <div className="mt-auto pt-4 text-[11px] text-gray-500 border-t border-[#2a2b30]/50">
             <span className="text-[#00c594]">+2.45% Today</span> | Realized PnL: $4,250.00
           </div>
        </div>
      </div>

      {/* Positions Section */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white tracking-wide">Positions</h2>
        
        {/* 3 Columns Sub-cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
             <div className="flex flex-col">
               <span className="text-xs text-gray-400">Total Positions</span>
               <span className="text-xl font-medium text-white">12</span>
             </div>
             <div className="w-12 h-12">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={POSITIONS_DONUT} cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" dataKey="value" stroke="none">
                       {POSITIONS_DONUT.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
               </ResponsiveContainer>
             </div>
          </div>
          
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
            <span className="text-xs text-gray-400 mb-1">Unrealized PnL</span>
            <span className="text-lg font-medium text-[#00c594]">+$14,580.42</span>
          </div>

          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
            <span className="text-xs text-gray-400 mb-1">Realized PnL</span>
            <span className="text-lg font-medium text-white">+$4,250.00</span>
          </div>
        </div>

        {/* Position List */}
        <div className="flex flex-col gap-3">
           {MOCK_POSITIONS.map(pos => {
             const isExpanded = expandedRows[pos.id];
             const isLong = pos.side === 'long';
             
             // Color logic for Distance to Liq: Green (Healthy) -> Yellow -> Red
             const liqHealth = pos.distToLiq;
             const liqColor = liqHealth > 60 ? '#00c594' : liqHealth > 30 ? '#eab308' : '#ff4a5a';
             const sideColor = isLong ? 'text-[#00c594]' : 'text-[#ff4a5a]';

             return (
               <div key={pos.id} className="bg-[#161b22] rounded-xl border border-[#2a2b30] overflow-hidden flex flex-col cursor-pointer transition-colors hover:border-[#3a3b40]" onClick={() => toggleRow(pos.id)}>
                 {/* Main Row */}
                 <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Left: Asset */}
                    <div className="flex items-center gap-3 w-full md:w-1/4">
                       <CoinIcon symbol={pos.baseCoin} className="w-8 h-8 rounded-full bg-[#1a1b1e]" />
                       <div className="flex flex-col">
                         <span className={`text-sm font-semibold tracking-wide ${sideColor}`}>
                           {pos.symbol} {isLong ? 'Long' : 'Short'} {pos.leverage}x
                         </span>
                         <span className="text-xs text-gray-500">Asset info</span>
                       </div>
                    </div>

                    {/* Middle: Values */}
                    <div className="flex items-center gap-8 w-full md:w-1/4 justify-between md:justify-start">
                       <div className="flex flex-col">
                         <span className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">Position Value</span>
                         <span className="text-sm text-gray-200 font-mono">${pos.positionValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">PnL</span>
                         <span className={`text-sm font-mono ${pos.pnl >= 0 ? 'text-[#00c594]' : 'text-[#ff4a5a]'}`}>
                           {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toLocaleString('en-US', {minimumFractionDigits: 2})}
                         </span>
                       </div>
                    </div>

                    {/* Right: Distance to Liq */}
                    <div className="flex flex-col w-full md:w-2/5">
                       <span className="text-[11px] text-gray-400 mb-1.5 flex justify-between">
                         <span>Distance to Liq.</span>
                       </span>
                       <div className="w-full h-1.5 bg-[#1a1b1e] rounded-full overflow-hidden flex">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${pos.distToLiq}%`, 
                              backgroundColor: liqColor 
                            }} 
                           />
                       </div>
                       <div className="flex justify-between mt-1.5 text-xs text-gray-400 font-mono">
                          <span className="text-gray-300">{pos.entryPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                          <span style={{ color: liqColor }}>{liqHealth > 60 ? 'Safe' : 'Risk'} ({pos.distToLiq}%)</span>
                          <span>{pos.liqPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                       </div>
                    </div>
                 </div>

                 {/* Expanded Details */}
                 {isExpanded && (
                   <div className="px-4 pb-4 pt-1 bg-[#12151a] border-t border-[#2a2b30] flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                     
                     <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 pt-3">
                       <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500 uppercase mb-1">Position Value</span>
                         <span className="text-xs text-white font-mono">${pos.positionValue.toLocaleString()}</span>
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500 uppercase mb-1">Entry Price</span>
                         <span className="text-xs text-white font-mono">{pos.entryPrice.toLocaleString()}</span>
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500 uppercase mb-1">Mark Price</span>
                         <span className="text-xs text-white font-mono">{pos.markPrice.toLocaleString()}</span>
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500 uppercase mb-1">Est. Liq Price</span>
                         <span className="text-xs text-orange-400 font-mono">{pos.liqPrice.toLocaleString()}</span>
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500 uppercase mb-1">Margin</span>
                         <span className="text-xs text-white font-mono">${pos.margin.toLocaleString()}</span>
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500 uppercase mb-1">Unrealized PnL</span>
                         <span className={`text-xs font-mono ${pos.pnl >= 0 ? 'text-[#00c594]' : 'text-[#ff4a5a]'}`}>
                           {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toLocaleString()}
                         </span>
                       </div>
                     </div>

                     <div className="border-t border-[#2a2b30]/50 pt-3">
                        <span className="text-xs font-medium text-gray-400 mb-3 block">Details</span>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-4">
                           <div className="flex flex-col">
                             <span className="text-[10px] text-gray-500">Margin Type</span>
                             <span className="text-xs text-gray-300 font-mono">Cross</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-gray-500">Maintenance Margin</span>
                             <span className="text-xs text-gray-300 font-mono">0.5%</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-gray-500">Funding Rate</span>
                             <span className="text-xs text-gray-300 font-mono">0.012%</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-gray-500">Funding Fee</span>
                             <span className="text-xs text-gray-300 font-mono">-$2.40</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-gray-500">Take Profit</span>
                             <span className="text-xs text-gray-300 font-mono">None</span>
                           </div>

                           <div className="flex flex-col">
                             <span className="text-[10px] text-gray-500">Stop Loss</span>
                             <span className="text-xs text-gray-300 font-mono">None</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-gray-500">Volume</span>
                             <span className="text-xs text-gray-300 font-mono">3.2 BTC</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-gray-500">ADL</span>
                             <span className="text-xs text-gray-300 font-mono">Low</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-gray-500">Max Open</span>
                             <span className="text-xs text-gray-300 font-mono">1,000.00 BTC</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-gray-500">Risk Limit</span>
                             <span className="text-xs text-gray-300 font-mono">2,000,000</span>
                           </div>
                           
                           <div className="flex flex-col">
                             <span className="text-[10px] text-gray-500">Exchange</span>
                             <span className="text-xs text-gray-300">Binance</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-gray-500">Created At</span>
                             <span className="text-xs text-gray-300 font-mono">2024-03-12 14:32</span>
                           </div>
                        </div>
                     </div>

                   </div>
                 )}
               </div>
             )
           })}
        </div>
      </div>
    </div>
  );
}
