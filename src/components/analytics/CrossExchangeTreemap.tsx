import React from 'react';
import { Treemap, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { EXCHANGE_COLORS } from './MacroCapitalChart';

const formatCompactUSD = (val: number, decimals = 1) => {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(decimals)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(decimals)}k`;
  return `$${val.toFixed(0)}`;
};

const TreemapContent = (props: any) => {
  const { x, y, width, height, exchange, ccy, value, size, exchangeTotal } = props;
  const displaySize = value !== undefined ? value : size;
  if (width < 30 || height < 30 || !exchange) return null;

  const bgColor = EXCHANGE_COLORS[exchange.toLowerCase()] || '#8E9299';
  const percent = exchangeTotal > 0 ? (displaySize / exchangeTotal) * 100 : 0;
  const textColor = '#151619';

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={bgColor}
        stroke="#151619"
        strokeWidth={2}
        rx={4}
      />
      {width > 60 && height > 45 && displaySize !== undefined && (
        <>
          <text x={x + 8} y={y + 18} fill={textColor} fontSize={12} fontWeight="bold" textAnchor="start">
            {exchange.toUpperCase()} - {ccy}
          </text>
          <text x={x + 8} y={y + 34} fill={textColor} fontSize={11} fontWeight="bold" textAnchor="start" className="font-mono">
            {formatCompactUSD(displaySize)}
          </text>
          <text x={x + 8} y={y + 48} fill={textColor} fontSize={10} fontWeight="bold" textAnchor="start" opacity={0.7} className="font-mono">
            ({percent.toFixed(1)}%)
          </text>
        </>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percent = data.exchangeTotal > 0 ? (data.size / data.exchangeTotal) * 100 : 0;
    return (
      <div className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg p-3 shadow-xl">
        <p className="text-white font-bold mb-2 text-sm">{data.exchange.toUpperCase()} - {data.ccy}</p>
        <p className="text-[#8E9299] text-xs mb-1">
          Value: <span className="text-white font-mono ml-1">${data.size.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </p>
        <p className="text-[#8E9299] text-xs">
          Share in {data.exchange.toUpperCase()}: <span className="text-white font-mono ml-1">{percent.toFixed(2)}%</span>
        </p>
      </div>
    );
  }
  return null;
};

interface CrossExchangeTreemapProps {
  data: Array<any>;
}

export function CrossExchangeTreemap({ data }: CrossExchangeTreemapProps) {
  return (
    <div className="bg-[#151619] border border-[#2a2b30] p-5 rounded-xl flex flex-col h-[300px]">
      <h3 className="text-sm font-semibold text-white mb-4">Cross-Exchange Asset Composition</h3>
      <div className="flex-1 min-h-0 w-full rounded-md overflow-hidden">
         <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey="size"
              aspectRatio={4/3}
              stroke="#151619"
              isAnimationActive={false}
              content={<TreemapContent />}
            >
              <RechartsTooltip content={<CustomTooltip />} isAnimationActive={false} />
            </Treemap>
          </ResponsiveContainer>
      </div>
    </div>
  );
}
