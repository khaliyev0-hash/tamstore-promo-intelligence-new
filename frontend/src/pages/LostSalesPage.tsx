import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import {
  PackageX, TrendingDown, TrendingUp, AlertTriangle, ShieldCheck, HelpCircle,
  Download, RefreshCw, Search, ChevronRight, ChevronDown, ChevronUp,
  Store, Package, Layers, MapPin, X, Calendar, Percent, CheckCircle2,
  AlertCircle, ArrowUpDown, ChevronLeft
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine, Area
} from 'recharts';
import * as XLSX from 'xlsx';
import { AnimatedCounter } from '../components/common/AnimatedCounter';
import { SpotlightCard } from '../components/common/SpotlightCard';

interface LostSalesSummary {
  active_pairs: number;
  stockout_pairs: number;
  stockout_days: number;
  sale: number;
  lost_units: number;
  lost_revenue: number | null;
  high_confidence_lost_units: number;
  low_confidence_lost_units: number;
  high_confidence_pct: number;
  avg_stockout_days: number;
  lost_pct: number;
  not_ranged_pairs: number;
  daily_trend: Array<{
    date: string;
    day: number;
    lost_units: number;
    sale_units: number;
  }>;
}

interface PairDetail {
  store: string;
  code: string;
  name: string;
  category?: string;
  area?: string;
  rate: number;
  method: string;
  confidence: string;
  stockout_days: number;
  lost_units: number;
  price: number | null;
  lost_revenue: number | null;
  daily_lost: number[];
  stocks: (number | null)[];
  sales: (number | null)[];
  dates: string[];
}

