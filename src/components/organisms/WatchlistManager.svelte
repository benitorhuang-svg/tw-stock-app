<script lang="ts">
    import { onMount } from 'svelte';
    import { getWatchlist } from '../../lib/user-account';
    import QuickNav from '../molecules/QuickNav.svelte';
    import AnalysisAccordion from '../organisms/AnalysisAccordion.svelte';

    interface WatchlistStock {
        symbol: string;
        name: string;
        price: number;
        changePercent: number;
        yield: number;
        pe: number;
        pb: number;
    }

    let watchlistSymbols: string[] = [];
    let allStocks: WatchlistStock[] = [];
    let stocks: WatchlistStock[] = $state([]);
    let highYield: WatchlistStock[] = $state([]);
    let isLoading = $state(true);

    // ─── Accordion State ─────────────────────────────────
    let expandedSections = $state<Record<string, boolean>>({
        guide: true,
        watchlist: false,
        yield: false,
    });

    function toggleSection(key: string) {
        expandedSections[key] = !expandedSections[key];
    }

    function scrollToSection(key: string) {
        if (expandedSections[key]) {
            expandedSections[key] = false;
        } else {
            expandedSections[key] = true;
            setTimeout(() => {
                const el = document.getElementById(`section-${key}`);
                const scrollContainer = document.getElementById('main-workspace');
                if (el && scrollContainer) {
                    const elRect = el.getBoundingClientRect();
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const scrollOffset = elRect.top - containerRect.top - 80;
                    scrollContainer.scrollBy({ top: scrollOffset, behavior: 'smooth' });
                }
            }, 350);
        }
    }

    const navItems = [
        { id: 'guide', label: '功能說明', icon: '📖' },
        { id: 'watchlist', label: '追蹤矩陣', icon: '🎯' },
        { id: 'yield', label: '高殖利率', icon: '💰' },
    ];

    onMount(async () => {
        watchlistSymbols = getWatchlist();
        try {
            const response = await fetch('/api/stocks/snapshot');
            allStocks = await response.json();

            stocks = watchlistSymbols
                .map(sym => allStocks.find(s => s.symbol === sym))
                .filter((s): s is WatchlistStock => !!s);

            highYield = allStocks
                .filter(s => s.yield > 0 && s.pe > 0 && s.price > 0)
                .sort((a, b) => b.yield - a.yield)
                .slice(0, 10);

            isLoading = false;
        } catch (err) {
            console.error('[Registry Engine] Data load failure:', err);
            isLoading = false;
        }
    });
</script>

