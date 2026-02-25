/**
 * Core Dashboard Synchronizer Engine for index.astro
 * Performance-optimized: guarded init, SSE cleanup, cached DOM refs
 */

interface DashboardSummary {
    up: number;
    down: number;
    flat: number;
    totalVolume: number;
    avgChange: number;
}

interface DashboardStock {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    volume?: number;
}

interface SyncData {
    summary: DashboardSummary;
    gainers: DashboardStock[];
    losers: DashboardStock[];
    volumeLeaders: DashboardStock[];
}

// ═══ Client-Side Data Format Helpers ═══
function fmtVolClient(v: number): string {
    const cv = Math.ceil(v);
    if (cv >= 100000000) return (cv / 100000000).toFixed(1) + '億';
    if (cv >= 10000) return (cv / 10000).toFixed(1) + '萬';
    return cv > 0 ? cv.toLocaleString('zh-TW') : '—';
}

function fmtPriceClient(v: number): string {
    return v > 0 ? v.toFixed(2) : '—';
}

// ═══ SSE lifecycle management ═══
let activeSSE: EventSource | null = null;

function cleanupSSE() {
    if (activeSSE) {
        activeSSE.close();
        activeSSE = null;
    }
}

// ═══ Dashboard Synchronizer Engine ═══
function setupDashboardSync() {
    // Guard: only run on dashboard page
    const hudUp = document.getElementById('hud-up');
    if (!hudUp) return;

    // Cache all DOM refs once
    const domRefs = {
        ratioEl: document.getElementById('breadth-ratio-hud'),
        upEl: hudUp,
        downEl: document.getElementById('hud-down'),
        volEl: document.getElementById('hud-volume'),
        chgEl: document.getElementById('hud-avg-change'),
        dateEl: document.getElementById('hud-date'),
        barUp: document.getElementById('hud-bar-up'),
        barDown: document.getElementById('hud-bar-down'),
        barFlat: document.getElementById('hud-bar-flat'),
        gainersGrid: document.getElementById('hud-gainers-grid'),
        losersGrid: document.getElementById('hud-losers-grid'),
        volGrid: document.getElementById('hud-volume-grid'),
        datePicker: document.getElementById('market-date-picker-hud') as HTMLInputElement | null,
    };

    // Cleanup previous SSE if any
    cleanupSSE();

    if (typeof EventSource !== 'undefined') {
        activeSSE = new EventSource('/api/sse/stream');
        activeSSE.addEventListener('tick', e => {
            try {
                const ticks = JSON.parse(e.data);
                if (!ticks || !Array.isArray(ticks)) return;

                let up = 0,
                    down = 0,
                    flat = 0,
                    totalVol = 0,
                    totalPct = 0,
                    count = 0;
                let latestDate = '';

                for (const t of ticks) {
                    const price = parseFloat(t.Close || t.price || 0);
                    const chgPct = parseFloat(t.ChangePct || t.changePercent || 0);
                    const vol = parseFloat(t.Volume || t.volume || 0);
                    if (price > 0) {
                        if (chgPct > 0) up++;
                        else if (chgPct < 0) down++;
                        else flat++;
                        totalVol += vol;
                        totalPct += chgPct;
                        count++;
                        if (t.Date) latestDate = t.Date;
                    }
                }

                updateHUD(
                    domRefs,
                    up,
                    down,
                    flat,
                    totalVol,
                    count > 0 ? totalPct / count : 0,
                    latestDate
                );
            } catch (err) {
                console.error('[SSE Error]', err);
            }
        });
    }

    domRefs.datePicker?.addEventListener('change', async e => {
        const newDate = (e.target as HTMLInputElement).value;
        if (!newDate) return;
        try {
            const res = await fetch(`/api/market/history?date=${newDate}`);
            const data = await res.json();
            if (res.ok && !data.error) syncDashboardData(domRefs, data, newDate);
        } catch (err) {
            console.error('[Sync Error]', err);
        }
    });
}

