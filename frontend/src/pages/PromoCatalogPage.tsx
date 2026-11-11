import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2,
  Download, RefreshCw, Upload, Grid, Columns, FileText, Sparkles, CheckCircle2,
  AlertCircle, ArrowLeft, ArrowRight, Eye, Calendar, Layers, Tag, Flame,
  TrendingUp, AlertTriangle, X, Search, BarChart2, Award, Headphones,
  SlidersHorizontal, Volume2, VolumeX, Play, Pause, Square, ShoppingBag,
  Edit3, Plus, Trash2, RotateCcw, Check, CheckSquare
} from 'lucide-react';
import { useToast } from '../components/common/ToastProvider';
import { useData } from '../context/DataContext';
import {
  buildCatalogAnalytics,
  generateCatalogBriefingText
} from '../utils/catalogAnalytics';
import type { PageProductAnalytics, CatalogSummary, HotspotDetail } from '../utils/catalogAnalytics';
import {
  getStoredHotspots,
  saveStoredHotspots,
  resetStoredHotspots
} from '../utils/catalogHotspots';
import type { CatalogHotspotsMap, CatalogHotspotItem } from '../utils/catalogHotspots';
import type { ProductPerformance } from '../types';

interface CatalogItem {
  id: string;
  filename: string;
  title: string;
  total_pages: number;
  size_bytes: number;
  size_mb: number;
  modified_at: string;
  date_label: string;
  thumbnail_url: string;
}

const getApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:8000/api';
  return import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname || 'localhost'}:8000/api`;
};

export const PromoCatalogPage: React.FC = () => {
  const { showToast } = useToast();
  const { data, setSelectedProductDetail } = useData();
  const API_BASE = getApiBase();

  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(true);

  // Viewer State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'single' | 'double' | 'grid' | 'native'>('double');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // 1. Hotspots State & Dynamic Editor
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [hotspotsMap, setHotspotsMap] = useState<CatalogHotspotsMap>({});

  // Add Hotspot Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newPointDraft, setNewPointDraft] = useState<{ pageNum: number; x: number; y: number } | null>(null);
  const [addSearchQuery, setAddSearchQuery] = useState<string>('');

  // 3. Side Drawer State
  const [showSideDrawer, setShowSideDrawer] = useState<boolean>(false);
  const [drawerSearch, setDrawerSearch] = useState<string>('');
  const [drawerFilter, setDrawerFilter] = useState<'ALL' | 'STOCKOUT' | 'TOP'>('ALL');

  // 4. AI Voice Briefing State
  const [showBriefingModal, setShowBriefingModal] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechPaused, setSpeechPaused] = useState<boolean>(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Upload State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);

  // Load stored/verified hotspots whenever selectedCatalog changes
  useEffect(() => {
    if (!selectedCatalog) return;
    const initial = getStoredHotspots(selectedCatalog.filename);
    setHotspotsMap(initial);

    // Also attempt fetching latest saved from backend API
    fetch(`${API_BASE}/catalog/hotspots/${encodeURIComponent(selectedCatalog.filename)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((serverData) => {
        if (serverData && serverData.pages && Object.keys(serverData.pages).length > 0) {
          setHotspotsMap((prev) => ({ ...prev, ...serverData.pages }));
        }
      })
      .catch(() => {});
  }, [API_BASE, selectedCatalog]);

  // Fetch catalogs list automatically from Jurnal folder
  const fetchCatalogs = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${API_BASE}/catalog/list`);
      if (!res.ok) throw new Error(`Jurnal siyahısı alına bilmədi (Status: ${res.status})`);
      const dataItems: CatalogItem[] = await res.json();
      setCatalogs(dataItems);
      if (dataItems.length > 0) {
        setSelectedCatalog((prev) => {
          if (!prev) return dataItems[0];
          const found = dataItems.find((c) => c.filename === prev.filename);
          return found || dataItems[0];
        });
      } else {
        setSelectedCatalog(null);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        message: err.message || 'Jurnallar qovluğu oxunarkən xəta baş verdi'
      });
    } finally {
      setLoadingList(false);
    }
  }, [API_BASE, showToast]);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  // Compute live catalog analytics across pages linked with verified/edited hotspots
  const catalogAnalytics: CatalogSummary = useMemo(() => {
    const products = data?.product_performances || [];
    const pagesCount = selectedCatalog?.total_pages || 28;
    return buildCatalogAnalytics(products, pagesCount, hotspotsMap);
  }, [data?.product_performances, selectedCatalog?.total_pages, hotspotsMap]);

  // Generate briefing script
  const briefingTexts = useMemo(() => {
    return generateCatalogBriefingText(catalogAnalytics);
  }, [catalogAnalytics]);

  // Preload adjacent pages for instant flipping
  useEffect(() => {
    if (!selectedCatalog || selectedCatalog.total_pages <= 0) return;

    const pagesToPreload = [
      currentPage - 2,
      currentPage - 1,
      currentPage + 1,
      currentPage + 2
    ].filter((p) => p >= 1 && p <= selectedCatalog.total_pages);

    pagesToPreload.forEach((p) => {
      const img = new Image();
      img.src = `${API_BASE}/catalog/page/${encodeURIComponent(selectedCatalog.filename)}/${p}?dpi=130`;
    });
  }, [API_BASE, currentPage, selectedCatalog]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!filmstripRef.current) return;
    const activeEl = filmstripRef.current.querySelector(`[data-thumb-page="${currentPage}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentPage(1);
      } else if (e.key === 'End' && selectedCatalog) {
        e.preventDefault();
        setCurrentPage(selectedCatalog.total_pages);
      } else if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey) {
          toggleFullscreen();
        }
      } else if (e.key === 'Escape') {
        setActiveHotspotId(null);
        setShowAddModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleNextPage = () => {
    if (!selectedCatalog) return;
    const step = viewMode === 'double' && currentPage > 1 ? 2 : 1;
    setCurrentPage((prev) => Math.min(selectedCatalog.total_pages, prev + step));
    setActiveHotspotId(null);
  };

  const handlePrevPage = () => {
    const step = viewMode === 'double' && currentPage > 2 ? 2 : 1;
    setCurrentPage((prev) => Math.max(1, prev - step));
    setActiveHotspotId(null);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast({
        type: 'error',
        message: 'Yalnız .pdf formatında fayllar qəbul edilir'
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/catalog/upload`, {
        method: 'POST',
        body: formData
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.detail || 'Fayl yüklənə bilmədi');

      showToast({
        type: 'success',
        message: 'Yeni promo jurnalı uğurla qəbul edildi və dərc olundu'
      });

      await fetchCatalogs();
      setCurrentPage(1);
    } catch (err: any) {
      showToast({
        type: 'error',
        message: err.message || 'Fayl göndərilərkən xəta baş verdi'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Hotspot Editing Actions
  const handlePageClickToAddHotspot = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!isEditMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    setNewPointDraft({
      pageNum,
      x: Math.max(5, Math.min(95, clickX)),
      y: Math.max(5, Math.min(95, clickY))
    });
    setAddSearchQuery('');
    setShowAddModal(true);
  };

  const handleConfirmAddHotspot = (product: ProductPerformance) => {
    if (!newPointDraft || !selectedCatalog) return;

    const pageNum = newPointDraft.pageNum;
    const newHotspotItem: CatalogHotspotItem = {
      id: `custom-spot-${pageNum}-${product.code}-${Date.now()}`,
      code: product.code,
      name: product.name,
      x: newPointDraft.x,
      y: newPointDraft.y
    };

    const currentList = hotspotsMap[pageNum] || [];
    const updatedMap = {
      ...hotspotsMap,
      [pageNum]: [...currentList, newHotspotItem]
    };

    setHotspotsMap(updatedMap);
    saveStoredHotspots(selectedCatalog.filename, updatedMap, API_BASE);
    setShowAddModal(false);
    setNewPointDraft(null);

    showToast({
      type: 'success',
      message: `"${product.name}" üçün dəqiq nöqtə əlavə edildi (Səhifə ${pageNum})`
    });
  };

  const handleDeleteHotspot = (pageNum: number, spotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedCatalog) return;

    const currentList = hotspotsMap[pageNum] || [];
    const updatedList = currentList.filter((s) => s.id !== spotId);
    const updatedMap = {
      ...hotspotsMap,
      [pageNum]: updatedList
    };

    setHotspotsMap(updatedMap);
    saveStoredHotspots(selectedCatalog.filename, updatedMap, API_BASE);
    setActiveHotspotId(null);

    showToast({
      type: 'info',
      message: 'Məhsul nöqtəsi silindi'
    });
  };

  const handleResetHotspotsToDefault = () => {
    if (!selectedCatalog) return;
    if (window.confirm('Jurnaldakı bütün nöqtələri ilkin dəqiqləşdirilmiş vəziyyətinə qaytarmaq istəyirsiniz?')) {
      const defaults = resetStoredHotspots(selectedCatalog.filename);
      setHotspotsMap(defaults);
      saveStoredHotspots(selectedCatalog.filename, defaults, API_BASE);
      showToast({
        type: 'success',
        message: 'Nöqtələr ilkin dəqiqləşdirilmiş kataloq xəritəsinə qaytarıldı'
      });
    }
  };

  // Web Speech API Handlers
  const handleStartBriefingSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast({
        type: 'warning',
        message: 'Brauzeriniz nitq sintezini (Web Speech API) dəstəkləmir'
      });
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(briefingTexts.fullSpeech);
    const voices = window.speechSynthesis.getVoices();
    const azVoice = voices.find((v) => v.lang.startsWith('az')) ||
                     voices.find((v) => v.lang.startsWith('tr')) ||
                     voices[0];
    if (azVoice) utterance.voice = azVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeechPaused(false);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeechPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeechPaused(false);
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleStopBriefingSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeechPaused(false);
  };

  const handleTogglePauseSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speechPaused) {
      window.speechSynthesis.resume();
      setSpeechPaused(false);
      setIsSpeaking(true);
    } else {
      window.speechSynthesis.pause();
      setSpeechPaused(true);
    }
  };

  const totalPages = selectedCatalog?.total_pages || 0;

  // Determine left and right pages for double-page view
  let leftPage: number | null = null;
  let rightPage: number | null = null;

  if (viewMode === 'double') {
    if (currentPage === 1) {
      leftPage = null;
      rightPage = 1;
    } else {
      if (currentPage % 2 === 0) {
        leftPage = currentPage;
        rightPage = currentPage + 1 <= totalPages ? currentPage + 1 : null;
      } else {
        leftPage = currentPage - 1;
        rightPage = currentPage;
      }
    }
  }

  // Active spread products for side drawer
  const activeSpreadProducts = useMemo(() => {
    const prods: ProductPerformance[] = [];
    if (viewMode === 'double') {
      if (leftPage && catalogAnalytics.pages[leftPage]) {
        prods.push(...catalogAnalytics.pages[leftPage].products);
      }
      if (rightPage && catalogAnalytics.pages[rightPage]) {
        prods.push(...catalogAnalytics.pages[rightPage].products);
      }
    } else {
      if (catalogAnalytics.pages[currentPage]) {
        prods.push(...catalogAnalytics.pages[currentPage].products);
      }
    }

    let filtered = prods;
    if (drawerSearch.trim()) {
      const q = drawerSearch.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      );
    }
    if (drawerFilter === 'STOCKOUT') {
      filtered = filtered.filter((p) => p.stockout_store_count > 0);
    } else if (drawerFilter === 'TOP') {
      filtered = [...filtered].sort((a, b) => (b.total_sale || 0) - (a.total_sale || 0));
    }

    return filtered;
  }, [catalogAnalytics, viewMode, leftPage, rightPage, currentPage, drawerSearch, drawerFilter]);

  // Filtered products list for Add Hotspot Modal
  const candidateProducts = useMemo(() => {
    const all = data?.product_performances || [];
    if (!addSearchQuery.trim()) return all.slice(0, 30);
    const q = addSearchQuery.toLowerCase();
    return all
      .filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
      .slice(0, 50);
  }, [data?.product_performances, addSearchQuery]);

  // Render Hotspots over a page container
  const renderHotspots = (pageData: PageProductAnalytics | undefined, pageNum: number) => {
    if (!showHotspots || !pageData || !pageData.hotspots || pageData.hotspots.length === 0) {
      return null;
    }

    return (
      <>
        {pageData.hotspots.map((spot) => {
          const isActive = activeHotspotId === spot.id;
          const ach = spot.product.achievement_pct || 0;
          return (
            <div
              key={spot.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto"
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pin Container */}
              <div className="relative group/pin">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isEditMode) {
                      setActiveHotspotId(isActive ? null : spot.id);
                    }
                  }}
                  className={`relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-white shadow-xl border-2 transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'scale-125 bg-amber-500 border-white ring-4 ring-amber-400/50'
                      : isEditMode
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 border-white ring-2 ring-blue-400/50 hover:scale-120'
                      : 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 border-white/90 hover:scale-120'
                  }`}
                  title={`${spot.product.name} (Satış: ${spot.product.total_sale || 0} ədəd)`}
                >
                  {!isEditMode && (
                    <span className="absolute -inset-1 rounded-full bg-rose-400 opacity-60 animate-ping" />
                  )}
                  <Tag className="w-3.5 h-3.5 relative z-10" />
                </button>

                {/* Edit Mode Delete Button */}
                {isEditMode && (
                  <button
                    onClick={(e) => handleDeleteHotspot(pageNum, spot.id, e)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-rose-700 cursor-pointer border border-white z-40 transition-transform hover:scale-125"
                    title="Bu nöqtəni sil"
                  >
                    <X className="w-3 h-3 stroke-[3]" />
                  </button>
                )}
              </div>

              {/* Popover Product Detail Card (Only in View Mode) */}
              {isActive && !isEditMode && (
                <div
                  className={`absolute z-50 w-72 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-2xl text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150 ${
                    spot.y < 35 ? 'top-full mt-3' : 'bottom-full mb-3'
                  } ${
                    spot.x > 70
                      ? 'right-0'
                      : spot.x < 30
                      ? 'left-0'
                      : 'left-1/2 -translate-x-1/2'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                      SKU: {spot.product.code}
                    </span>
                    <button
                      onClick={() => setActiveHotspotId(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Product Title */}
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-xs line-clamp-2 leading-tight">
                    {spot.product.name}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Promo Satış</div>
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                        {(spot.product.total_sale || 0).toLocaleString()} ədəd
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Hədəf İcrası</div>
                      <div
                        className={`font-extrabold text-xs ${
                          ach >= 100
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : ach >= 70
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {ach}%
                      </div>
                    </div>
                  </div>

                  {/* Stock Availability */}
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-slate-500 dark:text-slate-400">Mövcud Stok:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {(spot.product.total_stock || 0).toLocaleString()} ədəd
                    </span>
                  </div>

                  {/* Stockout Warning Flag */}
                  {spot.product.stockout_store_count > 0 ? (
                    <div className="text-[10px] px-2 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{spot.product.stockout_store_count} filialda stok bitib</span>
                    </div>
                  ) : (
                    <div className="text-[10px] px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Bütün filiallarda mövcuddur</span>
                    </div>
                  )}

                  {/* Quick Access to Comprehensive Product Detail Modal */}
                  <button
                    onClick={() => {
                      setSelectedProductDetail({ store: 'ALL', code: spot.product.code });
                      setActiveHotspotId(null);
                    }}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/25 transition-all cursor-pointer"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    Ətraflı Analitika Kartı
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className="space-y-4 pb-12 text-xs"
      onClick={() => setActiveHotspotId(null)}
    >
      {/* Hidden File Input for PDF Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-400/80 dark:via-rose-400/50 to-transparent pointer-events-none z-20" />

        <div className="flex items-center space-x-3 relative z-10">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 text-white shadow-md shadow-rose-500/25 ring-2 ring-rose-400/30">
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Promo Jurnalı & Kataloq
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-300 animate-pulse" />
              </h2>
              {selectedCatalog && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-300 dark:border-rose-800">
                  {selectedCatalog.total_pages} Səhifə
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              TamStore mağazalar şəbəkəsinin həftəlik rəsmi endirim bukleti və promo kataloqu
            </p>
          </div>
        </div>

        {/* Catalog Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          {catalogs.length > 1 && (
            <select
              value={selectedCatalog?.filename || ''}
              onChange={(e) => {
                const found = catalogs.find((c) => c.filename === e.target.value);
                if (found) {
                  setSelectedCatalog(found);
                  setCurrentPage(1);
                  setActiveHotspotId(null);
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              {catalogs.map((c) => (
                <option key={c.filename} value={c.filename}>
                  {c.title} ({c.size_mb} MB)
                </option>
              ))}
            </select>
          )}

          {/* Hotspot Visual Editor Mode Toggle */}
          <button
            onClick={() => setIsEditMode((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              isEditMode
                ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-400/60 shadow-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Səhifə üzərində istənilən məhsula klikləyərək yeni nöqtə əlavə et və ya düzəlt"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditMode ? 'Redaktə Rejimi Aktivdir' : 'Nöqtələri Redaktə Et'}</span>
          </button>

          {/* Reset to Default Hotspots Button */}
          {isEditMode && (
            <button
              onClick={handleResetHotspotsToDefault}
              className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="İlkin dəqiqləşdirilmiş kataloq nöqtələrinə qaytar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sıfırla</span>
            </button>
          )}

          {/* AI Audio Briefing Button */}
          <button
            onClick={() => setShowBriefingModal(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Kataloq üzrə intellektual səsli brifinqi dinlə"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Səsli Brifinq</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </button>

          {/* Side Drawer Toggle */}
          <button
            onClick={() => setShowSideDrawer((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1.5 cursor-pointer ${
              showSideDrawer
                ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300/80 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Səhifədəki Promo Məhsulları Yan Paneli"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Səhifə Məhsulları</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px]">
              {activeSpreadProducts.length}
            </span>
          </button>

          {/* Refresh Catalogs */}
          <button
            onClick={fetchCatalogs}
            disabled={loadingList}
            title="Jurnallar qovluğunu yenilə"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
          </button>

          {/* Upload New PDF */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            {isUploading ? 'Yüklənir...' : 'Yeni Jurnal'}
          </button>

          {/* Download Original PDF */}
          {selectedCatalog && (
            <a
              href={`${API_BASE}/catalog/raw/${encodeURIComponent(selectedCatalog.filename)}`}
              download={selectedCatalog.filename}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-300/80 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </a>
          )}
        </div>
      </div>

      {/* Edit Mode Helper Notification Banner */}
      {isEditMode && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border border-amber-400/50 dark:border-amber-500/40 p-3 rounded-2xl flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-500 text-white shrink-0">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-xs">Ağıllı Nöqtələrin Dəqiq Tənzimlənməsi Rejimi:</span>
              <p className="text-[11px] opacity-90 mt-0.5">
                Kataloq səhifəsində <strong>istənilən məhsulun şəklinin üzərinə klikləyərək</strong> dəqiq nöqtə əlavə edin, və ya səhv nöqtələrin yanındakı qırmızı <strong>×</strong> düyməsinə basaraq dərhal silin.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEditMode(false)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 cursor-pointer shadow-sm transition-all"
          >
            Tamamla
          </button>
        </div>
      )}

      {/* KPI & Heatmap Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Jurnal Məhsulları</div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">
              {catalogAnalytics.totalProducts.toLocaleString()} SKU
            </div>
          </div>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Jurnal Satışı</div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">
              {catalogAnalytics.totalSale.toLocaleString()} ədəd
            </div>
          </div>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Ümumi Hədəf İcrası</div>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {catalogAnalytics.overallAchievement}%
            </div>
          </div>
        </div>

        <div
          onClick={() => {
            setCurrentPage(catalogAnalytics.topRevenuePageNum);
            setViewMode('double');
          }}
          className="bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-orange-500/10 p-3 rounded-2xl border border-amber-400/40 dark:border-amber-500/30 shadow-sm flex items-center space-x-3 cursor-pointer hover:border-amber-500 transition-all group"
          title="Top gəlir səhifəsinə get"
        >
          <div className="p-2 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
              #1 Top Gəlir Səhifəsi
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">
              Səhifə {catalogAnalytics.topRevenuePageNum} (₼{catalogAnalytics.topRevenueAmount.toLocaleString()})
            </div>
          </div>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qıtlıq Yaşayan SKU</div>
            <div className="text-sm font-black text-rose-600 dark:text-rose-400">
              {catalogAnalytics.totalStockoutSKUs} SKU
            </div>
          </div>
        </div>
      </div>

      {/* Main Catalog Workspace */}
      {!selectedCatalog ? (
        <div className="h-96 w-full flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/60 rounded-full text-rose-500">
            <BookOpen className="w-10 h-10 stroke-[1.8]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {loadingList ? 'Jurnal axtarılır və oxunur...' : 'Jurnallar qovluğunda PDF faylı tapılmadı'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              <code className="text-blue-600 dark:text-blue-400 font-mono">tamstore-promo-intelligence/Jurnal</code> qovluğunda PDF faylları avtomatik aşkarlanır.
            </p>
          </div>
          <button
            onClick={fetchCatalogs}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
            Yenidən Yoxla
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Reader Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl space-x-1">
              <button
                onClick={() => setViewMode('double')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'double'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Qoşa Səhifə (Broşür) Görünüşü"
              >
                <Columns className="w-3.5 h-3.5" />
                Qoşa Səhifə
              </button>

              <button
                onClick={() => setViewMode('single')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'single'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tək Səhifə Oxuma Rejimi"
              >
                <FileText className="w-3.5 h-3.5" />
                Tək Səhifə
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Bütün Səhifələrin Mozaika İcmalı"
              >
                <Grid className="w-3.5 h-3.5" />
                Bütün Səhifələr
              </button>

              <button
                onClick={() => setViewMode('native')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'native'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="PDF Daxili Baxış"
              >
                <Layers className="w-3.5 h-3.5" />
                PDF Daxili
              </button>
            </div>

            {/* Page Navigation & Controls (Single / Double mode) */}
            {viewMode !== 'grid' && viewMode !== 'native' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  title="Əvvəlki Səhifə"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Səhifə</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1 && val <= totalPages) {
                        setCurrentPage(val);
                        setActiveHotspotId(null);
                      }
                    }}
                    className="w-12 text-center py-0.5 px-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-900 dark:text-white"
                  />
                  <span>/ {totalPages}</span>
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  title="Növbəti Səhifə"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hotspots Toggle & Zoom / Fullscreen */}
            <div className="flex items-center space-x-2">
              {viewMode !== 'native' && viewMode !== 'grid' && (
                <button
                  onClick={() => setShowHotspots((prev) => !prev)}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    showHotspots
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                  }`}
                  title="Ağıllı Hotspot nöqtələrini göstər / gizlət"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Ağıllı Nöqtələr</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      showHotspots ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                </button>
              )}

              {viewMode !== 'native' && viewMode !== 'grid' && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl space-x-1">
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(60, prev - 15))}
                    disabled={zoomLevel <= 60}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 cursor-pointer"
                    title="Kiçilt"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold px-1.5 text-slate-700 dark:text-slate-300 min-w-[42px] text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(180, prev + 15))}
                    disabled={zoomLevel >= 180}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 cursor-pointer"
                    title="Böyüt"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-slate-700 transition-all cursor-pointer"
                title={isFullscreen ? 'Tam Ekrandan Çıx' : 'Tam Ekran'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Reader Area + Side Drawer Split */}
          <div className="flex flex-col xl:flex-row gap-4 items-start">
            {/* Canvas Container */}
            <div
              className={`transition-all duration-300 w-full ${
                showSideDrawer ? 'xl:w-2/3 2xl:w-3/4' : 'w-full'
              }`}
            >
              <div className="bg-slate-900/90 dark:bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-2xl min-h-[640px] flex items-center justify-center overflow-auto relative">
                {/* 1. DOUBLE PAGE BOOKLET SPREAD */}
                {viewMode === 'double' && (
                  <div
                    className="flex items-center justify-center gap-3 transition-transform duration-300 max-w-full"
                    style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                  >
                    {/* Left Page */}
                    {leftPage !== null ? (
                      <div
                        onClick={(e) => handlePageClickToAddHotspot(e, leftPage!)}
                        className={`relative group rounded-xl overflow-hidden shadow-2xl border bg-slate-800 ${
                          isEditMode
                            ? 'border-amber-400/90 cursor-crosshair ring-2 ring-amber-400/30'
                            : 'border-slate-700/80'
                        }`}
                      >
                        <img
                          src={`${API_BASE}/catalog/page/${encodeURIComponent(selectedCatalog.filename)}/${leftPage}?dpi=140`}
                          alt={`Səhifə ${leftPage}`}
                          className="max-h-[75vh] w-auto object-contain select-none transition-transform"
                          loading="eager"
                        />

                        {/* Heatmap Badge for Left Page */}
                        {catalogAnalytics.pages[leftPage] && (
                          <div
                            className={`absolute top-2 left-2 z-20 px-2.5 py-1 rounded-lg backdrop-blur-md text-[10px] font-bold flex items-center gap-1.5 shadow-md ${
                              catalogAnalytics.pages[leftPage].isTopPage
                                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white ring-2 ring-amber-400/80 shadow-amber-500/40'
                                : 'bg-black/75 text-slate-200 border border-slate-700/80'
                            }`}
                          >
                            {catalogAnalytics.pages[leftPage].isTopPage ? (
                              <>
                                <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-300 animate-pulse" />
                                <span>TOP GƏLİR: ₼{catalogAnalytics.pages[leftPage].totalRevenue.toLocaleString()} ({catalogAnalytics.pages[leftPage].achievementPct}%)</span>
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-3 h-3 text-rose-400" />
                                <span>Gəlir: ₼{catalogAnalytics.pages[leftPage].totalRevenue.toLocaleString()} ({catalogAnalytics.pages[leftPage].achievementPct}%)</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Hotspots Overlay */}
                        {renderHotspots(catalogAnalytics.pages[leftPage], leftPage)}

                        <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-mono font-bold backdrop-blur-xs">
                          Səhifə {leftPage}
                        </div>
                      </div>
                    ) : (
                      // Cover placeholder
                      <div className="hidden lg:flex flex-col items-center justify-center w-[380px] h-[520px] rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-slate-600 p-6 text-center">
                        <BookOpen className="w-12 h-12 stroke-[1.2] mb-2 text-slate-700" />
                        <span className="font-bold text-xs text-slate-500">TamStore Promo Kataloq</span>
                        <span className="text-[10px] text-slate-600 mt-1">Ön Qapaq</span>
                      </div>
                    )}

                    {/* Spine Fold Visual Line */}
                    <div className="hidden lg:block w-[3px] self-stretch bg-gradient-to-r from-black/60 via-slate-700/80 to-black/60 shadow-lg shrink-0 rounded-full" />

                    {/* Right Page */}
                    {rightPage !== null && (
                      <div
                        onClick={(e) => handlePageClickToAddHotspot(e, rightPage!)}
                        className={`relative group rounded-xl overflow-hidden shadow-2xl border bg-slate-800 ${
                          isEditMode
                            ? 'border-amber-400/90 cursor-crosshair ring-2 ring-amber-400/30'
                            : 'border-slate-700/80'
                        }`}
                      >
                        <img
                          src={`${API_BASE}/catalog/page/${encodeURIComponent(selectedCatalog.filename)}/${rightPage}?dpi=140`}
                          alt={`Səhifə ${rightPage}`}
                          className="max-h-[75vh] w-auto object-contain select-none transition-transform"
                          loading="eager"
                        />

                        {/* Heatmap Badge for Right Page */}
                        {catalogAnalytics.pages[rightPage] && (
                          <div
                            className={`absolute top-2 right-2 z-20 px-2.5 py-1 rounded-lg backdrop-blur-md text-[10px] font-bold flex items-center gap-1.5 shadow-md ${
                              catalogAnalytics.pages[rightPage].isTopPage
                                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white ring-2 ring-amber-400/80 shadow-amber-500/40'
                                : 'bg-black/75 text-slate-200 border border-slate-700/80'
                            }`}
                          >
                            {catalogAnalytics.pages[rightPage].isTopPage ? (
                              <>
                                <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-300 animate-pulse" />
                                <span>TOP GƏLİR: ₼{catalogAnalytics.pages[rightPage].totalRevenue.toLocaleString()} ({catalogAnalytics.pages[rightPage].achievementPct}%)</span>
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-3 h-3 text-rose-400" />
                                <span>Gəlir: ₼{catalogAnalytics.pages[rightPage].totalRevenue.toLocaleString()} ({catalogAnalytics.pages[rightPage].achievementPct}%)</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Hotspots Overlay */}
                        {renderHotspots(catalogAnalytics.pages[rightPage], rightPage)}

                        <div className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-mono font-bold backdrop-blur-xs">
                          Səhifə {rightPage}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. SINGLE PAGE VIEW */}
                {viewMode === 'single' && (
                  <div
                    className="flex items-center justify-center transition-transform duration-300 max-w-full"
                    style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                  >
                    <div
                      onClick={(e) => handlePageClickToAddHotspot(e, currentPage)}
                      className={`relative group rounded-xl overflow-hidden shadow-2xl border bg-slate-800 ${
                        isEditMode
                          ? 'border-amber-400/90 cursor-crosshair ring-2 ring-amber-400/30'
                          : 'border-slate-700/80'
                      }`}
                    >
                      <img
                        src={`${API_BASE}/catalog/page/${encodeURIComponent(selectedCatalog.filename)}/${currentPage}?dpi=160`}
                        alt={`Səhifə ${currentPage}`}
                        className="max-h-[78vh] w-auto object-contain select-none"
                        loading="eager"
                      />

                      {/* Heatmap Badge */}
                      {catalogAnalytics.pages[currentPage] && (
                        <div
                          className={`absolute top-2 left-2 z-20 px-2.5 py-1 rounded-lg backdrop-blur-md text-[10px] font-bold flex items-center gap-1.5 shadow-md ${
                            catalogAnalytics.pages[currentPage].isTopPage
                              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white ring-2 ring-amber-400/80 shadow-amber-500/40'
                              : 'bg-black/75 text-slate-200 border border-slate-700/80'
                          }`}
                        >
                          {catalogAnalytics.pages[currentPage].isTopPage ? (
                            <>
                              <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-300 animate-pulse" />
                              <span>TOP GƏLİR: ₼{catalogAnalytics.pages[currentPage].totalRevenue.toLocaleString()} ({catalogAnalytics.pages[currentPage].achievementPct}%)</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-3 h-3 text-rose-400" />
                              <span>Gəlir: ₼{catalogAnalytics.pages[currentPage].totalRevenue.toLocaleString()} ({catalogAnalytics.pages[currentPage].achievementPct}%)</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Hotspots Overlay */}
                      {renderHotspots(catalogAnalytics.pages[currentPage], currentPage)}

                      <div className="absolute bottom-2 right-2 px-3 py-1 rounded-md bg-black/80 text-white text-xs font-mono font-bold backdrop-blur-xs">
                        Səhifə {currentPage} / {totalPages}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. GRID OVERVIEW OF ALL PAGES */}
                {viewMode === 'grid' && (
                  <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 py-2">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pNum = idx + 1;
                      const isCurrent = pNum === currentPage;
                      const pageData = catalogAnalytics.pages[pNum];
                      return (
                        <div
                          key={pNum}
                          onClick={() => {
                            setCurrentPage(pNum);
                            setViewMode('double');
                          }}
                          className={`group relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer bg-slate-800 hover:scale-105 hover:z-20 shadow-md ${
                            pageData?.isTopPage
                              ? 'border-amber-500 ring-2 ring-amber-400/70 shadow-amber-500/25'
                              : isCurrent
                              ? 'border-rose-500 ring-2 ring-rose-500/60 shadow-rose-500/30'
                              : 'border-slate-700/80 hover:border-slate-400'
                          }`}
                        >
                          <img
                            src={`${API_BASE}/catalog/page/${encodeURIComponent(selectedCatalog.filename)}/${pNum}?dpi=65`}
                            alt={`Səhifə ${pNum}`}
                            className="w-full h-auto object-cover"
                            loading="lazy"
                          />

                          {/* Top Page Fire Pill */}
                          {pageData?.isTopPage && (
                            <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black flex items-center gap-0.5 shadow-md">
                              <Flame className="w-2.5 h-2.5 fill-white" />
                              <span>TOP</span>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                            <span className="text-[10px] font-bold text-white">Səhifə {pNum}</span>
                            <span className="text-[9px] text-amber-300 font-mono">
                              ₼{(pageData?.totalRevenue || 0).toLocaleString()} ({pageData?.achievementPct || 0}%)
                            </span>
                          </div>
                          <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/75 text-white text-[9px] font-mono font-bold">
                            {pNum}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. NATIVE BROWSER PDF VIEWER */}
                {viewMode === 'native' && (
                  <div className="w-full h-[78vh] rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                    <iframe
                      src={`${API_BASE}/catalog/raw/${encodeURIComponent(selectedCatalog.filename)}#page=${currentPage}`}
                      className="w-full h-full border-0"
                      title="PDF Jurnal"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 3. SYNCHRONIZED "BU SƏHİFƏDƏKİ PROMO MƏHSULLARI" SIDE DRAWER */}
            {showSideDrawer && (
              <div className="w-full xl:w-1/3 2xl:w-1/4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl flex flex-col max-h-[800px] shrink-0">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                        Bu Səhifədəki Promo Məhsulları
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {viewMode === 'double'
                          ? `Səhifə ${leftPage || ''} ${rightPage ? '& ' + rightPage : ''}`
                          : `Səhifə ${currentPage}`}{' '}
                        ({activeSpreadProducts.length} SKU)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSideDrawer(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search & Filter Controls */}
                <div className="py-2.5 space-y-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Məhsul adı və ya SKU axtar..."
                      value={drawerSearch}
                      onChange={(e) => setDrawerSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    {drawerSearch && (
                      <button
                        onClick={() => setDrawerSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDrawerFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        drawerFilter === 'ALL'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      Hamısı
                    </button>
                    <button
                      onClick={() => setDrawerFilter('STOCKOUT')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        drawerFilter === 'STOCKOUT'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Qıtlıq Olanlar
                    </button>
                    <button
                      onClick={() => setDrawerFilter('TOP')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        drawerFilter === 'TOP'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      <Flame className="w-2.5 h-2.5" />
                      Ən Çox Satanlar
                    </button>
                  </div>
                </div>

                {/* Product List */}
                <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800 pr-1 space-y-1">
                  {activeSpreadProducts.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Bu səhifədə promo məhsul qeydə alınmayıb. Redaktə rejimi ilə asanlıqla yeni nöqtə əlavə edə bilərsiniz.
                    </div>
                  ) : (
                    activeSpreadProducts.map((p) => {
                      const ach = p.achievement_pct || 0;
                      return (
                        <div
                          key={p.code}
                          onClick={() => setSelectedProductDetail({ store: 'ALL', code: p.code })}
                          className="py-2.5 px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-mono text-[9px] font-bold text-rose-600 dark:text-rose-400">
                              {p.code}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                ach >= 100
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : ach >= 70
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              {ach}% Hədəf
                            </span>
                          </div>

                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs line-clamp-1 mt-0.5 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {p.name}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                            <span>
                              Satış:{' '}
                              <strong className="text-slate-800 dark:text-slate-200">
                                {(p.total_sale || 0).toLocaleString()}
                              </strong>{' '}
                              / {(p.total_fc || 0).toLocaleString()} ədəd
                            </span>
                            <span>
                              Stok:{' '}
                              <strong className="text-slate-800 dark:text-slate-200">
                                {(p.total_stock || 0).toLocaleString()}
                              </strong>
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                ach >= 100 ? 'bg-emerald-500' : ach >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, ach)}%` }}
                            />
                          </div>

                          {p.stockout_store_count > 0 && (
                            <div className="mt-1.5 text-[9px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>{p.stockout_store_count} filialda stok bitib</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Thumbnail Filmstrip with Heatmap Badges */}
          {viewMode !== 'native' && (
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-rose-500" />
                  Səhifə Satış Xəritəsi (Filmstrip & Heatmap)
                </span>
                <span className="text-[11px] font-mono">
                  Seçilmiş: Səhifə {currentPage} / {totalPages}
                </span>
              </div>

              <div
                ref={filmstripRef}
                className="flex items-center space-x-2.5 overflow-x-auto py-1 px-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
              >
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isCurrent = pNum === currentPage;
                  const pData = catalogAnalytics.pages[pNum];
                  return (
                    <button
                      key={pNum}
                      data-thumb-page={pNum}
                      onClick={() => {
                        setCurrentPage(pNum);
                        setActiveHotspotId(null);
                      }}
                      className={`relative shrink-0 w-20 h-28 rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer group flex flex-col justify-between p-1 bg-slate-900 ${
                        pData?.isTopPage
                          ? 'border-amber-400 ring-2 ring-amber-400/80 shadow-md shadow-amber-400/25 scale-105'
                          : isCurrent
                          ? 'border-rose-500 ring-2 ring-rose-500/80 shadow-md shadow-rose-500/25 scale-105'
                          : 'border-slate-300 dark:border-slate-700 opacity-70 hover:opacity-100 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={`${API_BASE}/catalog/page/${encodeURIComponent(selectedCatalog.filename)}/${pNum}?dpi=50`}
                        alt={`Thumb ${pNum}`}
                        className="w-full h-18 object-cover rounded-md select-none"
                        loading="lazy"
                      />

                      {/* Top Page Icon */}
                      {pData?.isTopPage && (
                        <div className="absolute top-1 right-1 p-0.5 rounded bg-amber-500 text-white shadow-md">
                          <Flame className="w-2.5 h-2.5 fill-white" />
                        </div>
                      )}

                      {/* Heatmap Micro-Bar Underneath */}
                      <div className="w-full bg-black/80 rounded py-0.5 px-1 flex items-center justify-between text-[8px] font-mono">
                        <span className="font-bold text-white">S.{pNum}</span>
                        <span className="text-amber-300 font-bold">
                          ₼{((pData?.totalRevenue || 0) / 1000).toFixed(1)}k
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / ATTACH NEW HOTSPOT IN EDIT MODE */}
      {showAddModal && newPointDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-white shadow-md">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Səhifə {newPointDraft.pageNum} — Yeni Nöqtə Əlavə Et
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Koordinat: X: {newPointDraft.x}%, Y: {newPointDraft.y}%
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="SKU kodu və ya məhsul adı ilə axtarın (məs: Final, Vanak, 132173)..."
                value={addSearchQuery}
                onChange={(e) => setAddSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Matching Products List */}
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
              {candidateProducts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Axtarışa uyğun məhsul tapılmadı
                </div>
              ) : (
                candidateProducts.map((prod) => (
                  <div
                    key={prod.code}
                    onClick={() => handleConfirmAddHotspot(prod)}
                    className="p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-transparent hover:border-amber-400/50 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/70 px-1.5 py-0.5 rounded">
                          {prod.code}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {prod.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                        <span>Satış: <strong>{(prod.total_sale || 0).toLocaleString()}</strong> ədəd</span>
                        <span>Stok: <strong>{(prod.total_stock || 0).toLocaleString()}</strong> ədəd</span>
                        <span>İcra: <strong>{prod.achievement_pct || 0}%</strong></span>
                      </div>
                    </div>

                    <button className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      Seç
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Ləğv Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. AI ROBOT SƏSLİ BRİFİNQ MODALI */}
      {showBriefingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-500 via-rose-500 to-indigo-500" />

            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    TamStore AI Səsli Jurnal Brifinqi
                    <Sparkles className="w-4 h-4 text-amber-400 fill-amber-300" />
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Promo kataloqu üzrə 28 səhifəlik avtomatlaşdırılmış rəhbər icmalı və səsli hesabat
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  handleStopBriefingSpeech();
                  setShowBriefingModal(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audio Waveform Equalizer Display */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center space-y-3 shadow-inner">
              <div className="flex items-end justify-center gap-1.5 h-10 w-full">
                {[30, 60, 40, 85, 95, 50, 75, 45, 90, 65, 35, 80, 55, 90, 40, 70, 30].map(
                  (h, i) => (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full bg-gradient-to-t from-rose-500 via-purple-500 to-indigo-400 transition-all duration-150 ${
                        isSpeaking && !speechPaused ? 'animate-pulse' : 'opacity-30'
                      }`}
                      style={{
                        height: isSpeaking && !speechPaused ? `${h}%` : '20%',
                        animationDelay: `${i * 65}ms`
                      }}
                    />
                  )
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-3">
                {!isSpeaking ? (
                  <button
                    onClick={handleStartBriefingSpeech}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 cursor-pointer transition-all"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Səsləndir (Play)
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleTogglePauseSpeech}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
                    >
                      {speechPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
                      {speechPaused ? 'Davam Et' : 'Fasilə'}
                    </button>
                    <button
                      onClick={handleStopBriefingSpeech}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 cursor-pointer transition-all"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      Dayandır
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Transcript Text Cards */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 text-xs">
              {/* Card 1: Overview */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-blue-500" />
                  Jurnal Üzrə Ümumi Satış və Dövriyyə
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {briefingTexts.overview}
                </p>
              </div>

              {/* Card 2: Top Page */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-1">
                <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-400" />
                  Lider Səhifə və Ən Çox Tələbat Görən Məhsul
                </div>
                <p className="text-amber-950 dark:text-amber-300 leading-relaxed">
                  {briefingTexts.topPage}
                </p>
              </div>

              {/* Card 3: Stockouts */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-1">
                <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Təchizat və Qıtlıq Riski Siqnalları
                </div>
                <p className="text-rose-950 dark:text-rose-300 leading-relaxed">
                  {briefingTexts.stockouts}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setCurrentPage(catalogAnalytics.topRevenuePageNum);
                  setViewMode('double');
                  setShowBriefingModal(false);
                  handleStopBriefingSpeech();
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/25 cursor-pointer transition-all"
              >
                <Flame className="w-4 h-4 fill-white" />
                Top Gəlir Səhifəsinə Keç (Səhifə {catalogAnalytics.topRevenuePageNum})
              </button>

              <button
                onClick={() => {
                  handleStopBriefingSpeech();
                  setShowBriefingModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Bağla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCatalogPage;
