import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Label } from 'recharts';

export const EXCHANGE_COLORS: Record<string, string> = {
  okx: '#e2e8f0', // soft slate
  bitget: '#4ade80', // softer emerald
  bybit: '#fbbf24', // softer amber
};

interface MacroCapitalChartProps {
  data: Array<{ name: string; value: number }>;
}

import { formatCompactUSD } from '../../utils/formatters';

const renderCustomizedLabel = (props: any) => {
  const { cx, cy, x, y, midAngle, innerRadius, outerRadius, name, value, percent } = props;
  const isLeft = x < cx;
  const textAnchor = isLeft ? 'end' : 'start';

  const valColor = EXCHANGE_COLORS[name.toLowerCase()] || '#ffffff';
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const inX = cx + radius * Math.cos(-midAngle * RADIAN);
  const inY = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <g>
      {percent > 0.04 && (
        <text x={inX} y={inY} fill="#151619" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
          {(percent * 100).toFixed(0)}%
        </text>
      )}
      
      <text x={x + (isLeft ? -8 : 8)} y={y - 8} fill="#8E9299" textAnchor={textAnchor} dominantBaseline="central" fontSize={12} className="capitalize">
        {name}
      </text>
      <text x={x + (isLeft ? -8 : 8)} y={y + 8} fill={valColor} textAnchor={textAnchor} dominantBaseline="central" fontSize={12} fontWeight="bold" className="font-mono">
        {formatCompactUSD(value)}
      </text>
    </g>
  );
};

export function MacroCapitalChart({ data }: MacroCapitalChartProps) {
  const totalValue = useMemo(() => data.reduce((acc, cur) => acc + cur.value, 0), [data]);

  return (
    <div className="bg-[#151619] border border-[#2a2b30] p-5 rounded-xl flex flex-col h-[300px]">
      <h3 className="text-sm font-semibold text-white mb-4">Macro Capital Distribution</h3>
      <div className="flex-1 min-h-0 w-full relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart margin={{ top: 35, right: 30, left: 30, bottom: 35 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
              label={renderCustomizedLabel}
              labelLine={{ stroke: '#4b4d54', strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={EXCHANGE_COLORS[entry.name.toLowerCase()] || '#8E9299'} />
              ))}
              <Label 
                content={({ viewBox }) => {
                  const { cx, cy } = viewBox as any;
                  return (
                    <g>
                      <text x={cx} y={cy - 10} fill="#8E9299" fontSize={12} textAnchor="middle" dominantBaseline="central">
                        Total:
                      </text>
                      <text x={cx} y={cy + 12} fill="#ffffff" fontSize={20} fontWeight="bold" fontFamily="monospace" textAnchor="middle" dominantBaseline="central">
                        {formatCompactUSD(totalValue, 2)}
                      </text>
                    </g>
                  );
                }}
              />
            </Pie>
            <RechartsTooltip 
              contentStyle={{ backgroundColor: '#1a1b1e', borderColor: '#2a2b30', borderRadius: '8px', padding: '8px 12px' }}
              itemStyle={{ color: '#fff', fontWeight: 'bold' }}
              formatter={(value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
              labelStyle={{ display: 'none' }}
              isAnimationActive={false}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
