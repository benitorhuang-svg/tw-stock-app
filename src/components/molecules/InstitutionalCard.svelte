<script lang="ts">
    import StreakBadge from '../atoms/StreakBadge.svelte';

    const { item, channel } = $props<{ item: any; channel: 'foreign' | 'invest' | 'dealer' }>();

    const isBuy = $derived((item[`${channel}Streak`] || 0) > 0);
    const streakAbs = $derived(Math.abs(item[`${channel}Streak`] || 0));
    const netVal = $derived(item.latest[channel] || 0);
    const fmtNet = $derived((netVal / 1000).toFixed(0) + 'K');
    const changePct = $derived(item.changePct || 0);
    const chipsIntensity = $derived(item.chipsIntensity || 0);

    let isExpanded = $state(false);

    function colorClass(v: number) {
        return v > 0 ? 'text-bullish' : v < 0 ? 'text-bearish' : 'text-text-muted';
    }

    function badgeClass(v: number) {
        return v > 0
            ? 'bg-bullish/10 text-bullish border-bullish/20'
            : v < 0
              ? 'bg-bearish/10 text-bearish border-bearish/20'
              : 'bg-surface/30 text-text-muted border-border/20';
    }
</script>

<div
    class="flex flex-col border-b border-border/10 hover:bg-surface-hover/30 transition-colors group cursor-pointer"
    onclick={() => (isExpanded = !isExpanded)}
    onkeydown={e => e.key === 'Enter' && (isExpanded = !isExpanded)}
    role="button"
    tabindex="0"