<div class="flex flex-col lg:flex-row gap-4 items-start relative pb-10 pt-4">
    <!-- ═══ LEFT SIDEBAR ═══ -->
    <aside class="w-64 bg-base-deep/80 backdrop-blur-md border-r border-border flex flex-col z-20 shrink-0 sticky top-4 h-[calc(100vh-2rem)] rounded-xl overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div class="px-5 py-6 flex flex-col gap-4 relative border-b border-border/50">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                </div>
                <div class="flex flex-col">
                    <span class="text-[11px] font-black text-text-primary/80 tracking-wide uppercase">自選清單</span>
                    <span class="text-[9px] font-mono text-text-muted/40 tracking-wider">
                        {stocks.length} 檔追蹤中
                    </span>
                </div>
            </div>

            <!-- Mini Summary -->
            <div class="flex flex-col gap-2 mt-2">
                {#if stocks.length > 0}
                    {@const bullCount = stocks.filter(s => s.changePercent >= 0).length}
                    {@const bearCount = stocks.filter(s => s.changePercent < 0).length}
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-mono text-text-muted/40 uppercase">上漲</span>
                        <span class="text-[10px] font-black font-mono text-bullish">{bullCount}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-mono text-text-muted/40 uppercase">下跌</span>
                        <span class="text-[10px] font-black font-mono text-bearish">{bearCount}</span>
                    </div>
                {:else}
                    <div class="text-[9px] font-mono text-text-muted/40">尚無追蹤標的</div>
                {/if}
            </div>
        </div>

        <!-- Navigation -->
        <div class="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <QuickNav onNavigate={scrollToSection} activeStates={expandedSections} {navItems} />
        </div>

        <div class="p-5 mt-auto border-t border-border/50 bg-accent/5">
            <div class="flex items-center gap-2 mb-2">
                <div class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                <span class="text-[10px] font-bold text-accent uppercase tracking-wider">Registry status</span>
            </div>
            <p class="text-[9px] text-text-muted leading-relaxed font-mono">SYNCHRONIZED</p>
        </div>
    </aside>

    <!-- ═══ RIGHT MAIN AREA ═══ -->
    <main class="flex-1 space-y-4 animate-fade-right min-w-0">
        <!-- ⓪ 功能說明 -->
        <AnalysisAccordion id="guide" icon="📖" title="功能說明 ( FEATURE GUIDE )" isOpen={expandedSections.guide} onToggle={() => toggleSection('guide')}>
            <div class="glass-card bg-base-deep/30 px-5 py-4 shadow-elevated rounded-xl border border-border/10">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {#each [
                        { icon: '🎯', title: '追蹤矩陣', desc: '您加入自選清單的個股即時價格、漲跌幅概覽。點擊個股卡片可進入深度分析頁面。' },
                        { icon: '💰', title: '高殖利率', desc: '全市場殖利率 Top 10 排行，包含即時價格、本益比、股價淨值比等關鍵指標。' },
                        { icon: '📌', title: '如何加入', desc: '在個股分析頁面點擊「加入自選」即可追蹤，清單自動同步至此頁面。' },
                    ] as item}
                        <div class="flex gap-3 p-3 rounded-lg bg-surface/20 border border-border/5">
                            <span class="text-lg shrink-0">{item.icon}</span>
                            <div>
                                <h4 class="text-[11px] font-bold text-text-primary">{item.title}</h4>
                                <p class="text-[10px] text-text-muted leading-relaxed mt-1">{item.desc}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </AnalysisAccordion>

        <!-- ① 追蹤矩陣 -->
        <AnalysisAccordion id="watchlist" icon="🎯" title="追蹤矩陣 ( WATCHLIST MATRIX )" isOpen={expandedSections.watchlist} onToggle={() => toggleSection('watchlist')}>
            {#if !isLoading && stocks.length === 0}
                <div class="glass-card p-12 text-center border border-border/50">
                    <h3 class="text-xs font-mono font-black text-text-muted/70 uppercase tracking-[0.3em]">無追蹤標的 / NO_ACTIVE_LINKS</h3>
                    <p class="text-[10px] font-mono text-text-muted/50 uppercase tracking-[0.3em] mt-2">Initialize tracking by selecting entities in the Analysis Terminal</p>
                </div>
            {:else if isLoading}
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {#each Array(3) as _}
                        <div class="h-32 bg-surface-hover rounded-2xl border border-border/50"></div>
                    {/each}
                </div>
            {:else}
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {#each stocks as s}
                        {@const isBull = s.changePercent >= 0}
                        <a href="/stocks/{s.symbol}" class="glass-card relative p-6 hover:bg-surface-hover transition-all group no-underline overflow-hidden border border-border/50 hover:border-border">
                            <div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent {isBull ? 'via-bullish/40' : 'via-bearish/40'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div class="flex items-start justify-between mb-4">
                                <div class="min-w-0">
                                    <div class="text-sm font-black text-text-primary group-hover:text-accent transition-colors truncate">{s.name}</div>
                                    <div class="text-[10px] font-mono text-text-muted/70 uppercase tracking-widest mt-0.5">{s.symbol}</div>
                                </div>
                                <div class="px-2 py-0.5 rounded text-[9px] font-black font-mono {isBull ? 'bg-bullish/10 text-bullish' : 'bg-bearish/10 text-bearish'}">
                                    {isBull ? '+' : ''}{s.changePercent.toFixed(2)}%
                                </div>
                            </div>
                            <div class="text-2xl font-mono font-black text-text-primary tracking-tighter mb-4">{s.price.toFixed(2)}</div>
                            <div class="flex items-center justify-between pt-4 border-t border-border/50 opacity-40 group-hover:opacity-100 transition-opacity">
                                <span class="text-[8px] font-mono uppercase tracking-widest">Core_Probe</span>
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                            </div>
                        </a>
                    {/each}
                </div>
            {/if}
        </AnalysisAccordion>

        <!-- ② 高殖利率監控 -->
        <AnalysisAccordion id="yield" icon="💰" title="高殖利率監控 ( YIELD QUANTUM )" isOpen={expandedSections.yield} onToggle={() => toggleSection('yield')}>
            <div class="glass-card overflow-hidden border-t border-warning/20">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-warning/[0.02] text-[9px] uppercase text-warning/40 font-black tracking-widest">
                                <th class="py-4 px-8 border-b border-border/50">Symbol</th>
                                <th class="py-4 px-8 border-b border-border/50 text-right">Yield %</th>
                                <th class="py-4 px-8 border-b border-border/50 text-right">Price</th>
                                <th class="py-4 px-8 border-b border-border/50 text-right">P/E / P/B</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/[0.02]">
                            {#each highYield as s}
                                <tr class="hover:bg-warning/[0.02] transition-colors cursor-pointer group" onclick={() => (window.location.href = '/stocks/' + s.symbol)}>
                                    <td class="py-5 px-8">
                                        <div class="flex flex-col">
                                            <span class="text-[11px] font-black text-text-primary group-hover:text-warning transition-colors">{s.name}</span>
                                            <span class="text-[9px] font-mono text-text-muted/50 uppercase tracking-widest mt-0.5">{s.symbol}</span>
                                        </div>
                                    </td>
                                    <td class="py-5 px-8 text-right font-mono text-xs font-black text-warning">{s.yield.toFixed(2)}%</td>
                                    <td class="py-5 px-8 text-right font-mono text-xs font-bold text-text-muted">{s.price.toFixed(2)}</td>
                                    <td class="py-5 px-8 text-right font-mono text-[10px] text-text-muted/70 tracking-widest uppercase">{s.pe.toFixed(1)} / {s.pb.toFixed(2)}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        </AnalysisAccordion>
    </main>
</div>
