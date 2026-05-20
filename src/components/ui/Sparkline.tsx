import React from 'react';

interface SparklineProps {
  data: number[];
  color: 'emerald' | 'red';
  width?: number;
  height?: number;
}

export function Sparkline({ data, color, width = 60, height = 24 }: SparklineProps) {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pointsList = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2; // Keep it slightly within bounds
    return { x, y };
  });

  const points = pointsList.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${pointsList[0].x},${height} ${points} ${pointsList[pointsList.length - 1].x},${height}`;

  const strokeColor = color === 'emerald' ? '#10b981' : '#ef4444';
  const gradientId = `sparkline-gradient-${color}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="opacity-100">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#${gradientId})`}
        points={areaPoints}
      />
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
