<script lang="ts">
    import { onMount } from 'svelte';
    import SearchInput from '../atoms/filter/SearchInput.svelte';
    import FilterSelect from '../atoms/filter/FilterSelect.svelte';
    import FilterSlider from '../atoms/filter/FilterSlider.svelte';

    // State Variables (Reactive)
    let search = '';
    let market = '';
    let sector = '';
    let price = '';
    let trend = 0;
    let volume = 0;
    let ma20 = 0;

    const markets = [
        { value: 'tse', label: '上市' },
        { value: 'otc', label: '上櫃' },
    ];

    const sectors = [
        { value: 'semiconductor', label: '半導體' },
        { value: 'electronics', label: '電子' },
        { value: 'computer', label: '電腦' },
        { value: 'finance', label: '金融' },
        { value: 'shipping', label: '航運' },
        { value: 'etf', label: 'ETF' },
    ];

    const prices = [
        { value: '0-50', label: '50以下' },
        { value: '50-100', label: '50-100' },
        { value: '100-500', label: '100-500' },
        { value: '500-10000', label: '500以上' },
    ];

    let notifyTimeout: any;
    function notify() {
        if (notifyTimeout) clearTimeout(notifyTimeout);
        notifyTimeout = setTimeout(() => {
            const detail = {
                search,
                market,
                sector,
                price,
                trend,
                volume,
                ma20: String(ma20),
            };
            window.dispatchEvent(
                new CustomEvent('tw-live-update', {
                    detail: { type: 'FILTERS', payload: detail },
                })
            );
        }, 100);
    }

    function reset() {
        search = '';
        market = '';
        sector = '';
        price = '';
        trend = 0;
        volume = 0;
        ma20 = 0;
        notify();
    }
</script>

<div class="flex items-center gap-2.5 px-0.5" id="live-toolbar-nexus-svelte">
    <!-- Atom: Keyword Search -->
    <SearchInput id="live-search-input" bind:value={search} on:input={notify} />

    <!-- Molecule: Classification Filters -->
    <div
        class="flex items-center gap-1.5 px-1.5 py-0.5 bg-glass rounded-full border border-border/60 shadow-sm backdrop-blur-md"
    >
        <FilterSelect
            id="filter-market"
            label="市場"
            options={markets}
            bind:value={market}
            on:change={notify}
            width="min-w-[55px]"
        />
        <div class="divider"></div>
        <FilterSelect
            id="filter-sector"
            label="產業"
            options={sectors}
            bind:value={sector}
            on:change={notify}
            width="min-w-[65px]"
        />
        <div class="divider"></div>
        <FilterSelect
            id="filter-price"
            label="價格"
            options={prices}
            bind:value={price}
            on:change={notify}
            width="min-w-[60px]"
        />
    </div>

    <!-- Molecule: Technical Indicators -->
    <div class="flex items-center gap-2">
        <FilterSlider id="filter-trend" label="Pct" bind:value={trend} on:change={notify} />
        <FilterSlider
            id="filter-ma20"
            label="MA20"
            isMA20={true}
            bind:value={ma20}
            on:change={notify}
        />
        <FilterSlider
            id="filter-volume"
            label="Vol"
            min={0}
            max={1000000}
            step={5000}
            unit=""
            bind:value={volume}
            on:change={notify}
        />
    </div>

    <!-- Atom: Reset Action -->
    <button
        on:click={reset}
        title="重設所有篩選"
        class="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-glass-elevated hover:bg-glass-hover hover:border-accent/40 text-text-muted/60 hover:text-accent transition-all shadow-sm active:scale-95 shrink-0"
    >
        <svg class="w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
            ></path>
        </svg>
    </button>
</div>

<style>
    .divider {
        width: 1px;
        height: 0.75rem;
        background-color: rgba(255, 255, 255, 0.05);
        flex-shrink: 0;
    }
</style>
