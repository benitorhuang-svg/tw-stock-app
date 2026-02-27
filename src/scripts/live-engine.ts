import { marketStore } from '../stores/market.svelte';
import { getEl } from '../lib/dom';

// Import worker using Vite's worker loader
// @ts-ignore
import MarketWorker from './workers/market-worker?worker';

let pollInterval: ReturnType<typeof setInterval> | null = null;
let worker: Worker | null = null;

function cleanupLive() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

document.addEventListener('astro:before-swap', cleanupLive, { once: true });

document.addEventListener('astro:page-load', () => {
    const toggleBtn = getEl('toggle-polling-btn') as HTMLButtonElement | null;
    if (!toggleBtn || toggleBtn.dataset.bound) return;
    toggleBtn.dataset.bound = 'true';

    // ─── Initialize Worker ────────────────────────────
    if (!worker) {
        worker = new MarketWorker();
        worker.onmessage = (e: MessageEvent) => {
            const { processed, breadth } = e.data;
            marketStore.updateData(processed, breadth);

            // ─── Update Static DOM Elements ─────────────────
            // Update Sync Time
            const timeEl = document.getElementById('last-update-time');
            if (timeEl) {
                timeEl.textContent = new Date().toLocaleTimeString('zh-TW', { hour12: false });
            }

            // Update Market Breadth
            const upEl = document.getElementById('breadth-range-up');
            const downEl = document.getElementById('breadth-range-down');
            if (upEl) upEl.textContent = String(breadth.up);
            if (downEl) downEl.textContent = String(breadth.down);

            if (breadth.total > 0) {
                const barUp = document.getElementById('breadth-bar-up');
                const barDown = document.getElementById('breadth-bar-down');
                const barFlat = document.getElementById('breadth-bar-flat');

                if (barUp) barUp.style.width = `${(breadth.up / breadth.total) * 100}%`;
                if (barDown) barDown.style.width = `${(breadth.down / breadth.total) * 100}%`;
                if (barFlat) barFlat.style.width = `${(breadth.flat / breadth.total) * 100}%`;
            }

            // Forensic Signals (Still on main thread for simple event dispatch)
            processed.forEach((s: any) => {
                detectSignals(
                    s.code,
                    s.name,
                    s.price,
                    s.price - s.change,
                    s.vol * 1000,
                    s.ma20,
                    s.rsi,
                    s.avgVol
                );
            });
        };
    }

    let isPolling = false;

    // ─── Filter bindings to Store ──────────────────────
    const searchInput = getEl('live-search-input') as HTMLInputElement | null;
    const filterEls = {
        starred: getEl('filter-starred') as HTMLInputElement | null,
        trend: getEl('filter-trend') as HTMLInputElement | null,
        volume: getEl('filter-volume') as HTMLInputElement | null,
        market: getEl('filter-market') as HTMLSelectElement | null,
        sector: getEl('filter-sector') as HTMLSelectElement | null,
        price: getEl('filter-price') as HTMLSelectElement | null,
        ma20: getEl('filter-ma20') as HTMLSelectElement | null,
    };

    function syncFiltersToStore() {
        marketStore.searchKeyword = searchInput?.value.toLowerCase() || '';
        marketStore.filterMarket = filterEls.market?.value || '';
        marketStore.filterSector = filterEls.sector?.value || '';
        marketStore.filterPriceRange = filterEls.price?.value || '';
        marketStore.filterMinVol = parseInt(filterEls.volume?.value || '0', 10);
        marketStore.filterTrend = filterEls.trend?.value || '0';
        marketStore.filterMA20 = parseFloat(filterEls.ma20?.value || '0');
        marketStore.filterStarred = filterEls.starred?.checked || false;
    }

    // ─── Data fetch ────────────────────────────────────
    async function fetchUpdate() {
        try {
            marketStore.setLoading(true);
            const res = await fetch('/api/live');
            if (!res.ok) throw new Error('Network response was not ok');
            const result = await res.json();

            if (result.status === 'success' || result.status === 'error_using_stale_cache') {
                // Pass to worker for processing
                // We assume the API returns data with _ma20, _rsi etc.
                // Extract indicator map for worker
                const indicatorMap: Record<string, any> = {};
                result.data.forEach((s: any) => {
                    indicatorMap[s.Code] = {
                        ma5: s._ma5,
                        ma20: s._ma20,
                        rsi: s._rsi,
                        volume: s._avgVol,
                        market: s._market,
                        sector: s.sector,
                    };
                });

                worker?.postMessage({ data: result.data, indicatorMap });
            }
        } catch (err) {
            marketStore.setError((err as Error).message);
        }
    }

    const seenSignals = new Set<string>();
    function detectSignals(
        code: string,
        name: string,
        price: number,
        prev: number,
        vol: number,
        ma20: number,
        rsi: number,
        avgVol: number
    ) {
        if (price === 0 || isNaN(price)) return;

        // Signal logic...
        if (avgVol > 0 && vol > avgVol * 2.5 && vol > 1000000) {
            triggerSignal(
                code,
                name,
                'VOLUME_SPIKE',
                `異常爆量! 當前成交量已達均量 2.5 倍以上`,
                'warning'
            );
        }
        if (ma20 > 0 && prev < ma20 && price > ma20) {
            triggerSignal(
                code,
                name,
                'MA_BREAK',
                `強勢突破! 價格成功站上 20日均線 (${ma20.toFixed(2)})`,
                'success'
            );
        }
        if (rsi > 75) {
            triggerSignal(
                code,
                name,
                'RSI_EXTREME',
                `超買警告: RSI (${rsi.toFixed(1)}) 處於極度過熱區間`,
                'warning'
            );
        } else if (rsi < 25 && rsi > 0) {
            triggerSignal(
                code,
                name,
                'RSI_EXTREME',
                `超跌信號: RSI (${rsi.toFixed(1)}) 進入深度超賣區間`,
                'info'
            );
        }
    }

    function triggerSignal(
        symbol: string,
        name: string,
        type: string,
        message: string,
        severity: string
    ) {
        const key = `${symbol}_${type}`;
        if (seenSignals.has(key)) return;
        seenSignals.add(key);

        window.dispatchEvent(
            new CustomEvent('tw-signal', {
                detail: { symbol, name, type, message, severity },
            })
        );
    }

    // ─── Polling control ──────────────────────────────
    function startPolling() {
        isPolling = true;
        sessionStorage.setItem('tw-live-polling', 'true');
        toggleBtn!.textContent = '停止監測';
        toggleBtn!.className =
            'h-9 px-6 font-black tracking-widest bg-bearish/10 text-bearish border border-bearish/30 rounded-lg text-[10px] uppercase transition-colors ring-1 ring-bearish/20';
        getEl('hourglass-container')?.classList.remove('hidden');
        fetchUpdate();
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(fetchUpdate, 15000);
    }

    function stopPolling() {
        isPolling = false;
        sessionStorage.setItem('tw-live-polling', 'false');
        toggleBtn!.textContent = '開始即時監測';
        toggleBtn!.className =
            'h-9 px-6 font-black tracking-widest bg-accent text-white rounded-lg border-none text-[10px] uppercase transition-colors shadow-md';
        getEl('hourglass-container')?.classList.add('hidden');
        cleanupLive();
    }

    // ─── Event bindings ────────────────────────────────
    toggleBtn.addEventListener('click', () => {
        if (isPolling) stopPolling();
        else startPolling();
    });

    // Listen to filter changes
    searchInput?.addEventListener('input', syncFiltersToStore);
    Object.values(filterEls).forEach(f => f?.addEventListener('change', syncFiltersToStore));

    getEl('live-filter-reset')?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        Object.values(filterEls).forEach(f => {
            if (f) {
                if (f instanceof HTMLSelectElement) f.value = '';
                else if (f instanceof HTMLInputElement) {
                    if (f.type === 'checkbox') f.checked = false;
                    else f.value = '0';
                }
            }
        });
        syncFiltersToStore();
    });

    // Initial sync
    syncFiltersToStore();

    // Auto-resume
    if (sessionStorage.getItem('tw-live-polling') === 'true') startPolling();
});
