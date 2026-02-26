/**
 * live-engine.ts — Core Polling & Breadth Controller
 * Atomic Design: This is the engine (Atom-level logic) for the Live page.
 * Responsibilities: polling toggle, fetch, breadth DOM update, event dispatch.
 * NO filter/sort logic here — that belongs to the Svelte component.
 */
import { getEl } from '../lib/dom';

let pollInterval: ReturnType<typeof setInterval> | null = null;

function cleanupLive() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

document.addEventListener('astro:before-swap', cleanupLive, { once: true });

document.addEventListener('astro:page-load', () => {
    const toggleBtn = getEl('toggle-polling-btn') as HTMLButtonElement | null;
    if (!toggleBtn || toggleBtn.dataset.bound) return;
    toggleBtn.dataset.bound = 'true';

    // ─── Cached DOM refs (queried once) ────────────────
    const searchInput = getEl('live-search-input') as HTMLInputElement | null;
    const updateTimeEl = getEl('last-update-time');

    const filterEls = {
        starred: getEl('filter-starred') as HTMLInputElement | null,
        trend: getEl('filter-trend') as HTMLInputElement | null,
        volume: getEl('filter-volume') as HTMLInputElement | null,
        market: getEl('filter-market') as HTMLSelectElement | null,
        price: getEl('filter-price') as HTMLSelectElement | null,
    };

    // Breadth DOM refs
    const bUp = getEl('breadth-range-up');
    const bDown = getEl('breadth-range-down');
    const bBarUp = getEl('breadth-bar-up');
    const bBarDown = getEl('breadth-bar-down');
    const bBarFlat = getEl('breadth-bar-flat');

    let isPolling = false;

    // ─── Filter notification (Debounced for performance) ───────
    let filterTimeoutId: ReturnType<typeof setTimeout> | null = null;
    function notifyFilters() {
        if (filterTimeoutId) clearTimeout(filterTimeoutId);
        filterTimeoutId = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('tw-live-update', {
                detail: {
                    type: 'FILTERS',
                    payload: {
                        search: searchInput?.value.toLowerCase() || '',
                        trend: filterEls.trend?.value || '0',
                        volume: parseInt(filterEls.volume?.value || '0', 10),
                        starred: filterEls.starred?.checked || false,
                        market: filterEls.market?.value || '',
                        price: filterEls.price?.value || '',
                    }
                }
            }));
        }, 200);
    }


    // ─── Data fetch ────────────────────────────────────
    async function fetchUpdate() {
        try {
            const res = await fetch('/api/live');
            if (!res.ok) return;
            const result = await res.json();
            if (result.status !== 'success' && result.status !== 'error_using_stale_cache') return;

            const data = result.data;
            let u = 0, d = 0, f = 0;
            const mapped = new Array(data.length);

            for (let i = 0; i < data.length; i++) {
                const s = data[i];
                const close = parseFloat(s.ClosingPrice || '0');
                const chg = parseFloat(s.Change || '0');
                const prev = close > 0 ? close - chg : 0;
                const vol_today = parseFloat(s.TradeVolume || '0');

                mapped[i] = {
                    ...s,
                    _closePrice: close,
                    _change: chg,
                    _changePct: prev > 0 ? (chg / prev) * 100 : 0,
                    _vol: Math.round(vol_today / 1000),
                    _open: parseFloat(s.OpeningPrice || '0'),
                    _high: parseFloat(s.HighestPrice || '0'),
                    _low: parseFloat(s.LowestPrice || '0'),
                };

                // ─── Forensic Signal Detection ───
                const ma20 = s._ma20 || 0;
                const rsi = s._rsi || 50;
                const avgVol = s._avgVol || 0;

                detectSignals(s.Code, s.Name, close, prev, vol_today, ma20, rsi, avgVol);

                if (chg > 0) u++; else if (chg < 0) d++; else f++;
            }

            // ... (breadcrumb update remains)
            const total = u + d + f;
            if (bUp) bUp.textContent = String(u);
            if (bDown) bDown.textContent = String(d);
            if (total > 0 && bBarUp && bBarDown && bBarFlat) {
                bBarUp.style.width = (u / total) * 100 + '%';
                bBarDown.style.width = (d / total) * 100 + '%';
                bBarFlat.style.width = (f / total) * 100 + '%';
            }

            if (updateTimeEl) updateTimeEl.textContent = new Date().toLocaleTimeString();

            window.dispatchEvent(new CustomEvent('tw-live-update', {
                detail: { type: 'DATA', payload: { data: mapped } }
            }));
        } catch (_) { /* silent */ }
    }

    const seenSignals = new Set<string>();
    function detectSignals(code: string, name: string, price: number, prev: number, vol: number, ma20: number, rsi: number, avgVol: number) {
        if (price === 0 || isNaN(price)) return;

        // 1. Volume Breakout (>2x 20-day average)
        if (avgVol > 0 && vol > avgVol * 2.5 && vol > 1000000) {
            triggerSignal(code, name, 'VOLUME_SPIKE', `異常爆量! 當前成交量已達均量 2.5 倍以上`, 'warning');
        }

        // 2. MA20 Breakthrough (Golden Cross)
        if (ma20 > 0 && prev < ma20 && price > ma20) {
            triggerSignal(code, name, 'MA_BREAK', `強勢突破! 價格成功站上 20日均線 (${ma20.toFixed(2)})`, 'success');
        }

        // 3. RSI Overbought/Oversold
        if (rsi > 75) {
            triggerSignal(code, name, 'RSI_EXTREME', `超買警告: RSI (${rsi.toFixed(1)}) 處於極度過熱區間`, 'warning');
        } else if (rsi < 25 && rsi > 0) {
            triggerSignal(code, name, 'RSI_EXTREME', `超跌信號: RSI (${rsi.toFixed(1)}) 進入深度超賣區間`, 'info');
        }
    }

    function triggerSignal(symbol: string, name: string, type: string, message: string, severity: string) {
        const key = `${symbol}_${type}`;
        if (seenSignals.has(key)) return;
        seenSignals.add(key);

        window.dispatchEvent(new CustomEvent('tw-signal', {
            detail: { symbol, name, type, message, severity }
        }));
    }


    // ─── Polling control ──────────────────────────────
    function startPolling() {
        isPolling = true;
        sessionStorage.setItem('tw-live-polling', 'true');
        toggleBtn!.textContent = '停止監測';
        toggleBtn!.className = 'h-9 px-6 font-black tracking-widest bg-bearish/10 text-bearish border border-bearish/30 rounded-lg text-[10px] uppercase transition-colors ring-1 ring-bearish/20';
        getEl('hourglass-container')?.classList.remove('hidden');
        fetchUpdate();
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(fetchUpdate, 15000);
    }

    function stopPolling() {
        isPolling = false;
        sessionStorage.setItem('tw-live-polling', 'false');
        toggleBtn!.textContent = '開始即時監測';
        toggleBtn!.className = 'h-9 px-6 font-black tracking-widest bg-accent text-white rounded-lg border-none text-[10px] uppercase transition-colors shadow-md';
        getEl('hourglass-container')?.classList.add('hidden');
        cleanupLive();
    }

    // ─── Event bindings ────────────────────────────────
    toggleBtn.addEventListener('click', () => {
        if (isPolling) stopPolling(); else startPolling();
    });

    searchInput?.addEventListener('input', notifyFilters);
    Object.values(filterEls).forEach(f => f?.addEventListener('change', notifyFilters));

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
        notifyFilters();
    });

    // Auto-resume
    if (sessionStorage.getItem('tw-live-polling') === 'true') startPolling();
});
