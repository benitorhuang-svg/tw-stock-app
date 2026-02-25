/**
 * Core Live Polling & Grid Engine for live.astro
 */
// ═══ Forensic Momentum Engine ═══
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
});

document.addEventListener('astro:page-load', () => {
    let isPolling = false;

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
            data.forEach((d: { time: number; price: number }, i: number) => {
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
            });

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

    const toggleBtn = document.getElementById('toggle-polling-btn') as HTMLButtonElement | null;
    const updateTimeEl = document.getElementById('last-update-time');
    const tbody = document.getElementById('live-table-body');
    const searchInput = document.getElementById('live-search-input') as HTMLInputElement | null;

    if (!toggleBtn) return;

    let retryTimeout: ReturnType<typeof setTimeout> | null = null,
        currentData: LiveStock[] = [],
        currentSortCol = 'TradeVolume',
        currentSortAsc = false,
        searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (searchInput)
        searchInput.addEventListener('input', e => {
            searchQuery = (e.target as HTMLInputElement).value;
            renderData();
        });

    const filters = [
        'filter-starred',
        'filter-sector',
        'filter-trend',
        'filter-volume',
        'filter-market',
        'filter-price',
    ].map(id => document.getElementById(id));
    filters.forEach(el => el?.addEventListener('input', renderData));
    filters.forEach(el => el?.addEventListener('change', renderData));

    document.getElementById('live-filter-reset')?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        filters.forEach(el => {
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

    document.querySelectorAll('th.sortable').forEach(th =>
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

    tbody?.addEventListener('click', e => {
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
            renderData();
        } catch (error: unknown) {
            console.error('Buffer fetch failed:', error);
            let cd = 15;
            const count = () => {
                if (cd <= 0) {
                    if (isPolling) fetchLiveData();
                    return;
                }
                tbody.innerHTML = `<tr class="text-center"><td colspan="8" class="py-12 text-bearish font-mono text-[10px] tracking-widest uppercase italic">Uplink_Lost. Reconnecting in ${cd}s...</td></tr>`;
                cd--;
                if (isPolling) retryTimeout = setTimeout(count, 1000);
            };
            count();
        }
    }

    function renderData() {
        if (!tbody) return;
        let wl: string[] = JSON.parse(localStorage.getItem('watchlist') || '[]');
        const tsSearch = searchQuery.toLowerCase(),
            tsTrend = (document.getElementById('filter-trend') as HTMLInputElement)?.value || '0',
            tsVol = parseInt(
                (document.getElementById('filter-volume') as HTMLInputElement)?.value || '0',
                10
            ),
            tsStarred = (document.getElementById('filter-starred') as HTMLInputElement)?.checked,
            tsMarket = (document.getElementById('filter-market') as HTMLSelectElement)?.value || '',
            tsPriceRange = (document.getElementById('filter-price') as HTMLSelectElement)?.value || '';

        let filtered = currentData.filter(s => {
            if (tsMarket && s._market !== tsMarket.toUpperCase()) return false;
            if (
                tsSearch &&
                !s.Code.toLowerCase().includes(tsSearch) &&
                !s.Name.toLowerCase().includes(tsSearch)
            )
                return false;
            if (tsStarred && !wl.includes(s.Code)) return false;
            if (tsPriceRange) {
                const [min, max] = tsPriceRange.split('-').map(Number);
                if (s._closePrice < min || s._closePrice > max) return false;
            }
            if (tsVol > 0 && s._vol < tsVol) return false;
            if (tsTrend !== '0') {
                const t = parseFloat(tsTrend);
                if ((t > 0 && s._changePct < t) || (t < 0 && s._changePct > t))
                    return false;
            }
            return true;
        });

        const filteredCount = document.getElementById('filtered-count');
        if (filteredCount) filteredCount.textContent = `${filtered.length}`;

        filtered.sort((a, b) => {
            const as = wl.includes(a.Code),
                bs = wl.includes(b.Code);
            if (as !== bs) return as ? -1 : 1;
            let va: string | number = (a as any)[`_${currentSortCol.replace('_', '')}`] ?? (a as any)[currentSortCol] ?? 0,
                vb: string | number = (b as any)[`_${currentSortCol.replace('_', '')}`] ?? (b as any)[currentSortCol] ?? 0;
            if (currentSortCol === 'ClosingPrice') {
                va = a._closePrice;
                vb = b._closePrice;
            }
            if (currentSortCol === 'ChangePct') {
                va = a._changePct;
                vb = b._changePct;
            }
            if (currentSortCol === 'Change') {
                va = a._change;
                vb = b._change;
            }
            if (currentSortCol === 'TradeVolume') {
                va = a._vol;
                vb = b._vol;
            }
            if (typeof va === 'string' && typeof vb === 'string')
                return currentSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);

            const numA = typeof va === 'number' ? va : parseFloat(String(va)) || 0;
            const numB = typeof vb === 'number' ? vb : parseFloat(String(vb)) || 0;
            return currentSortAsc ? numA - numB : numB - numA;
        });

        document.querySelectorAll('th.sortable').forEach(th => {
            const icon = th.querySelector('.sort-icon');
            if (icon) {
                if (th.getAttribute('data-sort') === currentSortCol) {
                    icon.textContent = currentSortAsc ? '▲' : '▼';
                    icon.className = 'sort-icon text-accent font-black transition-all';
                } else {
                    icon.textContent = '↕';
                    icon.className = 'sort-icon opacity-50';
                }
            }
        });

        const top = filtered.slice(0, 300);
        if (top.length === 0) {
            tbody.innerHTML = `<tr class="text-center"><td colspan="8" class="py-24 text-white/20 font-mono text-[9px] tracking-widest uppercase">Zero_Signals_Detected</td></tr>`;
            return;
        }

        const existing = new Map();
        Array.from(tbody.children).forEach(tr => {
            if (tr.hasAttribute('data-code'))
                existing.set(tr.getAttribute('data-code'), tr);
            else if (tr.classList.contains('chart-accordion-row')) {
                const pc = tr.previousElementSibling?.getAttribute('data-code');
                if (pc) existing.set(pc + '-acc', tr);
            } else tr.remove();
        });

        let cur = 0;
        top.forEach(s => {
            let tr = existing.get(s.Code) as HTMLElement;
            if (!tr) {
                tr = document.createElement('tr');
                tr.className =
                    'hover:bg-white/[0.04] transition-all cursor-pointer group border-b border-white/[0.02]';
                tr.setAttribute('data-code', s.Code);
                tr.setAttribute('data-name', s.Name);
                tr.innerHTML = `<td class="px-4 py-3 cell-info"><div class="flex items-center gap-3"><button class="watchlist-toggle-btn text-white/20 hover:text-accent transition-all" data-code="${s.Code}"><span class="text-xs star-icon">☆</span></button><div class="min-w-0"><div class="text-[12px] font-black text-white group-hover:text-accent transition-all truncate cell-name"></div><div class="text-[8px] font-mono text-white/20 tracking-widest cell-code"></div></div></div></td><td class="px-4 py-3 text-right cell-close text-[12px] font-mono"></td><td class="px-4 py-3 text-right cell-pct text-[12px] font-black font-mono"></td><td class="px-4 py-3 text-right cell-change text-[12px] font-bold font-mono"></td><td class="px-4 py-3 text-right opacity-30 cell-open text-[11px] font-mono"></td><td class="px-4 py-3 text-right opacity-30 cell-high text-[11px] font-mono"></td><td class="px-4 py-3 text-right opacity-30 cell-low text-[11px] font-mono"></td><td class="px-4 py-3 text-right text-white/30 cell-vol text-[12px] font-mono font-bold"></td>`;
            } else existing.delete(s.Code);

            const color =
                s._change > 0
                    ? 'text-bullish'
                    : s._change < 0
                        ? 'text-bearish'
                        : 'text-white/40';
            const prev = s._closePrice > 0 ? (s._closePrice - s._change).toFixed(2) : '0';
            tr.setAttribute('data-prev', prev);

            if (tr.querySelector('.cell-code'))
                tr.querySelector('.cell-code')!.textContent = s.Code;
            if (tr.querySelector('.cell-name'))
                tr.querySelector('.cell-name')!.textContent = s.Name;
            const si = tr.querySelector('.star-icon');
            if (si) {
                const ist = wl.includes(s.Code);
                si.textContent = ist ? '★' : '☆';
                si.className = ist
                    ? 'text-xs star-icon text-accent drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                    : 'text-xs star-icon';
            }

            const cc = tr.querySelector('.cell-close');
            if (cc) {
                cc.className = 'px-4 py-3 text-right cell-close ' + color;
                cc.textContent = s._closePrice.toFixed(2);
            }
            const cp = tr.querySelector('.cell-pct');
            if (cp) {
                cp.className = 'px-4 py-3 text-right cell-pct ' + color;
                cp.textContent = (s._change > 0 ? '+' : '') + s._changePct.toFixed(2) + '%';
            }
            const ch = tr.querySelector('.cell-change');
            if (ch) {
                ch.className = 'px-4 py-3 text-right cell-change ' + color;
                ch.textContent = (s._change > 0 ? '+' : '') + s.Change;
            }
            if (tr.querySelector('.cell-open'))
                tr.querySelector('.cell-open')!.textContent = s._open.toFixed(2);
            if (tr.querySelector('.cell-high'))
                tr.querySelector('.cell-high')!.textContent = s._high.toFixed(2);
            if (tr.querySelector('.cell-low'))
                tr.querySelector('.cell-low')!.textContent = s._low.toFixed(2);
            if (tr.querySelector('.cell-vol'))
                tr.querySelector('.cell-vol')!.textContent = s._vol.toLocaleString();

            if (tbody.children[cur] !== tr)
                tbody.insertBefore(tr, tbody.children[cur] || null);
            cur++;
            const acc = existing.get(s.Code + '-acc');
            if (acc) {
                if (tbody.children[cur] !== acc)
                    tbody.insertBefore(acc as HTMLElement, tbody.children[cur] || null);
                existing.delete(s.Code + '-acc');
                cur++;
            }
        });
        existing.forEach(tr => (tr as HTMLElement).remove());

        // Breadth
        let up = 0,
            flat = 0,
            down = 0;
        currentData.forEach(s => {
            if (s._change > 0) up++;
            else if (s._change < 0) down++;
            else flat++;
        });
        const tot = up + down + flat;
        const rEl = document.getElementById('breadth-ratio'),
            uEl = document.getElementById('breadth-up'),
            dEl = document.getElementById('breadth-down'),
            fEl = document.getElementById('breadth-flat');
        if (uEl) uEl.textContent = String(up);
        if (dEl) dEl.textContent = String(down);
        if (fEl) fEl.textContent = String(flat);
        if (rEl) rEl.textContent = down > 0 ? (up / down).toFixed(2) : 'MAX';
        if (tot > 0) {
            const bU = document.getElementById('breadth-bar-up'),
                bD = document.getElementById('breadth-bar-down'),
                bF = document.getElementById('breadth-bar-flat');
            if (bU) bU.style.width = (up / tot) * 100 + '%';
            if (bD) bD.style.width = (down / tot) * 100 + '%';
            if (bF) bF.style.width = (flat / tot) * 100 + '%';
        }
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
