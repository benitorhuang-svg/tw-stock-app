<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';
    import StockEntityCell from '../molecules/StockEntityCell.svelte';
    import StreakBadge from '../atoms/StreakBadge.svelte';

    // ─── Merge 3 channels into one unified map by symbol ───
    interface UnifiedRow {
        symbol: string;
        name: string;
        changePct: number;
        volume: number;
        turnover: number;
        chipsIntensity: number;
        foreignStreak: number;
        investStreak: number;
        dealerStreak: number;
        foreignNet: number;
        investNet: number;
        dealerNet: number;
        totalNet: number;
        // Forensic
        shareholderDist?: any;
        government?: any;
        brokerChip?: any;
        director?: any;
        lending?: any;
        dealerDet?: any;
    }

    let sortCol = $state('totalNet');
    let sortAsc = $state(false);
    let expandedSymbol = $state('');
    let displayLimit = $state(150);

    function toggleSort(col: string) {
        if (!col) return;
        if (sortCol === col) sortAsc = !sortAsc;
        else { sortCol = col; sortAsc = false; }
    }

    // ─── Merge & Filter ─────────────────────────────────
    const unifiedRows = $derived.by(() => {
        const { foreign, invest, dealer } = marketStore.state.institutional;
        const map = new Map<string, UnifiedRow>();

        // Seed from all three channels
        for (const arr of [foreign, invest, dealer]) {
            for (const item of arr) {
                if (!map.has(item.symbol)) {
                    map.set(item.symbol, {
                        symbol: item.symbol,
                        name: item.name,
                        changePct: item.changePct || 0,
                        volume: item.volume || 0,
                        turnover: item.turnover || 0,
                        chipsIntensity: item.chipsIntensity || 0,
                        foreignStreak: 0,
                        investStreak: 0,
                        dealerStreak: 0,
                        foreignNet: 0,
                        investNet: 0,
                        dealerNet: 0,
                        totalNet: 0,
                        shareholderDist: item.shareholderDist,
                        government: item.government,
                        brokerChip: item.brokerChip,
                        director: item.director,
                        lending: item.lending,
                        dealerDet: item.dealerDet,
                    });
                }
            }
        }

        // Fill channel-specific data
        for (const item of foreign) {
            const row = map.get(item.symbol);
            if (row) {
                row.foreignStreak = item.foreignStreak || 0;
                row.foreignNet = item.latest?.foreign || 0;
            }
        }
        for (const item of invest) {
            const row = map.get(item.symbol);
            if (row) {
                row.investStreak = item.investStreak || 0;
                row.investNet = item.latest?.invest || 0;
            }
        }
        for (const item of dealer) {
            const row = map.get(item.symbol);
            if (row) {
                row.dealerStreak = item.dealerStreak || 0;
                row.dealerNet = item.latest?.dealer || 0;
            }
        }

        // Compute totalNet
        for (const row of map.values()) {
            row.totalNet = row.foreignNet + row.investNet + row.dealerNet;
        }

        // Apply filters
        let rows = [...map.values()].filter(r => {
            const kw = marketStore.searchKeyword?.toLowerCase();
            if (kw && !r.symbol.toLowerCase().includes(kw) && !r.name?.toLowerCase().includes(kw)) return false;
            if (marketStore.filterDivergence && !(r.changePct < 0 && r.chipsIntensity > 0)) return false;
            return true;
        });

        // Sort
        rows.sort((a, b) => {
            const va = (a as any)[sortCol] ?? 0;
            const vb = (b as any)[sortCol] ?? 0;
            if (typeof va === 'string' && typeof vb === 'string')
                return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
            return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
        });

        return rows;
    });

    const displayItems = $derived(unifiedRows.slice(0, displayLimit));
    const hasMore = $derived(unifiedRows.length > displayLimit);
    const isLoading = $derived(marketStore.state.isInstLoading);

    const headers = [
        { label: '股票', col: 'symbol', w: '14%' },
        { label: '外資', col: 'foreignNet', w: '11%' },
        { label: '外資連', col: 'foreignStreak', w: '7%' },
        { label: '投信', col: 'investNet', w: '11%' },
        { label: '投信連', col: 'investStreak', w: '7%' },
        { label: '自營商', col: 'dealerNet', w: '11%' },
        { label: '自營連', col: 'dealerStreak', w: '7%' },
        { label: '法人合計', col: 'totalNet', w: '11%' },
        { label: '漲跌%', col: 'changePct', w: '9%' },
        { label: '成交量', col: 'volume', w: '9%' },
        { label: '', col: '', w: '3%' },
    ];

    function colorClass(v: number) {
        return v > 0 ? 'text-bullish' : v < 0 ? 'text-bearish' : 'text-text-muted';
    }

    function fmtNet(v: number) {
        if (Math.abs(v) >= 10000) return (v / 1000).toFixed(0) + 'K';
        if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + 'K';
        return v.toFixed(0);
    }

    function streakBadge(v: number) {
        const abs = Math.abs(v);
        if (abs === 0) return { text: '—', cls: 'bg-surface/30 text-text-muted/40 border-border/20' };
        const dir = v > 0 ? 'B' : 'S';
        const cls = v > 0
            ? 'bg-bullish/10 text-bullish border-bullish/20'
            : 'bg-bearish/10 text-bearish border-bearish/20';
        return { text: `${abs}D${dir}`, cls };
    }
