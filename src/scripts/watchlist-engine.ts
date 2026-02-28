/**
 * Core Engine for watchlist.astro
 */
import { getWatchlist } from '../lib/user-account';

interface WatchlistStock {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    yield: number;
    pe: number;
    pb: number;
}

// Shared data state
let allStocks: WatchlistStock[] = [];

async function loadStocksData(): Promise<WatchlistStock[]> {
    if (allStocks.length > 0) return allStocks;
    try {
        const response = await fetch('/api/stocks/snapshot');
        allStocks = await response.json();
        return allStocks;
    } catch (err) {
        console.error('[Registry Engine] Data load failure:', err);
        return [];
    }
}

// ═══ Forensic Registry Engine ═══
async function initRegistry() {
    const syms = getWatchlist();
    const emptyEl = document.getElementById('watchlist-empty');
    const listEl = document.getElementById('watchlist-list');
    const countBadge = document.getElementById('watchlist-count-badge');

    if (countBadge) countBadge.textContent = String(syms.length).padStart(2, '0');

    if (!syms || syms.length === 0) {
        emptyEl?.classList.remove('hidden');
        return;
    }

    try {
        const stocksData = await loadStocksData();
        const stocks = syms
            .map(sym => stocksData.find(s => s.symbol === sym))
            .filter((s): s is WatchlistStock => !!s);

        if (listEl) {
            listEl.innerHTML = stocks.map(s => renderRegistryCard(s)).join('');
        }
    } catch (err) {
        console.error('[Registry Engine] Uplink failure:', err);
    }
}

function renderRegistryCard(s: WatchlistStock) {
    const isBull = s.changePercent >= 0;
    return `
        <a href="/stocks/${s.symbol}" class="glass-card relative p-6 hover:bg-surface-hover transition-all group no-underline overflow-hidden border border-border/50 hover:border-border">
            <div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent ${isBull ? 'via-bullish/40' : 'via-bearish/40'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex items-start justify-between mb-4">
                <div class="min-w-0">
                    <div class="text-sm font-black text-text-primary group-hover:text-accent transition-colors truncate">${s.name}</div>
                    <div class="text-[10px] font-mono text-text-muted/70 uppercase tracking-widest mt-0.5">${s.symbol}</div>
                </div>
                <div class="px-2 py-0.5 rounded text-[9px] font-black font-mono ${isBull ? 'bg-bullish/10 text-bullish' : 'bg-bearish/10 text-bearish'}">
                    ${isBull ? '+' : ''}${s.changePercent.toFixed(2)}%
                </div>
            </div>
            <div class="text-2xl font-mono font-black text-text-primary tracking-tighter mb-4">${s.price.toFixed(2)}</div>
            <div class="flex items-center justify-between pt-4 border-t border-border/50 opacity-40 group-hover:opacity-100 transition-opacity">
                <span class="text-[8px] font-mono uppercase tracking-widest">Core_Probe</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </div>
        </a>`;
}

async function initIntelligence() {
    try {
        const stocksData = await loadStocksData();
        const highYield = stocksData
            .filter(s => s.yield > 0 && s.pe > 0 && s.price > 0)
            .sort((a, b) => b.yield - a.yield)
            .slice(0, 10);

        const body = document.getElementById('high-yield-body');
        if (body) {
            body.innerHTML = highYield
                .map(
                    s => `
                <tr class="hover:bg-warning/[0.02] transition-colors cursor-pointer group" onclick="window.location.href='/stocks/${s.symbol}'">
                    <td class="py-5 px-8">
                        <div class="flex flex-col">
                            <span class="text-[11px] font-black text-text-primary group-hover:text-warning transition-colors">${s.name}</span>
                            <span class="text-[9px] font-mono text-text-muted/50 uppercase tracking-widest mt-0.5">${s.symbol}</span>
                        </div>
                    </td>
                    <td class="text-right py-5 px-8 font-mono text-xs font-bold text-text-secondary">${s.price.toFixed(2)}</td>
                    <td class="text-right py-5 px-8 font-mono text-xs font-black ${s.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}">
                        ${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%
                    </td>
                    <td class="text-right py-5 px-8 font-mono text-sm font-black text-warning">${s.yield.toFixed(2)}%</td>
                    <td class="text-right py-5 px-8 font-mono text-xs text-text-muted">${s.pe.toFixed(1)}</td>
                    <td class="text-right py-5 px-8 font-mono text-xs text-text-muted">${s.pb.toFixed(2)}</td>
                </tr>
            `
                )
                .join('');
        }
    } catch (err) {
        console.error('[Intelligence Engine] Data fail:', err);
    }
}

let watchlistRendered = false;

document.addEventListener('astro:page-load', () => {
    // Guard: only run on watchlist page
    if (!document.getElementById('watchlist-list')) {
        watchlistRendered = false; // Reset to re-fetch on return
        return;
    }
    if (watchlistRendered) return;
    watchlistRendered = true;
    initRegistry();
    initIntelligence();
});
