import React, { useId, useMemo } from 'react';
import { Sparkles, Zap, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export interface RingItem {
  label: string;
  sublabel?: string;
  value: number; // 0 - 100+
  target?: number;
  color: string;
  trackColor: string;
  glowColor?: string;
  unit?: string;
  statusText?: string;
}

interface MultiRingGaugeProps {
  title?: string;
  subtitle?: string;
  rings: RingItem[];
  centerValue?: string | number;
  centerLabel?: string;
  size?: number;
  className?: string;
}

export const MultiRingGauge: React.FC<MultiRingGaugeProps> = ({
  title = "Strateji Hədəf və İcra İndeksi",
  subtitle = "Satış Reallaşması, Proqnoz və Stok OSA İndekslərinin Sinxron Analitikası",
  rings,
  centerValue,
  centerLabel = "Ümumi İcra",
  size = 230,
  className = ""
}) => {
  const filterId = useId();
  const center = size / 2;
  const strokeWidth = Math.max(10, Math.round(size * 0.055));
  const ringGap = Math.max(4, Math.round(size * 0.022));

  // Compute ring geometries and 3D terminal cap coordinates
  const ringMetrics = useMemo(() => {
    return rings.map((ring, idx) => {
      const radius = center - strokeWidth - idx * (strokeWidth + ringGap) - 10;
      const circumference = 2 * Math.PI * radius;
      const clampVal = Math.max(0, ring.value);
      const displayPct = Math.min(clampVal, 100);
      const strokeDashoffset = circumference - (displayPct / 100) * circumference;

      // 3D Terminal cap position
      // SVG starts at -90deg (top center)
      const angleDeg = -90 + (displayPct / 100) * 360;
      const angleRad = (angleDeg * Math.PI) / 180;
      const capX = center + radius * Math.cos(angleRad);
      const capY = center + radius * Math.sin(angleRad);

      return {
        ...ring,
        radius,
        circumference,
        strokeDashoffset,
        capX,
        capY,
        hasCap: displayPct > 2,
        isOver100: clampVal > 100
      };
    });
  }, [rings, center, strokeWidth, ringGap]);

  const primaryValue = centerValue !== undefined
    ? centerValue
    : (rings[0] ? `${Math.round(rings[0].value)}%` : '0%');

  return (
    <div className={`p-5 sm:p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 card-hover ${className}`}>
      {/* Specular Top Rim Reflection */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/80 dark:via-cyan-400/50 to-transparent pointer-events-none z-20" />

      {/* Ambient background glows */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/15 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/15 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 relative z-10 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Zap className="w-4 h-4" />
            </span>
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            TRİ-RİNQ İNDEKSLƏRİ
          </span>
        </div>
      </div>

      {/* Main Gauge Body (Left/Center: Concentric SVG Rings, Right: Ring Legend & Stats) */}
      <div className="flex flex-col lg:flex-row items-center justify-around gap-6 my-2 relative z-10">
        {/* Concentric Rings Visual */}
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="overflow-visible select-none drop-shadow-lg">
            <defs>
              <filter id={`${filterId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.45" />
              </filter>
            </defs>

            {/* Inactive Deep Metallic Tracks */}
            {ringMetrics.map((ring, idx) => (
              <circle
                key={`track-${idx}`}
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke={ring.trackColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={0.85}
              />
            ))}

            {/* Active Colored Arcs (Rotated -90deg so they start at 12 o'clock) */}
            <g transform={`rotate(-90 ${center} ${center})`}>
              {ringMetrics.map((ring, idx) => (
                <circle
                  key={`arc-${idx}`}
                  cx={center}
                  cy={center}
                  r={ring.radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={ring.circumference}
                  strokeDashoffset={ring.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: ring.glowColor ? `drop-shadow(0 0 6px ${ring.glowColor})` : undefined
                  }}
                />
              ))}
            </g>

            {/* 3D Overlapping Terminal End-Cap */}
            {ringMetrics.map((ring, idx) => {
              if (!ring.hasCap) return null;
              return (
                <g key={`cap-${idx}`}>
                  {/* Subtle drop shadow behind terminal pill */}
                  <circle
                    cx={ring.capX}
                    cy={ring.capY}
                    r={strokeWidth / 2}
                    fill="rgba(0,0,0,0.3)"
                    filter={`url(#${filterId}-shadow)`}
                  />
                  {/* 3D Cap Head */}
                  <circle
                    cx={ring.capX}
                    cy={ring.capY}
                    r={strokeWidth / 2}
                    fill={ring.color}
                  />
                  {/* Specular Highlight dot on cap */}
                  <circle
                    cx={ring.capX - 1}
                    cy={ring.capY - 1}
                    r={strokeWidth / 4.5}
                    fill="#ffffff"
                    opacity={0.7}
                  />
                </g>
              );
            })}
          </svg>

          {/* Central Hub Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
            <Sparkles className="w-4 h-4 text-amber-400 mb-0.5 animate-pulse drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none drop-shadow-md">
              {primaryValue}
            </span>
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mt-1">
              {centerLabel}
            </span>
          </div>
        </div>

        {/* Legend Stack with Progress Breakdown */}
        <div className="flex-1 w-full space-y-3">
          {ringMetrics.map((ring, idx) => {
            const pct = Math.round(ring.value * 10) / 10;
            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 hover:border-blue-400/60 dark:hover:border-blue-500/60 transition-all card-lift shadow-xs group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-md transition-transform group-hover:scale-125"
                      style={{
                        backgroundColor: ring.color,
                        boxShadow: `0 0 10px ${ring.color}`
                      }}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        {ring.label}
                      </span>
                      {ring.sublabel && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {ring.sublabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {pct}{ring.unit || '%'}
                    </span>
                    {ring.isOver100 ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Aşdı
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {ring.statusText || 'Gedişat'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini Linear Progress Bar */}
                <div className="w-full h-1.5 bg-slate-200/70 dark:bg-slate-700/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: ring.color,
                      boxShadow: `0 0 6px ${ring.color}`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MultiRingGauge;
