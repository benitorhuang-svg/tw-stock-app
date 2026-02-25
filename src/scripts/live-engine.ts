/**
 * Core Live Polling & Grid Engine for live.astro
 * Performance-optimized: cached DOM refs, reduced querySelector calls,
 * proper cleanup, batch DOM updates
 */
let pollInterval: ReturnType<typeof setInterval> | null = null;

interface LiveStock {
    Code: string;
    Name: string;
    ClosingPrice: string;
    Change: string;
    TradeVolume: string;
    OpeningPrice: string;
    HighestPrice: string;
    LowestPrice: string;
    _closePrice: number;
    _change: number;
    _changePct: number;
    _vol: number;
    _open: number;
    _high: number;
    _low: number;
    _market?: string;
}

document.addEventListener('astro:before-preparation', () => {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
    const tbody = document.getElementById('live-table-body');
    if (tbody) tbody.innerHTML = '';
});

let liveEngineRendered = false;

document.addEventListener('astro:page-load', () => {
    const toggleBtn = document.getElementById('toggle-polling-btn') as HTMLButtonElement | null;
    const updateTimeEl = document.getElementById('last-update-time');
    const tbody = document.getElementById('live-table-body');
    const searchInput = document.getElementById('live-search-input') as HTMLInputElement | null;

    // Guard: only run on live page
    if (!toggleBtn || !tbody) {
        liveEngineRendered = false;
        return;
    }
    if (liveEngineRendered) return;
    liveEngineRendered = true;

    let isPolling = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null,
        currentData: LiveStock[] = [],
        currentSortCol = 'TradeVolume',
        currentSortAsc = false,
        searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    // Cache filter elements once
    const filterElements = {
        starred: document.getElementById('filter-starred') as HTMLInputElement | null,
        sector: document.getElementById('filter-sector') as HTMLSelectElement | null,
        trend: document.getElementById('filter-trend') as HTMLInputElement | null,
        volume: document.getElementById('filter-volume') as HTMLInputElement | null,
        market: document.getElementById('filter-market') as HTMLSelectElement | null,
        price: document.getElementById('filter-price') as HTMLSelectElement | null,
    };

    // Cache sort header elements
    const sortHeaders = document.querySelectorAll<HTMLElement>('th.sortable');

    // Cache breadth elements
    const breadthRefs = {
        ratio: document.getElementById('breadth-ratio'),
        up: document.getElementById('breadth-up'),
        down: document.getElementById('breadth-down'),
        flat: document.getElementById('breadth-flat'),
        barUp: document.getElementById('breadth-bar-up'),
        barDown: document.getElementById('breadth-bar-down'),
        barFlat: document.getElementById('breadth-bar-flat'),
    };



    async function openIntradayAccordion(
        trElement: HTMLElement,
        code: string,
        name: string,
        prevClose: number
    ) {
        const existing = document.querySelector('.chart-accordion-row');
        if (existing) {
            const isSame = existing.previousElementSibling === trElement;
            existing.remove();
            document
                .querySelectorAll('.open-accordion')
                .forEach(el =>
                    el.classList.remove(
                        'open-accordion',
                        'bg-accent/[0.05]',
                        'border-accent/40'
                    )
                );
            if (isSame) return;
        }

        trElement.classList.add('open-accordion', 'bg-accent/[0.05]', 'border-accent/40');
        const accordionTr = document.createElement('tr');
        accordionTr.className = 'chart-accordion-row bg-white/[0.01]';
        accordionTr.innerHTML = `
                    <td colspan="3" class="p-0 border-r border-white/5 border-dashed align-top relative">
                        <div class="absolute right-0 top-0 bottom-0 w-px bg-accent/20"></div>
                        <div class="p-6 pl-8 text-[11px] text-white/40 leading-relaxed font-mono">
                            <strong class="text-accent text-sm tracking-widest font-black">${name}</strong> <span class="opacity-20">(${code})</span><br/><br/>
                            <div class="flex items-center gap-2 mb-4">
                                <div class="w-1 h-1 rounded-full bg-accent animate-pulse"></div>
                                <span>Establishing Intraday Stream...</span>
                            </div>
                            Tracing per-minute price dynamics via <span class="text-accent/60">Y-Forensic API</span>.
                        </div>
                    </td>
                    <td colspan="5" class="p-4 relative h-[250px] align-top bg-gradient-to-br from-transparent to-accent/[0.02]">
                        <div id="acc-loading" class="absolute inset-4 flex flex-col items-center justify-center bg-black/80 z-10 backdrop-blur-sm rounded-xl">
                            <div class="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-2"></div>
                            <span class="text-[9px] text-accent tracking-widest font-black uppercase">Intercepting_Data...</span>
                        </div>
                        <div id="acc-error" class="hidden absolute inset-4 flex flex-col items-center justify-center bg-red-950/20 z-10 text-bearish text-[10px] font-mono border border-bearish/30 p-4 text-center rounded-xl uppercase tracking-widest"></div>
                        <svg id="acc-svg" class="w-full h-full overflow-visible" viewBox="0 0 600 220" preserveAspectRatio="none"></svg>
                    </td>
                `;
        trElement.insertAdjacentElement('afterend', accordionTr);

        const loadingEl = document.getElementById('acc-loading');
        const errorEl = document.getElementById('acc-error');
        const svgEl = document.getElementById('acc-svg');

        try {
            const res = await fetch(`/api/intraday?symbol=${code}`);
            const json = await res.json();
            if (json.status !== 'success')
                throw new Error(json.message || 'ENGINE_UPLINK_FAILURE');

            const data = json.data;
            if (!data || !data.length) throw new Error('NO_MARKET_ACTIVITY_DETECTED');

            const tablePriceStr = trElement
                .querySelector('.cell-close')
                ?.textContent?.trim();
            if (tablePriceStr) {
                const tablePrice = parseFloat(tablePriceStr);
                if (!isNaN(tablePrice)) data[data.length - 1].price = tablePrice;
            }
            const currentPrice = data[data.length - 1].price;

            const w = 600,
                h = 200;
            const firstDate = new Date(data[0].time);
            const startMs = new Date(
                firstDate.getFullYear(),
                firstDate.getMonth(),
                firstDate.getDate(),
                9,
                0,
                0
            ).getTime();
            const endMs = startMs + 4.5 * 60 * 60 * 1000;
            const rangeMs = endMs - startMs;

            const prices = data.map((d: { price: number }) => d.price);
            const minP = Math.min(...prices, prevClose, currentPrice);
            const maxP = Math.max(...prices, prevClose, currentPrice);
            const range = Math.max(maxP - minP, 0.01);
            const chartMin = minP - range * 0.1,
                chartMax = maxP + range * 0.1,
                chartRange = chartMax - chartMin;

            let pathD = '',
                areaD = '';
            for (let i = 0; i < data.length; i++) {
                const d = data[i];
                let x = ((d.time - startMs) / rangeMs) * w;
                if (x < 0) x = 0;
                if (x > w) x = w;
                const y = h - ((d.price - chartMin) / chartRange) * h;
                if (i === 0) {
                    pathD += `M${x},${y} `;
                    areaD += `M${x},${h} L${x},${y} `;
                } else {
                    pathD += `L${x},${y} `;
                    areaD += `L${x},${y} `;
                }
                if (i === data.length - 1) areaD += `L${x},${h} Z`;
            }

            const prevY = h - ((prevClose - chartMin) / chartRange) * h;
            const strokeColor = currentPrice >= prevClose ? '#ef4444' : '#22c55e';
            const fillGradient =
                currentPrice >= prevClose ? 'url(#gradBull)' : 'url(#gradBear)';

            const timelines = [0, 60, 120, 180, 240, 270]
                .map(mins => {
                    const lx = (mins / 270) * w;
                    const hr = Math.floor(9 + mins / 60),
                        mn = mins % 60;
                    const tStr = `${hr.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}`;
                    return `<line x1="${lx}" y1="0" x2="${lx}" y2="${h}" stroke="#ffffff" stroke-opacity="0.05" stroke-dasharray="2 2" /><text x="${lx}" y="${h + 15}" fill="#ffffff" fill-opacity="0.3" font-size="8" font-family="monospace" text-anchor="${mins === 0 ? 'start' : mins === 270 ? 'end' : 'middle'}">${tStr}</text>`;
                })
                .join('');

            if (svgEl) {
                const pulseCx = ((data[data.length - 1].time - startMs) / rangeMs) * w,
                    pulseCy = h - ((currentPrice - chartMin) / chartRange) * h;
                svgEl.innerHTML = `
                            <defs>
                                <linearGradient id="gradBull" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ef4444" stop-opacity="0.2" /><stop offset="100%" stop-color="#ef4444" stop-opacity="0" /></linearGradient>
                                <linearGradient id="gradBear" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#22c55e" stop-opacity="0.2" /><stop offset="100%" stop-color="#22c55e" stop-opacity="0" /></linearGradient>
                            </defs>
                            ${timelines}
                            <line x1="0" y1="${prevY}" x2="${w}" y2="${prevY}" stroke="#ffffff" stroke-opacity="0.2" stroke-dasharray="4 4" />
                            <text x="5" y="${prevY - 5}" fill="#ffffff" fill-opacity="0.4" font-size="9" font-family="monospace">PREV_CLOSE ${prevClose.toFixed(2)}</text>
                            <path d="${areaD}" fill="${fillGradient}" /><path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linejoin="round" />
                            <rect x="${w - 45}" y="${pulseCy - 10}" width="45" height="20" fill="${strokeColor}" rx="4" /><text x="${w - 5}" y="${pulseCy + 4}" fill="#ffffff" font-weight="black" font-size="10" font-family="monospace" text-anchor="end">${currentPrice.toFixed(2)}</text>
                            <circle cx="${Math.min(w, pulseCx)}" cy="${pulseCy}" r="3" fill="${strokeColor}" />
                            <circle cx="${Math.min(w, pulseCx)}" cy="${pulseCy}" r="8" fill="${strokeColor}" opacity="0.3"><animate attributeName="r" values="3;12;3" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" /></circle>
                        `;
            }
            if (loadingEl) loadingEl.classList.add('hidden');
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            if (errorEl) {
                errorEl.innerHTML = `<strong>UPLINK_INTERRUPTED</strong><br/><span class="opacity-50 mt-2">${message}</span>`;
                errorEl.classList.remove('hidden');
            }
            if (loadingEl) loadingEl.classList.add('hidden');
        }
    }

    // Debounced search for better performance
    let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    if (searchInput)
        searchInput.addEventListener('input', e => {
            if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                searchQuery = (e.target as HTMLInputElement).value;
                renderData();
            }, 150);
        });

    const filterEls = Object.values(filterElements).filter(Boolean);
    filterEls.forEach(el => {
        el?.addEventListener('input', renderData);
        el?.addEventListener('change', renderData);
    });

    document.getElementById('live-filter-reset')?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        filterEls.forEach(el => {
            if (el instanceof HTMLSelectElement) el.value = '';
            else if (el instanceof HTMLInputElement) {
                if (el.type === 'checkbox') el.checked = false;
                else el.value = '0';
            }
        });
        const trendDisp = document.getElementById('trend-display'),
            volDisp = document.getElementById('vol-display'),
            starIcon = document.querySelector('.star-toggle-icon');
        if (trendDisp) {
            trendDisp.textContent = '0%';
            trendDisp.className =
                'text-[9px] font-mono font-black text-accent leading-none';
        }
        if (volDisp) volDisp.textContent = '0';
        if (starIcon) starIcon.textContent = '☆';
        searchQuery = '';
        renderData();
    });

    sortHeaders.forEach(th =>
        th.addEventListener('click', () => {
            const sortCol = th.getAttribute('data-sort');
            if (!sortCol) return;
            if (currentSortCol === sortCol) currentSortAsc = !currentSortAsc;
            else {
                currentSortCol = sortCol;
                currentSortAsc = false;
            }
            renderData();
        })
    );

    tbody.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const starBtn = target.closest('.watchlist-toggle-btn') as HTMLElement;
        if (starBtn) {
            e.stopPropagation();
            const code = starBtn.dataset.code;
            if (!code) return;
            let wl: string[] = JSON.parse(localStorage.getItem('watchlist') || '[]');
            wl = wl.includes(code) ? wl.filter((c) => c !== code) : [...wl, code];
            localStorage.setItem('watchlist', JSON.stringify(wl));
            renderData();
            return;
        }
        const tr = target.closest('tr[data-code]') as HTMLElement;
        if (!tr || target.closest('.cell-info')) return;
        const code = tr.getAttribute('data-code'),
            name = tr.getAttribute('data-name'),
            prevC = parseFloat(tr.getAttribute('data-prev') || '0');
        if (code && name) openIntradayAccordion(tr, code, name, prevC);
    });

    async function fetchLiveData() {
        if (!tbody) return;
        try {
            if (retryTimeout) clearTimeout(retryTimeout);
            const res = await fetch('/api/live');
            if (!res.ok) throw new Error('DATA_SOURCE_OFFLINE');
            const result = await res.json();
            if (result.status === 'error') throw new Error(result.message);

            currentData = result.data.map((s: LiveStock) => {
                const close = parseFloat(String(s.ClosingPrice || '0')),
                    change = parseFloat(String(s.Change || '0')),
                    prev = close > 0 ? close - change : 0;
                return {
                    ...s,
                    _closePrice: close,
                    _change: change,
                    _changePct: prev > 0 ? (change / prev) * 100 : 0,
                    _vol: Math.round(parseFloat(String(s.TradeVolume || '0')) / 1000),
                    _open: parseFloat(String(s.OpeningPrice || '0')),
                    _high: parseFloat(String(s.HighestPrice || '0')),
                    _low: parseFloat(String(s.LowestPrice || '0')),
                };
            });

            window.dispatchEvent(
                new CustomEvent('tw-live-update', {
                    detail: { type: 'DATA', payload: { data: currentData } }
                })
            );

            renderData();
        } catch (error: unknown) {
            console.error('Buffer fetch failed:', error);
            let cd = 15;
            const count = () => {
                if (cd <= 0) {
                    if (isPolling) fetchLiveData();
                    return;
                }
                cd--;
                if (isPolling) retryTimeout = setTimeout(count, 1000);
            };
            count();
        }
    }

    function renderData() {
        const tsSearch = searchQuery.toLowerCase(),
            tsTrend = filterElements.trend?.value || '0',
            tsVol = parseInt(filterElements.volume?.value || '0', 10),
            tsStarred = filterElements.starred?.checked,
            tsMarket = filterElements.market?.value || '',
            tsPriceRange = filterElements.price?.value || '';

        // Svelte component will do the heavy lifting. We just broadcast the controls' states!
        window.dispatchEvent(
            new CustomEvent('tw-live-update', {
                detail: {
                    type: 'FILTERS',
                    payload: {
                        search: tsSearch,
                        trend: tsTrend,
                        volume: tsVol,
                        starred: tsStarred,
                        market: tsMarket,
                        price: tsPriceRange
                    }
                }
            })
        );
    }

    // Tell Svelte about initial sync
    window.dispatchEvent(
        new CustomEvent('tw-live-update', {
            detail: { type: 'FILTERS', payload: { search: searchQuery, trend: filterElements.trend?.value || '0', volume: parseInt(filterElements.volume?.value || '0', 10), starred: filterElements.starred?.checked, market: filterElements.market?.value || '', price: filterElements.price?.value || '' } }
        })
    );

    // Breadth Calculation
    let up = 0,
        flat = 0,
        down = 0;
    for (const s of currentData) {
        if (s._change > 0) up++;
        else if (s._change < 0) down++;
        else flat++;
    }
    const tot = up + down + flat;
    if (breadthRefs.up) breadthRefs.up.textContent = String(up);
    if (breadthRefs.down) breadthRefs.down.textContent = String(down);
    if (breadthRefs.flat) breadthRefs.flat.textContent = String(flat);
    if (breadthRefs.ratio) breadthRefs.ratio.textContent = down > 0 ? (up / down).toFixed(2) : 'MAX';
    if (tot > 0) {
        if (breadthRefs.barUp) breadthRefs.barUp.style.width = (up / tot) * 100 + '%';
        if (breadthRefs.barDown) breadthRefs.barDown.style.width = (down / tot) * 100 + '%';
        if (breadthRefs.barFlat) breadthRefs.barFlat.style.width = (flat / tot) * 100 + '%';
    }

    toggleBtn.addEventListener('click', () => {
        isPolling = !isPolling;
        const hgC = document.getElementById('hourglass-container'),
            hgM = document.getElementById('main-hourglass');
        if (isPolling) {
            sessionStorage.setItem('livePolling', 'true');
            toggleBtn.innerText = '停止監測';
            toggleBtn.className =
                'h-9 px-6 font-black tracking-widest bg-bearish/10 text-bearish border border-bearish/30 rounded-lg text-[10px] uppercase shadow-[0_4px_15px_rgba(239,68,68,0.1)] transition-all';
            if (hgC) hgC.classList.remove('hidden');
            const start = () => {
                if (hgM) {
                    hgM.style.animation = 'none';
                    void hgM.offsetWidth;
                    hgM.style.animation = 'hourglass-flip 15s ease-in-out infinite';
                }
                if (updateTimeEl) {
                    const now = new Date();
                    updateTimeEl.innerText = now.toLocaleTimeString();
                    updateTimeEl.classList.add('animate-pulse');
                    setTimeout(() => updateTimeEl.classList.remove('animate-pulse'), 1000);
                }
            };
            start();
            fetchLiveData();
            if (pollInterval) clearInterval(pollInterval);
            pollInterval = setInterval(() => {
                start();
                fetchLiveData();
            }, 15000);
        } else {
            sessionStorage.setItem('livePolling', 'false');
            toggleBtn.innerText = '開始監測';
            toggleBtn.className =
                'h-9 px-6 font-black tracking-widest bg-accent text-white rounded-lg border-none text-[10px] uppercase shadow-[0_4px_15px_rgba(59,130,246,0.3)] transition-all';
            if (hgC) hgC.classList.add('hidden');
            if (pollInterval) {
                clearInterval(pollInterval);
            }
            pollInterval = null;
            if (retryTimeout) clearTimeout(retryTimeout);
        }
    });

    if (sessionStorage.getItem('livePolling') === 'true') toggleBtn.click();
});
