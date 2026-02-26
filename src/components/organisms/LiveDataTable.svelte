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

    // ─── Derived: Color helpers (pure, no side effects) ─
    const colorClass = (chg: number) => (chg > 0 ? 'clr-bull' : chg < 0 ? 'clr-bear' : 'clr-flat');

    const varBadge = (chg: number) => (chg > 0 ? 'var-bull' : chg < 0 ? 'var-bear' : 'var-flat');

    // ─── Sort ──────────────────────────────────────────
    function toggleSort(col: string) {
        if (!col) return;
        if (currentSortCol === col) currentSortAsc = !currentSortAsc;
        else {
            currentSortCol = col;
            currentSortAsc = false;
        }
    }

    // ─── Computed: filter + sort ────────────────────────
    // Column sort key lookup — avoids repeated if/else chain
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

    // ─── Table headers (static, declared once) ─────────
    const headers = [
        { label: 'ENTITY', col: 'Code', left: true },
        { label: 'QUOTATION', col: 'ClosingPrice' },
        { label: 'VARIANCE', col: 'ChangePct' },
        { label: 'DIFF', col: 'Change' },
        { label: 'OPEN', col: 'OpeningPrice' },
        { label: 'MAX', col: 'HighestPrice' },
        { label: 'MIN', col: 'LowestPrice' },
        { label: 'VOLUME', col: 'TradeVolume' },
        { label: '', col: '' },
    ];

    // ─── Watchlist ─────────────────────────────────────
    function toggleWatchlist(code: string) {
        const wl: string[] = JSON.parse(localStorage.getItem('watchlist') || '[]');
        const i = wl.indexOf(code);
        if (i > -1) wl.splice(i, 1);
        else wl.push(code);
        localStorage.setItem('watchlist', JSON.stringify(wl));
        watchlistSet = new Set(wl);
    }

    let scrollContainer: HTMLDivElement;
    async function toggleExpand(code: string, event: MouseEvent) {
        const isOpening = expandedCode !== code;
        expandedCode = isOpening ? code : '';

        if (isOpening) {
            const tr = event.currentTarget as HTMLElement;
            await tick();

            const toolbar = document.getElementById('live-toolbar-nexus');
            const toolbarHeight = toolbar ? toolbar.offsetHeight : 72;
            const tableHeader = tr.closest('table')?.querySelector('thead');
            const headerHeight = tableHeader ? tableHeader.offsetHeight : 35;
            const stickyOffset = toolbarHeight + headerHeight;

            const elementRect = tr.getBoundingClientRect();
            const absoluteElementTop = elementRect.top + window.pageYOffset;

            // Move it UP: scroll so the row is right under the sticky header
            const finalScrollPos = absoluteElementTop - stickyOffset - 4;

            window.scrollTo({
                top: finalScrollPos,
                behavior: 'smooth',
            });
        }
    }

    // ─── Lifecycle ─────────────────────────────────────
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

    // Lazy-load the chart component
    import LiveIntradayDeepDive from './LiveIntradayDeepDive.svelte';
</script>

