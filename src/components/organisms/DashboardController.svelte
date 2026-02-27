<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { marketStore } from '../../stores/market.svelte';
    import RankingCard from '../molecules/RankingCard.svelte';
    import CyberDatePicker from '../atoms/CyberDatePicker.svelte';
    import StatusBadge from '../atoms/StatusBadge.svelte';
    import MetricDisplay from '../molecules/MetricDisplay.svelte';
    import SentimentBar from '../molecules/SentimentBar.svelte';
    import StrategyFilterMatrix from '../molecules/StrategyFilterMatrix.svelte';
    import MarketBreadthChart from '../organisms/MarketBreadthChart.svelte';
    import MarketDistributionChart from '../molecules/MarketDistributionChart.svelte';
    import { applyStockFilter } from '../../lib/filters/stock-filter';
    import { fmtVol } from '../../utils/format';

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
        initialBreadthData?: any[];
        distribution?: any;
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
        initialBreadthData = [],
        distribution = $bindable(null),
    }: Props = $props();

    // Local state
    let activeSSE: EventSource | null = null;
    let isLive = $state(false);
    let chartRef: any = $state();

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
        if (activeSSE) activeSSE.close();
    });

    const allDates = $derived(initialBreadthData.map(d => d.date).sort());

    async function fetchDateData(date: string) {
        if (!date) return;

        dataDate = date;
        isLive = false;
        if (chartRef) chartRef.focusOnDate(date);

        if (activeSSE) {
            activeSSE.close();
            activeSSE = null;
        }

        try {
            const res = await fetch(`/api/market/history?date=${date}`, { cache: 'no-store' });
            const data = await res.json();
            if (res.ok && !data.error) {
                upCount = data.summary.up;
                downCount = data.summary.down;
                flatCount = data.summary.flat;
                totalVolume = data.summary.totalVolume;
                avgChange = data.summary.avgChange;
                distribution = data.summary.distribution;
                gainers = data.gainers;
                losers = data.losers;
                topVolume = data.volumeLeaders;
            } else {
                gainers = [];
                losers = [];
                topVolume = [];
                distribution = null;
            }
        } catch (err) {
            console.error('[Sync Error]', err);
            gainers = [];
            losers = [];
            topVolume = [];
            distribution = null;
        }
    }

    function navigateDate(direction: number) {
        const currentIndex = allDates.indexOf(dataDate);
        if (currentIndex === -1) return;
        const nextIndex = currentIndex + direction;
        if (nextIndex >= 0 && nextIndex < allDates.length) {
            fetchDateData(allDates[nextIndex]);
        }
    }

    let currentView = $state('rankings'); // 'rankings' | 'breadth'
    let activeDistributionIndex: number | null = $state(null);

    let ratio = $derived(downCount > 0 ? (upCount / downCount).toFixed(2) : 'MAX');

    function isStockInActiveBin(pct: number): boolean {
        if (activeDistributionIndex === null) return true;

        switch (activeDistributionIndex) {
            case 0:
                return pct <= -9; // m9
            case 1:
                return pct > -9 && pct <= -6; // m6_9
            case 2:
                return pct > -6 && pct <= -3; // m3_6
            case 3:
                return pct > -3 && pct < 0; // m0_3
            case 4:
                return pct === 0; // zero
            case 5:
                return pct > 0 && pct < 3; // p0_3
            case 6:
                return pct >= 3 && pct < 6; // p3_6
            case 7:
                return pct >= 6 && pct < 9; // p6_9
            case 8:
                return pct >= 9; // p9
            default:
                return true;
        }
    }

    // Filtering logic
    const filteredGainers = $derived(
        activeDistributionIndex === 4
            ? [] // Do not show flat stocks in the gainers list
            : (gainers || [])
                  .filter(s => applyStockFilter(s, marketStore))
                  .filter(s => isStockInActiveBin(s.changePercent || 0))
                  .slice(0, 8)
    );
    const filteredLosers = $derived(
        (losers || [])
            .filter(s => applyStockFilter(s, marketStore))
            .filter(s => isStockInActiveBin(s.changePercent || 0))
            .slice(0, 8)
    );
    const filteredTopVolume = $derived(
        (topVolume || [])
            .filter(s => applyStockFilter(s, marketStore))
            .filter(s => isStockInActiveBin(s.changePercent || 0))
            .slice(0, 15)
    );
</script>

