<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';

    const trend = $derived(marketStore.state.institutional.trend || []);

    // Normalize data (simplified for market level)
    const chartData = $derived(
        trend.map(d => ({
            date: d.date.slice(5),
            f: d.f / 1000000, // Millions
            i: d.i / 1000000,
            d: d.d / 1000000,
            avgChg: d.avgChg || 0,
        }))
    );

    const width = 1000;
    const height = 150;
    const padding = 20;

    const maxFlow = $derived(
        Math.max(...chartData.flatMap(v => [Math.abs(v.f), Math.abs(v.i), Math.abs(v.d)]), 1)
    );

    // Cumulative return line from avgChg
    const priceValues = $derived.by(() => {
        let cum = 100;
        return chartData.map(d => {
            cum += d.avgChg;
            return cum;
        });
    });
    const maxPrice = $derived(priceValues.length > 0 ? Math.max(...priceValues, 101) : 101);
    const minPrice = $derived(priceValues.length > 0 ? Math.min(...priceValues, 99) : 99);

    function x(i: number) {
        return padding + (i * (width - 2 * padding)) / (chartData.length - 1 || 1);
    }

    function y(val: number) {
        return height / 2 - (val / maxFlow) * (height / 2 - padding);
    }

    function yP(val: number) {
        const range = maxPrice - minPrice || 1;
        return height - padding - ((val - minPrice) / range) * (height - 2 * padding);
    }

    const pathF = $derived(
        chartData.length > 0
            ? `M ${x(0)} ${y(chartData[0].f)} ` +
                  chartData
                      .map((d, i) => `L ${x(i)} ${y(d.f)}`)
                      .slice(1)
                      .join(' ')
            : ''
    );
    const pathI = $derived(
        chartData.length > 0
            ? `M ${x(0)} ${y(chartData[0].i)} ` +
                  chartData
                      .map((d, i) => `L ${x(i)} ${y(d.i)}`)
                      .slice(1)
                      .join(' ')
            : ''
    );
    const pathTotal = $derived(
        chartData.length > 0
            ? `M ${x(0)} ${y(chartData[0].f + chartData[0].i + chartData[0].d)} ` +
                  chartData
                      .map((d, i) => `L ${x(i)} ${y(d.f + d.i + d.d)}`)
                      .slice(1)
                      .join(' ')
            : ''
    );

    const pathPrice = $derived(
        priceValues.length > 1
            ? `M ${x(0)} ${yP(priceValues[0])} ` +
                  priceValues
                      .map((p: number, i: number) => `L ${x(i)} ${yP(p)}`)
                      .slice(1)
                      .join(' ')
            : ''
    );
</script>

<div
    class="institutional-analytics-organism bg-surface/40 rounded-xl border border-border p-6 mb-12 shadow-elevated relative overflow-hidden transition-all duration-500 hover:border-accent/20"
