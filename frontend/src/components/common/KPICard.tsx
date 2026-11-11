import React, { useRef, useState, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { Sparkline } from './Sparkline';

interface KPICardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple' | 'slate';
  variant?: 'solid' | 'soft';
  trend?: string;
  index?: number;
  delayMs?: number;
  luminousBorder?: 'blue' | 'amber' | 'cyan' | 'emerald' | 'rose' | boolean;
  sparklineData?: number[];
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'blue',
  variant = 'solid',
  trend,
  index = 0,
  delayMs,
  luminousBorder = true,
  sparklineData
}) => {
  const animatedValue = useCountUp(value, 900);
  const calculatedDelay = delayMs !== undefined ? delayMs : index * 70;

  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  // Icon container gradient & neon glow maps (Solid vs Soft variant)
  const iconBgMap = {
    solid: {
      blue: 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/35 ring-2 ring-blue-400/30',
      emerald: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/35 ring-2 ring-emerald-400/30',
      amber: 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/35 ring-2 ring-amber-400/30',
      rose: 'bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/35 ring-2 ring-rose-400/30',
      indigo: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/35 ring-2 ring-indigo-400/30',
      purple: 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/35 ring-2 ring-purple-400/30',
      slate: 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 text-white shadow-lg shadow-slate-500/35 ring-2 ring-slate-400/30',
    },
    soft: {
      blue: 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200/90 dark:from-blue-950/90 dark:via-blue-900/60 dark:to-blue-800/40 text-blue-600 dark:text-blue-300 border border-blue-300/80 dark:border-blue-700/60 shadow-md shadow-blue-500/20 ring-2 ring-blue-400/25',
      emerald: 'bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200/90 dark:from-emerald-950/90 dark:via-emerald-900/60 dark:to-emerald-800/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/25',
      amber: 'bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200/90 dark:from-amber-950/90 dark:via-amber-900/60 dark:to-amber-800/40 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/25',
      rose: 'bg-gradient-to-br from-rose-50 via-rose-100 to-rose-200/90 dark:from-rose-950/90 dark:via-rose-900/60 dark:to-rose-800/40 text-rose-700 dark:text-rose-300 border border-rose-300/80 dark:border-rose-700/60 shadow-md shadow-rose-500/20 ring-2 ring-rose-400/25',
      indigo: 'bg-gradient-to-br from-indigo-50 via-indigo-100 to-indigo-200/90 dark:from-indigo-950/90 dark:via-indigo-900/60 dark:to-indigo-800/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300/80 dark:border-indigo-700/60 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400/25',
      purple: 'bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200/90 dark:from-purple-950/90 dark:via-purple-900/60 dark:to-purple-800/40 text-purple-700 dark:text-purple-300 border border-purple-300/80 dark:border-purple-700/60 shadow-md shadow-purple-500/20 ring-2 ring-purple-400/25',
      slate: 'bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300/80 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-md shadow-slate-400/20 ring-2 ring-slate-300/30',
    }
  };

  const pingBgMap = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500',
    slate: 'bg-slate-400',
  };

  const cardGlowMap = {
    blue: 'card-accent-blue',
    emerald: 'card-accent-emerald',
    amber: 'card-accent-amber',
    rose: 'card-accent-rose',
    indigo: 'card-accent-blue',
    purple: 'card-accent-purple',
    slate: 'card-accent-blue',
  };

  const spotlightColorMap = {
    blue: 'rgba(59, 130, 246, 0.16)',
    emerald: 'rgba(16, 185, 129, 0.16)',
    amber: 'rgba(245, 158, 11, 0.18)',
    rose: 'rgba(244, 63, 94, 0.16)',
    indigo: 'rgba(99, 102, 241, 0.16)',
    purple: 'rgba(168, 85, 247, 0.16)',
    slate: 'rgba(148, 163, 184, 0.14)',
  };

  const topLineMap = {
    blue: 'from-blue-500 via-cyan-400 to-blue-600',
    emerald: 'from-emerald-400 via-teal-300 to-emerald-600',
    amber: 'from-amber-400 via-yellow-300 to-amber-600',
    rose: 'from-rose-500 via-pink-400 to-rose-600',
    indigo: 'from-indigo-500 via-purple-400 to-indigo-600',
    purple: 'from-purple-500 via-fuchsia-400 to-purple-600',
    slate: 'from-slate-400 via-slate-300 to-slate-500',
  };

  const selectedIconStyle = iconBgMap[variant][color] || iconBgMap.solid.blue;

  // Luminous delicate border line styling
  const effectiveLuminous = luminousBorder === true ? color : luminousBorder;
  const luminousBorderClass = effectiveLuminous === 'amber'
    ? 'luminous-border-amber'
    : effectiveLuminous === 'blue' || effectiveLuminous === 'indigo'
    ? 'luminous-border-blue'
    : effectiveLuminous === 'emerald'
    ? 'luminous-border-emerald'
    : effectiveLuminous === 'rose'
    ? 'border-rose-300/80 dark:border-rose-900/60 shadow-[0_0_12px_rgba(244,63,94,0.18)]'
    : effectiveLuminous === 'cyan'
    ? 'luminous-border-cyan'
    : '';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative p-4 rounded-2xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none ${luminousBorderClass || cardGlowMap[color]} card-hover animate-card-stagger flex flex-col justify-between space-y-2.5 transition-all duration-300 group/card overflow-hidden`}
      style={{ animationDelay: `${calculatedDelay}ms` }}
    >
      {/* Top delicate illuminated gradient line (permanent soft luminescence, lights up on hover) */}
      <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${topLineMap[color]} opacity-50 group-hover/card:opacity-100 transition-opacity duration-300 z-10 shadow-xs`} />

      {/* Specular Inner Edge Light */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent pointer-events-none z-10" />

      {/* Reactive Cursor-Tracking Neon Spotlight Layer */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(280px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), ${spotlightColorMap[color]}, transparent 75%)`,
        }}
      />

      {/* Success Sparkle Burst Particles (One-Time 0.6s Animation) */}
      {(color === 'emerald' || (trend && trend.includes('Nailiyyət'))) && (
        <div className="absolute top-4 right-4 pointer-events-none z-10">
          <span className="absolute w-2 h-2 rounded-full bg-amber-400 shadow-md animate-[sparkleBurst1_0.6s_ease-out_forwards]" />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-md animate-[sparkleBurst2_0.6s_ease-out_forwards]" />
          <span className="absolute w-2 h-2 rounded-full bg-amber-400 shadow-md animate-[sparkleBurst3_0.6s_ease-out_forwards]" />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-md animate-[sparkleBurst4_0.6s_ease-out_forwards]" />
          <span className="absolute w-2 h-2 rounded-full bg-amber-400 shadow-md animate-[sparkleBurst5_0.6s_ease-out_forwards]" />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-md animate-[sparkleBurst6_0.6s_ease-out_forwards]" />
        </div>
      )}

      {/* Header Row: Title with Live Status LED & Icon Box */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pingBgMap[color]} animate-pulse`} />
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 tracking-normal uppercase truncate">{title}</span>
        </div>
        
        {/* Animated & Illuminated Glowing Icon Container */}
        <div className="relative group/icon shrink-0">
          {/* Animated Pulsing Ring */}
          <span
            className={`absolute inset-0 rounded-xl animate-ping opacity-25 ${pingBgMap[color]}`}
            style={{ animationDuration: '3.5s' }}
          />

          {/* Glowing Animated Icon Box */}
          <div className={`relative p-2.5 rounded-xl transition-all duration-300 group-hover/card:scale-115 group-hover/card:rotate-3 ${selectedIconStyle}`}>
            <Icon
              className="w-4 h-4 stroke-[2.2] animate-pulse transition-transform duration-300 group-hover/icon:scale-125"
              style={{ animationDuration: '2.5s' }}
            />
          </div>
        </div>
      </div>

      {/* Metric Value & Optional Compact Trend Badge */}
      <div className="flex items-baseline justify-between pt-0.5 relative z-10 min-w-0">
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans tabular-nums whitespace-nowrap truncate">{animatedValue}</h3>
        {trend && (
          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 shadow-xs flex items-center gap-1 neon-pulse-emerald shrink-0 ml-2">
            {trend}
          </span>
        )}
      </div>

      {/* Full-Width Smooth Fluid Waveform Sparkline */}
      {sparklineData && sparklineData.length > 1 && (
        <div className="pt-0.5 relative z-10 w-full overflow-hidden">
          <Sparkline
            data={sparklineData}
            color={color === 'slate' ? 'blue' : color}
            height={28}
            fullWidth={true}
          />
        </div>
      )}

      {subtext && (
        <div className="pt-1 border-t border-slate-100/90 dark:border-slate-800/90 flex items-center justify-between relative z-10">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 truncate">{subtext}</p>
        </div>
      )}
    </div>
  );
};
