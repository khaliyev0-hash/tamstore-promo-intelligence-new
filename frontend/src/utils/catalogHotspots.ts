export interface CatalogHotspotItem {
  id: string;
  code: string;
  name?: string;
  x: number; // percentage 0-100 from left
  y: number; // percentage 0-100 from top
}

export type CatalogHotspotsMap = Record<number, CatalogHotspotItem[]>;

/**
 * Verified real product mappings for TamStore Promo Jurnalı (17-30 Oktyabr 2026)
 * Each hotspot exactly matches the product visually printed in the PDF catalogue.
 */
export const VERIFIED_TAMSTORE_HOTSPOTS: CatalogHotspotsMap = {
  // SƏHİFƏ 1: Əsas Qapaq (Cover Hero Items)
  1: [
    {
      id: 'p1-vanak-136486',
      code: '136486',
      name: 'VANAK Kərə yağı 1 kq',
      x: 25,
      y: 22
    },
    {
      id: 'p1-tesla-132173',
      code: '132173',
      name: 'TESLA Qazlı içki 250 ml',
      x: 29,
      y: 43
    },
    {
      id: 'p1-final-101963',
      code: '101963',
      name: 'FINAL Qarğıdalı yağı 1 l',
      x: 28,
      y: 64
    },
    {
      id: 'p1-azercay-102162',
      code: '102162',
      name: 'AZƏRÇAY Buket çay 225 q',
      x: 29,
      y: 85
    },
    {
      id: 'p1-adicto-104255',
      code: '104255',
      name: 'ETİ Adicto Browni intense 144 q',
      x: 72,
      y: 58
    },
    {
      id: 'p1-persil-134374',
      code: '134374',
      name: 'PERSİL Yuyucu toz 7 kq',
      x: 58,
      y: 84
    },
    {
      id: 'p1-selpak-105021',
      code: '105021',
      name: 'SELPAK Tualet kağızı 32 rulon',
      x: 86,
      y: 84
    }
  ],

  // SƏHİFƏ 2: Kolbasalar (Sausages & Delicatessen)
  2: [
    {
      id: 'p2-rosko-kurinaya-133664',
      code: '133664',
      name: 'ROSKO Halal çox dadlı / Kurinaya toyuq kq',
      x: 25,
      y: 22
    },
    {
      id: 'p2-sab-servelat-111039',
      code: '111039',
      name: 'SAB Servelat ətirli kq',
      x: 74,
      y: 22
    },
    {
      id: 'p2-rosko-zakaz-133679',
      code: '133679',
      name: 'ROSKO Halal servelat zakaz kq',
      x: 53,
      y: 44
    },
    {
      id: 'p2-hicaz-heveskar-105963',
      code: '105963',
      name: 'HİCAZ Həvəskar kolbasa kq',
      x: 88,
      y: 44
    },
    {
      id: 'p2-hicaz-moskovskiy-105369',
      code: '105369',
      name: 'HİCAZ Moskovskiy servelat kq',
      x: 18,
      y: 64
    },
    {
      id: 'p2-starodvorye-105474',
      code: '105474',
      name: 'STARODVORYE Kolbasa levantskiy kq',
      x: 36,
      y: 64
    },
    {
      id: 'p2-bestbeef-105606',
      code: '105606',
      name: 'BEST BEEF Servelat nazik uzun kq',
      x: 54,
      y: 64
    },
    {
      id: 'p2-dmte-hindi-190648',
      code: '190648',
      name: 'DMTE Hindi kolbasa bişmiş 400 q',
      x: 86,
      y: 84
    }
  ],

  // SƏHİFƏ 3: Kolbasa və sosislər
  3: [
    {
      id: 'p3-rosko-sukran-133673',
      code: '133673',
      name: 'ROSKO Halal sosis şükran kq',
      x: 28,
      y: 20
    },
    {
      id: 'p3-sab-kababliq-111039',
      code: '111039',
      name: 'SAB Kabablıq sosis kq',
      x: 74,
      y: 20
    },
    {
      id: 'p3-hicaz-hisli-105962',
      code: '105962',
      name: 'HİCAZ Hisli sosis kq',
      x: 20,
      y: 44
    },
    {
      id: 'p3-bestbeef-nahar-154211',
      code: '154211',
      name: 'BEST BEEF Nahar sosis kq',
      x: 40,
      y: 44
    },
    {
      id: 'p3-rosko-durmek-133669',
      code: '133669',
      name: 'ROSKO Halal sosis dürmək kq',
      x: 64,
      y: 44
    },
    {
      id: 'p3-cerkiz-appetit-106097',
      code: '106097',
      name: 'ÇERKİZ Appetitnıye qaze sosis kq',
      x: 88,
      y: 44
    },
    {
      id: 'p3-cerkiz-molocnie-106677',
      code: '106677',
      name: 'ÇERKİZ Sosis moloçniye 450 q',
      x: 36,
      y: 64
    },
    {
      id: 'p3-dmte-hindi-380-190646',
      code: '190646',
      name: 'DMTE Sosis hindi 380 q',
      x: 56,
      y: 64
    },
    {
      id: 'p3-kamar-sigir-106231',
      code: '106231',
      name: 'KAMAR Kolbasa sığır',
      x: 18,
      y: 84
    },
    {
      id: 'p3-kamar-hindi-108589',
      code: '108589',
      name: 'KAMAR Kolbasa toyuq hindi',
      x: 42,
      y: 84
    }
  ],

  // SƏHİFƏ 4: Yağlar, süd məhsulları, zeytun
  4: [
    {
      id: 'p4-asnaf-191749',
      code: '191749',
      name: 'ASNAF Kərə yağı 82% 1 kq',
      x: 22,
      y: 22
    },
    {
      id: 'p4-violetto-114168',
      code: '114168',
      name: 'VIOLETTO Kərə yağı 82.5% 1 kq',
      x: 50,
      y: 22
    },
    {
      id: 'p4-belous-126151',
      code: '126151',
      name: 'BELOUS Kərə yağı 82.5% 1 kq',
      x: 80,
      y: 22
    },
    {
      id: 'p4-zetina-126838',
      code: '126838',
      name: 'ZETİNA Yaşıl zeytun kq',
      x: 86,
      y: 84
    }
  ],

  // SƏHİFƏ 5: Pendirlər, süd məhsulları
  5: [
    {
      id: 'p5-hermano-tilsiter-105532',
      code: '105532',
      name: 'HERMANO Tilsiter pendir kq',
      x: 18,
      y: 44
    },
    {
      id: 'p5-hochland-108541',
      code: '108541',
      name: 'HOCHLAND Seçilmiş pendir çeşidləri 150 q',
      x: 86,
      y: 44
    },
    {
      id: 'p5-icim-labne-108671',
      code: '108671',
      name: 'İÇİM Labne pendiri 200 q',
      x: 28,
      y: 65
    },
    {
      id: 'p5-bonfesto-130768',
      code: '130768',
      name: 'BONFESTO Kərə yağlı krem pendir 70% 400 q',
      x: 54,
      y: 65
    },
    {
      id: 'p5-goycay-106185',
      code: '106185',
      name: 'GÖYÇAY SÜD Çanaq pendiri 1 kq',
      x: 18,
      y: 85
    },
    {
      id: 'p5-goldencow-153990',
      code: '153990',
      name: 'GOLDEN COW Feta pendir 500 q',
      x: 34,
      y: 85
    },
    {
      id: 'p5-anchor-106346',
      code: '106346',
      name: 'ANCHOR Feta pendir kq',
      x: 50,
      y: 85
    }
  ]
};

