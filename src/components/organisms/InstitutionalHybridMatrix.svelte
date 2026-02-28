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
            price: 100 + Math.random() * 20, // Mock price for overlay
        }))
    );

    const width = 1000;
    const height = 400;
    const padding = 40;

    const maxFlow = $derived(
        Math.max(...chartData.flatMap(v => [Math.abs(v.f), Math.abs(v.i), Math.abs(v.d)]), 1)
    );
    const maxPrice = $derived(Math.max(...chartData.map(v => v.price), 1));
    const minPrice = $derived(Math.min(...chartData.map(v => v.price), 0));

    function x(i: number) {
        return padding + (i * (width - 2 * padding)) / (chartData.length - 1 || 1);
    }

    function yFlow(val: number) {
        return height / 2 - (val / maxFlow) * (height / 2 - padding * 2);
    }

    function yPrice(val: number) {
        const range = maxPrice - minPrice || 1;
        return height - padding - ((val - minPrice) / range) * (height - 2 * padding);
    }

    const pricePath = $derived(
        chartData.length > 0
            ? `M ${x(0)} ${yPrice(chartData[0].price)} ` +
                  chartData
                      .map((d, i) => `L ${x(i)} ${yPrice(d.price)}`)
                      .slice(1)
                      .join(' ')
            : ''
    );
</script>

<div
    class="flow-price-chart-organism bg-surface-deep/40 rounded-[2.5rem] border border-border/30 p-10 mb-20 shadow-2xl relative overflow-hidden backdrop-blur-3xl group"
>
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
            <div class="flex items-center gap-4 mb-3">
                <span class="p-2.5 bg-bullish/20 rounded-2xl text-bullish border border-bullish/20">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                    </svg>
                </span>
                <div>
                    <h3 class="text-xl font-black text-text-primary tracking-widest uppercase">
                        Institutional_Hybrid_Matrix
                    </h3>
                    <p class="text-[10px] font-mono text-text-muted/70 mt-1 uppercase tracking-[0.4em]">
                        Multi-Chain Flow Analysis + Price Correlator
                    </p>
                </div>
            </div>
        </div>

        <!-- Legend -->
        <div class="flex items-center gap-8 p-3 rounded-2xl bg-input-bg/50 border border-border/50">
            <div class="flex items-center gap-2">
                <div
                    class="w-3 h-3 rounded bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                ></div>
                <span class="text-[9px] font-mono font-black text-text-muted uppercase">Foreign</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded bg-bullish shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <span class="text-[9px] font-mono font-black text-text-muted uppercase">Invest</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="w-3 h-2 rounded-full border-2 border-yellow-400"></div>
                <span class="text-[9px] font-mono font-black text-text-muted uppercase"
                    >Price_Index</span
                >
            </div>
        </div>
    </div>

    <!-- Chart Container -->
    <div class="h-[450px] w-full">
        <svg viewBox="0 0 {width} {height}" class="w-full h-full overflow-visible">
            <!-- Grid -->
            <line
                x1={padding}
                y1={height / 2}
                x2={width - padding}
                y2={height / 2}
                stroke="currentColor"
                class="text-text-muted/30"
                stroke-width="1"
            />

            {#if chartData.length > 0}
                <!-- Flow Bars (Grouped) -->
                {#each chartData as d, i}
                    {@const barWidth = 6}
                    {@const gap = 2}
                    {@const startX = x(i) - barWidth * 1.5 - gap}

                    <!-- Foreign Bar -->
                    <rect
                        x={startX}
                        y={d.f >= 0 ? yFlow(d.f) : height / 2}
                        width={barWidth}
                        height={Math.abs(yFlow(d.f) - height / 2)}
                        rx="2"
                        fill="var(--color-accent)"
                        class="transition-all duration-700 opacity-60 hover:opacity-100"
                    />

                    <!-- Invest Bar -->
                    <rect
                        x={startX + barWidth + gap}
                        y={d.i >= 0 ? yFlow(d.i) : height / 2}
                        width={barWidth}
                        height={Math.abs(yFlow(d.i) - height / 2)}
                        rx="2"
                        fill="var(--color-bullish)"
                        class="transition-all duration-700 opacity-60 hover:opacity-100"
                    />

                    <!-- Dealer Bar -->
                    <rect
                        x={startX + (barWidth + gap) * 2}
                        y={d.d >= 0 ? yFlow(d.d) : height / 2}
                        width={barWidth}
                        height={Math.abs(yFlow(d.d) - height / 2)}
                        rx="2"
                        fill="var(--color-yellow-400)"
                        class="transition-all duration-700 opacity-60 hover:opacity-100"
                    />
                {/each}

                <!-- Price Path -->
                <path
                    d={pricePath}
                    fill="none"
                    stroke="var(--color-yellow-400)"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-opacity="0.8"
                    class="drop-shadow-[0_4px_12px_rgba(250,204,21,0.4)]"
                />

                <!-- Price Points -->
                {#each chartData as d, i}
                    <circle
                        cx={x(i)}
                        cy={yPrice(d.price)}
                        r="4"
                        fill="var(--color-yellow-400)"
                        class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    />
                {/each}

                <!-- X Axis Date Labels -->
                <g class="text-[10px] font-mono fill-white/20">
                    {#each chartData as d, i}
                        {#if i % 4 === 0 || i === chartData.length - 1}
                            <text
                                x={x(i)}
                                y={height - 5}
                                text-anchor="middle"
                                class="tracking-widest uppercase">{d.date}</text
                            >
                        {/if}
                    {/each}
                </g>
            {/if}
        </svg>
    </div>
</div>
