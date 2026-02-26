<script lang="ts">
    import InstitutionalCard from './InstitutionalCard.svelte';

    export let title: string;
    export let subtitle: string;
    export let colorClasses: string; // e.g. "from-bullish/10 border-bullish/20"
    export let dotColorClass: string; // e.g. "bg-bullish"
    export let data: any[] = [];
    export let isLoading = false;
    export let channel: 'foreign' | 'invest' | 'dealer';
    export let scanText = 'SCANNING...';
</script>

<section
    class="flex flex-col bg-surface-deep/40 rounded-[2rem] border border-white/5 overflow-hidden backdrop-blur-sm group {colorClasses} transition-all duration-500"
>
    <header
        class="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r {colorClasses} to-transparent"
    >
        <div>
            <h3
                class="text-xs font-black text-white/90 tracking-[0.2em] flex items-center gap-2 uppercase"
            >
                <span class="w-1.5 h-1.5 rounded-full {dotColorClass}"></span>
                {title}
            </h3>
            <p class="text-[9px] font-mono opacity-50 mt-1 uppercase tracking-widest">
                {subtitle}
            </p>
        </div>
        <span class="text-[10px] font-mono text-white/20 font-bold tracking-tighter">
            {isLoading ? 'SCANNING...' : `${data.length} ENTITIES ACTIVE`}
        </span>
    </header>

    <div class="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3">
        {#if isLoading}
            <div class="flex flex-col items-center justify-center h-full gap-4 opacity-20">
                <div
                    class="w-8 h-8 border-2 {dotColorClass}/30 border-t-white rounded-full animate-spin"
                ></div>
                <span class="font-mono text-[10px] tracking-[0.3em] uppercase">{scanText}</span>
            </div>
        {:else if data.length === 0}
            <div class="h-full flex flex-col items-center justify-center opacity-10 gap-2">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1"
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                </svg>
                <span class="font-mono text-[10px] tracking-widest uppercase">No_Sig_Detected</span>
            </div>
        {:else}
            {#each data as item (item.symbol)}
                <InstitutionalCard {item} {channel} />
            {/each}
        {/if}
    </div>
</section>
