import React from 'react';

interface SparklineProps {
  data: number[];
  color: 'emerald' | 'red';
  width?: number;
  height?: number;
  className?: string;
  ariaLabel?: string;
}

export function Sparkline({
  data,
  color,
  width = 60,
  height = 24,
  className = '',
  ariaLabel,
}: SparklineProps) {
  const reactId = React.useId();

  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const hasRange = max !== min;

  const pointsList =
    data.length === 1
      ? [
          { x: 0, y: height / 2 },
          { x: width, y: height / 2 },
        ]
      : data.map((val, i) => {
          const x = (i / (data.length - 1)) * width;
          const y = hasRange
            ? height - ((val - min) / (max - min)) * (height - 4) - 2
            : height / 2;
          return { x, y };
        });

  const points = pointsList.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${pointsList[0].x},${height} ${points} ${pointsList[pointsList.length - 1].x},${height}`;

  const strokeColor =
    color === 'emerald' ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)';
  const safeId = reactId.replace(/:/g, '');
  const gradientId = `sparkline-gradient-${color}-${safeId}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`opacity-100 ${className}`.trim()}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <polygon fill={`url(#${gradientId})`} points={areaPoints} />
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

