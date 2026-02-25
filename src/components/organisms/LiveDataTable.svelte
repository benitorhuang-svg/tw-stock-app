<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    // Props

    interface LiveStock {
        Code: string;
        Name: string;
        ClosingPrice: string;
        Change: string;
        TradeVolume: string;
        OpeningPrice: string;
        HighestPrice: string;
        LowestPrice: string;
        // Calculated
        _closePrice: number;
        _change: number;
        _changePct: number;
        _vol: number;
        _open: number;
        _high: number;
        _low: number;
    }

    let stocks: LiveStock[] = [];
    let isPolling = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let currentSortCol = 'TradeVolume';
    let currentSortAsc = false;
    let loadingState = 'Awaiting_Uplink...';
    let errorState = '';

    // Extracted directly from live-engine.ts styling logic
    function getColorClass(change: number) {
        if (change > 0) return 'text-bullish drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]';
        if (change < 0) return 'text-bearish drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]';
        return 'text-white/40';
    }

    function toggleSort(col: string) {
        if (currentSortCol === col) {
            currentSortAsc = !currentSortAsc;
        } else {
            currentSortCol = col;
            currentSortAsc = false;
        }
    }

    // Internal UI filters mirroring live-engine.ts inputs
    let searchKeyword = '';
    let tsMarket = '';
    let tsSector = '';
    let tsPriceRange = '';
    let tsVol = 0;
    let tsTrend = '0';
    let tsStarred = false;
    let watchlistSet = new Set<string>();

    onMount(() => {
        // Hydrate watchlist
        const wl = JSON.parse(localStorage.getItem('watchlist') || '[]');
        watchlistSet = new Set(wl);

        // Bind global commander (listens to legacy live-engine.ts controls)
        window.addEventListener('tw-live-update', (e: any) => {
            const { type, payload } = e.detail;
            if (type === 'DATA') {
                stocks = payload.data;
                errorState = '';
            } else if (type === 'FILTERS') {
                searchKeyword = payload.search.toLowerCase();
                tsMarket = payload.market;
                tsSector = payload.sector;
                tsPriceRange = payload.price;
                tsVol = payload.volume;
                tsTrend = payload.trend;
                tsStarred = payload.starred;

                const wl = JSON.parse(localStorage.getItem('watchlist') || '[]');
                watchlistSet = new Set(wl);
            }
        });
        // Initialize polling if button is already active (rare but possible on View Transitions)
        const toggleBtn = document.getElementById('toggle-polling-btn');
        if (toggleBtn && toggleBtn.classList.contains('active-radar')) {
            // Since polling was decoupled from inside Svelte, rely on the global events.
        }
    });

    $: filteredAndSorted = stocks
        .filter(s => {
            if (tsMarket && s._market !== tsMarket.toUpperCase()) return false;
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
            let valA: any = a[currentSortCol as keyof LiveStock];
            let valB: any = b[currentSortCol as keyof LiveStock];

            // Map computed virtual columns if required
            if (currentSortCol === 'ClosingPrice') {
                valA = a._closePrice;
                valB = b._closePrice;
            }
            if (currentSortCol === 'ChangePct') {
                valA = a._changePct;
                valB = b._changePct;
            }
            if (currentSortCol === 'Change') {
                valA = a._change;
                valB = b._change;
            }
            if (currentSortCol === 'TradeVolume') {
                valA = a._vol;
                valB = b._vol;
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return currentSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return currentSortAsc ? valA - valB : valB - valA;
        });

    onDestroy(() => {
        if (pollInterval) clearInterval(pollInterval);
    });
</script>

<div
    class="glass-card overflow-hidden flex-1 flex flex-col min-h-0 !border-white/5 !bg-surface/5 shadow-2xl"
>
    <div class="overflow-y-auto overflow-x-auto custom-scrollbar flex-1 rounded-lg">
        <table class="w-full text-left border-collapse whitespace-nowrap">
            <thead
                class="sticky top-0 bg-surface/90 backdrop-blur-md z-20 text-[10px] font-black text-white/40 uppercase border-b border-white/5"
            >
                <tr>
                    {#each [{ label: 'ENTITY', col: 'Code', align: 'left' }, { label: 'QUOTATION', col: 'ClosingPrice', align: 'right' }, { label: 'VARIANCE', col: 'ChangePct', align: 'right' }, { label: 'DIFF', col: 'Change', align: 'right' }, { label: 'OPEN', col: 'OpeningPrice', align: 'right' }, { label: 'MAX', col: 'HighestPrice', align: 'right' }, { label: 'MIN', col: 'LowestPrice', align: 'right' }, { label: 'VOLUME', col: 'TradeVolume', align: 'right' }] as h}
                        <th
                            class="py-3 border-b border-white/5 cursor-pointer hover:text-accent select-none group"
                            class:px-3={h.align === 'left'}
                            class:px-2={h.align === 'right'}
                            class:text-right={h.align === 'right'}
                            on:click={() => toggleSort(h.col)}
                        >
                            <span
                                class="flex items-center gap-1.5"
                                class:justify-end={h.align === 'right'}
                            >
                                {h.label}
                                <span
                                    class="sort-icon transition-opacity {currentSortCol === h.col
                                        ? 'opacity-100 text-accent'
                                        : 'opacity-50 group-hover:opacity-100'}"
                                >
                                    {currentSortCol === h.col ? (currentSortAsc ? '↑' : '↓') : '↕'}
                                </span>
                            </span>
                        </th>
                    {/each}
                </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.02] text-xs font-mono">
                {#if errorState}
                    <tr class="text-center group">
                        <td
                            colspan="8"
                            class="py-24 text-bearish font-mono text-[10px] tracking-[0.2em] uppercase italic"
                        >
                            {errorState}
                        </td>
                    </tr>
                {:else if filteredAndSorted.length === 0}
                    <tr class="text-center group">
                        <td
                            colspan="8"
                            class="py-24 text-white/20 font-mono text-[10px] tracking-[0.2em] uppercase"
                        >
                            {loadingState}
                        </td>
                    </tr>
                {:else}
                    {#each filteredAndSorted as s (s.Code)}
                        <tr class="hover:bg-accent/[0.04] transition-colors cursor-pointer group">
                            <td
                                class="px-3 py-3 border-r border-white/5 relative bg-inherit z-10 sticky left-0 group-hover:bg-accent/[0.04] transition-colors"
                            >
                                <span
                                    class="font-bold text-white/90 group-hover:text-accent transition-colors mr-2 cursor-pointer no-underline block truncate max-w-[120px]"
                                >
                                    {s.Name}
                                </span>
                                <span class="text-[9px] text-white/30 uppercase mt-0.5 block"
                                    >{s.Code}</span
                                >
                            </td>
                            <td class="px-2 py-3 text-right">
                                <span
                                    class="text-sm font-bold {getColorClass(
                                        s._change
                                    )} bg-clip-text relative inline-block"
                                >
                                    {s._closePrice > 0 ? s._closePrice.toFixed(2) : '—'}
                                </span>
                            </td>
                            <td class="px-2 py-3 text-right">
                                <div
                                    class="inline-flex items-center justify-end min-w-[65px] h-[22px] rounded-md border text-[10px] font-bold px-1.5 shadow-inner {s._change >
                                    0
                                        ? 'bg-bullish/10 border-bullish/20 text-bullish'
                                        : s._change < 0
                                          ? 'bg-bearish/10 border-bearish/20 text-bearish'
                                          : 'bg-white/5 border-white/10 text-white/40'}"
                                >
                                    {s._change > 0 ? '+' : ''}{s._closePrice > 0
                                        ? s._changePct.toFixed(2) + '%'
                                        : '—'}
                                </div>
                            </td>
                            <td class="px-2 py-3 text-right">
                                <span
                                    class="text-[10px] font-bold {s._change > 0
                                        ? 'text-bullish'
                                        : s._change < 0
                                          ? 'text-bearish'
                                          : 'text-white/40'}"
                                >
                                    {s._change > 0 ? '+' : ''}{s._closePrice > 0
                                        ? s._change.toFixed(2)
                                        : '—'}
                                </span>
                            </td>
                            <td class="px-2 py-3 text-right">
                                <span
                                    class={s._open > s._closePrice - s._change
                                        ? 'text-bullish/70'
                                        : s._open < s._closePrice - s._change
                                          ? 'text-bearish/70'
                                          : 'text-white/40'}
                                >
                                    {s._open > 0 ? s._open.toFixed(2) : '—'}
                                </span>
                            </td>
                            <td class="px-2 py-3 text-right text-bullish/50"
                                >{s._high > 0 ? s._high.toFixed(2) : '—'}</td
                            >
                            <td class="px-2 py-3 text-right text-bearish/50"
                                >{s._low > 0 ? s._low.toFixed(2) : '—'}</td
                            >
                            <td class="px-2 py-3 text-right text-white/50"
                                >{s._vol > 0 ? s._vol.toLocaleString() : '—'}</td
                            >
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>

<style>
    /* Styling isolated to component scope */
    /* Sticky cell requires base background inheritance for seamless scrolling */
</style>
