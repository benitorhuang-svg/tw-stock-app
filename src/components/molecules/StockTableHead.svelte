<script lang="ts">
    import StockHeaderCell from '../atoms/StockHeaderCell.svelte';

    interface Props {
        headers: Array<{ label: string; col: string }>;
        currentSortCol: string;
        currentSortAsc: boolean;
        stickyTop?: string;
        onSort?: (col: string) => void;
    }

    let {
        headers,
        currentSortCol,
        currentSortAsc,
        stickyTop = '0px',
        onSort
    }: Props = $props();
</script>

<thead class="z-30">
    <tr class="table-header-row">
        {#each headers as h}
            <StockHeaderCell
                label={h.label}
                col={h.col}
                {currentSortCol}
                {currentSortAsc}
                {stickyTop}
                onSort={onSort}
            />
        {/each}
    </tr>
</thead>

<style>
</style>
