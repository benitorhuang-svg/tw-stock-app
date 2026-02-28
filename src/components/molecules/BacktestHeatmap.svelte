<script lang="ts">
    /**
     * BacktestHeatmap.svelte - Quantitative Strategy Performance Matrix (Dynamic)
     * Displays monthly returns across years with color-coded intensity based on actual data.
     */
    interface Trade {
        streak_date: string;
        return_pct: number;
    }

    interface Props {
        strategyName?: string;
        data?: Trade[];
    }

    let { strategyName = 'Alpha Momentum Vector', data = [] }: Props = $props();

    interface BacktestPoint {
        year: number;
        month: number;
        sumReturn: number;
        count: number;
    }

    let points = $derived.by(() => {
        const heatmapPoints: Record<string, BacktestPoint> = {};

        data.forEach((trade: Trade) => {
            const date = new Date(trade.streak_date);
            if (isNaN(date.getTime())) return;

            const year = date.getFullYear();
            // Month is 1-indexed in our map
            const month = date.getMonth() + 1;
            const key = `${year}-${month}`;

            if (!heatmapPoints[key]) {
                heatmapPoints[key] = { year, month, sumReturn: 0, count: 0 };
            }
            heatmapPoints[key].sumReturn += trade.return_pct;
            heatmapPoints[key].count += 1;
        });

        // Convert sums to average return per month
        return Object.values(heatmapPoints).map(p => ({
            year: p.year,
            month: p.month,
            returnPct: p.count > 0 ? +(p.sumReturn / p.count).toFixed(2) : 0,
        }));
    });

    let years = $derived([...new Set(points.map(d => d.year))].sort((a, b) => b - a));
    const months = [
        'JAN',
        'FEB',
        'MAR',
        'APR',
        'MAY',
        'JUN',
        'JUL',
        'AUG',
        'SEP',
        'OCT',
        'NOV',
        'DEC',
    ];

    function getPoint(year: number, monthIdx: number) {
        return points.find(d => d.year === year && d.month === monthIdx + 1);
    }

    function getColorClass(ret: number | undefined) {
        if (ret === undefined) return 'bg-surface-hover/5 text-transparent border-transparent';
        if (ret > 5) return 'bg-bullish/40 text-text-primary border-bullish/20';
        if (ret > 0) return 'bg-bullish/10 text-bullish border-bullish/10';
        if (ret < -5) return 'bg-bearish/40 text-text-primary border-bearish/20';
        if (ret < 0) return 'bg-bearish/10 text-bearish border-bearish/10';
        return 'bg-surface-hover/10 text-text-muted/40 border-border/10';
    }

    function getGlowClass(ret: number | undefined) {
        if (ret === undefined) return '';
        if (ret > 10) return 'shadow-[inset_0_0_10px_rgba(34,197,94,0.3)]';
        if (ret < -10) return 'shadow-[inset_0_0_10px_rgba(239,68,68,0.3)]';
        return '';
    }

    let stats = $derived.by(() => {
        if (!data || data.length === 0) return { totalReturn: 0, maxDrawdown: 0, sharpe: 0 };

        const sortedData = [...data].sort(
            (a, b) => new Date(a.streak_date).getTime() - new Date(b.streak_date).getTime()
        );
        const returns = sortedData.map(d => d.return_pct / 100);
        let totalReturn = returns.reduce((acc, curr) => acc + curr, 0) * 100;

        let cumulative = 1;
        let peak = 1;
        let maxDrawdown = 0;

        // Simplified max drawdown estimation based on trades sequential
        for (const ret of returns) {
            cumulative *= 1 + ret;
            if (cumulative > peak) peak = cumulative;
            const drawdown = (peak - cumulative) / peak;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        const avgReturn = returns.reduce((a: number, b: number) => a + b, 0) / returns.length;
        // Standard deviation of returns
        const variance =
            returns.reduce((sum: number, ret: number) => sum + Math.pow(ret - avgReturn, 2), 0) /
            returns.length;
        const stdDev = Math.sqrt(variance);

        // Pseudo sharpe (assume 1.5% risk free rate, simplified non-annualized)
        const sharpe = stdDev > 0 ? (avgReturn - 0.015) / stdDev : 0;

        return {
            totalReturn: +totalReturn.toFixed(1),
            maxDrawdown: +(maxDrawdown * 100).toFixed(1),
            sharpe: +sharpe.toFixed(2),
        };
    });
</script>

<div class="glass-card p-6 overflow-hidden group">
    <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-accent/10 border border-accent/20">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-accent"
                >
                    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                    <path d="M3 9h18"></path>
                    <path d="M9 21V9"></path>
                </svg>
            </div>
            <div>
                <h3
                    class="text-xs font-mono font-black text-text-primary uppercase tracking-widest"
                >
                    {strategyName}
                </h3>
                <p class="text-[9px] font-mono text-text-muted uppercase tracking-tighter">
                    Backtest Performance Cluster
                </p>
            </div>
        </div>

        <div class="hidden sm:flex items-center gap-4 text-[9px] font-mono whitespace-nowrap">
            <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-sm bg-bullish/40"></span>
                <span class="text-text-muted">POSITIVE (>5%)</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-sm bg-bearish/40"></span>
                <span class="text-text-muted">NEGATIVE (&lt;-5%)</span>
            </div>
        </div>
    </div>

    <div class="overflow-x-auto custom-scrollbar pb-2">
        <table class="w-full border-separate border-spacing-1.5">
            <thead>
                <tr>
                    <th class="p-2"></th>
                    {#each months as m}
                        <th
                            class="p-2 text-[9px] font-mono font-bold text-text-muted text-center uppercase tracking-widest min-w-[36px]"
                        >
                            {m}
                        </th>
                    {/each}
                    <th
                        class="p-2 text-[9px] font-mono font-bold text-accent text-center uppercase tracking-widest"
                        >YTD</th
                    >
                </tr>
            </thead>
            <tbody>
                {#if years.length === 0}
                    <tr>
                        <td
                            colspan="14"
                            class="py-12 text-center text-xs font-mono text-text-muted/50 uppercase tracking-widest"
                        >
                            No backtest data available for heatmap
                        </td>
                    </tr>
                {:else}
                    {#each years as year}
                        {@const yearData = points.filter(d => d.year === year)}
                        {@const ytd = yearData.reduce((acc, curr) => acc + curr.returnPct, 0)}
                        <tr>
                            <td
                                class="p-2 text-[10px] font-mono font-black text-text-secondary text-right pr-4 align-middle"
                            >
                                {year}
                            </td>
                            {#each months as _, idx}
                                {@const p = getPoint(year, idx)}
                                <td class="p-0 align-middle">
                                    <div
                                        class="aspect-square w-full min-w-[36px] min-h-[36px] rounded-md flex flex-col items-center justify-center transition-all duration-300 hover:scale-[1.15] hover:z-10 hover:shadow-xl cursor-help border {getColorClass(
                                            p?.returnPct
                                        )} {getGlowClass(p?.returnPct)}"
                                        title={p
                                            ? `${year} ${months[idx]}: ${p.returnPct}%`
                                            : 'No Trades'}
                                    >
                                        {#if p !== undefined}
                                            <span
                                                class="text-[9px] font-mono font-bold tracking-tighter"
                                            >
                                                {p.returnPct > 0 ? '+' : ''}{Math.round(
                                                    p.returnPct
                                                )}%
                                            </span>
                                        {:else}
                                            <span class="text-[9px] font-mono">-</span>
                                        {/if}
                                    </div>
                                </td>
                            {/each}
                            <td class="p-2 align-middle">
                                <div
                                    class="px-3 py-1.5 rounded-lg text-center text-[10px] font-mono font-black shadow-inner
                                        {ytd > 0
                                        ? 'text-bullish bg-bullish/10 border-bullish/20'
                                        : ytd < 0
                                          ? 'text-bearish bg-bearish/10 border-bearish/20'
                                          : 'text-text-muted bg-surface/50 border-border/10'} border"
                                >
                                    {ytd > 0 ? '+' : ''}{ytd.toFixed(1)}%
                                </div>
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>

    <!-- Stats row -->
    <div class="mt-8 flex items-center justify-between pt-6 border-t border-border/10">
        <div class="flex gap-6 sm:gap-10">
            <div>
                <div class="text-[8px] font-mono text-text-muted uppercase mb-1">Total Return</div>
                <div
                    class="text-sm font-mono font-black {stats.totalReturn > 0
                        ? 'text-bullish'
                        : 'text-bearish'} tracking-tighter"
                >
                    {stats.totalReturn > 0 ? '+' : ''}{stats.totalReturn}%
                </div>
            </div>
            <div>
                <div class="text-[8px] font-mono text-text-muted uppercase mb-1">Max Drawdown</div>
                <div class="text-sm font-mono font-black text-bearish tracking-tighter">
                    -{stats.maxDrawdown}%
                </div>
            </div>
            <div>
                <div class="text-[8px] font-mono text-text-muted uppercase mb-1">Sharpe Ratio</div>
                <div class="text-sm font-mono font-black text-accent tracking-tighter">
                    {stats.sharpe}
                </div>
            </div>
        </div>

        <button
            class="hidden sm:block px-4 py-2 rounded-lg bg-surface-hover/10 border border-border/20 text-[9px] font-mono font-bold text-text-muted hover:text-text-primary hover:bg-surface-hover/20 hover:border-accent/40 transition-all uppercase tracking-widest"
        >
            Detailed Vector Analysis
        </button>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        height: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: var(--color-scrollbar, rgba(255, 255, 255, 0.1));
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: var(--color-scrollbar-hover, rgba(255, 255, 255, 0.2));
    }
</style>