export const LostSalesPage: React.FC = () => {
  const { t, activeCampaignId, campaigns } = useData();
  const [activeTab, setActiveTab] = useState<'store' | 'product' | 'category' | 'area'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('subtab');
      if (p === 'category' || p === 'area' || p === 'product' || p === 'store') return p;
    }
    return 'store';
  });
  const [state, setState] = useState<'loading' | 'computing' | 'ready' | 'unavailable'>('loading');
  const [summary, setSummary] = useState<LostSalesSummary | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [topWorstPairs, setTopWorstPairs] = useState<any[]>([]);
  const [activePairsCount, setActivePairsCount] = useState<number>(0);
  const [notRangedCount, setNotRangedCount] = useState<number>(0);
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);

  // Table & Tree State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(50);
  const [sortBy, setSortBy] = useState<string>('lost_revenue');
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [tableItems, setTableItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  // Drill-down Modal State
  const [selectedPair, setSelectedPair] = useState<PairDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
  const [modalStorePairs, setModalStorePairs] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState<string>('');

  const activeCampaign = campaigns?.find((c) => c.id === activeCampaignId) || campaigns?.[0];

  // 1. Fetch summary & status
  const fetchSummary = useCallback(async () => {
    try {
      const cidParam = activeCampaignId ? `?campaign_id=${activeCampaignId}` : '';
      const res = await fetch(`http://127.0.0.1:8000/api/lost-sales/summary${cidParam}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      if (data.state === 'computing') {
        setState('computing');
      } else if (data.state === 'ready') {
        setState('ready');
        setSummary(data.summary);
        setDates(data.dates || []);
        setTopWorstPairs(data.top_worst_pairs || []);
        setActivePairsCount(data.active_pairs || 0);
        setNotRangedCount(data.not_ranged_pairs || 0);
      } else {
        setState('unavailable');
      }
    } catch (e) {
      console.error('Error fetching lost sales summary:', e);
      setState('unavailable');
    }
  }, [activeCampaignId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Polling when computing
  useEffect(() => {
    if (state !== 'computing') return;
    const interval = setInterval(() => {
      fetchSummary();
    }, 3000);
    return () => clearInterval(interval);
  }, [state, fetchSummary]);

  // 2. Fetch Tab Groups (Store / Product / Category / Area)
  const fetchGroups = useCallback(async () => {
    if (state === 'computing' || state === 'unavailable') return;
    setIsDataLoading(true);
    try {
      const cidParam = activeCampaignId ? `&campaign_id=${activeCampaignId}` : '';
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const url = `http://127.0.0.1:8000/api/lost-sales/groups?dimension=${activeTab}&page=${page}&limit=${pageSize}&sort_by=${sortBy}&sort_desc=${sortDesc}${searchParam}${cidParam}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Group API error');
      const data = await res.json();

      if (data.state === 'ready') {
        if (activeTab === 'category' || activeTab === 'area') {
          setTreeData(data.tree || []);
        } else {
          setTableItems(data.items || []);
          setTotalCount(data.total || 0);
        }
      }
    } catch (e) {
      console.error('Error fetching lost sales groups:', e);
    } finally {
      setIsDataLoading(false);
    }
  }, [state, activeTab, page, pageSize, sortBy, sortDesc, searchTerm, activeCampaignId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Handle recompute
  const handleRecompute = async () => {
    try {
      setState('computing');
      const cidParam = activeCampaignId ? `?campaign_id=${activeCampaignId}` : '';
      await fetch(`http://127.0.0.1:8000/api/lost-sales/recompute${cidParam}`, { method: 'POST' });
      fetchSummary();
    } catch (e) {
      console.error('Error triggering recompute:', e);
    }
  };

  // Open drill-down for a pair
  const handleOpenPair = async (store: string, code: string, customTitle?: string) => {
    setIsModalLoading(true);
    setIsModalOpen(true);
    setModalTitle(customTitle || `Mağaza ${store} – Kod ${code}`);
    try {
      const cidParam = activeCampaignId ? `&campaign_id=${activeCampaignId}` : '';
      const res = await fetch(`http://127.0.0.1:8000/api/lost-sales/pair?store=${encodeURIComponent(store)}&code=${encodeURIComponent(code)}${cidParam}`);
      if (!res.ok) throw new Error('Pair API error');
      const data = await res.json();
      if (data.state === 'ready') {
        setSelectedPair(data.pair);
      }
    } catch (e) {
      console.error('Error loading pair detail:', e);
    } finally {
      setIsModalLoading(false);
    }
  };

  useEffect(() => {
    if (state === 'ready' && typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const st = p.get('drill_store');
      const cd = p.get('drill_code');
      if (st && cd) {
        handleOpenPair(st, cd);
      }
    }
  }, [state]);

  // Open drill-down for a store row (shows worst pairs for that store)
  const handleStoreClick = async (storeItem: any) => {
    setModalTitle(`Mağaza: ${storeItem.store} (${storeItem.area || ''})`);
    setIsModalOpen(true);
    setIsModalLoading(true);
    setSelectedPair(null);
    setModalStorePairs([]);
    try {
      const cidParam = activeCampaignId ? `&campaign_id=${activeCampaignId}` : '';
      const res = await fetch(`http://127.0.0.1:8000/api/lost-sales/pairs?store=${encodeURIComponent(storeItem.store)}${cidParam}`);
      if (res.ok) {
        const data = await res.json();
        const pairs = data.pairs || [];
        setModalStorePairs(pairs);
        if (pairs.length > 0) {
          setSelectedPair(pairs[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching store pairs:', e);
    } finally {
      setIsModalLoading(false);
    }
  };

  // Open drill-down for a product row (shows worst stores for that product)
  const handleProductClick = async (productItem: any) => {
    setModalTitle(`Məhsul: ${productItem.code} – ${productItem.name}`);
    setIsModalOpen(true);
    setIsModalLoading(true);
    setSelectedPair(null);
    setModalStorePairs([]);
    try {
      const cidParam = activeCampaignId ? `&campaign_id=${activeCampaignId}` : '';
      const res = await fetch(`http://127.0.0.1:8000/api/lost-sales/pairs?code=${encodeURIComponent(productItem.code)}${cidParam}`);
      if (res.ok) {
        const data = await res.json();
        const pairs = data.pairs || [];
        setModalStorePairs(pairs);
        if (pairs.length > 0) {
          setSelectedPair(pairs[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching product pairs:', e);
    } finally {
      setIsModalLoading(false);
    }
  };

  // Switch active pair inside drill-down modal
  const handleSelectModalPair = (pairItem: any) => {
    if (pairItem.stocks && pairItem.sales && pairItem.dates) {
      setSelectedPair(pairItem);
    } else {
      handleOpenPair(pairItem.store, pairItem.code, modalTitle);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (activeTab === 'store' || activeTab === 'product') {
      const exportRows = tableItems.map((r) => {
        if (activeTab === 'store') {
          return {
            'Mağaza Kodu': r.store,
            'Area': r.area || '–',
            'Sub Area': r.sub_area || '–',
            'Məhsul Sayı': r.product_count,
            'Satış (ədəd)': r.sale,
            'İtirilmiş Satış (ədəd)': r.lost_units,
            'İtirilmiş Gəlir (AZN)': r.lost_revenue ?? '–',
            'İtki %': `${r.lost_pct}%`,
            'Stokout Cütləri': r.stockout_pairs,
            'Stokout Günləri': r.stockout_days
          };
        } else {
          return {
            'Kod': r.code,
            'Ad': r.name,
            'Kateqoriya': r.category || '–',
            'Sub Kateqoriya': r.sub_category || '–',
            'Family': r.family || '–',
            'Orta Qiymət (AZN)': r.price ?? '–',
            'Mağaza Sayı': r.store_count,
            'Satış (ədəd)': r.sale,
            'İtirilmiş Satış (ədəd)': r.lost_units,
            'İtirilmiş Gəlir (AZN)': r.lost_revenue ?? '–',
            'İtki %': `${r.lost_pct}%`,
            'Stokout Cütləri': r.stockout_pairs
          };
        }
      });
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Lost_Sales_${activeTab}`);
      XLSX.writeFile(wb, `Lost_Sales_${activeTab}_${activeCampaignId || 'Campaign'}.xlsx`);
    } else {
      // Tree export flattening
      const flatRows: any[] = [];
      const flatten = (nodes: any[], prefix = '') => {
        for (const n of nodes) {
          flatRows.push({
            'Qrup / Səviyyə': prefix + n.name,
            'Səviyyə': n.level,
            'Satış (ədəd)': n.sale,
            'İtirilmiş Satış (ədəd)': n.lost_units,
            'İtirilmiş Gəlir (AZN)': n.lost_revenue ?? '–',
            'İtki %': `${n.lost_pct}%`,
            'Stokout Cütləri': n.stockout_pairs,
            'Stokout Günləri': n.stockout_days
          });
          if (n.children && n.children.length > 0) {
            flatten(n.children, prefix + '  -- ');
          }
        }
      };
      flatten(treeData);
      const ws = XLSX.utils.json_to_sheet(flatRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Lost_Sales_${activeTab}`);
      XLSX.writeFile(wb, `Lost_Sales_${activeTab}_${activeCampaignId || 'Campaign'}.xlsx`);
    }
  };

  // Toggle tree node expansion
  const toggleNode = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Sort change helper
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(field);
      setSortDesc(true);
    }
    setPage(1);
  };

  // Precomputed chart data for pair modal
  const pairChartData = useMemo(() => {
    if (!selectedPair || !selectedPair.dates) return [];
    return selectedPair.dates.map((dt, idx) => {
      const stk = selectedPair.stocks[idx];
      const sl = selectedPair.sales[idx];
      const lst = selectedPair.daily_lost[idx] || 0.0;
      const isStockout = stk !== null && stk === 0;
      return {
        date: dt.slice(5),
        fullDate: dt,
        stock: stk !== null ? stk : 0,
        sales: sl !== null ? sl : 0,
        lost: lst,
        rate: selectedPair.rate,
        isStockout
      };
    });
  }, [selectedPair]);

  // Loading skeleton state
  if (state === 'loading') {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={`skel-card-${i}`} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>
        <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  // Unavailable State (Not Computed for old archive)
  if (state === 'unavailable') {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-500">
          <PackageX className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          İtirilmiş Satışlar Hesablanmayıb
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md text-center">
          Bu kampaniya üçün itirilmiş satış göstəriciləri hələ hesablanmayıb. Aşağıdakı düyməyə klikləyərək hesablamanı başladın.
        </p>
        <button
          onClick={handleRecompute}
          className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md font-medium text-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Hesablamanı Başlat</span>
        </button>
      </div>
    );
  }

  // Computing State
  if (state === 'computing') {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-500 animate-spin">
          <RefreshCw className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          İtirilmiş Satışlar Hesablanır...
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md text-center">
          Bütün mağaza və məhsul cütlükləri üzrə günlük qalıq stoku və satış tempoları emal olunur. Zəhmət olmasa gözləyin.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto transition-colors duration-200">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <PackageX className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Lost Sales (İtirilmiş Satışlar)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kampaniya dövründə stok tükənməsi səbəbilə buraxılmış satış həcmi və gəlir itkisi analizi
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-2xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
            <span>Necə hesablanır?</span>
            {showHowItWorks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel-ə İxrac</span>
          </button>

          <button
            onClick={handleRecompute}
            title="Yenidən hesabla"
            className="p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Methodology Collapsible Card */}
      {showHowItWorks && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 via-slate-50/60 to-indigo-50/80 dark:from-slate-900 dark:via-slate-900/80 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-900/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Metodologiya və Hesablama Prinsipləri</span>
            </h3>
            <span className="text-[11px] font-mono bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
              Pəncərə: {dates[0]} — {dates[dates.length - 1]}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 shadow-2xs">
              <span className="font-bold text-blue-600 dark:text-blue-400 block">1. Satış Temposu (Rate) & Etibarlılıq</span>
              <p>
                <strong>Tempo:</strong> Stok mövcud olan (qalıq stok &gt; 0) günlərin orta gündəlik satışıdır.
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                <li>≥ 3 stoklu gün: <strong>Yüksək etibarlılıq</strong></li>
                <li>1–2 stoklu gün: <strong>Aşağı etibarlılıq</strong></li>
                <li>0 stoklu gün amma aktiv: <strong>FC / N gün</strong> tempi (Aşağı)</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 shadow-2xs">
              <span className="font-bold text-rose-600 dark:text-rose-400 block">2. İtirilmiş Say & Gəlir Formulu</span>
              <p>
                Hər stokout günü d (qalıq stok = 0) üçün:
              </p>
              <code className="block bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-[11px] font-mono text-rose-600 dark:text-rose-400">
                lost_units(d) = max(0, rate - sales_d)
              </code>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                <strong>Qiymət:</strong> Cütlüyün faktiki orta satış qiyməti (və ya şəbəkə üzrə orta qiymət). Gəlir = İtirilmiş say × Qiymət.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 shadow-2xs">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 block">3. Stokout Analizindən Fərqi</span>
              <p>
                <strong>Stokout Analizi:</strong> Kampaniyanın ən son günündəki (bugünkü) qalıq stokun 0 olmasını statik əks etdirir.
              </p>
              <p>
                <strong>Lost Sales:</strong> Bütün kampaniya günləri üzrə stoku izləyir və günbəgün buraxılmış real həcmi və pul itkisini kumulyativ hesablayır.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards (6 KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Lost Units */}
        <SpotlightCard className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              İtirilmiş Say
            </span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <PackageX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            <AnimatedCounter value={summary?.lost_units || 0} decimals={0} />
            <span className="text-xs font-medium text-slate-400 ml-1">ədəd</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Yüksək etibarlı: {Math.round(summary?.high_confidence_lost_units || 0).toLocaleString()}
          </div>
        </SpotlightCard>

        {/* KPI 2: Lost Revenue */}
        <SpotlightCard className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              İtirilmiş Gəlir
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            {summary?.lost_revenue !== null && summary?.lost_revenue !== undefined ? (
              <>
                <AnimatedCounter value={summary.lost_revenue} decimals={0} />
                <span className="text-xs font-medium text-slate-400 ml-1">₼</span>
              </>
            ) : (
              <span>–</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Ort. itki: {summary?.stockout_pairs ? Math.round((summary.lost_revenue || 0) / summary.stockout_pairs) : 0} ₼/cüt
          </div>
        </SpotlightCard>

        {/* KPI 3: Lost % */}
        <SpotlightCard className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              İtki %
            </span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            <AnimatedCounter value={summary?.lost_pct || 0} decimals={2} />%
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            İtirilmiş / (Satış + İtirilmiş)
          </div>
        </SpotlightCard>

        {/* KPI 4: Stockout Pairs */}
        <SpotlightCard className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Stokout Cütləri
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            <AnimatedCounter value={summary?.stockout_pairs || 0} decimals={0} />
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            {activePairsCount > 0 ? ((summary?.stockout_pairs || 0) / activePairsCount * 100).toFixed(1) : 0}% aktiv cütlük
          </div>
        </SpotlightCard>

        {/* KPI 5: Avg Stockout Days */}
        <SpotlightCard className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Orta Stokout Günü
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            <AnimatedCounter value={summary?.avg_stockout_days || 0} decimals={1} />
            <span className="text-xs font-medium text-slate-400 ml-1">gün</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Toplam {summary?.stockout_days?.toLocaleString()} gün
          </div>
        </SpotlightCard>

        {/* KPI 6: High Confidence % */}
        <SpotlightCard className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Yüksək Etibarlılıq
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            <AnimatedCounter value={summary?.high_confidence_pct || 0} decimals={1} />%
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            ≥3 in-stock gün tempo bazası
          </div>
        </SpotlightCard>
      </div>

      {/* Daily Trend Chart */}
      {summary?.daily_trend && summary.daily_trend.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Kampaniya Ərzində Günlük İtirilmiş Satış Dinamikası
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real günlər üzrə faktiki satış və stok tükənməsi səbəbilə itirilən həcmlərin müqayisəsi
              </p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-medium">
              <div className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                <span>Faktiki Satış</span>
              </div>
              <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                <span>İtirilmiş Satış</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={summary.daily_trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [Number(val).toLocaleString() + ' ədəd', '']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="sale_units" name="Faktiki Satış" fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="lost_units" name="İtirilmiş Satış" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4, fill: '#f43f5e' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabs & Search & Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
            <button
              onClick={() => {
                if (activeTab !== 'store') {
                  setActiveTab('store');
                  setTableItems([]);
                  setIsDataLoading(true);
                  setPage(1);
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'store'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Mağaza</span>
            </button>
            <button
              onClick={() => {
                if (activeTab !== 'product') {
                  setActiveTab('product');
                  setTableItems([]);
                  setIsDataLoading(true);
                  setPage(1);
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'product'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Məhsul</span>
            </button>
            <button
              onClick={() => {
                if (activeTab !== 'category') {
                  setActiveTab('category');
                  setTreeData([]);
                  setIsDataLoading(true);
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'category'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Kateqoriya</span>
            </button>
            <button
              onClick={() => {
                if (activeTab !== 'area') {
                  setActiveTab('area');
                  setTreeData([]);
                  setIsDataLoading(true);
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'area'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Area</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder={
                activeTab === 'store'
                  ? 'Mağaza və ya area axtar...'
                  : activeTab === 'product'
                  ? 'Kod, ad, kateqoriya axtar...'
                  : 'Axtarış...'
              }
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Content Table / Tree */}
        <div className="rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs overflow-hidden">
          {isDataLoading ? (
            <div className="p-12 flex justify-center items-center space-x-2 text-slate-500 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span>Məlumatlar yüklənir...</span>
            </div>
          ) : activeTab === 'store' ? (
            /* STORE TABLE */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700/80 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4">Mağaza</th>
                    <th className="py-3 px-3">Bölgə (Area / Sub-Area)</th>
                    <th className="py-3 px-3 text-right">Məhsul Sayı</th>
                    <th className="py-3 px-3 text-right">Satış (ədəd)</th>
                    <th
                      className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                      onClick={() => handleSort('lost_units')}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>İtirilmiş Say</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-amber-600 dark:text-amber-400"
                      onClick={() => handleSort('lost_revenue')}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>İtirilmiş Gəlir (₼)</span>
                        <ArrowUpDown className="w-3 h-3 text-amber-500" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                      onClick={() => handleSort('lost_pct')}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>İtki %</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right">Stokout Cütləri</th>
                    <th className="py-3 px-4 text-center">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-200">
                  {tableItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Nəticə tapılmadı
                      </td>
                    </tr>
                  ) : (
                    tableItems.map((st, idx) => (
                      <tr
                        key={st.store ? `st-${st.store}` : `st-idx-${idx}`}
                        onClick={() => handleStoreClick(st)}
                        className="hover:bg-blue-50/40 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {st.store}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                          {st.area || '–'} / {st.sub_area || '–'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {st.product_count}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {Math.round(st.sale).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {Math.round(st.lost_units).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          {st.lost_revenue !== null ? `${Math.round(st.lost_revenue).toLocaleString()} ₼` : '–'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                            st.lost_pct > 10 ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {st.lost_pct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                          {st.stockout_pairs} <span className="text-[10px] text-slate-400">({st.stockout_days} gün)</span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStoreClick(st); }}
                            className="px-2 py-1 text-[11px] font-medium rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                          >
                            Detallar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'product' ? (
            /* PRODUCT TABLE */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700/80 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4">Kod</th>
                    <th className="py-3 px-3">Məhsul Adı</th>
                    <th className="py-3 px-3">Kateqoriya</th>
                    <th className="py-3 px-3 text-right">Qiymət</th>
                    <th className="py-3 px-3 text-right">Mağaza</th>
                    <th className="py-3 px-3 text-right">Satış</th>
                    <th
                      className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                      onClick={() => handleSort('lost_units')}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>İtirilmiş Say</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-amber-600 dark:text-amber-400"
                      onClick={() => handleSort('lost_revenue')}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>İtirilmiş Gəlir (₼)</span>
                        <ArrowUpDown className="w-3 h-3 text-amber-500" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                      onClick={() => handleSort('lost_pct')}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>İtki %</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-200">
                  {tableItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Nəticə tapılmadı
                      </td>
                    </tr>
                  ) : (
                    tableItems.map((p, idx) => (
                      <tr
                        key={p.code ? `prod-${p.code}-${idx}` : `prod-idx-${idx}`}
                        onClick={() => handleProductClick(p)}
                        className="hover:bg-blue-50/40 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {p.code}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate font-medium">
                          {p.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                          {p.category || '–'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                          {p.price !== null ? `${p.price} ₼` : '–'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {p.store_count}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {Math.round(p.sale).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {Math.round(p.lost_units).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          {p.lost_revenue !== null ? `${Math.round(p.lost_revenue).toLocaleString()} ₼` : '–'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                            p.lost_pct > 10 ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {p.lost_pct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleProductClick(p); }}
                            className="px-2 py-1 text-[11px] font-medium rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                          >
                            Detallar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* TREE VIEW (CATEGORY OR AREA) */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700/80 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4 w-1/3">Qrup İyerarxiyası</th>
                    <th className="py-3 px-3 text-right">Satış (ədəd)</th>
                    <th className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">İtirilmiş Say</th>
                    <th className="py-3 px-3 text-right text-amber-600 dark:text-amber-400">İtirilmiş Gəlir (₼)</th>
                    <th className="py-3 px-3 text-right">İtki %</th>
                    <th className="py-3 px-3 text-right">Stokout Cütləri</th>
                    <th className="py-3 px-4 text-right">Stokout Günləri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-200">
                  {treeData.map((node, nodeIdx) => {
                    const nodeKey = node.key || `node-${node.name || ''}-${nodeIdx}`;
                    const isExp = expandedKeys[nodeKey] ?? expandedKeys[node.key];
                    return (
                      <React.Fragment key={nodeKey}>
                        {/* Parent Node */}
                        <tr
                          onClick={() => toggleNode(nodeKey)}
                          className="bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-700/50 cursor-pointer font-bold transition-colors"
                        >
                          <td className="py-2.5 px-4 flex items-center space-x-2">
                            {node.children && node.children.length > 0 ? (
                              isExp ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            ) : (
                              <span className="w-4" />
                            )}
                            <span className="text-slate-900 dark:text-white">{node.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{Math.round(node.sale).toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{Math.round(node.lost_units).toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">{node.lost_revenue !== null ? `${Math.round(node.lost_revenue).toLocaleString()} ₼` : '–'}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{node.lost_pct}%</td>
                          <td className="py-2.5 px-3 text-right font-mono">{node.stockout_pairs}</td>
                          <td className="py-2.5 px-4 text-right font-mono">{node.stockout_days}</td>
                        </tr>

                        {/* Child Nodes */}
                        {isExp && node.children?.map((sub: any, subIdx: number) => {
                          const subKey = sub.key || `sub-${nodeKey}-${sub.name || ''}-${subIdx}`;
                          const isSubExp = expandedKeys[subKey] ?? expandedKeys[sub.key];
                          return (
                            <React.Fragment key={subKey}>
                              <tr
                                onClick={() => toggleNode(subKey)}
                                className="hover:bg-blue-50/30 dark:hover:bg-slate-700/30 cursor-pointer text-slate-700 dark:text-slate-300 font-medium"
                              >
                                <td className="py-2 px-4 pl-10 flex items-center space-x-2">
                                  {sub.children && sub.children.length > 0 ? (
                                    isSubExp ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  ) : (
                                    <span className="w-3.5" />
                                  )}
                                  <span>{sub.name}</span>
                                </td>
                                <td className="py-2 px-3 text-right font-mono">{Math.round(sub.sale).toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">{Math.round(sub.lost_units).toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-mono text-amber-600 dark:text-amber-400 font-semibold">{sub.lost_revenue !== null ? `${Math.round(sub.lost_revenue).toLocaleString()} ₼` : '–'}</td>
                                <td className="py-2 px-3 text-right font-mono">{sub.lost_pct}%</td>
                                <td className="py-2 px-3 text-right font-mono">{sub.stockout_pairs}</td>
                                <td className="py-2 px-4 text-right font-mono">{sub.stockout_days}</td>
                              </tr>

                              {/* Grandchild Nodes */}
                              {isSubExp && sub.children?.map((grand: any, grandIdx: number) => {
                                const grandKey = grand.key || `grand-${subKey}-${grand.name || ''}-${grandIdx}`;
                                return (
                                  <tr
                                    key={grandKey}
                                    className="text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                                  >
                                    <td className="py-1.5 px-4 pl-16 text-[11px]">
                                      {grand.name}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono text-[11px]">{Math.round(grand.sale).toLocaleString()}</td>
                                    <td className="py-1.5 px-3 text-right font-mono text-[11px] text-rose-500 font-medium">{Math.round(grand.lost_units).toLocaleString()}</td>
                                    <td className="py-1.5 px-3 text-right font-mono text-[11px] text-amber-500 font-medium">{grand.lost_revenue !== null ? `${Math.round(grand.lost_revenue).toLocaleString()} ₼` : '–'}</td>
                                    <td className="py-1.5 px-3 text-right font-mono text-[11px]">{grand.lost_pct}%</td>
                                    <td className="py-1.5 px-3 text-right font-mono text-[11px]">{grand.stockout_pairs}</td>
                                    <td className="py-1.5 px-4 text-right font-mono text-[11px]">{grand.stockout_days}</td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination for Store & Product Table */}
          {(activeTab === 'store' || activeTab === 'product') && totalCount > pageSize && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div>
                Toplam <span className="font-bold text-slate-700 dark:text-slate-300">{totalCount}</span> sətr
                (Göstərilən: {(page - 1) * pageSize + 1} — {Math.min(page * pageSize, totalCount)})
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {page} / {Math.ceil(totalCount / pageSize)}
                </span>
                <button
                  disabled={page >= Math.ceil(totalCount / pageSize)}
                  onClick={() => setPage(page + 1)}
                  className="p-1 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drill-Down Modal via Portal */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="min-w-0 pr-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {modalTitle}
                </h3>
                {selectedPair && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {selectedPair.category || ''} {selectedPair.area ? `| ${selectedPair.area}` : ''}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {isModalLoading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-xs">Məlumatlar hesablanır...</span>
                </div>
              ) : selectedPair ? (
                <>
                  {/* Pair KPI Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">İtirilmiş Vahid</span>
                      <div className="text-lg font-black text-rose-600 dark:text-rose-400">
                        {selectedPair.lost_units} <span className="text-xs font-normal text-slate-400">ədəd</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Gündəlik Tempo</span>
                      <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                        {selectedPair.rate} <span className="text-xs font-normal text-slate-400">ədəd/gün</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Stokout Günləri</span>
                      <div className="text-lg font-black text-slate-800 dark:text-slate-200">
                        {selectedPair.stockout_days} <span className="text-xs font-normal text-slate-400">gün</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Etibarlılıq & Qiymət</span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedPair.confidence === 'high'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {selectedPair.confidence === 'high' ? 'Yüksək' : 'Aşağı'} ({selectedPair.method})
                        </span>
                        {selectedPair.price && (
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            {selectedPair.price} ₼
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Daily Pair Series Chart */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Günlük Qalıq Stok, Satış və Gözlənilən Tempo
                        {selectedPair && (
                          <span className="text-blue-600 dark:text-blue-400 ml-1.5 font-normal">
                            (Mağaza: {selectedPair.store} — Kod: {selectedPair.code})
                          </span>
                        )}
                      </span>
                      <div className="flex items-center space-x-3 text-[11px]">
                        <span className="flex items-center space-x-1 text-blue-600">
                          <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm inline-block"></span>
                          <span>Qalıq Stok</span>
                        </span>
                        <span className="flex items-center space-x-1 text-emerald-600">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
                          <span>Satış</span>
                        </span>
                        <span className="flex items-center space-x-1 text-amber-500">
                          <span className="w-3 border-t-2 border-dashed border-amber-500 inline-block"></span>
                          <span>Tempo ({selectedPair.rate})</span>
                        </span>
                      </div>
                    </div>

                    <div className="h-64 w-full bg-slate-50/50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={pairChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs space-y-1 shadow-lg">
                                    <div className="font-bold border-b border-slate-700 pb-1">
                                      {data.fullDate} {data.isStockout && <span className="text-rose-400 ml-1 font-normal">(Stokout Günü)</span>}
                                    </div>
                                    <div className="text-blue-400">Qalıq Stok: {data.stock}</div>
                                    <div className="text-emerald-400">Faktiki Satış: {data.sales}</div>
                                    <div className="text-amber-400">Gözlənilən Tempo: {data.rate}</div>
                                    {data.lost > 0 && (
                                      <div className="text-rose-400 font-bold">Hesablanmış İtki: {data.lost} vahid</div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="stock" fill="#3b82f6" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                          <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                          <ReferenceLine y={selectedPair.rate} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={2} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Formula Result Caption */}
                    <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>
                        <strong>Nəticə:</strong> {selectedPair.lost_units} vahid itki, tempo {selectedPair.rate}, {selectedPair.stockout_days} stokout günü, {selectedPair.confidence === 'high' ? 'yüksək' : 'aşağı'} etibarlılıq ({selectedPair.method === 'fc' ? 'FC əsaslı' : 'in-stock tempi'}).
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* Empty state when no pair details exist */
                <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Stokout və ya Satış İtkisi Qeydə Alınmayıb
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm text-center">
                    Bu seçim üçün kampaniya dövründə stok tükənməsi və ya buraxılmış satış həcmi baş verməyib.
                  </p>
                </div>
              )}

              {/* Worst pairs list for store / product */}
              {modalStorePairs.length > 0 && (
                <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Ən Çox İtki Verən Cütlüklər ({modalStorePairs.length})
                    </h4>
                    <span className="text-[11px] text-slate-400">Qrafiki dəyişmək üçün cütlüyə klikləyin</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs max-h-60 overflow-y-auto">
                    {modalStorePairs.map((wp, i) => {
                      const isSelected = selectedPair && String(selectedPair.store) === String(wp.store) && String(selectedPair.code) === String(wp.code);
                      return (
                        <div
                          key={`wp-${wp.store || ''}-${wp.code || ''}-${i}`}
                          onClick={() => handleSelectModalPair(wp)}
                          className={`p-2.5 px-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50/80 dark:bg-blue-950/50 border-l-4 border-l-blue-600'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0 pr-3">
                            <span className="font-mono text-slate-500 font-bold shrink-0">Mağaza: {wp.store}</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{wp.name}</span>
                          </div>
                          <div className="flex items-center space-x-3 font-mono shrink-0">
                            <span className="text-slate-500 text-[11px]">{wp.stockout_days} gün</span>
                            <span className="text-rose-600 dark:text-rose-400 font-bold">{wp.lost_units} ədəd</span>
                            <span className="text-amber-600 dark:text-amber-400 font-bold">{wp.lost_revenue !== null ? `${wp.lost_revenue} ₼` : '–'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
