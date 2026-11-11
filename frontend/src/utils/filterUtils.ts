import type { GlobalFilterState } from '../types';

/**
 * Checks whether an item's field value matches the selected filter (multi or single).
 */
export const isItemMatchFilter = (
  value: string | undefined | null,
  selectedSingle?: string,
  selectedMulti?: string[],
  allPlaceholder: string = 'ALL'
): boolean => {
  const normVal = String(value || '').trim();

  // If multi-select is active (array has at least 1 item)
  if (Array.isArray(selectedMulti) && selectedMulti.length > 0) {
    return selectedMulti.includes(normVal);
  }

  // If single select is active and not "ALL" / empty
  if (selectedSingle && selectedSingle !== allPlaceholder && selectedSingle !== '') {
    return normVal === selectedSingle.trim();
  }

  return true;
};

export const isPromoTypeMatch = (
  itemOrCode: any,
  promoTypeFilter?: string,
  productMap?: Record<string, string>,
  selectedPromoTypes?: string[]
): boolean => {
  // If multi-select is provided
  if (Array.isArray(selectedPromoTypes) && selectedPromoTypes.length > 0) {
    if (selectedPromoTypes.length >= 2 || selectedPromoTypes.includes('ALL')) {
      return true;
    }
    return selectedPromoTypes.some((pt) => isPromoTypeMatch(itemOrCode, pt, productMap));
  }

  if (!promoTypeFilter || promoTypeFilter === 'ALL') return true;

  let typeVal = '';
  if (itemOrCode && typeof itemOrCode === 'object') {
    typeVal = itemOrCode.promo_type || (itemOrCode.code && productMap ? productMap[itemOrCode.code] : '') || '';
  } else if (typeof itemOrCode === 'string') {
    if (productMap && productMap[itemOrCode]) {
      typeVal = productMap[itemOrCode];
    } else if (
      itemOrCode.toLowerCase() === 'tesir' ||
      itemOrCode.toLowerCase() === 'teshir' ||
      itemOrCode.toLowerCase() === 'adi'
    ) {
      typeVal = itemOrCode;
    }
  }

  const normFilter = promoTypeFilter.trim().toLowerCase();
  const normVal = typeVal.trim().toLowerCase();

  // If item doesn't have an explicit promo_type, treat as 'adi' (standard promo)
  const effectiveVal = normVal || 'adi';

  if (
    normFilter === 'tesir' ||
    normFilter === 'teshir' ||
    normFilter.includes('tesir') ||
    normFilter.includes('teshir')
  ) {
    return (
      effectiveVal.includes('tesir') ||
      effectiveVal.includes('teshir') ||
      effectiveVal.includes('təsir') ||
      effectiveVal.includes('teşhir')
    );
  }

  if (normFilter === 'adi' || normFilter.includes('adi')) {
    return (
      effectiveVal.includes('adi') &&
      !effectiveVal.includes('tesir') &&
      !effectiveVal.includes('teshir')
    );
  }

  return true;
};

/**
 * Checks whether a product matches active global filters (multi-select + single-select).
 */