>
    <div class="flex items-center justify-between mb-8">
        <div>
            <h3
                class="text-xs font-black text-text-muted/60 tracking-[0.3em] uppercase flex items-center gap-2"
            >
                <span class="w-2 h-2 rounded-full bg-accent"></span>
                Forensic_Velocity_Analytics
            </h3>
            <p class="text-[9px] font-mono text-text-muted/30 mt-1 uppercase tracking-widest">
                20-Day Market Liquidity Flux • Quantum_Nexus
            </p>
        </div>

        <!-- Legend (Minimal) -->
        <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
                <div class="w-4 h-[2px] bg-accent rounded-full"></div>
                <span class="text-[8px] font-black text-text-muted/40 uppercase tracking-widest"
                    >Foreign</span
                >
            </div>
            <div class="flex items-center gap-2">
                <div class="w-4 h-[2px] bg-bullish rounded-full"></div>
                <span class="text-[8px] font-black text-text-muted/40 uppercase tracking-widest"
                    >Trust</span
                >
            </div>
            <div class="flex items-center gap-2">
                <div class="w-4 h-[2px] bg-white rounded-full"></div>
                <span class="text-[8px] font-black text-text-muted/40 uppercase tracking-widest"
                    >Aggregate</span
                >
            </div>
            <div class="flex items-center gap-2">
                <div
                    class="w-4 h-[2px] bg-yellow-400/40 border-t border-dashed border-yellow-400"
                ></div>
                <span class="text-[8px] font-black text-text-muted/40 uppercase tracking-widest"
                    >Price</span
                >
            </div>
        </div>
    </div>

    <!-- Chart Container -->
    <div class="h-[150px] w-full">
        <svg viewBox="0 0 {width} {height}" class="w-full h-full overflow-visible">
            <!-- X-Axis Line -->
            <line
                x1={padding}
                y1={height / 2}
                x2={width - padding}
                y2={height / 2}
                stroke="currentColor"
                class="text-border"
                stroke-dasharray="8 8"
            />

            <!-- Y-Axis Labels -->
            <text x={4} y={padding + 4} fill="var(--color-text-muted)" font-size="8" opacity="0.3" font-family="monospace">+{(maxFlow).toFixed(0)}M</text>
            <text x={4} y={height / 2 + 3} fill="var(--color-text-muted)" font-size="8" opacity="0.3" font-family="monospace">0</text>
            <text x={4} y={height - padding + 4} fill="var(--color-text-muted)" font-size="8" opacity="0.3" font-family="monospace">-{(maxFlow).toFixed(0)}M</text>

            {#if chartData.length > 0}
                <!-- Price Line (Subtle Background) -->
                <path
                    d={pathPrice}
                    fill="none"
                    stroke="var(--color-yellow-400)"
                    stroke-width="2"
                    stroke-opacity="0.2"
                    stroke-dasharray="6 3"
                />

                <!-- Foreign Line (Neon Glow) -->
                <path
                    d={pathF}
                    fill="none"
                    stroke="var(--color-accent)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-opacity="0.6"
                />

                <!-- Trust Line (Neon Glow) -->
                <path
                    d={pathI}
                    fill="none"
                    stroke="var(--color-bullish)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-opacity="0.6"
                />

                <!-- Total Line (Thick, White) -->
                <path
                    d={pathTotal}
                    fill="none"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-opacity="0.3"
                    stroke-dasharray="4 4"
                />

                <!-- Data Points with Value Labels -->
                {#each chartData as d, i}
                    {@const total = d.f + d.i + d.d}
                    <!-- X-axis date labels (every 3rd point) -->
                    {#if i % 3 === 0}
                        <text x={x(i)} y={height - 2} fill="var(--color-text-muted)" font-size="7" opacity="0.3" font-family="monospace" text-anchor="middle">{d.date}</text>
                    {/if}
                    <!-- Value dots on hover -->
                    <circle
                        cx={x(i)}
                        cy={y(total)}
                        r="3"
                        fill="var(--color-accent)"
                        opacity="0.4"
                    >
                        <title>{d.date}: 外資 {d.f.toFixed(1)}M / 投信 {d.i.toFixed(1)}M / 自營 {d.d.toFixed(1)}M (合計 {total.toFixed(1)}M)</title>
                    </circle>
                {/each}
            {/if}
        </svg>
    </div>

    <!-- Summary Values Row -->
    {#if chartData.length > 0}
        {@const latest = chartData[chartData.length - 1]}
        {@const latestTotal = latest.f + latest.i + latest.d}
        <div class="mt-4 flex items-center gap-6 text-[10px] font-mono border-t border-border/10 pt-3">
            <div class="flex items-center gap-1.5">
                <span class="w-2 h-[2px] bg-accent rounded-full"></span>
                <span class="text-text-muted/40 uppercase">Latest Foreign:</span>
                <span class="font-black {latest.f >= 0 ? 'text-bullish' : 'text-bearish'}">{latest.f >= 0 ? '+' : ''}{latest.f.toFixed(1)}M</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="w-2 h-[2px] bg-bullish rounded-full"></span>
                <span class="text-text-muted/40 uppercase">Trust:</span>
                <span class="font-black {latest.i >= 0 ? 'text-bullish' : 'text-bearish'}">{latest.i >= 0 ? '+' : ''}{latest.i.toFixed(1)}M</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="w-2 h-[2px] bg-white/30 rounded-full"></span>
                <span class="text-text-muted/40 uppercase">Net:</span>
                <span class="font-black {latestTotal >= 0 ? 'text-bullish' : 'text-bearish'}">{latestTotal >= 0 ? '+' : ''}{latestTotal.toFixed(1)}M</span>
            </div>
        </div>
    {/if}
</div>
