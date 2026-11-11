import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { isPromoTypeMatch, isProductMatchGlobalFilters } from '../utils/filterUtils';
import { SortableHeader } from '../components/common/SortableHeader';
import { Sparkline, generateDeterministicSparkline } from '../components/common/Sparkline';

import { DashboardSkeleton } from '../components/common/SkeletonLoader';

export const ProductAnalyticsPage: React.FC = () => {
  const { data, setSelectedProductDetail, filters } = useData();
  const [sortField, setSortField] = useState<string>("total_sale");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  if (!data || !data.product_performances) return <DashboardSkeleton />;

  const { product_performances } = data;

  const filteredProducts = product_performances.filter((p) => {
    if (!isProductMatchGlobalFilters(p, filters)) return false;
    if (filters.abcClass !== 'ALL' && p.abc_class !== filters.abcClass) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const getExcelStoreCount = (p: (typeof product_performances)[0]) => {
    return p.excel_store_count ?? (p.insert_format === 'SCM' ? 109 : p.insert_format === 'SC' ? 91 : p.insert_format === 'S' ? 69 : p.store_count);
  };

  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'total_distribution_qty') {
      valA = a.total_distribution_qty ?? ((a.total_sale || 0) + (a.total_stock || 0));
      valB = b.total_distribution_qty ?? ((b.total_sale || 0) + (b.total_stock || 0));
    } else if (sortField === 'excel_store_count') {
      valA = getExcelStoreCount(a);
      valB = getExcelStoreCount(b);
    }

    if (valA === null || valA === undefined) valA = sortAsc ? Infinity : -Infinity;
    if (valB === null || valB === undefined) valB = sortAsc ? Infinity : -Infinity;

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortAsc ? numA - numB : numB - numA;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      const isStringField = field === 'code' || field === 'name' || field === 'insert_format';
      setSortAsc(isStringField);
    }
  };

  const selectedStoreCode = filters.selectedStore || 'ALL';

  return (
    <div className="space-y-6 pb-12 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Məhsul Analitikası (Product Analytics)</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Promosiyada olan bütün məhsulların reallaşma və stokout göstəriciləri</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            { fmt: 'SCM', stores: 109 },
            { fmt: 'SC', stores: 91 },
            { fmt: 'S', stores: 69 },
          ] as const).map(({ fmt, stores }) => {
            const cnt = filteredProducts.filter((p) => p.insert_format === fmt).length;
            if (cnt === 0) return null;
            return (
              <span
                key={fmt}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs"
              >
                <span className="font-bold text-slate-800 dark:text-slate-100">{fmt}:</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">{cnt} məhsul</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">({stores} mağaza)</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700 select-none">
              <tr>
                <SortableHeader label="Kod" field="code" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="left" />
                <SortableHeader label="Məhsul Adı" field="name" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="left" />
                <SortableHeader label="İnsert Formatı" field="insert_format" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="center" />
                <SortableHeader label="Excel Mağaza Sayı" field="excel_store_count" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="center" />
                <SortableHeader label="Aktiv Mağaza Sayı" field="active_store_count" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="center" />
                <SortableHeader label="Dağılım Miqdarı" field="total_distribution_qty" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="right" />
                <SortableHeader label="FC (Proqnoz)" field="total_fc" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="right" />
                <SortableHeader label="SALE (Satış)" field="total_sale" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="right" />
                <SortableHeader label="Reallaşma %" field="achievement_pct" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="right" />
                <SortableHeader label="Qalıq Stok" field="total_stock" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="right" />
                <SortableHeader label="Stokout Mağaza" field="stockout_store_count" currentSortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="center" />
                <th className="p-3 text-center font-bold">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedProducts.map((p) => {
                return (
                  <tr
                    key={p.code}
                    onClick={() => setSelectedProductDetail({ store: selectedStoreCode, code: p.code })}
                    className="hover:bg-blue-50/70 dark:hover:bg-slate-800/60 cursor-pointer transition-all"
                  >
                    <td className="p-3 font-mono font-bold text-blue-700 dark:text-blue-400">{p.code}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center space-x-2">
                        <span>{p.name}</span>
                        {p.promo_type && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              p.promo_type.toLowerCase() === 'tesir' || p.promo_type.toLowerCase() === 'teshir'
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {p.promo_type.toLowerCase() === 'tesir' || p.promo_type.toLowerCase() === 'teshir'
                              ? 'Təsir'
                              : 'Adi'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {p.insert_format ? (
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold font-mono tracking-wider border shadow-2xs ${
                            p.insert_format === 'SCM'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : p.insert_format === 'SC'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {p.insert_format}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-mono font-bold">
                        {getExcelStoreCount(p)}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {p.active_store_count ?? p.store_count}
                        </span>
                        {(p.passive_store_count ?? 0) > 0 && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            title={`${p.passive_store_count} mağazada sifarişə qapalıdır (Passiv)`}
                          >
                            +{p.passive_store_count} qapalı
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-blue-700 dark:text-blue-300">{(p.total_distribution_qty ?? (p.total_sale + p.total_stock)).toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">{p.total_fc.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{p.total_sale.toLocaleString()}</td>
                    <td className="p-3 text-right font-extrabold text-blue-600 dark:text-blue-400">{p.achievement_pct}%</td>
                    <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">{p.total_stock.toLocaleString()}</td>
                    <td className="p-3 text-center font-mono">
                      {p.stockout_store_count > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">{p.stockout_store_count} mağaza</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">0</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Sparkline
                        data={generateDeterministicSparkline(p.code, p.total_sale, p.achievement_pct, 12)}
                        width={62}
                        height={20}
                        showBadge={true}
                      />
                    </td>
                  </tr>
                );
              })}
              {sortedProducts.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Süzgəclərə uyğun heç bir məhsul tapılmadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
