<script lang="ts">
    import { onMount } from 'svelte';
    import { getRecentViewed, addToRecentViewed } from '../../lib/user-account';
    import AnalysisAccordion from './AnalysisAccordion.svelte';
    import QuickNav from '../molecules/QuickNav.svelte';
    import ForensicTrendChart from './ForensicTrendChart.svelte';

    interface StockSnapshot {
        symbol: string;
        name: string;
        sector?: string;
        price: number;
        changePercent: number;
        yield: number;
    }

    let allStocks: StockSnapshot[] = [];
    let searchQuery = $state('');
    let matches: StockSnapshot[] = $state([]);
    let recentStocks: StockSnapshot[] = $state([]);
    let dividendStocks: StockSnapshot[] = $state([]);
    let isLoading = $state(true);

    let expandedSections = $state<Record<string, boolean>>({
        search: true,
        recent: true,
        dividend: false,
    });

    let expandedStocks = $state<Record<string, boolean>>({});

    onMount(async () => {
        try {
            const response = await fetch('/api/stocks/snapshot');
            allStocks = await response.json();

            updateRecent();
            dividendStocks = allStocks
                .filter(s => s.yield > 0)
                .sort((a, b) => b.yield - a.yield)
                .slice(0, 5);

            isLoading = false;
        } catch (e) {
            console.error('[CORE_NEXUS] Data establishment failed:', e);
            isLoading = false;
        }
    });

    function updateRecent() {
        const recent = getRecentViewed();
        recentStocks = recent
            .map(sym => allStocks.find(s => s.symbol === sym))
            .filter((s): s is StockSnapshot => !!s);
    }

    function handleSearch() {
        if (searchQuery.length < 1) {
            matches = [];
            return;
        }
        const q = searchQuery.toLowerCase();
        matches = allStocks
            .filter(s => s.symbol.includes(q) || s.name.toLowerCase().includes(q))
            .slice(0, 10);
        expandedSections.search = true;
    }

    function toggleSection(key: string) {
        expandedSections[key] = !expandedSections[key];
    }

    function toggleStock(symbol: string) {
        expandedStocks[symbol] = !expandedStocks[symbol];
    }

    function selectStock(symbol: string) {
        addToRecentViewed(symbol);
        window.location.href = `/stocks/${symbol}`;
    }

    function scrollToSection(key: string) {
        expandedSections[key] = true;
        setTimeout(() => {
            const el = document.getElementById(`section-${key}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
</script>

<div class="flex flex-col lg:flex-row gap-6 items-start relative pb-20">
    <!-- LEFT SIDEBAR -->
    <aside
        class="w-full lg:w-64 bg-base-deep/80 backdrop-blur-xl border border-white/5 flex flex-col z-20 shrink-0 sticky top-0 lg:h-[calc(100vh-8rem)] rounded-2xl overflow-hidden shadow-2xl"
    >
        <div class="p-4 border-b border-white/5 bg-white/[0.02]">
            <div class="relative group">
                <div
                    class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-white/20 group-focus-within:text-accent transition-colors"
                >
                    🔍
                </div>
                <input
                    type="text"
                    bind:value={searchQuery}
                    oninput={handleSearch}
                    placeholder="搜尋代號/名稱..."
                    class="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-accent/40 transition-all"
                />
            </div>
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            <button
                onclick={() => scrollToSection('search')}
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.05] transition-all text-left group"
            >
                <span
                    class="text-sm opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all"
                    >🔍</span
                >
                <span
                    class="text-[11px] font-black tracking-widest uppercase text-white/40 group-hover:text-white"
                    >搜尋結果</span
                >
            </button>
            <button
                onclick={() => scrollToSection('recent')}
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.05] transition-all text-left group"
            >
                <span
                    class="text-sm opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all"
                    >⏲️</span
                >
                <span
                    class="text-[11px] font-black tracking-widest uppercase text-white/40 group-hover:text-white"
                    >最近觀看</span
                >
            </button>
            <button
                onclick={() => scrollToSection('dividend')}
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.05] transition-all text-left group"
            >
                <span
                    class="text-sm opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all"
                    >💎</span
                >
                <span
                    class="text-[11px] font-black tracking-widest uppercase text-white/40 group-hover:text-white"
                    >高殖利率</span
                >
            </button>
        </div>

        <div class="p-4 border-t border-white/5 bg-white/[0.01]">
            <div class="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1">
                Status
            </div>
            <div class="flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                <span class="text-[9px] font-black text-white/60">NEXUS_UPLINK_OK</span>
            </div>
        </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="flex-1 space-y-6 w-full min-w-0 animate-fade-right">
        <!-- SEARCH RESULTS -->
        {#if searchQuery.length > 0}
            <AnalysisAccordion
                id="search"
                icon="🔍"
                title="搜尋結果 ( SEARCH_RESULTS )"
                isOpen={expandedSections.search}
                onToggle={() => toggleSection('search')}
            >
                <div class="grid grid-cols-1 gap-3">
                    {#each matches as s}
                        <div
                            class="glass-card border-white/5 hover:border-accent/20 transition-all"
                        >
                            <button
                                onclick={() => toggleStock(s.symbol)}
                                class="w-full flex items-center justify-between p-4 group"
                            >
                                <div class="flex items-center gap-4">
                                    <span class="font-mono text-sm font-black text-accent"
                                        >{s.symbol}</span
                                    >
                                    <span
                                        class="text-[13px] font-black text-white/90 group-hover:text-accent transition-colors"
                                        >{s.name}</span
                                    >
                                    <span
                                        class="text-[10px] font-mono text-white/20 uppercase tracking-widest hidden md:block"
                                        >{s.sector || 'GENERAL'}</span
                                    >
                                </div>
                                <div class="flex items-center gap-6">
                                    <div class="text-right">
                                        <div class="text-[13px] font-black font-mono text-white/80">
                                            {s.price?.toFixed(2) || '—'}
                                        </div>
                                        <div
                                            class="text-[10px] font-black font-mono {s.changePercent >=
                                            0
                                                ? 'text-bullish'
                                                : 'text-bearish'}"
                                        >
                                            {s.changePercent >= 0
                                                ? '+'
                                                : ''}{s.changePercent.toFixed(2)}%
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="text-white/20 group-hover:text-accent transition-transform {expandedStocks[
                                                s.symbol
                                            ]
                                                ? 'rotate-90'
                                                : ''}"
                                        >
                                            →
                                        </div>
                                    </div>
                                </div>
                            </button>
                            {#if expandedStocks[s.symbol]}
                                <div class="p-4 border-t border-white/5 animate-fade-in">
                                    <div class="mb-4 flex justify-end">
                                        <a
                                            href="/stocks/{s.symbol}"
                                            class="text-[10px] font-black text-accent hover:underline uppercase tracking-widest"
                                            >查看詳細分析 →</a
                                        >
                                    </div>
                                    <ForensicTrendChart symbol={s.symbol} price={s.price} />
                                </div>
                            {/if}
                        </div>
                    {/each}
                    {#if matches.length === 0}
                        <div class="p-12 text-center opacity-20">
                            <span class="text-xs font-mono uppercase tracking-widest">無匹配項</span
                            >
                        </div>
                    {/if}
                </div>
            </AnalysisAccordion>
        {/if}

        <!-- RECENT ANALYSES -->
        <AnalysisAccordion
            id="recent"
            icon="⏲️"
            title="最近觀看 ( RECENT_VIEWED )"
            isOpen={expandedSections.recent}
            onToggle={() => toggleSection('recent')}
        >
            <div class="grid grid-cols-1 gap-3">
                {#if recentStocks.length === 0 && !isLoading}
                    <div class="p-12 text-center opacity-20 glass-card">
                        <span class="text-xs font-mono uppercase tracking-widest">無觀看記錄</span>
                    </div>
                {:else}
                    {#each recentStocks as s}
                        <div
                            class="glass-card border-white/5 hover:border-accent/20 transition-all"
                        >
                            <button
                                onclick={() => toggleStock(s.symbol)}
                                class="w-full flex items-center justify-between p-4 group"
                            >
                                <div class="flex items-center gap-4">
                                    <span class="font-mono text-sm font-black text-accent"
                                        >{s.symbol}</span
                                    >
                                    <span
                                        class="text-[13px] font-black text-white/90 group-hover:text-accent transition-colors"
                                        >{s.name}</span
                                    >
                                </div>
                                <div class="flex items-center gap-6">
                                    <div class="text-right">
                                        <div class="text-[13px] font-black font-mono text-white/80">
                                            {s.price?.toFixed(2) || '—'}
                                        </div>
                                        <div
                                            class="text-[10px] font-black font-mono {s.changePercent >=
                                            0
                                                ? 'text-bullish'
                                                : 'text-bearish'}"
                                        >
                                            {s.changePercent >= 0
                                                ? '+'
                                                : ''}{s.changePercent.toFixed(2)}%
                                        </div>
                                    </div>
                                    <div
                                        class="text-white/20 group-hover:text-accent transition-transform {expandedStocks[
                                            s.symbol
                                        ]
                                            ? 'rotate-90'
                                            : ''}"
                                    >
                                        →
                                    </div>
                                </div>
                            </button>
                            {#if expandedStocks[s.symbol]}
                                <div class="p-4 border-t border-white/5 animate-fade-in">
                                    <div class="mb-4 flex justify-end">
                                        <a
                                            href="/stocks/{s.symbol}"
                                            class="text-[10px] font-black text-accent hover:underline uppercase tracking-widest"
                                            >查看詳細分析 →</a
                                        >
                                    </div>
                                    <ForensicTrendChart symbol={s.symbol} price={s.price} />
                                </div>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>
        </AnalysisAccordion>

        <!-- DIVIDEND INTELLIGENCE -->
        <AnalysisAccordion
            id="dividend"
            icon="💎"
            title="高殖利率 ( QUANTUM_YIELD )"
            isOpen={expandedSections.dividend}
            onToggle={() => toggleSection('dividend')}
        >
            <div class="grid grid-cols-1 gap-3">
                {#each dividendStocks as s}
                    <div class="glass-card border-white/5 hover:border-accent/20 transition-all">
                        <button
                            onclick={() => toggleStock(s.symbol)}
                            class="w-full flex items-center justify-between p-4 group"
                        >
                            <div class="flex items-center gap-4">
                                <span class="font-mono text-sm font-black text-accent"
                                    >{s.symbol}</span
                                >
                                <span
                                    class="text-[13px] font-black text-white/90 group-hover:text-accent transition-colors"
                                    >{s.name}</span
                                >
                                <span
                                    class="px-2 py-0.5 rounded bg-warning/10 text-warning text-[9px] font-black font-mono uppercase"
                                    >Yield: {s.yield.toFixed(2)}%</span
                                >
                            </div>
                            <div class="flex items-center gap-6">
                                <div class="text-right">
                                    <div class="text-[13px] font-black font-mono text-white/80">
                                        {s.price?.toFixed(2) || '—'}
                                    </div>
                                    <div
                                        class="text-[10px] font-black font-mono {s.changePercent >=
                                        0
                                            ? 'text-bullish'
                                            : 'text-bearish'}"
                                    >
                                        {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(
                                            2
                                        )}%
                                    </div>
                                </div>
                                <div
                                    class="text-white/20 group-hover:text-accent transition-transform {expandedStocks[
                                        s.symbol
                                    ]
                                        ? 'rotate-90'
                                        : ''}"
                                >
                                    →
                                </div>
                            </div>
                        </button>
                        {#if expandedStocks[s.symbol]}
                            <div class="p-4 border-t border-white/5 animate-fade-in">
                                <div class="mb-4 flex justify-end">
                                    <a
                                        href="/stocks/{s.symbol}"
                                        class="text-[10px] font-black text-accent hover:underline uppercase tracking-widest"
                                        >查看詳細分析 →</a
                                    >
                                </div>
                                <ForensicTrendChart symbol={s.symbol} price={s.price} />
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </AnalysisAccordion>
    </main>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.1);
    }
</style>