</script>

<div class="flex flex-col bg-surface/40 rounded-xl border border-border shadow-elevated overflow-hidden">
    <!-- Section Header -->
    <header class="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/30">
        <div class="flex flex-col gap-1">
            <h3 class="text-xs font-black text-text-primary/90 tracking-[0.2em] uppercase flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                Unified_Institutional_Flow
            </h3>
            <span class="text-[9px] font-mono text-text-muted/30 uppercase tracking-widest">
                Foreign × Trust × Dealer — Per Stock Aggregation
            </span>
        </div>
        <span class="text-[10px] font-mono text-text-muted/40 font-black tracking-tighter">
            {isLoading ? 'SYNC...' : `${unifiedRows.length.toString().padStart(4, '0')}_ENTITIES`}
        </span>
    </header>

    <!-- Table -->
    <div class="overflow-x-auto overflow-y-auto max-h-[70vh] custom-scrollbar">
        <table class="w-full text-left table-fixed whitespace-nowrap border-separate border-spacing-0 min-w-[900px]">
            <colgroup>
                {#each headers as h}
                    <col style="width: {h.w};" />
                {/each}
            </colgroup>

            <thead class="sticky top-0 z-20">
                <tr>
                    {#each headers as h}
                        <th
                            class="px-2 py-2.5 bg-elevated border-b border-border text-[8px] font-black uppercase tracking-[0.15em] text-text-muted/40 select-none transition-colors text-center"
                            class:cursor-pointer={!!h.col}
                            class:hover:text-accent={!!h.col}
                            onclick={() => h.col && toggleSort(h.col)}
                        >
                            {#if h.label}
                                <span class="inline-flex items-center gap-1 justify-center">
                                    {h.label}
                                    {#if h.col}
                                        <span class="sort-icon {sortCol === h.col ? 'opacity-100 text-accent' : 'opacity-30'}">
                                            {sortCol === h.col ? (sortAsc ? '↑' : '↓') : '↕'}
                                        </span>
                                    {/if}
                                </span>
                            {/if}
                        </th>
                    {/each}
                </tr>
            </thead>

            <tbody class="divide-y divide-border/30 text-xs font-mono">
                {#if isLoading}
                    <tr>
                        <td colspan="11" class="py-16 bg-surface/20">
                            <div class="flex flex-col items-center gap-2 opacity-30 text-[9px] uppercase tracking-[0.5em] animate-pulse">
                                Syncing_Institutional_Vectors...
                            </div>
                        </td>
                    </tr>
                {:else if unifiedRows.length === 0}
                    <tr>
                        <td colspan="11" class="py-16 text-center text-text-muted opacity-30 text-[9px] uppercase tracking-[0.5em]">
                            No_Signal_Detected
                        </td>
                    </tr>
                {:else}
                    {#each displayItems as r (r.symbol)}
                        {@const fb = streakBadge(r.foreignStreak)}
                        {@const ib = streakBadge(r.investStreak)}
                        {@const db = streakBadge(r.dealerStreak)}
                        <tr
                            class="group cursor-pointer transition-colors hover:bg-surface-hover/30"
                            class:inst-active-row={expandedSymbol === r.symbol}
                            onclick={() => expandedSymbol = expandedSymbol === r.symbol ? '' : r.symbol}
                        >
                            <!-- Entity -->
                            <td class="px-2 py-2.5 border-r border-border/20"
                                class:border-l-4={expandedSymbol === r.symbol}
                                class:border-l-accent={expandedSymbol === r.symbol}
                            >
                                <StockEntityCell symbol={r.symbol} name={r.name} showLink={true} />
                            </td>

                            <!-- Foreign Net -->
                            <td class="px-2 py-2 text-center text-[11px] font-bold {colorClass(r.foreignNet)}">
                                {r.foreignNet !== 0 ? (r.foreignNet > 0 ? '+' : '') + fmtNet(r.foreignNet) : '—'}
                            </td>
                            <!-- Foreign Streak -->
                            <td class="px-1 py-2 text-center">
                                <StreakBadge streak={r.foreignStreak} size="xs" />
                            </td>

                            <!-- Trust Net -->
                            <td class="px-2 py-2 text-center text-[11px] font-bold {colorClass(r.investNet)}">
                                {r.investNet !== 0 ? (r.investNet > 0 ? '+' : '') + fmtNet(r.investNet) : '—'}
                            </td>
                            <!-- Trust Streak -->
                            <td class="px-1 py-2 text-center">
                                <StreakBadge streak={r.investStreak} size="xs" />
                            </td>

                            <!-- Dealer Net -->
                            <td class="px-2 py-2 text-center text-[11px] font-bold {colorClass(r.dealerNet)}">
                                {r.dealerNet !== 0 ? (r.dealerNet > 0 ? '+' : '') + fmtNet(r.dealerNet) : '—'}
                            </td>
                            <!-- Dealer Streak -->
                            <td class="px-1 py-2 text-center">
                                <StreakBadge streak={r.dealerStreak} size="xs" />
                            </td>

                            <!-- Total Net -->
                            <td class="px-2 py-2 text-center text-[11px] font-black {colorClass(r.totalNet)}">
                                {r.totalNet !== 0 ? (r.totalNet > 0 ? '+' : '') + fmtNet(r.totalNet) : '—'}
                            </td>

                            <!-- Change % -->
                            <td class="px-1 py-2 text-center">
                                <span class="atom-badge min-w-[52px] h-[20px] text-[9px] tracking-tighter"
                                    class:atom-badge-bull={r.changePct > 0}
                                    class:atom-badge-bear={r.changePct < 0}
                                    class:atom-badge-flat={r.changePct === 0}
                                >
                                    {(r.changePct > 0 ? '+' : '') + r.changePct.toFixed(2) + '%'}
                                </span>
                            </td>

                            <!-- Volume -->
                            <td class="px-1 py-2 text-center text-text-muted/50 text-[10px]">
                                {r.volume > 0 ? r.volume.toLocaleString() : '—'}
                            </td>

                            <!-- Chevron -->
                            <td class="px-1 py-2 text-center">
                                <span class="chevron text-text-muted/20 group-hover:text-accent/60 text-[10px] transition-transform duration-200"
                                    class:rotate-180={expandedSymbol === r.symbol}
                                >▼</span>
                            </td>
                        </tr>

                        <!-- Expanded Forensic Panel -->
                        {#if expandedSymbol === r.symbol}
                            <tr>
                                <td colspan="11"
                            class="p-0 border-b border-border/30 bg-surface-hover/50">
                                    <div class="p-4 space-y-3 animate-fade-in">
                                        <!-- Channel Comparison Bar -->
                                        <div class="grid grid-cols-3 gap-3">
                                            <div class="flex flex-col p-3 bg-surface/60 rounded-lg border border-accent/10">
                                                <span class="text-[8px] font-mono text-accent/60 uppercase tracking-widest mb-1">Foreign</span>
                                                <span class="text-lg font-black font-mono {colorClass(r.foreignNet)}">
                                                    {r.foreignNet !== 0 ? (r.foreignNet > 0 ? '+' : '') + fmtNet(r.foreignNet) : '0'}
                                                </span>
                                                <span class="text-[9px] text-text-muted/40 mt-0.5">
                                                    連{Math.abs(r.foreignStreak)}日{r.foreignStreak > 0 ? '買超' : r.foreignStreak < 0 ? '賣超' : '—'}
                                                </span>
                                            </div>
                                            <div class="flex flex-col p-3 bg-surface/60 rounded-lg border border-bullish/10">
                                                <span class="text-[8px] font-mono text-bullish/60 uppercase tracking-widest mb-1">Trust</span>
                                                <span class="text-lg font-black font-mono {colorClass(r.investNet)}">
                                                    {r.investNet !== 0 ? (r.investNet > 0 ? '+' : '') + fmtNet(r.investNet) : '0'}
                                                </span>
                                                <span class="text-[9px] text-text-muted/40 mt-0.5">
                                                    連{Math.abs(r.investStreak)}日{r.investStreak > 0 ? '買超' : r.investStreak < 0 ? '賣超' : '—'}
                                                </span>
                                            </div>
                                            <div class="flex flex-col p-3 bg-surface/60 rounded-lg border border-yellow-500/10">
                                                <span class="text-[8px] font-mono text-yellow-400/60 uppercase tracking-widest mb-1">Dealer</span>
                                                <span class="text-lg font-black font-mono {colorClass(r.dealerNet)}">
                                                    {r.dealerNet !== 0 ? (r.dealerNet > 0 ? '+' : '') + fmtNet(r.dealerNet) : '0'}
                                                </span>
                                                <span class="text-[9px] text-text-muted/40 mt-0.5">
                                                    連{Math.abs(r.dealerStreak)}日{r.dealerStreak > 0 ? '買超' : r.dealerStreak < 0 ? '賣超' : '—'}
                                                </span>
                                            </div>
                                        </div>

                                        <!-- Forensic Details Grid -->
                                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-surface/40 border border-border/20 rounded">
                                            <div class="flex flex-col">
                                                <span class="text-[8px] text-text-muted/40 uppercase tracking-widest mb-0.5">大戶集中度</span>
                                                <span class="text-sm font-black font-mono">{(r.shareholderDist?.large1000 || 0).toFixed(1)}%</span>
                                            </div>
                                            <div class="flex flex-col">
                                                <span class="text-[8px] text-text-muted/40 uppercase tracking-widest mb-0.5">官股動向</span>
                                                <span class="text-sm font-black font-mono {colorClass(r.government?.netAmount || 0)}">
                                                    {r.government?.netAmount ? (r.government.netAmount / 1000).toFixed(1) + 'M' : '—'}
                                                </span>
                                            </div>
                                            <div class="flex flex-col">
                                                <span class="text-[8px] text-text-muted/40 uppercase tracking-widest mb-0.5">主力券商</span>
                                                <span class="text-sm font-black font-mono">{(r.brokerChip?.concentration || 0).toFixed(1)}%</span>
                                            </div>
                                            <div class="flex flex-col">
                                                <span class="text-[8px] text-text-muted/40 uppercase tracking-widest mb-0.5">散戶比例</span>
                                                <span class="text-sm font-black font-mono">{(r.shareholderDist?.small10 || 0).toFixed(1)}%</span>
                                            </div>
                                            <div class="flex flex-col">
                                                <span class="text-[8px] text-text-muted/40 uppercase tracking-widest mb-0.5">籌碼強度</span>
                                                <span class="text-sm font-black font-mono text-accent">{(r.chipsIntensity / 1000).toFixed(1)}K</span>
                                            </div>
                                            <div class="flex flex-col">
                                                <span class="text-[8px] text-text-muted/40 uppercase tracking-widest mb-0.5">質設比</span>
                                                <span class="text-sm font-black font-mono {(r.director?.pawn || 0) > 20 ? 'text-bearish' : ''}">
                                                    {(r.director?.pawn || 0).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div class="flex flex-col">
                                                <span class="text-[8px] text-text-muted/40 uppercase tracking-widest mb-0.5">融券餘額</span>
                                                <span class="text-sm font-black font-mono">{((r.lending?.shorting || 0) / 1000).toFixed(1)}K</span>
                                            </div>
                                            <div class="flex flex-col">
                                                <span class="text-[8px] text-text-muted/40 uppercase tracking-widest mb-0.5">漲跌幅</span>
                                                <span class="text-sm font-black font-mono {colorClass(r.changePct)}">
                                                    {(r.changePct > 0 ? '+' : '') + r.changePct.toFixed(2)}%
                                                </span>
                                            </div>
                                        </div>

                                        <!-- Badges -->
                                        <div class="flex flex-wrap gap-2">
                                            {#if r.changePct < 0 && r.chipsIntensity > 0}
                                                <span class="text-[8px] font-black px-2 py-0.5 bg-bullish/15 text-bullish rounded border border-bullish/25 animate-pulse">
                                                    DIVERGENCE — 價跌籌碼進
                                                </span>
                                            {/if}
                                            {#if r.shareholderDist && r.shareholderDist.large1000 > 60}
                                                <span class="text-[8px] font-black px-2 py-0.5 bg-accent/15 text-accent rounded border border-accent/25">
                                                    HIGH_CONCENTRATION {r.shareholderDist.large1000.toFixed(1)}%
                                                </span>
                                            {/if}
                                            {#if r.foreignStreak >= 5 && r.investStreak >= 3}
                                                <span class="text-[8px] font-black px-2 py-0.5 bg-warning/15 text-warning rounded border border-warning/25">
                                                    雙主力同步買超
                                                </span>
                                            {/if}
                                            {#if r.totalNet > 5000 && r.foreignStreak >= 3}
                                                <span class="text-[8px] font-black px-2 py-0.5 bg-surface-hover/60 text-text-primary rounded border border-border/30">
                                                    法人大量進場
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        {/if}
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>

    {#if hasMore}
        <div class="py-4 flex justify-center border-t border-border/20">
            <button
                class="h-9 px-8 bg-glass border border-border rounded-xl text-[9px] font-black tracking-[0.2em] uppercase hover:bg-accent/15 hover:border-accent/40 hover:text-accent transition-all"
                onclick={() => displayLimit += 150}
            >
                擴展監測範圍 (+150) — {unifiedRows.length - displayLimit} 剩餘
            </button>
        </div>
    {/if}
</div>

<style>
    .inst-active-row {
        background: linear-gradient(90deg, rgba(var(--color-accent-rgb, 99, 102, 241), 0.08), transparent) !important;
        position: relative;
    }
    .chevron {
        display: inline-block;
        transition: transform 0.2s ease;
    }
    .rotate-180 {
        transform: rotate(180deg);
    }
    :global(.animate-fade-in) {
        animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
