import React, { useId } from 'react';

export interface SparklineProps {
  data: number[];
  width?: number | string;
  height?: number;
  strokeWidth?: number;
  color?: 'emerald' | 'rose' | 'blue' | 'amber' | 'indigo' | 'purple' | 'cyan' | 'auto';
  showFill?: boolean;
  showEndDot?: boolean;
  showBadge?: boolean;
  isWaveform?: boolean;
  className?: string;
  fullWidth?: boolean;
}

/**
 * Deterministically generates a realistic 10-14 point series for items
 * that only have total/achievement data, ensuring consistency across re-renders.
 */
export function generateDeterministicSparkline(
  seedKey: string | number,
  baseValue: number,
  trendPct: number = 0,
  points: number = 10
): number[] {
  const str = String(seedKey);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  const result: number[] = [];
  const startVal = Math.max(1, baseValue * 0.7);
  const trendMultiplier = 1 + trendPct / 100;
  const targetEnd = startVal * trendMultiplier;

  for (let i = 0; i < points; i++) {
    const t = i / Math.max(1, points - 1);
    // Linear trajectory
    const linear = startVal + (targetEnd - startVal) * t;
    // Deterministic pseudo-random variation using hash
    const pseudoRand = Math.sin(hash + i * 1.7) * 0.15;
    const val = Math.max(0, Math.round(linear * (1 + pseudoRand)));
    result.push(val);
  }

  return result;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data = [],
  width = 72,
  height = 24,
  strokeWidth = 2,
  color = 'auto',
  showFill = true,
  showEndDot = true,
  showBadge = false,
  isWaveform = true,
  className = '',
  fullWidth = false
}) => {
  const gradientId = useId();
  const filterId = useId();

  // If data is empty or all zeroes, render clean flat baseline
  const validData = Array.isArray(data) && data.length > 0 ? data : [0, 0];
  const firstVal = validData[0];
  const lastVal = validData[validData.length - 1];
  const isUp = lastVal >= firstVal;

  // Vibrant neon color scheme
  let strokeColor = '#3b82f6';
  let fillColor = '#60a5fa';
  let glowColor = 'rgba(59, 130, 246, 0.45)';

  if (color === 'emerald' || (color === 'auto' && isUp)) {
    strokeColor = '#10b981';
    fillColor = '#34d399';
    glowColor = 'rgba(16, 185, 129, 0.45)';
  } else if (color === 'rose' || (color === 'auto' && !isUp)) {
    strokeColor = '#f43f5e';
    fillColor = '#fb7185';
    glowColor = 'rgba(244, 63, 94, 0.45)';
  } else if (color === 'amber') {
    strokeColor = '#f59e0b';
    fillColor = '#fbbf24';
    glowColor = 'rgba(245, 158, 11, 0.45)';
  } else if (color === 'indigo') {
    strokeColor = '#6366f1';
    fillColor = '#818cf8';
    glowColor = 'rgba(99, 102, 241, 0.45)';
  } else if (color === 'purple') {
    strokeColor = '#8b5cf6';
    fillColor = '#a78bfa';
    glowColor = 'rgba(139, 92, 246, 0.45)';
  } else if (color === 'cyan') {
    strokeColor = '#06b6d4';
    fillColor = '#67e8f9';
    glowColor = 'rgba(6, 182, 212, 0.45)';
  }

  // Calculate coordinates with margins so strokes aren't clipped
  const padX = 3;
  const padY = 3;
  const internalW = 160;
  const resolvedW = fullWidth ? internalW : (typeof width === 'number' ? width : 72);
  const effW = Math.max(10, resolvedW - padX * 2);
  const effH = Math.max(10, height - padY * 2);

  const minVal = Math.min(...validData);
  const maxVal = Math.max(...validData);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const points = validData.map((val, idx) => {
    const x = padX + (idx / Math.max(1, validData.length - 1)) * effW;
    const y = padY + effH - ((val - minVal) / range) * effH;
    return { x, y };
  });

  // Build ultra-smooth cubic Bezier waveform path
  let pathD = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const tension = isWaveform ? 0.35 : 0.5;
    const dx = (curr.x - prev.x) * tension;
    const cp1x = prev.x + dx;
    const cp1y = prev.y;
    const cp2x = curr.x - dx;
    const cp2y = curr.y;
    pathD += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
  }

  // Area path for gradient fill
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaD = `${pathD} L ${lastPoint.x.toFixed(2)} ${height} L ${firstPoint.x.toFixed(2)} ${height} Z`;

  // Trend percent
  const pctChange = firstVal === 0
    ? (lastVal > 0 ? 100 : 0)
    : Math.round(((lastVal - firstVal) / firstVal) * 100);

  return (
    <div className={`${fullWidth ? 'w-full flex' : 'inline-flex'} items-center gap-1.5 ${className}`}>
      <svg
        width={fullWidth ? '100%' : width}
        height={height}
        viewBox={`0 0 ${fullWidth ? internalW : width} ${height}`}
        preserveAspectRatio={fullWidth ? 'none' : undefined}
        className={`overflow-visible select-none shrink-0 ${fullWidth ? 'w-full' : ''}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity={0.42} />
            <stop offset="65%" stopColor={fillColor} stopOpacity={0.12} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0.0} />
          </linearGradient>

          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor={glowColor} floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Gradient Area Waveform Fill */}
        {showFill && <path d={areaD} fill={`url(#${gradientId})`} />}

        {/* Glowing Waveform Stroke */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${filterId})`}
        />

        {/* Glowing Radar End Dot with Concentric Ping */}
        {showEndDot && (
          <g>
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r={strokeWidth + 3.5}
              fill={strokeColor}
              opacity={0.3}
              className="animate-ping"
              style={{ transformOrigin: `${lastPoint.x}px ${lastPoint.y}px` }}
            />
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r={strokeWidth + 1.5}
              fill={strokeColor}
              opacity={0.5}
            />
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r={strokeWidth}
              fill={strokeColor}
              stroke="#ffffff"
              strokeWidth={1.2}
            />
          </g>
        )}
      </svg>

      {/* Optional Trend Percentage Badge */}
      {showBadge && (
        <span
          className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-full border shadow-xs ${
            isUp
              ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 dark:text-emerald-300'
              : 'text-rose-700 bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          {isUp ? `+${pctChange}%` : `${pctChange}%`}
        </span>
      )}
    </div>
  );
};

export default Sparkline;
