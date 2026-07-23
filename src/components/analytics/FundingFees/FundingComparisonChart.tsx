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
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint;
    const isPositive = data.value > 0;
    
    return (
      <div className="bg-[#151619] border border-[#2a2b30] p-3 rounded-lg shadow-xl min-w-[200px]">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#2a2b30]/50">
          <CoinIcon symbol={data.coin} className="w-5 h-5" />
          <span className="font-bold text-white text-base">{data.symbol}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-[#2a2b30] text-[#8E9299] uppercase">{data.exchange}</span>
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
  const isPositive = value > 0;
  // Position text above the bar for positive, below for negative
  const yPos = isPositive ? y - 10 : y + height + 10;
  
  return (
    <text 
      x={x + width / 2} 
      y={yPos} 
      fill="#fff" 
      fontSize={10} 
      textAnchor="middle" 
      dominantBaseline="middle"
      className="font-mono"
    >
      {formatPercent(value)}
    </text>
  );
};

export const FundingComparisonChart: React.FC<Props> = ({ data, periodLabel }) => {
  // Ensure enough width to avoid squished bars in vertical layout
  const minWidth = Math.max(100, data.length * 60);

  return (
    <div className="w-full h-full overflow-x-auto overflow-y-hidden">
      <div style={{ minWidth: `${minWidth}px`, height: '100%', minHeight: '450px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 30, right: 20, left: 20, bottom: 120 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2b30" />
            <XAxis 
              dataKey="label" 
              axisLine={{ stroke: '#2a2b30' }}
              tickLine={false}
              interval={0}
              tick={(props: any) => {
                const { x, y, payload } = props;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={0} y={15} fill="#8E9299" fontSize={11} textAnchor="end" transform="rotate(-35)">
                      {payload.value}
                    </text>
                  </g>
                );
              }}
            />
            <YAxis 
              type="number" 
              tickFormatter={(val) => formatPercent(val)} 
              stroke="#8E9299" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip 
              content={<CustomTooltip periodLabel={periodLabel} />}
              cursor={{ fill: '#2a2b30', opacity: 0.4 }}
            />
            <ReferenceLine y={0} stroke="#4a4b50" />
            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
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
    </div>
  );
};