<div class="flex flex-col lg:flex-row gap-6 min-h-[800px]">
    <!-- SIDEBAR NAVIGATION -->
    <aside
        id="db-sidebar"
        class="w-64 bg-base-deep/80 backdrop-blur-md border-r border-border flex flex-col z-20 shrink-0 min-h-[inherit]"
    >
        <!-- NEW: VERTICAL FILTERS IN SIDEBAR -->
        <StrategyFilterMatrix vertical={true} />

        <!-- Sidebar Header (Matches Template) -->
        <div
            class="px-6 py-4 flex items-center justify-between bg-surface/50 border-b border-border"
        >
            <span class="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]"
                >觀察樣板 / TEMPLATES</span
            >
        </div>
        <div class="p-2 space-y-1">
            <!-- Rankings View Button -->
            <button
                onclick={() => (currentView = 'rankings')}
                class="w-full text-left px-4 py-3 rounded-xl text-[11px] font-mono transition-all flex items-center justify-between group border border-transparent active:scale-[0.98] {currentView ===
                'rankings'
                    ? 'bg-glass-hover text-text-primary border-accent/20'
                    : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary'}"
            >
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div
                        class="w-6 h-6 shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-glass border border-border group-hover:border-accent/40 group-hover:bg-accent/10 transition-all {currentView ===
                        'rankings'
                            ? 'border-accent/40 bg-accent/10 shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]'
                            : ''}"
                    >
                        <span
                            class="text-xs {currentView === 'rankings'
                                ? 'text-accent'
                                : 'text-text-muted group-hover:text-accent'}">🚀</span
                        >
                    </div>
                    <span
                        class="truncate tracking-wide group-hover:translate-x-1 transition-transform {currentView ===
                        'rankings'
                            ? 'font-bold text-accent'
                            : ''}"
                    >
                        漲跌排行
                    </span>
                </div>
            </button>

            <!-- Breadth View Button -->
            <button
                onclick={() => (currentView = 'breadth')}
                class="w-full text-left px-4 py-3 rounded-xl text-[11px] font-mono transition-all flex items-center justify-between group border border-transparent active:scale-[0.98] {currentView ===
                'breadth'
                    ? 'bg-glass-hover text-text-primary border-accent/20'
                    : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary'}"
            >
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div
                        class="w-6 h-6 shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-glass border border-border group-hover:border-accent/40 group-hover:bg-accent/10 transition-all {currentView ===
                        'breadth'
                            ? 'border-accent/40 bg-accent/10 shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]'
                            : ''}"
                    >
                        <span
                            class="text-xs {currentView === 'breadth'
                                ? 'text-accent'
                                : 'text-text-muted group-hover:text-accent'}">📊</span
                        >
                    </div>
                    <span
                        class="truncate tracking-wide group-hover:translate-x-1 transition-transform {currentView ===
                        'breadth'
                            ? 'font-bold text-accent'
                            : ''}"
                    >
                        多空比分析
                    </span>
                </div>
            </button>
        </div>

        <!-- System Status Footer -->
        <div class="mt-auto p-4 border-t border-border/50 bg-surface/30">
            <div
                class="flex items-center justify-between opacity-40 group hover:opacity-100 transition-opacity"
            >
                <span class="text-[8px] font-mono uppercase tracking-tighter text-text-muted"
                    >System Health</span
                >
                <div class="flex items-center gap-1.5">
                    <span class="text-[8px] font-mono text-bullish">ONLINE</span>
                    <span class="w-1.5 h-1.5 rounded-full bg-bullish animate-pulse"></span>
                </div>
            </div>
        </div>
    </aside>

    <!-- MAIN CONTENT AREA -->
    <main class="flex-1 space-y-3 animate-fade-right">
        {#if currentView === 'rankings'}
            <!-- VIEW: RANKINGS -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <!-- TOP LEFT: MARKET KEY DIMENSIONS (Col 1-5) -->
                <div
                    class="lg:col-span-5 glass-card bg-surface/30 px-4 py-3 border-l-4 border-l-accent flex flex-col gap-3 shadow-elevated min-h-[150px]"
                >
                    <div class="flex items-center justify-between w-full pr-4">
                        <!-- Left Column: Date & Metrics -->
                        <div class="flex flex-col gap-3">
                            <div class="flex flex-col gap-1.5">
                                <span
                                    class="text-[10px] font-mono font-black text-white/30 uppercase tracking-[0.2em]"
                                    >市場關鍵維度 / CORE</span
                                >
                                <span
                                    class="text-4xl font-mono font-black text-white tracking-tighter leading-none whitespace-nowrap"
                                    >{dataDate || '—'}</span
                                >
                            </div>

                            <div class="flex items-center gap-8 pl-1">
                                <div class="flex flex-col">
                                    <span
                                        class="text-[9px] font-mono font-black text-white/20 uppercase"
                                        >成交量</span
                                    >
                                    <span class="text-lg font-mono font-black text-white"
                                        >{fmtVol(totalVolume)}</span
                                    >
                                </div>
                                <div class="flex flex-col">
                                    <span
                                        class="text-[9px] font-mono font-black text-white/20 uppercase"
                                        >平均漲跌</span
                                    >
                                    <span
                                        class="text-lg font-mono font-black {(avgChange || 0) >= 0
                                            ? 'text-bullish'
                                            : 'text-bearish'}"
                                    >
                                        {((avgChange || 0) >= 0 ? '+' : '') +
                                            (avgChange || 0).toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Calendar Controls -->
                        <div
                            class="flex flex-col items-center gap-1.5 bg-white/[0.03] p-1.5 rounded-xl border border-white/5 shadow-inner shrink-0 mt-3"
                        >
                            <CyberDatePicker
                                size="w-12 h-12"
                                value={dataDate}
                                onchange={fetchDateData}
                            />
                            <div
                                class="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5 border border-white/5 w-full"
                            >
                                <button
                                    onclick={() => navigateDate(-1)}
                                    class="flex-1 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all active:scale-90"
                                    aria-label="Previous day"
                                >
                                    <svg
                                        class="w-3 h-3"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                    >
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                </button>
                                <div class="w-px h-3 bg-white/20 shrink-0"></div>
                                <button
                                    onclick={() => navigateDate(1)}
                                    class="flex-1 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all active:scale-90"
                                    aria-label="Next day"
                                >
                                    <svg
                                        class="w-3 h-3"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                    >
                                        <path d="m9 18 6-6-6-6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Sentiment Bar at Bottom -->
                    <div class="max-w-[320px]">
                        <SentimentBar up={upCount} down={downCount} flat={flatCount} {ratio} />
                    </div>
                </div>

                <!-- TOP RIGHT: MARKET DISTRIBUTION (Col 6-12) -->
                <div
                    class="lg:col-span-7 glass-card bg-surface/30 px-4 py-3 shadow-elevated flex flex-col gap-3"
                >
                    <div class="flex items-center justify-between border-b border-white/5 pb-2">
                        <span
                            class="text-[10px] font-mono font-black text-white/30 uppercase tracking-[0.2em]"
                            >個股漲跌家數分佈 / DISTRIBUTION</span
                        >
                    </div>
                    {#if distribution}
                        <div class="flex-1 min-h-[120px]">
                            <MarketDistributionChart
                                {distribution}
                                activeRangeIndex={activeDistributionIndex}
                                onSelectRange={idx => (activeDistributionIndex = idx)}
                            />
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Rankings Tables Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <RankingCard
                    title={activeDistributionIndex === 4 ? '平盤排行' : '跌幅排行'}
                    variant="bearish"
                    items={filteredLosers}
                    align="left"
                />
                <RankingCard
                    title="漲幅排行"
                    variant="bullish"
                    items={activeDistributionIndex === 4 ? [] : filteredGainers}
                    align="left"
                />
            </div>
        {:else}
            <!-- VIEW: BREADTH ANALYSIS -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                <!-- Main Breadth Chart (Col 1-8) -->
                <div class="lg:col-span-8 flex flex-col gap-4">
                    <div
                        class="glass-card p-4 border-b-2 border-accent/20 flex items-center justify-between"
                    >
                        <h3
                            class="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2"
                        >
                            <span
                                class="w-2 h-2 bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]"
                            ></span>
                            大盤市場多空比分析
                            <span class="text-white/10 ml-1">/ BREADTH ANALYSIS</span>
                        </h3>
                    </div>
                    <div class="flex-1 min-h-[600px]">
                        <MarketBreadthChart
                            bind:this={chartRef}
                            initialData={initialBreadthData}
                            onDateSelect={fetchDateData}
                        />
                    </div>
                </div>

                <!-- Volume Ranking (Col 9-12) -->
                <div class="lg:col-span-4 flex flex-col gap-4">
                    <RankingCard
                        title="主力資金匯聚排行"
                        variant="accent"
                        items={filteredTopVolume}
                    />
                </div>
            </div>
        {/if}
    </main>
</div>
