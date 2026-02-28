/**
 * Core Dashboard Synchronizer Engine
 * EXTREME OPTIMIZATION: Throttled SSE, Pre-calc Breadth, Cross-tab Sync, RAF
 */
let activeSSE: EventSource | null = null;
let dashboardRendered = false;
let updateTid: number | null = null;

import { getEl } from '../lib/dom';
import {
    claimOracleStatus,
    broadcastQuantumUpdate,
    subscribeToQuantumData,
} from '../lib/sse-messenger';

function cleanupSSE() {
    if (activeSSE) {
        activeSSE.close();
        activeSSE = null;
    }
}

function fmtVol(v: number): string {
    const cv = Math.ceil(v);
    if (cv >= 100000000) return (cv / 100000000).toFixed(1) + '億';
    if (cv >= 10000) return (cv / 10000).toFixed(1) + '萬';
    return cv > 0 ? cv.toLocaleString('zh-TW') : '—';
}

interface DashboardRefs {
    ratio: HTMLElement | null;
    up: HTMLElement | null;
    down: HTMLElement | null;
    vol: HTMLElement | null;
    chg: HTMLElement | null;
    date: HTMLElement | null;
    barUp: HTMLElement | null;
    barDown: HTMLElement | null;
    barFlat: HTMLElement | null;
    gGrid: HTMLElement | null;
    lGrid: HTMLElement | null;
    vGrid: HTMLElement | null;
    picker: HTMLInputElement | null;
}

interface TickData {
    Close?: number;
    price?: number;
    ChangePct?: number;
    changePercent?: number;
    Volume?: number;
    volume?: number;
    Date?: string;
}

function updateUI(ticks: TickData[], refs: DashboardRefs) {
    if (updateTid) return;
    updateTid = requestAnimationFrame(() => {
        try {
            let up = 0,
                down = 0,
                flat = 0,
                totalVol = 0,
                totalPct = 0,
                count = 0,
                latestDate = '';
            for (let i = 0, len = ticks.length; i < len; i++) {
                const t = ticks[i];
                const price = t.Close || t.price || 0;
                const chg = t.ChangePct || t.changePercent || 0;
                if (price > 0) {
                    if (chg > 0) up++;
                    else if (chg < 0) down++;
                    else flat++;
                    totalVol += t.Volume || t.volume || 0;
                    totalPct += chg;
                    count++;
                    if (t.Date) latestDate = t.Date;
                }
            }
            const total = up + down + flat;
            if (refs.ratio) refs.ratio.textContent = down > 0 ? (up / down).toFixed(2) : 'MAX';
            if (refs.up) refs.up.textContent = String(up);
            if (refs.down) refs.down.textContent = String(down);
            if (refs.vol) refs.vol.textContent = fmtVol(totalVol);
            if (refs.chg) {
                const avg = count > 0 ? totalPct / count : 0;
                refs.chg.textContent = (avg >= 0 ? '+' : '') + avg.toFixed(2) + '%';
                refs.chg.className = `text-xl font-mono font-bold ${avg >= 0 ? 'text-bullish' : 'text-bearish'}`;
            }
            if (refs.date && latestDate) refs.date.textContent = latestDate;
            if (refs.barUp) refs.barUp.style.width = (total > 0 ? (up / total) * 100 : 0) + '%';
            if (refs.barDown)
                refs.barDown.style.width = (total > 0 ? (down / total) * 100 : 0) + '%';
            if (refs.barFlat)
                refs.barFlat.style.width = (total > 0 ? (flat / total) * 100 : 0) + '%';
        } finally {
            updateTid = null;
        }
    });
}

