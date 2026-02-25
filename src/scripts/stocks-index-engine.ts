/**
 * Core Engine for index.astro
 */
import { addToRecentViewed, getRecentViewed } from '../lib/user-account';

interface StockSnapshot {
    symbol: string;
    name: string;
    sector?: string;
    price: number;
    changePercent: number;
    yield: number;
}

// ═══ Forensic Intelligence Engine ═══
async function initIntelligenceCenter() {
    const input = document.getElementById('analysis-hub-search') as HTMLInputElement | null;
    const results = document.getElementById('search-results');
    const container = document.getElementById('results-container');
    const recentContainer = document.getElementById('recent-analyses');
    const divWall = document.getElementById('dividend-wall');

    if (!input || !results || !container) return;

    // Load Data via API
    let allStocks: StockSnapshot[] = [];
    try {
        const response = await fetch('/api/stocks/snapshot');
        allStocks = await response.json();
    } catch (e) {
        console.error('[CORE_NEXUS] Data establishment failed:', e);
    }

    // 1. Unified Search Pipeline
    input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        if (q.length < 1) {
            results.classList.add('hidden');
            return;
        }

        const matches = allStocks
            .filter((s) => s.symbol.includes(q) || s.name.toLowerCase().includes(q))
            .slice(0, 10);

        if (matches.length > 0) {
            container.innerHTML = matches
                .map(
                    (s) => `
                <a href="/stocks/${s.symbol}" class="search-result-item" onclick="window.Nexus_Store_Recent('${s.symbol}')">
                            <div class="flex items-center gap-4">
                                <span class="font-mono text-sm font-black text-accent">${s.symbol}</span>
                                <div class="flex flex-col">
                                    <span class="text-[11px] font-black text-white/90 group-hover:text-accent transition-colors">${s.name}</span>
                                    <span class="text-[8px] font-mono text-white/20 uppercase tracking-widest">${s.sector || 'GENERAL'}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-6">
                                <div class="text-right">
                                    <div class="text-sm font-black font-mono text-white/70">${s.price.toFixed(2)}</div>
                                    <div class="text-[9px] font-black font-mono ${s.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}">
                                        ${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%
                                    </div>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white/20 group-hover:text-accent group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </a>
                    `
                )
                .join('');
            results.classList.remove('hidden');
        } else {
            container.innerHTML =
                '<div class="py-12 text-center text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">Signal_Not_Detected_In_Nexus</div>';
            results.classList.remove('hidden');
        }
    });

    // 2. Recent Registry Engine
    const updateRecentRegistry = () => {
        if (!recentContainer) return;
        const recent = getRecentViewed();
        if (recent.length === 0) {
            recentContainer.innerHTML =
                '<div class="flex flex-col items-center justify-center py-12 text-center opacity-20"><div class="text-3xl mb-4">⏲️</div><span class="text-[9px] font-mono uppercase tracking-[0.2em]">Registry_Empty</span></div>';
            return;
        }

        const recentStocks = recent
            .map((sym) => allStocks.find((s) => s.symbol === sym))
            .filter((s): s is StockSnapshot => !!s);
        recentContainer.innerHTML = recentStocks
            .map(
                (s) => `
                    <a href="/stocks/${s.symbol}" class="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.04] transition-all border border-white/5 hover:border-accent/20 group no-underline">
                        <div class="flex items-center gap-4">
                            <span class="text-[10px] font-mono font-black border border-white/10 px-2 py-1 rounded bg-black/40 text-accent">${s.symbol}</span>
                            <span class="text-[11px] font-black text-white/70 group-hover:text-white transition-colors uppercase">${s.name}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-[10px] font-mono font-black text-white/40">${s.price.toFixed(2)}</span>
                            <div class="w-1 h-1 rounded-full ${s.changePercent >= 0 ? 'bg-bullish' : 'bg-bearish'}"></div>
                        </div>
                    </a>
                `
            )
            .join('');
    };

    // 3. Yield Intelligence Wall
    const initYieldWall = () => {
        if (!divWall || allStocks.length === 0) return;
        const topYields = [...allStocks]
            .filter((s) => s.yield > 0)
            .sort((a, b) => b.yield - a.yield)
            .slice(0, 8);

        divWall.innerHTML = topYields
            .map(
                (s) => `
                    <a href="/stocks/${s.symbol}" class="flex items-center justify-between p-4 rounded-xl hover:bg-warning/[0.03] transition-all border border-white/5 hover:border-warning/20 group no-underline">
                        <div class="flex items-center gap-4">
                            <span class="text-[9px] font-mono font-black text-warning/40 tracking-widest">${s.symbol}</span>
                            <span class="text-[11px] font-black text-white/70 group-hover:text-warning transition-colors uppercase">${s.name}</span>
                        </div>
                        <div class="flex items-center gap-6">
                            <span class="text-[11px] font-mono font-black text-warning">${s.yield.toFixed(2)}%</span>
                            <div class="w-12 h-[3px] bg-black/40 rounded-full overflow-hidden">
                                <div class="bg-warning h-full" style="width: ${Math.min(s.yield * 10, 100)}%"></div>
                            </div>
                        </div>
                    </a>
                `
            )
            .join('');
    };

    (window as unknown as Record<string, (s: string) => void>).Nexus_Store_Recent = (sym: string) => {
        addToRecentViewed(sym);
        updateRecentRegistry();
    };

    document.getElementById('clear-recent')?.addEventListener('click', () => {
        localStorage.removeItem('tw-stock-recent'); // Assuming this is how it's stored in lib
        updateRecentRegistry();
    });

    // Global Click Outside handler
    document.addEventListener('click', e => {
        if (!input.contains(e.target as Node) && !results.contains(e.target as Node))
            results.classList.add('hidden');
    });

    updateRecentRegistry();
    initYieldWall();
}

document.addEventListener('astro:page-load', initIntelligenceCenter);
