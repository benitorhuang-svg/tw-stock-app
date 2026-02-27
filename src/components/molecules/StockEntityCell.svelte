<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';

    let {
        symbol = '',
        name = '',
        showLink = false,
        href = '',
    } = $props<{
        symbol?: string;
        name?: string;
        showLink?: boolean;
        href?: string;
    }>();

    let isWatched = $derived(marketStore.watchlist.has(symbol));
    let finalHref = $derived(href || `/stocks/${symbol}`);
</script>

<div
    class="flex items-center gap-2 w-full overflow-hidden"
    onclick={e => e.stopPropagation()}
    onkeydown={null}
    role="button"
    tabindex="-1"
>
    <!-- Watchlist Star Btn -->
    <button
        class="star-btn shrink-0 transition-all duration-300 hover:scale-125 flex items-center justify-center p-1.5 {isWatched
            ? 'text-warning'
            : 'text-text-muted/20 hover:text-text-muted/50'}"
        aria-label="Toggle Watchlist"
        onclick={e => {
            e.stopPropagation();
            marketStore.toggleWatchlist(symbol);
        }}
    >
        <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill={isWatched ? 'currentColor' : 'none'}
            stroke="currentColor"
            stroke-width="1.5"
        >
            <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            ></polygon>
        </svg>
    </button>
    <div class="flex flex-col min-w-0 flex-1 leading-tight text-left">
        <span class="atom-name truncate group-hover:text-accent transition-colors">
            {name}
        </span>
        <div class="flex items-center gap-2 mt-0.5">
            <span class="atom-symbol">{symbol}</span>
            {#if showLink}
                <a
                    href={finalHref}
                    class="atom-badge atom-badge-accent text-[8px] px-1.5 py-0.5 hover:bg-accent hover:text-white"
                    onclick={e => e.stopPropagation()}
                >
                    分析 ↗
                </a>
            {/if}
        </div>
    </div>
</div>
