<script lang="ts">
    import StockHeaderCell from '../atoms/StockHeaderCell.svelte';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let headers: Array<{ label: string; col: string }>;
    export let currentSortCol: string;
    export let currentSortAsc: boolean;
    export let stickyTop = '0px';

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
