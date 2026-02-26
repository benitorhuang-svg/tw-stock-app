<script lang="ts">
    import { onMount } from 'svelte';
    import { getWatchlist } from '../../lib/user-account';

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

    onMount(async () => {
        watchlistSymbols = getWatchlist();
        try {
            const response = await fetch('/api/stocks/snapshot');
            allStocks = await response.json();

            // Filter watchlist
            stocks = watchlistSymbols
                .map(sym => allStocks.find(s => s.symbol === sym))
                .filter((s): s is WatchlistStock => !!s);

            // High yield intelligence
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

<div class="h-full flex flex-col gap-10">
    <!-- Watchlist Matrix -->
    {#if !isLoading && stocks.length === 0}
        <div class="glass-card p-12 text-center animate-fade-up border border-white/5">
            <div class="text-6xl mb-6 opacity-10">🔭</div>
            <h3 class="text-lg font-black text-white/40 uppercase tracking-widest">
                No Active Links Detected
            </h3>
            <p class="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] mt-2">
                Initialize tracking by selecting entities in the Analysis Terminal
            </p>
        </div>
    {:else if isLoading}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {#each Array(4) as _}
                <div class="h-32 bg-white/5 rounded-2xl border border-white/5"></div>
            {/each}
        </div>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up">
            {#each stocks as s}
                {@const isBull = s.changePercent >= 0}
                <a
                    href="/stocks/{s.symbol}"
                    class="glass-card relative p-6 hover:bg-white/[0.04] transition-all group no-underline overflow-hidden border border-white/5 hover:border-white/10"
                >
                    <div
                        class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent {isBull
                            ? 'via-bullish/40'
                            : 'via-bearish/40'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                    ></div>
                    <div class="flex items-start justify-between mb-4">
                        <div class="min-w-0">
                            <div
                                class="text-sm font-black text-white group-hover:text-accent transition-colors truncate"
                            >
                                {s.name}
                            </div>
                            <div
                                class="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-0.5"
                            >
                                {s.symbol}
                            </div>
                        </div>
                        <div
                            class="px-2 py-0.5 rounded text-[9px] font-black font-mono {isBull
                                ? 'bg-bullish/10 text-bullish'
                                : 'bg-bearish/10 text-bearish'}"
                        >
                            {isBull ? '+' : ''}{s.changePercent.toFixed(2)}%
                        </div>
                    </div>
                    <div class="text-2xl font-mono font-black text-white/90 tracking-tighter mb-4">
                        {s.price.toFixed(2)}
                    </div>
                    <div
                        class="flex items-center justify-between pt-4 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity"
                    >
                        <span class="text-[8px] font-mono uppercase tracking-widest"
                            >Core_Probe</span
                        >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-4 h-4 text-accent"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="3"
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                            /></svg
                        >
                    </div>
                </a>
            {/each}
        </div>
    {/if}

    <!-- High Yield Intelligence Section -->
    <div class="space-y-6">
        <header class="flex items-center gap-4">
            <div class="w-10 h-[1px] bg-warning/50"></div>
            <h2 class="text-xs font-mono font-black text-warning uppercase tracking-[0.3em]">
                Quantum Yield Wall
            </h2>
            <div class="flex-1 h-[1px] bg-white/5"></div>
        </header>

        <div class="glass-card overflow-hidden animate-fade-up border-t border-warning/20">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr
                            class="bg-warning/[0.02] text-[9px] uppercase text-warning/40 font-black tracking-widest"
                        >
                            <th class="py-4 px-8 border-b border-white/5">Entity</th>
                            <th class="py-4 px-8 border-b border-white/5 text-right"
                                >Dividend Yield</th
                            >
                            <th class="py-4 px-8 border-b border-white/5 text-right"
                                >Price Vector</th
                            >
                            <th class="py-4 px-8 border-b border-white/5 text-right">P/E Domain</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/[0.02]">
                        {#each highYield as s}
                            <tr
                                class="hover:bg-warning/[0.02] transition-colors cursor-pointer group"
                                onclick={() => (window.location.href = '/stocks/' + s.symbol)}
                            >
                                <td class="py-5 px-8">
                                    <div class="flex flex-col">
                                        <span
                                            class="text-[11px] font-black text-white/90 group-hover:text-warning transition-colors"
                                            >{s.name}</span
                                        >
                                        <span
                                            class="text-[9px] font-mono text-white/20 uppercase tracking-widest mt-0.5"
                                            >{s.symbol}</span
                                        >
                                    </div>
                                </td>
                                <td
                                    class="py-5 px-8 text-right font-mono text-xs font-black text-warning"
                                >
                                    {s.yield.toFixed(2)}%
                                </td>
                                <td
                                    class="py-5 px-8 text-right font-mono text-xs font-bold text-white/50"
                                >
                                    {s.price.toFixed(2)}
                                </td>
                                <td
                                    class="py-5 px-8 text-right font-mono text-[10px] text-white/30 tracking-widest uppercase"
                                >
                                    {s.pe.toFixed(1)} / {s.pb.toFixed(2)}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
