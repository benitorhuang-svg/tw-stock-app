<script lang="ts">
    import StockHeaderCell from '../atoms/StockHeaderCell.svelte';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    interface Props {
        headers: Array<{ label: string; col: string }>;
        currentSortCol: string;
        currentSortAsc: boolean;
        stickyTop?: string;
    }

    let {
        headers,
        currentSortCol,
        currentSortAsc,
        stickyTop = '0px'
    }: Props = $props();

    function handleSort(col: string) {
        dispatch('sort', col);
    }
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
                on:sort={e => handleSort(e.detail)}
            />
        {/each}
    </tr>
</thead>

<style>
</style>
