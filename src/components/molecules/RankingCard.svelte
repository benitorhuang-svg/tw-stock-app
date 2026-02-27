<script lang="ts">
    /**
     * RankingCard.svelte — Reusable Ranking Matrix Card (Molecule)
     *
     * Atomic Design: Molecule (composed of atom-th, atom-badge, StockEntityCell)
     * Eliminates 3x copy-paste of identical table markup in DashboardController.
     */
    import StockEntityCell from './StockEntityCell.svelte';
    import { fmtPrice, fmtPct } from '../../utils/format';

    interface Props {
        title: string;
        icon: string;
        variant: 'accent' | 'bearish' | 'bullish';
        items: any[];
    }

    let { title, icon, variant, items }: Props = $props();

    const headerBg = {
        accent: 'bg-white/[0.02]',
        bearish: 'bg-bearish/[0.03]',
        bullish: 'bg-bullish/[0.03]',
    };

    const titleColor = {
        accent: 'text-accent',
        bearish: 'text-bearish',
        bullish: 'text-bullish',
    };

    function badgeClass(changePct: number): string {
        if (changePct > 0) return 'atom-badge-bull';
        if (changePct < 0) return 'atom-badge-bear';
        return 'atom-badge-flat';
    }
</script>

<div
    class="flex flex-col glass-card border border-border rounded-xl bg-surface/40 shadow-elevated overflow-hidden"
>
    <!-- Card Header -->
    <div
        class="px-6 py-4 {headerBg[
            variant
        ]} border-b border-white/5 flex items-center justify-between relative z-10"
    >
        <div class="flex items-center gap-2">
            <span class="{titleColor[variant]} text-xs">{icon}</span>
            <h3 class="text-[10px] font-black {titleColor[variant]} uppercase tracking-widest">
                {title}
            </h3>
        </div>
    </div>

    <!-- Data Table -->
    <div class="overflow-y-auto w-full custom-scroll max-h-[400px]">
        <table class="w-full text-left border-collapse">
            <thead class="bg-surface/95 border-b border-white/5 sticky top-0 z-20 backdrop-blur-xl">
                <tr>
                    <th class="atom-th !px-2">Rank</th>
                    <th class="atom-th !px-2 text-left">Entity</th>
                    <th class="atom-th !px-2 text-right">Price</th>
                    <th class="atom-th !px-2 text-right">Change</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.02]">
                {#each items as s, i}
                    <tr
                        class="hover:bg-glass-hover transition-colors group/row cursor-pointer"
                        onclick={() => (window.location.href = `/stocks/${s.symbol}`)}
                    >
                        <td class="px-2 py-3 text-[9px] font-mono text-white/20 pl-4">
                            {i + 1}
                        </td>
                        <td class="px-1 py-3 max-w-[120px]">
                            <StockEntityCell symbol={s.symbol} name={s.name} showLink={true} />
                        </td>
                        <td
                            class="px-2 py-3 text-right text-[10px] font-mono font-bold text-white/70"
                        >
                            {fmtPrice(s.price || 0)}
                        </td>
                        <td class="px-2 py-3 text-right">
                            <div
                                class="atom-badge inline-flex min-w-[54px] {badgeClass(
                                    s.changePercent || 0
                                )}"
                            >
                                {fmtPct(s.changePercent || 0)}
                            </div>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
