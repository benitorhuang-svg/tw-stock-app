<script lang="ts">
    import { uiStore } from '../../stores/ui.svelte.ts';
</script>

<button
    id="header-filter-toggle"
    onclick={() => uiStore.toggleMarketFilters()}
    class="flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer relative border"
    class:bg-accent-15={uiStore.showMarketFilters}
    class:border-accent-40={uiStore.showMarketFilters}
    class:text-accent={uiStore.showMarketFilters}
    class:bg-glass={!uiStore.showMarketFilters}
    class:border-border={!uiStore.showMarketFilters}
    class:text-text-muted={!uiStore.showMarketFilters}
    class:hover:border-accent-30={!uiStore.showMarketFilters}
    class:hover:text-accent={!uiStore.showMarketFilters}
    aria-label="Toggle Filters"
>
    <svg
        class="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
    {#if uiStore.showMarketFilters}
        <span
            class="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full border border-base"
        ></span>
    {/if}
</button>

<style>
    .bg-accent-15 {
        background-color: rgba(var(--accent-rgb), 0.15);
    }
    .border-accent-40 {
        border-color: rgba(var(--accent-rgb), 0.4);
    }
</style>
