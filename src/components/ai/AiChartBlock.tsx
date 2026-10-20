import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity } from 'lucide-react';

export interface ChartDataPoint {
  name: string;
  value?: number;
  [key: string]: string | number | undefined;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie' | 'donut';
  title?: string;
  description?: string;
  data: ChartDataPoint[];
  dataKeys?: string[]; // for multi-series bar/line/area
  colors?: string[];
  unit?: string;
  formatAsCurrency?: boolean;
  formatAsPercent?: boolean;
}

const DEFAULT_PALETTE = [
  '#2F6BFF', // Primary Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

interface AiChartBlockProps {
  config: ChartConfig;
}

export const AiChartBlock: React.FC<AiChartBlockProps> = ({ config }) => {
  const {
    type = 'bar',
    title,
    description,
    data = [],
    dataKeys,
    colors = DEFAULT_PALETTE,
    unit = '',
    formatAsCurrency = false,
    formatAsPercent = false,
  } = config;

  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  // Derive series keys if not explicitly provided
  const seriesKeys: string[] =
    dataKeys && dataKeys.length > 0
      ? dataKeys
      : Object.keys(data[0] || {}).filter((k) => k !== 'name' && typeof data[0][k] === 'number');

  const formatValue = (val: number | string | undefined): string => {
    if (val === undefined || val === null) return '-';
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num)) return String(val);

    if (formatAsCurrency) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(num);
    }
    if (formatAsPercent) {
      return `${num.toFixed(2)}%`;
    }
    return unit ? `${num.toLocaleString('en-US')} ${unit}` : num.toLocaleString('en-US');
  };

  const renderIcon = () => {
    switch (type) {
      case 'line':
        return <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />;
      case 'pie':
      case 'donut':
        return <PieIcon className="w-3.5 h-3.5 text-amber-400" />;
      case 'area':
        return <Activity className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <BarChart3 className="w-3.5 h-3.5 text-[#2F6BFF]" />;
    }
  };

  return (
    <div className="my-3 rounded-xl border border-[#2a2b30] bg-[#0d0e12] overflow-hidden shadow-lg text-xs">
      {/* Header */}
      {(title || description) && (
        <div className="px-3.5 py-2.5 bg-[#14151a] border-b border-[#2a2b30] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-[#1f2027] border border-[#2e3038]">
              {renderIcon()}
            </div>
            <div>
              {title && <h4 className="text-xs font-semibold text-white tracking-tight">{title}</h4>}
              {description && (
                <p className="text-[10px] text-[#8E9299] mt-0.5">{description}</p>
              )}
            </div>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-gray-400 px-2 py-0.5 rounded bg-[#1a1b22] border border-[#2a2b30]">
            {type} chart
          </span>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="p-3 w-full h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          {(() => {
            if (type === 'pie' || type === 'donut') {
              return (
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121318',
                      borderColor: '#2a2b30',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#fff',
                    }}
                    formatter={(val: any) => [formatValue(val), 'Value']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', color: '#9CA3AF', paddingTop: '8px' }}
                  />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={type === 'donut' ? 45 : 0}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {data.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={colors[index % colors.length]}
                        stroke="#0d0e12"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </PieChart>
              );
            }

            if (type === 'line') {
              return (
                <LineChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22242c" />
                  <XAxis
                    dataKey="name"
                    stroke="#717682"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2b30' }}
                  />
                  <YAxis
                    stroke="#717682"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2b30' }}
                    tickFormatter={(val) =>
                      typeof val === 'number'
                        ? val >= 1000000
                          ? `${(val / 1000000).toFixed(1)}M`
                          : val >= 1000
                          ? `${(val / 1000).toFixed(1)}k`
                          : String(val)
                        : String(val)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121318',
                      borderColor: '#2a2b30',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#fff',
                    }}
                    formatter={(val: any) => [formatValue(val), '']}
                  />
                  {seriesKeys.length > 1 && (
                    <Legend
                      verticalAlign="top"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '10px', color: '#9CA3AF', paddingBottom: '6px' }}
                    />
                  )}
                  {seriesKeys.map((key, idx) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={colors[idx % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: colors[idx % colors.length], strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              );
            }

            if (type === 'area') {
              return (
                <AreaChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22242c" />
                  <XAxis
                    dataKey="name"
                    stroke="#717682"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2b30' }}
                  />
                  <YAxis
                    stroke="#717682"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2b30' }}
                    tickFormatter={(val) =>
                      typeof val === 'number'
                        ? val >= 1000000
                          ? `${(val / 1000000).toFixed(1)}M`
                          : val >= 1000
                          ? `${(val / 1000).toFixed(1)}k`
                          : String(val)
                        : String(val)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121318',
                      borderColor: '#2a2b30',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#fff',
                    }}
                    formatter={(val: any) => [formatValue(val), '']}
                  />
                  {seriesKeys.map((key, idx) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={colors[idx % colors.length]}
                      fill={colors[idx % colors.length]}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              );
            }

            // Default: Bar Chart
            return (
              <BarChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22242c" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#717682"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#2a2b30' }}
                />
                <YAxis
                  stroke="#717682"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#2a2b30' }}
                  tickFormatter={(val) =>
                    typeof val === 'number'
                      ? val >= 1000000
                        ? `${(val / 1000000).toFixed(1)}M`
                        : val >= 1000
                        ? `${(val / 1000).toFixed(1)}k`
                        : String(val)
                      : String(val)
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121318',
                    borderColor: '#2a2b30',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                  formatter={(val: any) => [formatValue(val), '']}
                />
                {seriesKeys.length > 1 && (
                  <Legend
                    verticalAlign="top"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', color: '#9CA3AF', paddingBottom: '6px' }}
                  />
                )}
                {seriesKeys.map((key, idx) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={colors[idx % colors.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            );
          })()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
