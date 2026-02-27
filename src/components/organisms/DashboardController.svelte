<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { marketStore } from '../../stores/market.svelte';
    import RankingCard from '../molecules/RankingCard.svelte';
    import { matchesSector, SECTOR_OPTIONS } from '../../lib/filters/sector-filter';
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

        setTimeout(() => {
            initTrendChart();
        }, 100);
    });

    onDestroy(() => {
        if (activeSSE) {
            activeSSE.close();
        }
        if (ro) ro.disconnect();
        if (trendChart) trendChart.destroy();
    });

    async function fetchDateData(date: string) {
        if (!date) return;

        // Optimistic UI Update so user sees the change right away
        dataDate = date;
        isLive = false;
        focusTrendChartOnDate(date);

        // Close SSE when viewing historical data to prevent live overwrites
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
                // Clear cards on error to avoid stale data
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

    function syncHistoricalData(e: Event) {
        const date = (e.target as HTMLInputElement).value;
        fetchDateData(date);
    }

    let ratio = $derived(downCount > 0 ? (upCount / downCount).toFixed(2) : 'MAX');
    let total = $derived(upCount + downCount + flatCount);
    let barUp = $derived(total > 0 ? (upCount / total) * 100 : 0);
    let barDown = $derived(total > 0 ? (downCount / total) * 100 : 0);
    let barFlat = $derived(total > 0 ? (flatCount / total) * 100 : 0);

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

    function resetFilters() {
        marketStore.searchKeyword = '';
        marketStore.filterMarket = '';
        marketStore.filterPriceRange = '';
        marketStore.filterMinVol = 0;
        marketStore.filterTrend = '0';
        marketStore.filterMA20 = 0;
        marketStore.filterSector = '';
    }

    // Chart logic
    let trendChartContainer: HTMLDivElement | null = null;
    let trendChart: any = null;
    let ro: ResizeObserver | null = null;
    let resetTrendChart = $state<() => void>(() => {});
    let echartsLabels: string[] = [];

    function focusTrendChartOnDate(dateStr: string) {
        if (!trendChart || echartsLabels.length === 0) return;
        const index = echartsLabels.indexOf(dateStr);
        if (index !== -1) {
            const totalPoints = echartsLabels.length;
            // Focus on a window ending slightly after the selected date
            const startIdx = Math.max(0, index - 55);
            const endIdx = Math.min(totalPoints - 1, index + 5);
            const startPct = (startIdx / totalPoints) * 100;
            const endPct = (endIdx / totalPoints) * 100;

            trendChart.dispatchAction({
                type: 'dataZoom',
                start: startPct,
                end: endPct,
            });

            // Wait slightly for zoom to complete, then display tooltip
            setTimeout(() => {
                trendChart.dispatchAction({
                    type: 'showTip',
                    seriesIndex: 0,
                    dataIndex: index,
                });
            }, 50);
        }
    }

    async function initTrendChart() {
        if (!trendChartContainer) return;

        const ensureEcharts = (): Promise<any> => {
            if ((window as any).echarts) return Promise.resolve((window as any).echarts);
            return new Promise(resolve => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js';
                s.onload = () => resolve((window as any).echarts);
                document.head.appendChild(s);
            });
        };

        try {
            const echarts = await ensureEcharts();
            const res = await fetch(`/api/market/breadth-timeseries?t=${Date.now()}`);
            const data = await res.json();

            if (trendChart) {
                trendChart.dispose();
            }

            trendChart = echarts.init(trendChartContainer);

            const labels = data.map((d: any) => d.date);
            echartsLabels = labels;

            const ratios = data.map((d: any) =>
                d.down > 0 ? Number((d.up / d.down).toFixed(2)) : 1
            );

            // Calculate starting percentage for last 60 days
            const totalPoints = Math.max(1, data.length);
            const defaultStart = Math.max(0, 100 - (60 / totalPoints) * 100);

            const option = {
                grid: { top: 10, right: 0, bottom: 20, left: 30, containLabel: false },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'line', lineStyle: { color: 'rgba(255,255,255,0.2)' } },
                    backgroundColor: 'rgba(15,23,42,0.9)',
                    borderColor: 'rgba(250, 204, 21, 0.3)',
                    textStyle: { color: '#fff', fontSize: 10, fontFamily: 'monospace' },
                },
                xAxis: {
                    type: 'category',
                    data: labels,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: 9,
                        fontFamily: 'monospace',
                    },
                },
                yAxis: {
                    type: 'value',
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'solid' } },
                    axisLabel: {
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 9,
                        fontFamily: 'monospace',
                    },
                    min: 'dataMin',
                },
                visualMap: {
                    show: false,
                    dimension: 1, // evaluate the y-axis value
                    pieces: [
                        { max: 0.999, color: 'rgba(34, 197, 94, 0.9)' }, // Green for < 1
                        { min: 1, color: 'rgba(239, 68, 68, 0.9)' }, // Red for >= 1
                    ],
                },
                dataZoom: [
                    {
                        type: 'inside',
                        start: defaultStart,
                        end: 100,
                        zoomOnMouseWheel: true,
                        moveOnMouseMove: true,
                    },
                ],
                series: [
                    {
                        data: ratios,
                        type: 'line',
                        smooth: 0.3,
                        symbol: 'none',
                        lineStyle: { width: 2.5 }, // color is controlled by visualMap
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(255, 255, 255, 0.15)' },
                                { offset: 1, color: 'rgba(255, 255, 255, 0.0)' },
                            ]),
                        },
                    },
                ],
            };

            trendChart.setOption(option);

            // Absolute zero-miss clicking via ZRender Pixel Coordinate Mapping
            trendChart.getZr().on('click', (params: any) => {
                const pointInPixel = [params.offsetX, params.offsetY];
                if (trendChart.containPixel('grid', pointInPixel)) {
                    const xIndex = trendChart.convertFromPixel({ seriesIndex: 0 }, pointInPixel)[0];
                    const dateClicked = labels[xIndex];
                    if (dateClicked) {
                        fetchDateData(dateClicked);
                    }
                }
            });

            resetTrendChart = () => {
                if (trendChart) {
                    trendChart.dispatchAction({
                        type: 'dataZoom',
                        start: defaultStart,
                        end: 100,
                    });

                    // Also jump data back to the latest date
                    if (echartsLabels.length > 0) {
                        const latestDate = echartsLabels[echartsLabels.length - 1];
                        if (latestDate) {
                            fetchDateData(latestDate);
                        }
                    }
                }
            };

            ro = new ResizeObserver(() => {
                if (trendChart) trendChart.resize();
            });
            ro.observe(trendChartContainer);
        } catch (e) {
            console.error('Failed to init chart:', e);
        }
    }
