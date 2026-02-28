/**
 * Atomic Sector Filter Utility
 *
 * Single source of truth for sector matching logic.
 * Used by both DashboardController (historical data) and LiveDataTable (real-time data).
 *
 * Design: Maps English sector keys to Chinese terms for robust matching,
 * ensuring data from any source (API, DB, or legacy data) can be filtered consistently.
 */

/** English-key → Chinese display term mapping */
export const SECTOR_MAP: Record<string, string> = {
    semiconductor: '半導體',
    electronics: '電子',
    computer: '電腦',
    finance: '金融',
    shipping: '航運',
    legacy: '傳產',
    machinery: '電機',
    steel: '鋼鐵',
    construction: '營建',
    tourism: '觀光',
    chemical: '化學',
    biotech: '生技',
    etf: 'ETF',
    other: '其他',
};

/** All available sector option entries for UI select dropdowns */
export const SECTOR_OPTIONS = Object.entries(SECTOR_MAP).map(([value, label]) => ({
    value,
    label,
}));

/**
 * Check if a stock matches the given sector filter.
 * Handles English keys, Chinese fallbacks, and ETF special logic.
 *
 * @param sectorKey - The filter key (e.g. 'machinery', 'etf')
 * @param stockSector - The sector string from the stock data (can be English or Chinese)
 * @param stockCode - The stock symbol (used for ETF detection via '00' prefix)
 * @param stockName - The stock name (used as final fallback for Chinese matching)
 * @returns true if the stock matches the sector filter
 */
export function matchesSector(
    sectorKey: string,
    stockSector: string,
    stockCode: string,
    stockName: string
): boolean {
    if (!sectorKey) return true; // No filter active

    const key = sectorKey.toLowerCase();
    const sector = (stockSector || '').toLowerCase();

    // ETF special logic: match by code prefix OR sector field
    if (key === 'etf') {
        return stockCode.startsWith('00') || sector.includes('etf');
    }

    // Check English key match
    if (sector.includes(key)) return true;

    // Check Chinese term match against sector field
    const zhTerm = SECTOR_MAP[key];
    if (zhTerm && sector.includes(zhTerm.toLowerCase())) return true;

    // Final fallback: match Chinese term against stock name
    if (zhTerm && stockName.includes(zhTerm)) return true;

    return false;
}
