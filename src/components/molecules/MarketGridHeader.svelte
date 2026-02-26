<script lang="ts">
    /** * MarketGridHeader.svelte - Market Table Header Molecule * Part of Atomic Design: Molecules
    (Standardizing the sticky behavior) */
    import StockHeaderCell from './StockHeaderCell.svelte';

    interface Props {
        headers: any[];
        currentSortCol: string;
        currentSortAsc: boolean;
        onSort: (col: string) => void;
    }

    let {
        headers,
        currentSortCol,
        currentSortAsc,
        onSort
    }: Props = $props();
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
