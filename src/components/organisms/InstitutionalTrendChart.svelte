<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';

    const rawTrend = $derived(marketStore.state.institutional.trend || []);

    // Normalize data for SVG coordinates
    const trend = $derived(
        rawTrend.map(d => ({
            date: d.date.slice(4), // MMDD
            total: (d.f + d.i + d.d) / 1000000, // Millions
            f: d.f / 1000000,
            i: d.i / 1000000,
            d: d.d / 1000000,
        }))
    );

    const maxVal = $derived(
        Math.max(
            ...trend.flatMap(d => [Math.abs(d.f), Math.abs(d.i), Math.abs(d.d), Math.abs(d.total)]),
            1
        )
    );
    const padding = 20;
    const width = 800;
    const height = 200;

    function x(index: number) {
        return padding + (index * (width - 2 * padding)) / (trend.length - 1 || 1);
    }

    function y(val: number) {
        // Zero is at middle
        return height / 2 - (val / maxVal) * (height / 2 - padding);
    }

    // Path generators
    const pathF = $derived(
        trend.length > 0
            ? `M ${x(0)} ${y(trend[0].f)} ` +
                  trend
                      .map((d, i) => `L ${x(i)} ${y(d.f)}`)
                      .slice(1)
                      .join(' ')
            : ''
    );
    const pathI = $derived(
        trend.length > 0
            ? `M ${x(0)} ${y(trend[0].i)} ` +
                  trend
                      .map((d, i) => `L ${x(i)} ${y(d.i)}`)
                      .slice(1)
                      .join(' ')
            : ''
    );
    const pathTotal = $derived(
        trend.length > 0
            ? `M ${x(0)} ${y(trend[0].total)} ` +
                  trend
                      .map((d, i) => `L ${x(i)} ${y(d.total)}`)
                      .slice(1)
                      .join(' ')
            : ''
    );
</script>

<div
    class="institutional-trend-organism bg-surface-deep/40 rounded-3xl border border-white/5 p-6 mb-8 backdrop-blur-xl group overflow-hidden shadow-2xl"
>
    <div class="flex items-center justify-between mb-8">
        <div>
            <h3
                class="text-sm font-black text-white/90 tracking-[0.2em] uppercase flex items-center gap-2"
            >
                <span class="w-2 h-2 rounded-full bg-accent"></span>
                Institutional_Inflow_Trend
            </h3>
            <p class="text-[9px] font-mono text-white/20 mt-1 uppercase tracking-widest">
                20-Day Market Liquidity Velocity • Forensic_Analytics
            </p>
        </div>

        <!-- Legend -->
        <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
                <div class="w-8 h-[2px] bg-bullish rounded-full"></div>
                <span class="text-[8px] font-black text-white/40 uppercase">Foreign</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="w-8 h-[2px] bg-accent rounded-full"></div>
                <span class="text-[8px] font-black text-white/40 uppercase">Trust</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="w-8 h-[2px] bg-white border-t-2 border-dashed border-white/20"></div>
                <span class="text-[8px] font-black text-white/40 uppercase">Total_Net</span>
            </div>
        </div>
    </div>

    <!-- Chart Engine -->
    <div class="relative h-[220px] w-full">
        <svg viewBox="0 0 {width} {height}" class="w-full h-full preserve-3d">
            <!-- Grid Lines -->
            <line
                x1={padding}
                y1={height / 2}
                x2={width - padding}
                y2={height / 2}
                stroke="currentColor"
                class="text-white/5"
                stroke-dasharray="4"
            />

            {#if trend.length > 0}
                <!-- Area Gradient for Total -->
                <defs>
                    <linearGradient id="chart-total-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.1" />
                        <stop offset="100%" stop-color="transparent" stop-opacity="0" />
                    </linearGradient>
                </defs>

                <!-- Foreign Line (Neon Glow) -->
                <path
                    d={pathF}
                    fill="none"
                    stroke="var(--color-bullish)"
                    stroke-width="2"
                    stroke-linecap="round"
                    class="drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                />

                <!-- Trust Line (Neon Glow) -->
                <path
                    d={pathI}
                    fill="none"
                    stroke="var(--color-accent)"
                    stroke-width="2"
                    stroke-linecap="round"
                    class="drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                />

                <!-- Total Line (Thick, White) -->
                <path
                    d={pathTotal}
                    fill="none"
                    stroke="white"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-opacity="0.8"
                />

                <!-- Data Points -->
                {#each trend as d, i}
                    <circle
                        cx={x(i)}
                        cy={y(d.total)}
                        r="4"
                        fill="white"
                        class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    />
                {/each}

                <!-- Axis Labels -->
                <g class="text-[10px] font-mono fill-white/10 font-black">
                    {#each trend as d, i}
                        {#if i % 4 === 0 || i === trend.length - 1}
                            <text
                                x={x(i)}
                                y={height - 2}
                                text-anchor="middle"
                                class="tracking-tighter uppercase">{d.date}</text
                            >
                        {/if}
                    {/each}
                </g>
            {/if}
        </svg>

        <!-- Y Axis Markers -->
        <div
            class="absolute left-0 top-0 bottom-0 py-4 flex flex-col justify-between text-[8px] font-mono font-black text-white/10 pointer-events-none"
        >
            <span>+{maxVal.toFixed(0)}B</span>
            <span>0</span>
            <span>-{maxVal.toFixed(0)}B</span>
        </div>
    </div>
</div>

<style>
    path {
        transition: d 1000ms cubic-bezier(0.16, 1, 0.3, 1);
    }
</style>
