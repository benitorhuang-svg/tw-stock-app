<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';

    const trend = $derived(marketStore.state.institutional.trend || []);

    // Normalize data (simplified for market level)
    const chartData = $derived(
        trend.map(d => ({
            date: d.date.slice(4),
            f: d.f / 1000000, // Millions
            i: d.i / 1000000,
            d: d.d / 1000000,
        }))
    );

    const width = 1000;
    const height = 150;
    const padding = 20;

    const maxFlow = $derived(
        Math.max(...chartData.flatMap(v => [Math.abs(v.f), Math.abs(v.i), Math.abs(v.d)]), 1)
    );

    // Mock Price for correlation visualization
    const chartPrice = $derived(
        chartData.map((d, i) => 100 + Math.sin(i / 3) * 10 + Math.random() * 5)
    );
    const maxPrice = $derived(Math.max(...chartPrice, 1));
    const minPrice = $derived(Math.min(...chartPrice, 0));

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

    <!-- Chart Container (Ultra Sleek) -->
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

                <!-- Data Points (Glow) -->
                {#each chartData as d, i}
                    {#if d.f + d.i + d.d > 0 && i > 0}
                        <circle
                            cx={x(i)}
                            cy={y(d.f + d.i + d.d)}
                            r="2"
                            fill="var(--color-accent)"
                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                    {/if}
                {/each}
            {/if}
        </svg>
    </div>
</div>
