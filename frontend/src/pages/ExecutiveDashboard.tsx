import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { KPICard } from '../components/common/KPICard';
import {
  TrendingUp, Activity, Target, Store, Package, Rocket, AlertTriangle, Sparkles, CheckCircle2, ShieldAlert, ArrowUpRight, CalendarX, RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine
} from 'recharts';

import { Skeleton, SkeletonCard, SkeletonTable } from '../components/common/Skeleton';
import { AnimatedCounter } from '../components/common/AnimatedCounter';
import { generateDeterministicSparkline } from '../components/common/Sparkline';
import { useTheme } from '../context/ThemeContext';
import { isPromoTypeMatch, isProductMatchGlobalFilters, isStoreMatchGlobalFilters } from '../utils/filterUtils';
import type { DailySalesRecord } from '../types';

const SparkleStar: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = "w-4 h-4 text-amber-500", style }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
  </svg>
);

const EMPTY_OBJECT: Record<string, any> = {};
const EMPTY_ARRAY: any[] = [];

const getHostName = () => (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';
const API_BASE = import.meta.env.VITE_API_BASE_URL || `http://${getHostName()}:8000/api`;

export const ExecutiveDashboard: React.FC = () => {
  const { data, loading, refreshActiveCampaign, loadDemoData, t, setSelectedProductDetail, filters, campaigns, activeCampaignId } = useData();
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'PCS' | 'AZN'>('PCS');
  const [filteredDailySales, setFilteredDailySales] = useState<DailySalesRecord[] | null>(null);

  const kpi_cards = (data?.kpi_cards || EMPTY_OBJECT) as any;
  const product_performances = data?.product_performances || EMPTY_ARRAY;
  const category_performances = data?.category_performances || EMPTY_ARRAY;
  const daily_summaries = data?.daily_summaries || EMPTY_ARRAY;
  const store_performances = data?.store_performances || EMPTY_ARRAY;

  // Real or proxy unit price multiplier for Tutar (₼) calculation
  const PRICE_MULTIPLIER = (kpi_cards.total_forecast && kpi_cards.total_forecast_azn && kpi_cards.total_forecast > 0)
    ? (kpi_cards.total_forecast_azn / kpi_cards.total_forecast)
    : 2.5;

  // 1. Memoized Promo Filtering & Aggregate Metrics
  const {
    hasPromoFilter,
    promoFilteredProducts,
    promoFc,
    promoSale,
    promoAchievement,
    promoStock,
    promoStockoutCount,
    promoAvailability
  } = useMemo(() => {
    const hasFilter = Boolean(
      (filters?.selectedCategories && filters.selectedCategories.length > 0) ||
      (filters?.selectedFamilies && filters.selectedFamilies.length > 0) ||
      (filters?.selectedProducts && filters.selectedProducts.length > 0) ||
      (filters?.selectedOrigins && filters.selectedOrigins.length > 0) ||
      (filters?.selectedInsertFormats && filters.selectedInsertFormats.length > 0) ||
      (filters?.selectedStatuses && filters.selectedStatuses.length > 0) ||
      (filters?.selectedPromoTypes && filters.selectedPromoTypes.length > 0) ||
      (filters?.selectedSupplyTypes && filters.selectedSupplyTypes.length > 0) ||
      (filters?.selectedSupplyType && filters.selectedSupplyType !== 'ALL') ||
      (filters?.promoType && filters.promoType !== 'ALL') ||
      (filters?.selectedCategory && filters.selectedCategory !== 'ALL') ||
      (filters?.selectedFamily && filters.selectedFamily !== 'ALL') ||
      (filters?.selectedOrigin && filters.selectedOrigin !== 'ALL') ||
      (filters?.selectedInsertFormat && filters.selectedInsertFormat !== 'ALL') ||
      (filters?.selectedStatus && filters.selectedStatus !== 'ALL') ||
      (filters?.selectedProduct && filters.selectedProduct !== '')
    );
    const filtered = hasFilter
      ? product_performances.filter((p) => isProductMatchGlobalFilters(p, filters))
      : product_performances;

    const fc = filtered.reduce((sum, p) => sum + (p.total_fc || 0), 0);
    const sale = filtered.reduce((sum, p) => sum + (p.total_sale || 0), 0);
    const ach = fc > 0 ? (sale / fc) * 100 : 0;
    const stock = filtered.reduce((sum, p) => sum + (p.total_stock || 0), 0);
    const stockoutCount = filtered.reduce((sum, p) => sum + (p.stockout_store_count > 0 ? 1 : 0), 0);
    const totalCombos = filtered.reduce((sum, p) => sum + (p.store_count || 0), 0);
    const totalStockouts = filtered.reduce((sum, p) => sum + (p.stockout_store_count || 0), 0);
    const avail = totalCombos > 0
      ? Math.round((100 - (totalStockouts / totalCombos) * 100) * 10) / 10
      : 100;

    return {
      hasPromoFilter: hasFilter,
      promoFilteredProducts: filtered,
      promoFc: fc,
      promoSale: sale,
      promoAchievement: ach,
      promoStock: stock,
      promoStockoutCount: stockoutCount,
      promoAvailability: avail
    };
  }, [product_performances, filters]);

  // 2. Memoized Store Filtering & Aggregate Metrics
  const {
    hasStoreFilter,
    filteredStoreList,
    storeFc,
    storeSale,
    storeAchievement,
    storeStock,
    storeStockoutCount,
    storeAvailability
  } = useMemo(() => {
    const hasFilter = Boolean(
      (filters?.selectedAreas && filters.selectedAreas.length > 0) ||
      (filters?.selectedSubAreas && filters.selectedSubAreas.length > 0) ||
      (filters?.selectedStores && filters.selectedStores.length > 0) ||
      (filters?.selectedFormats && filters.selectedFormats.length > 0) ||
      (filters?.selectedStatuses && filters.selectedStatuses.length > 0) ||
      (filters?.selectedArea && filters.selectedArea !== 'ALL') ||
      (filters?.selectedSubArea && filters.selectedSubArea !== 'ALL') ||
      (filters?.selectedFormat && filters.selectedFormat !== 'ALL') ||
      (filters?.selectedStatus && filters.selectedStatus !== 'ALL') ||
      (filters?.selectedStore && filters.selectedStore !== '')
    );

    const filtered = hasFilter
      ? store_performances.filter((s) => isStoreMatchGlobalFilters(s, filters))
      : store_performances;

    const fc = filtered.reduce((sum, s) => sum + (s.total_fc || 0), 0);
    const sale = filtered.reduce((sum, s) => sum + (s.total_sale || 0), 0);
    const ach = fc > 0 ? (sale / fc) * 100 : 0;
    const stock = filtered.reduce((sum, s) => sum + (s.total_stock || 0), 0);
    const stockoutCount = filtered.reduce((sum, s) => sum + (s.stockout_count > 0 ? 1 : 0), 0);
    const totalCombos = filtered.reduce((sum, s) => sum + (s.product_count || 0), 0);
    const totalStockouts = filtered.reduce((sum, s) => sum + (s.stockout_count || 0), 0);
    const avail = totalCombos > 0
      ? Math.round((100 - (totalStockouts / totalCombos) * 100) * 10) / 10
      : 100;

    return {
      hasStoreFilter: hasFilter,
      filteredStoreList: filtered,
      storeFc: fc,
      storeSale: sale,
      storeAchievement: ach,
      storeStock: stock,
      storeStockoutCount: stockoutCount,
      storeAvailability: avail
    };
  }, [store_performances, filters]);

  // 3. Memoized High-Level KPI Values & Pro-rata Forecast
  const {
    totalFc,
    totalSale,
    achievementRate,
    effectiveAvailability,
    availabilitySubtext,
    projectedAchievement,
    dailyRunRate,
    totalDays
  } = useMemo(() => {
    const fc = hasPromoFilter
      ? (viewMode === 'PCS' ? promoFc : promoFc * PRICE_MULTIPLIER)
      : hasStoreFilter
      ? (viewMode === 'PCS' ? storeFc : storeFc * PRICE_MULTIPLIER)
      : (viewMode === 'PCS' 
          ? (kpi_cards.total_forecast || 0) 
          : ((kpi_cards.total_forecast_azn && kpi_cards.total_forecast_azn > 0) ? kpi_cards.total_forecast_azn : (kpi_cards.total_forecast || 0) * PRICE_MULTIPLIER));

    const sale = hasPromoFilter
      ? (viewMode === 'PCS' ? promoSale : promoSale * PRICE_MULTIPLIER)
      : hasStoreFilter
      ? (viewMode === 'PCS' ? storeSale : storeSale * PRICE_MULTIPLIER)
      : (viewMode === 'PCS' ? (kpi_cards.total_sales || 0) : (kpi_cards.total_sales || 0) * PRICE_MULTIPLIER);

    const achRate = hasPromoFilter
      ? Math.round(promoAchievement * 10) / 10
      : hasStoreFilter
      ? Math.round(storeAchievement * 10) / 10
      : (kpi_cards.achievement_pct || 0);

    const effStock = hasPromoFilter ? promoStock : (hasStoreFilter ? storeStock : (kpi_cards.total_stock || 0));
    const effStockoutCount = hasPromoFilter ? promoStockoutCount : (hasStoreFilter ? storeStockoutCount : (kpi_cards.stockout_stores_count || 0));

    const baseAvailability = Number(kpi_cards.availability_pct ?? (100 - (kpi_cards.stockout_rate_pct || 0)));
    const effAvailability = hasPromoFilter
      ? promoAvailability
      : hasStoreFilter
      ? storeAvailability
      : baseAvailability;

    const soSubtext = hasPromoFilter
      ? (filters?.selectedProduct || (filters?.selectedProducts && filters.selectedProducts.length === 1)
          ? `Stokout: ${promoFilteredProducts[0]?.stockout_store_count || 0} mğ.`
          : `Stokout: ${effStockoutCount} məhsul`)
      : hasStoreFilter
      ? `Stokout: ${effStockoutCount} mğ.`
      : `Stokout: ${kpi_cards.stockout_stores_count || 0} mğ.`;

    const avSubtext = hasPromoFilter
      ? `OSA (${promoFilteredProducts.length} məhsul üzrə)`
      : hasStoreFilter
      ? `OSA (${filteredStoreList.length} mağaza üzrə)`
      : "Total Mağaza Mövcudluğu (OSA)";

    // Pro-rata & Projection calculation using actual campaign dates when available
    const activeCampaign = campaigns?.find((c) => c.is_active) || campaigns?.find((c) => c.id === activeCampaignId) || campaigns?.[0];
    let calculatedDuration = 14;
    let calculatedElapsed = 1;
    if (activeCampaign?.beg_date && activeCampaign?.end_date) {
      const b = new Date(activeCampaign.beg_date);
      const e = new Date(activeCampaign.end_date);
      if (!isNaN(b.getTime()) && !isNaN(e.getTime())) {
        calculatedDuration = Math.max(1, Math.round((e.getTime() - b.getTime()) / (1000 * 3600 * 24)) + 1);
        const today = new Date();
        if (today < b) {
          calculatedElapsed = 1;
        } else if (today > e) {
          calculatedElapsed = calculatedDuration;
        } else {
          calculatedElapsed = Math.max(1, Math.round((today.getTime() - b.getTime()) / (1000 * 3600 * 24)) + 1);
        }
      }
    } else if ((daily_summaries || []).length > 0) {
      calculatedDuration = daily_summaries.length;
      calculatedElapsed = daily_summaries.length;
    }

    const totalDays = calculatedDuration;
    const daysPassed = calculatedElapsed;
    const dailyRunRate = sale / Math.max(daysPassed, 1);
    const projFinal = dailyRunRate * totalDays;
    const projAch = fc > 0 ? (projFinal / fc * 100) : 0;

    return {
      totalFc: fc,
      totalSale: sale,
      achievementRate: achRate,
      effectiveStock: effStock,
      effectiveStockoutCount: effStockoutCount,
      effectiveAvailability: effAvailability,
      stockoutSubtext: soSubtext,
      availabilitySubtext: avSubtext,
      projectedFinalSales: projFinal,
      projectedAchievement: projAch,
      dailyRunRate,
      totalDays
    };
  }, [
    hasPromoFilter, promoFc, promoSale, promoAchievement, promoStock, promoStockoutCount, promoAvailability, promoFilteredProducts,
    hasStoreFilter, storeFc, storeSale, storeAchievement, storeStock, storeStockoutCount, storeAvailability, filteredStoreList,
    kpi_cards, viewMode, PRICE_MULTIPLIER, campaigns, activeCampaignId, daily_summaries, filters
  ]);

  // 4. Reactive Filtered Daily Sales Series from Server & Zero-Latency Fallback
  useEffect(() => {
    if (!hasPromoFilter && !hasStoreFilter) {
      setFilteredDailySales(null);
      return;
    }

    const controller = new AbortController();
    const fetchDailySales = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.selectedCategories && filters.selectedCategories.length > 0) {
          filters.selectedCategories.forEach(c => params.append('category', c));
        } else if (filters.selectedCategory && filters.selectedCategory !== 'ALL') {
          params.append('category', filters.selectedCategory);
        }

        if (filters.selectedFamilies && filters.selectedFamilies.length > 0) {
          filters.selectedFamilies.forEach(f => params.append('family', f));
        } else if (filters.selectedFamily && filters.selectedFamily !== 'ALL') {
          params.append('family', filters.selectedFamily);
        }

        if (filters.selectedProducts && filters.selectedProducts.length > 0) {
          filters.selectedProducts.forEach(p => params.append('product', p));
        } else if (filters.selectedProduct) {
          params.append('product', filters.selectedProduct);
        }

        if (filters.selectedPromoTypes && filters.selectedPromoTypes.length > 0) {
          filters.selectedPromoTypes.forEach(pt => params.append('promo_type', pt));
        } else if (filters.promoType && filters.promoType !== 'ALL') {
          params.append('promo_type', filters.promoType);
        }

        if (filters.selectedOrigins && filters.selectedOrigins.length > 0) {
          filters.selectedOrigins.forEach(o => params.append('origin', o));
        } else if (filters.selectedOrigin && filters.selectedOrigin !== 'ALL') {
          params.append('origin', filters.selectedOrigin);
        }

        if (filters.selectedInsertFormats && filters.selectedInsertFormats.length > 0) {
          filters.selectedInsertFormats.forEach(f => params.append('insert_format', f));
        } else if (filters.selectedInsertFormat && filters.selectedInsertFormat !== 'ALL') {
          params.append('insert_format', filters.selectedInsertFormat);
        }

        if (filters.selectedFormats && filters.selectedFormats.length > 0) {
          filters.selectedFormats.forEach(fmt => params.append('format', fmt));
        } else if (filters.selectedFormat && filters.selectedFormat !== 'ALL') {
          params.append('format', filters.selectedFormat);
        }

        if (filters.selectedStatuses && filters.selectedStatuses.length > 0) {
          filters.selectedStatuses.forEach(s => params.append('status', s));
        } else if (filters.selectedStatus && filters.selectedStatus !== 'ALL') {
          params.append('status', filters.selectedStatus);
        }

        if (filters.selectedSupplyTypes && filters.selectedSupplyTypes.length > 0) {
          filters.selectedSupplyTypes.forEach(st => params.append('supply_type', st));
        } else if (filters.selectedSupplyType && filters.selectedSupplyType !== 'ALL') {
          params.append('supply_type', filters.selectedSupplyType);
        }

        if (filters.selectedAreas && filters.selectedAreas.length > 0) {
          filters.selectedAreas.forEach(a => params.append('area', a));
        } else if (filters.selectedArea && filters.selectedArea !== 'ALL') {
          params.append('area', filters.selectedArea);
        }

        if (filters.selectedSubAreas && filters.selectedSubAreas.length > 0) {
          filters.selectedSubAreas.forEach(sa => params.append('sub_area', sa));
        } else if (filters.selectedSubArea && filters.selectedSubArea !== 'ALL') {
          params.append('sub_area', filters.selectedSubArea);
        }

        if (filters.selectedStores && filters.selectedStores.length > 0) {
          filters.selectedStores.forEach(s => params.append('store', s));
        } else if (filters.selectedStore) {
          params.append('store', filters.selectedStore);
        }

        const res = await fetch(`${API_BASE}/daily-sales?${params.toString()}`, {
          signal: controller.signal
        });
        if (res.ok) {
          const json: DailySalesRecord[] = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            setFilteredDailySales(json);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn("Filtered daily sales fetch error:", err);
        }
      }
    };

    fetchDailySales();
    return () => controller.abort();
  }, [filters, hasPromoFilter, hasStoreFilter, activeCampaignId]);

  // 5. Memoized Daily Trend & Sparkline Series (Strictly Reacts to Global Filters)
  const { dailyTrendData, sparklineSalesSeries, sparklineCumSeries, maxCumVal, lastRealIndex, hasDailySales } = useMemo(() => {
    const rawDailySales = ((data as any)?.daily_sales || (data as any)?.analytics?.daily_sales) as DailySalesRecord[] | null | undefined;
    const hasDailySales = Boolean(rawDailySales && Array.isArray(rawDailySales) && rawDailySales.length > 0);

    // If filter is active and server response arrived, use filteredDailySales.
    // Otherwise, if filter is active, immediately scale the raw series proportionally to totalSale and totalFc.
    let effectiveDailyRecords: DailySalesRecord[] | null | undefined = rawDailySales;

    if (hasPromoFilter || hasStoreFilter) {
      if (filteredDailySales && filteredDailySales.length > 0) {
        effectiveDailyRecords = filteredDailySales;
      } else if (rawDailySales && rawDailySales.length > 0) {
        // Immediate zero-latency proportional scaling while fetch completes or as offline fallback
        const globalSale = (viewMode === 'PCS' ? kpi_cards.total_sales : (kpi_cards.total_sales_azn || (kpi_cards.total_sales || 1) * PRICE_MULTIPLIER)) || 1;
        const scale = globalSale > 0 ? (totalSale / globalSale) : 0;
        let runningCum = 0;

        effectiveDailyRecords = rawDailySales.map(d => {
          if (d.daily_sale === null || d.daily_sale === undefined) {
            return { ...d, daily_sale: null, daily_amount: null, daily_pct: null, daily_amount_pct: null, cumulative_pct: null, cumulative_amount_pct: null };
          }
          const daySales = viewMode === 'PCS'
            ? Math.round((d.daily_sale * scale) * 10) / 10
            : Math.round(((d.daily_amount ?? (d.daily_sale * PRICE_MULTIPLIER)) * scale) * 10) / 10;
          runningCum += daySales;
          const cumPct = totalFc > 0 ? Math.round((runningCum / totalFc) * 1000) / 10 : 0;
          const singlePct = totalFc > 0 ? Math.round((daySales / totalFc) * 1000) / 10 : 0;

          return {
            ...d,
            daily_sale: viewMode === 'PCS' ? daySales : d.daily_sale,
            daily_amount: viewMode === 'AZN' ? daySales : d.daily_amount,
            daily_pct: singlePct,
            daily_amount_pct: singlePct,
            cumulative_pct: cumPct,
            cumulative_amount_pct: cumPct
          };
        });
      }
    }

    const baseDailyTrendData = (effectiveDailyRecords && effectiveDailyRecords.length > 0)
      ? effectiveDailyRecords.map((d, idx) => {
          const isNullDay = d.daily_sale === null || d.daily_sale === undefined;
          const daySales = isNullDay
            ? null
            : (viewMode === 'PCS' ? d.daily_sale : (d.daily_amount ?? ((d.daily_sale || 0) * PRICE_MULTIPLIER)));
          const cumPct = isNullDay
            ? null
            : (viewMode === 'PCS' ? d.cumulative_pct : (d.cumulative_amount_pct ?? d.cumulative_pct));
          const dailySinglePct = isNullDay
            ? null
            : (viewMode === 'PCS' ? d.daily_pct : (d.daily_amount_pct ?? d.daily_pct));

          return {
            date: d.date || `Gün ${idx + 1}`,
            dayIndex: d.day || idx + 1,
            dailySales: daySales !== null ? Math.round(daySales! * 10) / 10 : null,
            cumPct: cumPct !== null ? Math.round(cumPct! * 10) / 10 : null,
            dailySinglePct: dailySinglePct !== null ? Math.round(dailySinglePct! * 10) / 10 : null,
            idealProRataPct: d.ideal_pct !== null ? Math.round(d.ideal_pct! * 10) / 10 : null,
            partial: Boolean(d.partial),
            isFuture: Boolean(d.is_future)
          };
        })
      : [];

    const realCumValues = baseDailyTrendData
      .filter(d => d.cumPct !== null && d.cumPct !== undefined)
      .map(d => d.cumPct as number);
    const maxCumVal = realCumValues.length > 0 ? Math.max(...realCumValues) : 0;
    const lastRealIndex = baseDailyTrendData.map(d => d.cumPct !== null).lastIndexOf(true);
    const lastCumVal = lastRealIndex >= 0 ? baseDailyTrendData[lastRealIndex].cumPct ?? achievementRate : achievementRate;
    const remainingDays = (baseDailyTrendData.length - 1) - lastRealIndex;

    const trendData = baseDailyTrendData.map((d, idx) => {
      let projectedTrail: number | null = null;
      if (lastRealIndex >= 0) {
        if (idx === lastRealIndex) {
          projectedTrail = Number(lastCumVal);
        } else if (idx > lastRealIndex && remainingDays > 0) {
          const step = (projectedAchievement - Number(lastCumVal)) / remainingDays;
          projectedTrail = Math.round((Number(lastCumVal) + step * (idx - lastRealIndex)) * 10) / 10;
        }
      }
      return {
        ...d,
        projectedTrail
      };
    });

    const salesSeries = trendData
      .filter(d => d.dailySales !== null && d.dailySales !== undefined)
      .map(d => Number(d.dailySales) || 0);

    const cumSeries = trendData
      .filter(d => d.cumPct !== null && d.cumPct !== undefined)
      .map(d => Number(d.cumPct) || 0);

    return {
      dailyTrendData: trendData,
      sparklineSalesSeries: salesSeries,
      sparklineCumSeries: cumSeries,
      maxCumVal,
      lastRealIndex,
      hasDailySales
    };
  }, [data, viewMode, achievementRate, projectedAchievement, hasPromoFilter, hasStoreFilter, filteredDailySales, totalSale, totalFc, kpi_cards, PRICE_MULTIPLIER]);

  if (!data || !data.kpi_cards) {
    if (loading) {
      return (
        <div className="space-y-6 pb-12 text-xs">
          <div className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md">
            <Skeleton className="w-48 h-6 rounded-lg" />
            <Skeleton className="w-32 h-8 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
          <SkeletonTable rows={6} />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-md">
          <RotateCcw className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Məlumatlar Yüklənmədi</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Backend serveri ilə bağlantı qurulur və ya aktiv kampaniya təhlili yüklənir.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => refreshActiveCampaign()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Məlumatları Təkrar Yüklə</span>
          </button>
          <button
            onClick={() => loadDemoData("B")}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span>Demo Məlumatı Aç</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-xs relative">
      {/* Ambient Mesh Lighting (Soft Pastel Neon Auras) in Background */}
      <div className="pointer-events-none absolute -top-12 left-1/4 w-[480px] h-[300px] bg-gradient-to-br from-blue-500/8 via-cyan-400/5 to-transparent dark:from-blue-500/12 dark:via-cyan-400/8 dark:to-transparent rounded-full blur-[100px] -z-10" />
      <div className="pointer-events-none absolute top-72 right-10 w-[420px] h-[280px] bg-gradient-to-br from-indigo-500/6 via-purple-400/5 to-transparent dark:from-indigo-500/10 dark:via-purple-400/6 dark:to-transparent rounded-full blur-[110px] -z-10" />
      <div className="pointer-events-none absolute top-[44rem] left-8 w-[380px] h-[260px] bg-gradient-to-br from-emerald-500/6 via-teal-400/4 to-transparent dark:from-emerald-500/9 dark:via-teal-400/6 dark:to-transparent rounded-full blur-[90px] -z-10" />

      {/* Top Header & View Mode Toggle with Dynamic Animated Satış Reallaşması Widget */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
        {/* Specular Inner Edge Light */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent pointer-events-none z-20" />

        <div className="shrink-0 relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/25">
              📈
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  Satışlar & Trendlər
                  {achievementRate >= 70 && (
                    <Sparkles className="w-4 h-4 text-amber-400 fill-amber-300 animate-pulse" />
                  )}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-cyan-300 border border-blue-200/90 dark:border-cyan-800/80 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Canlı Analitika
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('section_daily_progress_sub')}</p>
            </div>
          </div>
        </div>

        {/* Executive Dynamic Luminous Progress Stream & Photon Light Tube */}
        <div className="hidden lg:flex items-center flex-1 mx-3 lg:mx-6 h-11 px-2.5 rounded-full bg-slate-900/[0.04] dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),_0_2px_12px_rgba(59,130,246,0.06)] relative overflow-hidden group transition-all duration-300 hover:border-cyan-400/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          {/* Subtle Ambient Pulse behind track */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-cyan-400/10 to-blue-600/10 animate-pulse pointer-events-none z-0" />

          {/* Background Sine Wave Guide Track SVG with Neon Gradient */}
          <div className="absolute inset-0 flex items-center px-4 pointer-events-none opacity-60 dark:opacity-40 z-0">
            <svg className="w-full h-6 overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 24">
              <defs>
                <linearGradient id="trackSineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path
                className="animate-wave-flow"
                d="M0,12 C40,4 60,20 100,12 C140,4 160,20 200,12 C240,4 260,20 300,12 C340,4 360,20 400,12"
                fill="none"
                stroke="url(#trackSineGradient)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Floating Twinkle Star Guides in Track */}
          <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none z-10">
            <SparkleStar className="w-3.5 h-3.5 text-amber-400/80 fill-amber-300/80 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] animate-float-twinkle" />
            <SparkleStar className="w-4 h-4 text-amber-500/70 fill-amber-400/70 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-float-twinkle" style={{ animationDelay: '0.4s' }} />
            <SparkleStar className="w-3 h-3 text-teal-400/80 fill-teal-300/80 drop-shadow-[0_0_5px_rgba(20,184,166,0.6)] animate-float-twinkle" style={{ animationDelay: '0.8s' }} />
            <SparkleStar className="w-4 h-4 text-cyan-400/80 fill-cyan-300/80 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-float-twinkle" style={{ animationDelay: '1.2s' }} />
            <SparkleStar className="w-3.5 h-3.5 text-blue-400/80 fill-blue-300/80 drop-shadow-[0_0_5px_rgba(96,165,250,0.6)] animate-float-twinkle" style={{ animationDelay: '1.6s' }} />
            <SparkleStar className="w-4.5 h-4.5 text-blue-500 fill-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.9)] animate-photon-pulse" style={{ animationDuration: '2.4s' }} />
          </div>

          {/* Radiant Neon Floor / Ambient Underglow Layer */}
          <div
            className="absolute left-2.5 top-2 bottom-2 rounded-full blur-md opacity-70 pointer-events-none transition-all duration-1000 ease-out z-10 bg-gradient-to-r from-amber-400 via-teal-400 via-cyan-400 to-blue-600"
            style={{ width: `calc(${Math.min(achievementRate, 100)}% - 6px)` }}
          />

          {/* Dynamic Liquid Neon Progress Tube */}
          <div
            className="h-7.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 via-teal-300 via-cyan-400 to-blue-600 animate-aurora-flow relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),_inset_0_-1px_2px_rgba(0,0,0,0.25),_0_2px_10px_rgba(6,182,212,0.35)] transition-all duration-1000 ease-out z-20 flex items-center justify-end px-1"
            style={{ width: `${Math.min(achievementRate, 100)}%` }}
          >
            {/* Upper Glass Specular Reflection Sheen */}
            <div className="absolute top-0 inset-x-2 h-[42%] bg-gradient-to-b from-white/75 via-white/20 to-transparent rounded-t-full pointer-events-none z-20" />

            {/* Primary Sweeping High-Intensity Laser Light Beam */}
            <div className="absolute inset-y-0 w-28 bg-gradient-to-r from-transparent via-white/85 to-transparent skew-x-[-22deg] animate-beam-sweep pointer-events-none z-20" />

            {/* Secondary Diffuse Radiant Light Wave (Staggered Flow) */}
            <div className="absolute inset-y-0 w-48 bg-gradient-to-r from-transparent via-cyan-200/40 via-white/70 to-transparent skew-x-[-22deg] animate-beam-sweep-delayed pointer-events-none z-20" />

            {/* Radiant Neon Leading Edge Comet Halo */}
            <div className="absolute right-0 top-1/2 w-10 h-10 -mr-2 rounded-full bg-cyan-400/50 blur-md animate-beacon-flare pointer-events-none z-10" />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white/90 blur-[2px] animate-pulse pointer-events-none z-10" />

            {/* Elevated Floating Glass Pill Badge */}
            <div className="relative z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border border-cyan-400/70 dark:border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.45),_0_2px_4px_rgba(0,0,0,0.15)] font-bold text-xs font-mono shrink-0 backdrop-blur-md">
              <SparkleStar className="w-3.5 h-3.5 text-cyan-500 fill-cyan-400 animate-photon-pulse" />
              <AnimatedCounter value={achievementRate} decimals={1} suffix="%" />
            </div>
          </div>
        </div>

        {/* View Mode Selector Toggle: Adet (Pcs) vs Tutar (₼) */}
        <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/90 dark:border-slate-700/80 space-x-1 shrink-0 relative z-10 shadow-inner">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300 px-2">{t('lbl_trend_view_mode')}</span>
          <button
            onClick={() => setViewMode('PCS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              viewMode === 'PCS'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            {t('lbl_pcs_unit')}
          </button>
          <button
            onClick={() => setViewMode('AZN')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              viewMode === 'AZN'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            {t('lbl_azn_unit')}
          </button>
        </div>
      </div>

      {/* Global Sales & Trend KPI Cards with Waveform Sparklines & Ambient Auras */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Neytral/məlumat xarakterli: Toplam Öngörü -> soft light blue */}
        <KPICard
          index={0}
          title={viewMode === 'PCS' ? t('kpi_total_forecast_pcs') : t('kpi_total_forecast_azn')}
          value={viewMode === 'PCS' ? `${Math.round(totalFc).toLocaleString()} u` : `₼ ${Math.round(totalFc).toLocaleString()}`}
          icon={TrendingUp}
          color="blue"
          variant="soft"
          subtext="Target Forecast"
          sparklineData={generateDeterministicSparkline('fc_target', totalFc, 0, 10)}
        />
        {/* Reallaşan Satış -> solid emerald */}
        <KPICard
          index={1}
          title={viewMode === 'PCS' ? t('kpi_actual_sales_pcs') : t('kpi_actual_sales_azn')}
          value={viewMode === 'PCS' ? `${Math.round(totalSale).toLocaleString()} u` : `₼ ${Math.round(totalSale).toLocaleString()}`}
          icon={Activity}
          color="emerald"
          variant="solid"
          subtext="Actual Sales"
          sparklineData={sparklineSalesSeries.length > 1 ? sparklineSalesSeries : generateDeterministicSparkline('actual_sales', totalSale, 15, 10)}
        />
        {/* Nailiyyət Faizi -> solid emerald if >=70% else amber */}
        <KPICard
          index={2}
          title={t('kpi_target_achievement')}
          value={`${achievementRate}%`}
          icon={Target}
          color={achievementRate >= 70 ? 'emerald' : 'amber'}
          variant="solid"
          subtext="Actual vs Target"
          sparklineData={sparklineCumSeries.length > 1 ? sparklineCumSeries : generateDeterministicSparkline('ach_rate', achievementRate, 20, 10)}
        />
        {/* Dövr Sonu Proqnoz -> soft emerald or amber */}
        <KPICard
          index={3}
          title={t('kpi_period_forecast')}
          value={`${projectedAchievement.toFixed(1)}%`}
          icon={Rocket}
          color={projectedAchievement >= 90 && projectedAchievement <= 110 ? 'emerald' : 'amber'}
          variant="soft"
          subtext={`Günlük Satış: ${Math.round(dailyRunRate)} u/gün`}
          sparklineData={generateDeterministicSparkline('projected_ach', projectedAchievement, 12, 10)}
        />

        {/* Ort. Mövcudluq -> soft blue or rose */}
        <KPICard
          index={4}
          title={t('kpi_avg_availability')}
          value={`${effectiveAvailability.toFixed(1)}%`}
          icon={Store}
          color={effectiveAvailability >= 85 ? 'blue' : 'rose'}
          variant="soft"
          subtext={availabilitySubtext}
          sparklineData={generateDeterministicSparkline('effective_osa', effectiveAvailability, 3, 10)}
        />
      </div>

      {/* 1. Hedefe Doğru Günlük Gerçekleşme (Neon Glow Chart with Radar Pulsing Milestone & Ghost Projection Trail) */}
      <div className={`p-6 rounded-2xl border shadow-xl space-y-4 card-hover relative overflow-hidden transition-all duration-300 luminous-border-blue ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 shadow-slate-950/60'
          : 'bg-gradient-to-b from-white via-white to-blue-50/20 border-blue-200/80 shadow-blue-500/10'
      }`}>
        {/* Top delicate luminous blue accent line */}
        <div className="absolute top-0 inset-x-0 h-[2px] luminous-line-blue z-20" />

        {/* Specular Inner Edge Light */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/80 dark:via-cyan-400/40 to-transparent pointer-events-none z-20" />

        {/* Subtle Ambient Background Light Stream */}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
          isDark
            ? 'bg-gradient-to-br from-blue-600/15 via-cyan-500/10 to-transparent'
            : 'bg-gradient-to-br from-blue-500/10 via-emerald-400/5 to-transparent animate-pulse'
        }`} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <h3 className="text-base font-black tracking-tight bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 dark:from-sky-300 dark:via-blue-200 dark:to-white bg-clip-text text-transparent flex items-center gap-2 drop-shadow-[0_1px_4px_rgba(20,121,232,0.25)] flex-wrap">
              {t('section_daily_progress_title')}
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-black border border-blue-300/80 dark:border-blue-700/60 shadow-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                {totalDays} Günlük Trend
              </span>
              {(hasPromoFilter || hasStoreFilter) && (
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-100/90 dark:bg-cyan-950/90 text-cyan-800 dark:text-cyan-300 text-[10px] font-black border border-cyan-400/80 dark:border-cyan-700/80 shadow-xs flex items-center gap-1 animate-pulse">
                  <span>🎯</span>
                  <span>Filter Tətbiq Edilib</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">{t('section_daily_progress_sub')}</p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-black text-amber-900 dark:text-amber-200 bg-amber-50/90 dark:bg-amber-950/80 px-3 py-1 rounded-xl border border-amber-400/70 dark:border-amber-500/60 shadow-xs flex items-center gap-1.5 luminous-cell-amber">
              🏆 Max: <strong className="text-amber-600 dark:text-amber-300 font-extrabold"><AnimatedCounter value={maxCumVal} suffix="%" /></strong>
            </span>
            <span className="text-xs font-black text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-950/80 px-3 py-1 rounded-xl border border-blue-300/80 dark:border-blue-700/60 shadow-xs">
              {viewMode === 'PCS' ? t('lbl_view_pcs') : t('lbl_view_azn')}
            </span>
          </div>
        </div>

        {!hasDailySales ? (
          <div className="h-72 w-full flex flex-col items-center justify-center bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center relative z-10">
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 mb-3 shadow-inner">
              <CalendarX className="w-8 h-8 text-slate-400 stroke-[2]" />
            </div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('lbl_daily_data_empty_title')}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{t('lbl_daily_data_empty_sub')}</p>
          </div>
        ) : (
          <div className="h-96 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyTrendData} margin={{ top: 35, right: 65, left: 10, bottom: 10 }}>
                <defs>
                  {/* Neon Blue Area Gradient */}
                  <linearGradient id="cumNeonGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.48} />
                    <stop offset="45%" stopColor="#3b82f6" stopOpacity={0.20} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Daily Emerald Area Gradient */}
                  <linearGradient id="dailyEmeraldArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Ghost Projection Trail Area Gradient */}
                  <linearGradient id="ghostAreaCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.20} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Neon Line Glow Filters */}
                  <filter id="neonGlowBlue" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComponentTransfer in="blur" result="glow">
                      <feFuncA type="linear" slope="0.8" />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <filter id="neonGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComponentTransfer in="blur" result="glow">
                      <feFuncA type="linear" slope="0.75" />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <filter id="neonGlowEmerald" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComponentTransfer in="blur" result="glow">
                      <feFuncA type="linear" slope="0.75" />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeOpacity={0.7} />
                <XAxis 
                  dataKey="date" 
                  stroke={isDark ? '#475569' : '#64748b'} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: isDark ? '#94a3b8' : '#64748b' }}
                  tickFormatter={(val: string) => {
                    if (!val) return '';
                    const parts = String(val).split('-');
                    return parts.length === 3 ? `${parts[2]}.${parts[1]}` : val;
                  }}
                />
                <YAxis
                  stroke={isDark ? '#475569' : '#64748b'}
                  tick={{ fontSize: 11, fontWeight: 700, fill: isDark ? '#94a3b8' : '#64748b' }}
                  unit="%"
                  domain={[0, (dataMax: number) => Math.max(100, Math.ceil((dataMax || 100) * 1.05))]}
                />
                <Tooltip
                  cursor={{ stroke: '#06b6d4', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0]?.payload;
                    if (!item) return null;

                    const cumDiff = (item.cumPct !== null && item.idealProRataPct !== null)
                      ? Math.round((item.cumPct - item.idealProRataPct) * 10) / 10
                      : null;

                    return (
                      <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-xl p-4 rounded-2xl border border-cyan-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.35)] text-xs space-y-2.5 min-w-[240px]">
                        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            <span className="font-extrabold text-white text-[13px] tracking-wide">
                              {item.date}
                            </span>
                          </div>
                          {item.partial ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/50">
                              ⚠️ {t('lbl_partial_day')}
                            </span>
                          ) : item.isFuture ? (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/50">
                              📡 Proqnoz
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/50">
                              📊 İcra
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 pt-0.5">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {viewMode === 'PCS' ? 'Gündəlik Satış:' : 'Gündəlik Məbləğ:'}
                            </span>
                            <span className="font-extrabold text-white text-[13px]">
                              {item.dailySales !== null && item.dailySales !== undefined
                                ? `${item.dailySales.toLocaleString()} ${viewMode === 'PCS' ? 'ədəd' : '₼'}`
                                : '—'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Gündəlik %:
                            </span>
                            <span className="font-black text-emerald-300 text-[13px]">
                              {item.dailySinglePct !== null && item.dailySinglePct !== undefined ? `${item.dailySinglePct}%` : '—'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              Kümülyativ %:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-cyan-300 text-[13px]">
                                {item.cumPct !== null && item.cumPct !== undefined ? `${item.cumPct}%` : '—'}
                              </span>
                              {cumDiff !== null && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  cumDiff >= 0
                                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                }`}>
                                  {cumDiff >= 0 ? `+${cumDiff}%` : `${cumDiff}%`}
                                </span>
                              )}
                            </div>
                          </div>

                          {item.projectedTrail !== null && item.isFuture && (
                            <div className="flex items-center justify-between">
                              <span className="text-sky-400 font-bold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                Proqnoz Runway:
                              </span>
                              <span className="font-black text-sky-300 text-[13px]">
                                {item.projectedTrail}%
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-slate-700/80 pt-2 text-slate-400">
                            <span className="font-medium flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                              {t('legend_ideal_plan')}:
                            </span>
                            <span className="font-bold text-slate-300">
                              {item.idealProRataPct !== null && item.idealProRataPct !== undefined ? `${item.idealProRataPct}%` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 800 }}
                  formatter={(value) => <span className="text-slate-700 dark:text-slate-200 font-bold">{value}</span>}
                />

                {/* 🎯 100% Target Milestone Reference Line */}
                <ReferenceLine
                  y={100}
                  stroke={isDark ? '#10b981' : '#059669'}
                  strokeDasharray="6 6"
                  strokeWidth={2}
                  label={{
                    value: '🎯 100% Hədəf Xətti',
                    fill: isDark ? '#34d399' : '#059669',
                    fontSize: 11,
                    fontWeight: 900,
                    position: 'insideTopLeft'
                  }}
                />

                {/* 1. İdeal plan (pro-rata) series - dashed gray line over full campaign */}
                <Line
                  type="monotone"
                  dataKey="idealProRataPct"
                  stroke={isDark ? '#475569' : '#94a3b8'}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name={t('legend_ideal_plan')}
                  dot={{ r: 3, fill: isDark ? '#64748b' : '#94a3b8', stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: isDark ? '#94a3b8' : '#64748b', stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 2 }}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                
                {/* 2. Vibrant Illuminated Area Gradient under Cumulative Trend */}
                <Area
                  type="monotone"
                  dataKey="cumPct"
                  fill="url(#cumNeonGlow)"
                  stroke="none"
                  legendType="none"
                  tooltipType="none"
                  connectNulls={false}
                />

                {/* 3. Soft Gradient under Single Daily Progress */}
                <Area
                  type="monotone"
                  dataKey="dailySinglePct"
                  fill="url(#dailyEmeraldArea)"
                  stroke="none"
                  legendType="none"
                  tooltipType="none"
                  connectNulls={false}
                />

                {/* 4. Ghost Projection Runway (Future Days Proqnoz Trayektoriyası) */}
                <Line
                  type="monotone"
                  dataKey="projectedTrail"
                  stroke={isDark ? '#38bdf8' : '#0284c7'}
                  strokeWidth={2.8}
                  strokeDasharray="5 5"
                  name="Proqnoz Trayektoriyası (Ghost Projection)"
                  filter="url(#neonGlowCyan)"
                  dot={(props: any) => {
                    const { cx, cy, value, index } = props;
                    if (cx === undefined || cy === undefined || value === null || value === undefined) return null;
                    const isFinal = index === dailyTrendData.length - 1;
                    return (
                      <g key={`ghost-dot-${index}`}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isFinal ? 5.5 : 3.5}
                          fill={isDark ? '#0284c7' : '#38bdf8'}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                      </g>
                    );
                  }}
                  activeDot={{ r: 7, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                  connectNulls={true}
                  isAnimationActive={true}
                  animationDuration={1500}
                />

                {/* 5. Cumulative Progress Line with Radar Pulsing Milestone on Current Day */}
                <Line
                  type="monotone"
                  dataKey="cumPct"
                  stroke="#1479e8"
                  strokeWidth={3.8}
                  strokeDasharray="12 6"
                  className="animate-line-stroke-flow"
                  filter="url(#neonGlowBlue)"
                  connectNulls={false}
                  dot={(props: any) => {
                    const { cx, cy, value, payload, index } = props;
                    if (cx === undefined || cy === undefined || value === null || value === undefined) return null;
                    const isCurrent = index === lastRealIndex;
                    const isPartial = payload?.partial;
                    return (
                      <g key={`dot-blue-${index}`}>
                        {isCurrent && (
                          <>
                            {/* Concentric Pulsing Radar Rings on Current Date Milestone */}
                            <circle cx={cx} cy={cy} r={22} fill="#06b6d4" opacity={0.25} className="animate-ping" />
                            <circle cx={cx} cy={cy} r={14} fill="#3b82f6" opacity={0.35} className="animate-pulse" />
                          </>
                        )}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isCurrent ? 7.5 : 5}
                          fill={isPartial ? '#ffffff' : '#06b6d4'}
                          stroke="#1479e8"
                          strokeWidth={isPartial ? 3 : 2.5}
                          filter="url(#neonGlowBlue)"
                        />
                        {isCurrent && (
                          <circle cx={cx} cy={cy} r={2.5} fill="#ffffff" />
                        )}
                      </g>
                    );
                  }}
                  activeDot={{ r: 9, fill: '#38bdf8', strokeWidth: 3, stroke: '#ffffff' }}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  name={t('legend_cumulative_pct')}
                  label={(props: any) => {
                    const { x, y, value, index } = props;
                    if (x === undefined || y === undefined || value === null || value === undefined) return null;
                    const isCurrent = index === lastRealIndex;
                    if (isCurrent) {
                      return (
                        <g key={index}>
                          <rect x={x - 48} y={y - 34} width="96" height="24" rx="12" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" filter="url(#neonGlowBlue)" className="shadow-lg" />
                          <circle cx={x - 34} cy={y - 22} r="3" fill="#ffffff" className="animate-ping" />
                          <circle cx={x - 34} cy={y - 22} r="2.2" fill="#a5f3fc" />
                          <text x={x + 4} y={y - 18} fill="#ffffff" fontSize={10.5} fontWeight="900" textAnchor="middle">
                            Cari: {value}%
                          </text>
                        </g>
                      );
                    }
                    return (
                      <text key={index} x={x} y={y - 12} fill={isDark ? '#60a5fa' : '#0c4ea4'} fontSize={11} fontWeight="800" textAnchor="middle">
                        {value}%
                      </text>
                    );
                  }}
                />

                {/* 6. Günlük Tekil İlerleme % Line */}
                <Line
                  type="monotone"
                  dataKey="dailySinglePct"
                  stroke="#10b981"
                  strokeWidth={3.5}
                  strokeDasharray="10 5"
                  className="animate-line-stroke-flow"
                  filter="url(#neonGlowEmerald)"
                  connectNulls={false}
                  dot={(props: any) => {
                    const { cx, cy, value, payload, index } = props;
                    if (cx === undefined || cy === undefined || value === null || value === undefined) return null;
                    const isPartial = payload?.partial;
                    return (
                      <g key={`dot-emerald-${index}`}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={isPartial ? '#ffffff' : '#10b981'}
                          stroke="#10b981"
                          strokeWidth={isPartial ? 3 : 2.5}
                          filter="url(#neonGlowEmerald)"
                        />
                      </g>
                    );
                  }}
                  activeDot={{ r: 8, fill: '#34d399', strokeWidth: 3, stroke: '#ffffff' }}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  name={t('legend_daily_single_pct')}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
