<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';

    const summary = $derived(marketStore.state.institutional.summary);
    const date = $derived(marketStore.state.institutional.date);

    function formatValue(v: number) {
        const units = Math.round(v / 1000);
        return `${units > 0 ? '+' : ''}${units.toLocaleString()}K`;
    }

    function colorClass(v: number) {
        return v > 0 ? 'text-bullish' : v < 0 ? 'text-bearish' : 'text-text-muted';
    }

    $effect(() => {
        if (date) {
            const el = document.getElementById('inst-header-date');
            if (el) el.textContent = date;
        }
    });
</script>

<div
    class="flex flex-col border border-border rounded-xl bg-surface/40 overflow-hidden mb-6 shadow-elevated transition-all duration-500"
>
    <!-- Pulse HUD: Unified Sticky Navigation & Stats -->
    <div
        class="sticky top-0 z-[60] bg-surface border-b border-border flex flex-wrap items-center divide-x divide-border"
    >
        <!-- Section 1: Institutional Flow -->
        <div class="flex items-center gap-6 px-6 py-4 flex-1 min-w-fit">
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-black text-text-muted/40 uppercase tracking-[0.2em]"
                    >Institutional_Flow</span
                >
                <div class="flex items-center gap-6">
                    <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>
                        <span class="text-[10px] font-mono text-text-muted uppercase">Foreign:</span
                        >
                        <span class="text-xs font-black font-mono {colorClass(summary.foreign)}"
                            >{formatValue(summary.foreign)}</span
                        >
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-bullish"></span>
                        <span class="text-[10px] font-mono text-text-muted uppercase">Trust:</span>
                        <span class="text-xs font-black font-mono {colorClass(summary.invest)}"
                            >{formatValue(summary.invest)}</span
                        >
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                        <span class="text-[10px] font-mono text-text-muted uppercase">Total:</span>
                        <span class="text-xs font-black font-mono {colorClass(summary.total)}"
                            >{formatValue(summary.total)}</span
                        >
                    </div>
                </div>
            </div>
        </div>

        <!-- Section 2: Forensic Pulse (Broadcasting Gov & Concentration) -->
        <div class="flex items-center gap-6 px-6 py-4 flex-1 min-w-fit bg-surface-hover/30">
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-black text-text-muted/30 uppercase tracking-[0.2em]"
                    >Forensic_Aura</span
                >
                <div class="flex items-center gap-8">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-mono text-text-muted uppercase">Gov_Net:</span
                        >
                        <span
                            class="text-xs font-black font-mono {colorClass(
                                summary.govTotalAmount || 0
                            )}"
                        >
                            {summary.govTotalAmount
                                ? (summary.govTotalAmount / 1000).toFixed(1)
                                : '0.0'}M
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-mono text-text-muted uppercase"
                            >Market_Conc:</span
                        >
                        <span class="text-xs font-black font-mono text-accent">
                            {(summary.avgConcentration || 0).toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Section 3: Collective Intelligence (Filters) -->
        <div class="flex items-center gap-3 px-6 py-4">
            <!-- Search -->
            <div class="relative group/search">
                <div
                    class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted/20 group-focus-within/search:text-accent transition-colors"
                >
                    <svg
                        class="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                    >
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.3-4.3"></path>
                    </svg>
                </div>
                <input
                    type="text"
                    bind:value={marketStore.searchKeyword}
                    placeholder="Search_Ref..."
                    class="w-[120px] h-8 pl-8 pr-3 bg-glass border border-border focus:border-accent/30 focus:bg-glass-hover rounded-lg text-[9px] font-black font-mono placeholder:text-text-muted/30 transition-all outline-none uppercase tracking-tighter"
                />
            </div>

            <!-- Market Filter -->
            <div class="flex items-center bg-glass rounded-lg border border-border h-8 px-1">
                <select
                    bind:value={marketStore.filterMarket}
                    class="appearance-none h-full px-2 bg-transparent text-[9px] font-black font-mono tracking-tighter text-text-muted hover:text-accent transition-all uppercase outline-none"
                >
                    <option value="">MARKET</option>
                    <option value="tse">TSE</option>
                    <option value="otc">OTC</option>
                </select>
            </div>

            <button
                class="flex items-center gap-2 h-8 px-3 rounded-lg border transition-all text-[9px] font-black uppercase tracking-widest {marketStore.filterDivergence
                    ? 'bg-accent/20 border-accent text-accent'
                    : 'bg-glass border-border text-text-muted hover:border-white/20'}"
                onclick={() => (marketStore.filterDivergence = !marketStore.filterDivergence)}
                title="Divergence: Price DOWN / Chips UP"
            >
                <span
                    class="w-1.5 h-1.5 rounded-full {marketStore.filterDivergence
                        ? 'bg-accent animate-pulse'
                        : 'bg-white/10'}"
                ></span>
                Divergence
            </button>

            <button
                class="h-8 w-8 bg-glass border border-border rounded-lg flex items-center justify-center text-text-muted hover:text-accent hover:border-accent/30 transition-all"
                onclick={() => {
                    marketStore.searchKeyword = '';
                    marketStore.filterMarket = '';
                    marketStore.filterDivergence = false;
                }}
                title="Reset_Filters"
            >
                <svg
                    class="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path
                        d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
                    ></path>
                </svg>
            </button>
        </div>
    </div>
</div>

<style>
    /* Pulse HUD Glow */
    .divide-x > div:first-child {
        position: relative;
    }
    .divide-x > div:first-child::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 24px;
        right: 24px;
        height: 1px;
        background: var(--color-accent);
        box-shadow: 0 0 10px var(--color-accent);
        opacity: 0.3;
    }
</style>
