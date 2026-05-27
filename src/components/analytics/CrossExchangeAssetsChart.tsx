import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { EXCHANGE_COLORS } from './MacroCapitalChart';
import { ExchangeIcon } from '../ui/ExchangeIcon';
import { CoinIcon } from '../ui/CoinIcon';
import { MoreHorizontal } from 'lucide-react';
import { formatCompactUSD } from '../../utils/formatters';

const CustomBarShape = (props: any) => {
  const { fill, x, y, width, height, payload, dataKey, fillOpacity, value } = props;
  if (!width || !height || width <= 0 || height <= 0) return null;
  
  const currentSegIndex = parseInt(dataKey.replace('segment', ''));
  const isFirstSegment = currentSegIndex === 0;
  const isLastSegment = payload[`segment${currentSegIndex + 1}`] === undefined;

  const radius = 8;
  const r = Math.min(radius, width / 2, height / 2);
  
  let path = '';
  if (isFirstSegment && isLastSegment) {
    path = `M ${x + r},${y} h ${width - 2*r} a ${r},${r} 0 0 1 ${r},${r} v ${height - 2*r} a ${r},${r} 0 0 1 ${-r},${r} h ${-(width - 2*r)} a ${r},${r} 0 0 1 ${-r},${-r} v ${-(height - 2*r)} a ${r},${r} 0 0 1 ${r},${-r} Z`;
  } else if (isFirstSegment) {
    path = `M ${x + r},${y} h ${width - r} v ${height} h ${-(width - r)} a ${r},${r} 0 0 1 ${-r},${-r} v ${-(height - 2*r)} a ${r},${r} 0 0 1 ${r},${-r} Z`;
  } else if (isLastSegment) {
    path = `M ${x},${y} h ${width - r} a ${r},${r} 0 0 1 ${r},${r} v ${height - 2*r} a ${r},${r} 0 0 1 ${-r},${r} h ${-(width - r)} Z`;
  } else {
    path = `M ${x},${y} h ${width} v ${height} h ${-width} Z`;
  }

  const metaKey = dataKey.replace('segment', '_meta');
  const meta = payload[metaKey];

  const isLightBackground = fill === '#ffffff';
  const textColor = isLightBackground ? '#4b5563' : '#ffffff';
  const textShadow = isLightBackground ? 'none' : '0px 1px 3px rgba(0,0,0,0.8), 0px 0px 1px rgba(0,0,0,0.5)';

  return (
    <g>
      <path d={path} fill={fill} fillOpacity={fillOpacity} />
      
      {value && meta && width >= 40 && (
        <foreignObject x={x} y={y} width={width} height={height}>
          <div className="flex flex-col items-center justify-center w-full h-full pointer-events-none px-1 overflow-hidden" xmlns="http://www.w3.org/1999/xhtml">
            <div className="flex items-center gap-1.5 opacity-100 overflow-hidden bg-transparent">
               {meta.name !== 'Outros' && width >= 55 && (
                 <div className="pb-6 w-[18px] h-[18px] flex-shrink-0" style={{ filter: isLightBackground ? 'none' : 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))' }}>
                   <CoinIcon symbol={meta.name} />
                 </div>
               )}
               {meta.name === 'Outros' && width >= 45 && (
                 <div className="w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center" style={{ filter: isLightBackground ? 'none' : 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))' }}>
                   <MoreHorizontal size={16} color={textColor} strokeWidth={3} />
                 </div>
               )}
            </div>
            <span 
              className="font-bold text-[13px] whitespace-nowrap mt-2.5"
              style={{ color: textColor, textShadow, opacity: isLightBackground ? 0.95 : 0.9 }}
            >
               {meta.percent.toFixed(0)}%
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
};


const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const row = payload[0].payload;
    const assets = row.rawAssets || [];
    
    return (
      <div className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg p-4 shadow-xl z-50 min-w-[220px]">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#2a2b30]">
          <div className="w-5 h-5 grayscale opacity-80 mix-blend-screen">
             <ExchangeIcon exchange={row.exchange} />
          </div>
          <span className="text-white font-bold capitalize">{row.exchange} Composition</span>
        </div>
        <div className="space-y-2">
          {assets.map((asset: any, idx: number) => {
            return (
              <div key={idx} className="flex justify-between items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 flex-shrink-0">
                    <CoinIcon symbol={asset.name} />
                  </div>
                  <span className="text-[#8E9299] font-semibold text-xs tracking-wider uppercase">{asset.name}</span>
                </div>
                <div className="text-right flex items-center justify-end gap-3 min-w-[100px]">
                  <span className="text-white font-mono">${asset.value.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</span>
                  <span className="text-[#8E9299] opacity-80 font-mono text-xs w-10 text-right">{asset.percent.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const customYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const ex = payload.value;
  return (
    <g transform={`translate(${x - 85}, ${y - 12})`}>
      <foreignObject width={80} height={24}>
        <div className="flex items-center justify-end w-full h-full pr-1 gap-2" xmlns="http://www.w3.org/1999/xhtml">
          <div className="w-[18px] h-[18px] opacity-80 flex-shrink-0">
            <ExchangeIcon exchange={ex} />
          </div>
          <span className="text-[#8E9299] text-xs font-semibold capitalize whitespace-nowrap">{ex}</span>
        </div>
      </foreignObject>
    </g>
  );
};

interface CrossExchangeAssetsChartProps {
  data: any[];
  maxSegments: number;
}

export function CrossExchangeAssetsChart({ data, maxSegments }: CrossExchangeAssetsChartProps) {
  if (!data || data.length === 0) return null;

  const segments = Array.from({ length: maxSegments }).map((_, i) => `segment${i}`);
  const maxTotal = Math.max(...data.map(d => d.total));

  return (
    <div className="bg-[#151619] border border-[#2a2b30] p-5 rounded-xl flex flex-col h-[300px]">
      <h3 className="text-sm font-semibold text-white mb-4">Cross-Exchange Asset Composition</h3>
      <div className="flex-1 min-h-0 min-w-0 w-full relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            barSize={56}
          >
            <XAxis type="number" domain={[0, maxTotal]} hide />
            <YAxis dataKey="exchange" type="category" axisLine={false} tickLine={false} tick={customYAxisTick} width={80} />
            <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<CustomTooltip />} isAnimationActive={false} />
            
            {segments.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                isAnimationActive={false}
                shape={<CustomBarShape />}
              >
                {data.map((entry, index) => {
                  const color = EXCHANGE_COLORS[entry.exchange] || '#8E9299';
                  // Opaque progression 1.0 -> 0.75 -> 0.50 ... clamped to 0.20
                  const opacity = Math.max(0.20, 1 - (i * 0.25));
                  return <Cell key={`cell-${index}`} fill={color} fillOpacity={opacity} />;
                })}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
