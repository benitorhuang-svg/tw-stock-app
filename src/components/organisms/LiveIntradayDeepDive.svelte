<script lang="ts">
    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';

    export let symbol: string;
    export let currentPrice: number;

    let history: { time: number; price: number; volume: number }[] = [];
    let meta: { prevClose: number; symbol: string } | null = null;
    let isLoading = true;
    let error = '';

    // Tooltip state
    let mouseX = -1;
    let tooltipData: { time: number; price: number; volume: number } | null = null;
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
        } catch (e: any) {
            error = e.message;
        } finally {
            isLoading = false;
        }
    }

    onMount(fetchData);

    const W = 1000;
    const H = 220; // Reduced H slightly to give more room for labels

    // ─── Derived values ────
    $: prices = history.map(h => h.price);
    $: pClose = meta?.prevClose || history[0]?.price || currentPrice;

    $: rawMax =
        history.length > 0
            ? prices.reduce((mx, p) => (p > mx ? p : mx), Math.max(prices[0], currentPrice))
            : currentPrice;
    $: rawMin =
        history.length > 0
            ? prices.reduce((mn, p) => (p < mn ? p : mn), Math.min(prices[0], currentPrice))
            : currentPrice;

    $: maxVolume = history.reduce((max, h) => (h.volume > max ? h.volume : max), 1);

    $: minDev = pClose * 0.005;
    $: maxDev = Math.max(Math.abs(rawMax - pClose), Math.abs(pClose - rawMin), minDev);
    $: chartMax = pClose + maxDev;
    $: chartMin = pClose - maxDev;
    $: range = chartMax - chartMin || 1;

    const PAD_T = 30; // More top padding for labels
    const PAD_B = 20; // More bottom padding for axis
    const DRAW_H = H - PAD_T - PAD_B;

    $: sessionBounds = (() => {
        if (history.length === 0) return null;
        const d = new Date(history[0].time);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 13, 30, 0, 0);
        return { start: start.getTime(), end: end.getTime() };
    })();

    $: pointCoords = sessionBounds
        ? history.map(h => ({
              x: ((h.time - sessionBounds.start) / (sessionBounds.end - sessionBounds.start)) * W,
              y: PAD_T + (DRAW_H - ((h.price - chartMin) / range) * DRAW_H),
          }))
        : [];

    $: points = pointCoords.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    $: areaPoints =
        pointCoords.length > 0
            ? `${points} ${lastPt.x.toFixed(1)},${H} ${pointCoords[0].x.toFixed(1)},${H}`
            : '';

    $: prevCloseY = PAD_T + (DRAW_H - ((pClose - chartMin) / range) * DRAW_H);
    $: lastPt = pointCoords.length > 0 ? pointCoords[pointCoords.length - 1] : { x: 0, y: 0 };
    $: isUp = currentPrice >= pClose;
    $: trendColor = isUp ? 'var(--color-bullish)' : 'var(--color-bearish)';
    $: highY = PAD_T + (DRAW_H - ((rawMax - chartMin) / range) * DRAW_H);
    $: tooltipPriceY = tooltipData
        ? PAD_T + (DRAW_H - ((tooltipData.price - chartMin) / range) * DRAW_H)
        : 0;

    $: timeTicks = (() => {
        if (!sessionBounds) return [];
        const baseDate = new Date(sessionBounds.start);
        const Y = baseDate.getFullYear(),
            M = baseDate.getMonth(),
            D = baseDate.getDate();
        const marks = [
            { h: 9, m: 0 },
            { h: 10, m: 0 },
            { h: 11, m: 0 },
            { h: 12, m: 0 },
            { h: 13, m: 0 },
            { h: 13, m: 30 },
        ];
        return marks.map(m => {
            const time = new Date(Y, M, D, m.h, m.m, 0, 0).getTime();
            return {
                x: ((time - sessionBounds.start) / (sessionBounds.end - sessionBounds.start)) * W,
                label: `${m.h.toString().padStart(2, '0')}:${m.m.toString().padStart(2, '0')}`,
            };
        });
    })();

    function formatTime(ms: number | string) {
        const d = new Date(ms);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }

    function handleMouseMove(e: MouseEvent) {
        if (!svgElement || history.length < 1 || !sessionBounds) return;
        const rect = svgElement.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const targetTime = sessionBounds.start + ratio * (sessionBounds.end - sessionBounds.start);
        let closest = history[0],
            minDiff = Math.abs(history[0].time - targetTime);
        for (let i = 1; i < history.length; i++) {
            const diff = Math.abs(history[i].time - targetTime);
            if (diff < minDiff) {
                minDiff = diff;
                closest = history[i];
            }
        }
        mouseX =
            ((closest.time - sessionBounds.start) / (sessionBounds.end - sessionBounds.start)) * W;
        tooltipData = closest;
    }

    function handleMouseLeave() {
        mouseX = -1;
        tooltipData = null;
    }
