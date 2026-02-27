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
        variant: 'accent' | 'bearish' | 'bullish';
        items: any[];
        align?: 'left' | 'right';
    }

    let { title, variant, items, align = 'left' }: Props = $props();

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
        class="px-6 py-4 {headerBg[variant]} border-b border-white/5 flex items-center {align ===
        'right'
            ? 'justify-end'
            : 'justify-start'} relative z-10"
    >
        <div class="flex items-center gap-2">
            <span class="{titleColor[variant]} flex items-center justify-center">
                {#if variant === 'bullish'}
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="m12 19V5" />
                        <path d="m5 12 7-7 7 7" />
                    </svg>
                {:else if variant === 'bearish'}
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M12 5v14" />
                        <path d="m19 12-7 7-7-7" />
                    </svg>
                {:else}
                    <svg
                        class="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <circle cx="12" cy="12" r="10" />
                    </svg>
                {/if}
            </span>
            <h3 class="text-[10px] font-black {titleColor[variant]} uppercase tracking-widest">
                {title}
            </h3>
        </div>
    </div>

    <!-- Data Table -->
    <div class="w-full">
        <table class="w-full text-left border-collapse">
            <thead class="bg-surface/95 border-b border-white/5 sticky top-0 z-20 backdrop-blur-xl">
                <tr>
                    <th class="atom-th !px-2">Rank</th>
                    <th class="atom-th !px-2 text-left">Entity</th>
                    <th class="atom-th !px-2 text-center">Sector</th>
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
                        <td class="px-2 py-3 text-[9px] font-mono text-white/20 pl-4 w-10">
                            {i + 1}
                        </td>
                        <td class="px-1 py-3 max-w-[120px]">
                            <StockEntityCell symbol={s.symbol} name={s.name} showLink={true} />
                        </td>
                        <td class="px-2 py-3 text-center">
                            {#if s.sector}
                                <span
                                    class="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-bold uppercase tracking-tighter whitespace-nowrap"
                                >
                                    {s.sector}
                                </span>
                            {:else}
                                <span class="text-[8px] text-white/10">—</span>
                            {/if}
                        </td>
                        <td
                            class="px-2 py-3 text-right text-[10px] font-mono font-bold text-white/70"
                        >
                            {fmtPrice(s.price || 0)}
                        </td>
                        <td class="px-2 py-3 text-right">
                            <div
                                class="atom-badge inline-flex min-w-[54px] justify-center {badgeClass(
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
