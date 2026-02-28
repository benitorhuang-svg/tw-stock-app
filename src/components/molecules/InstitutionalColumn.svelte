<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';
    import InstitutionalCard from './InstitutionalCard.svelte';

    const {
        title,
        subtitle,
        colorClasses = '',
        dotColorClass = '',
        data = [],
        isLoading = false,
        channel,
        scanText = 'SYNCHING Vector...',
    } = $props<{
        title: string;
        subtitle: string;
        colorClasses?: string;
        dotColorClass?: string;
        data?: any[];
        isLoading?: boolean;
        channel: 'foreign' | 'invest' | 'dealer';
        scanText?: string;
    }>();

    const filteredData = $derived.by(() => {
        return (data || []).filter((item: any) => {
            const matchesSearch =
                !marketStore.searchKeyword ||
                item.symbol.toLowerCase().includes(marketStore.searchKeyword.toLowerCase()) ||
                item.name?.toLowerCase().includes(marketStore.searchKeyword.toLowerCase());

            const matchesMarket =
                !marketStore.filterMarket ||
                (item as any)._market === marketStore.filterMarket.toUpperCase();

            const matchesDivergence =
                !marketStore.filterDivergence || (item.changePct < 0 && item.chipsIntensity > 0);

            return matchesSearch && matchesMarket && matchesDivergence;
        });
    });
</script>

<div
    class="flex flex-col bg-surface/40 rounded-xl border border-border shadow-elevated h-full transition-all duration-500 hover:border-accent/15 group"
>
    <!-- Header: Table-like Header -->
    <header class="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/30">
        <div class="flex flex-col gap-1">
            <h3
                class="text-xs font-black text-text-primary/90 tracking-[0.2em] uppercase flex items-center gap-2"
            >
                <span class="w-1.5 h-1.5 rounded-full {dotColorClass} animate-pulse"></span>
                {title}
            </h3>
            <span class="text-[9px] font-mono text-text-muted/30 uppercase tracking-widest"
                >{subtitle}</span
            >
        </div>

        <div class="flex flex-col items-end">
            <span class="text-[10px] font-mono text-text-muted/40 font-black tracking-tighter">
                {isLoading
                    ? 'SYNC...'
                    : `${filteredData.length.toString().padStart(3, '0')}/${data.length.toString().padStart(3, '0')}_CHANNELS`}
            </span>
        </div>
    </header>

    <!-- Table Header (Sticky) -->
    <div
        class="sticky top-0 z-20 flex items-center gap-4 px-3 py-2 bg-elevated border-b border-border text-[8px] font-black text-text-muted/20 uppercase tracking-[0.2em] shadow-sm"
    >
        <div class="flex-1 text-left px-3">Entity</div>
        <div class="w-16 text-center">Streak_D</div>
        <div class="w-20 text-right px-3">Net_Vol</div>
        <div class="w-6"></div>
    </div>

    <!-- Data List: Pure High-Density -->
    <div class="flex-1 overflow-y-auto custom-scrollbar">
        {#if isLoading}
            <div class="flex flex-col items-center justify-center py-20 gap-4 opacity-10">
                <div
                    class="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin"
                ></div>
                <span class="text-[9px] font-mono tracking-widest uppercase">{scanText}</span>
            </div>
        {:else if filteredData.length === 0}
            <div class="flex flex-col items-center justify-center py-20 opacity-5 gap-3">
                <span class="text-[8px] font-mono tracking-[0.4em] uppercase">NO_SIGNAL</span>
            </div>
        {:else}
            <div class="divide-y divide-border/20">
                {#each filteredData as item (item.symbol)}
                    <InstitutionalCard {item} {channel} />
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    /* Sleek Thin Scrollbar */
    .custom-scrollbar::-webkit-scrollbar {
        width: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: var(--color-scrollbar, rgba(128, 128, 128, 0.15));
        border-radius: 10px;
    }
</style>
