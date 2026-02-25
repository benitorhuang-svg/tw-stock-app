<script lang="ts">
    import { onMount } from 'svelte';

    interface InstitutionalData {
        symbol: string;
        name: string;
        foreignStreak: number;
        investStreak: number;
        dealerStreak: number;
        latest: Record<string, number>;
    }

    let fSorted: InstitutionalData[] = [];
    let tSorted: InstitutionalData[] = [];
    let dSorted: InstitutionalData[] = [];
    let isLoading = true;

    onMount(() => {
        const listener = (e: any) => {
            const { type, payload } = e.detail;
            if (type === 'INST_DATA') {
                const data: InstitutionalData[] = payload.data;
                // Sorting & Filtering (Min 2 days streak) - capped at top 50
                fSorted = data
                    .filter(i => Math.abs(i.foreignStreak) >= 2)
                    .sort((a, b) => Math.abs(b.foreignStreak) - Math.abs(a.foreignStreak))
                    .slice(0, 50);
                tSorted = data
                    .filter(i => Math.abs(i.investStreak) >= 2)
                    .sort((a, b) => Math.abs(b.investStreak) - Math.abs(a.investStreak))
                    .slice(0, 50);
                dSorted = data
                    .filter(i => Math.abs(i.dealerStreak) >= 2)
                    .sort((a, b) => Math.abs(b.dealerStreak) - Math.abs(a.dealerStreak))
                    .slice(0, 50);
                isLoading = false;
            } else if (type === 'INST_LOADING') {
                isLoading = true;
            }
        };

        window.addEventListener('tw-inst-update', listener);
        return () => window.removeEventListener('tw-inst-update', listener);
    });
</script>

<div
    class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0 animate-fade-up"
    style="animation-delay: 100ms"
