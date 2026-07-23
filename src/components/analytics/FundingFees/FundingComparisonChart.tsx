import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid,
  ReferenceLine,
  LabelList
} from 'recharts';
import { CoinIcon } from '../../ui/CoinIcon';
import clsx from 'clsx';
import { useFundingStore } from '../../../store/fundingStore';
import { Star } from 'lucide-react';

export interface ChartDataPoint {
  id: string;
  symbol: string;
  exchange: string;
  coin: string;
  label: string;
  value: number;
  type: string;
  color: string;
}

interface Props {
  data: ChartDataPoint[];
  periodLabel: string;
}

const formatPercent = (val: number) => (val * 100).toFixed(4) + '%';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  periodLabel: string;
}

const CustomTooltip = ({ active, payload, periodLabel }: CustomTooltipProps) => {
  const { comparisonFavorites, toggleComparisonFavorite } = useFundingStore();

  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint;
    const isPositive = data.value > 0;
    
    const rowId = data.id;
    const isFav = comparisonFavorites.includes(rowId);
    
    return (
      <div className="bg-[#151619] border border-[#2a2b30] p-3 rounded-lg shadow-xl min-w-[200px]">
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#2a2b30]/50">
          <div className="flex items-center gap-2">
            <CoinIcon symbol={data.coin} className="w-5 h-5" />
            <span className="font-bold text-white text-base">{data.symbol}</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleComparisonFavorite(rowId);
              }}
              className="text-[#8E9299] hover:text-yellow-500 transition-colors cursor-pointer"
            >
              <Star className={clsx("w-3.5 h-3.5", isFav && "fill-yellow-500 text-yellow-500")} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#2a2b30] bg-[#2a2b30]/50 text-[#8E9299] uppercase">
              {data.type.replace('-', ' ')}
            </span>
            <span className={clsx(
              "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium capitalize shrink-0",
              data.exchange === 'bitget' ? "bg-[#03aac7]/10 text-[#03aac7] border-[#03aac7]/20" :
              data.exchange === 'bybit' ? "bg-[#ff9c2e]/10 text-[#ff9c2e] border-[#ff9c2e]/20" :
              data.exchange === 'okx' ? "bg-white/10 text-white border-white/20" :
              "bg-[#2a2b30] text-[#8E9299] border-[#2a2b30]"
            )}>
              {data.exchange}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-[#8E9299]">{periodLabel}</span>
          <span className={clsx(
            "font-mono font-bold",
            isPositive ? "text-green-400" : "text-red-400"
          )}>
            {data.value > 0 ? '+' : ''}{formatPercent(data.value)}
          </span>
        </div>
        
        <div className="mt-2 text-xs text-[#8E9299]">
          {isPositive ? 'Longs pay Shorts' : data.value < 0 ? 'Shorts pay Longs' : 'Neutral'}
        </div>
      </div>
    );
  }

  return null;
};

const CustomizedLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  const isPositive = value >= 0;
  // Position text to the right for positive, to the left for negative
  // In horizontal mode, width can be negative in older recharts, or x is the left edge.
  // We'll calculate based on value.
  const xPos = isPositive ? x + width + 5 : x - 5;
  
  return (
    <text 
      x={xPos} 
      y={y + height / 2} 
      fill="#fff" 
      fontSize={10} 
      textAnchor={isPositive ? "start" : "end"} 
      dominantBaseline="middle"
      className="font-mono"
    >
      {formatPercent(value)}
    </text>
  );
};

export const FundingComparisonChart: React.FC<Props> = ({ data, periodLabel }) => {
  const { comparisonFavorites, toggleComparisonFavorite } = useFundingStore();

  // Ensure enough height to avoid squished bars in horizontal layout
  const minHeight = Math.max(300, data.length * 40 + 60);

  return (
    <div className="w-full" style={{ height: `${minHeight}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 20, right: 80, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#2a2b30" />
            <XAxis 
              type="number" 
              tickFormatter={(val) => formatPercent(val)} 
              stroke="#8E9299" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="label" 
              axisLine={{ stroke: '#2a2b30' }}
              tickLine={false}
              interval={0}
              width={180}
              tick={(props: any) => {
                const { x, y, index } = props;
                const item = data[index];
                if (!item) return null;

                const rowId = item.id;
                const isFav = comparisonFavorites.includes(rowId);

                return (
                  <g transform={`translate(${x},${y})`}>
                    <foreignObject x={-175} y={-10} width={165} height={20}>
                      <div className="flex items-center justify-end w-full h-full gap-1.5 overflow-hidden">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleComparisonFavorite(rowId);
                          }}
                          className="text-[#8E9299] hover:text-yellow-500 transition-colors cursor-pointer shrink-0"
                        >
                          <Star className={clsx("w-3.5 h-3.5", isFav && "fill-yellow-500 text-yellow-500")} />
                        </button>
                        <span className="text-xs font-medium text-[#8E9299] truncate">{item.symbol}</span>
                        <span className={clsx(
                          "flex items-center px-1 py-[1px] rounded border text-[8px] font-medium capitalize shrink-0",
                          item.exchange === 'bitget' ? "bg-[#03aac7]/10 text-[#03aac7] border-[#03aac7]/20" :
                          item.exchange === 'bybit' ? "bg-[#ff9c2e]/10 text-[#ff9c2e] border-[#ff9c2e]/20" :
                          item.exchange === 'okx' ? "bg-white/10 text-white border-white/20" :
                          "bg-[#2a2b30] text-[#8E9299] border-[#2a2b30]"
                        )}>
                          {item.exchange}
                        </span>
                      </div>
                    </foreignObject>
                  </g>
                );
              }}
            />
            <Tooltip 
              content={<CustomTooltip periodLabel={periodLabel} />}
              cursor={{ fill: '#2a2b30', opacity: 0.4 }}
            />
            <ReferenceLine x={0} stroke="#4a4b50" />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                />
              ))}
              <LabelList dataKey="value" content={<CustomizedLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
    </div>
  );
};
