<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { marketStore } from '../../stores/market.svelte';
    import LiveIntradayDeepDive from './LiveIntradayDeepDive.svelte';

    // ─── Local UI State ────────────────────────────────
    let currentSortCol = $state('vol');
    let currentSortAsc = $state(false);
    let expandedCode = $state('');
    let displayLimit = $state(150);

    function toggleSort(col: string) {
        if (!col) return;
        if (currentSortCol === col) currentSortAsc = !currentSortAsc;
        else {
            currentSortCol = col;
            currentSortAsc = false;
        }
    }

    // ─── Reactive Filtering & Sorting (Runes) ──────────
    const filteredAndSorted = $derived.by(() => {
        const {
            searchKeyword,
            filterMarket,
            filterPriceRange,
            filterMinVol,
            filterTrend,
            filterMA20,
            filterStarred,
            watchlist,
        } = marketStore;
        const { stocks } = marketStore.state;

        return stocks
            .filter(s => {
                if (filterMarket && (s as any)._market !== filterMarket.toUpperCase()) return false;
                if (
                    searchKeyword &&
                    !s.code.includes(searchKeyword) &&
                    !s.name.includes(searchKeyword)
                )
                    return false;
                if (filterStarred && !watchlist.has(s.code)) return false;
                if (filterPriceRange) {
                    const [min, max] = filterPriceRange.split('-').map(Number);
                    if (s.price < min || s.price > max) return false;
                }
                if (filterMinVol > 0 && s.vol < filterMinVol) return false;
                if (filterTrend !== '0') {
                    const t = parseFloat(filterTrend);
                    if ((t > 0 && s.changePct < t) || (t < 0 && s.changePct > t)) return false;
                }
                if (filterMA20 !== 0 && s.ma20) {
                    const dist = (s.price / s.ma20 - 1) * 100;
                    if (
                        (filterMA20 > 0 && dist < filterMA20) ||
                        (filterMA20 < 0 && dist > filterMA20)
                    )
                        return false;
                }
                return true;
            })
            .sort((a, b) => {
                const va = (a as any)[currentSortCol] ?? 0;
                const vb = (b as any)[currentSortCol] ?? 0;
                if (typeof va === 'string' && typeof vb === 'string')
                    return currentSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
                return currentSortAsc
                    ? (va as number) - (vb as number)
                    : (vb as number) - (va as number);
            });
    });

    const displayItems = $derived(filteredAndSorted.slice(0, displayLimit));
    const hasMore = $derived(filteredAndSorted.length > displayLimit);

    // Auto-expand first item if none expanded
    let hasAutoExpanded = false;
    $effect(() => {
        if (!hasAutoExpanded && filteredAndSorted.length > 0) {
            expandedCode = filteredAndSorted[0].code;
            hasAutoExpanded = true;
        }
    });

    const headers = [
        { label: 'ENTITY', col: 'code' },
        { label: 'QUOTATION', col: 'price' },
        { label: 'VARIANCE', col: 'changePct' },
        { label: 'MA20', col: 'ma20' },
        { label: 'DIFF', col: 'change' },
        { label: 'OPEN', col: 'open' },
        { label: 'MAX', col: 'high' },
        { label: 'MIN', col: 'low' },
        { label: 'VOLUME', col: 'vol' },
        { label: '', col: '' },
    ];

    async function toggleExpand(code: string, event: MouseEvent) {
        const isOpening = expandedCode !== code;
        expandedCode = isOpening ? code : '';

        if (isOpening) {
            const tr = event.currentTarget as HTMLElement;
            await tick();

            const workspace = document.getElementById('main-workspace');
            const toolbar =
                document.getElementById('live-toolbar-nexus') ||
                document.getElementById('live-toolbar-nexus-svelte');

            if (workspace && tr) {
                const thead = tr.closest('table')?.querySelector('thead') as HTMLElement;
                const toolbarHeight = toolbar ? toolbar.offsetHeight : 0;
                const headerHeight = thead ? thead.offsetHeight : 40;

                const workspaceRect = workspace.getBoundingClientRect();
                const trRect = tr.getBoundingClientRect();

                const scrollTarget =
                    workspace.scrollTop +
                    (trRect.top - workspaceRect.top) -
                    toolbarHeight -
                    headerHeight -
                    245;

                workspace.scrollTo({ top: scrollTarget, behavior: 'smooth' });
            }
        }
    }

    function colorClass(val: number) {
        return val > 0 ? 'clr-bull' : val < 0 ? 'clr-bear' : 'clr-flat';
    }
</script>

