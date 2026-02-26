<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    
    interface Props {
        // Initial data from SSR
        upCount?: number;
        downCount?: number;
        flatCount?: number;
        totalVolume?: number;
        avgChange?: number;
        dataDate?: string;
        gainers?: any[];
        losers?: any[];
        topVolume?: any[];
    }

    let {
        upCount = $bindable(0),
        downCount = $bindable(0),
        flatCount = $bindable(0),
        totalVolume = $bindable(0),
        avgChange = $bindable(0),
        dataDate = $bindable(''),
        gainers = $bindable([]),
        losers = $bindable([]),
        topVolume = $bindable([])
    }: Props = $props();

    // Local state
    let activeSSE: EventSource | null = null;
    let isLive = $state(false);

    // Formatting helpers
    function fmtVol(v: number): string {
        const cv = Math.ceil(v);
        if (cv >= 100000000) return (cv / 100000000).toFixed(1) + '億';
        if (cv >= 10000) return (cv / 10000).toFixed(1) + '萬';
        return cv > 0 ? cv.toLocaleString('zh-TW') : '—';
    }

    onMount(() => {
        if (typeof EventSource !== 'undefined') {
            activeSSE = new EventSource('/api/sse/stream');
            activeSSE.addEventListener('tick', (e: any) => {
                try {
                    const ticks = JSON.parse(e.data);
                    if (!ticks || !Array.isArray(ticks)) return;

                    let up = 0,
                        down = 0,
                        flat = 0,
                        tVol = 0,
                        tPct = 0,
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
                            tVol += vol;
                            tPct += chgPct;
                            count++;
                            if (t.Date) latestDate = t.Date;
                        }
                    }

                    upCount = up;
                    downCount = down;
                    flatCount = flat;
                    totalVolume = tVol;
                    avgChange = count > 0 ? tPct / count : 0;
                    if (latestDate) dataDate = latestDate;
                    isLive = true;
                } catch (err) {
                    console.error('[SSE Error]', err);
                }
            });
        }
    });

    onDestroy(() => {
        if (activeSSE) {
            activeSSE.close();
        }
    });

    async function syncHistoricalData(e: Event) {
        const date = (e.target as HTMLInputElement).value;
        if (!date) return;
        try {
            const res = await fetch(`/api/market/history?date=${date}`);
            const data = await res.json();
            if (res.ok && !data.error) {
                upCount = data.summary.up;
                downCount = data.summary.down;
                flatCount = data.summary.flat;
                totalVolume = data.summary.totalVolume;
                avgChange = data.summary.avgChange;
                gainers = data.gainers;
                losers = data.losers;
                topVolume = data.volumeLeaders;
                dataDate = date;
                isLive = false;
            }
        } catch (err) {
            console.error('[Sync Error]', err);
        }
    }

    let ratio = $derived(downCount > 0 ? (upCount / downCount).toFixed(2) : 'MAX');
    let total = $derived(upCount + downCount + flatCount);
    let barUp = $derived(total > 0 ? (upCount / total) * 100 : 0);
    let barDown = $derived(total > 0 ? (downCount / total) * 100 : 0);
    let barFlat = $derived(total > 0 ? (flatCount / total) * 100 : 0);
</script>