<div class="live-table-root w-full">
    <div bind:this={scrollContainer} class="overflow-x-auto custom-scrollbar">
        <table
            class="w-full text-left table-fixed whitespace-nowrap border-separate border-spacing-0"
        >
            <colgroup>
                <col style="width: 14%;" /><!-- ENTITY -->
                <col style="width: 12%;" /><!-- QUOTATION -->
                <col style="width: 11%;" /><!-- VARIANCE -->
                <col style="width: 9%;" /><!-- DIFF -->
                <col style="width: 10%;" /><!-- OPEN -->
                <col style="width: 10%;" /><!-- MAX -->
                <col style="width: 10%;" /><!-- MIN -->
                <col style="width: 14%;" /><!-- VOLUME -->
                <col style="width: 10%;" /><!-- ANALYSIS -->
            </colgroup>
            <thead
                class="sticky top-[var(--toolbar-nexus-height,72px)] bg-surface border-b border-border z-20 text-[10px] font-black text-text-muted uppercase shadow-sm table-fixed"
            >
                <tr>
                    {#each headers as h}
                        <th
                            class="py-2.5 px-1.5 border-b border-border select-none text-center"
                            class:cursor-pointer={!!h.col}
                            class:hover:text-accent={!!h.col}
                            on:click={() => toggleSort(h.col)}
                        >
                            {#if h.col}
                                <span class="inline-flex items-center gap-1 justify-center">
                                    {h.label}
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
                            class="py-24 text-center text-bearish font-mono text-[10px] tracking-[0.2em] uppercase italic"
                        >
                            {errorState}
                        </td>
                    </tr>
                {:else if filteredAndSorted.length === 0}
                    <tr>
                        <td
                            colspan="9"
                            class="py-24 text-center text-text-muted font-mono text-[10px] tracking-[0.2em] uppercase"
                        >
                            {loadingState}
                        </td>
                    </tr>
                {:else}
                    {#each filteredAndSorted as s (s.Code)}
                        <tr
                            class="group cursor-pointer transition-colors hover:bg-accent/[0.04] scroll-mt-[35px]"
                            class:active-row={expandedCode === s.Code}
                            on:click={e => toggleExpand(s.Code, e)}
                        >
                            <!-- ENTITY -->
                            <td
                                class="px-3 py-3 border-r border-border/30 overflow-hidden"
                                class:border-l-4={expandedCode === s.Code}
                                class:border-l-accent={expandedCode === s.Code}
                            >
                                <div class="flex items-center gap-2">
                                    <button
                                        class="star-btn text-base shrink-0 {watchlistSet.has(s.Code)
                                            ? 'text-warning'
                                            : 'text-text-muted/10 hover:text-text-muted/40'}"
                                        on:click|stopPropagation={() => toggleWatchlist(s.Code)}
                                        title="Toggle Watchlist">★</button
                                    >
                                    <div class="flex flex-col min-w-0 flex-1 leading-tight">
                                        <span
                                            class="text-sm font-black text-white group-hover:text-accent truncate tracking-tight transition-colors"
                                            >{s.Name}</span
                                        >
                                        <span
                                            class="text-[10px] text-text-muted/60 font-mono tracking-widest uppercase mt-0.5"
                                            >{s.Code}</span
                                        >
                                    </div>
                                </div>
                            </td>
                            <!-- QUOTATION -->
                            <td class="px-1.5 py-2 text-center">
                                <span class="text-sm font-bold {colorClass(s._change)}">
                                    {s._closePrice > 0 ? s._closePrice.toFixed(2) : '—'}
                                </span>
                            </td>
                            <!-- VARIANCE -->
                            <td class="px-1.5 py-2 text-center">
                                <div
                                    class="inline-flex items-center justify-center min-w-[60px] h-[20px] rounded-md border text-[10px] font-bold px-1.5 {varBadge(
                                        s._change
                                    )}"
                                >
                                    {s._change > 0 ? '+' : ''}{s._closePrice > 0
                                        ? s._changePct.toFixed(2) + '%'
                                        : '—'}
                                </div>
                            </td>
                            <!-- DIFF -->
                            <td class="px-1.5 py-2 text-center">
                                <span class="text-[10px] font-bold {colorClass(s._change)}">
                                    {s._change > 0 ? '+' : ''}{s._closePrice > 0
                                        ? s._change.toFixed(2)
                                        : '—'}
                                </span>
                            </td>
                            <!-- OPEN -->
                            <td class="px-1.5 py-2 text-center">
                                <span
                                    class={s._open > s._closePrice - s._change
                                        ? 'clr-bull-mute'
                                        : s._open < s._closePrice - s._change
                                          ? 'clr-bear-mute'
                                          : 'clr-flat'}
                                >
                                    {s._open > 0 ? s._open.toFixed(2) : '—'}
                                </span>
                            </td>
                            <!-- MAX -->
                            <td class="px-1.5 py-2 text-center clr-bull-mute"
                                >{s._high > 0 ? s._high.toFixed(2) : '—'}</td
                            >
                            <!-- MIN -->
                            <td class="px-1.5 py-2 text-center clr-bear-mute"
                                >{s._low > 0 ? s._low.toFixed(2) : '—'}</td
                            >
                            <!-- VOLUME -->
                            <td class="px-1.5 py-2 text-center text-text-muted"
                                >{s._vol > 0 ? s._vol.toLocaleString() : '—'}</td
                            >
                            <!-- ANALYSIS -->
                            <td class="px-1.5 py-2 text-center">
                                <a
                                    href={`/stocks/${s.Code}`}
                                    class="analysis-link opacity-0 group-hover:opacity-100"
                                    on:click|stopPropagation>Analysis ↗</a
                                >
                            </td>
                        </tr>

                        {#if expandedCode === s.Code}
                            <tr>
                                <td colspan="9" class="p-0 border-b border-border bg-[#0a0c10]">
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
</div>

<style>
    @reference "../../styles/global.css";
    /* ─── Theme-aware utility classes ──────────────── */

    .clr-bull {
        color: var(--color-bullish);
    }
    .clr-bear {
        color: var(--color-bearish);
    }
    .clr-flat {
        color: var(--color-text-muted);
    }
    .clr-bull-mute {
        color: var(--color-bullish-dim);
    }
    .clr-bear-mute {
        color: var(--color-bearish-dim);
    }

    .var-bull {
        background: var(--color-bullish-glow);
        border-color: var(--color-bullish-dim);
        color: var(--color-bullish);
    }
    .var-bear {
        background: var(--color-bearish-glow);
        border-color: var(--color-bearish-dim);
        color: var(--color-bearish);
    }
    .var-flat {
        background: var(--color-glass);
        border-color: var(--color-border);
        color: var(--color-text-muted);
    }

    .star-btn {
        transition: color 0.15s ease;
    }

    .analysis-link {
        transition: opacity 0.15s ease;
        background: var(--color-accent-glow);
        color: var(--color-accent);
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        text-decoration: none;
        white-space: nowrap;
        border: 1px solid var(--color-accent-dim);
    }
    .analysis-link:hover {
        background: var(--color-accent);
        color: white;
    }

    .active-row {
        background: linear-gradient(90deg, var(--color-accent-glow), rgba(0, 0, 0, 0)) !important;
        position: relative;
        z-index: 10;
    }

    .active-row td {
        border-bottom: 2px solid var(--color-accent) !important;
    }

    .sort-icon {
        transition: opacity 0.1s ease;
    }
</style>
