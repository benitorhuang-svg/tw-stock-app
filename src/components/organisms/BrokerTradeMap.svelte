<script lang="ts">
    import { onMount } from 'svelte';

    interface Props {
        symbol: string;
    }

    const { symbol }: Props = $props();

    let brokers: any[] = $state([]);
    let concentration = $state(0);
    let isLoading = $state(true);

    onMount(async () => {
        try {
            const res = await fetch(`/api/stocks/broker-detail?symbol=${symbol}`);
            const data = await res.json();
            brokers = data.brokers || [];
            concentration = data.concentration || 0;
        } catch (e) {
            console.error('Broker fetch error', e);
        } finally {
            isLoading = false;
        }
    });

    // Helper: Color by type
    function getTypeColor(type: string) {
        switch (type) {
            case 'Foreign':
                return 'text-cyan-400';
            case 'Local_Main':
                return 'text-amber-400';
            case 'Government':
                return 'text-emerald-400';
            default:
                return 'text-text-muted';
        }
    }
</script>

<div class="bg-surface/30 p-6 rounded-2xl border border-border/10">
    <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <svg
                    class="w-4 h-4 text-orange-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path d="M15 10l5 5-5 5M4 4v7a4 4 0 004 4h12" />
                </svg>
            </div>
            <div>
                <h3
                    class="text-xs font-black text-text-primary uppercase tracking-widest leading-none mb-1"
                >
                    Entity_Broker_Map
                </h3>
                <p class="text-[9px] font-mono text-text-muted/40 uppercase">
                    Individual Participant Tracking // Top Movers
                </p>
            </div>
        </div>

        <div class="px-3 py-1 bg-surface-hover/20 border border-border rounded-full">
            <span class="text-[9px] font-mono text-text-muted uppercase">Concentration: </span>
            <span
                class="text-[10px] font-black {concentration > 5
                    ? 'text-bullish'
                    : 'text-text-muted'}">{concentration.toFixed(1)}%</span
            >
        </div>
    </div>

    {#if isLoading}
        <div class="space-y-4">
            {#each Array(5) as _}
                <div class="h-10 bg-surface-hover/50 rounded-lg animate-pulse"></div>
            {/each}
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Buyers -->
            <div class="space-y-2">
                <div class="text-[9px] font-black text-up uppercase tracking-widest pl-2 mb-2">
                    Top_Accumulators
                </div>
                {#each brokers.filter(b => b.net > 0) as broker}
                    <div
                        class="flex items-center justify-between p-3 bg-surface-hover/30 border border-border/50 rounded-xl hover:bg-surface-hover/40 transition-all group"
                    >
                        <div class="flex items-center gap-3">
                            <span class="text-[10px] font-mono text-text-muted/60">{broker.id}</span
                            >
                            <div>
                                <div
                                    class="text-[11px] font-bold text-text-primary group-hover:text-up transition-colors"
                                >
                                    {broker.name}
                                </div>
                                <div
                                    class="text-[8px] font-mono uppercase {getTypeColor(
                                        broker.type
                                    )} opacity-60 tracking-tighter"
                                >
                                    {broker.type}
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-[11px] font-mono font-black text-up">
                                +{(broker.net / 1000).toFixed(1)}K
                            </div>
                            <div class="w-16 h-1 bg-surface-hover/50 rounded-full mt-1 overflow-hidden">
                                <div
                                    class="h-full bg-up/40"
                                    style="width: {Math.min(Math.abs(broker.net) / 100, 100)}%"
                                ></div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Sellers -->
            <div class="space-y-2">
                <div class="text-[9px] font-black text-down uppercase tracking-widest pl-2 mb-2">
                    Top_Distributors
                </div>
                {#each brokers.filter(b => b.net < 0) as broker}
                    <div
                        class="flex items-center justify-between p-3 bg-surface-hover/30 border border-border/50 rounded-xl hover:bg-surface-hover/40 transition-all group"
                    >
                        <div class="flex items-center gap-3">
                            <span class="text-[10px] font-mono text-text-muted/60">{broker.id}</span
                            >
                            <div>
                                <div
                                    class="text-[11px] font-bold text-text-primary group-hover:text-down transition-colors"
                                >
                                    {broker.name}
                                </div>
                                <div
                                    class="text-[8px] font-mono uppercase {getTypeColor(
                                        broker.type
                                    )} opacity-60 tracking-tighter"
                                >
                                    {broker.type}
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-[11px] font-mono font-black text-down">
                                {(broker.net / 1000).toFixed(1)}K
                            </div>
                            <div class="w-16 h-1 bg-surface-hover/50 rounded-full mt-1 overflow-hidden">
                                <div
                                    class="h-full bg-down/40"
                                    style="width: {Math.min(Math.abs(broker.net) / 100, 100)}%"
                                ></div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
