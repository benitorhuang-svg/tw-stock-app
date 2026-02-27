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

    let ratio = $derived(downCount > 0 ? (upCount / downCount).toFixed(2) : 'MAX');

    // Filtering logic — uses shared atomic filter engine
    const filteredGainers = $derived(
        (gainers || []).filter(s => applyStockFilter(s, marketStore)).slice(0, 6)
    );
    const filteredLosers = $derived(
        (losers || []).filter(s => applyStockFilter(s, marketStore)).slice(0, 6)
    );
    const filteredTopVolume = $derived(
        (topVolume || []).filter(s => applyStockFilter(s, marketStore)).slice(0, 6)
    );
</script>

<div class="space-y-4 animate-fade-up">
    <!-- STRATEGIC TOOLBAR: Filter Nexus -->
    <StrategyFilterMatrix />

    <!-- CORE COMMAND NEXUS: Swapped Layout -->
    <div class="flex flex-col lg:flex-row gap-4 items-stretch justify-center">
        <!-- MARKET HUD: Key Vectors (Left) -->
        <div
            class="lg:w-[380px] glass-card border-l-4 border-l-accent p-4 relative overflow-hidden shadow-elevated shrink-0 flex flex-col justify-between gap-6"
        >
            <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between relative">
                    <h3
                        class="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2"
                    >
                        <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>
                        市場關鍵維度 <span class="text-white/10 ml-1">/ CORE</span>
                    </h3>
                    {#if isLive}
                        <StatusBadge label="Live" variant="bullish" />
                    {/if}

                    <!-- ABSOLUTE POSITIONED DATE PICKER (TOP RIGHT) -->
                    <div class="absolute -top-2 -right-2 flex items-center gap-1">
                        <button
                            onclick={() => navigateDate(-1)}
                            class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                            aria-label="Previous day"
                        >
                            <svg
                                class="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"><path d="m15 18-6-6 6-6" /></svg
                            >
                        </button>
                        <CyberDatePicker
                            size="w-12 h-12"
                            value={dataDate}
                            onchange={fetchDateData}
                        />
                        <button
                            onclick={() => navigateDate(1)}
                            class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                            aria-label="Next day"
                        >
                            <svg
                                class="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"><path d="m9 18 6-6-6-6" /></svg
                            >
                        </button>
                    </div>
                </div>

                <div class="flex items-end justify-between gap-4">
                    <div class="flex flex-col gap-1 w-full relative">
                        <div class="flex items-center gap-1.5">
                            <span
                                class="text-3xl font-mono font-black text-white tracking-tighter leading-none whitespace-nowrap"
                            >
                                {dataDate || '—'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-5">
                <!-- Sentiment Molecule -->
                <SentimentBar up={upCount} down={downCount} flat={flatCount} {ratio} />

                <!-- Distribution Molecule -->
                {#if distribution}
                    <div class="h-[120px] transition-all duration-500">
                        <MarketDistributionChart {distribution} />
                    </div>
                {/if}

                <!-- Liquidity & Volatility Molecules -->
                <div class="grid grid-cols-2 gap-4">
                    <MetricDisplay label="市場總成交量" value={fmtVol(totalVolume)} />
                    <MetricDisplay
                        label="大盤平均漲跌幅"
                        value={(avgChange >= 0 ? '+' : '') + avgChange.toFixed(2) + '%'}
                        variant={avgChange >= 0 ? 'bullish' : 'bearish'}
                    />
                </div>
            </div>
        </div>

        <!-- GAINER/LOSER RANKINGS: Moved Up -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RankingCard title="漲幅排行" icon="🚀" variant="bullish" items={filteredGainers} />
            <RankingCard title="跌幅排行" icon="📉" variant="bearish" items={filteredLosers} />
        </div>
    </div>
</div>

<!-- BOTTOM ANALYTICS ROW -->
<div class="flex flex-col lg:flex-row gap-4 relative z-10 mt-2 lg:mt-4 items-stretch">
    <!-- TREND ANALYSIS: Moved Down and Width Expanded -->
    <MarketBreadthChart
        bind:this={chartRef}
        initialData={initialBreadthData}
        onDateSelect={fetchDateData}
    />

    <!-- VOLUME RANKING: Positioned next to chart -->
    <div class="lg:w-[380px] shrink-0">
        <RankingCard title="主力資金匯聚排行" icon="�" variant="accent" items={filteredTopVolume} />
    </div>
</div>
