<script lang="ts">
    interface Props {
        up?: number;
        down?: number;
        flat?: number;
        total?: number;
    }

    let {
        up = 0,
        down = 0,
        flat = 0,
        total = 0
    }: Props = $props();

    let pctUp = $derived(total > 0 ? (up / total) * 100 : 0);
    let pctDown = $derived(total > 0 ? (down / total) * 100 : 0);
    let pctFlat = $derived(total > 0 ? (flat / total) * 100 : 0);

    let dominance = $derived(up > down ? 'BULLISH' : down > up ? 'BEARISH' : 'NEUTRAL');
    let domColor =
        $derived(dominance === 'BULLISH'
            ? 'var(--color-bullish)'
            : dominance === 'BEARISH'
              ? 'var(--color-bearish)'
              : 'var(--color-text-muted)');
</script>

<div class="market-breadth-molecule flex flex-col gap-1.5 w-full min-w-[200px] py-1 group/breadth">
    <!-- Header: Status & Ratio -->
    <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
            <div
                class="w-1.5 h-1.5 rounded-full animate-pulse"
                style="background: {domColor}"
            ></div>
            <span class="text-[9px] font-black font-mono tracking-[0.2em] opacity-50 uppercase"
                >Market_Breadth</span
            >
        </div>
        <div class="flex items-center gap-1.5 font-mono text-[9px] font-black">
            <span class="text-bullish">{up}</span>
            <span class="opacity-20">/</span>
            <span class="text-bearish">{down}</span>
        </div>
    </div>

    <!-- Power Bar Engine -->
    <div
        class="relative h-2.5 w-full rounded-md bg-stone-900/50 border border-white/5 overflow-hidden flex shadow-2xl"
    >
        <!-- Bearish Side -->
        <div
            class="h-full bg-bearish/80 transition-all duration-1000 ease-out relative group-hover/breadth:brightness-125"
            style="width: {pctDown}%"
        >
            <div class="absolute inset-0 bg-gradient-to-r from-transparent to-black/30"></div>
            {#if pctDown > 15}
                <span
                    class="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-white/40"
                    >{Math.round(pctDown)}%</span
                >
            {/if}
        </div>

        <!-- Neutral Zone -->
        <div
            class="h-full bg-white/5 transition-all duration-1000 ease-out"
            style="width: {pctFlat}%"
        ></div>

        <!-- Bullish Side -->
        <div
            class="h-full bg-bullish/80 transition-all duration-1000 ease-out relative group-hover/breadth:brightness-125"
            style="width: {pctUp}%"
        >
            <div class="absolute inset-0 bg-gradient-to-l from-transparent to-black/30"></div>
            {#if pctUp > 15}
                <span
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-white/40"
                    >{Math.round(pctUp)}%</span
                >
            {/if}
        </div>

        <!-- Center Equator -->
        <div
            class="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20 z-20 shadow-[0_0_10px_rgba(255,255,255,0.3)]"
        ></div>

        <!-- Glow Overlay -->
        <div
            class="absolute inset-0 pointer-events-none bg-gradient-to-t from-white/5 to-transparent"
        ></div>
    </div>

    <!-- Pulse Line (Optional Aesthetic) -->
    <div class="h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
</div>

<style>
    .market-breadth-molecule {
        filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.5));
    }
</style>
