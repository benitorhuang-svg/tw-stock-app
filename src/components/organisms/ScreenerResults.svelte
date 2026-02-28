<script lang="ts">
    import { onMount } from 'svelte';

    interface ScreenerApiResult {
        symbol: string;
        name: string;
        price: number;
        changePercent: number;
        volume: number;
        fundamentals: {
            pe: number | null;
            pb: number | null;
            dividendYield: number | null;
            revenueYoY: number | null;
        };
    }

    let results: ScreenerApiResult[] = $state([]);
    let isLoading = $state(false);
    let hasSearched = $state(false);

    onMount(() => {
        const listener = (e: any) => {
            const { type, payload } = e.detail;
            if (type === 'SCREENER_DATA') {
                results = payload.results;
                isLoading = false;
                hasSearched = true;
            } else if (type === 'SCREENER_LOADING') {
                isLoading = true;
                results = []; // Nuke dom immediately for max GC performance
            }
        };

        window.addEventListener('tw-screener-update', listener);
        return () => window.removeEventListener('tw-screener-update', listener);
    });

    function fmtVol(v: number) {
        if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
        return v.toString();
    }

    function navigateToStock(symbol: string) {
        window.location.href = '/stocks/' + symbol;
    }
</script>

<div class="overflow-x-auto min-h-[400px] relative">
    {#if isLoading}
        <div
            class="absolute top-20 left-1/2 -translate-x-1/2 flex items-center justify-center z-50"
        >
            <div
                class="flex items-center gap-3 bg-surface border border-accent/20 px-6 py-4 rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.1)]"
            >
                <div
                    class="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"
                ></div>
                <span class="text-accent font-mono text-[10px] tracking-widest uppercase"
                    >Intercepting_Signals...</span
                >
            </div>
        </div>
    {/if}

    <table class="w-full text-left border-separate border-spacing-0" style="table-layout: fixed;">
        <thead class="sticky top-0 bg-surface/95 backdrop-blur-md z-20">
            <tr
                class="bg-surface-hover/10 text-[9px] uppercase text-text-muted font-black tracking-widest"
            >
                <th class="py-4 px-8 border-b border-border/10 w-[25%]">Entity</th>
                <th class="py-4 px-8 border-b border-border/10 text-right w-[15%]">Quote</th>
                <th class="py-4 px-8 border-b border-border/10 text-right w-[15%]">Variance</th>
                <th class="py-4 px-8 border-b border-border/10 text-right w-[15%]">Volume</th>
                <th class="py-4 px-8 border-b border-border/10 text-right w-[15%]">PE_Domain</th>
                <th class="py-4 px-8 border-b border-border/10 text-right w-[15%]">Forensic</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-border/10">
            {#if hasSearched && results.length === 0 && !isLoading}
                <tr>
                    <td colspan="6">
                        <div
                            class="py-32 text-center text-text-muted font-mono text-xs tracking-widest uppercase"
                        >
                            No entities match the current vectors
                        </div>
                    </td>
                </tr>
            {:else}
                {#each results as s}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <tr
                        class="hover:bg-accent/[0.04] transition-all group cursor-pointer border-b border-border/10"
                        onclick={() => navigateToStock(s.symbol)}
                    >
                        <td class="py-5 px-8">
                            <div class="min-w-0">
                                <div
                                    class="text-[13px] font-bold text-text-primary group-hover:text-accent transition-colors"
                                >
                                    {s.name}
                                </div>
                                <div class="text-[10px] text-text-muted mt-1 line-clamp-1">
                                    {s.category || 'Quantitative Vector'}
                                </div>
                            </div>
                        </td>
                        <td
                            class="py-5 px-8 text-right font-mono text-xs font-bold text-text-secondary"
                            >{s.price.toFixed(2)}</td
                        >
                        <td
                            class="py-5 px-8 text-right font-mono text-xs font-black {s.changePercent >=
                            0
                                ? 'text-bullish'
                                : 'text-bearish'}"
                        >
                            {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                        </td>
                        <td
                            class="py-5 px-8 text-right font-mono text-[11px] text-text-muted font-bold"
                            >{fmtVol(s.volume)}</td
                        >
                        <td class="py-5 px-8 text-right font-mono text-xs text-text-muted"
                            >{s.fundamentals.pe ? s.fundamentals.pe.toFixed(1) : '—'}</td
                        >
                        <td class="py-5 px-8 text-right">
                            <div
                                class="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity"
                            >
                                {#if (s.fundamentals.dividendYield || 0) > 5}<div
                                        class="w-2 h-2 rounded-full bg-bullish shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                                        title="High Yield"
                                    ></div>{/if}
                                {#if (s.fundamentals.pe || 100) < 15}<div
                                        class="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                                        title="Value Focus"
                                    ></div>{/if}
                                {#if (s.fundamentals.revenueYoY || 0) > 10}<div
                                        class="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                                        title="Growth Vector"
                                    ></div>{/if}
                            </div>
                        </td>
                    </tr>
                {/each}
            {/if}
        </tbody>
    </table>
</div>