function setupDashboardSync() {
    const hudUp = getEl('hud-up');
    if (!hudUp) return;

    const refs = {
        ratio: getEl('breadth-ratio-hud'),
        up: hudUp,
        down: getEl('hud-down'),
        vol: getEl('hud-volume'),
        chg: getEl('hud-avg-change'),
        date: getEl('hud-date'),
        barUp: getEl('hud-bar-up'),
        barDown: getEl('hud-bar-down'),
        barFlat: getEl('hud-bar-flat'),
        gGrid: getEl('hud-gainers-grid'),
        lGrid: getEl('hud-losers-grid'),
        vGrid: getEl('hud-volume-grid'),
        picker: getEl('market-date-picker-hud') as HTMLInputElement | null,
    };

    cleanupSSE();

    // Subscribe to quantum channel (Shared across tabs)
    subscribeToQuantumData('tick', ticks => updateUI(ticks as TickData[], refs));

    // Election: Only one tab (the Oracle) opens the actually SSE stream
    if (claimOracleStatus()) {
        activeSSE = new EventSource('/api/sse/stream');
        activeSSE.addEventListener('tick', (e: MessageEvent) => {
            const data = JSON.parse(e.data);
            broadcastQuantumUpdate('tick', data); // Inform all other tabs
            updateUI(data, refs);
        });
    }

    // Cleanup SSE on view-transition navigation
    document.addEventListener('astro:before-swap', () => {
        cleanupSSE();
    }, { once: true });

    refs.picker?.addEventListener('change', async (e: Event) => {
        const date = (e.target as HTMLInputElement).value;
        if (!date) return;
        const res = await fetch(`/api/market/history?date=${date}`);
        const data = await res.json();
        if (res.ok && !data.error) {
            const { summary, gainers, losers, volumeLeaders } = data;
            const total = summary.up + summary.down + summary.flat;
            if (refs.ratio)
                refs.ratio.textContent =
                    summary.down > 0 ? (summary.up / summary.down).toFixed(2) : 'MAX';
            if (refs.up) refs.up.textContent = String(summary.up);
            if (refs.down) refs.down.textContent = String(summary.down);
            if (refs.vol) refs.vol.textContent = fmtVol(summary.totalVolume);
            if (refs.barUp)
                refs.barUp.style.width = (total > 0 ? (summary.up / total) * 100 : 0) + '%';
            if (refs.barDown)
                refs.barDown.style.width = (total > 0 ? (summary.down / total) * 100 : 0) + '%';
            if (refs.barFlat)
                refs.barFlat.style.width = (total > 0 ? (summary.flat / total) * 100 : 0) + '%';
            if (refs.date) refs.date.textContent = date;

            const render = (items: { symbol: string; name: string; price: number; changePercent: number }[], type: string) =>
                items
                    .map(
                        (s, i) => `
                <a href="/stocks/${s.symbol}" class="flex items-center gap-4 px-6 py-4 hover:bg-accent/[0.04] transition-all group no-underline border-l-2 border-transparent ${type === 'up' ? 'hover:border-bullish' : type === 'down' ? 'hover:border-bearish' : 'hover:border-accent'}">
                    <span class="text-[8px] font-mono text-text-muted/50 w-3">${i + 1}</span>
                    <div class="min-w-0 flex-1"><div class="text-[11px] font-bold text-text-primary group-hover:text-accent truncate">${s.name}</div><div class="text-[8px] font-mono text-text-muted/70 uppercase mt-0.5">ENTITY:${s.symbol}</div></div>
                    <div class="text-right"><div class="text-[10px] font-mono text-text-secondary">${s.price.toFixed(2)}</div><div class="text-[10px] font-mono font-bold ${s.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}">${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%</div></div>
                </a>`
                    )
                    .join('');
            if (refs.gGrid) refs.gGrid.innerHTML = render(gainers, 'up');
            if (refs.lGrid) refs.lGrid.innerHTML = render(losers, 'down');
            if (refs.vGrid) refs.vGrid.innerHTML = render(volumeLeaders, 'vol');
        }
    });
}

document.addEventListener('astro:before-preparation', () => {
    cleanupSSE();
    dashboardRendered = false;
});

document.addEventListener('astro:page-load', () => {
    if (!getEl('hud-up')) return;
    if (dashboardRendered) return;
    dashboardRendered = true;
    setupDashboardSync();
});
