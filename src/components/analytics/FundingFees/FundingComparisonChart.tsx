import React from 'react';
import { useTranslation } from 'react-i18next';
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
  fillOpacity?: number;
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
  const { t } = useTranslation();
  const { comparisonFavorites, toggleComparisonFavorite } = useFundingStore();

  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint;
    const isPositive = data.value > 0;
    
    const rowId = data.id;
    const isFav = comparisonFavorites.includes(rowId);
    
    return (
      <div className="bg-surface border border-line p-3 rounded-lg shadow-xl min-w-[200px]">
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-line/50">
          <div className="flex items-center gap-2">
            <CoinIcon symbol={data.coin} className="w-5 h-5" />
            <span className="font-bold text-fg text-base">{data.symbol}</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleComparisonFavorite(rowId);
              }}
              className="text-fg-muted hover:text-tone-yellow transition-colors cursor-pointer"
            >
              <Star className={`w-3.5 h-3.5${isFav ? ' fill-tone-yellow text-tone-yellow' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-line bg-line/50 text-fg-muted uppercase">
              {data.type.replace('-', ' ')}
            </span>
            <span className={[
              'flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium capitalize shrink-0',
              data.exchange === 'bitget' ? 'bg-tone-cyan/10 text-tone-cyan border-tone-cyan/25' :
              data.exchange === 'bybit' ? 'bg-tone-orange/10 text-tone-orange border-tone-orange/25' :
              data.exchange === 'okx' ? 'bg-fg/10 text-fg border-fg/20' :
              'bg-line text-fg-muted border-line'
            ].join(' ')}>
              {data.exchange}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-fg-muted">{periodLabel}</span>
          <span className={`font-mono font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
            {data.value > 0 ? '+' : ''}{formatPercent(data.value)}
          </span>
        </div>
        
        <div className="mt-2 text-xs text-fg-muted">
          {isPositive ? t('analytics.funding.cards.longsPayShorts', 'Longs pay Shorts') : data.value < 0 ? t('analytics.funding.cards.shortsPayLongs', 'Shorts pay Longs') : t('common.neutral', 'Neutral')}
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
      fill="var(--fg)" 
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
  const { t } = useTranslation();
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
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="var(--line)" />
            <XAxis 
              type="number" 
              tickFormatter={(val) => formatPercent(val)} 
              stroke="var(--fg-muted)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="label" 
              axisLine={{ stroke: 'var(--line)' }}
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
                          className="text-fg-muted hover:text-tone-yellow transition-colors cursor-pointer shrink-0"
                        >
                          <Star className={`w-3.5 h-3.5${isFav ? ' fill-tone-yellow text-tone-yellow' : ''}`} />
                        </button>
                        <span className="text-xs font-medium text-fg-muted truncate">{item.symbol}</span>
                        <span className={[
                          'flex items-center px-1 py-[1px] rounded border text-[8px] font-medium capitalize shrink-0',
                          item.exchange === 'bitget' ? 'bg-tone-cyan/10 text-tone-cyan border-tone-cyan/25' :
                          item.exchange === 'bybit' ? 'bg-tone-orange/10 text-tone-orange border-tone-orange/25' :
                          item.exchange === 'okx' ? 'bg-fg/10 text-fg border-fg/20' :
                          'bg-line text-fg-muted border-line'
                        ].join(' ')}>
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
              cursor={{ fill: 'var(--elevated-hover)', opacity: 0.6 }}
            />
            <ReferenceLine x={0} stroke="var(--line-strong)" />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  fillOpacity={entry.fillOpacity ?? 1}
                />
              ))}
              <LabelList dataKey="value" content={<CustomizedLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
    </div>
  );
};
