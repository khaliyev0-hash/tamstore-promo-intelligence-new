import React from 'react';
import { DataProvider, useData } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/common/ToastProvider';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalFilterBar } from './components/layout/GlobalFilterBar';
import { UploadModal } from './components/common/UploadModal';
import { DataQualityModal } from './components/mapping/DataQualityModal';
import { ColumnMapperModal } from './components/mapping/ColumnMapperModal';
import { ProductDetailModal } from './components/product/ProductDetailModal';
import { StoreDetailModal } from './components/store/StoreDetailModal';
import { PresentationModeModal } from './components/presentation/PresentationModeModal';
import { RobotPet } from './components/common/RobotPet';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { ExecutiveDashboard } from './pages/ExecutiveDashboard';
import { PromoCatalogPage } from './pages/PromoCatalogPage';
import { PromoPerformancePage } from './pages/PromoPerformancePage';
import { PromoUpliftPage } from './pages/PromoUpliftPage';
import { CategoryAnalysisPage } from './pages/CategoryAnalysisPage';
import { AreaAnalysisPage } from './pages/AreaAnalysisPage';
import { StoreAnalyticsPage } from './pages/StoreAnalyticsPage';
import { StoreDailyStockPage } from './pages/StoreDailyStockPage';
import { ServiceLevelPage } from './pages/ServiceLevelPage';
import { ProductAnalyticsPage } from './pages/ProductAnalyticsPage';
import { StockoutAnalysisPage } from './pages/StockoutAnalysisPage';
import { LostSalesPage } from './pages/LostSalesPage';
import { ProductStoreMatrixPage } from './pages/ProductStoreMatrixPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PromoDistributionPage } from './pages/PromoDistributionPage';

import { CommandPalette } from './components/common/CommandPalette';

const MainContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    loading,
    showCommandPalette,
    setShowCommandPalette,
    showPresentationMode,
    setShowPresentationMode
  } = useData();

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as any).__setActiveTab = setActiveTab;
    (window as any).__activeTab = activeTab;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'promo_distribution':
        return <PromoDistributionPage />;
      case 'dashboard':
        return <ExecutiveDashboard />;
      case 'promo_catalog':
        return <PromoCatalogPage />;
      case 'promo_perf':
        return <PromoPerformancePage />;
      case 'promo_uplift':
        return <PromoUpliftPage />;
      case 'category_analysis':
        return <CategoryAnalysisPage />;
      case 'area_analysis':
        return <AreaAnalysisPage />;
      case 'store_analytics':
        return <StoreAnalyticsPage />;
      case 'store_daily_stock':
        return <StoreDailyStockPage />;
      case 'service_level':
        return <ServiceLevelPage />;
      case 'product_analytics':
        return <ProductAnalyticsPage />;
      case 'stockout_analysis':
        return <StockoutAnalysisPage />;
      case 'lost_sales':
        return <LostSalesPage />;
      case 'matrix':
        return <ProductStoreMatrixPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <ExecutiveDashboard />;
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-transparent relative">
        <Header />
        <ErrorBoundary resetKey="global-filter-bar" title="Filter Paneli">
          <GlobalFilterBar />
        </ErrorBoundary>

        {/* Ambient Aurora Fixed Background Layer (Zero-Lag GPU Hardware Accelerated) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-gradient-to-b from-sky-50/50 via-slate-50/70 to-blue-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
          {/* Light Blue Ambient Spheres with pure hardware-accelerated radial gradients */}
          <div
            className="absolute -top-20 -left-20 w-[38rem] h-[38rem] rounded-full pointer-events-none transform-gpu animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0.06) 45%, transparent 72%)',
              animationDuration: '10s',
              willChange: 'opacity, transform',
              transform: 'translate3d(0,0,0)'
            }}
          />
          <div
            className="absolute top-1/4 -right-20 w-[36rem] h-[36rem] rounded-full pointer-events-none transform-gpu animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.18) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 72%)',
              animationDuration: '12s',
              willChange: 'opacity, transform',
              transform: 'translate3d(0,0,0)'
            }}
          />
          <div
            className="absolute -bottom-20 left-1/4 w-[40rem] h-[40rem] rounded-full pointer-events-none transform-gpu"
            style={{
              background: 'radial-gradient(circle, rgba(96, 165, 250, 0.16) 0%, rgba(59, 130, 246, 0.04) 50%, transparent 72%)',
              willChange: 'transform',
              transform: 'translate3d(0,0,0)'
            }}
          />
          <div
            className="absolute top-2/3 right-1/4 w-[30rem] h-[30rem] rounded-full pointer-events-none transform-gpu animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(125, 211, 252, 0.15) 0%, rgba(14, 165, 233, 0.04) 50%, transparent 72%)',
              animationDuration: '14s',
              willChange: 'opacity, transform',
              transform: 'translate3d(0,0,0)'
            }}
          />
        </div>

        <main className="flex-1 overflow-y-auto px-6 pt-3 pb-8 relative z-10 min-h-0 bg-transparent">
          {loading && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-40 flex items-center justify-center">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex items-center space-x-3 text-sm text-blue-600 dark:text-blue-400 font-bold">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Məlumatlar Emal Edilir...</span>
              </div>
            </div>
          )}
          <div key={activeTab} className="relative z-10 animate-in fade-in duration-200 ease-out">
            <ErrorBoundary resetKey={activeTab} title="Səhifədə bir xəta baş verdi">
              {renderTab()}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Modals & Persistent Widgets */}
      <ErrorBoundary isModal={true} title="Modulda bir xəta baş verdi">
        <UploadModal />
        <DataQualityModal />
        <ColumnMapperModal />
        <ProductDetailModal />
        <StoreDetailModal />
        <PresentationModeModal
          isOpen={showPresentationMode}
          onClose={() => setShowPresentationMode(false)}
        />
        <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
        <RobotPet />
      </ErrorBoundary>
    </div>
  );
};

export function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <ThemeProvider>
          <MainContent />
        </ThemeProvider>
      </DataProvider>
    </ToastProvider>
  );
}

export default App;
