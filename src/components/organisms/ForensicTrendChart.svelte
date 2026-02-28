<script lang="ts">
    import { onMount } from 'svelte';

    interface Props {
        symbol: string;
        price: number;
    }

    const { symbol, price }: Props = $props();

    let history: any = $state(null);
    let isLoading = $state(true);
    let error = $state<string | null>(null);

    // Tab state: 'chips' | 'lending' | 'strength'
    let activeTab = $state<'chips' | 'lending' | 'strength'>('chips');

    onMount(async () => {
        try {
            const res = await fetch(`/api/stocks/forensic-history?symbol=${symbol}`);
            if (!res.ok) throw new Error('Failed to fetch data');
            const data = await res.json();
            history = data.history;
        } catch (e: any) {
            error = e.message;
        } finally {
            isLoading = false;
        }
    });

    // Chart Dimensions
    const width = 800;
    const height = 300;
    const padding = { top: 20, right: 60, bottom: 40, left: 60 };

    // Derived: Current dataset based on tab
    const chartData = $derived.by(() => {
        if (!history) return [];
        return history.daily || [];
    });

    const maxPrice = $derived(
        chartData.length ? Math.max(...chartData.map((d: any) => d.close)) * 1.05 : 1
    );
    const minPrice = $derived(
        chartData.length ? Math.min(...chartData.map((d: any) => d.close)) * 0.95 : 0
    );

    const maxChipVal = $derived.by(() => {
        if (!chartData.length) return 1;
        const vals = chartData.map((d: any) =>
            Math.abs((d.foreign_inv || 0) + (d.invest_trust || 0) + (d.dealer || 0))
        );
        return Math.max(...vals, 1);
    });

    const maxLendingVal = $derived.by(() => {
        if (!chartData.length) return 1;
        const vals = chartData.map((d: any) => d.short_selling_balance || 0);
        return Math.max(...vals, 1);
    });

    // Strength Tab Scaling (0-100 for RSI)
    const maxStrengthVal = 100;
    const minStrengthVal = 0;

    // Helper: Scale Value to Coordinate
    function scaleX(index: number, count: number) {
        return (index / (count - 1 || 1)) * (width - padding.left - padding.right) + padding.left;
    }

    function scaleY(val: number, min: number, max: number, h: number) {
        return (
            h - padding.bottom - ((val - min) / (max - min)) * (h - padding.top - padding.bottom)
        );
    }

    // Interaction State
    let hoveredIdx = $state<number | null>(null);
</script>