>
    <!-- Foreign Matrix -->
    <section
        class="flex flex-col bg-surface-deep/40 rounded-[2rem] border border-white/5 overflow-hidden backdrop-blur-sm group hover:border-bullish/20 transition-all duration-500"
    >
        <header
            class="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-bullish/10 to-transparent"
        >
            <div>
                <h3
                    class="text-xs font-black text-white/90 tracking-[0.2em] flex items-center gap-2 uppercase"
                >
                    <span class="w-1.5 h-1.5 rounded-full bg-bullish"></span>
                    Foreign Channels
                </h3>
                <p class="text-[9px] font-mono text-bullish/50 mt-1 uppercase tracking-widest">
                    Global Capital Flow
                </p>
            </div>
            <span class="text-[10px] font-mono text-white/20 font-bold tracking-tighter">
                {isLoading ? 'SCANNING...' : `${fSorted.length} ENTITIES ACTIVE`}
            </span>
        </header>
        <div class="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3">
            {#if isLoading}
                <div class="flex flex-col items-center justify-center h-full gap-4 opacity-20">
                    <div
                        class="w-8 h-8 border-2 border-bullish/30 border-t-bullish rounded-full animate-spin"
                    ></div>
                    <span class="font-mono text-[10px] tracking-[0.3em] uppercase"
                        >Synching_Frequencies</span
                    >
                </div>
            {:else if fSorted.length === 0}
                <div class="h-full flex flex-col items-center justify-center opacity-10 gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-8 h-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        /></svg
                    >
                    <span class="font-mono text-[10px] tracking-widest uppercase"
                        >No_Sig_Detected</span
                    >
                </div>
            {:else}
                {#each fSorted as item (item.symbol)}
                    {@const isBuy = item.foreignStreak > 0}
                    {@const streakAbs = Math.abs(item.foreignStreak)}
                    {@const netVal = item.latest['foreign']}
                    {@const fmtNet = (netVal / 1000).toFixed(1) + 'K'}
                    <a
                        href="/stocks/{item.symbol}"
                        class="group relative block p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all no-underline overflow-hidden"
                    >
                        <div
                            class="absolute top-0 left-0 w-1 h-full opacity-40 group-hover:opacity-100 transition-opacity {isBuy
                                ? 'bg-bullish'
                                : 'bg-bearish'}"
                        ></div>
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-3">
                                <span
                                    class="text-sm font-black text-white group-hover:text-accent transition-colors tracking-tighter"
                                    >{item.symbol}</span
                                >
                                <span
                                    class="text-[10px] font-mono text-white/30 uppercase truncate max-w-[80px]"
                                    >{item.name}</span
                                >
                            </div>
                            <div
                                class="px-2 py-0.5 rounded text-[9px] font-black font-mono border {isBuy
                                    ? 'border-bullish/20 bg-bullish/10 text-bullish shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                    : 'border-bearish/20 bg-bearish/10 text-bearish shadow-[0_0_15px_rgba(239,68,68,0.1)]'}"
                            >
                                {streakAbs}D {isBuy ? 'ACCUM' : 'DUMP'}
                            </div>
                        </div>
                        <div class="flex items-end justify-between">
                            <div>
                                <div
                                    class="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1"
                                >
                                    Impact_Magnitude
                                </div>
                                <div
                                    class="text-sm font-mono font-bold {netVal >= 0
                                        ? 'text-bullish'
                                        : 'text-bearish'}"
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
                {/each}
            {/if}
        </div>
    </section>

    <!-- Trust Matrix -->
    <section
        class="flex flex-col bg-surface-deep/40 rounded-[2rem] border border-white/5 overflow-hidden backdrop-blur-sm group hover:border-accent/20 transition-all duration-500"
    >
        <header
            class="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-accent/10 to-transparent"
        >
            <div>
                <h3
                    class="text-xs font-black text-white/90 tracking-[0.2em] flex items-center gap-2 uppercase"
                >
                    <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>
                    Trust Domains
                </h3>
                <p class="text-[9px] font-mono text-accent/50 mt-1 uppercase tracking-widest">
                    Domestic Funds
                </p>
            </div>
            <span class="text-[10px] font-mono text-white/20 font-bold tracking-tighter">
                {isLoading ? 'SCANNING...' : `${tSorted.length} ENTITIES ACTIVE`}
            </span>
        </header>
        <div class="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3">
            {#if isLoading}
                <div class="flex flex-col items-center justify-center h-full gap-4 opacity-20">
                    <div
                        class="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"
                    ></div>
                    <span class="font-mono text-[10px] tracking-[0.3em] uppercase"
                        >Checking_Ledgers</span
                    >
                </div>
            {:else if tSorted.length === 0}
                <div class="h-full flex flex-col items-center justify-center opacity-10 gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-8 h-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        /></svg
                    >
                    <span class="font-mono text-[10px] tracking-widest uppercase"
                        >No_Sig_Detected</span
                    >
                </div>
            {:else}
                {#each tSorted as item (item.symbol)}
                    {@const isBuy = item.investStreak > 0}
                    {@const streakAbs = Math.abs(item.investStreak)}
                    {@const netVal = item.latest['invest']}
                    {@const fmtNet = (netVal / 1000).toFixed(1) + 'K'}
                    <a
                        href="/stocks/{item.symbol}"
                        class="group relative block p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all no-underline overflow-hidden"
                    >
                        <div
                            class="absolute top-0 left-0 w-1 h-full opacity-40 group-hover:opacity-100 transition-opacity {isBuy
                                ? 'bg-bullish'
                                : 'bg-bearish'}"
                        ></div>
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-3">
                                <span
                                    class="text-sm font-black text-white group-hover:text-accent transition-colors tracking-tighter"
                                    >{item.symbol}</span
                                >
                                <span
                                    class="text-[10px] font-mono text-white/30 uppercase truncate max-w-[80px]"
                                    >{item.name}</span
                                >
                            </div>
                            <div
                                class="px-2 py-0.5 rounded text-[9px] font-black font-mono border {isBuy
                                    ? 'border-bullish/20 bg-bullish/10 text-bullish shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                    : 'border-bearish/20 bg-bearish/10 text-bearish shadow-[0_0_15px_rgba(239,68,68,0.1)]'}"
                            >
                                {streakAbs}D {isBuy ? 'ACCUM' : 'DUMP'}
                            </div>
                        </div>
                        <div class="flex items-end justify-between">
                            <div>
                                <div
                                    class="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1"
                                >
                                    Impact_Magnitude
                                </div>
                                <div
                                    class="text-sm font-mono font-bold {netVal >= 0
                                        ? 'text-bullish'
                                        : 'text-bearish'}"
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
                {/each}
            {/if}
        </div>
    </section>

    <!-- Dealer Matrix -->
    <section
        class="flex flex-col bg-surface-deep/40 rounded-[2rem] border border-white/5 overflow-hidden backdrop-blur-sm group hover:border-yellow-400/20 transition-all duration-500"
    >
        <header
            class="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-yellow-400/10 to-transparent"
        >
            <div>
                <h3
                    class="text-xs font-black text-white/90 tracking-[0.2em] flex items-center gap-2 uppercase"
                >
                    <span class="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                    Dealer Network
                </h3>
                <p class="text-[9px] font-mono text-yellow-400/50 mt-1 uppercase tracking-widest">
                    Proprietary Trading
                </p>
            </div>
            <span class="text-[10px] font-mono text-white/20 font-bold tracking-tighter">
                {isLoading ? 'SCANNING...' : `${dSorted.length} ENTITIES ACTIVE`}
            </span>
        </header>
        <div class="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3">
            {#if isLoading}
                <div class="flex flex-col items-center justify-center h-full gap-4 opacity-20">
                    <div
                        class="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"
                    ></div>
                    <span class="font-mono text-[10px] tracking-[0.3em] uppercase"
                        >Decrypt_Network</span
                    >
                </div>
            {:else if dSorted.length === 0}
                <div class="h-full flex flex-col items-center justify-center opacity-10 gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-8 h-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        /></svg
                    >
                    <span class="font-mono text-[10px] tracking-widest uppercase"
                        >No_Sig_Detected</span
                    >
                </div>
            {:else}
                {#each dSorted as item (item.symbol)}
                    {@const isBuy = item.dealerStreak > 0}
                    {@const streakAbs = Math.abs(item.dealerStreak)}
                    {@const netVal = item.latest['dealer']}
                    {@const fmtNet = (netVal / 1000).toFixed(1) + 'K'}
                    <a
                        href="/stocks/{item.symbol}"
                        class="group relative block p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all no-underline overflow-hidden"
                    >
                        <div
                            class="absolute top-0 left-0 w-1 h-full opacity-40 group-hover:opacity-100 transition-opacity {isBuy
                                ? 'bg-bullish'
                                : 'bg-bearish'}"
                        ></div>
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-3">
                                <span
                                    class="text-sm font-black text-white group-hover:text-accent transition-colors tracking-tighter"
                                    >{item.symbol}</span
                                >
                                <span
                                    class="text-[10px] font-mono text-white/30 uppercase truncate max-w-[80px]"
                                    >{item.name}</span
                                >
                            </div>
                            <div
                                class="px-2 py-0.5 rounded text-[9px] font-black font-mono border {isBuy
                                    ? 'border-bullish/20 bg-bullish/10 text-bullish shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                    : 'border-bearish/20 bg-bearish/10 text-bearish shadow-[0_0_15px_rgba(239,68,68,0.1)]'}"
                            >
                                {streakAbs}D {isBuy ? 'ACCUM' : 'DUMP'}
                            </div>
                        </div>
                        <div class="flex items-end justify-between">
                            <div>
                                <div
                                    class="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1"
                                >
                                    Impact_Magnitude
                                </div>
                                <div
                                    class="text-sm font-mono font-bold {netVal >= 0
                                        ? 'text-bullish'
                                        : 'text-bearish'}"
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
                {/each}
            {/if}
        </div>
    </section>
</div>
