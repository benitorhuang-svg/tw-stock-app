<script lang="ts">
    export let up = 0;
    export let down = 0;
    export let flat = 0;
    export let total = 0;

    $: pctUp = total > 0 ? (up / total) * 100 : 0;
    $: pctDown = total > 0 ? (down / total) * 100 : 0;
    $: pctFlat = total > 0 ? (flat / total) * 100 : 0;
</script>

<div class="market-breadth-molecule flex items-center gap-2.5 w-full py-1">
    <!-- Range Anchor: Down (Left) -->
    <span
        class="text-[10px] font-mono font-black text-bearish/90 min-w-[24px] text-right"
        id="breadth-range-down">{down}</span
    >

    <!-- Bar Engine -->
    <div
        class="relative flex-1 h-1.5 min-w-[120px] rounded-full bg-glass-elevated border border-border overflow-hidden flex shadow-inner group/breadth"
    >
        <div
            id="breadth-bar-down"
            class="h-full bg-bearish transition-all duration-700 ease-out relative z-10"
            style="width: {pctDown}%"
        >
            <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>

        <div
            id="breadth-bar-flat"
            class="h-full bg-slate-600/40 transition-all duration-700 ease-out"
            style="width: {pctFlat}%"
        ></div>

        <div
            id="breadth-bar-up"
            class="h-full bg-bullish transition-all duration-700 ease-out relative z-10"
            style="width: {pctUp}%"
        >
            <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>

        <!-- Center Divider -->
        <div class="absolute left-1/2 top-0 bottom-0 w-[1px] bg-border z-20"></div>
    </div>

    <!-- Range Anchor: Up (Right) -->
    <span
        class="text-[10px] font-mono font-black text-bullish/90 min-w-[24px]"
        id="breadth-range-up">{up}</span
    >
</div>