function updateHUD(
    refs: Record<string, HTMLElement | null>,
    up: number,
    down: number,
    flat: number,
    vol: number,
    chg: number,
    date: string
) {
    const total = up + down + flat;

    if (refs.ratioEl) refs.ratioEl.textContent = down > 0 ? (up / down).toFixed(2) : 'MAX';
    if (refs.upEl) refs.upEl.textContent = String(up);
    if (refs.downEl) refs.downEl.textContent = String(down);
    if (refs.volEl) refs.volEl.textContent = fmtVolClient(vol);
    if (refs.chgEl) {
        refs.chgEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
        refs.chgEl.className = `text-xl font-mono font-bold ${chg >= 0 ? 'text-bullish' : 'text-bearish'}`;
    }
    if (refs.dateEl && date) refs.dateEl.textContent = date;

    if (refs.barUp) refs.barUp.style.width = (total > 0 ? (up / total) * 100 : 0) + '%';
    if (refs.barDown) refs.barDown.style.width = (total > 0 ? (down / total) * 100 : 0) + '%';
    if (refs.barFlat) refs.barFlat.style.width = (total > 0 ? (flat / total) * 100 : 0) + '%';
}

function syncDashboardData(refs: Record<string, HTMLElement | null>, data: SyncData, date: string) {
    const { summary, gainers, losers, volumeLeaders } = data;
    updateHUD(refs, summary.up, summary.down, summary.flat, summary.totalVolume, summary.avgChange, date);

    if (refs.gainersGrid)
        refs.gainersGrid.innerHTML = gainers
            .map((s, i) => renderRow(s, i, 'bullish'))
            .join('');
    if (refs.losersGrid)
        refs.losersGrid.innerHTML = losers
            .map((s, i) => renderRow(s, i, 'bearish'))
            .join('');
    if (refs.volGrid)
        refs.volGrid.innerHTML = volumeLeaders
            .map((s, i) => renderRow(s, i, 'accent'))
            .join('');
}

function renderRow(s: DashboardStock, i: number, variant: string): string {
    const isBull = variant === 'bullish';
    const color = isBull
        ? 'text-bullish'
        : variant === 'bearish'
            ? 'text-bearish'
            : 'text-accent';
    const hColor = isBull
        ? 'hover:border-bullish'
        : variant === 'bearish'
            ? 'hover:border-bearish'
            : 'hover:border-accent';
    const gColor = isBull
        ? 'group-hover:text-bullish'
        : variant === 'bearish'
            ? 'group-hover:text-bearish'
            : 'group-hover:text-accent';
    return `
        <a href="/stocks/${s.symbol}" class="flex items-center gap-4 px-6 py-4 hover:bg-accent/[0.04] transition-all group no-underline border-l-2 border-transparent ${hColor}">
            <span class="text-[8px] font-mono text-white/20 w-3">${i + 1}</span>
            <div class="min-w-0 flex-1">
                <div class="text-[11px] font-bold text-white/90 ${gColor} transition-colors truncate">${s.name}</div>
                <div class="text-[8px] font-mono text-white/30 uppercase mt-0.5">${variant === 'accent' ? s.symbol : 'ENTITY:' + s.symbol}</div>
            </div>
            <div class="text-right">
                <div class="text-[10px] font-mono font-bold text-white/70">${fmtPriceClient(s.price)}</div>
                <div class="text-[10px] font-mono font-bold ${color}">${isBull ? '+' : ''}${s.changePercent.toFixed(2)}%</div>
            </div>
        </a>`;
}

// Cleanup SSE on page navigation
document.addEventListener('astro:before-preparation', () => {
    cleanupSSE();
    const gainerGrid = document.getElementById('hud-gainers-grid');
    const loserGrid = document.getElementById('hud-losers-grid');
    const volGrid = document.getElementById('hud-volume-grid');
    if (gainerGrid) gainerGrid.innerHTML = '';
    if (loserGrid) loserGrid.innerHTML = '';
    if (volGrid) volGrid.innerHTML = '';
});

let dashboardRendered = false;
document.addEventListener('astro:page-load', () => {
    if (!document.getElementById('hud-up')) {
        dashboardRendered = false; // reset when leaving
        return;
    }
    if (dashboardRendered) return;
    dashboardRendered = true;
    setupDashboardSync();
});
