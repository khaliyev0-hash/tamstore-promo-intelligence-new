import React from 'react';
import { useData } from '../../context/DataContext';
import { RotateCcw } from 'lucide-react';
import { MultiSelectDropdown } from '../common/MultiSelectDropdown';

export const GlobalFilterBar: React.FC = () => {
  const { filters, setFilters, data, t } = useData();

  // Extract unique categories (from data.categories or derived from product_performances)
  const categoryOptions = React.useMemo(() => {
    if (data?.categories && data.categories.length > 0) {
      return data.categories;
    }
    const set = new Set<string>();
    data?.product_performances?.forEach((p) => {
      const cat = String(p.category || '').trim();
      if (cat && cat !== 'None' && cat !== 'nan') {
        set.add(cat);
      }
    });
    return Array.from(set).sort();
  }, [data?.categories, data?.product_performances]);

  // Extract unique areas (from data.areas or derived from store_performances)
  const areaOptions = React.useMemo(() => {
    if (data?.areas && data.areas.length > 0) {
      return data.areas;
    }
    const set = new Set<string>();
    data?.store_performances?.forEach((s) => {
      const ar = String(s.area || '').trim();
      if (ar && ar !== 'None' && ar !== 'nan') {
        set.add(ar);
      }
    });
    return Array.from(set).sort();
  }, [data?.areas, data?.store_performances]);

  // Extract unique sub areas (filtered by selected areas if active)
  const subAreaOptions = React.useMemo(() => {
    let stores = data?.store_performances || [];
    const activeAreas =
      filters?.selectedAreas && filters.selectedAreas.length > 0
        ? filters.selectedAreas
        : filters?.selectedArea && filters.selectedArea !== 'ALL'
        ? [filters.selectedArea]
        : [];

    if (activeAreas.length > 0) {
      stores = stores.filter((s) => activeAreas.includes(s.area || ''));
    }
    const set = new Set<string>();
    stores.forEach((s) => {
      const sa = String(s.sub_area || '').trim();
      if (sa && sa !== 'None' && sa !== 'nan') {
        set.add(sa);
      }
    });
    if (set.size === 0 && activeAreas.length === 0 && data?.sub_areas && data.sub_areas.length > 0) {
      data.sub_areas.forEach((sa) => {
        const str = String(sa || '').trim();
        if (str) set.add(str);
      });
    }
    return Array.from(set).sort();
  }, [data?.sub_areas, data?.store_performances, filters?.selectedArea, filters?.selectedAreas]);

  // Extract unique families (filtered by selected categories if active)
  const familyOptions = React.useMemo(() => {
    let prods = data?.product_performances || [];
    const activeCats =
      filters?.selectedCategories && filters.selectedCategories.length > 0
        ? filters.selectedCategories
        : filters?.selectedCategory && filters.selectedCategory !== 'ALL'
        ? [filters.selectedCategory]
        : [];

    if (activeCats.length > 0) {
      prods = prods.filter((p) => activeCats.includes(p.category || ''));
    }
    const set = new Set<string>();
    prods.forEach((p) => {
      const fam = String(p.family || '').trim();
      if (fam && fam !== 'None' && fam !== 'nan') {
        set.add(fam);
      }
    });
    if (set.size === 0 && activeCats.length === 0 && data?.families && data.families.length > 0) {
      data.families.forEach((f) => {
        const str = String(f || '').trim();
        if (str) set.add(str);
      });
    }
    return Array.from(set).sort();
  }, [data?.families, data?.product_performances, filters?.selectedCategory, filters?.selectedCategories]);

  // Stores filtered by selected area and sub_area
  const filteredStoreOptions = React.useMemo(() => {
    let stores = data?.store_performances || [];
    const activeAreas =
      filters?.selectedAreas && filters.selectedAreas.length > 0
        ? filters.selectedAreas
        : filters?.selectedArea && filters.selectedArea !== 'ALL'
        ? [filters.selectedArea]
        : [];
    const activeSubAreas =
      filters?.selectedSubAreas && filters.selectedSubAreas.length > 0
        ? filters.selectedSubAreas
        : filters?.selectedSubArea && filters.selectedSubArea !== 'ALL'
        ? [filters.selectedSubArea]
        : [];

    if (activeAreas.length > 0) {
      stores = stores.filter((s) => activeAreas.includes(s.area || ''));
    }
    if (activeSubAreas.length > 0) {
      stores = stores.filter((s) => activeSubAreas.includes(s.sub_area || ''));
    }
    return stores.map((s) => s.store);
  }, [
    data?.store_performances,
    filters?.selectedArea,
    filters?.selectedAreas,
    filters?.selectedSubArea,
    filters?.selectedSubAreas
  ]);

  const storeOptions = React.useMemo(() => {
    return filteredStoreOptions.map((st) => ({
      value: String(st),
      label: `Mağaza ${st}`
    }));
  }, [filteredStoreOptions]);

  // Products filtered by selected category and family
  const filteredProductOptions = React.useMemo(() => {
    let prods = data?.product_performances || [];
    const activeCats =
      filters?.selectedCategories && filters.selectedCategories.length > 0
        ? filters.selectedCategories
        : filters?.selectedCategory && filters.selectedCategory !== 'ALL'
        ? [filters.selectedCategory]
        : [];
    const activeFams =
      filters?.selectedFamilies && filters.selectedFamilies.length > 0
        ? filters.selectedFamilies
        : filters?.selectedFamily && filters.selectedFamily !== 'ALL'
        ? [filters.selectedFamily]
        : [];

    if (activeCats.length > 0) {
      prods = prods.filter((p) => activeCats.includes(p.category || ''));
    }
    if (activeFams.length > 0) {
      prods = prods.filter((p) => activeFams.includes(p.family || ''));
    }
    return prods.map((p) => ({ code: p.code, name: p.name }));
  }, [
    data?.product_performances,
    filters?.selectedCategory,
    filters?.selectedCategories,
    filters?.selectedFamily,
    filters?.selectedFamilies
  ]);

  const productOptions = React.useMemo(() => {
    return filteredProductOptions.map((p) => ({
      value: String(p.code),
      label: `${p.name} (${p.code})`,
      subLabel: `Kod: ${p.code}`
    }));
  }, [filteredProductOptions]);

  const productPerformances = data?.product_performances || [];
  const tesirCount = React.useMemo(
    () =>
      productPerformances.filter((p) => {
        const pt = (p.promo_type || '').toLowerCase();
        return pt === 'tesir' || pt === 'teshir';
      }).length,
    [productPerformances]
  );
  const adiCount = React.useMemo(
    () =>
      productPerformances.filter((p) => {
        const pt = (p.promo_type || '').toLowerCase();
        return pt === 'adi' || (!pt && productPerformances.length > 0);
      }).length,
    [productPerformances]
  );

  const promoTypeOptions = React.useMemo(() => [
    { value: 'TESIR', label: '🎪 Təsir Promosu', count: tesirCount },
    { value: 'ADI', label: '🏷️ Adi Promo', count: adiCount }
  ], [tesirCount, adiCount]);

  // Extract unique statuses (Sifarişə Açıq / Sifarişə Qapalı)
  const statusOptions = React.useMemo(() => {
    const prods = data?.product_performances || [];
    let aktivCount = 0;
    let passivCount = 0;
    prods.forEach((p) => {
      const hasPass = (p.passive_store_count ?? 0) > 0;
      const hasAct = (p.active_store_count ?? p.store_count ?? 1) > 0;
      const s = String(p.status || '').toLowerCase();
      const isPurePass = s.startsWith('passiv') || s.startsWith('xeyr') || s.startsWith('qapali') || s.startsWith('pasif');

      if (hasAct && !isPurePass) {
        aktivCount++;
      }
      if (hasPass || isPurePass) {
        passivCount++;
      }
    });
    return [
      { value: 'Aktiv', label: '🟢 Sifarişə Açıq', count: aktivCount > 0 ? aktivCount : undefined },
      { value: 'Passiv', label: '🔴 Sifarişə Qapalı', count: passivCount > 0 ? passivCount : undefined }
    ];
  }, [data?.product_performances]);

  // Extract unique origins (İdxal, PL, Yerli)
  const originOptions = React.useMemo(() => {
    const set = new Set<string>();
    if (data?.origins && data.origins.length > 0) {
      data.origins.forEach((o) => {
        const s = String(o || '').trim();
        if (s && s !== 'None' && s !== 'nan') set.add(s);
      });
    }
    data?.product_performances?.forEach((p) => {
      const org = String(p.origin || '').trim();
      if (org && org !== 'None' && org !== 'nan') {
        set.add(org);
      }
    });
    if (set.size === 0) {
      return ['İdxal', 'PL', 'Yerli'];
    }
    return Array.from(set).sort();
  }, [data?.origins, data?.product_performances]);

  const originDropdownOptions = React.useMemo(() => {
    const prods = data?.product_performances || [];
    return originOptions.map((org) => {
      const normOrg = org.trim().toLowerCase().replace('i̇', 'i').replace('ı', 'i');
      const count = prods.filter((p) => {
        const pOrg = String(p.origin || '').trim().toLowerCase().replace('i̇', 'i').replace('ı', 'i');
        return pOrg === normOrg;
      }).length;
      return {
        value: org,
        label: org.toLowerCase() === 'idxal' ? 'İdxal' : org,
        count: count > 0 ? count : undefined
      };
    });
  }, [originOptions, data?.product_performances]);

  // Extract unique insert formats (S, SC, SCM)
  const insertFormatOptions = React.useMemo(() => {
    const set = new Set<string>();
    if (data?.insert_formats && data.insert_formats.length > 0) {
      data.insert_formats.forEach((f) => {
        const s = String(f || '').trim();
        if (s && s !== 'None' && s !== 'nan') set.add(s);
      });
    }
    data?.product_performances?.forEach((p) => {
      const fmt = String(p.insert_format || '').trim();
      if (fmt && fmt !== 'None' && fmt !== 'nan') {
        set.add(fmt);
      }
    });
    if (set.size === 0) {
      return ['S', 'SC', 'SCM'];
    }
    return Array.from(set).sort();
  }, [data?.insert_formats, data?.product_performances]);

  const insertFormatDropdownOptions = React.useMemo(() => {
    const prods = data?.product_performances || [];
    return insertFormatOptions.map((fmt) => {
      const normFmt = fmt.trim().toUpperCase();
      const count = prods.filter((p) => {
        const pFmt = String(p.insert_format || '').trim().toUpperCase();
        return pFmt === normFmt;
      }).length;
      return {
        value: fmt,
        label: fmt,
        count: count > 0 ? count : undefined
      };
    });
  }, [insertFormatOptions, data?.product_performances]);

  // Extract unique store formats (SUPER, CITY, etc.)
  const storeFormatOptions = React.useMemo(() => {
    const set = new Set<string>();
    if (data?.formats && data.formats.length > 0) {
      data.formats.forEach((f) => {
        const s = String(f || '').trim();
        if (s && s !== 'None' && s !== 'nan') set.add(s);
      });
    }
    data?.store_performances?.forEach((s) => {
      const fmt = String(s.format || '').trim();
      if (fmt && fmt !== 'None' && fmt !== 'nan') {
        set.add(fmt);
      }
    });
    return Array.from(set).sort();
  }, [data?.formats, data?.store_performances]);

  const storeFormatDropdownOptions = React.useMemo(() => {
    const stores = data?.store_performances || [];
    return storeFormatOptions.map((fmt) => {
      const normFmt = fmt.trim().toUpperCase();
      const count = stores.filter((s) => {
        const sFmt = String(s.format || '').trim().toUpperCase();
        return sFmt === normFmt;
      }).length;
      return {
        value: fmt,
        label: fmt,
        count: count > 0 ? count : undefined
      };
    });
  }, [storeFormatOptions, data?.store_performances]);

  // Extract supply type options (Depo 40, Firma 41, Sifarişsiz 42)
  const supplyTypeOptions = React.useMemo(() => [
    { value: 'Depo', label: '🏢 Depo (40)' },
    { value: 'Firma', label: '🏭 Firma (41)' },
    { value: 'Sifarişsiz', label: '📦 Sifarişsiz (42)' }
  ], []);

  const depoCount = React.useMemo(() => {
    return (data?.product_performances || []).filter((p) => {
      const st = String(p.supply_type || p.primary_supply_type || p.tedaruk_tipi || '').toLowerCase();
      const raw = String(p.tedaruk_tipi_raw || '');
      return st.includes('depo') || raw === '40';
    }).length;
  }, [data?.product_performances]);

  const firmaCount = React.useMemo(() => {
    return (data?.product_performances || []).filter((p) => {
      const st = String(p.supply_type || p.primary_supply_type || p.tedaruk_tipi || '').toLowerCase();
      const raw = String(p.tedaruk_tipi_raw || '');
      return st.includes('firma') || raw === '41';
    }).length;
  }, [data?.product_performances]);

  const sifarissizCount = React.useMemo(() => {
    return (data?.product_performances || []).filter((p) => {
      const st = String(p.supply_type || p.primary_supply_type || p.tedaruk_tipi || '').toLowerCase();
      const raw = String(p.tedaruk_tipi_raw || '');
      return st.includes('sifaris') || raw === '42';
    }).length;
  }, [data?.product_performances]);

  const supplyTypeDropdownOptions = React.useMemo(() => {
    return [
      { value: 'Depo', label: '🏢 Depo (40)', count: depoCount > 0 ? depoCount : undefined },
      { value: 'Firma', label: '🏭 Firma (41)', count: firmaCount > 0 ? firmaCount : undefined },
      { value: 'Sifarişsiz', label: '📦 Sifarişsiz (42)', count: sifarissizCount > 0 ? sifarissizCount : undefined }
    ];
  }, [depoCount, firmaCount, sifarissizCount]);

  const handleReset = () => {
    setFilters({
      searchQuery: '',
      selectedStore: '',
      selectedStores: [],
      selectedProduct: '',
      selectedProducts: [],
      selectedCategory: 'ALL',
      selectedCategories: [],
      selectedArea: 'ALL',
      selectedAreas: [],
      selectedFamily: 'ALL',
      selectedFamilies: [],
      selectedSubArea: 'ALL',
      selectedSubAreas: [],
      selectedOrigin: 'ALL',
      selectedOrigins: [],
      selectedInsertFormat: 'ALL',
      selectedInsertFormats: [],
      selectedFormat: 'ALL',
      selectedFormats: [],
      selectedStatus: 'ALL',
      selectedStatuses: [],
      selectedSupplyType: 'ALL',
      selectedSupplyTypes: [],
      achievementStatus: 'ALL',
      stockStatus: 'ALL',
      abcClass: 'ALL',
      dateRange: 'ALL',
      promoType: 'ALL',
      selectedPromoTypes: []
    });
  };

  const hasActiveFilters = Boolean(
    (filters?.selectedStores && filters.selectedStores.length > 0) ||
    (filters?.selectedProducts && filters.selectedProducts.length > 0) ||
    (filters?.selectedCategories && filters.selectedCategories.length > 0) ||
    (filters?.selectedAreas && filters.selectedAreas.length > 0) ||
    (filters?.selectedFamilies && filters.selectedFamilies.length > 0) ||
    (filters?.selectedSubAreas && filters.selectedSubAreas.length > 0) ||
    (filters?.selectedOrigins && filters.selectedOrigins.length > 0) ||
    (filters?.selectedInsertFormats && filters.selectedInsertFormats.length > 0) ||
    (filters?.selectedFormats && filters.selectedFormats.length > 0) ||
    (filters?.selectedStatuses && filters.selectedStatuses.length > 0) ||
    (filters?.selectedSupplyTypes && filters.selectedSupplyTypes.length > 0) ||
    (filters?.selectedPromoTypes && filters.selectedPromoTypes.length > 0) ||
    (filters?.selectedStore && filters.selectedStore !== '') ||
    (filters?.selectedProduct && filters.selectedProduct !== '') ||
    (filters?.selectedCategory && filters.selectedCategory !== 'ALL') ||
    (filters?.selectedArea && filters.selectedArea !== 'ALL') ||
    (filters?.selectedFamily && filters.selectedFamily !== 'ALL') ||
    (filters?.selectedSubArea && filters.selectedSubArea !== 'ALL') ||
    (filters?.selectedOrigin && filters.selectedOrigin !== 'ALL') ||
    (filters?.selectedInsertFormat && filters.selectedInsertFormat !== 'ALL') ||
    (filters?.selectedFormat && filters.selectedFormat !== 'ALL') ||
    (filters?.selectedStatus && filters.selectedStatus !== 'ALL') ||
    (filters?.selectedSupplyType && filters.selectedSupplyType !== 'ALL') ||
    (filters?.promoType && filters.promoType !== 'ALL')
  );

  // Active selected arrays for each dropdown
  const currentFamilySelected = filters?.selectedFamilies && filters.selectedFamilies.length > 0
    ? filters.selectedFamilies
    : filters?.selectedFamily && filters.selectedFamily !== 'ALL'
    ? [filters.selectedFamily]
    : [];

  const currentSubAreaSelected = filters?.selectedSubAreas && filters.selectedSubAreas.length > 0
    ? filters.selectedSubAreas
    : filters?.selectedSubArea && filters.selectedSubArea !== 'ALL'
    ? [filters.selectedSubArea]
    : [];

  const currentAreaSelected = filters?.selectedAreas && filters.selectedAreas.length > 0
    ? filters.selectedAreas
    : filters?.selectedArea && filters.selectedArea !== 'ALL'
    ? [filters.selectedArea]
    : [];

  const currentStoreSelected = filters?.selectedStores && filters.selectedStores.length > 0
    ? filters.selectedStores
    : filters?.selectedStore
    ? [filters.selectedStore]
    : [];

  const currentCategorySelected = filters?.selectedCategories && filters.selectedCategories.length > 0
    ? filters.selectedCategories
    : filters?.selectedCategory && filters.selectedCategory !== 'ALL'
    ? [filters.selectedCategory]
    : [];

  const currentProductSelected = filters?.selectedProducts && filters.selectedProducts.length > 0
    ? filters.selectedProducts
    : filters?.selectedProduct
    ? [filters.selectedProduct]
    : [];

  const currentOriginSelected = filters?.selectedOrigins && filters.selectedOrigins.length > 0
    ? filters.selectedOrigins
    : filters?.selectedOrigin && filters.selectedOrigin !== 'ALL'
    ? [filters.selectedOrigin]
    : [];

  const currentInsertFormatSelected = filters?.selectedInsertFormats && filters.selectedInsertFormats.length > 0
    ? filters.selectedInsertFormats
    : filters?.selectedInsertFormat && filters.selectedInsertFormat !== 'ALL'
    ? [filters.selectedInsertFormat]
    : [];

  const currentStoreFormatSelected = filters?.selectedFormats && filters.selectedFormats.length > 0
    ? filters.selectedFormats
    : filters?.selectedFormat && filters.selectedFormat !== 'ALL'
    ? [filters.selectedFormat]
    : [];

  const currentStatusSelected = filters?.selectedStatuses && filters.selectedStatuses.length > 0
    ? filters.selectedStatuses
    : filters?.selectedStatus && filters.selectedStatus !== 'ALL'
    ? [filters.selectedStatus]
    : [];

  const currentSupplyTypeSelected = filters?.selectedSupplyTypes && filters.selectedSupplyTypes.length > 0
    ? filters.selectedSupplyTypes
    : filters?.selectedSupplyType && filters.selectedSupplyType !== 'ALL'
    ? [filters.selectedSupplyType]
    : [];

  const currentPromoTypeSelected = filters?.selectedPromoTypes && filters.selectedPromoTypes.length > 0
    ? filters.selectedPromoTypes
    : filters?.promoType && filters.promoType !== 'ALL'
    ? [filters.promoType === 'TESHIR' ? 'TESIR' : filters.promoType]
    : [];

  return (
    <div className="relative bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-1.5 text-xs shadow-2xs transition-colors duration-200 shrink-0 z-30">
      {/* Delicate bottom luminous neon accent line */}
      <div className="absolute bottom-0 inset-x-0 h-[1.5px] luminous-line-blue opacity-70 pointer-events-none" />
      {/* Subtle top micro-accent */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/25 dark:via-blue-500/20 to-transparent pointer-events-none" />

      {/* Main Multi-Select Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* 1. Family Multi-Select Dropdown */}
          <MultiSelectDropdown
            label="Family"
            allLabel={familyOptions.length > 0 ? `Bütün Family (${familyOptions.length})` : 'Bütün Family'}
            options={familyOptions}
            selectedValues={currentFamilySelected}
            onChange={(vals) => {
              setFilters((prev) => ({
                ...prev,
                selectedFamilies: vals,
                selectedFamily: vals.length === 1 ? vals[0] : (vals.length > 1 ? vals[0] : 'ALL'),
                selectedProduct: '',
                selectedProducts: []
              }));
            }}
            title="Məhsul Ailəsi (Family) üzrə çoxlu süzün"
            maxWidth="max-w-[190px]"
          />

          {/* 2. Sub Area Multi-Select Dropdown */}
          <MultiSelectDropdown
            label="Sub Area"
            allLabel={subAreaOptions.length > 0 ? `Bütün Sub Area (${subAreaOptions.length})` : 'Bütün Sub Area'}
            options={subAreaOptions}
            selectedValues={currentSubAreaSelected}
            onChange={(vals) => {
              setFilters((prev) => ({
                ...prev,
                selectedSubAreas: vals,
                selectedSubArea: vals.length === 1 ? vals[0] : (vals.length > 1 ? vals[0] : 'ALL'),
                selectedStore: '',
                selectedStores: []
              }));
            }}
            title="Sub Ərazi (Sub Area) üzrə çoxlu süzün"
            maxWidth="max-w-[185px]"
          />

          {/* 3. Area (Bölgə/Ərazi) Multi-Select Dropdown */}
          <MultiSelectDropdown
            label="Ərazi"
            allLabel={areaOptions.length > 0 ? `Bütün Ərazilər (${areaOptions.length})` : 'Bütün Ərazilər'}
            options={areaOptions}
            selectedValues={currentAreaSelected}
            onChange={(vals) => {
              setFilters((prev) => ({
                ...prev,
                selectedAreas: vals,
                selectedArea: vals.length === 1 ? vals[0] : (vals.length > 1 ? vals[0] : 'ALL'),
                selectedSubArea: 'ALL',
                selectedSubAreas: [],
                selectedStore: '',
                selectedStores: []
              }));
            }}
            title="Ərazi / Bölgə üzrə çoxlu süzün"
            maxWidth="max-w-[180px]"
          />

          {/* 4. Store Multi-Select Dropdown */}
          <MultiSelectDropdown
            label="Mağaza"
            allLabel={
              filteredStoreOptions.length > 0
                ? `${t('lbl_all_stores')} (${filteredStoreOptions.length})`
                : t('lbl_all_stores')
            }
            options={storeOptions}
            selectedValues={currentStoreSelected}
            onChange={(vals) => {
              setFilters((prev) => ({
                ...prev,
                selectedStores: vals,
                selectedStore: vals.length === 1 ? vals[0] : (vals.length > 1 ? vals[0] : '')
              }));
            }}
            title="Mağaza üzrə çoxlu süzün"
            maxWidth="max-w-[185px]"
          />

          {/* Format (Mağaza Formatı) Multi-Select Dropdown */}
          {storeFormatOptions.length > 0 && (
            <MultiSelectDropdown
              label="Format"
              allLabel={
                storeFormatOptions.length > 0
                  ? `Bütün Formatlar (${storeFormatOptions.length})`
                  : 'Bütün Formatlar'
              }
              options={storeFormatDropdownOptions}
              selectedValues={currentStoreFormatSelected}
              onChange={(vals) => {
                setFilters((prev) => ({
                  ...prev,
                  selectedFormats: vals,
                  selectedFormat: vals.length === 1 ? vals[0] : (vals.length > 1 ? vals[0] : 'ALL')
                }));
              }}
              title="Mağaza Formatı (SUPER, CITY, və s.) üzrə çoxlu süzün"
              maxWidth="max-w-[185px]"
            />
          )}

          {/* 5. Category Multi-Select Dropdown */}
          <MultiSelectDropdown
            label="Kateqoriya"
            allLabel={
              categoryOptions.length > 0
                ? `Bütün Kateqoriyalar (${categoryOptions.length})`
                : 'Bütün Kateqoriyalar'
            }
            options={categoryOptions}
            selectedValues={currentCategorySelected}
            onChange={(vals) => {
              setFilters((prev) => ({
                ...prev,
                selectedCategories: vals,
                selectedCategory: vals.length === 1 ? vals[0] : (vals.length > 1 ? vals[0] : 'ALL'),
                selectedFamily: 'ALL',
                selectedFamilies: [],
                selectedProduct: '',
                selectedProducts: []
              }));
            }}
            title="Kateqoriya üzrə çoxlu süzün"
            maxWidth="max-w-[200px]"
          />

          {/* 6. Product Multi-Select Dropdown */}
          <MultiSelectDropdown
            label="Məhsul"
            allLabel={
              filteredProductOptions.length > 0
                ? `${t('lbl_all_products')} (${filteredProductOptions.length})`
                : t('lbl_all_products')
            }
            options={productOptions}
            selectedValues={currentProductSelected}
            onChange={(vals) => {
              setFilters((prev) => ({
                ...prev,
                selectedProducts: vals,
                selectedProduct: vals.length === 1 ? vals[0] : (vals.length > 1 ? vals[0] : '')
              }));
            }}
            title="Məhsul üzrə çoxlu süzün"
            maxWidth="max-w-[210px]"
          />

          {/* 7. Mənşə (İdxal, PL, Yerli) Multi-Select Dropdown */}
          <MultiSelectDropdown
            label="Mənşə"
            allLabel={
              originOptions.length > 0
                ? `Bütün Mənşələr (${originOptions.length})`
                : 'Bütün Mənşələr'
            }
            options={originDropdownOptions}
            selectedValues={currentOriginSelected}
            onChange={(vals) => {
              setFilters((prev) => ({
                ...prev,
                selectedOrigins: vals,
                selectedOrigin: vals.length === 1 ? vals[0] : (vals.length > 1 ? vals[0] : 'ALL')
              }));
            }}
            title="Məhsul mənşəyi (İdxal, PL, Yerli) üzrə çoxlu süzün"
            maxWidth="max-w-[195px]"
          />

          {/* 8. İnsert Formatı Multi-Select Dropdown */}
          <MultiSelectDropdown
            label="İnsert Formatı"
            allLabel={
              insertFormatOptions.length > 0
                ? `Bütün İnsert Formatları (${insertFormatOptions.length})`
                : 'Bütün İnsert Formatları'
            }
            options={insertFormatDropdownOptions}
            selectedValues={currentInsertFormatSelected}
            onChange={(vals) => {
              setFilters((prev) => ({
                ...prev,
                selectedInsertFormats: vals,
                selectedInsertFormat: vals.length === 1 ? vals[0] : (vals.length > 1 ? vals[0] : 'ALL')
              }));
            }}
            title="İnsert Formatı (S, SC, SCM) üzrə çoxlu süzün"
            maxWidth="max-w-[200px]"
          />

          {/* 🚚 İş Yeri Tədarük Tipi (Depo 40, Firma 41, Sifarişsiz 42) Multi-Select Dropdown */}
          <MultiSelectDropdown
            label="İş Yeri Tədarük"
            allLabel={`İş Yeri Tədarük (${supplyTypeOptions.length})`}
            options={supplyTypeDropdownOptions}
            selectedValues={currentSupplyTypeSelected}
            onChange={(vals) => {
              setFilters((prev) => ({
                ...prev,
                selectedSupplyTypes: vals,
                selectedSupplyType: vals.length === 1 ? vals[0] : (vals.length > 1 ? vals[0] : 'ALL')
              }));
            }}
            title="İş Yeri Tədarük Tipi (Depo 40 / Firma 41 / Sifarişsiz 42) üzrə süzün"
            maxWidth="max-w-[210px]"
          />

          {/* 9. Promo Növü (Promo Type) Multi-Select Dropdown */}
          <MultiSelectDropdown
            label="Növ"
            allLabel={
              productPerformances.length > 0
                ? `${t('lbl_all_types')} (${productPerformances.length})`
                : t('lbl_all_types')
            }
            options={promoTypeOptions}
            selectedValues={currentPromoTypeSelected}
            onChange={(vals) => {
              setFilters((prev) => ({
                ...prev,
                selectedPromoTypes: vals,
                promoType: vals.length === 1 ? vals[0] : 'ALL'
              }));
            }}
            title="Promo Növü üzrə çoxlu süzün"
            maxWidth="max-w-[220px]"
          />

          {/* 10. Status (Aktiv / Passiv) Multi-Select Dropdown */}
          <MultiSelectDropdown
            label="Status"
            allLabel={`Bütün Statuslar (${statusOptions.length})`}
            options={statusOptions}
            selectedValues={currentStatusSelected}
            onChange={(vals) => {
              setFilters((prev) => ({
                ...prev,
                selectedStatuses: vals,
                selectedStatus: vals.length === 1 ? vals[0] : (vals.length > 1 ? vals[0] : 'ALL')
              }));
            }}
            title="Status (Aktiv / Passiv) üzrə çoxlu süzün"
            align="right"
            maxWidth="max-w-[190px]"
          />
        </div>

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-medium rounded-xl border border-rose-300/80 dark:border-rose-700/80 shadow-[0_0_10px_rgba(244,63,94,0.2)] hover:shadow-[0_0_16px_rgba(244,63,94,0.4)] transition-all shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('btn_reset')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
