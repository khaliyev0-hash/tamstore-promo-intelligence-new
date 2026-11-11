import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  Sparkles,
  Volume2,
  VolumeX,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Store,
  Package,
  Search,
  HelpCircle,
  ChevronRight,
  X,
  ArrowUpRight,
  Zap,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Bot,
  Target
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    id: 'excel_upload',
    question: 'Necə Excel yükləyirəm?',
    answer: 'Yuxarı paneldəki "Excel Yüklə" düyməsinə klikləyin. Şablon 1 (Promosiya Satış/Dağılım) və ya Şablon 2 (Service Level) faylınızı sürüşdürüb buraxın. Sütunlar avtomatik tanınacaq.'
  },
  {
    id: 'stockout',
    question: 'Stockout nə deməkdir?',
    answer: 'Promosiya dövründə mağazada məhsul stokunun 0-a düşməsi (tükənməsi) və alıcı tələbatının qarşılanmaması (Lost Sales) halıdır.'
  },
  {
    id: 'wape',
    question: 'WAPE göstəricisi nəyi bildirir?',
    answer: 'Weighted Absolute Percentage Error — Proqnozun faktiki satışlardan meyl faizidir. Aşağı göstərici (məs. < 15%) daha yüksək proqnoz dəqiqliyini göstərir.'
  },
  {
    id: 'dates',
    question: 'Kampaniya tarixləri necə müəyyən olunur?',
    answer: 'Excel daxilindəki "Başlama Tarixi" və "Bitmə Tarixi" sütunlarından avtomatik oxunur. Sütunlar olmadıqda standart kampaniya aralığı tətbiq olunur.'
  },
  {
    id: 'abc_xyz',
    question: 'ABC / XYZ analizi nədir?',
    answer: 'ABC məhsulları dövriyyə payına görə (A: 80%, B: 15%, C: 5%), XYZ isə satışların zaman üzrə sabitlik dəqiqliyinə görə təsnifatlandırır.'
  }
];

type CopilotMode = 'BRIEF' | 'STOCKOUTS' | 'STARS' | 'STORES' | 'RUNRATE' | 'PROMOTYPE';

