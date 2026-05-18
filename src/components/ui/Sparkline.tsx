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

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const strokeColor = color === 'emerald' ? '#10b981' : '#ef4444';

  return (
    <svg width={width} height={height} viewBox={`-2 -2 ${width + 4} ${height + 4}`} className="opacity-80">
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
