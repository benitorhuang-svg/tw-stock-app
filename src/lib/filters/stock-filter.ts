/**
 * Atomic Stock Filter Engine
 *
 * Shared filter logic used by both DashboardController (historical) and LiveDataTable (realtime).
 * Ensures identical filtering behavior across all views.
 */
import { matchesSector } from './sector-filter';

export interface FilterConfig {
    searchKeyword?: string;
    filterMarket?: string;
    filterSector?: string;
    filterPriceRange?: string;
    filterMinVol?: number;
    filterTrend?: string;
    filterMA20?: number;
    filterStarred?: boolean;
    watchlist?: Set<string>;
}

/**
 * Generic stock filter — works with both historical API data and live ProcessedStock data.
 * Field names are normalized to handle both formats.
 */
export function applyStockFilter(s: any, config: FilterConfig): boolean {
    const {
        searchKeyword = '',
        filterMarket = '',
        filterSector = '',
        filterPriceRange = '',
        filterMinVol = 0,
        filterTrend = '0',
        filterMA20 = 0,
        filterStarred = false,
        watchlist,
    } = config;

    const code = String(s.symbol || s.code || '');
    const name = s.name || '';
    const price = s.price || 0;
    const changePct = s.changePercent || s.changePct || 0;
    const vol = s.volume || s.vol || 0;

    // Market filter — tolerant: skip if stock has no _market data
    if (filterMarket && s._market) {
        if (s._market.toUpperCase() !== filterMarket.toUpperCase()) return false;
    }

    // Sector filter — atomic utility
    if (filterSector) {
        const sector = String(s.sector || s.category || s.industry || '');
        if (!matchesSector(filterSector, sector, code, name)) return false;
    }

    // Keyword search
    if (searchKeyword && !code.includes(searchKeyword) && !name.includes(searchKeyword))
        return false;

    // Starred filter
    if (filterStarred && watchlist && !watchlist.has(code)) return false;

    // Price range
    if (filterPriceRange) {
        const [min, max] = filterPriceRange.split('-').map(Number);
        if (price < min || (max && price > max)) return false;
    }

    // Minimum volume
    if (filterMinVol > 0 && vol < filterMinVol) return false;

    // Trend filter
    if (filterTrend !== '0') {
        const t = parseFloat(filterTrend);
        if ((t > 0 && changePct < t) || (t < 0 && changePct > t)) return false;
    }

    // MA20 distance filter
    if (filterMA20 !== 0 && s.ma20) {
        const dist = (price / s.ma20 - 1) * 100;
        if ((filterMA20 > 0 && dist < filterMA20) || (filterMA20 < 0 && dist > filterMA20))
            return false;
    }

    return true;
}

/**
 * Distribution bin filter — checks if a stock's change% falls within a specific distribution bin
 */
export function isStockInActiveBin(pct: number, activeIndex: number | null): boolean {
    if (activeIndex === null) return true;

    switch (activeIndex) {
        case 0: return pct <= -9;
        case 1: return pct > -9 && pct <= -6;
        case 2: return pct > -6 && pct <= -3;
        case 3: return pct > -3 && pct < 0;
        case 4: return pct === 0;
        case 5: return pct > 0 && pct < 3;
        case 6: return pct >= 3 && pct < 6;
        case 7: return pct >= 6 && pct < 9;
        case 8: return pct >= 9;
        default: return true;
    }
}

/**
 * Aggregate stocks into sector summary for treemap visualization
 */
export function aggregateSectors(stocks: any[]): { name: string; value: number; change: number; count: number }[] {
    const map = new Map<string, { name: string; value: number; change: number; count: number }>();
    stocks.forEach(s => {
        const secName = s.sector || '其他';
        if (!map.has(secName)) {
            map.set(secName, { name: secName, value: 0, change: 0, count: 0 });
        }
        const agg = map.get(secName)!;
        agg.value += s.volume || 0;
        agg.change += s.changePercent || 0;
        agg.count++;
    });
    return Array.from(map.values()).map(v => ({
        ...v,
        change: v.count > 0 ? v.change / v.count : 0,
    }));
}

/**
 * Calculate MA breadth from a filtered stock list
 */
export function calcMABreadth(stocks: any[]): { aboveMA20: number; aboveMA60: number; aboveMA120: number; total: number } | null {
    if (!stocks.length) return null;

    let above20 = 0, above60 = 0, above120 = 0;
    stocks.forEach(s => {
        if (s.price > (s.ma20 || 0)) above20++;
        if (s.price > (s.ma60 || s.ma5 || 0)) above60++;
        if (s.price > (s.ma120 || 0)) above120++;
    });

    return { aboveMA20: above20, aboveMA60: above60, aboveMA120: above120, total: stocks.length };
}
