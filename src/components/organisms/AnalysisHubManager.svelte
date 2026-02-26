<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { getRecentViewed, addToRecentViewed } from '../../lib/user-account';

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

    onMount(async () => {
        try {
            const response = await fetch('/api/stocks/snapshot');
            allStocks = await response.json();

            // Initial data sets
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
            .slice(0, 8);
    }

    function selectStock(symbol: string) {
        addToRecentViewed(symbol);
        window.location.href = `/stocks/${symbol}`;
    }
</script>

<div class="space-y-12">
    <!-- SEARCH NEXUS -->
    <div class="relative max-w-2xl mx-auto w-full group animate-fade-up">
        <div
            class="absolute -inset-1 bg-gradient-to-r from-accent/20 to-transparent rounded-2xl blur opacity-25 group-focus-within:opacity-75 transition-opacity"
        ></div>
        <div
            class="relative bg-[#0a0c10] border border-white/10 rounded-2xl p-2 flex items-center gap-4 focus-within:border-accent/40 transition-colors"
        >
            <div class="w-12 h-12 flex items-center justify-center text-white/20">🔍</div>
            <input
                type="text"
                bind:value={searchQuery}
                oninput={handleSearch}
                placeholder="INPUT_ENTITY_IDENTITY_OR_SYMBOL..."
                class="flex-1 bg-transparent border-none outline-none text-white font-black font-mono tracking-widest placeholder:text-white/10 uppercase"
            />
            <div class="pr-6 text-[8px] font-mono text-white/10 uppercase hidden md:block">
                Nexus_Indexing: ACTIVE
            </div>
        </div>

        <!-- SEARCH RESULTS DROPDOWN -->
        {#if matches.length > 0}
            <div
                class="absolute top-full left-0 w-full mt-4 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300"
            >
                <div class="p-2">
                    {#each matches as s}
                        <button
                            onclick={() => selectStock(s.symbol)}
                            class="w-full search-result-item flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.04] transition-all group"
                        >
                            <div class="flex items-center gap-4">
                                <span class="font-mono text-sm font-black text-accent"
                                    >{s.symbol}</span
                                >
                                <div class="flex flex-col text-left">
                                    <span
                                        class="text-[11px] font-black text-white/90 group-hover:text-accent transition-colors"
                                        >{s.name}</span
                                    >
                                    <span
                                        class="text-[8px] font-mono text-white/20 uppercase tracking-widest"
                                        >{s.sector || 'GENERAL'}</span
                                    >
                                </div>
                            </div>
                            <div class="flex items-center gap-6">
                                <div class="text-right">
                                    <div class="text-sm font-black font-mono text-white/70">
                                        {s.price?.toFixed(2) || '—'}
                                    </div>
                                    <div
                                        class="text-[9px] font-black font-mono {s.changePercent >= 0
                                            ? 'text-bullish'
                                            : 'text-bearish'}"
                                    >
                                        {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(
                                            2
                                        )}%
                                    </div>
                                </div>
                                <div
                                    class="w-4 h-4 text-white/20 group-hover:text-accent group-hover:translate-x-1 transition-all"
                                >
                                    →
                                </div>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <!-- MATRICES -->
    <div
        class="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-up"
        style="animation-delay: 200ms"
    >
        <!-- RECENT ANALYSES -->
        <div class="glass-card overflow-hidden border-t-2 border-t-accent/20">
            <header
                class="px-8 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between"
            >
                <span
                    class="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.2em]"
                    >Recently Viewed</span
                >
            </header>
            <div class="p-6 space-y-3">
                {#if recentStocks.length === 0 && !isLoading}
                    <div
                        class="flex flex-col items-center justify-center py-12 text-center opacity-20"
                    >
                        <div class="text-3xl mb-4">⏲️</div>
                        <span class="text-[9px] font-mono uppercase tracking-[0.2em]"
                            >Registry_Empty</span
                        >
                    </div>
                {:else}
                    {#each recentStocks as s}
                        <a
                            href="/stocks/{s.symbol}"
                            class="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.04] transition-all border border-white/5 hover:border-accent/20 group no-underline"
                        >
                            <div class="flex items-center gap-4">
                                <span
                                    class="text-[10px] font-mono font-black border border-white/10 px-2 py-1 rounded bg-black/40 text-accent"
                                    >{s.symbol}</span
                                >
                                <span
                                    class="text-[11px] font-black text-white/70 group-hover:text-white transition-colors uppercase"
                                    >{s.name}</span
                                >
                            </div>
                            <div
                                class="w-4 h-4 text-white/10 group-hover:text-accent transition-all"
                            >
                                →
                            </div>
                        </a>
                    {/each}
                {/if}
            </div>
        </div>

        <!-- DIVIDEND INTELLIGENCE -->
        <div class="glass-card overflow-hidden border-t-2 border-t-warning/20">
            <header
                class="px-8 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between"
            >
                <span
                    class="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.2em]"
                    >Quantum Yield Wall</span
                >
            </header>
            <div class="p-0">
                <table class="w-full text-left">
                    <tbody class="divide-y divide-white/[0.03]">
                        {#each dividendStocks as s}
                            <tr
                                class="hover:bg-warning/[0.02] transition-colors cursor-pointer group"
                                onclick={() => (window.location.href = '/stocks/' + s.symbol)}
                            >
                                <td class="py-4 px-8">
                                    <div class="flex flex-col">
                                        <span
                                            class="text-[11px] font-black text-white/90 group-hover:text-warning transition-colors"
                                            >{s.name}</span
                                        >
                                        <span
                                            class="text-[8px] font-mono text-white/20 uppercase tracking-widest mt-0.5"
                                            >{s.symbol}</span
                                        >
                                    </div>
                                </td>
                                <td
                                    class="py-4 px-8 text-right font-mono text-[11px] font-black text-warning"
                                >
                                    {s.yield.toFixed(2)}%
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
