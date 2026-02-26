<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';
    import InstitutionalCard from '../molecules/InstitutionalCard.svelte';

    const alpha = $derived(marketStore.state.institutional.forensicAlpha);
    const isLoading = $derived(marketStore.state.isInstLoading);

    let activeTab = $state<'conc' | 'gov' | 'main' | 'insider' | 'short'>('conc');

    const filteredRadarData = $derived.by(() => {
        if (!alpha) return [];
        const base =
            activeTab === 'conc'
                ? alpha.highConcentration
                : activeTab === 'gov'
                  ? alpha.govSupport
                  : activeTab === 'main'
                    ? alpha.mainAccumulation
                    : activeTab === 'insider'
                      ? alpha.insider
                      : alpha.shorting;

        return (base || []).filter(item => {
            const matchesSearch =
                !marketStore.searchKeyword ||
                item.symbol.toLowerCase().includes(marketStore.searchKeyword.toLowerCase()) ||
                item.name?.toLowerCase().includes(marketStore.searchKeyword.toLowerCase());

            const matchesMarket =
                !marketStore.filterMarket ||
                (item as any)._market === marketStore.filterMarket.toUpperCase();

            return matchesSearch && matchesMarket;
        });
    });
</script>

<div class="flex flex-col gap-4 mt-8">
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
            <span class="w-1.5 h-1.5 rounded-full bg-accent animate-ping"></span>
            <div class="flex flex-col">
                <h2 class="text-xs font-black text-white/90 uppercase tracking-[0.3em]">
                    Forensic_Alpha_Radar
                </h2>
                <span class="text-[8px] font-mono text-text-muted/40 uppercase"
                    >Filtering: {filteredRadarData.length} signals</span
                >
            </div>
        </div>

        <div class="flex items-center bg-surface/50 rounded-lg p-1 border border-border">
            <button
                class="px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded transition-all {activeTab ===
                'conc'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-white'}"
                onclick={() => (activeTab = 'conc')}
            >
                Conc
            </button>
            <button
                class="px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded transition-all {activeTab ===
                'gov'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-white'}"
                onclick={() => (activeTab = 'gov')}
            >
                Gov
            </button>
            <button
                class="px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded transition-all {activeTab ===
                'main'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-white'}"
                onclick={() => (activeTab = 'main')}
            >
                Main
            </button>
            <button
                class="px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded transition-all {activeTab ===
                'insider'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-white'}"
                onclick={() => (activeTab = 'insider')}
            >
                Pledge
            </button>
            <button
                class="px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded transition-all {activeTab ===
                'short'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-white'}"
                onclick={() => (activeTab = 'short')}
            >
                Shorting
            </button>
        </div>
    </div>

    <!-- Data Ribbon -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {#if isLoading}
            {#each Array(4) as _}
                <div class="h-20 bg-surface/20 rounded-xl border border-border animate-pulse"></div>
            {/each}
        {:else}
            {#each filteredRadarData.slice(0, 8) as item}
                <div
                    class="group relative bg-surface/40 rounded-xl border border-border p-3 hover:border-accent/30 transition-all hover:bg-accent/5 overflow-hidden"
                >
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex flex-col">
                            <span
                                class="text-[10px] font-black text-white group-hover:text-accent transition-colors"
                                >{item.name}</span
                            >
                            <span
                                class="text-[8px] font-mono text-text-muted/40 uppercase tracking-tighter"
                                >{item.symbol}</span
                            >
                        </div>
                        <span
                            class="text-[10px] font-black font-mono {item.changePct >= 0
                                ? 'text-up'
                                : 'text-down'}"
                        >
                            {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                        </span>
                    </div>

                    <div class="flex items-end justify-between">
                        <div class="flex flex-col">
                            <span
                                class="text-[7px] font-mono text-text-muted/20 uppercase tracking-widest"
                            >
                                {#if activeTab === 'conc'}
                                    L_1000
                                {:else if activeTab === 'gov'}
                                    Gov_Net
                                {:else if activeTab === 'main'}
                                    Main_Conc
                                {:else if activeTab === 'insider'}
                                    Pawn_Ratio
                                {:else}
                                    Short_Bal
                                {/if}
                            </span>
                            <span class="text-xs font-black font-mono text-white/80">
                                {#if activeTab === 'conc'}
                                    {item.shareholderDist?.large1000.toFixed(1)}%
                                {:else if activeTab === 'gov'}
                                    {(item.government?.netAmount || 0 / 1000).toFixed(1)}M
                                {:else if activeTab === 'main'}
                                    {item.brokerChip?.concentration.toFixed(1)}%
                                {:else if activeTab === 'insider'}
                                    {item.director?.pawn.toFixed(1)}%
                                {:else}
                                    {(item.lending?.shorting || 0 / 1000).toFixed(1)}K
                                {/if}
                            </span>
                        </div>
                        <div class="w-10 h-6">
                            <div class="w-full h-[1px] bg-accent/20"></div>
                            <div class="w-2/3 h-[1px] bg-accent/40 mt-1"></div>
                        </div>
                    </div>

                    <!-- Glow effect -->
                    <div
                        class="absolute -right-4 -bottom-4 w-12 h-12 bg-accent/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    ></div>
                </div>
            {/each}
        {/if}
    </div>
</div>