>
    <!-- Main Row -->
    <div class="flex items-center gap-4 py-2 px-3 h-12">
        <!-- Column 1: Entity Info (Code + Name) -->
        <div class="flex flex-col min-w-0 flex-1">
            <div class="flex items-baseline gap-1.5 min-w-0">
                <span
                    class="text-[11px] font-black text-text-primary group-hover:text-accent tracking-tighter transition-colors shrink-0"
                >
                    {item.symbol}
                </span>
                <span
                    class="text-[10px] font-bold text-text-muted/60 truncate opacity-40 group-hover:opacity-100 transition-opacity"
                >
                    {item.name}
                </span>
            </div>
        </div>

        <!-- Column 2: Streak Badge (Compact) -->
        <div class="flex-shrink-0 w-16 flex justify-center">
            <StreakBadge streak={item[`${channel}Streak`] || 0} size="sm" />
        </div>

        <!-- Column 3: Impact Amount & Change % -->
        <div class="flex flex-col items-end w-20 flex-shrink-0 gap-0.5">
            <span class="text-[11px] font-black font-mono {colorClass(netVal)} tracking-tighter"
                >{netVal > 0 ? '+' : ''}{fmtNet}</span
            >
            <div class="flex items-center gap-1">
                {#if changePct < 0 && chipsIntensity > 0}
                    <span
                        class="text-[7px] font-black px-1 bg-bullish/20 text-bullish rounded border border-bullish/30 animate-pulse"
                        title="Divergence: Price DOWN / Chips UP">DIVG</span
                    >
                {/if}
                {#if item.shareholderDist && item.shareholderDist.large1000 > 60}
                    <span
                        class="text-[7px] font-black px-1 bg-accent/20 text-accent rounded"
                        title="High Concentration: {item.shareholderDist.large1000.toFixed(1)}%"
                        >H_CONC</span
                    >
                {/if}
                <div
                    class="text-[8px] font-bold font-mono {colorClass(
                        changePct
                    )} tracking-tight opacity-50 group-hover:opacity-100 transition-opacity"
                >
                    {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                </div>
            </div>
        </div>

        <!-- Column 4: Chevron -->
        <div class="flex-shrink-0 w-6 flex justify-center">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-3 h-3 text-text-muted/20 group-hover:text-accent transition-all duration-300 {isExpanded
                    ? 'rotate-180'
                    : ''}"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
            >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
    </div>

    <!-- Expanded Details -->
    {#if isExpanded}
        <div class="bg-surface-hover/40 p-4 border-t border-border/20 space-y-4 animate-fade-in">
            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col p-2 bg-surface/60 rounded-lg">
                    <span class="text-[8px] font-mono text-text-muted uppercase">Latest_Price</span>
                    <span class="text-sm font-black font-mono text-text-primary"
                        >{item.latest.price?.toFixed(2) || '—'}</span
                    >
                </div>
                <div class="flex flex-col p-2 bg-surface/60 rounded-lg">
                    <span class="text-[8px] font-mono text-text-muted uppercase"
                        >Intensity_Index</span
                    >
                    <span class="text-sm font-black font-mono text-accent"
                        >{(chipsIntensity / 1000).toFixed(1)}K</span
                    >
                </div>
            </div>

            <!-- Forensic Deep Dive Panel -->
            <div
                class="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-surface/40 border border-border/20 rounded"
            >
                <div class="flex flex-col">
                    <span
                        class="text-[9px] text-text-muted uppercase font-bold tracking-widest mb-1"
                        >Concentration</span
                    >
                    <div class="flex items-baseline gap-1">
                        <span class="text-sm font-black font-mono"
                            >{(item.shareholderDist?.large1000 || 0).toFixed(1)}%</span
                        >
                        <span class="text-[8px] text-text-muted">L_1000</span>
                    </div>
                </div>

                <div class="flex flex-col">
                    <span
                        class="text-[9px] text-text-muted uppercase font-bold tracking-widest mb-1"
                        >Gov_Activity</span
                    >
                    <div class="flex items-baseline gap-1">
                        <span
                            class="text-sm font-black font-mono {item.government?.netAmount &&
                            item.government.netAmount > 0
                                ? 'text-up'
                                : 'text-down'}"
                        >
                            {item.government?.netAmount
                                ? (item.government.netAmount / 1000).toFixed(1)
                                : '0.0'}M
                        </span>
                        <span class="text-[8px] text-text-muted">NET_AMT</span>
                    </div>
                </div>

                <div class="flex flex-col">
                    <span
                        class="text-[9px] text-text-muted uppercase font-bold tracking-widest mb-1"
                        >Main_Broker</span
                    >
                    <div class="flex items-baseline gap-1">
                        <span class="text-sm font-black font-mono"
                            >{(item.brokerChip?.concentration || 0).toFixed(1)}%</span
                        >
                        <span class="text-[8px] text-text-muted">B_CONC</span>
                    </div>
                </div>

                <div class="flex flex-col">
                    <span
                        class="text-[9px] text-text-muted uppercase font-bold tracking-widest mb-1"
                        >Retail_Ratio</span
                    >
                    <div class="flex items-baseline gap-1">
                        <span class="text-sm font-black font-mono"
                            >{(item.shareholderDist?.small10 || 0).toFixed(1)}%</span
                        >
                        <span class="text-[8px] text-text-muted">UNDER_10</span>
                    </div>
                </div>

                <!-- Row 2: Professional Risk & Flow -->
                <div class="flex flex-col">
                    <span
                        class="text-[9px] text-text-muted uppercase font-bold tracking-widest mb-1"
                        >Pledge_Risk</span
                    >
                    <div class="flex items-baseline gap-1">
                        <span
                            class="text-sm font-black font-mono {item.director?.pawn > 20
                                ? 'text-bearish'
                                : 'text-text-muted'}"
                        >
                            {item.director?.pawn.toFixed(1)}%
                        </span>
                        <span class="text-[8px] text-text-muted">PAWN</span>
                    </div>
                </div>

                <div class="flex flex-col">
                    <span
                        class="text-[9px] text-text-muted uppercase font-bold tracking-widest mb-1"
                        >Short_Debt</span
                    >
                    <div class="flex items-baseline gap-1">
                        <span class="text-sm font-black font-mono text-text-primary/80">
                            {((item.lending?.shorting || 0) / 1000).toFixed(1)}K
                        </span>
                        <span class="text-[8px] text-text-muted">LEND_SEL</span>
                    </div>
                </div>

                <div class="flex flex-col">
                    <span
                        class="text-[9px] text-text-muted uppercase font-bold tracking-widest mb-1"
                        >Dealer_Prop</span
                    >
                    <div class="flex items-baseline gap-1">
                        <span
                            class="text-sm font-black font-mono {colorClass(
                                item.dealerDet?.prop || 0
                            )}"
                        >
                            {((item.dealerDet?.prop || 0) / 1000).toFixed(1)}K
                        </span>
                        <span class="text-[8px] text-text-muted">ACTIVE</span>
                    </div>
                </div>

                <div class="flex flex-col">
                    <span
                        class="text-[9px] text-text-muted uppercase font-bold tracking-widest mb-1"
                        >Dealer_Hedge</span
                    >
                    <div class="flex items-baseline gap-1">
                        <span class="text-sm font-black font-mono text-text-muted/40">
                            {((item.dealerDet?.hedge || 0) / 1000).toFixed(1)}K
                        </span>
                        <span class="text-[8px] text-text-muted">PASSIVE</span>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between gap-4">
                <div class="flex gap-4">
                    <div class="flex flex-col">
                        <span class="text-[7px] font-mono text-text-muted/40 uppercase">Open</span>
                        <span class="text-[10px] font-black text-text-muted/60"
                            >{item.latest.open?.toFixed(1) || '—'}</span
                        >
                    </div>
                    <div class="flex flex-col">
                        <span
                            class="text-[7px] font-mono text-text-muted/40 uppercase text-bullish/60"
                            >High</span
                        >
                        <span class="text-[10px] font-black text-bullish/40"
                            >{item.latest.high?.toFixed(1) || '—'}</span
                        >
                    </div>
                    <div class="flex flex-col">
                        <span
                            class="text-[7px] font-mono text-text-muted/40 uppercase text-bearish/60"
                            >Low</span
                        >
                        <span class="text-[10px] font-black text-bearish/40"
                            >{item.latest.low?.toFixed(1) || '—'}</span
                        >
                    </div>
                </div>

                <a
                    href="/stocks/{item.symbol}"
                    class="h-7 px-4 bg-accent/20 border border-accent/40 rounded-full text-[9px] font-black text-accent hover:bg-accent hover:text-on-accent transition-all no-underline flex items-center gap-2"
                    onclick={e => e.stopPropagation()}
                >
                    FORENSIC_DEEP_DIVE
                    <svg
                        class="w-2.5 h-2.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                    >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </a>
            </div>
        </div>
    {/if}
</div>
