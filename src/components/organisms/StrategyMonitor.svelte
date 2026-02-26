<script lang="ts">
    import { onMount } from 'svelte';

    let data: any[] = $state([]);
    let stats = $state({ winRate: 0, avgReturn: 0, samples: 0 });
    let isLoading = $state(true);

    async function runBacktest() {
        isLoading = true;
        try {
            const res = await fetch('/api/strategy/backtest');
            const result = await res.json();
            data = result.data;
            stats = result.stats;
        } catch (e) {}
        isLoading = false;
    }

    onMount(runBacktest);
</script>

<div class="flex flex-col gap-6 h-full overflow-hidden">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="stat-card border-accent/20 bg-accent/5">
            <span class="label text-accent">樣本總數</span>
            <span class="value text-white">{stats.samples} 筆</span>
            <div class="sub-label opacity-40">INST_STREAK >= 3</div>
        </div>
        <div class="stat-card border-bullish/20 bg-bullish/5">
            <span class="label text-bullish">回測勝率</span>
            <span class="value text-white">{(stats.winRate * 100).toFixed(1)}%</span>
            <div class="sub-label opacity-40">POSIX_RETURN > 0</div>
        </div>
        <div class="stat-card border-white/10 bg-white/5">
            <span class="label text-white/40">平均報酬 (5日)</span>
            <span class="value text-bullish">+{stats.avgReturn.toFixed(2)}%</span>
            <div class="sub-label opacity-40">MEAN_EXPECTANCY</div>
        </div>
    </div>

    <!-- Results Table -->
    <div
        class="flex-1 overflow-auto custom-scrollbar border border-border/40 rounded-xl bg-surface/20"
    >
        <table class="w-full text-left border-collapse text-[11px] font-mono">
            <thead class="sticky top-0 bg-surface z-10">
                <tr class="border-b border-border/60">
                    <th class="p-4 text-text-muted uppercase tracking-widest">Date</th>
                    <th class="p-4 text-text-muted uppercase tracking-widest">Entity</th>
                    <th class="p-4 text-text-muted uppercase tracking-widest">Entry</th>
                    <th class="p-4 text-text-muted uppercase tracking-widest">Exit (T+5)</th>
                    <th class="p-4 text-text-muted uppercase tracking-widest text-right">Return</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-border/20">
                {#if isLoading}
                    <tr
                        ><td
                            colspan="5"
                            class="p-20 text-center animate-pulse uppercase tracking-[0.5em] text-accent"
                            >Processing_Vast_History...</td
                        ></tr
                    >
                {:else}
                    {#each data as row}
                        <tr class="hover:bg-white/[0.02] transition-colors">
                            <td class="p-4 opacity-40">{row.streak_date}</td>
                            <td class="p-4">
                                <div class="font-black text-white">{row.symbol}</div>
                                <div class="text-[9px] text-text-muted">{row.name}</div>
                            </td>
                            <td class="p-4 text-white/60">{row.entry_price.toFixed(2)}</td>
                            <td class="p-4 text-white/60">{row.exit_price.toFixed(2)}</td>
                            <td
                                class="p-4 text-right font-black {row.return_pct > 0
                                    ? 'text-bullish'
                                    : 'text-bearish'}"
                            >
                                {row.return_pct > 0 ? '+' : ''}{row.return_pct.toFixed(2)}%
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>

<style>
    .stat-card {
        border-radius: 12px;
        padding: 20px;
        border: 1px solid;
    }
    .label {
        display: block;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 8px;
    }
    .value {
        display: block;
        font-size: 24px;
        font-weight: 900;
        letter-spacing: -1px;
    }
    .sub-label {
        font-size: 9px;
        font-family: var(--font-mono);
        margin-top: 4px;
    }
</style>