<div class="space-y-8 animate-fade-up">
    <!-- STRATEGIC HUD SLOTS -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Market Breadth Widget -->
        <div
            class="glass-card group p-5 border-l-4 border-l-accent overflow-hidden relative hover:bg-accent/[0.03] transition-all"
        >
            <div
                class="absolute right-[-10px] top-[-10px] text-6xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity group-hover:scale-110 duration-500"
            >
                📊
            </div>
            <div class="flex items-center justify-between mb-3">
                <span class="text-[10px] font-mono font-bold text-accent uppercase tracking-widest"
                    >Market Breadth intelligence</span
                >
                {#if isLive}<div class="w-2 h-2 rounded-full bg-bullish animate-pulse"></div>{/if}
            </div>
            <h3 class="text-lg font-black text-white/90 mb-1">Sentiment Vector</h3>
            <div class="flex items-end justify-between mt-auto">
                <div class="flex flex-col">
                    <span class="text-[8px] text-white/20 uppercase font-mono">B/B Ratio</span>
                    <span class="text-xl font-mono font-bold text-bullish">{ratio}</span>
                </div>
                <div class="text-right">
                    <div class="text-[8px] text-white/20 uppercase font-mono">Up/Down</div>
                    <div class="text-[10px] font-mono font-bold text-white/70">
                        <span class="text-bullish">{upCount}</span> /
                        <span class="text-bearish">{downCount}</span>
                    </div>
                </div>
            </div>
            <div class="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                <div
                    class="h-full bg-bullish transition-all duration-1000"
                    style="width: {barUp}%"
                ></div>
                <div
                    class="h-full bg-white/20 transition-all duration-1000"
                    style="width: {barFlat}%"
                ></div>
                <div
                    class="h-full bg-bearish transition-all duration-1000"
                    style="width: {barDown}%"
                ></div>
            </div>
        </div>

        <!-- Volume Intelligence Widget -->
        <div
            class="glass-card group p-5 border-l-4 border-l-accent overflow-hidden relative hover:bg-accent/[0.03] transition-all"
        >
            <div
                class="absolute right-[-10px] top-[-10px] text-6xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity group-hover:scale-110 duration-500"
            >
                🌊
            </div>
            <span
                class="text-[10px] font-mono font-bold text-accent uppercase tracking-widest block mb-3"
                >Liquidity stream</span
            >
            <h3 class="text-lg font-black text-white/90 mb-1">Volume Scalar</h3>
            <div class="mt-auto">
                <span class="text-[8px] text-white/20 uppercase font-mono block"
                    >Aggregate Flux</span
                >
                <span class="text-2xl font-mono font-black text-white/90"
                    >{fmtVol(totalVolume)}</span
                >
            </div>
        </div>

        <!-- Market Return Widget -->
        <div
            class="glass-card group p-5 border-l-4 border-l-accent overflow-hidden relative hover:bg-accent/[0.03] transition-all"
        >
            <div
                class="absolute right-[-10px] top-[-10px] text-6xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity group-hover:scale-110 duration-500"
            >
                📈
            </div>
            <span
                class="text-[10px] font-mono font-bold text-accent uppercase tracking-widest block mb-3"
                >Return Vector</span
            >
            <h3 class="text-lg font-black text-white/90 mb-1">Mean Variance</h3>
            <div class="mt-auto">
                <span class="text-[8px] text-white/20 uppercase font-mono block"
                    >Market Average</span
                >
                <span
                    class="text-2xl font-mono font-black {avgChange >= 0
                        ? 'text-bullish'
                        : 'text-bearish'}"
                >
                    {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
                </span>
            </div>
        </div>

        <!-- Temporal Intelligence Widget -->
        <div
            class="glass-card group p-5 border-l-4 border-l-accent overflow-hidden relative hover:bg-accent/[0.03] transition-all"
        >
            <div
                class="absolute right-[-10px] top-[-10px] text-6xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity group-hover:scale-110 duration-500"
            >
                🕰️
            </div>
            <div class="flex items-center justify-between mb-3">
                <span class="text-[10px] font-mono font-bold text-accent uppercase tracking-widest"
                    >Temporal marker</span
                >
            </div>
            <h3 class="text-lg font-black text-white/90 mb-1">Market Timeline</h3>
            <div class="mt-auto flex items-end justify-between">
                <div>
                    <span class="text-[8px] text-white/20 uppercase font-mono block"
                        >Data Horizon</span
                    >
                    <span class="text-xl font-mono font-bold text-white/90">{dataDate || '—'}</span>
                </div>
                <div class="relative group/input">
                    <input
                        type="date"
                        onchange={syncHistoricalData}
                        class="bg-white/5 border border-white/10 rounded px-2 py-1 text-[9px] font-mono text-white/40 outline-none focus:border-accent/50 transition-colors uppercase"
                    />
                </div>
            </div>
        </div>
    </div>

    <!-- MOVERS GRID -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- GAINERS -->
        <div class="glass-card overflow-hidden border-t-2 border-t-bullish/40">
            <div
                class="px-6 py-4 border-b border-white/5 bg-bullish/[0.03] flex items-center justify-between"
            >
                <div class="flex items-center gap-3">
                    <div
                        class="w-8 h-8 rounded-lg bg-bullish/20 flex items-center justify-center text-bullish"
                    >
                        🚀
                    </div>
                    <h3
                        class="text-xs font-mono font-black text-white/80 uppercase tracking-widest"
                    >
                        Bullish Momentum
                    </h3>
                </div>
            </div>
            <div class="divide-y divide-white/5">
                {#each gainers.slice(0, 10) as s, i}
                    <a
                        href="/stocks/{s.symbol}"
                        class="flex items-center gap-4 px-6 py-4 hover:bg-accent/[0.04] transition-all group no-underline border-l-2 border-transparent hover:border-bullish"
                    >
                        <span class="text-[8px] font-mono text-white/20 w-3">{i + 1}</span>
                        <div class="min-w-0 flex-1">
                            <div
                                class="text-[11px] font-bold text-white/90 group-hover:text-bullish transition-colors truncate"
                            >
                                {s.name}
                            </div>
                            <div class="text-[8px] font-mono text-white/30 uppercase mt-0.5">
                                ENTITY:{s.symbol}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-[10px] font-mono font-bold text-white/70">
                                {s.price?.toFixed(2) || '—'}
                            </div>
                            <div class="text-[10px] font-mono font-bold text-bullish">
                                +{s.changePercent?.toFixed(2)}%
                            </div>
                        </div>
                    </a>
                {/each}
            </div>
        </div>

        <!-- LOSERS -->
        <div class="glass-card overflow-hidden border-t-2 border-t-bearish/40">
            <div
                class="px-6 py-4 border-b border-white/5 bg-bearish/[0.03] flex items-center justify-between"
            >
                <div class="flex items-center gap-3">
                    <div
                        class="w-8 h-8 rounded-lg bg-bearish/20 flex items-center justify-center text-bearish"
                    >
                        📉
                    </div>
                    <h3
                        class="text-xs font-mono font-black text-white/80 uppercase tracking-widest"
                    >
                        Bearish Vector
                    </h3>
                </div>
            </div>
            <div class="divide-y divide-white/5">
                {#each losers.slice(0, 10) as s, i}
                    <a
                        href="/stocks/{s.symbol}"
                        class="flex items-center gap-4 px-6 py-4 hover:bg-accent/[0.04] transition-all group no-underline border-l-2 border-transparent hover:border-bearish"
                    >
                        <span class="text-[8px] font-mono text-white/20 w-3">{i + 1}</span>
                        <div class="min-w-0 flex-1">
                            <div
                                class="text-[11px] font-bold text-white/90 group-hover:text-bearish transition-colors truncate"
                            >
                                {s.name}
                            </div>
                            <div class="text-[8px] font-mono text-white/30 uppercase mt-0.5">
                                ENTITY:{s.symbol}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-[10px] font-mono font-bold text-white/70">
                                {s.price?.toFixed(2) || '—'}
                            </div>
                            <div class="text-[10px] font-mono font-bold text-bearish">
                                {s.changePercent?.toFixed(2)}%
                            </div>
                        </div>
                    </a>
                {/each}
            </div>
        </div>
    </div>

    <!-- LIQUIDITY LEADERS -->
    <div class="glass-card overflow-hidden border-t-2 border-t-accent/40">
        <div
            class="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between"
        >
            <h3 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Liquidity Leaders
            </h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-white/5">
            {#each topVolume.slice(0, 15) as s, i}
                <a
                    href="/stocks/{s.symbol}"
                    class="flex items-center gap-4 px-6 py-4 hover:bg-accent/[0.04] transition-all group no-underline border-l-2 border-transparent hover:border-accent"
                >
                    <span class="text-[8px] font-mono text-white/20 w-3">{i + 1}</span>
                    <div class="min-w-0 flex-1">
                        <div
                            class="text-[11px] font-bold text-white/90 group-hover:text-accent transition-colors truncate"
                        >
                            {s.name}
                        </div>
                        <div class="text-[8px] font-mono text-white/30 uppercase mt-0.5">
                            {s.symbol}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-[10px] font-mono font-bold text-white/70">
                            {s.price?.toFixed(2) || '—'}
                        </div>
                        <div
                            class="text-[9px] font-mono font-bold {s.changePercent >= 0
                                ? 'text-bullish'
                                : 'text-bearish'}"
                        >
                            {s.changePercent > 0 ? '+' : ''}{s.changePercent.toFixed(1)}%
                        </div>
                    </div>
                </a>
            {/each}
        </div>
    </div>
</div>
