import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { X, Package, TrendingUp, AlertTriangle, Store, Search, Filter, ArrowLeft, ArrowUpRight, CheckCircle2, AlertCircle, BarChart3, Layers, Truck } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getApiBase } from '../../utils/api';
import { SortableHeader } from '../common/SortableHeader';

export const ProductDetailModal: React.FC = () => {
  const { selectedProductDetail, setSelectedProductDetail } = useData();
  const [detailData, setDetailData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeStoreCode, setActiveStoreCode] = useState<string>('ALL');

  // Top view mode: all sections, stores only, or timeline only
  const [activeViewTab, setActiveViewTab] = useState<'all' | 'stores' | 'timeline'>('all');

  // Timeline table sort
  const [sortField, setSortField] = useState<string>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Stores table state
  const [storeFilterTab, setStoreFilterTab] = useState<'stockout' | 'instock' | 'all'>('stockout');
  const [storeSupplyTypeFilter, setStoreSupplyTypeFilter] = useState<'all' | 'Depo' | 'Firma' | 'Sifarişsiz'>('all');
  const [storeSearch, setStoreSearch] = useState<string>('');
  const [storeSortField, setStoreSortField] = useState<string>('is_stockout');
  const [storeSortAsc, setStoreSortAsc] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedProductDetail(null);
      }
    };
    if (selectedProductDetail) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedProductDetail, setSelectedProductDetail]);

  // Sync activeStoreCode when selectedProductDetail changes
  useEffect(() => {
    if (selectedProductDetail) {
      setActiveStoreCode(selectedProductDetail.store || 'ALL');
      setStoreFilterTab('stockout');
      setStoreSupplyTypeFilter('all');
      setStoreSearch('');
      setActiveViewTab('all');
    }
  }, [selectedProductDetail]);

  useEffect(() => {
    if (selectedProductDetail) {
      setLoading(true);
      const API_BASE = getApiBase();
      const st = activeStoreCode || 'ALL';
      fetch(`${API_BASE}/item-detail?store=${encodeURIComponent(st)}&code=${encodeURIComponent(selectedProductDetail.code)}`)
        .then((res) => res.json())
        .then((data) => {
          setDetailData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [selectedProductDetail, activeStoreCode]);

  const movement = detailData?.movement || {};
  const chartData = useMemo(() => {
    if (!movement.dates) return [];
    return movement.dates.map((d: string, idx: number) => ({
      date: d,
      stock: movement.stocks?.[idx] ?? 0,
      depletion: movement.depletions?.[idx] ?? 0
    }));
  }, [movement]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      const isStringField = field === 'date' || field === 'status';
      setSortAsc(isStringField);
    }
  };

  const handleStoreSort = (field: string) => {
    if (storeSortField === field) {
      setStoreSortAsc(!storeSortAsc);
    } else {
      setStoreSortField(field);
      const isStringField = field === 'store_code' || field === 'store_name' || field === 'format' || field === 'order_status' || field === 'supply_type';
      setStoreSortAsc(isStringField);
    }
  };

  const movementRows = useMemo(() => {
    const dates: string[] = movement.dates || [];
    const stocks: number[] = movement.stocks || [];
    const depletions: number[] = movement.depletions || [];

    const list = dates.map((d, idx) => ({
      date: d,
      stock: stocks[idx] ?? 0,
      depletion: depletions[idx] ?? 0,
      status: (stocks[idx] ?? 0) <= 0 ? 'STOKOUT' : 'Aktiv'
    }));

    return list.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [movement, sortField, sortAsc]);

  // Filtered and sorted stores list
  const storesList = detailData?.stores || [];
  const filteredStores = useMemo(() => {
    let list = [...storesList];

    // Filter by tab
    if (storeFilterTab === 'stockout') {
      list = list.filter((s: any) => s.is_stockout);
    } else if (storeFilterTab === 'instock') {
      list = list.filter((s: any) => !s.is_stockout);
    }

    // Filter by supply type
    if (storeSupplyTypeFilter !== 'all') {
      list = list.filter((s: any) => {
        const st = String(s.supply_type || '');
        if (storeSupplyTypeFilter === 'Depo') return st === 'Depo' || s.tedaruk_tipi_raw === 40;
        if (storeSupplyTypeFilter === 'Firma') return st === 'Firma' || s.tedaruk_tipi_raw === 41;
        if (storeSupplyTypeFilter === 'Sifarişsiz') return st === 'Sifarişsiz' || st === 'Sifarissiz' || s.tedaruk_tipi_raw === 42;
        return true;
      });
    }

    // Filter by search query
    if (storeSearch.trim()) {
      const q = storeSearch.trim().toLowerCase();
      list = list.filter((s: any) =>
        s.store_code.toLowerCase().includes(q) ||
        s.store_name.toLowerCase().includes(q) ||
        s.format.toLowerCase().includes(q)
      );
    }

    // Sort
    return list.sort((a: any, b: any) => {
      let valA = a[storeSortField];
      let valB = b[storeSortField];

      if (storeSortField === 'is_stockout') {
        const boolA = a.is_stockout ? 1 : 0;
        const boolB = b.is_stockout ? 1 : 0;
        return storeSortAsc ? boolA - boolB : boolB - boolA;
      }

      if (storeSortField === 'store_code') {
        const numA = parseInt(a.store_code, 10);
        const numB = parseInt(b.store_code, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return storeSortAsc ? numA - numB : numB - numA;
        }
      }

      if (typeof valA === 'string') {
        return storeSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return storeSortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [storesList, storeFilterTab, storeSupplyTypeFilter, storeSearch, storeSortField, storeSortAsc]);

  if (!selectedProductDetail) return null;

  const totalStoresCount = detailData?.total_stores_count ?? storesList.length;
  const stockoutStoresCount = detailData?.stockout_stores_count ?? storesList.filter((s: any) => s.is_stockout).length;
  const inStockStoresCount = detailData?.in_stock_stores_count ?? (totalStoresCount - stockoutStoresCount);
  const stockoutRate = totalStoresCount > 0 ? Math.round((stockoutStoresCount / totalStoresCount) * 100) : 0;

  const depoStoresCount = detailData?.supply_counts?.depo ?? storesList.filter((s: any) => s.supply_type === 'Depo' || s.tedaruk_tipi_raw === 40).length;
  const firmaStoresCount = detailData?.supply_counts?.firma ?? storesList.filter((s: any) => s.supply_type === 'Firma' || s.tedaruk_tipi_raw === 41).length;
  const sifarissizStoresCount = detailData?.supply_counts?.sifarissiz ?? storesList.filter((s: any) => s.supply_type === 'Sifarişsiz' || s.supply_type === 'Sifarissiz' || s.tedaruk_tipi_raw === 42).length;

  const activeStoreMeta = activeStoreCode !== 'ALL'
    ? storesList.find((s: any) => s.store_code === activeStoreCode)
    : null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedProductDetail(null);
      }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl xl:max-w-7xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] cursor-default"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{detailData?.name || selectedProductDetail.code}</span>
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                <span>Məhsul Kodu: <strong className="font-mono text-blue-600 dark:text-blue-400">{selectedProductDetail.code}</strong></span>
                <span>•</span>
                {activeStoreCode === 'ALL' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900">
                    <Store className="w-3.5 h-3.5" /> Bütün Mağazalar ({totalStoresCount})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-900">
                    <Store className="w-3.5 h-3.5" /> Seçilmiş: {activeStoreCode} - {activeStoreMeta?.store_name || ''}
                    <button
                      onClick={() => setActiveStoreCode('ALL')}
                      className="ml-1 text-[11px] underline text-blue-600 dark:text-blue-400 hover:text-blue-800 font-bold"
                      title="Bütün mağazaların icmalına qayıt"
                    >
                      (Hamısına qayıt)
                    </button>
                  </span>
                )}
                {detailData?.order_status && (
                  <>
                    <span>•</span>
                    <span>Sifariş Statusu: <strong className={detailData.order_status === 'Passiv' || detailData.order_status === 'XEYR' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                      {detailData.order_status === 'Passiv' || detailData.order_status === 'XEYR' ? '🔴 Sifarişə Qapalı (Xeyr)' : '🟢 Sifarişə Açıq (Bəli)'}
                    </strong></span>
                  </>
                )}
                {detailData?.primary_supply_type && detailData.primary_supply_type !== 'Digər' && (
                  <>
                    <span>•</span>
                    <span>Tədarük Tipi: <strong className={`font-bold ${
                      detailData.primary_supply_type === 'Depo' 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : detailData.primary_supply_type === 'Firma' 
                        ? 'text-purple-600 dark:text-purple-400' 
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {detailData.primary_supply_type === 'Depo' ? '🏢 Depo (40)' : detailData.primary_supply_type === 'Firma' ? '🏭 Firma (41)' : '📦 Sifarişsiz (42)'}
                    </strong></span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => setSelectedProductDetail(null)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Prominent Filter Bar: İş Yeri Tədarük Tipi */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-20">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.2]" />
              İş Yeri Tədarük Tipi Filteri:
            </span>
            <div className="flex items-center gap-1 bg-white/95 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                onClick={() => {
                  setStoreSupplyTypeFilter('all');
                  if (activeViewTab === 'timeline') setActiveViewTab('all');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  storeSupplyTypeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Hamısı</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  storeSupplyTypeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {totalStoresCount}
                </span>
              </button>
              <button
                onClick={() => {
                  setStoreSupplyTypeFilter('Depo');
                  if (activeViewTab === 'timeline') setActiveViewTab('all');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  storeSupplyTypeFilter === 'Depo'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🏢 Depo (40)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  storeSupplyTypeFilter === 'Depo' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                }`}>
                  {depoStoresCount}
                </span>
              </button>
              <button
                onClick={() => {
                  setStoreSupplyTypeFilter('Firma');
                  if (activeViewTab === 'timeline') setActiveViewTab('all');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  storeSupplyTypeFilter === 'Firma'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🏭 Firma (41)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  storeSupplyTypeFilter === 'Firma' ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                }`}>
                  {firmaStoresCount}
                </span>
              </button>
              <button
                onClick={() => {
                  setStoreSupplyTypeFilter('Sifarişsiz');
                  if (activeViewTab === 'timeline') setActiveViewTab('all');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  storeSupplyTypeFilter === 'Sifarişsiz'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>📦 Sifarişsiz (42)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  storeSupplyTypeFilter === 'Sifarişsiz' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}>
                  {sifarissizStoresCount}
                </span>
              </button>
            </div>
          </div>

          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>Filterlənmiş: <strong className="text-slate-900 dark:text-white">{filteredStores.length}</strong> / {totalStoresCount} mağaza</span>
            {storeSupplyTypeFilter !== 'all' && (
              <button
                onClick={() => setStoreSupplyTypeFilter('all')}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
              >
                (Sıfırla)
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {loading ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">Yüklənir...</div>
          ) : (
            <>
              {/* Summary KPI grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Proqnoz (FC)</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{detailData?.fc?.toLocaleString()} unit</p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Real Satış (SALE)</span>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">{detailData?.sale?.toLocaleString()} unit</p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Reallaşma %</span>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {detailData?.fc > 0 ? Math.round((detailData.sale / detailData.fc) * 100) : 0}%
                  </p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Son Qalıq Stok</span>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-1">{detailData?.final_stock?.toLocaleString()} unit</p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {activeStoreCode === 'ALL' ? 'Stokout Mağazalar' : 'Stokout Günləri'}
                  </span>
                  <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-1">
                    {activeStoreCode === 'ALL'
                      ? `${stockoutStoresCount} / ${totalStoresCount} (${stockoutRate}%)`
                      : `${movement.stockout_days || 0} gün`
                    }
                  </p>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveViewTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeViewTab === 'all'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Bütün Bölmələr
                  </button>
                  <button
                    onClick={() => setActiveViewTab('stores')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeViewTab === 'stores'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" /> Mağazalar Siyahısı ({filteredStores.length})
                  </button>
                  <button
                    onClick={() => setActiveViewTab('timeline')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeViewTab === 'timeline'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Günlük Ərimə Qrafiki
                  </button>
                </div>

                {activeStoreCode !== 'ALL' && (
                  <button
                    onClick={() => setActiveStoreCode('ALL')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-bold hover:bg-blue-100 transition-colors text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Bütün Mağazalara Qayıt
                  </button>
                )}
              </div>

              {/* STORES BREAKDOWN SECTION */}
              {(activeViewTab === 'all' || activeViewTab === 'stores') && storesList.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          Mağazalar Üzrə Stokout Vəziyyəti
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Bu məhsulun hansı mağazalarda bitdiyini və sifariş vəziyyətini göstərir
                        </p>
                      </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-900/80 p-1 rounded-xl">
                      <button
                        onClick={() => setStoreFilterTab('stockout')}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                          storeFilterTab === 'stockout'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-300 animate-pulse" />
                        Stokout ({stockoutStoresCount})
                      </button>
                      <button
                        onClick={() => setStoreFilterTab('instock')}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                          storeFilterTab === 'instock'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-300" />
                        Stokda Var ({inStockStoresCount})
                      </button>
                      <button
                        onClick={() => setStoreFilterTab('all')}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                          storeFilterTab === 'all'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Hamısı ({totalStoresCount})
                      </button>
                    </div>
                  </div>

                  {/* Search bar & Supply type filters inside stores section */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={storeSearch}
                        onChange={(e) => setStoreSearch(e.target.value)}
                        placeholder="Mağaza axtar (kod, ad və ya format)..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Tədarük Tipi Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-900/80 p-1 rounded-xl overflow-x-auto">
                      <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 px-2 uppercase tracking-wide whitespace-nowrap flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[2.2]" />
                        İş Yeri Tədarük Tipi:
                      </span>
                      <button
                        onClick={() => setStoreSupplyTypeFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap ${
                          storeSupplyTypeFilter === 'all'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Hamısı ({totalStoresCount})
                      </button>
                      <button
                        onClick={() => setStoreSupplyTypeFilter('Depo')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap ${
                          storeSupplyTypeFilter === 'Depo'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>🏢 Depo (40)</span>
                        <span className="text-[10px] opacity-80 font-normal">({depoStoresCount})</span>
                      </button>
                      <button
                        onClick={() => setStoreSupplyTypeFilter('Firma')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap ${
                          storeSupplyTypeFilter === 'Firma'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>🏭 Firma (41)</span>
                        <span className="text-[10px] opacity-80 font-normal">({firmaStoresCount})</span>
                      </button>
                      <button
                        onClick={() => setStoreSupplyTypeFilter('Sifarişsiz')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap ${
                          storeSupplyTypeFilter === 'Sifarişsiz'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>📦 Sifarişsiz (42)</span>
                        <span className="text-[10px] opacity-80 font-normal">({sifarissizStoresCount})</span>
                      </button>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Göstərilir: {filteredStores.length} mağaza
                    </span>
                  </div>

                  {/* Stores List Table with proper horizontal scroll and min-width */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto overflow-y-auto max-h-80 shadow-xs">
                    <table className="w-full min-w-[1040px] text-left select-none text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 text-[10px] uppercase border-b border-slate-200 dark:border-slate-700 font-bold sticky top-0 z-10 whitespace-nowrap">
                        <tr>
                          <SortableHeader label="Mağaza Kodu" field="store_code" currentSortField={storeSortField} sortAsc={storeSortAsc} onSort={handleStoreSort} align="left" />
                          <SortableHeader label="Mağaza Adı" field="store_name" currentSortField={storeSortField} sortAsc={storeSortAsc} onSort={handleStoreSort} align="left" />
                          <SortableHeader label="Format" field="format" currentSortField={storeSortField} sortAsc={storeSortAsc} onSort={handleStoreSort} align="center" />
                          <SortableHeader label="Sifariş Statusu" field="order_status" currentSortField={storeSortField} sortAsc={storeSortAsc} onSort={handleStoreSort} align="center" />
                          <SortableHeader label="İş Yeri Tədarük Tipi" field="supply_type" currentSortField={storeSortField} sortAsc={storeSortAsc} onSort={handleStoreSort} align="center" />
                          <SortableHeader label="Proqnoz (FC)" field="fc" currentSortField={storeSortField} sortAsc={storeSortAsc} onSort={handleStoreSort} align="right" />
                          <SortableHeader label="Satış (SALE)" field="sale" currentSortField={storeSortField} sortAsc={storeSortAsc} onSort={handleStoreSort} align="right" />
                          <SortableHeader label="Qalıq Stok" field="final_stock" currentSortField={storeSortField} sortAsc={storeSortAsc} onSort={handleStoreSort} align="right" />
                          <SortableHeader label="Stokout Vəziyyəti" field="is_stockout" currentSortField={storeSortField} sortAsc={storeSortAsc} onSort={handleStoreSort} align="center" />
                          <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Əməliyyat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {filteredStores.map((st: any) => {
                          const isSelected = activeStoreCode === st.store_code;
                          const isPassiv = st.order_status === 'Passiv' || st.order_status === 'XEYR';
                          return (
                            <tr
                              key={st.store_code}
                              onClick={() => setActiveStoreCode(st.store_code)}
                              className={`transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-500/15 dark:bg-blue-900/40 font-semibold'
                                  : st.is_stockout
                                  ? 'hover:bg-rose-500/5 dark:hover:bg-rose-950/20'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="px-3 py-2 font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                                {st.store_code}
                              </td>
                              <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap min-w-[140px]">
                                {st.store_name}
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {st.format || 'N/A'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                {isPassiv ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                                    🔴 Qapalı
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                                    🟢 Açıq
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                {st.supply_type === 'Depo' || st.tedaruk_tipi_raw === 40 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                    🏢 Depo (40)
                                  </span>
                                ) : st.supply_type === 'Firma' || st.tedaruk_tipi_raw === 41 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                                    🏭 Firma (41)
                                  </span>
                                ) : st.supply_type === 'Sifarişsiz' || st.supply_type === 'Sifarissiz' || st.tedaruk_tipi_raw === 42 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                                    📦 Sifarişsiz (42)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    {st.supply_type || 'N/A'}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {st.fc}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                {st.sale}
                              </td>
                              <td className={`px-3 py-2 text-right font-mono font-bold whitespace-nowrap ${
                                st.final_stock <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                              }`}>
                                {st.final_stock}
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                {st.is_stockout ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-500/30">
                                    STOKOUT
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                                    STOKDA VAR
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveStoreCode(st.store_code);
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold text-[11px] border border-blue-200 dark:border-blue-800 transition-colors inline-flex items-center gap-1 shadow-xs whitespace-nowrap"
                                  title="Bu mağazanın günlük ərimə dinamikasına bax"
                                >
                                  Dinamika <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredStores.length === 0 && (
                          <tr>
                            <td colSpan={10} className="p-6 text-center text-slate-500 dark:text-slate-400">
                              Axtarışa uyğun mağaza tapılmadı.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Dynamic Daily Stock Depletion Chart */}
              {(activeViewTab === 'all' || activeViewTab === 'timeline') && chartData.length > 0 && (
                <div className="p-4 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Günlük Stok Dinamikası Və Ərimə Qrafiki ({activeStoreCode === 'ALL' ? 'Şəbəkə Üzrə Cəmi' : `${activeStoreCode} - ${activeStoreMeta?.store_name || ''}`})
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">İlkin: {movement.opening} | Son: {movement.closing}</span>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                        />
                        <Area type="monotone" dataKey="stock" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#stockGradient)" name="Stok Qalığı" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Movement table */}
              {(activeViewTab === 'all' || activeViewTab === 'timeline') && movement.dates?.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left select-none text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] border-b border-slate-200 dark:border-slate-700 font-bold whitespace-nowrap">
                      <tr>
                        <SortableHeader label="Tarix" field="date" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="left" />
                        <SortableHeader label="Stok Qalığı" field="stock" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="right" />
                        <SortableHeader label="Günlük Ərimə (Depletion)" field="depletion" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="right" />
                        <SortableHeader label="Status" field="status" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="center" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {movementRows.map((r, idx) => {
                        const isStout = r.stock <= 0;
                        return (
                          <tr key={idx} className="hover:bg-blue-500/5 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{r.date}</td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">{r.stock}</td>
                            <td className="p-2.5 text-blue-600 dark:text-blue-400 text-right font-mono whitespace-nowrap">-{r.depletion}</td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              {isStout ? (
                                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[10px]">STOKOUT</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px]">Aktiv</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
