/**
 * Core Live Polling & Grid Engine
 * EXTREME OPTIMIZATION: Throttled rendering, Cached Refs, RAF, Strict Memory Cleanup
 */
let pollInterval: ReturnType<typeof setInterval> | null = null;
import { getEl } from '../lib/dom';

function cleanupLive() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

/** Clear polling on navigation to prevent memory leaks */
document.addEventListener('astro:before-swap', cleanupLive, { once: true });

document.addEventListener('astro:page-load', () => {
    const toggleBtn = getEl('toggle-polling-btn') as HTMLButtonElement | null;
    if (!toggleBtn) return;
    if (toggleBtn.dataset.bound) return;
    toggleBtn.dataset.bound = 'true';

    const searchInput = getEl('live-search-input') as HTMLInputElement | null;
    const updateTimeEl = getEl('last-update-time');
    let isPolling = false, currentData: any[] = [];

    const filters = {
        starred: getEl('filter-starred') as HTMLInputElement | null,
        sector: getEl('filter-sector') as HTMLSelectElement | null,
        trend: getEl('filter-trend') as HTMLInputElement | null,
        volume: getEl('filter-volume') as HTMLInputElement | null,
        market: getEl('filter-market') as HTMLSelectElement | null,
        price: getEl('filter-price') as HTMLSelectElement | null,
    };

    const breadth = {
        ratio: getEl('breadth-ratio'),
        up: getEl('breadth-range-up'),
        down: getEl('breadth-range-down'),
        flat: getEl('breadth-flat'),
        barUp: getEl('breadth-bar-up'),
        barDown: getEl('breadth-bar-down'),
        barFlat: getEl('breadth-bar-flat'),
    };

    function notifyUI() {
        requestAnimationFrame(() => {
            window.dispatchEvent(new CustomEvent('tw-live-update', {
                detail: {
                    type: 'FILTERS',
                    payload: {
                        search: searchInput?.value.toLowerCase() || '',
                        trend: filters.trend?.value || '0',
                        volume: parseInt(filters.volume?.value || '0', 10),
                        starred: filters.starred?.checked,
                        market: filters.market?.value || '',
                        price: filters.price?.value || ''
                    }
                }
            }));
        });
    }

    async function fetchUpdate() {
        try {
            const res = await fetch('/api/live');
            if (!res.ok) return;
            const result = await res.json();
            if (result.status !== 'success') return;

            currentData = result.data.map((s: any) => {
                const close = parseFloat(s.ClosingPrice || '0'), chg = parseFloat(s.Change || '0');
                const prev = close > 0 ? close - chg : 0;
                return {
                    ...s,
                    _closePrice: close,
                    _change: chg,
                    _changePct: prev > 0 ? (chg / prev) * 100 : 0,
                    _vol: Math.round(parseFloat(s.TradeVolume || '0') / 1000),
                };
            });

            // Update Breadth
            let u = 0, f = 0, d = 0;
            for (let i = 0; i < currentData.length; i++) {
                const s = currentData[i];
                if (s._change > 0) u++; else if (s._change < 0) d++; else f++;
            }
            const total = u + d + f;
            if (breadth.up) breadth.up.textContent = String(u);
            if (breadth.down) breadth.down.textContent = String(d);
            if (breadth.flat) breadth.flat.textContent = String(f);
            if (breadth.ratio) breadth.ratio.textContent = d > 0 ? (u / d).toFixed(2) : 'MAX';
            if (total > 0 && breadth.barUp) {
                breadth.barUp.style.width = (u / total) * 100 + '%';
                breadth.barDown!.style.width = (d / total) * 100 + '%';
                breadth.barFlat!.style.width = (f / total) * 100 + '%';
            }

            if (updateTimeEl) updateTimeEl.textContent = new Date().toLocaleTimeString();

            window.dispatchEvent(new CustomEvent('tw-live-update', {
                detail: { type: 'DATA', payload: { data: currentData } }
            }));
        } catch (e) { }
    }

    const startPolling = () => {
        isPolling = true;
        sessionStorage.setItem('tw-live-polling', 'true');
        toggleBtn.textContent = '停止監測';
        toggleBtn.className = 'h-9 px-6 font-black tracking-widest bg-bearish/10 text-bearish border border-bearish/30 rounded-lg text-[10px] uppercase transition-all ring-1 ring-bearish/20';
        getEl('hourglass-container')?.classList.remove('hidden');
        fetchUpdate();
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(fetchUpdate, 15000);
    };

    const stopPolling = () => {
        isPolling = false;
        sessionStorage.setItem('tw-live-polling', 'false');
        toggleBtn.textContent = '開始即時監測';
        toggleBtn.className = 'h-9 px-6 font-black tracking-widest bg-accent text-white rounded-lg border-none text-[10px] uppercase transition-all shadow-md';
        getEl('hourglass-container')?.classList.add('hidden');
        cleanupLive();
    };

    toggleBtn.addEventListener('click', () => {
        if (isPolling) stopPolling(); else startPolling();
    });

    searchInput?.addEventListener('input', notifyUI);
    Object.values(filters).forEach(f => f?.addEventListener('change', notifyUI));

    getEl('live-filter-reset')?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        Object.values(filters).forEach(f => {
            if (f) {
                if (f instanceof HTMLSelectElement) f.value = '';
                else if (f instanceof HTMLInputElement) {
                    if (f.type === 'checkbox') f.checked = false;
                    else f.value = '0';
                }
            }
        });
        notifyUI();
    });

    // Auto-resume if it was active
    if (sessionStorage.getItem('tw-live-polling') === 'true') {
        startPolling();
    }
});
