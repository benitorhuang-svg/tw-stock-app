<script lang="ts">
    /** * MarketGridHeader.svelte - Market Table Header Molecule * Part of Atomic Design: Molecules
    (Standardizing the sticky behavior) */
    import StockHeaderCell from './StockHeaderCell.svelte';

    export let headers: any[];
    export let currentSortCol: string;
    export let currentSortAsc: boolean;
    export let onSort: (col: string) => void;
</script>

<thead class="z-30">
    <tr>
        {#each headers as h}
            <StockHeaderCell
                label={h.label}
                col={h.col}
                {currentSortCol}
                {currentSortAsc}
                stickyTop="var(--toolbar-nexus-height, 0px)"
                on:sort={e => onSort(e.detail)}
            />
        {/each}
    </tr>
</thead>