</script>

<div
    class="chart-container relative overflow-visible flex flex-col min-h-[300px] bg-[#0a0c10] border-y border-border/40 select-none pb-4"
    transition:slide={{ duration: 400 }}
>
    <!-- Background Symbol Watermark -->
    <div
        class="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden"
    >
        <span class="text-[280px] font-black tracking-tighter transform -rotate-12 translate-y-4">
            {meta?.symbol?.split('.')[0] || symbol}
        </span>
    </div>

    <div
        class="flex-1 relative px-4 mt-6 mb-8"
        role="presentation"
        on:mousemove={handleMouseMove}
        on:mouseleave={handleMouseLeave}
    >
        {#if isLoading}
            <div class="absolute inset-0 flex items-center justify-center z-40">
                <div class="flex flex-col items-center">
                    <div
                        class="w-12 h-12 border-2 border-accent/20 border-t-accent rounded-full animate-spin mb-4"
                    ></div>
                    <div
                        class="text-[10px] font-mono text-accent tracking-[0.5em] uppercase animate-pulse"
                    >
                        Establishing_Uplink
                    </div>
                </div>
            </div>
        {:else if error}
            <div class="absolute inset-0 flex items-center justify-center z-40 bg-bearish/5">
                <div
                    class="text-center p-10 rounded-3xl border border-bearish/20 bg-base-deep/40 backdrop-blur-xl"
                >
                    <div class="text-3xl mb-3">📡</div>
                    <div
                        class="text-[10px] font-mono text-bearish uppercase tracking-[0.3em] mb-2 font-black"
                    >
                        Connection_Terminated
                    </div>
                    <div class="text-[10px] text-text-muted uppercase font-mono">{error}</div>
                </div>
            </div>
        {:else if history.length > 0}
            <svg
                bind:this={svgElement}
                class="w-full h-full overflow-visible z-20 cursor-crosshair"
                preserveAspectRatio="none"
                viewBox="0 0 {W} {H}"
            >
                <defs>
                    <linearGradient id="cg-{symbol}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color={trendColor} stop-opacity="0.2" />
                        <stop offset="100%" stop-color={trendColor} stop-opacity="0" />
                    </linearGradient>
                </defs>
                <!-- Grid -->
                <line
                    x1="0"
                    y1={PAD_T}
                    x2={W}
                    y2={PAD_T}
                    stroke="white"
                    stroke-opacity="0.03"
                    stroke-width="1"
                />
                <line
                    x1="0"
                    y1={H}
                    x2={W}
                    y2={H}
                    stroke="white"
                    stroke-opacity="0.03"
                    stroke-width="1"
                />

                {#each timeTicks as tick}
                    <line
                        x1={tick.x}
                        y1={PAD_T}
                        x2={tick.x}
                        y2={H}
                        stroke="white"
                        stroke-width="1"
                        stroke-opacity="0.04"
                    />
                    <text
                        x={tick.x}
                        y={H + 25}
                        text-anchor="middle"
                        fill="white"
                        fill-opacity="0.2"
                        font-family="var(--font-mono)"
                        font-size="10"
                        font-weight="900">{tick.label}</text
                    >
                {/each}

                <!-- Volume (Background) -->
                {#each history as h, i}
                    {@const barHeight = (h.volume / maxVolume) * 50}
                    <rect
                        x={pointCoords[i].x - (W / 270) * 0.45}
                        y={H - barHeight}
                        width={(W / 270) * 0.9}
                        height={barHeight}
                        fill={trendColor}
                        fill-opacity="0.3"
                    />
                {/each}

                <!-- Reference Lines -->
                <line
                    x1="0"
                    y1={prevCloseY}
                    x2={W}
                    y2={prevCloseY}
                    stroke="white"
                    stroke-opacity="0.08"
                    stroke-width="1.5"
                    stroke-dasharray="10,5"
                />

                <!-- Price Area & Line (Clean Technical Look) -->
                <polyline points={areaPoints} fill="url(#cg-{symbol})" />
                <polyline
                    {points}
                    fill="none"
                    stroke={trendColor}
                    stroke-width="2.5"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                />

                <!-- Labels -->
                <g transform="translate({W - 120}, {prevCloseY - 15})">
                    <rect
                        width="120"
                        height="30"
                        rx="2"
                        fill="#050505"
                        stroke="white"
                        stroke-opacity="0.1"
                    />
                    <text
                        x="60"
                        y="20"
                        text-anchor="middle"
                        fill="white"
                        fill-opacity="0.4"
                        font-family="var(--font-mono)"
                        font-size="11"
                        font-weight="900">REF {pClose.toFixed(2)}</text
                    >
                </g>

                <text
                    x={W - 10}
                    y={highY - 12}
                    text-anchor="end"
                    fill="var(--color-bullish)"
                    fill-opacity="0.4"
                    font-family="var(--font-mono)"
                    font-size="10"
                    font-weight="900">MAX_{rawMax.toFixed(2)}</text
                >

                <g transform="translate({lastPt.x}, {lastPt.y})">
                    <circle r="3.5" fill={trendColor} stroke="white" stroke-width="1.5" />
                </g>

                <!-- Crosshair -->
                {#if mouseX >= 0 && tooltipData}
                    <line
                        x1={mouseX}
                        y1="0"
                        x2={mouseX}
                        y2={H + 30}
                        stroke="white"
                        stroke-opacity="0.2"
                        stroke-width="1"
                        stroke-dasharray="4,4"
                    />
                    <circle
                        cx={mouseX}
                        cy={tooltipPriceY}
                        r="7"
                        fill="white"
                        stroke={trendColor}
                        stroke-width="4"
                        class="drop-shadow-2xl"
                    />

                    <!-- Unified Floating Data Card -->
                    {@const isOnRight = mouseX > W - 120}
                    <g
                        transform="translate({isOnRight
                            ? mouseX - 115
                            : mouseX + 15}, {tooltipPriceY - 40})"
                    >
                        <rect
                            width="100"
                            height="44"
                            rx="4"
                            fill="#14161a"
                            stroke="white"
                            stroke-opacity="0.1"
                            class="drop-shadow-2xl"
                        />
                        <!-- Status Accent -->
                        <rect width="3" height="44" rx="1.5" fill={trendColor} />

                        <text
                            x="10"
                            y="16"
                            fill="white"
                            fill-opacity="0.4"
                            font-family="var(--font-mono)"
                            font-size="9"
                            font-weight="900"
                            letter-spacing="1px"
                        >
                            TIME: {formatTime(tooltipData.time)}
                        </text>
                        <text
                            x="10"
                            y="32"
                            fill="white"
                            font-family="var(--font-mono)"
                            font-size="14"
                            font-weight="900"
                        >
                            {tooltipData.price.toFixed(2)}
                        </text>
                    </g>
                {/if}
            </svg>
        {/if}
    </div>
</div>

<style>
    .chart-container {
        contain: layout style;
        background:
            radial-gradient(
                circle at 50% -100%,
                rgba(var(--color-accent-rgb), 0.1),
                transparent 80%
            ),
            #0a0c10;
        --bullish-rgb: 239, 68, 68;
        --bearish-rgb: 34, 197, 94;
    }
</style>
