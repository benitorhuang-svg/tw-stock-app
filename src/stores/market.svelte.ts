import type { ProcessedStock, MarketBreadth, MarketStoreState } from '../types/market';

/**
 * market.svelte.ts — Svelte 5 Reactive Store for Market Data
 */

function createMarketStore() {
    let state = $state<MarketStoreState>({
        stocks: [],
        institutional: {
            foreign: [],
            invest: [],
            dealer: [],
            summary: { foreign: 0, invest: 0, dealer: 0, total: 0 },
            trend: [],
            date: '',
        },
        breadth: { up: 0, down: 0, flat: 0, total: 0 },
        lastUpdateTime: '—',
        isLoading: false,
        isInstLoading: false,
        error: null,
    });

    let searchKeyword = $state('');
    let filterMarket = $state('');
    let filterSector = $state('');
    let filterPriceRange = $state('');
    let filterMinVol = $state(0);
    let filterTrend = $state('0'); // '1' is up, '-1' is down, '0' is all
    let filterMA20 = $state(0);
    let filterStarred = $state(false);
    let filterDivergence = $state(false); // New: Price Down + Inst Buying

    // Watchlist persistence
    let watchlist = $state<Set<string>>(new Set());

    // Load watchlist on init
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('watchlist');
        if (stored) {
            try {
                const arr = JSON.parse(stored);
                watchlist = new Set(arr);
            } catch (e) {
                console.error('Failed to parse watchlist', e);
            }
        }
    }

    return {
        // State
        get state() {
            return state;
        },
        get searchKeyword() {
            return searchKeyword;
        },
        set searchKeyword(v: string) {
            searchKeyword = v;
        },
        get filterSector() {
            return filterSector;
        },
        set filterSector(v: string) {
            filterSector = v;
        },

        get filterMarket() {
            return filterMarket;
        },
        set filterMarket(v: string) {
            filterMarket = v;
        },

        get filterPriceRange() {
            return filterPriceRange;
        },
        set filterPriceRange(v: string) {
            filterPriceRange = v;
        },

        get filterMinVol() {
            return filterMinVol;
        },
        set filterMinVol(v: number) {
            filterMinVol = v;
        },

        get filterTrend() {
            return filterTrend;
        },
        set filterTrend(v: string) {
            filterTrend = v;
        },

        get filterMA20() {
            return filterMA20;
        },
        set filterMA20(v: number) {
            filterMA20 = v;
        },

        get filterStarred() {
            return filterStarred;
        },
        set filterStarred(v: boolean) {
            filterStarred = v;
        },

        get filterDivergence() {
            return filterDivergence;
        },
        set filterDivergence(v: boolean) {
            filterDivergence = v;
        },

        get watchlist() {
            return watchlist;
        },

        // Actions
        updateData(stocks: ProcessedStock[], breadth: MarketBreadth) {
            state.stocks = stocks;
            state.breadth = breadth;
            state.lastUpdateTime = new Date().toLocaleTimeString();
            state.isLoading = false;
        },

        updateInstitutionalData(data: MarketStoreState['institutional']) {
            state.institutional = data;
            state.isInstLoading = false;
        },

        setLoading(loading: boolean) {
            state.isLoading = loading;
        },

        setInstLoading(loading: boolean) {
            state.isInstLoading = loading;
        },

        setError(err: string | null) {
            state.error = err;
            state.isLoading = false;
        },

        toggleWatchlist(code: string) {
            if (watchlist.has(code)) {
                watchlist.delete(code);
            } else {
                watchlist.add(code);
            }
            // Persist
            if (typeof window !== 'undefined') {
                localStorage.setItem('watchlist', JSON.stringify([...watchlist]));
                // Sync with other tabs/components if needed
                window.dispatchEvent(
                    new CustomEvent('tw-watchlist-sync', { detail: { codes: [...watchlist] } })
                );
            }
        },
    };
}

export const marketStore = createMarketStore();
