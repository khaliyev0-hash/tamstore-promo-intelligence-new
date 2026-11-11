/**
 * Computes a dynamic display name for a campaign.
 * If insertName is a custom name (not empty, 'test1', 'aktiv insert', etc.), it is used.
 * Otherwise, derives a clean date-range label, e.g. "29.10 - 11.11 Promo".
 */
export const getCampaignDisplayName = (
  insertName?: string | null,
  begDate?: string | null,
  endDate?: string | null
): string => {
  if (
    insertName &&
    insertName.toLowerCase() !== 'test1' &&
    insertName.toLowerCase() !== 'aktiv i̇nsert' &&
    insertName.toLowerCase() !== 'aktiv insert' &&
    insertName !== '15-28 Promo'
  ) {
    return insertName;
  }

  if (begDate && endDate) {
    const parse = (s: string) => {
      const parts = s.split(/[-.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          return { day: parts[2].padStart(2, '0'), month: parts[1].padStart(2, '0') };
        }
        // DD.MM.YYYY
        return { day: parts[0].padStart(2, '0'), month: parts[1].padStart(2, '0') };
      }
      return null;
    };
    const b = parse(begDate);
    const e = parse(endDate);
    if (b && e) {
      if (b.month === e.month) {
        return `${parseInt(b.day, 10)}-${parseInt(e.day, 10)} Promo`;
      }
      return `${b.day}.${b.month} - ${e.day}.${e.month} Promo`;
    }
  }

  return '29.10 - 11.11 Promo';
};
