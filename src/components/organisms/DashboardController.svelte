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
                gainers = data.gainers;
                losers = data.losers;
                topVolume = data.volumeLeaders;
            } else {
                gainers = [];
                losers = [];
                topVolume = [];
            }
        } catch (err) {
            console.error('[Sync Error]', err);
            gainers = [];
            losers = [];
            topVolume = [];
        }
    }

    let ratio = $derived(downCount > 0 ? (upCount / downCount).toFixed(2) : 'MAX');

    // Filtering logic — uses shared atomic filter engine
    const filteredGainers = $derived(
        (gainers || []).filter(s => applyStockFilter(s, marketStore)).slice(0, 15)
    );
    const filteredLosers = $derived(
        (losers || []).filter(s => applyStockFilter(s, marketStore)).slice(0, 15)
    );
    const filteredTopVolume = $derived(
        (topVolume || []).filter(s => applyStockFilter(s, marketStore)).slice(0, 15)
    );
</script>

<div class="space-y-4 animate-fade-up">
    <!-- CORE COMMAND NEXUS: Tri-column Layout -->
    <div class="flex flex-col lg:flex-row gap-4 items-stretch justify-center animate-fade-up">
        <!-- MARKET HUD: Key Vectors (Left) -->
        <div
            class="lg:w-[340px] glass-card border-l-4 border-l-accent p-4 relative overflow-hidden shadow-elevated shrink-0 flex flex-col justify-between gap-4"
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
                    <div class="absolute -top-2 -right-2">
                        <CyberDatePicker
                            size="w-20 h-20"
                            value={dataDate}
                            onchange={fetchDateData}
                        />
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

            <div class="flex flex-col gap-4">
                <!-- Sentiment Molecule -->
                <SentimentBar up={upCount} down={downCount} flat={flatCount} {ratio} />

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

        <!-- TREND ANALYSIS: Middle Organism -->
        <MarketBreadthChart
            bind:this={chartRef}
            initialData={initialBreadthData}
            onDateSelect={fetchDateData}
        />

        <!-- FILTER NEXUS: Molecule -->
        <StrategyFilterMatrix />
    </div>
</div>

<!-- SEPARATED MATRIX NEXUS - 3 CARDS GRID -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10 mt-2 lg:mt-4">
    <RankingCard title="主力資金匯聚排行" icon="💧" variant="accent" items={filteredTopVolume} />
    <RankingCard title="跌幅排行" icon="📉" variant="bearish" items={filteredLosers} />
    <RankingCard title="漲幅排行" icon="🚀" variant="bullish" items={filteredGainers} />
</div>
