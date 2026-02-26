<script lang="ts">
    import StatCard from '../molecules/StatCard.svelte';

    // Mock data for Market Margin Analysis
    // In a real app, this would come from marketStore
    const marginStats = [
        { label: 'Margin Balance', value: '2,485.2B', trend: 1, status: 'high', icon: '📈' },
        { label: 'Short Balance', value: '12.4B', trend: -1, status: 'low', icon: '📉' },
        { label: 'S/M Ratio', value: '0.51%', trend: 0, status: 'normal', icon: '⚖️' },
        { label: 'Margin Usage', value: '28.4%', trend: 1, status: 'warning', icon: '📊' },
    ];
</script>

<div class="margin-analysis-organism mb-10">
    <div class="flex items-center justify-between mb-6">
        <div>
            <h3
                class="text-sm font-black text-white/90 tracking-[0.2em] uppercase flex items-center gap-3"
            >
                <span class="p-1.5 bg-accent/20 rounded-lg text-accent">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                    </svg>
                </span>
                Margin_Analytics_Engine
            </h3>
            <p class="text-[9px] font-mono text-white/20 mt-1 tracking-widest uppercase">
                Liquidity_Leverage_Monitoring • Realtime_Uplink
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button
                class="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black font-mono text-white/40 hover:bg-white/10 transition-colors uppercase tracking-widest"
            >
                FETCH_LATEST
            </button>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {#each marginStats as stat}
            <StatCard {...stat} />
        {/each}
    </div>
</div>