<div class="bg-surface/40 p-6 rounded-2xl border border-border/10">
    <div class="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <svg
                    class="w-4 h-4 text-accent"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path d="M12 20V10M18 20V4M6 20v-4" />
                </svg>
            </div>
            <div>
                <h3
                    class="text-xs font-black text-text-primary uppercase tracking-widest leading-none mb-1"
                >
                    Forensic_Pulse_Trend
                </h3>
                <p class="text-[9px] font-mono text-text-muted/40 uppercase">
                    Entity: {symbol} // Cross-Dimension Correlation
                </p>
            </div>
        </div>

        <div
            class="flex items-center bg-input-bg p-1 rounded-lg border border-border/50 backdrop-blur-sm"
        >
            <button
                class="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-all {activeTab ===
                'chips'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary'}"
                onclick={() => (activeTab = 'chips')}
            >
                Institutional_Flows
            </button>
            <button
                class="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-all {activeTab ===
                'lending'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary'}"
                onclick={() => (activeTab = 'lending')}
            >
                Security_Shorting
            </button>
            <button
                class="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-all {activeTab ===
                'strength'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary'}"
                onclick={() => (activeTab = 'strength')}
            >
                Chip_Strength
            </button>
        </div>
    </div>

    {#if isLoading}
        <div class="h-[300px] flex items-center justify-center animate-pulse">
            <span class="text-[10px] font-mono text-text-muted/40 uppercase tracking-[0.3em]"
                >Decoding_Data_Stream...</span
            >
        </div>
    {:else if error}
        <div
            class="h-[300px] flex items-center justify-center border border-dashed border-border rounded-xl"
        >
            <span class="text-[10px] font-mono text-bearish uppercase tracking-[0.3em]"
                >Error: {error}</span
            >
        </div>
    {:else if history}
        <div class="relative group">
            <svg
                viewBox="0 0 {width} {height}"
                class="w-full h-auto drop-shadow-2xl overflow-visible"
            >
                <!-- Grid Labels (Price) -->
                <text
                    x={width - padding.right + 10}
                    y={scaleY(maxPrice, minPrice, maxPrice, height)}
                    class="text-[8px] fill-text-muted font-mono">{maxPrice.toFixed(1)}</text
                >
                <text
                    x={width - padding.right + 10}
                    y={scaleY(minPrice, minPrice, maxPrice, height)}
                    class="text-[8px] fill-text-muted font-mono">{minPrice.toFixed(1)}</text
                >

                <!-- Grid Labels (Secondary Axis) -->
                {#if activeTab === 'chips'}
                    <text
                        x={padding.left - 10}
                        y={padding.top}
                        class="text-[8px] fill-accent/60 font-mono text-right"
                        text-anchor="end">+{(maxChipVal / 1000).toFixed(0)}K</text
                    >
                    <text
                        x={padding.left - 10}
                        y={height - padding.bottom}
                        class="text-[8px] fill-accent/60 font-mono text-right"
                        text-anchor="end">0</text
                    >
                {:else if activeTab === 'lending'}
                    <text
                        x={padding.left - 10}
                        y={padding.top}
                        class="text-[8px] fill-bearish/60 font-mono text-right"
                        text-anchor="end">{(maxLendingVal / 1000).toFixed(0)}K</text
                    >
                    <text
                        x={padding.left - 10}
                        y={height - padding.bottom}
                        class="text-[8px] fill-bearish/60 font-mono text-right"
                        text-anchor="end">0</text
                    >
                {:else}
                    <text
                        x={padding.left - 10}
                        y={padding.top}
                        class="text-[8px] fill-accent font-mono text-right"
                        text-anchor="end">100 (HIGH)</text
                    >
                    <text
                        x={padding.left - 10}
                        y={height - padding.bottom}
                        class="text-[8px] fill-accent font-mono text-right"
                        text-anchor="end">0 (LOW)</text
                    >
                {/if}

                <!-- Price Line (The Correlation Anchor) -->
                <polyline
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    stroke-width="1.5"
                    stroke-dasharray="4"
                    points={chartData
                        .map(
                            (d: any, i: number) =>
                                `${scaleX(i, chartData.length)},${scaleY(d.close, minPrice, maxPrice, height)}`
                        )
                        .join(' ')}
                />

                <!-- Data Bars / Lines -->
                {#if activeTab === 'chips'}
                    {#each chartData as d, i}
                        {@const net =
                            (d.foreign_inv || 0) + (d.invest_trust || 0) + (d.dealer || 0)}
                        {@const barHeight =
                            (net / maxChipVal) * (height - padding.top - padding.bottom)}
                        <rect
                            x={scaleX(i, chartData.length) - 2}
                            y={barHeight >= 0
                                ? scaleY(0, 0, maxChipVal, height) - Math.abs(barHeight)
                                : scaleY(0, 0, maxChipVal, height)}
                            width="4"
                            height={Math.max(Math.abs(barHeight), 1)}
                            fill={barHeight >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}
                            class="transition-all duration-300"
                        />
                    {/each}
                {:else if activeTab === 'lending'}
                    <polyline
                        fill="none"
                        stroke="rgba(239,68,68,0.6)"
                        stroke-width="2"
                        points={chartData
                            .map(
                                (d: any, i: number) =>
                                    `${scaleX(i, chartData.length)},${scaleY(d.short_selling_balance || 0, 0, maxLendingVal, height)}`
                            )
                            .join(' ')}
                    />
                    <path
                        fill="rgba(239,68,68,0.05)"
                        d="M {scaleX(0, chartData.length)} {height - padding.bottom} 
                           {chartData
                            .map(
                                (d: any, i: number) =>
                                    `L ${scaleX(i, chartData.length)} ${scaleY(d.short_selling_balance || 0, 0, maxLendingVal, height)}`
                            )
                            .join(' ')}
                           L {scaleX(chartData.length - 1, chartData.length)} {height -
                            padding.bottom} Z"
                    />
                {:else if activeTab === 'strength'}
                    <!-- 50 Line -->
                    <line
                        x1={padding.left}
                        y1={scaleY(50, 0, 100, height)}
                        x2={width - padding.right}
                        y2={scaleY(50, 0, 100, height)}
                        stroke="rgba(255,255,255,0.05)"
                        stroke-width="1"
                    />
                    <polyline
                        fill="none"
                        stroke="var(--accent)"
                        stroke-width="2"
                        points={chartData
                            .map(
                                (d: any, i: number) =>
                                    `${scaleX(i, chartData.length)},${scaleY(d.chip_rsi || 50, 0, 100, height)}`
                            )
                            .join(' ')}
                    />
                {/if}

                <!-- Interaction Overlay -->
                {#each chartData as d, i}
                    <rect
                        x={scaleX(i, chartData.length) - width / chartData.length / 2}
                        y={padding.top}
                        width={width / chartData.length}
                        height={height - padding.top - padding.bottom}
                        fill="transparent"
                        role="presentation"
                        onmouseenter={() => (hoveredIdx = i)}
                        onmouseleave={() => (hoveredIdx = null)}
                        onkeydown={() => {}}
                    />
                {/each}

                {#if hoveredIdx !== null}
                    {@const d = chartData[hoveredIdx]}
                    <line
                        x1={scaleX(hoveredIdx, chartData.length)}
                        y1={padding.top}
                        x2={scaleX(hoveredIdx, chartData.length)}
                        y2={height - padding.bottom}
                        stroke="white"
                        stroke-width="0.5"
                        stroke-dasharray="2"
                    />
                    <circle
                        cx={scaleX(hoveredIdx, chartData.length)}
                        cy={scaleY(d.close, minPrice, maxPrice, height)}
                        r="3"
                        fill="white"
                    />
                {/if}
            </svg>

            {#if hoveredIdx !== null}
                {@const d = chartData[hoveredIdx]}
                <div
                    class="absolute top-0 pointer-events-none bg-overlay backdrop-blur-md border border-border p-2 rounded shadow-xl min-w-[120px] transition-all duration-75"
                    style="left: {scaleX(hoveredIdx, chartData.length) +
                        10}px; transform: translateX({hoveredIdx > chartData.length / 2
                        ? '-110%'
                        : '10%'})"
                >
                    <div class="text-[10px] font-black text-text-primary mb-1">{d.date}</div>
                    <div class="flex justify-between gap-4">
                        <span class="text-[8px] font-mono text-text-muted/60 uppercase">Price</span>
                        <span class="text-[10px] font-bold text-text-primary">{d.close.toFixed(2)}</span>
                    </div>
                    {#if activeTab === 'chips'}
                        <div class="flex justify-between gap-4 mt-1">
                            <span class="text-[8px] font-mono text-text-muted/60 uppercase"
                                >Net_Flow</span
                            >
                            <span
                                class="text-[10px] font-bold {(d.foreign_inv || 0) +
                                    (d.invest_trust || 0) >=
                                0
                                    ? 'text-up'
                                    : 'text-down'}"
                                >{(((d.foreign_inv || 0) + (d.invest_trust || 0)) / 1000).toFixed(
                                    1
                                )}M</span
                            >
                        </div>
                    {:else if activeTab === 'lending'}
                        <div class="flex justify-between gap-4 mt-1">
                            <span class="text-[8px] font-mono text-text-muted/60 uppercase"
                                >Short_Bal</span
                            >
                            <span class="text-[10px] font-bold text-bearish"
                                >{((d.short_selling_balance || 0) / 1000).toFixed(1)}K</span
                            >
                        </div>
                    {:else}
                        <div class="flex justify-between gap-4 mt-1">
                            <span class="text-[8px] font-mono text-text-muted/60 uppercase"
                                >Chip_RSI</span
                            >
                            <span class="text-[10px] font-bold text-accent"
                                >{(d.chip_rsi || 50).toFixed(1)}</span
                            >
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div class="p-3 bg-surface-hover/20 border border-border/50 rounded-xl">
                <span class="text-[8px] font-mono text-text-muted/40 uppercase block mb-1"
                    >Max_Price_60D</span
                >
                <span class="text-xs font-black text-text-primary">{maxPrice.toFixed(1)}</span>
            </div>
            <div class="p-3 bg-surface-hover/20 border border-border/50 rounded-xl">
                <span class="text-[8px] font-mono text-text-muted/40 uppercase block mb-1"
                    >Price_Volatility</span
                >
                <span class="text-xs font-black text-accent"
                    >{(((maxPrice - minPrice) / minPrice) * 100).toFixed(1)}%</span
                >
            </div>
            <div class="p-3 bg-surface-hover/20 border border-border/50 rounded-xl">
                <span class="text-[8px] font-mono text-text-muted/40 uppercase block mb-1"
                    >Power_Index</span
                >
                <span class="text-xs font-black text-text-primary"
                    >{(chartData[chartData.length - 1]?.power_index || 0).toFixed(1)}M</span
                >
            </div>
            <div class="p-3 bg-surface-hover/20 border border-border/50 rounded-xl">
                <span class="text-[8px] font-mono text-text-muted/40 uppercase block mb-1"
                    >Trust_Score</span
                >
                <span
                    class="text-xs font-black {(chartData[chartData.length - 1]?.chip_rsi || 50) >
                    60
                        ? 'text-bullish'
                        : (chartData[chartData.length - 1]?.chip_rsi || 50) < 40
                          ? 'text-bearish'
                          : 'text-text-muted'}"
                    >{(chartData[chartData.length - 1]?.chip_rsi || 50).toFixed(0)}/100</span
                >
            </div>
        </div>
    {/if}
</div>

<style>
    polyline {
        filter: drop-shadow(0 0 2px var(--color-accent-glow));
    }
</style>
