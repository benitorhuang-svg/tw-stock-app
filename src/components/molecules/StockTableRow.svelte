<script lang="ts">
    import { createBubbler, stopPropagation } from 'svelte/legacy';

    const bubble = createBubbler();
    import PriceBadge from '../atoms/PriceBadge.svelte';
    import WatchlistButton from '../atoms/WatchlistButton.svelte';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    interface Props {
        stock: any;
        expanded?: boolean;
        isFavorite?: boolean;
    }

    let { stock, expanded = false, isFavorite = false }: Props = $props();

    function colorClass(chg: number) {
        return chg > 0 ? 'clr-bull' : chg < 0 ? 'clr-bear' : 'clr-flat';
    }

    function handleToggleWatchlist() {
        dispatch('toggleWatchlist', stock.Code);
    }

    function handleClick(event: MouseEvent) {
        dispatch('click', { code: stock.Code, event });
    }
</script>

<tr
    class="group cursor-pointer transition-colors hover:bg-white/[0.02]"
    class:active-row={expanded}
    onclick={handleClick}
>
    <td
        class="px-3 py-3 border-r border-border/30"
        class:border-l-4={expanded}
        class:border-l-accent={expanded}
    >
        <div class="flex items-center gap-2">
            <WatchlistButton active={isFavorite} on:toggle={handleToggleWatchlist} />
            <div class="flex flex-col min-w-0 flex-1 leading-tight text-left">
                <span
                    class="text-sm font-black text-white group-hover:text-accent truncate tracking-tight transition-colors"
                >
                    {stock.Name}
                </span>
                <span class="text-[10px] text-text-muted/60 font-mono tracking-widest">
                    {stock.Code}
                </span>
            </div>
        </div>
    </td>
    <td class="px-1.5 py-2 text-center text-sm font-bold {colorClass(stock._change)}">
        {stock._closePrice > 0 ? stock._closePrice.toFixed(2) : '—'}
    </td>
    <td class="px-1.5 py-2 text-center">
        <PriceBadge value={stock._changePct} isPct={true} pClose={stock._closePrice} />
    </td>
    <td class="px-1.5 py-2 text-center font-bold {colorClass(stock._change)} text-[10px]">
        {stock._change > 0 ? '+' : ''}{stock._closePrice > 0 ? stock._change.toFixed(2) : '—'}
    </td>
    <td class="px-1.5 py-2 text-center text-text-muted">
        {stock._open > 0 ? stock._open.toFixed(2) : '—'}
    </td>
    <td class="px-1.5 py-2 text-center clr-bull-mute">
        {stock._high > 0 ? stock._high.toFixed(2) : '—'}
    </td>
    <td class="px-1.5 py-2 text-center clr-bear-mute">
        {stock._low > 0 ? stock._low.toFixed(2) : '—'}
    </td>
    <td class="px-1.5 py-2 text-center text-text-muted opacity-60 text-[10px] uppercase font-mono">
        {stock._vol > 0 ? stock._vol.toLocaleString() : '—'}
    </td>
    <td class="px-1.5 py-2 text-center">
        <a
            href={`/stocks/${stock.Code}`}
            class="analysis-link opacity-0 group-hover:opacity-100"
            onclick={stopPropagation(bubble('click'))}
        >
            Analysis ↗
        </a>
    </td>
</tr>

<style>
    .clr-bull {
        color: var(--color-bullish);
    }
    .clr-bear {
        color: var(--color-bearish);
    }
    .clr-flat {
        color: var(--color-flat);
    }
    .clr-bull-mute {
        color: var(--color-bullish-dim);
    }
    .clr-bear-mute {
        color: var(--color-bearish-dim);
    }
    .analysis-link {
        transition: opacity 0.15s ease;
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
    }
    .active-row {
        background: linear-gradient(90deg, var(--color-accent-glow), rgba(0, 0, 0, 0)) !important;
        position: relative;
        z-index: 10;
    }
    .active-row td {
        border-bottom: 2px solid var(--color-accent) !important;
    }
</style>