export const isProductMatchGlobalFilters = (
  p: { code?: string; category?: string; family?: string; promo_type?: string; name?: string } | any,
  filters: GlobalFilterState,
  productMap?: Record<string, string>
): boolean => {
  if (!p) return false;

  // Category match
  if (!isItemMatchFilter(p.category, filters.selectedCategory, filters.selectedCategories, 'ALL')) {
    return false;
  }

  // Family match
  if (!isItemMatchFilter(p.family, filters.selectedFamily, filters.selectedFamilies, 'ALL')) {
    return false;
  }

  // Product Code match
  if (!isItemMatchFilter(p.code, filters.selectedProduct, filters.selectedProducts, '')) {
    return false;
  }

  // Promo Type match
  if (!isPromoTypeMatch(p, filters.promoType, productMap, filters.selectedPromoTypes)) {
    return false;
  }

  // Origin match (İdxal, PL, Yerli)
  if (
    (filters.selectedOrigins && filters.selectedOrigins.length > 0) ||
    (filters.selectedOrigin && filters.selectedOrigin !== 'ALL' && filters.selectedOrigin !== '')
  ) {
    const pOrigin = String(p.origin || '').trim().toLowerCase().replace('i̇', 'i').replace('ı', 'i');
    const selectedList = (filters.selectedOrigins && filters.selectedOrigins.length > 0)
      ? filters.selectedOrigins
      : [filters.selectedOrigin!];

    const matchesOrigin = selectedList.some((sel) => {
      const normSel = String(sel || '').trim().toLowerCase().replace('i̇', 'i').replace('ı', 'i');
      return normSel === 'all' || normSel === pOrigin;
    });

    if (!matchesOrigin) {
      return false;
    }
  }

  // Insert Format match (SCM, SC, S)
  if (
    (filters.selectedInsertFormats && filters.selectedInsertFormats.length > 0) ||
    (filters.selectedInsertFormat && filters.selectedInsertFormat !== 'ALL' && filters.selectedInsertFormat !== '')
  ) {
    const pFormat = String(p.insert_format || '').trim().toUpperCase();
    const selectedList = (filters.selectedInsertFormats && filters.selectedInsertFormats.length > 0)
      ? filters.selectedInsertFormats
      : [filters.selectedInsertFormat!];

    const matchesFormat = selectedList.some((sel) => {
      const normSel = String(sel || '').trim().toUpperCase();
      return normSel === 'ALL' || normSel === pFormat;
    });

    if (!matchesFormat) {
      return false;
    }
  }

  // Status match (Aktiv / Passiv)
  if (
    (filters.selectedStatuses && filters.selectedStatuses.length > 0) ||
    (filters.selectedStatus && filters.selectedStatus !== 'ALL' && filters.selectedStatus !== '')
  ) {
    const selectedList = (filters.selectedStatuses && filters.selectedStatuses.length > 0)
      ? filters.selectedStatuses
      : [filters.selectedStatus!];

    const hasPassive = (p.passive_store_count ?? 0) > 0;
    const hasActive = (p.active_store_count ?? p.store_count ?? 1) > 0;
    const rawStatus = p.order_status ? String(p.order_status).trim().toLowerCase() : (p.status ? String(p.status).trim().toLowerCase() : '');
    const isExplicitPassive = rawStatus.startsWith('passiv') || rawStatus.startsWith('xeyr') || rawStatus.startsWith('qapali') || rawStatus.startsWith('pasif');

    const matchesStatus = selectedList.some((sel) => {
      const normSel = String(sel || '').trim().toLowerCase();
      if (normSel === 'all') return true;
      const wantOpen = normSel.includes('aktiv') || normSel.includes('beli') || normSel.includes('bəli');
      const wantClosed = normSel.includes('pasif') || normSel.includes('passiv') || normSel.includes('xeyr') || normSel.includes('qapali') || normSel.includes('qapalı');
      if (wantOpen) {
        return (hasActive && !isExplicitPassive) || rawStatus.includes('aktiv') || rawStatus.includes('beli');
      }
      if (wantClosed) {
        return hasPassive || isExplicitPassive;
      }
      return normSel === rawStatus;
    });

    if (!matchesStatus) {
      return false;
    }
  }

  // Supply Type match (İş Yeri Tədarük Tipi: Depo 40, Firma 41, Sifarişsiz 42)
  if (
    (filters.selectedSupplyTypes && filters.selectedSupplyTypes.length > 0) ||
    (filters.selectedSupplyType && filters.selectedSupplyType !== 'ALL' && filters.selectedSupplyType !== '')
  ) {
    const selectedList = (filters.selectedSupplyTypes && filters.selectedSupplyTypes.length > 0)
      ? filters.selectedSupplyTypes
      : [filters.selectedSupplyType!];

    const cleanStr = (s: any) => String(s || '').trim().toLowerCase().replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g');
    const pSupply = cleanStr(p.supply_type || p.primary_supply_type || p.tedaruk_tipi || '');
    const pSupplyRaw = String(p.tedaruk_tipi_raw || '').trim();

    const matchesSupply = selectedList.some((sel) => {
      const normSel = cleanStr(sel);
      if (normSel === 'all') return true;
      if (normSel.includes('depo') || normSel === '40') {
        return pSupply.includes('depo') || pSupplyRaw === '40';
      }
      if (normSel.includes('firma') || normSel === '41') {
        return pSupply.includes('firma') || pSupplyRaw === '41';
      }
      if (normSel.includes('sifaris') || normSel === '42') {
        return pSupply.includes('sifaris') || pSupplyRaw === '42';
      }
      return normSel === pSupply || pSupply.includes(normSel);
    });

    if (!matchesSupply) {
      return false;
    }
  }

  return true;
};