const STORAGE_PREFIX = 'tamstore_catalog_hotspots_v2_';

/**
 * Loads hotspot mappings from localStorage, or falls back to verified defaults
 */
export function getStoredHotspots(filename: string): CatalogHotspotsMap {
  if (typeof window === 'undefined') return VERIFIED_TAMSTORE_HOTSPOTS;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${filename}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // Merge with verified defaults so user doesn't lose standard points
        return { ...VERIFIED_TAMSTORE_HOTSPOTS, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to read hotspots from localStorage', e);
  }
  return { ...VERIFIED_TAMSTORE_HOTSPOTS };
}

/**
 * Persists updated hotspots to localStorage and notifies backend
 */
export function saveStoredHotspots(
  filename: string,
  hotspotsMap: CatalogHotspotsMap,
  apiBase?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${filename}`, JSON.stringify(hotspotsMap));

    // Also persist to backend asynchronously if apiBase is provided
    if (apiBase) {
      fetch(`${apiBase}/catalog/hotspots/${encodeURIComponent(filename)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: hotspotsMap })
      }).catch((err) => console.warn('Could not sync hotspots with server', err));
    }
  } catch (e) {
    console.error('Failed to save hotspots to localStorage', e);
  }
}

/**
 * Resets hotspots for a catalog back to the verified default mapping
 */
export function resetStoredHotspots(filename: string): CatalogHotspotsMap {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${STORAGE_PREFIX}${filename}`);
  }
  return { ...VERIFIED_TAMSTORE_HOTSPOTS };
}
