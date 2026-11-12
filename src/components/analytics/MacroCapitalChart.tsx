import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Label } from 'recharts';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/settingsStore';

interface MacroCapitalChartProps {
  data: Array<{ name: string; value: number }>;
}

export const EXCHANGE_COLORS: Record<string, string> = {
  okx: '#fafafa',
  bitget: '#03aac7',
  bybit: '#ff9c2e',
};

export const EXCHANGE_COLORS_LIGHT: Record<string, string> = {
  okx: '#0f1115',
  bitget: '#007e94',
  bybit: '#b25e00',
};

export function MacroCapitalChart({ data }: MacroCapitalChartProps) {
  const { t } = useTranslation();
  const formatCurrency = useFormatCurrency();
  const themeMode = useSettingsStore(state => state.themeMode);
  const isLight = themeMode === 'light';

  const totalValue = useMemo(() => data.reduce((acc, cur) => acc + cur.value, 0), [data]);

  const palette = isLight ? EXCHANGE_COLORS_LIGHT : EXCHANGE_COLORS;

  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, x, y, midAngle, innerRadius, outerRadius, name, value, percent } = props;
    const isLeft = x < cx;
    const textAnchor = isLeft ? 'end' : 'start';

    const valColorExchange = palette[name.toLowerCase()] || (isLight ? '#101420' : '#ffffff');
    const valColorValue = isLight ? '#475569' : '#d8c9c9c0';

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const inX = cx + radius * Math.cos(-midAngle * RADIAN);
    const inY = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <g>
        {percent > 0.04 && (
          <text x={inX} y={inY} fill={isLight ? '#ffffff' : '#151619'} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
            {(percent * 100).toFixed(0)}%
          </text>
        )}

        <text x={x + (isLeft ? -8 : 8)} y={y - 8} fill={valColorExchange} textAnchor={textAnchor} dominantBaseline="central" fontSize={12} className="capitalize font-semibold">
          {name}
        </text>
        <text x={x + (isLeft ? -8 : 8)} y={y + 8} fill={valColorValue} textAnchor={textAnchor} dominantBaseline="central" fontSize={12} fontWeight="bold" className="font-mono">
          {formatCurrency(value, 'compact')}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-surface border border-line p-5 rounded-xl flex flex-col h-[300px]">
      <h3 className="text-sm font-semibold text-fg mb-4">
        {t('dashboardExtra.macroCapitalDistribution', 'Macro Capital Distribution')}
      </h3>
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
              labelLine={{ stroke: isLight ? '#c2c7d1' : '#4b4d54', strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={palette[entry.name.toLowerCase()] || '#8E9299'} />
              ))}
              <Label
                content={({ viewBox }) => {
                  const { cx, cy } = viewBox as any;
                  return (
                    <g>
                      <text x={cx} y={cy - 10} fill={isLight ? '#5a6270' : '#8E9299'} fontSize={12} textAnchor="middle" dominantBaseline="central">
                        {t('dashboardExtra.total', 'Total:')}
                      </text>
                      <text x={cx} y={cy + 12} fill={isLight ? '#101420' : '#ffffffc0'} fontSize={20} fontWeight="bold" fontFamily="monospace" textAnchor="middle" dominantBaseline="central">
                        {formatCurrency(totalValue, 'compact', 2)}
                      </text>
                    </g>
                  );
                }}
              />
            </Pie>
            <RechartsTooltip
              contentStyle={{
                backgroundColor: isLight ? '#ffffff' : '#1a1b1e',
                borderColor: isLight ? '#d9dce3' : '#2a2b30',
                borderRadius: '8px',
                padding: '8px 12px',
                boxShadow: isLight ? '0 10px 25px -5px rgba(0, 0, 0, 0.1)' : undefined
              }}
              itemStyle={{ color: isLight ? '#101420' : '#fff', fontWeight: 'bold' }}
              formatter={(value: any) => formatCurrency(Number(value ?? 0), 'usd')}
              labelStyle={{ display: 'none' }}
              isAnimationActive={false}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
