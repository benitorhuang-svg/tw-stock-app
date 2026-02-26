<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let label: string;
    export let col: string;
    export let currentSortCol: string;
    export let currentSortAsc: boolean;
    export let stickyTop = '0px';

    function handleClick() {
        if (col) dispatch('sort', col);
    }
</script>

<th
    class="sticky z-20 bg-surface border-y border-border select-none text-center py-2.5 px-3 text-[10px] font-black text-text-muted uppercase shadow-sm transition-colors"
    class:cursor-pointer={!!col}
    class:hover:text-accent={!!col}
    style="top: {stickyTop};"
    on:click={handleClick}
>
    {#if label}
        <span class="inline-flex items-center gap-1 justify-center">
            {label}
            {#if col}
                <span
                    class="sort-icon {currentSortCol === col
                        ? 'opacity-100 text-accent'
                        : 'opacity-30'}"
                >
                    {currentSortCol === col ? (currentSortAsc ? '↑' : '↓') : '↕'}
                </span>
            {/if}
        </span>
    {/if}
</th>

<style>
    .sort-icon {
        transition: opacity 0.1s ease;
    }
</style>
