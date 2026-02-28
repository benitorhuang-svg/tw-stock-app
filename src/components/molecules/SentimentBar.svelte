<script lang="ts">
    /**
     * SentimentBar.svelte - Molecule for Market Breadth / Sentiment visualization
     * Part of Atomic Design: Molecules
     */
    interface Props {
        up: number;
        down: number;
        flat: number;
        ratio: string;
    }

    let { up, down, flat, ratio }: Props = $props();

    let total = $derived(up + down + flat);
    let barUp = $derived(total > 0 ? (up / total) * 100 : 0);
    let barDown = $derived(total > 0 ? (down / total) * 100 : 0);
    let barFlat = $derived(total > 0 ? (flat / total) * 100 : 0);

    let ratioColor = $derived.by(() => {
        if (ratio === 'MAX') return 'text-bullish';
        const r = parseFloat(ratio);
        if (r > 1) return 'text-bullish';
        if (r < 1) return 'text-bearish';
        return 'text-text-primary';
    });
</script>

<div class="flex flex-col gap-3.5">
    <!-- Top: Ratio -->
    <div class="flex items-baseline gap-2">
        <span class="text-xs font-mono font-bold text-text-muted/60 tracking-wider">多空比</span>
        <span
            class="text-4xl font-mono font-black {ratioColor} tracking-tighter drop-shadow-sm leading-none"
            >{ratio}</span
        >
    </div>

    <!-- Bottom: Bar & Labels -->
    <div class="w-full flex flex-col gap-1.5">
        <div
            class="h-6 w-full bg-surface-hover/20 rounded-lg overflow-hidden flex text-[10px] font-mono font-black text-text-primary shadow-inner border border-border/10"
        >
            <!-- 下跌 on the Left (Down/Bearish) -->
            <div
                class="h-full bg-bearish flex items-center justify-center shadow-[inset_-2px_0_10px_rgba(0,0,0,0.1)] transition-all duration-500"
                style="width: {barDown}%"
            >
                {#if down > 0}<span
                        class="drop-shadow-sm font-black text-white whitespace-nowrap overflow-hidden text-ellipsis px-1"
                        >{down}</span
                    >{/if}
            </div>
            <!-- 平盤 in the middle -->
            <div
                class="h-full bg-surface/30 flex items-center justify-center text-text-muted font-black"
                style="width: {barFlat}%"
            >
                {#if flat > 0}
                    <span class="whitespace-nowrap overflow-hidden text-ellipsis px-1">{flat}</span>
                {/if}
            </div>
            <!-- 上漲 on the Right (Up/Bullish) -->
            <div
                class="h-full bg-bullish flex items-center justify-center shadow-[inset_2px_0_10px_rgba(0,0,0,0.1)] transition-all duration-500"
                style="width: {barUp}%"
            >
                {#if up > 0}<span
                        class="drop-shadow-sm font-black text-white whitespace-nowrap overflow-hidden text-ellipsis px-1"
                        >{up}</span
                    >{/if}
            </div>
        </div>
        <div class="flex justify-between items-center px-0.5">
            <span class="text-[9px] font-black text-text-muted/60 tracking-wider"
                >下跌 ( BEAR )</span
            >
            <span class="text-[9px] font-black text-text-muted/50 tracking-wider">平盤</span>
            <span class="text-[9px] font-black text-text-muted/60 tracking-wider text-right"
                >上漲 ( BULL )</span
            >
        </div>
    </div>
</div>
