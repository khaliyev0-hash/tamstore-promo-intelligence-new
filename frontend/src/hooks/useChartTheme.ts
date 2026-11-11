import { useTheme } from '../context/ThemeContext';

export interface ChartTheme {
  isDark: boolean;
  gridStroke: string;
  axisStroke: string;
  tickColor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipColor: string;
  legendColor: string;
  targetLineColor: string;
  trendActualColor: string;
  trendCumulativeColor: string;
  trendProjectionColor: string;
  areaFillGradient: {
    start: string;
    end: string;
  };
}

export function useChartTheme(): ChartTheme {
  const { isDark } = useTheme();

  return {
    isDark,
    gridStroke: isDark ? '#1e293b' : '#e2e8f0',
    axisStroke: isDark ? '#334155' : '#cbd5e1',
    tickColor: isDark ? '#94a3b8' : '#64748b',
    tooltipBg: isDark ? '#0f172a' : '#ffffff',
    tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    tooltipColor: isDark ? '#f8fafc' : '#0f172a',
    legendColor: isDark ? '#cbd5e1' : '#475569',
    targetLineColor: isDark ? '#10b981' : '#059669',
    trendActualColor: isDark ? '#34d399' : '#10b981',
    trendCumulativeColor: isDark ? '#38bdf8' : '#2563eb',
    trendProjectionColor: isDark ? '#818cf8' : '#4f46e5',
    areaFillGradient: {
      start: isDark ? 'rgba(56, 189, 248, 0.28)' : 'rgba(37, 99, 235, 0.22)',
      end: isDark ? 'rgba(56, 189, 248, 0.02)' : 'rgba(37, 99, 235, 0.01)',
    },
  };
}