export const RobotPet: React.FC = () => {
  const { data, campaigns, activeCampaignId, setSelectedProductDetail, setSelectedStoreDetail, setShowUploadModal } = useData();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'copilot' | 'faq'>('copilot');
  const [copilotView, setCopilotView] = useState<CopilotMode>('BRIEF');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [visible, setVisible] = useState<boolean>(false);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [isClicking, setIsClicking] = useState<boolean>(false);
  const [openFaqId, setOpenFaqId] = useState<string | null>('excel_upload');
  const [hovered, setHovered] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const robotRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // 1. Entrance animation (800ms delay after page mount)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // 2. Organic random eye blinking (every 3 to 6 seconds)
  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;

    const scheduleNextBlink = () => {
      const randomDelay = Math.floor(Math.random() * 2500) + 3200;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 150);
      }, randomDelay);
    };

    scheduleNextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  // 3. Smooth mouse tracking with requestAnimationFrame throttling for tilt and pupil parallax (Zero-re-render direct CSS updates)
  useEffect(() => {
    let rafId: number | null = null;
    let lastEvent: MouseEvent | null = null;

    const updatePosition = () => {
      rafId = null;
      if (!robotRef.current || !lastEvent) return;
      const rect = robotRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = lastEvent.clientX - centerX;
      const deltaY = lastEvent.clientY - centerY;
      const dist = Math.hypot(deltaX, deltaY);

      if (dist < 500) {
        const factor = Math.min(1, Math.max(0, (500 - dist) / 500));
        const rotY = Math.max(-18, Math.min(18, (deltaX / 250) * 18 * factor));
        const rotX = Math.max(-14, Math.min(14, (-deltaY / 250) * 14 * factor));
        const pupilX = Math.max(-2.5, Math.min(2.5, (deltaX / 200) * 2.5));
        const pupilY = Math.max(-2, Math.min(2, (deltaY / 200) * 2));

        robotRef.current.style.setProperty('--tilt-x', `${rotX}deg`);
        robotRef.current.style.setProperty('--tilt-y', `${rotY}deg`);
        robotRef.current.style.setProperty('--pupil-x', `${pupilX}px`);
        robotRef.current.style.setProperty('--pupil-y', `${pupilY}px`);
        robotRef.current.style.setProperty('--arm-x', `${rotY * 0.15}px`);
        robotRef.current.style.setProperty('--arm-y', `${-rotX * 0.15}px`);
        robotRef.current.style.setProperty('--head-x', `${rotY * 0.3}px`);
        robotRef.current.style.setProperty('--head-y', `${rotX * 0.25}px`);
      } else {
        robotRef.current.style.setProperty('--tilt-x', '0deg');
        robotRef.current.style.setProperty('--tilt-y', '0deg');
        robotRef.current.style.setProperty('--pupil-x', '0px');
        robotRef.current.style.setProperty('--pupil-y', '0px');
        robotRef.current.style.setProperty('--arm-x', '0px');
        robotRef.current.style.setProperty('--arm-y', '0px');
        robotRef.current.style.setProperty('--head-x', '0px');
        robotRef.current.style.setProperty('--head-y', '0px');
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastEvent = e;
      if (rafId === null) {
        rafId = requestAnimationFrame(updatePosition);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // 4. Close panel on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        stopSpeaking();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        stopSpeaking();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleRobotClick = () => {
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 500);
    setIsOpen(!isOpen);
    if (isOpen) {
      stopSpeaking();
    }
  };

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  // ---------------- AI COPILOT ANALYTICS LOGIC ----------------
  const kpis = data?.kpi_cards || ({} as any);
  const products = useMemo(() => data?.product_performances || [], [data?.product_performances]);
  const stores = useMemo(() => data?.store_performances || [], [data?.store_performances]);
  const daily = useMemo(() => data?.daily_summaries || [], [data?.daily_summaries]);

  const achievementRate = Number(kpis.achievement_pct ?? 0);
  const periodEndPct = Number(kpis.period_end_forecast_pct ?? 0);
  const stockoutStoresCount = Number(kpis.stockout_stores_count ?? 0);
  const totalForecast = Number(kpis.total_forecast ?? 0);
  const totalSales = Number(kpis.total_sales ?? 0);

  // Top 5 Stockout Products
  const topStockouts = useMemo(() => {
    return [...products]
      .filter((p) => p.stockout_store_count > 0)
      .sort((a, b) => b.stockout_store_count - a.stockout_store_count)
      .slice(0, 5);
  }, [products]);

  // Top 5 Star Performers (Highest achievement with significant forecast)
  const topStars = useMemo(() => {
    return [...products]
      .filter((p) => (p.total_fc || 0) > 50)
      .sort((a, b) => (b.achievement_pct || 0) - (a.achievement_pct || 0))
      .slice(0, 5);
  }, [products]);

  // Top 3 Stores & Bottom 3 Stores
  const topStores = useMemo(() => {
    return [...stores]
      .filter((s) => (s.total_fc || 0) > 0)
      .sort((a, b) => (b.achievement_pct || 0) - (a.achievement_pct || 0))
      .slice(0, 3);
  }, [stores]);

  const bottomStores = useMemo(() => {
    return [...stores]
      .filter((s) => (s.total_fc || 0) > 0)
      .sort((a, b) => (a.achievement_pct || 0) - (b.achievement_pct || 0))
      .slice(0, 3);
  }, [stores]);

  // Run Rate & Target Calculation
  const activeCamp = campaigns?.find((c) => c.is_active || c.id === activeCampaignId) || campaigns?.[0];
  let totalDays = 14;
  let elapsedDays = 1;
  if (activeCamp?.beg_date && activeCamp?.end_date) {
    const b = new Date(activeCamp.beg_date);
    const e = new Date(activeCamp.end_date);
    if (!isNaN(b.getTime()) && !isNaN(e.getTime())) {
      totalDays = Math.max(1, Math.round((e.getTime() - b.getTime()) / (1000 * 3600 * 24)) + 1);
      const today = new Date();
      if (today < b) {
        elapsedDays = 1;
      } else if (today > e) {
        elapsedDays = totalDays;
      } else {
        elapsedDays = Math.max(1, Math.round((today.getTime() - b.getTime()) / (1000 * 3600 * 24)) + 1);
      }
    }
  } else if (daily.length > 0) {
    totalDays = daily.length;
    elapsedDays = daily.length;
  }
  const remainingDays = Math.max(1, totalDays - elapsedDays);
  const remainingQty = Math.max(0, totalForecast - totalSales);
  const requiredDailyRate = Math.round(remainingQty / remainingDays);
  const currentDailyRate = Math.round(totalSales / Math.max(1, elapsedDays));

  // Promo Types Breakdown
  const tesirProds = useMemo(() => products.filter((p) => (p.promo_type || '').toLowerCase().includes('tesir')), [products]);
  const adiProds = useMemo(() => products.filter((p) => !(p.promo_type || '').toLowerCase().includes('tesir')), [products]);
  const tesirAch = useMemo(() => {
    const fc = tesirProds.reduce((s, p) => s + (p.total_fc || 0), 0);
    const sale = tesirProds.reduce((s, p) => s + (p.total_sale || 0), 0);
    return fc > 0 ? Number(((sale / fc) * 100).toFixed(1)) : 0;
  }, [tesirProds]);
  const adiAch = useMemo(() => {
    const fc = adiProds.reduce((s, p) => s + (p.total_fc || 0), 0);
    const sale = adiProds.reduce((s, p) => s + (p.total_sale || 0), 0);
    return fc > 0 ? Number(((sale / fc) * 100).toFixed(1)) : 0;
  }, [adiProds]);

  // Executive Narrative Text
  const executiveNarrative = useMemo(() => {
    if (!data) return 'Məlumatlar yüklənir...';
    let statusText = '';
    if (achievementRate >= 80) {
      statusText = 'Kampaniya olduqca güclü temp ilə davam edir.';
    } else if (achievementRate >= 60) {
      statusText = 'Kampaniya orta templə gedir, hədəf üçün əlavə dəstək tələb olunur.';
    } else {
      statusText = 'Reallaşmada geriləmə müşahidə olunur, təcili operativ müdaxilə tövsiyə edilir.';
    }

    const stockoutWarn = stockoutStoresCount > 0
      ? `Kritik olaraq ${stockoutStoresCount} mağazada stokout halı qeydə alınıb.`
      : 'Mağazalarda ciddi stokout qeydə alınmayıb.';

    return `Hal-hazırda kampaniya üzrə ümumi reallaşma ${achievementRate}% səviyyəsindədir. Yekun proqnoz ${periodEndPct}% gözlənilir. ${statusText} ${stockoutWarn}`;
  }, [data, achievementRate, periodEndPct, stockoutStoresCount]);

  // Web Speech Text-to-Speech
  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(executiveNarrative);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Detect Azerbaijani or Turkish voice if present
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.startsWith('az') || v.lang.startsWith('tr'));
    if (voice) utterance.voice = voice;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Search filter inside Copilot
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();

    const matchedProducts = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedStores = stores.filter(
      (s) => s.store.toLowerCase().includes(q) || (s.area && s.area.toLowerCase().includes(q))
    ).slice(0, 4);

    return { products: matchedProducts, stores: matchedStores };
  }, [searchQuery, products, stores]);

  if (!visible) return null;

  return (
    <>
      {/* Volumetric Keyframes and Lighting Engine */}
      <style>{`
        @keyframes robotHoverFloat {
          0%, 100% {
            transform: translateY(0px) rotateZ(0deg);
          }
          50% {
            transform: translateY(-10px) rotateZ(1deg);
          }
        }
        @keyframes robotHoverFast {
          0%, 100% {
            transform: translateY(0px) rotateZ(-1deg);
          }
          50% {
            transform: translateY(-12px) rotateZ(1.5deg);
          }
        }
        @keyframes plasmaPulse {
          0%, 100% {
            opacity: 0.65;
            transform: scale(0.92);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
            filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.9));
          }
        }
        @keyframes antiGravityRings {
          0% {
            transform: scale(0.6) translateY(0px);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.4) translateY(14px);
            opacity: 0;
          }
        }
        @keyframes orbAura {
          0%, 100% {
            transform: scale(0.9);
            filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.7));
          }
          50% {
            transform: scale(1.2);
            filter: drop-shadow(0 0 14px rgba(245, 158, 11, 1)) drop-shadow(0 0 4px #FFFFFF);
          }
        }
        @keyframes earRingRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .robot-float-ambient {
          animation: robotHoverFloat 3.8s ease-in-out infinite;
        }
        .robot-float-fast {
          animation: robotHoverFast 1.8s ease-in-out infinite;
        }
        .robot-shadow-pulse {
          animation: shadowPulse 3.8s ease-in-out infinite;
          transform-origin: center center;
        }
        @keyframes shadowPulse {
          0%, 100% { transform: scale(1); opacity: 0.35; filter: blur(3px); }
          50% { transform: scale(0.7); opacity: 0.15; filter: blur(6px); }
        }
      `}</style>

      <div className="fixed bottom-6 right-3 z-[60] flex flex-col items-end select-none">
        {/* Help Center & AI Copilot Panel Popup */}
        {isOpen && (
          <div
            ref={panelRef}
            className="mb-3 w-88 sm:w-96 max-w-[calc(100vw-2rem)] max-h-[520px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{ boxShadow: '0 24px 60px -10px rgba(0,0,0,0.45), 0 0 0 1px rgba(59,130,246,0.25)' }}
          >
            {/* Panel Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-4 flex items-center justify-between shadow-md relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center space-x-3 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center p-1 border border-white/30 backdrop-blur-md shadow-inner">
                  <Bot className="w-6 h-6 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white tracking-wide leading-tight flex items-center gap-1.5">
                    TamStore AI Copilot
                    <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-300 text-slate-900 font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-xs">
                      Live AI
                    </span>
                  </h3>
                  <p className="text-[11px] text-blue-100 font-medium">Promo Qərar Qəbul Mərkəzi</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 relative z-10">
                <button
                  type="button"
                  onClick={handleToggleSpeak}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    isSpeaking
                      ? 'bg-rose-500/80 border-rose-300 text-white animate-pulse'
                      : 'bg-white/15 hover:bg-white/25 border-white/20 text-white'
                  }`}
                  title={isSpeaking ? 'Səsləndirməni Dayandır' : 'Xülasəni Dinlə'}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    stopSpeaking();
                  }}
                  className="w-7 h-7 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Bağla"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs (AI Copilot vs FAQ) */}
            <div className="flex items-center p-1.5 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 gap-1 shrink-0 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('copilot');
                  setSearchQuery('');
                }}
                className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'copilot'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>AI Analitika & Məsləhət</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('faq');
                  setSearchQuery('');
                }}
                className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'faq'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Bələdçi (FAQ)</span>
              </button>
            </div>

            {/* BODY: TAB 1 - AI COPILOT */}
            {activeTab === 'copilot' && (
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 text-xs">
                {/* 1. Live AI Executive Briefing Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-slate-900 border border-blue-200/80 dark:border-blue-900/60 shadow-xs space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Anlıq Rəhbər Xülasəsi
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        achievementRate >= 80
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                          : achievementRate >= 60
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'
                      }`}
                    >
                      {achievementRate >= 80 ? '🟢 Normal' : achievementRate >= 60 ? '🟡 Orta Risk' : '🔴 Kritik'}
                    </span>
                  </div>

                  <p className="text-[11.5px] leading-relaxed text-slate-700 dark:text-slate-200 font-sans">
                    {executiveNarrative}
                  </p>

                  <div className="pt-2 border-t border-blue-100 dark:border-blue-900/50 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/80 dark:bg-slate-850/80 p-1.5 rounded-xl border border-blue-100 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 block">Reallaşma</span>
                      <span className="font-extrabold text-blue-600 dark:text-blue-400 font-mono text-xs">
                        {achievementRate}%
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-850/80 p-1.5 rounded-xl border border-blue-100 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 block">Dövr Sonu FC</span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono text-xs">
                        {periodEndPct}%
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-850/80 p-1.5 rounded-xl border border-blue-100 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 block">Stokout Mğ.</span>
                      <span className="font-extrabold text-rose-600 dark:text-rose-400 font-mono text-xs">
                        {stockoutStoresCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Interactive Prompt Action Chips */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5 px-0.5">
                    Tövsiyə Olunan Analizlər
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCopilotView(copilotView === 'STOCKOUTS' ? 'BRIEF' : 'STOCKOUTS')}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        copilotView === 'STOCKOUTS'
                          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">Top 5 Stokout</span>
                      </div>
                      <span className="text-[10px] font-mono text-rose-600 font-extrabold shrink-0">
                        ({topStockouts.length})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCopilotView(copilotView === 'STARS' ? 'BRIEF' : 'STARS')}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        copilotView === 'STARS'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">Ulduz Məhsullar</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-600 font-extrabold shrink-0">
                        ({topStars.length})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCopilotView(copilotView === 'STORES' ? 'BRIEF' : 'STORES')}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        copilotView === 'STORES'
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Store className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">Lider / Zəif Mğ.</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setCopilotView(copilotView === 'RUNRATE' ? 'BRIEF' : 'RUNRATE')}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        copilotView === 'RUNRATE'
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Target className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">100% Hədəf Tələbi</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* 3. Dynamic Response Content Area */}
                {copilotView === 'STOCKOUTS' && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Ən Çox Mağazada Tükənən Məhsullar (Təcili Paylanma)
                    </span>
                    {topStockouts.map((p) => (
                      <div
                        key={p.code}
                        onClick={() => {
                          setSelectedProductDetail({ store: 'ALL', code: p.code });
                          setIsOpen(false);
                        }}
                        className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-rose-400 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">Kod: {p.code}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-rose-600 dark:text-rose-400 font-mono text-xs block">
                            {p.stockout_store_count} mğ.
                          </span>
                          <span className="text-[9px] text-slate-400">stokout</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {copilotView === 'STARS' && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Planı Qabaqlayan Lider Məhsullar
                    </span>
                    {topStars.map((p) => (
                      <div
                        key={p.code}
                        onClick={() => {
                          setSelectedProductDetail({ store: 'ALL', code: p.code });
                          setIsOpen(false);
                        }}
                        className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">Kod: {p.code}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-xs block">
                            {p.achievement_pct}%
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {Math.round(p.total_sale || 0)}/{Math.round(p.total_fc || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {copilotView === 'STORES' && (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block mb-1">
                        🏆 Top 3 Lider Mağaza
                      </span>
                      <div className="space-y-1">
                        {topStores.map((s) => (
                          <div
                            key={s.store}
                            onClick={() => {
                              setSelectedStoreDetail(s.store);
                              setIsOpen(false);
                            }}
                            className="p-1.5 px-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between cursor-pointer hover:border-emerald-400"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200">Mağaza {s.store}</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {s.achievement_pct}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 block mb-1">
                        ⚠️ Dəstək Tələb Edən Mağazalar
                      </span>
                      <div className="space-y-1">
                        {bottomStores.map((s) => (
                          <div
                            key={s.store}
                            onClick={() => {
                              setSelectedStoreDetail(s.store);
                              setIsOpen(false);
                            }}
                            className="p-1.5 px-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-center justify-between cursor-pointer hover:border-rose-400"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200">Mağaza {s.store}</span>
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                              {s.achievement_pct}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {copilotView === 'RUNRATE' && (
                  <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2 animate-in fade-in duration-150">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-amber-500" />
                      100% Reallaşma üçün Tələb Olunan Temp
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Kampaniyanın 100% hədəfinə çatmaq üçün qalan <b className="text-amber-600 font-mono">{remainingDays} gün</b> ərzində gündəlik tələb olunan satış:
                    </p>
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-amber-200 dark:border-slate-800 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tələb Olunan (Günlük)</span>
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                          {requiredDailyRate.toLocaleString()} u
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Faktiki Cari Temp</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {currentDailyRate.toLocaleString()} u
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Results Display */}
                {searchResults && (
                  <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Axtarış Nəticələri ({searchResults.products.length + searchResults.stores.length})
                    </span>

                    {searchResults.products.map((p) => (
                      <div
                        key={p.code}
                        onClick={() => {
                          setSelectedProductDetail({ store: 'ALL', code: p.code });
                          setIsOpen(false);
                        }}
                        className="p-1.5 px-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-blue-400"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                          {p.name}
                        </span>
                        <span className="font-mono text-blue-600 font-bold shrink-0">{p.achievement_pct}%</span>
                      </div>
                    ))}

                    {searchResults.stores.map((s) => (
                      <div
                        key={s.store}
                        onClick={() => {
                          setSelectedStoreDetail(s.store);
                          setIsOpen(false);
                        }}
                        className="p-1.5 px-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-blue-400"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Mağaza {s.store}</span>
                        <span className="font-mono text-emerald-600 font-bold shrink-0">{s.achievement_pct}%</span>
                      </div>
                    ))}

                    {searchResults.products.length === 0 && searchResults.stores.length === 0 && (
                      <p className="text-center text-slate-400 py-2">Heç bir nəticə tapılmadı</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* BODY: TAB 2 - FAQ ACCORDION */}
            {activeTab === 'faq' && (
              <div className="p-3 overflow-y-auto flex-1 space-y-2 text-slate-700 dark:text-slate-200 text-xs">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-1 uppercase tracking-wider flex items-center gap-1">
                  <span>💡</span> Tez-tez Verilən Suallar
                </p>
                {FAQ_LIST.map((faq) => {
                  const isExpanded = openFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? 'border-blue-400 dark:border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-blue-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <button
                        onClick={() => toggleFaq(faq.id)}
                        className="w-full text-left p-3 font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2 focus:outline-none cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isExpanded ? 'bg-blue-600 dark:bg-blue-400 scale-125' : 'bg-slate-400'
                            } transition-all`}
                          />
                          {faq.question}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                            isExpanded ? 'rotate-90 text-blue-600 dark:text-blue-400' : ''
                          }`}
                        />
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 text-slate-600 dark:text-slate-300 leading-relaxed border-t border-blue-100/60 dark:border-blue-900/40 font-sans">
                          <p className="mt-2 text-[11.5px]">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Smart Search Bar & Footer */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200/80 dark:border-slate-800 shrink-0 space-y-2">
              {activeTab === 'copilot' && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Məhsul, kod və ya mağaza axtarın..."
                    className="w-full pl-8 pr-6 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[10px] text-slate-500 font-medium">Yeni Excel yükləmək istəyirsiniz?</span>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    stopSpeaking();
                    setShowUploadModal(true);
                  }}
                  className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-[11px] transition-all shadow-xs flex items-center space-x-1 cursor-pointer active:scale-95"
                >
                  <Package className="w-3 h-3" />
                  <span>Excel Yüklə</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Speech Bubble Tooltip on Hover */}
        {hovered && !isOpen && (
          <div className="mb-2 px-3 py-1.5 bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold rounded-2xl shadow-2xl border border-blue-500/30 animate-in fade-in slide-in-from-bottom-2 duration-150 relative backdrop-blur-md flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>AI Məsləhətçi hazırdır! 🚀</span>
            <div className="absolute right-8 -bottom-1.5 w-3 h-3 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-blue-500/30" />
          </div>
        )}

        {/* FREESTANDING VOLUMETRIC ROBOT BUTTON */}
        <button
          ref={robotRef}
          onClick={handleRobotClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => {
            setHovered(false);
            if (robotRef.current) {
              robotRef.current.style.setProperty('--tilt-x', '0deg');
              robotRef.current.style.setProperty('--tilt-y', '0deg');
              robotRef.current.style.setProperty('--pupil-x', '0px');
              robotRef.current.style.setProperty('--pupil-y', '0px');
              robotRef.current.style.setProperty('--arm-x', '0px');
              robotRef.current.style.setProperty('--arm-y', '0px');
              robotRef.current.style.setProperty('--head-x', '0px');
              robotRef.current.style.setProperty('--head-y', '0px');
            }
          }}
          className={`relative w-22 h-26 flex flex-col items-center justify-center cursor-pointer group focus:outline-none transition-transform duration-300 ${
            isClicking ? 'scale-115' : 'hover:scale-105 active:scale-95'
          }`}
          style={{
            perspective: '700px',
            WebkitPerspective: '700px'
          }}
          title="TamStore AI Copilot"
          aria-label="TamStore AI Copilot"
        >
          {/* Main Floating Articulated Character Container */}
          <div
            className={`w-full h-22 relative ${hovered ? 'robot-float-fast' : 'robot-float-ambient'}`}
            style={{
              transform: 'rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))',
              transition: hovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out'
            }}
          >
            {/* Ultra High-Fidelity Volumetric Vector Robot SVG */}
            <svg
              viewBox="0 0 100 110"
              className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)] overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* 1. Volumetric Head Sphere Shading (Studio 3-Point Light) */}
                <radialGradient id="robotHeadGlow" cx="35%" cy="30%" r="70%" fx="25%" fy="20%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="25%" stopColor="#93C5FD" />
                  <stop offset="60%" stopColor="#2563EB" />
                  <stop offset="88%" stopColor="#1D4ED8" />
                  <stop offset="100%" stopColor="#0F172A" />
                </radialGradient>

                {/* 2. Volumetric Ceramic White Body Shading */}
                <radialGradient id="robotTorsoGlow" cx="38%" cy="28%" r="75%" fx="28%" fy="18%">
                  <stop offset="0%" stopColor="#F8FAFC" />
                  <stop offset="35%" stopColor="#E2E8F0" />
                  <stop offset="70%" stopColor="#94A3B8" />
                  <stop offset="92%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1E293B" />
                </radialGradient>

                {/* 3. Deep Obsidian Curved Glass Visor Gradient */}
                <radialGradient id="visorObsidian" cx="50%" cy="30%" r="75%">
                  <stop offset="0%" stopColor="#1E293B" />
                  <stop offset="45%" stopColor="#0F172A" />
                  <stop offset="85%" stopColor="#020617" />
                  <stop offset="100%" stopColor="#000000" />
                </radialGradient>

                {/* 4. Visor Curved Specular Glare Reflection */}
                <linearGradient id="visorGlareArc" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
                  <stop offset="25%" stopColor="#93C5FD" stopOpacity="0.3" />
                  <stop offset="60%" stopColor="#60A5FA" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>

                {/* 5. Golden Antenna Crystal Ball */}
                <radialGradient id="goldenOrb" cx="32%" cy="28%" r="65%" fx="25%" fy="20%">
                  <stop offset="0%" stopColor="#FFFBEB" />
                  <stop offset="30%" stopColor="#FDE047" />
                  <stop offset="65%" stopColor="#F59E0B" />
                  <stop offset="90%" stopColor="#D97706" />
                  <stop offset="100%" stopColor="#78350F" />
                </radialGradient>

                {/* 6. Arc Reactor Glowing Cyan Core */}
                <radialGradient id="arcCoreGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="35%" stopColor="#38BDF8" />
                  <stop offset="75%" stopColor="#0284C7" />
                  <stop offset="100%" stopColor="#0369A1" />
                </radialGradient>

                {/* 7. Metallic Chrome Side Pods */}
                <linearGradient id="chromeMetal" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#94A3B8" />
                  <stop offset="25%" stopColor="#F1F5F9" />
                  <stop offset="50%" stopColor="#64748B" />
                  <stop offset="75%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>

                {/* 8. Neon Glow Filter */}
                <filter id="neonBlur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* 9. Soft Visor Shadow Filter */}
                <filter id="dropGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#38BDF8" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* ---------------- 1. ANTI-GRAVITY JET & PLASMA WAVES (Bottom) ---------------- */}
              <g className="anti-gravity-engine">
                {/* Plasma Jet Flame */}
                <ellipse
                  cx="50"
                  cy="92"
                  rx="14"
                  ry="5"
                  fill="#38BDF8"
                  opacity="0.8"
                  filter="url(#neonBlur)"
                  style={{ animation: 'plasmaPulse 1.8s ease-in-out infinite' }}
                />
                <ellipse
                  cx="50"
                  cy="92"
                  rx="8"
                  ry="2.8"
                  fill="#FFFFFF"
                  filter="url(#neonBlur)"
                />
                {/* Floating Energy Downward Ring Waves */}
                <ellipse
                  cx="50"
                  cy="94"
                  rx="16"
                  ry="4.5"
                  stroke="#38BDF8"
                  strokeWidth="1.8"
                  fill="none"
                  style={{ animation: 'antiGravityRings 2.2s linear infinite' }}
                />
                <ellipse
                  cx="50"
                  cy="97"
                  rx="12"
                  ry="3.5"
                  stroke="#60A5FA"
                  strokeWidth="1.2"
                  fill="none"
                  style={{ animation: 'antiGravityRings 2.2s linear infinite 0.7s' }}
                />
              </g>

              {/* ---------------- 2. ANTENNA ASSEMBLY (Top) ---------------- */}
              <g>
                {/* Antenna Rod with Specular Highlight */}
                <rect x="48.5" y="10" width="3" height="15" rx="1.5" fill="url(#chromeMetal)" />
                <rect x="49" y="11" width="1" height="13" fill="#FFFFFF" opacity="0.8" />

                {/* Antenna Base Mount */}
                <ellipse cx="50" cy="24" rx="6" ry="2.2" fill="#1E3A8A" stroke="#60A5FA" strokeWidth="0.8" />

                {/* Top Glowing Crystal Orb with Aura */}
                <g style={{ animation: 'orbAura 2.2s ease-in-out infinite' }}>
                  <circle cx="50" cy="8.5" r="5.5" fill="url(#goldenOrb)" />
                  {/* Glass Specular Glint */}
                  <circle cx="48" cy="6.5" r="1.8" fill="#FFFFFF" opacity="0.9" />
                  {/* Energy Sparkle Cross */}
                  <path
                    d="M50 1.5 L50 3.5 M50 13.5 L50 15.5 M43 8.5 L45 8.5 M55 8.5 L57 8.5"
                    stroke="#FEF08A"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </g>
              </g>

              {/* ---------------- 3. ARTICULATED LEVITATING ARMS ---------------- */}
              {/* Left Hover Arm */}
              <g
                style={{
                  transform: 'translate(var(--arm-x, 0px), var(--arm-y, 0px))',
                  transition: 'transform 0.15s ease-out'
                }}
              >
                <circle cx="18" cy="62" r="5" fill="url(#robotHeadGlow)" stroke="#60A5FA" strokeWidth="1" />
                <path
                  d="M18 64 C14 70, 15 78, 20 81"
                  stroke="#2563EB"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="20" cy="81" r="3" fill="#38BDF8" filter="url(#dropGlow)" />
              </g>

              {/* Right Hover Arm */}
              <g
                style={{
                  transform: 'translate(calc(var(--arm-x, 0px) * -1), var(--arm-y, 0px))',
                  transition: 'transform 0.15s ease-out'
                }}
              >
                <circle cx="82" cy="62" r="5" fill="url(#robotHeadGlow)" stroke="#60A5FA" strokeWidth="1" />
                <path
                  d="M82 64 C86 70, 85 78, 80 81"
                  stroke="#2563EB"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="80" cy="81" r="3" fill="#38BDF8" filter="url(#dropGlow)" />
              </g>

              {/* ---------------- 4. TORSO / CHASSIS CAPSULE ---------------- */}
              <g>
                {/* Torso Capsule with Realistic Depth */}
                <path
                  d="M26 62 C26 57, 74 57, 74 62 L70 85 C70 90, 30 90, 30 85 Z"
                  fill="url(#robotTorsoGlow)"
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />

                {/* Torso Top Highlight Edge */}
                <path
                  d="M28 62 C34 59, 66 59, 72 62"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.9"
                />

                {/* Torso Side Rim Shading (Bevel) */}
                <path
                  d="M27 63 L31 84 C33 87, 67 87, 69 84 L73 63"
                  stroke="rgba(0,0,0,0.18)"
                  strokeWidth="1"
                  fill="none"
                />

                {/* Center High-Tech Arc Reactor Core */}
                <g filter="url(#dropGlow)">
                  <circle cx="50" cy="74" r="7.5" fill="#0F172A" stroke="#38BDF8" strokeWidth="1" />
                  <circle cx="50" cy="74" r="5.5" fill="url(#arcCoreGlow)" />
                  {/* Core Inner Highlight */}
                  <circle cx="50" cy="74" r="2.2" fill="#FFFFFF" />
                  {/* Rotating Tech Reticle Marks */}
                  <circle
                    cx="50"
                    cy="74"
                    r="6.8"
                    stroke="#E0F2FE"
                    strokeWidth="0.8"
                    strokeDasharray="2 3"
                    fill="none"
                    style={{ animation: 'earRingRotate 6s linear infinite' }}
                  />
                </g>

                {/* Anti-Gravity Jet Thruster Base Ring */}
                <ellipse cx="50" cy="87.5" rx="15" ry="4.5" fill="url(#chromeMetal)" stroke="#64748B" strokeWidth="1" />
                <ellipse cx="50" cy="88" rx="10" ry="2.8" fill="#0284C7" />
              </g>

              {/* ---------------- 5. MAGNETIC NECK JOINT GAP (Blue Electroluminescence) ---------------- */}
              <g>
                <ellipse cx="50" cy="56" rx="9" ry="3" fill="#1E293B" />
                <ellipse cx="50" cy="56" rx="7" ry="2" fill="#38BDF8" filter="url(#neonBlur)" opacity="0.8" />
              </g>

              {/* ---------------- 6. HEAD & CHROME EAR PODS ---------------- */}
              <g
                style={{
                  transform: 'translate(var(--head-x, 0px), var(--head-y, 0px))',
                  transition: 'transform 0.12s ease-out'
                }}
              >
                {/* Left Ear Audio Pod */}
                <g>
                  <rect x="13.5" y="32" width="6.5" height="16" rx="3.2" fill="url(#chromeMetal)" stroke="#64748B" strokeWidth="1" />
                  <rect x="15" y="34" width="2" height="12" rx="1" fill="#FFFFFF" opacity="0.85" />
                  {/* Ear Neon Ring */}
                  <circle cx="16.5" cy="40" r="3.2" stroke="#38BDF8" strokeWidth="1.2" fill="#0F172A" />
                  <circle cx="16.5" cy="40" r="1.5" fill="#38BDF8" filter="url(#neonBlur)" />
                </g>

                {/* Right Ear Audio Pod */}
                <g>
                  <rect x="80" y="32" width="6.5" height="16" rx="3.2" fill="url(#chromeMetal)" stroke="#64748B" strokeWidth="1" />
                  <rect x="83" y="34" width="2" height="12" rx="1" fill="#FFFFFF" opacity="0.85" />
                  {/* Ear Neon Ring */}
                  <circle cx="83.5" cy="40" r="3.2" stroke="#38BDF8" strokeWidth="1.2" fill="#0F172A" />
                  <circle cx="83.5" cy="40" r="1.5" fill="#38BDF8" filter="url(#neonBlur)" />
                </g>

                {/* Volumetric Head Shell (Ceramic Blue Metallic Capsule) */}
                <rect
                  x="18"
                  y="22"
                  width="64"
                  height="36"
                  rx="18"
                  fill="url(#robotHeadGlow)"
                  stroke="#60A5FA"
                  strokeWidth="1.8"
                />

                {/* Top Curved Highlight (Glass Reflection Across Dome) */}
                <path
                  d="M26 26 C36 23, 64 23, 74 26"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.85"
                />

                {/* ---------------- 7. CURVED OBSIDIAN VISOR SCREEN ---------------- */}
                <rect
                  x="22.5"
                  y="26"
                  width="55"
                  height="28"
                  rx="14"
                  fill="url(#visorObsidian)"
                  stroke="#0284C7"
                  strokeWidth="1.2"
                />

                {/* Curved Visor Glare Crescent Arc */}
                <path
                  d="M25 28 C34 27, 66 27, 75 28 C64 34, 36 34, 25 28 Z"
                  fill="url(#visorGlareArc)"
                />

                {/* ---------------- 8. EXPRESSIVE OLED DIGITAL EYES ---------------- */}
                <g
                  style={{
                    transform: 'translate(var(--pupil-x, 0px), var(--pupil-y, 0px))',
                    transition: 'transform 0.08s ease-out'
                  }}
                  filter="url(#dropGlow)"
                >
                  {isBlinking ? (
                    // Cute Blinking Digital Slits
                    <>
                      <line x1="30" y1="39" x2="43" y2="39" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
                      <line x1="57" y1="39" x2="70" y2="39" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
                    </>
                  ) : hovered || isOpen ? (
                    // Ultra Cute Happy Curved Eyes (^ ^)
                    <>
                      <path
                        d="M31 41 Q37 32 43 41"
                        stroke="#38BDF8"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <path
                        d="M32 40.5 Q37 34 42 40.5"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        fill="none"
                      />

                      <path
                        d="M57 41 Q63 32 69 41"
                        stroke="#38BDF8"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <path
                        d="M58 40.5 Q63 34 68 40.5"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </>
                  ) : (
                    // Volumetric Glowing Robotic Eyes
                    <>
                      {/* Left Eye */}
                      <g>
                        <ellipse cx="37" cy="38.5" rx="6.5" ry="7.5" fill="#0284C7" />
                        <ellipse cx="37" cy="38.5" rx="5" ry="6" fill="#38BDF8" />
                        <ellipse cx="36" cy="37" rx="3.2" ry="4" fill="#E0F2FE" />
                        {/* Specular White Catchlight Glints */}
                        <circle cx="34.8" cy="35.5" r="1.8" fill="#FFFFFF" />
                        <circle cx="38.5" cy="40.5" r="0.9" fill="#FFFFFF" opacity="0.85" />
                      </g>

                      {/* Right Eye */}
                      <g>
                        <ellipse cx="63" cy="38.5" rx="6.5" ry="7.5" fill="#0284C7" />
                        <ellipse cx="63" cy="38.5" rx="5" ry="6" fill="#38BDF8" />
                        <ellipse cx="62" cy="37" rx="3.2" ry="4" fill="#E0F2FE" />
                        {/* Specular White Catchlight Glints */}
                        <circle cx="60.8" cy="35.5" r="1.8" fill="#FFFFFF" />
                        <circle cx="64.5" cy="40.5" r="0.9" fill="#FFFFFF" opacity="0.85" />
                      </g>
                    </>
                  )}
                </g>

                {/* ---------------- 9. DIGITAL OLED SMILE ---------------- */}
                <path
                  d={hovered || isOpen ? 'M42 47.5 Q50 53 58 47.5' : 'M43 47 Q50 50.5 57 47'}
                  stroke="#38BDF8"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                  filter="url(#dropGlow)"
                />
              </g>
            </svg>
          </div>

          {/* ---------------- 10. REALISTIC PERSPECTIVE GROUND SHADOW ---------------- */}
          <div className="w-16 h-3 -mt-1.5 flex items-center justify-center pointer-events-none">
            <svg viewBox="0 0 70 12" className="w-full h-full">
              <ellipse
                cx="35"
                cy="6"
                rx="22"
                ry="4"
                fill="#0F172A"
                className="robot-shadow-pulse"
              />
            </svg>
          </div>
        </button>
      </div>
    </>
  );
};

export default RobotPet;
