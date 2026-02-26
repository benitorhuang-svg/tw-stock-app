<script lang="ts">
    export let item: any;
    export let channel: 'foreign' | 'invest' | 'dealer';

    $: isBuy = (item[`${channel}Streak`] || 0) > 0;
    $: streakAbs = Math.abs(item[`${channel}Streak`] || 0);
    $: netVal = item.latest[channel] || 0;
    $: fmtNet = (netVal / 1000).toFixed(1) + 'K';

    // Formatting for turnover
    $: fmtTurnover =
        item.turnover > 1000
            ? (item.turnover / 1000).toFixed(1) + 'B'
            : item.turnover.toFixed(0) + 'M';
</script>

<a
    href="/stocks/{item.symbol}"
    class="group relative block p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 no-underline overflow-hidden"
>
    <!-- Accent Indicator -->
    <div
        class="absolute top-0 left-0 w-1 h-full opacity-40 group-hover:opacity-100 transition-opacity {isBuy
            ? 'bg-bullish'
            : 'bg-bearish'}"
    ></div>

    <!-- Header Section -->
    <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
            <span
                class="text-sm font-black text-white group-hover:text-accent transition-colors tracking-tighter"
            >
                {item.symbol}
            </span>
            <span class="text-[10px] font-mono text-white/30 uppercase truncate max-w-[80px]">
                {item.name}
            </span>
        </div>
        <div
            class="px-2 py-0.5 rounded text-[9px] font-black font-mono border {isBuy
                ? 'border-bullish/20 bg-bullish/10 text-bullish shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                : 'border-bearish/20 bg-bearish/10 text-bearish shadow-[0_0_15px_rgba(239,68,68,0.1)]'}"
        >
            {streakAbs}D {isBuy ? 'ACCUM' : 'DUMP'}
        </div>
    </div>

    <!-- Quantum Insights Row -->
    <div class="grid grid-cols-4 gap-2 mb-4 pb-4 border-b border-white/5 font-mono">
        <div class="flex flex-col">
            <span class="text-[7px] text-white/30 uppercase tracking-tighter">Momentum</span>
            <span
                class="text-[9px] font-black {item.changePct >= 0
                    ? 'text-bullish'
                    : 'text-bearish'}"
            >
                {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(1)}%
            </span>
        </div>
        <div class="flex flex-col">
            <span class="text-[7px] text-white/30 uppercase tracking-tighter">Turnover</span>
            <span class="text-[9px] font-black text-white/80">
                {fmtTurnover}
            </span>
        </div>
        <div class="flex flex-col">
            <span class="text-[7px] text-white/30 uppercase tracking-tighter">Volume</span>
            <span class="text-[9px] font-black text-white/80">
                {(item.volume / 1000).toFixed(0)}K
            </span>
        </div>
        <div class="flex flex-col">
            <span class="text-[7px] text-white/30 uppercase tracking-tighter">Intensity</span>
            <span
                class="text-[9px] font-black {item.chipsIntensity >= 0
                    ? 'text-accent'
                    : 'text-bearish/70'}"
            >
                {item.chipsIntensity > 0 ? '+' : ''}{(item.chipsIntensity / 1000).toFixed(1)}K
            </span>
        </div>
    </div>

    <!-- Bottom Action Row -->
    <div class="flex items-end justify-between">
        <div>
            <div class="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1">
                Impact_Magnitude
            </div>
            <div
                class="text-sm font-mono font-bold {netVal >= 0 ? 'text-bullish' : 'text-bearish'}"
            >
                {netVal >= 0 ? '+' : ''}{fmtNet}
            </div>
        </div>
        <div
            class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 text-white/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                    d="M9 5l7 7-7 7"
                />
            </svg>
        </div>
    </div>
</a>
