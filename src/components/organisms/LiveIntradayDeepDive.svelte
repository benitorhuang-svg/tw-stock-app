<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { slide, fade } from 'svelte/transition';

    export let symbol: string;
    export let currentPrice: number;

    let history: { time: string; price: number }[] = [];
    let meta: { prevClose: number; symbol: string } | null = null;
    let isLoading = true;
    let error = '';

    // Tooltip state
    let mouseX = -1;
    let tooltipData: { time: string; price: number } | null = null;
    let svgElement: SVGSVGElement;

    async function fetchData() {
        try {
            isLoading = true;
            error = '';
            const res = await fetch(`/api/intraday?symbol=${symbol}`);
            if (!res.ok) throw new Error(`HTTP_ERROR_${res.status}`);
            const result = await res.json();
            if (result.status === 'error') throw new Error(result.message);

            history = result.data || [];
            meta = result.meta || null;
            isLoading = false;
        } catch (e: any) {
            error = e.message;
            isLoading = false;
        }
    }

    onMount(fetchData);

    const width = 1000;
    const height = 240;

    $: prices = history.map(h => h.price);
    $: pClose = meta?.prevClose || history[0]?.price || currentPrice;
    $: rawMax = history.length > 0 ? Math.max(...prices, currentPrice) : currentPrice;
    $: rawMin = history.length > 0 ? Math.min(...prices, currentPrice) : currentPrice;

    // Symmetric range around previous close for center-aligned chart
    $: maxDev = Math.max(Math.abs(rawMax - pClose), Math.abs(pClose - rawMin), pClose * 0.002);
    $: chartMax = pClose + maxDev;
    $: chartMin = pClose - maxDev;
    $: range = chartMax - chartMin || 1;

    $: points =
        history.length > 1
            ? history
                  .map((h, i) => {
                      const x = (i / (history.length - 1)) * width;
                      const y = height - ((h.price - chartMin) / range) * height;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ')
            : '';

    $: areaPoints = points ? `${points} ${width},${height} 0,${height}` : '';
    $: prevCloseY = height - ((pClose - chartMin) / range) * height;

    // Trend coloring
    $: isUp = currentPrice >= pClose;
    $: trendColor = isUp ? 'var(--color-bullish)' : 'var(--color-bearish)';
    $: trendColorMuted = isUp ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)';

    function handleMouseMove(e: MouseEvent) {
        if (!svgElement || history.length < 2) return;
        const rect = svgElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        const index = Math.round(ratio * (history.length - 1));

        mouseX = ratio * width;
        tooltipData = history[index];
    }

    function handleMouseLeave() {
        mouseX = -1;
        tooltipData = null;
    }

    // Daily Range Percentage
    $: rangeProgress = ((currentPrice - rawMin) / (rawMax - rawMin || 1)) * 100;
    $: pCloseRatio = ((pClose - rawMin) / (rawMax - rawMin || 1)) * 100;
    $: tooltipPriceY = tooltipData ? height - ((tooltipData.price - chartMin) / range) * height : 0;

    // Floating label positions
    $: highIndex = history.findIndex(h => h.price === rawMax);
    $: highX = history.length > 0 ? (highIndex / (history.length - 1)) * width : 0;
    $: highY = height - ((rawMax - chartMin) / range) * height;

    $: lowIndex = history.findIndex(h => h.price === rawMin);
    $: lowX = history.length > 0 ? (lowIndex / (history.length - 1)) * width : 0;
    $: lowY = height - ((rawMin - chartMin) / range) * height;

    $: lastPointX = points ? parseFloat(points.split(' ').pop().split(',')[0]) : 0;
    $: lastPointY = points ? parseFloat(points.split(' ').pop().split(',')[1]) : 0;
</script>

<div
    class="relative overflow-hidden flex flex-col h-[300px] bg-gradient-to-b from-surface/40 to-surface/20 backdrop-blur-2xl border-t border-white/5 group/chart"
    transition:slide={{ duration: 400 }}
>
    <!-- The Full Expanded Chart -->
    <div
        class="flex-1 relative px-6 py-4"
        role="presentation"
        on:mousemove={handleMouseMove}
        on:mouseleave={handleMouseLeave}
    >
        {#if isLoading}
            <div class="absolute inset-0 flex items-center justify-center z-30">
                <div
                    class="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin"
                ></div>
            </div>
        {:else if error}
            <div class="absolute inset-0 flex items-center justify-center z-30 bg-bearish/5">
                <div class="text-center">
                    <div class="text-[10px] font-mono text-bearish uppercase tracking-[0.2em] mb-2">
                        Uplink_Lost
                    </div>
                    <div class="text-[8px] text-white/30 uppercase">{error}</div>
                </div>
            </div>
        {:else if history.length > 0}
            <svg
                bind:this={svgElement}
                class="w-full h-full p-0 overflow-visible z-20 cursor-crosshair"
                preserveAspectRatio="none"
                viewBox="0 0 {width} {height}"
            >
                <defs>
                    <linearGradient id="chart-grad-{symbol}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color={trendColor} stop-opacity="0.1" />
                        <stop offset="100%" stop-color={trendColor} stop-opacity="0" />
                    </linearGradient>
                </defs>

                <!-- Zero-Line Reference -->
                <line
                    x1="0"
                    y1={prevCloseY}
                    x2={width}
                    y2={prevCloseY}
                    stroke="white"
                    stroke-width="1.5"
                    stroke-opacity="0.1"
                    stroke-dasharray="10,5"
                />

                <!-- Data Trace -->
                <polyline points={areaPoints} fill="url(#chart-grad-{symbol})" />
                <polyline
                    {points}
                    fill="none"
                    stroke={trendColor}
                    stroke-width="3"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    class="drop-shadow-[0_0_12px_var(--color-accent-glow)]"
                />

                <!-- Floating Labels Inside Chart -->

                <!-- 1. Prev Close Label -->
                <!-- 1. Prev Close Label -->
                <g transform="translate({width - 100}, {prevCloseY - 12})">
                    <rect
                        width="100"
                        height="24"
                        rx="4"
                        fill="rgba(255,255,255,0.05)"
                        stroke="white"
                        stroke-opacity="0.1"
                    />
                    <text
                        x="50"
                        y="16"
                        text-anchor="middle"
                        fill="white"
                        fill-opacity="0.4"
                        font-family="var(--font-mono)"
                        font-size="10"
                        font-weight="900">昨收 {pClose.toFixed(2)}</text
                    >
                </g>

                <!-- 2. High Label -->
                <!-- 2. High Label (Right Edge) -->
                <g transform="translate({width - 100}, {highY - 12})">
                    <rect
                        width="100"
                        height="24"
                        rx="4"
                        fill="var(--color-bullish-glow)"
                        stroke="var(--color-bullish)"
                        stroke-opacity="0.3"
                    />
                    <text
                        x="50"
                        y="16"
                        text-anchor="middle"
                        fill="var(--color-bullish)"
                        font-family="var(--font-mono)"
                        font-size="10"
                        font-weight="900">最高 {rawMax.toFixed(2)}</text
                    >
                    <line
                        x1="-15"
                        y1="12"
                        x2="0"
                        y2="12"
                        stroke="var(--color-bullish)"
                        stroke-width="1"
                        stroke-dasharray="2,2"
                        stroke-opacity="0.5"
                    />
                </g>

                <!-- 4. Current Price Label (Right Edge) -->
                <g transform="translate({width - 100}, {lastPointY - 12})">
                    <rect width="100" height="24" rx="4" fill={trendColor} />
                    <text
                        x="50"
                        y="16"
                        text-anchor="middle"
                        fill="white"
                        font-family="var(--font-mono)"
                        font-size="10"
                        font-weight="900">現值 {currentPrice.toFixed(2)}</text
                    >
                    <!-- Pulse indicator -->
                    <circle cx="-5" cy="12" r="4" fill={trendColor} class="animate-pulse" />
                </g>

                <!-- Tooltip Interaction -->
                {#if mouseX >= 0}
                    <line
                        x1={mouseX}
                        y1="0"
                        x2={mouseX}
                        y2={height}
                        stroke="white"
                        stroke-width="1"
                        stroke-opacity="0.3"
                        stroke-dasharray="3,3"
                    />
                    {#if tooltipData}
                        <circle
                            cx={mouseX}
                            cy={tooltipPriceY}
                            r="5"
                            fill="white"
                            stroke={trendColor}
                            stroke-width="3"
                        />
                    {/if}
                {/if}
            </svg>

            <!-- Time Labels -->
            <div
                class="flex justify-between text-[8px] font-mono text-white/10 uppercase tracking-[0.5em] mt-2 border-t border-white/5 pt-2"
            >
                <span>09:00 market_start</span>
                <span>11:30 midpoint</span>
                <span>13:30 session_end</span>
            </div>
        {/if}
    </div>
</div>

<style>
    /* Prevent text selection during chart interaction */
    .cursor-crosshair {
        user-select: none;
    }
</style>
