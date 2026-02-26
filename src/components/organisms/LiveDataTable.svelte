<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';

    interface LiveStock {
        Code: string;
        Name: string;
        ClosingPrice: string;
        Change: string;
        TradeVolume: string;
        OpeningPrice: string;
        HighestPrice: string;
        LowestPrice: string;
        _closePrice: number;
        _change: number;
        _changePct: number;
        _vol: number;
        _open: number;
        _high: number;
        _low: number;
    }

    // ─── State ─────────────────────────────────────────
    let stocks: LiveStock[] = [];
    let currentSortCol = 'TradeVolume';
    let currentSortAsc = false;
    let loadingState = 'Awaiting_Uplink...';
    let errorState = '';
    let expandedCode = '';

    // ─── Filter State ──────────────────────────────────
    let searchKeyword = '';
    let tsMarket = '';
    let tsPriceRange = '';
    let tsVol = 0;
    let tsTrend = '0';
    let tsStarred = false;
    let watchlistSet = new Set<string>();

    function toggleSort(col: string) {
        if (!col) return;
        if (currentSortCol === col) currentSortAsc = !currentSortAsc;
        else {
            currentSortCol = col;
            currentSortAsc = false;
        }
    }

    const sortKeyMap: Record<string, keyof LiveStock> = {
        ClosingPrice: '_closePrice',
        ChangePct: '_changePct',
        Change: '_change',
        TradeVolume: '_vol',
    };

    $: filteredAndSorted = stocks
        .filter(s => {
            if (tsMarket && (s as any)._market !== tsMarket.toUpperCase()) return false;
            if (
                searchKeyword &&
                !s.Code.toLowerCase().includes(searchKeyword) &&
                !s.Name.toLowerCase().includes(searchKeyword)
            )
                return false;
            if (tsStarred && !watchlistSet.has(s.Code)) return false;
            if (tsPriceRange) {
                const [min, max] = tsPriceRange.split('-').map(Number);
                if (s._closePrice < min || s._closePrice > max) return false;
            }
            if (tsVol > 0 && s._vol < tsVol) return false;
            if (tsTrend !== '0') {
                const t = parseFloat(tsTrend);
                if ((t > 0 && s._changePct < t) || (t < 0 && s._changePct > t)) return false;
            }
            return true;
        })
        .sort((a, b) => {
            const key = sortKeyMap[currentSortCol] || (currentSortCol as keyof LiveStock);
            const va = a[key],
                vb = b[key];
            if (typeof va === 'string' && typeof vb === 'string')
                return currentSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
            return currentSortAsc
                ? (va as number) - (vb as number)
                : (vb as number) - (va as number);
        });

    const headers = [
        { label: 'ENTITY', col: 'Code' },
        { label: 'QUOTATION', col: 'ClosingPrice' },
        { label: 'VARIANCE', col: 'ChangePct' },
        { label: 'DIFF', col: 'Change' },
        { label: 'OPEN', col: 'OpeningPrice' },
        { label: 'MAX', col: 'HighestPrice' },
        { label: 'MIN', col: 'LowestPrice' },
        { label: 'VOLUME', col: 'TradeVolume' },
        { label: '', col: '' },
    ];

    function toggleWatchlist(code: string) {
        const wl: string[] = JSON.parse(localStorage.getItem('watchlist') || '[]');
        const i = wl.indexOf(code);
        if (i > -1) wl.splice(i, 1);
        else wl.push(code);
        localStorage.setItem('watchlist', JSON.stringify(wl));
        watchlistSet = new Set(wl);
    }

    async function toggleExpand(code: string, event: MouseEvent) {
        const isOpening = expandedCode !== code;
        expandedCode = isOpening ? code : '';

        if (isOpening) {
            const tr = event.currentTarget as HTMLElement;
            await tick();

            const workspace = document.getElementById('main-workspace');
            const toolbar = document.getElementById('live-toolbar-nexus');

            if (workspace && tr) {
                const toolbarHeight = toolbar ? toolbar.offsetHeight : 0;
                const headerHeight = 35;

                const workspaceRect = workspace.getBoundingClientRect();
                const trRect = tr.getBoundingClientRect();

                // Increase buffer to 48px to ensure clear visibility below the sticky header
                const scrollTarget =
                    workspace.scrollTop +
                    (trRect.top - workspaceRect.top) -
                    toolbarHeight -
                    headerHeight -
                    48;

                workspace.scrollTo({
                    top: Math.max(0, scrollTarget),
                    behavior: 'smooth',
                });
            }
        }
    }

    let handler: ((e: Event) => void) | null = null;
    onMount(() => {
        watchlistSet = new Set(JSON.parse(localStorage.getItem('watchlist') || '[]'));
        handler = (e: Event) => {
            const { type, payload } = (e as CustomEvent).detail;
            if (type === 'DATA') {
                stocks = payload.data;
                errorState = '';
            } else if (type === 'FILTERS') {
                searchKeyword = payload.search?.toLowerCase() || '';
                tsMarket = payload.market || '';
                tsPriceRange = payload.price || '';
                tsVol = payload.volume || 0;
                tsTrend = payload.trend || '0';
                tsStarred = payload.starred || false;
                watchlistSet = new Set(JSON.parse(localStorage.getItem('watchlist') || '[]'));
            }
        };
        window.addEventListener('tw-live-update', handler);
    });

    onDestroy(() => {
        if (handler) window.removeEventListener('tw-live-update', handler);
    });

    import LiveIntradayDeepDive from './LiveIntradayDeepDive.svelte';
    import PriceBadge from '../atoms/PriceBadge.svelte';
    import WatchlistButton from '../atoms/WatchlistButton.svelte';

    function colorClass(chg: number) {
        return chg > 0 ? 'clr-bull' : chg < 0 ? 'clr-bear' : 'clr-flat';
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
                        on:click={() => h.col && toggleSort(h.col)}
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
            {#if errorState}
                <tr>
                    <td
                        colspan="9"
                        class="py-24 text-center text-bearish uppercase tracking-[0.2em] italic"
                    >
                        {errorState}
                    </td>
                </tr>
            {:else if !stocks || stocks.length === 0}
                <tr>
                    <td colspan="9" class="py-12 bg-surface/20">
                        <div
                            class="flex flex-col items-center gap-2 opacity-30 text-[9px] uppercase tracking-[0.5em]"
                        >
                            {loadingState}
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
                {#each filteredAndSorted as s (s.Code)}
                    <tr
                        class="group cursor-pointer transition-colors hover:bg-white/[0.02]"
                        class:active-row={expandedCode === s.Code}
                        on:click={e => toggleExpand(s.Code, e)}
                    >
                        <td
                            class="px-3 py-3 border-r border-border/30"
                            class:border-l-4={expandedCode === s.Code}
                            class:border-l-accent={expandedCode === s.Code}
                        >
                            <div class="flex items-center gap-2">
                                <WatchlistButton
                                    active={watchlistSet.has(s.Code)}
                                    on:toggle={() => toggleWatchlist(s.Code)}
                                />
                                <div class="flex flex-col min-w-0 flex-1 leading-tight text-left">
                                    <span
                                        class="text-sm font-black text-white group-hover:text-accent truncate tracking-tight transition-colors"
                                    >
                                        {s.Name}
                                    </span>
                                    <span
                                        class="text-[10px] text-text-muted/60 font-mono tracking-widest"
                                    >
                                        {s.Code}
                                    </span>
                                </div>
                            </div>
                        </td>
                        <td
                            class="px-1.5 py-2 text-center text-sm font-bold {colorClass(
                                s._change
                            )}"
                        >
                            {s._closePrice > 0 ? s._closePrice.toFixed(2) : '—'}
                        </td>
                        <td class="px-1.5 py-2 text-center">
                            <PriceBadge value={s._changePct} isPct={true} pClose={s._closePrice} />
                        </td>
                        <td
                            class="px-1.5 py-2 text-center font-bold {colorClass(
                                s._change
                            )} text-[10px]"
                        >
                            {s._change > 0 ? '+' : ''}{s._closePrice > 0
                                ? s._change.toFixed(2)
                                : '—'}
                        </td>
                        <td class="px-1.5 py-2 text-center text-text-muted">
                            {s._open > 0 ? s._open.toFixed(2) : '—'}
                        </td>
                        <td class="px-1.5 py-2 text-center clr-bull-mute">
                            {s._high > 0 ? s._high.toFixed(2) : '—'}
                        </td>
                        <td class="px-1.5 py-2 text-center clr-bear-mute">
                            {s._low > 0 ? s._low.toFixed(2) : '—'}
                        </td>
                        <td
                            class="px-1.5 py-2 text-center text-text-muted opacity-60 text-[10px] uppercase font-mono"
                        >
                            {s._vol > 0 ? s._vol.toLocaleString() : '—'}
                        </td>
                        <td class="px-1.5 py-2 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <a
                                    href={`/stocks/${s.Code}`}
                                    class="analysis-link opacity-0 group-hover:opacity-100"
                                    on:click|stopPropagation
                                >
                                    Analysis ↗
                                </a>
                                <span
                                    class="chevron opacity-20 group-hover:opacity-100 transition-all duration-300"
                                    class:rotated={expandedCode === s.Code}
                                >
                                    ▼
                                </span>
                            </div>
                        </td>
                    </tr>
                    {#if expandedCode === s.Code}
                        <tr>
                            <td
                                colspan="9"
                                class="p-0 border-b border-border bg-[#0a0c10] shadow-inner"
                            >
                                <LiveIntradayDeepDive
                                    symbol={s.Code}
                                    currentPrice={s._closePrice}
                                />
                            </td>
                        </tr>
                    {/if}
                {/each}
            {/if}
        </tbody>
    </table>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
        height: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
    }

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
        padding: 2px 8px;
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
        box-shadow: 0 4px 12px var(--color-accent-glow);
    }

    .chevron {
        font-size: 8px;
        display: inline-block;
    }
    .chevron.rotated {
        transform: rotate(180deg);
        color: var(--color-accent);
        opacity: 1 !important;
    }
</style>