</script>

<div class="space-y-6 animate-fade-up">
    <!-- CORE COMMAND NEXUS: Tri-column Layout -->
    <div class="flex flex-col lg:flex-row gap-4 items-stretch animate-fade-up">
        <!-- MARKET HUD: Key Vectors (Left) -->
        <div
            class="lg:w-[320px] glass-card border-l-4 border-l-accent p-6 relative overflow-hidden shadow-elevated shrink-0 flex flex-col justify-between gap-6"
        >
            <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                    <h3
                        class="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2"
                    >
                        <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>
                        市場關鍵維度 <span class="text-white/10 ml-1">/ CORE</span>
                    </h3>
                    {#if isLive}
                        <div
                            class="flex items-center gap-1.5 px-2 py-0.5 bg-bullish/10 rounded-full"
                        >
                            <span class="text-[8px] font-mono text-bullish uppercase font-black"
                                >Live</span
                            >
                            <div class="w-1.5 h-1.5 rounded-full bg-bullish animate-pulse"></div>
                        </div>
                    {/if}
                </div>

                <div class="flex items-end justify-between gap-4">
                    <div class="flex flex-col gap-1 w-full relative">
                        <span
                            class="text-[8px] text-white/20 uppercase font-mono tracking-widest block"
                            >觀測日期</span
                        >
                        <div class="flex items-center gap-3">
                            <span
                                class="text-3xl font-mono font-black text-white tracking-tighter leading-none"
                                >{dataDate || '—'}</span
                            >
                            <div class="relative group/date w-8 h-8 shrink-0">
                                <input
                                    type="date"
                                    onchange={syncHistoricalData}
                                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div
                                    class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/60 group-hover/date:border-accent/40 group-hover/date:bg-white/10 group-hover/date:text-accent transition-all group-active/date:scale-95"
                                >
                                    <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        ><path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        ></path></svg
                                    >
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-6">
                <!-- Sentiment -->
                <div class="flex flex-col gap-1.5">
                    <span
                        class="text-[8px] text-white/20 uppercase font-mono tracking-widest font-bold"
                        >市場多空比 (下跌:平盤:上漲)</span
                    >
                    <div class="flex items-center gap-3">
                        <span
                            class="text-2xl font-mono font-black w-12 {parseFloat(ratio) > 1
                                ? 'text-bullish'
                                : parseFloat(ratio) < 1 && ratio !== 'MAX'
                                  ? 'text-bearish'
                                  : 'text-white'}">{ratio}</span
                        >
                        <div
                            class="h-4 flex-1 bg-white/5 rounded-full overflow-hidden flex text-[9px] font-mono font-bold text-white/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] border border-white/5 relative"
                        >
                            <div
                                class="h-full bg-bearish flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                                style="width: {barDown}%"
                            >
                                {#if downCount > 0}{downCount}{/if}
                            </div>
                            <div
                                class="h-full bg-white/10 flex items-center justify-center text-white/40"
                                style="width: {barFlat}%"
                            >
                                {#if flatCount > 0}{flatCount}{/if}
                            </div>
                            <div
                                class="h-full bg-bullish flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                                style="width: {barUp}%"
                            >
                                {#if upCount > 0}{upCount}{/if}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Liquidity & Volatility (Same Row) -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5 border-l-2 border-white/5 pl-3">
                        <span
                            class="text-[8px] text-white/20 uppercase font-mono tracking-widest font-bold"
                            >市場總成交量</span
                        >
                        <span class="text-xl font-mono font-black text-white leading-none"
                            >{fmtVol(totalVolume)}</span
                        >
                    </div>
                    <div class="flex flex-col gap-1.5 border-l-2 border-white/5 pl-3">
                        <span
                            class="text-[8px] text-white/20 uppercase font-mono tracking-widest font-bold"
                            >大盤平均漲跌幅</span
                        >
                        <span
                            class="text-xl font-mono font-black leading-none {(avgChange || 0) >= 0
                                ? 'text-bullish'
                                : 'text-bearish'}"
                        >
                            {(avgChange || 0) >= 0 ? '+' : ''}{(avgChange || 0).toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- TREND ANALYSIS: Middle Card -->
        <div
            class="flex-1 glass-card border-l-4 border-l-blue-500 p-6 relative overflow-hidden shadow-elevated shrink-[3] min-w-[300px] flex flex-col gap-4"
        >
            <div class="flex items-center justify-between">
                <h3
                    class="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2"
                >
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    大盤市場多空比分析 <span class="text-white/10 ml-1">/ BREADTH TREND</span>
                </h3>
                <button
                    onclick={resetTrendChart}
                    class="flex items-center gap-1 px-2 py-1 rounded-full border border-border bg-glass hover:bg-glass-hover text-[9px] font-black text-white/40 hover:text-accent transition-all uppercase tracking-widest active:scale-95"
                >
                    <svg
                        class="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><path
                            d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                        ></path></svg
                    >
                    Reset
                </button>
            </div>

            <div
                class="flex-1 w-full min-h-[140px] relative rounded-xl overflow-hidden group/chart cursor-crosshair"
                bind:this={trendChartContainer}
            >
                <!-- Chart Container Injected via Script -->
            </div>
        </div>

        <!-- FILTER NEXUS: Strategic Scanning (Right) -->
        <div
            class="lg:w-[220px] glass-card p-6 shadow-elevated bg-surface/30 flex flex-col justify-between gap-4 shrink-0"
        >
            <div class="flex items-center justify-between">
                <h3
                    class="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2"
                >
                    <span class="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                    戰略篩選矩陣 <span class="text-white/10 ml-1">/ FILTERS</span>
                </h3>
            </div>

            <div class="flex flex-col gap-4">
                <!-- Market & Industry & Price Group -->
                <div
                    class="flex items-center gap-0.5 px-0.5 py-0.5 bg-glass rounded-full border border-border h-8 w-full justify-between"
                >
                    <select
                        bind:value={marketStore.filterMarket}
                        class="flex-1 appearance-none h-7 px-1 text-center bg-transparent text-[10px] font-black tracking-widest text-[#94a3b8] cursor-pointer outline-none hover:text-accent transition-all uppercase"
                    >
                        <option value="">全部</option>
                        <option value="tse">上市</option>
                        <option value="otc">上櫃</option>
                    </select>
                    <div class="w-px h-3 bg-border shrink-0"></div>
                    <select
                        bind:value={marketStore.filterSector}
                        class="flex-1 appearance-none h-7 px-1 text-center bg-transparent text-[10px] font-black tracking-widest text-text-primary/60 cursor-pointer outline-none hover:text-accent transition-all uppercase"
                    >
                        <option value="">產業</option>
                        {#each SECTOR_OPTIONS as opt}
                            <option value={opt.value}>{opt.label}</option>
                        {/each}
                    </select>
                    <div class="w-px h-3 bg-border shrink-0"></div>
                    <select
                        bind:value={marketStore.filterPriceRange}
                        class="flex-1 appearance-none h-7 px-1 text-center bg-transparent text-[10px] font-black tracking-widest text-[#94a3b8] cursor-pointer outline-none hover:text-accent transition-all uppercase"
                    >
                        <option value="">價格</option>
                        <option value="0-50">50↓</option>
                        <option value="50-100">50-100</option>
                        <option value="100-500">100-500</option>
                        <option value="500-10000">500↑</option>
                    </select>
                </div>

                <!-- Slider: Trend -->
                <div
                    class="flex items-center gap-1.5 px-2 h-8 w-full bg-glass rounded-full border border-border"
                >
                    <div class="flex flex-col items-center justify-center shrink-0 w-8">
                        <span
                            class="text-[9px] font-mono font-black {parseFloat(
                                marketStore.filterTrend
                            ) > 0
                                ? 'text-bullish'
                                : parseFloat(marketStore.filterTrend) < 0
                                  ? 'text-bearish'
                                  : 'text-accent'} leading-none"
                        >
                            {parseFloat(marketStore.filterTrend) > 0 ? '+' : ''}{parseFloat(
                                marketStore.filterTrend
                            ).toFixed(1)}%
                        </span>
                        <span
                            class="text-[7px] text-white/30 font-black tracking-widest leading-none mt-0.5 uppercase"
                            >漲跌幅</span
                        >
                    </div>
                    <button
                        onclick={() =>
                            (marketStore.filterTrend = String(
                                Math.max(-10, parseFloat(marketStore.filterTrend) - 0.5)
                            ))}
                        class="text-white/20 hover:text-accent transition-colors text-xs font-bold px-1"
                        >－</button
                    >
                    <input
                        type="range"
                        min="-10"
                        max="10"
                        step="0.5"
                        bind:value={marketStore.filterTrend}
                        class="flex-1 w-0 min-w-0 h-1 bg-white/5 rounded-full appearance-none flex-shrink cursor-pointer accent-accent custom-range"
                    />
                    <button
                        onclick={() =>
                            (marketStore.filterTrend = String(
                                Math.min(10, parseFloat(marketStore.filterTrend) + 0.5)
                            ))}
                        class="text-white/20 hover:text-accent transition-colors text-xs font-bold px-1"
                        >＋</button
                    >
                </div>

                <!-- Slider: Volume -->
                <div
                    class="flex items-center gap-1.5 px-2 h-8 w-full bg-glass rounded-full border border-border"
                >
                    <div class="flex flex-col items-center justify-center shrink-0 w-8">
                        <span class="text-[9px] font-mono font-black text-accent leading-none">
                            {marketStore.filterMinVol > 0
                                ? marketStore.filterMinVol >= 10000
                                    ? (marketStore.filterMinVol / 10000).toFixed(1) + '萬'
                                    : marketStore.filterMinVol
                                : '0'}
                        </span>
                        <span
                            class="text-[7px] text-white/30 font-black tracking-widest leading-none mt-0.5 uppercase"
                            >成交量</span
                        >
                    </div>
                    <button
                        onclick={() =>
                            (marketStore.filterMinVol = Math.max(
                                0,
                                marketStore.filterMinVol - 10000
                            ))}
                        class="text-white/20 hover:text-accent transition-colors text-xs font-bold px-1"
                        >－</button
                    >
                    <input
                        type="range"
                        min="0"
                        max="1000000"
                        step="10000"
                        bind:value={marketStore.filterMinVol}
                        class="flex-1 w-0 min-w-0 h-1 bg-white/5 rounded-full appearance-none flex-shrink cursor-pointer accent-accent custom-range"
                    />
                    <button
                        onclick={() =>
                            (marketStore.filterMinVol = Math.min(
                                1000000,
                                marketStore.filterMinVol + 10000
                            ))}
                        class="text-white/20 hover:text-accent transition-colors text-xs font-bold px-1"
                        >＋</button
                    >
                </div>

                <div class="mt-2 w-full">
                    <button
                        onclick={resetFilters}
                        class="w-full flex justify-center items-center gap-2 px-3 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 text-[10px] font-black text-white/40 hover:text-white transition-all uppercase tracking-widest active:scale-95"
                    >
                        <svg
                            class="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><path
                                d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                            ></path></svg
                        >
                        RESET FILTERS
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- SEPARATED MATRIX NEXUS - 3 CARDS GRID -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10 mt-4 lg:mt-6">
    <RankingCard title="主力資金匯聚排行" icon="💧" variant="accent" items={filteredTopVolume} />
    <RankingCard title="跌幅排行" icon="📉" variant="bearish" items={filteredLosers} />
    <RankingCard title="漲幅排行" icon="🚀" variant="bullish" items={filteredGainers} />
</div>

<style>
    .custom-range {
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.05);
        height: 4px;
        border-radius: 10px;
    }
    .custom-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 10px;
        height: 10px;
        background: var(--color-accent);
        border: 1.5px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.5);
    }
</style>
