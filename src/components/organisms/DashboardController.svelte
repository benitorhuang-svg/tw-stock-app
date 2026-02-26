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
        topVolume = $bindable([]),
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
    <!-- STRATEGIC HUD SLOTS: 3 Columns -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- CARD 1: Time / Calendar -->
        <div
            class="glass-card group p-6 border-l-4 border-l-accent overflow-hidden relative hover:bg-accent/[0.03] transition-all flex flex-col justify-between"
        >
            <div
                class="absolute right-[5px] top-[5px] text-5xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity group-hover:scale-110 duration-500"
            >
                🕰️
            </div>
            <div>
                <div class="flex items-center justify-between mb-3 z-10 relative">
                    <span
                        class="text-[10px] font-mono font-bold text-accent uppercase tracking-widest"
                    >
                        時間維度控制
                    </span>
                    {#if isLive}<div
                            class="w-2 h-2 rounded-full bg-bullish animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                        ></div>{/if}
                </div>
                <h3 class="text-lg font-black text-white/90 mb-1 z-10 relative">觀測基準日</h3>
            </div>

            <div class="mt-8 flex items-end justify-between z-10 relative">
                <div>
                    <span class="text-[8px] text-white/20 uppercase font-mono block mb-1"
                        >Data Horizon</span
                    >
                    <span class="text-2xl font-mono font-bold text-white/90">{dataDate || '—'}</span
                    >
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

        <!-- CARD 2: Sentiment + Trend Button -->
        <div
            class="glass-card group p-6 border-l-4 border-l-accent overflow-hidden relative hover:bg-accent/[0.03] transition-all flex flex-col justify-between"
        >
            <div
                class="absolute right-[5px] top-[5px] text-5xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity group-hover:scale-110 duration-500"
            >
                📊
            </div>
            <div>
                <div class="flex items-center justify-between mb-3 z-10 relative">
                    <span
                        class="text-[10px] font-mono font-bold text-accent uppercase tracking-widest"
                        >大盤多空板塊</span
                    >
                </div>
                <h3 class="text-lg font-black text-white/90 mb-1 z-10 relative">大盤情緒指標</h3>
            </div>

            <div class="mt-4 flex flex-col z-10 relative gap-3">
                <div class="flex items-end justify-between">
                    <div class="flex flex-col">
                        <span class="text-[8px] text-white/20 uppercase font-mono">B/B Ratio</span>
                        <div class="flex items-center gap-2">
                            <span class="text-2xl font-mono font-bold text-bullish">{ratio}</span>
                            <span class="text-[9px] font-mono text-white/40"
                                >[{upCount}:{downCount}]</span
                            >
                        </div>
                    </div>

                    <button
                        id="open-breadth-chart"
                        class="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all uppercase tracking-widest flex items-center gap-2 shrink-0 active:scale-95"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="text-accent/60"
                        >
                            <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                            <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                        </svg>
                        大盤歷史趨勢分析
                    </button>
                </div>

                <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex mt-1">
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
        </div>

        <!-- CARD 3: Volume + Average -->
        <div
            class="glass-card group p-6 border-l-4 border-l-accent overflow-hidden relative hover:bg-accent/[0.03] transition-all flex flex-col justify-between"
        >
            <div
                class="absolute right-[5px] top-[5px] text-5xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity group-hover:scale-110 duration-500"
            >
                🌊
            </div>
            <div>
                <span
                    class="text-[10px] font-mono font-bold text-accent uppercase tracking-widest block mb-3 z-10 relative"
                    >市場交投概況</span
                >
                <h3 class="text-lg font-black text-white/90 mb-1 z-10 relative">市場資金動能</h3>
            </div>

            <div class="mt-8 flex items-end justify-between w-full z-10 relative">
                <div>
                    <span class="text-[8px] text-white/20 uppercase font-mono block mb-1"
                        >成交總量池</span
                    >
                    <span class="text-2xl font-mono font-black text-white/90"
                        >{fmtVol(totalVolume)}</span
                    >
                </div>
                <div class="text-right">
                    <span class="text-[8px] text-white/20 uppercase font-mono block mb-1"
                        >平均漲跌幅</span
                    >
                    <span
                        class="text-2xl font-mono font-black {(avgChange || 0) >= 0
                            ? 'text-bullish'
                            : 'text-bearish'}"
                    >
                        {(avgChange || 0) >= 0 ? '+' : ''}{(avgChange || 0).toFixed(2)}%
                    </span>
                </div>
            </div>
        </div>
    </div>

    <!-- UNIFIED MATRIX NEXUS - 3 COLUMNS GRID -->
    <div
        class="flex flex-col border border-border rounded-xl bg-surface/40 shadow-elevated overflow-hidden relative z-10 mt-8"
    >
        <!-- Sticky Nexus Toolbar -->
        <div
            class="sticky top-[64px] z-[40] flex items-center justify-between gap-3 px-6 py-4 bg-surface border-b border-white/5 backdrop-blur-md"
        >
            <div class="flex items-center gap-3">
                <div
                    class="w-1.5 h-4 bg-accent rounded-full shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]"
                ></div>
                <h2
                    class="text-xs font-mono font-black text-white/90 uppercase tracking-[0.2em] flex items-center gap-2"
                >
                    大盤深度板塊 <span class="text-white/30 text-[9px] font-normal"
                        >| MARKET_BREADTH_MATRIX</span
                    >
                </h2>
            </div>
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                <span class="text-[9px] font-mono text-white/30 uppercase">市場動態監控中</span>
            </div>
        </div>

        <!-- 3 Columns: Volume, Losers, Gainers -->
        <div
            class="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/5 relative z-0"
        >
            <!-- COLUMN 1: LIQUIDITY LEADERS -->
            <div class="flex flex-col">
                <div
                    class="px-6 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between sticky top-[125px] z-30 backdrop-blur-md"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-accent text-xs">💧</span>
                        <h3 class="text-[10px] font-black text-white/80 uppercase tracking-widest">
                            主力資金匯聚排行
                        </h3>
                    </div>
                </div>
                <table class="w-full text-left border-collapse">
                    <thead
                        class="bg-surface/60 border-b border-white/5 sticky top-[162px] z-30 backdrop-blur-md"
                    >
                        <tr>
                            <th
                                class="px-4 py-2 text-[9px] font-normal text-white/30 tracking-widest uppercase"
                                >Rank</th
                            >
                            <th
                                class="px-2 py-2 text-[9px] font-normal text-white/30 tracking-widest uppercase"
                                >Entity</th
                            >
                            <th
                                class="px-4 py-2 text-[9px] font-normal text-white/30 tracking-widest uppercase text-right"
                                >Price</th
                            >
                            <th
                                class="px-4 py-2 text-[9px] font-normal text-white/30 tracking-widest uppercase text-right"
                                >Change</th
                            >
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/[0.02]">
                        {#each topVolume.slice(0, 15) as s, i}
                            <tr
                                class="hover:bg-glass-hover transition-colors group/row cursor-pointer"
                                onclick={() => (window.location.href = `/stocks/${s.symbol}`)}
                            >
                                <td class="px-4 py-3 text-[9px] font-mono text-white/20 pl-6"
                                    >{i + 1}</td
                                >
                                <td class="px-2 py-3 max-w-[100px]">
                                    <div
                                        class="text-[11px] font-bold text-white/90 group-hover/row:text-accent transition-colors truncate"
                                    >
                                        {s.name}
                                    </div>
                                    <div
                                        class="text-[8px] font-mono text-white/30 uppercase mt-0.5"
                                    >
                                        {s.symbol}
                                    </div>
                                </td>
                                <td
                                    class="px-4 py-3 text-right text-[10px] font-mono font-bold text-white/70"
                                    >{s.price?.toFixed(2) || '—'}</td
                                >
                                <td
                                    class="px-4 py-3 text-right text-[10px] font-mono font-bold pr-6 {(s.changePercent ||
                                        0) >= 0
                                        ? 'text-bullish'
                                        : 'text-bearish'}"
                                >
                                    {(s.changePercent || 0) > 0 ? '+' : ''}{(
                                        s.changePercent || 0
                                    ).toFixed(2)}%
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- COLUMN 2: LOSERS MATRIX -->
            <div class="flex flex-col">
                <div
                    class="px-6 py-3 bg-bearish/[0.03] border-b border-white/5 flex items-center justify-between sticky top-[125px] z-30 backdrop-blur-md lg:border-t-0 border-t border-white/5"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-bearish text-xs">📉</span>
                        <h3 class="text-[10px] font-black text-bearish uppercase tracking-widest">
                            跌幅排行
                        </h3>
                    </div>
                </div>
                <table class="w-full text-left border-collapse">
                    <thead
                        class="bg-surface/60 border-b border-white/5 sticky top-[162px] z-30 backdrop-blur-md"
                    >
                        <tr>
                            <th
                                class="px-4 py-2 text-[9px] font-normal text-white/30 tracking-widest uppercase"
                                >Rank</th
                            >
                            <th
                                class="px-2 py-2 text-[9px] font-normal text-white/30 tracking-widest uppercase"
                                >Entity</th
                            >
                            <th
                                class="px-4 py-2 text-[9px] font-normal text-white/30 tracking-widest uppercase text-right"
                                >Price</th
                            >
                            <th
                                class="px-4 py-2 text-[9px] font-normal text-white/30 tracking-widest uppercase text-right"
                                >Change</th
                            >
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/[0.02]">
                        {#each losers.slice(0, 15) as s, i}
                            <tr
                                class="hover:bg-glass-hover transition-colors group/row cursor-pointer"
                                onclick={() => (window.location.href = `/stocks/${s.symbol}`)}
                            >
                                <td class="px-4 py-3 text-[9px] font-mono text-white/20 pl-6"
                                    >{i + 1}</td
                                >
                                <td class="px-2 py-3 max-w-[100px]">
                                    <div
                                        class="text-[11px] font-bold text-white/90 group-hover/row:text-bearish transition-colors truncate"
                                    >
                                        {s.name}
                                    </div>
                                    <div
                                        class="text-[8px] font-mono text-white/30 uppercase mt-0.5"
                                    >
                                        {s.symbol}
                                    </div>
                                </td>
                                <td
                                    class="px-4 py-3 text-right text-[10px] font-mono font-bold text-white/70"
                                    >{s.price?.toFixed(2) || '—'}</td
                                >
                                <td
                                    class="px-4 py-3 text-right text-[10px] font-mono font-bold text-bearish pr-6"
                                    >{(s.changePercent || 0).toFixed(2)}%</td
                                >
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- COLUMN 3: GAINERS MATRIX -->
            <div class="flex flex-col">
                <div
                    class="px-6 py-3 bg-bullish/[0.03] border-b border-white/5 flex items-center justify-between sticky top-[125px] z-30 backdrop-blur-md lg:border-t-0 border-t border-white/5"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-bullish text-xs">🚀</span>
                        <h3 class="text-[10px] font-black text-bullish uppercase tracking-widest">
                            漲幅排行
                        </h3>
                    </div>
                </div>
                <table class="w-full text-left border-collapse">
                    <thead
                        class="bg-surface/60 border-b border-white/5 sticky top-[162px] z-30 backdrop-blur-md"
                    >
                        <tr>
                            <th
                                class="px-4 py-2 text-[9px] font-normal text-white/30 tracking-widest uppercase"
                                >Rank</th
                            >
                            <th
                                class="px-2 py-2 text-[9px] font-normal text-white/30 tracking-widest uppercase"
                                >Entity</th
                            >
                            <th
                                class="px-4 py-2 text-[9px] font-normal text-white/30 tracking-widest uppercase text-right"
                                >Price</th
                            >
                            <th
                                class="px-4 py-2 text-[9px] font-normal text-white/30 tracking-widest uppercase text-right"
                                >Change</th
                            >
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/[0.02]">
                        {#each gainers.slice(0, 15) as s, i}
                            <tr
                                class="hover:bg-glass-hover transition-colors group/row cursor-pointer"
                                onclick={() => (window.location.href = `/stocks/${s.symbol}`)}
                            >
                                <td class="px-4 py-3 text-[9px] font-mono text-white/20 pl-6"
                                    >{i + 1}</td
                                >
                                <td class="px-2 py-3 max-w-[100px]">
                                    <div
                                        class="text-[11px] font-bold text-white/90 group-hover/row:text-bullish transition-colors truncate"
                                    >
                                        {s.name}
                                    </div>
                                    <div
                                        class="text-[8px] font-mono text-white/30 uppercase mt-0.5"
                                    >
                                        {s.symbol}
                                    </div>
                                </td>
                                <td
                                    class="px-4 py-3 text-right text-[10px] font-mono font-bold text-white/70"
                                    >{s.price?.toFixed(2) || '—'}</td
                                >
                                <td
                                    class="px-4 py-3 text-right text-[10px] font-mono font-bold text-bullish pr-6"
                                    >+{(s.changePercent || 0).toFixed(2)}%</td
                                >
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