/**
 * Checks whether a store matches active global filters (multi-select + single-select).
 */
export const isStoreMatchGlobalFilters = (
  s: { store?: string; area?: string; sub_area?: string; format?: string; status?: string } | any,
  filters: GlobalFilterState
): boolean => {
  if (!s) return false;

  // Area match
  if (!isItemMatchFilter(s.area, filters.selectedArea, filters.selectedAreas, 'ALL')) {
    return false;
  }

  // Sub Area match
  if (!isItemMatchFilter(s.sub_area, filters.selectedSubArea, filters.selectedSubAreas, 'ALL')) {
    return false;
  }

  // Store ID match
  if (!isItemMatchFilter(s.store, filters.selectedStore, filters.selectedStores, '')) {
    return false;
  }

  // Store Format match (SUPER, CITY, etc.)
  if (
    (filters.selectedFormats && filters.selectedFormats.length > 0) ||
    (filters.selectedFormat && filters.selectedFormat !== 'ALL' && filters.selectedFormat !== '')
  ) {
    const sFormat = String(s.format || '').trim().toUpperCase();
    const selectedList = (filters.selectedFormats && filters.selectedFormats.length > 0)
      ? filters.selectedFormats
      : [filters.selectedFormat!];

    const matchesFormat = selectedList.some((sel) => {
      const normSel = String(sel || '').trim().toUpperCase();
      return normSel === 'ALL' || normSel === sFormat;
    });

    if (!matchesFormat) {
      return false;
    }
  }

  // Status match (Aktiv / Passiv)
  if (
    (filters.selectedStatuses && filters.selectedStatuses.length > 0) ||
    (filters.selectedStatus && filters.selectedStatus !== 'ALL' && filters.selectedStatus !== '')
  ) {
    const rawStatus = s.status ? String(s.status).trim() : ((s.total_sale > 0 || (s.total_stock ?? 0) > 0 || (s.total_fc ?? 0) > 0) ? 'Aktiv' : 'Passiv');
    const sStatus = rawStatus.toLowerCase();
    const selectedList = (filters.selectedStatuses && filters.selectedStatuses.length > 0)
      ? filters.selectedStatuses
      : [filters.selectedStatus!];

    const matchesStatus = selectedList.some((sel) => {
      const normSel = String(sel || '').trim().toLowerCase();
      if (normSel === 'all') return true;
      if (normSel.includes('aktiv') && !normSel.includes('deaktiv') && !normSel.includes('pasif') && !normSel.includes('passiv')) {
        return sStatus.includes('aktiv') && !sStatus.includes('deaktiv') && !sStatus.includes('pasif') && !sStatus.includes('passiv');
      }
      if (normSel.includes('pasif') || normSel.includes('passiv') || normSel.includes('deaktiv') || normSel.includes('qeyri')) {
        return sStatus.includes('pasif') || sStatus.includes('passiv') || sStatus.includes('deaktiv') || sStatus.includes('qeyri');
      }
      return normSel === sStatus;
    });

    if (!matchesStatus) {
      return false;
    }
  }

  return true;
};

