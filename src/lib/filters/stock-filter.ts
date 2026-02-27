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