<div class="live-table-root w-full">
    <table class="w-full text-left table-fixed whitespace-nowrap border-separate border-spacing-0">
        <colgroup>
            <col style="width: 14%;" />
            <col style="width: 12%;" />
            <col style="width: 11%;" />
            <col style="width: 9%;" />
            <col style="width: 10%;" />
            <col style="width: 10%;" />
            <col style="width: 10%;" />
            <col style="width: 14%;" />
            <col style="width: 6%;" />
        </colgroup>

        <thead class="z-30">
            <tr>
                {#each headers as h}
                    <th
                        class="sticky z-20 bg-surface border-y border-border select-none text-center py-2.5 px-3 text-[10px] font-black text-text-muted uppercase shadow-sm transition-colors"
                        class:cursor-pointer={!!h.col}
                        class:hover:text-accent={!!h.col}
                        style="top: var(--toolbar-nexus-height, 0px);"
                        onclick={() => h.col && toggleSort(h.col)}
                    >
                        {#if h.label}
                            <span class="inline-flex items-center gap-1 justify-center">
                                {h.label}
                                {#if h.col}
                                    <span
                                        class="sort-icon {currentSortCol === h.col
                                            ? 'opacity-100 text-accent'
                                            : 'opacity-30'}"
                                    >
                                        {currentSortCol === h.col
                                            ? currentSortAsc
                                                ? '↑'
                                                : '↓'
                                            : '↕'}
                                    </span>
                                {/if}
                            </span>
                        {/if}
                    </th>
                {/each}
            </tr>
        </thead>

        <tbody class="divide-y divide-border/50 text-xs font-mono">
            {#if marketStore.state.error}
                <tr>
                    <td
                        colspan="9"
                        class="py-24 text-center text-bearish uppercase tracking-[0.2em] italic"
                    >
                        {marketStore.state.error}
                    </td>
                </tr>
            {:else if marketStore.state.isLoading && marketStore.state.stocks.length === 0}
                <tr>
                    <td colspan="9" class="py-12 bg-surface/20">
                        <div
                            class="flex flex-col items-center gap-2 opacity-30 text-[9px] uppercase tracking-[0.5em] animate-pulse"
                        >
                            Awaiting_Uplink...
                        </div>
                    </td>
                </tr>
            {:else if filteredAndSorted.length === 0}
                <tr>
                    <td
                        colspan="9"
                        class="py-12 text-center text-text-muted opacity-30 text-[9px] uppercase tracking-[0.5em]"
                    >
                        No_Data_Matches_Current_Filter
                    </td>
                </tr>
            {:else}
                {#each displayItems as s (s.code)}
                    {@const isUp = s.changePct > 0}
                    {@const isDown = s.changePct < 0}
                    <tr
                        class="group cursor-pointer transition-colors hover:bg-white/[0.02]"
                        class:active-row={expandedCode === s.code}
                        onclick={e => toggleExpand(s.code, e)}
                    >
                        <td
                            class="px-3 py-3 border-r border-border/30"
                            class:border-l-4={expandedCode === s.code}
                            class:border-l-accent={expandedCode === s.code}
                        >
                            <div class="flex items-center gap-2">
                                <button
                                    class="star-btn shrink-0 transition-all duration-300 hover:scale-125 flex items-center justify-center {marketStore.watchlist.has(
                                        s.code
                                    )
                                        ? 'text-warning'
                                        : 'text-text-muted/20 hover:text-text-muted/50'}"
                                    aria-label="Toggle Watchlist"
                                    onclick={e => {
                                        e.stopPropagation();
                                        marketStore.toggleWatchlist(s.code);
                                    }}
                                >
                                    <svg
                                        class="w-5 h-5"
                                        viewBox="0 0 24 24"
                                        fill={marketStore.watchlist.has(s.code)
                                            ? 'currentColor'
                                            : 'none'}
                                        stroke="currentColor"
                                    >
                                        <polygon
                                            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                                        ></polygon>
                                    </svg>
                                </button>
                                <div class="flex flex-col min-w-0 flex-1 leading-tight text-left">
                                    <span
                                        class="text-sm font-black text-white group-hover:text-accent truncate tracking-tight transition-colors"
                                    >
                                        {s.name}
                                    </span>
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="text-[10px] text-text-muted/60 font-mono tracking-widest"
                                            >{s.code}</span
                                        >
                                        {#if expandedCode === s.code}
                                            <a
                                                href={`/stocks/${s.code}`}
                                                class="analysis-link py-0.5 px-2"
                                                onclick={e => e.stopPropagation()}>分析 ↗</a
                                            >
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td
                            class="px-1.5 py-2 text-center text-sm font-bold {colorClass(s.change)}"
                        >
                            {s.price > 0 ? s.price.toFixed(2) : '—'}
                        </td>
                        <td class="px-1.5 py-2 text-center">
                            <div
                                class="inline-flex items-center justify-center min-w-[64px] h-[22px] rounded border text-[10px] font-black px-2 tracking-tighter"
                                class:badge-bull={isUp}
                                class:badge-bear={isDown}
                                class:badge-flat={!isUp && !isDown}
                            >
                                {(isUp ? '+' : '') +
                                    (s.price > 0 ? s.changePct.toFixed(2) + '%' : '—')}
                            </div>
                        </td>
                        <td
                            class="px-1.5 py-2 text-center text-[11px] font-bold"
                            class:text-bullish={s.ma20 && s.price > s.ma20}
                            class:text-bearish={s.ma20 && s.price < s.ma20}
                        >
                            <div class="flex flex-col items-center">
                                <span>{s.ma20 ? s.ma20.toFixed(2) : '—'}</span>
                                <div class="flex gap-0.5 mt-0.5 scale-75 origin-top">
                                    {#if s.rsi > 70}<span
                                            class="px-1 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded-[2px] text-[8px] font-black"
                                            >RSI:OB</span
                                        >
                                    {:else if s.rsi < 30 && s.rsi > 0}<span
                                            class="px-1 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-[2px] text-[8px] font-black"
                                            >RSI:OS</span
                                        >{/if}
                                </div>
                            </div>
                        </td>
                        <td
                            class="px-1.5 py-2 text-center font-bold {colorClass(
                                s.change
                            )} text-[10px]"
                        >
                            {s.change > 0 ? '+' : ''}{s.price > 0 ? s.change.toFixed(2) : '—'}
                        </td>
                        <td class="px-1.5 py-2 text-center text-text-muted"
                            >{s.open > 0 ? s.open.toFixed(2) : '—'}</td
                        >
                        <td class="px-1.5 py-2 text-center clr-bull-mute"
                            >{s.high > 0 ? s.high.toFixed(2) : '—'}</td
                        >
                        <td class="px-1.5 py-2 text-center clr-bear-mute"
                            >{s.low > 0 ? s.low.toFixed(2) : '—'}</td
                        >
                        <td
                            class="px-1.5 py-2 text-center text-text-muted opacity-60 text-[10px] uppercase font-mono"
                            >{s.vol > 0 ? s.vol.toLocaleString() : '—'}</td
                        >
                        <td class="px-1.5 py-2 text-center">
                            <span
                                class="chevron opacity-20 group-hover:opacity-100 transition-all"
                                class:rotated={expandedCode === s.code}>▼</span
                            >
                        </td>
                    </tr>
                    {#if expandedCode === s.code}
                        <tr>
                            <td
                                colspan="9"
                                class="p-0 border-b border-border bg-base-deep shadow-inner"
                            >
                                <LiveIntradayDeepDive
                                    symbol={s.code}
                                    currentPrice={s.price}
                                    prevClose={s.price - s.change}
                                />
                            </td>
                        </tr>
                    {/if}
                {/each}
            {/if}
        </tbody>
    </table>
</div>

{#if hasMore}
    <div class="mt-6 pb-12 flex justify-center">
        <button
            class="h-10 px-10 bg-glass border border-border rounded-xl text-[10px] font-black tracking-[0.2em] uppercase hover:bg-accent/15 hover:border-accent/40 hover:text-accent transition-all shadow-lg"
            onclick={() => (displayLimit += 150)}
        >
            擴展監測範圍 (+150 向量) — {filteredAndSorted.length - displayLimit} 剩餘
        </button>
    </div>
{/if}

<style>
    .active-row {
        background: linear-gradient(90deg, var(--color-accent-glow), rgba(0, 0, 0, 0)) !important;
        position: relative;
        z-index: 10;
        box-shadow: inset 4px 0 0 var(--color-accent);
    }
    .analysis-link {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        background: var(--color-accent-glow);
        color: var(--color-accent);
        border-radius: 4px;
        font-size: 8px;
        font-weight: 900;
        text-transform: uppercase;
        text-decoration: none;
        border: 1px solid var(--color-accent-dim);
    }
    .analysis-link:hover {
        background: var(--color-accent);
        color: white;
        transform: translateY(-1px);
    }
    .chevron {
        font-size: 11px;
        display: inline-block;
        font-weight: 900;
    }
    .chevron.rotated {
        transform: rotate(180deg);
        color: var(--color-accent);
        opacity: 1 !important;
    }
    .badge-bull {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
        color: rgb(239, 68, 68);
    }
    .badge-bear {
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.3);
        color: rgb(34, 197, 94);
    }
    .badge-flat {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.4);
    }
</style>
