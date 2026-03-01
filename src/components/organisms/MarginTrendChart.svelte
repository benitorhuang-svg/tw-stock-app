<script lang="ts">
    // Real margin/short data via props
    interface MarginPoint {
        date: string;
        margin: number;
        short: number;
        ratio: number;
    }

    let { data = [] }: { data: MarginPoint[] } = $props();

    const hasData = $derived(data.length >= 2);

    const width = 800;
    const height = 250;
    const padding = 30;

    const maxMargin = $derived(hasData ? Math.max(...data.map(d => d.margin)) || 1 : 1);
    const maxShort = $derived(hasData ? Math.max(...data.map(d => d.short)) || 1 : 1);
    const maxRatio = $derived(hasData ? Math.max(...data.map(d => d.ratio)) || 1 : 1);

    function x(i: number) {
        return padding + (i * (width - 2 * padding)) / (data.length - 1 || 1);
    }

    function yMargin(val: number) {
        return height - padding - (val / maxMargin) * (height - 2 * padding);
    }

    function yShort(val: number) {
        return height - padding - (val / maxShort) * (height - 2 * padding);
    }

    function yRatio(val: number) {
        return height - padding - (val / maxRatio) * (height - 2 * padding);
    }

    const pathMargin = $derived(hasData
        ? `M ${x(0)} ${yMargin(data[0].margin)} ` +
          data.map((d, i) => `L ${x(i)} ${yMargin(d.margin)}`).slice(1).join(' ')
        : '');
    const pathShort = $derived(hasData
        ? `M ${x(0)} ${yShort(data[0].short)} ` +
          data.map((d, i) => `L ${x(i)} ${yShort(d.short)}`).slice(1).join(' ')
        : '');
    const pathRatio = $derived(hasData
        ? `M ${x(0)} ${yRatio(data[0].ratio)} ` +
          data.map((d, i) => `L ${x(i)} ${yRatio(d.ratio)}`).slice(1).join(' ')
        : '');
</script>

<div
    class="margin-trend-organism bg-surface-deep/40 rounded-3xl border border-border/30 p-6 mb-8 backdrop-blur-xl shadow-2xl relative group"
>
    <div class="flex items-center justify-between mb-6">
        <div>
            <h3
                class="text-xs font-black text-text-primary tracking-[0.2em] uppercase flex items-center gap-2"
            >
                <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
                Margin_Short_Trendline
            </h3>
            <p class="text-[9px] font-mono text-text-muted/50 mt-1 uppercase tracking-widest">
                Retail_Leverage_Force ??Alpha_Detection
            </p>
        </div>

        <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
                <div class="w-3 h-[2px] bg-bearish"></div>
                <span class="text-[8px] font-mono font-black text-text-muted uppercase">Margin</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="w-3 h-[2px] bg-bullish"></div>
                <span class="text-[8px] font-mono font-black text-text-muted uppercase">Short</span>
            </div>
            <div class="flex items-center gap-2">
                <div
                    class="w-3 h-[2px] bg-yellow-400 border-t border-dashed border-yellow-400"
                ></div>
                <span class="text-[8px] font-mono font-black text-text-muted uppercase">Ratio_%</span>
            </div>
        </div>
    </div>

    <div class="h-[200px] w-full">
        <svg viewBox="0 0 {width} {height}" class="w-full h-full overflow-visible">
            <path
                d={pathMargin}
                fill="none"
                stroke="var(--color-bearish)"
                stroke-width="2"
                stroke-opacity="0.6"
            />
            <path
                d={pathShort}
                fill="none"
                stroke="var(--color-bullish)"
                stroke-width="2"
                stroke-opacity="0.6"
            />
            <path
                d={pathRatio}
                fill="none"
                stroke="var(--color-yellow-400)"
                stroke-width="2"
                stroke-dasharray="4"
            />

            {#each data as d, i}
                {#if i % 4 === 0}
                    <text
                        x={x(i)}
                        y={height - 5}
                        text-anchor="middle"
                        class="text-[9px] font-mono fill-white/10">{d.date}</text
                    >
                {/if}
            {/each}
        </svg>
    </div>
</div>
