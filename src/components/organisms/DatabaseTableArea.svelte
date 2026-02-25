<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    interface TableColumn {
        name: string;
        type: string;
    }

    let columns: TableColumn[] = [];
    let rows: any[][] = []; // Matrix format: [[v1, v2], ...]
    let errorState = '';
    let isLoading = false;
    let activeTable = '';

    // Virtualization settings
    let containerHeight = 800;
    let rowHeight = 52; // Matching px-6 py-4 approximately
    let scrollTop = 0;
    let visibleRows = 20;

    $: visibleRows = Math.ceil(containerHeight / rowHeight) + 5;
    $: startIndex = Math.floor(scrollTop / rowHeight);
    $: endIndex = startIndex + visibleRows;
    $: pagedRows = rows.slice(startIndex, endIndex);
    $: paddingTop = startIndex * rowHeight;
    $: paddingBottom = Math.max(0, (rows.length - endIndex) * rowHeight);

    // Derived flags for fast rendering
    let colPrototypes: { isPct: boolean; isPrice: boolean }[] = [];
    $: colPrototypes = columns.map(col => {
        const lName = col.name.toLowerCase();
        return {
            isPct: lName.includes('pct'),
            isPrice: lName.includes('price') || lName.includes('close'),
        };
    });

    function handleScroll(e: Event) {
        const target = e.target as HTMLElement;
        scrollTop = target.scrollTop;
    }

    onMount(() => {
        const container = document.getElementById('table-scroll-container');
        if (container) {
            containerHeight = container.clientHeight;
            container.addEventListener('scroll', handleScroll, { passive: true });
        }

        const listener = (e: any) => {
            const { type, payload } = e.detail;
            if (type === 'DB_DATA') {
                errorState = '';
                isLoading = false;
                requestAnimationFrame(() => {
                    columns = payload.columns;
                    rows = payload.rows;
                    activeTable = payload.tableName;
                });
            } else if (type === 'DB_LOADING') {
                isLoading = true;
                errorState = '';
                rows = [];
            } else if (type === 'DB_ERROR') {
                errorState = payload.message;
                isLoading = false;
                rows = [];
            }
        };

        window.addEventListener('tw-db-update', listener);
        return () => {
            window.removeEventListener('tw-db-update', listener);
            if (container) container.removeEventListener('scroll', handleScroll);
        };
    });
</script>

{#if isLoading && rows.length === 0}
    <div class="absolute inset-0 flex items-center justify-center bg-base/50 backdrop-blur-sm z-50">
        <div
            class="flex items-center gap-3 bg-surface border border-accent/20 px-6 py-4 rounded-xl shadow-xl"
        >
            <div
                class="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"
            ></div>
            <span class="text-accent font-mono text-[10px] tracking-widest uppercase"
                >Quantum_Matrix_Loading...</span
            >
        </div>
    </div>
{/if}

<table class="w-full text-left border-collapse whitespace-nowrap min-w-full" id="data-table">
    <thead class="bg-surface border-b border-border/50 sticky top-0 z-20 shadow-sm">
        {#if columns.length > 0}
            <tr>
                {#each columns as col}
                    <th
                        class="px-6 py-4 text-[9px] tracking-[0.2em] font-black text-text-muted border-r border-border uppercase bg-surface"
                    >
                        <div class="flex flex-col gap-1">
                            <span>{col.name}</span>
                            <span class="text-[7px] opacity-50 font-mono tracking-widest"
                                >{col.type}</span
                            >
                        </div>
                    </th>
                {/each}
            </tr>
        {/if}
    </thead>
    <tbody class="divide-y divide-border/30">
        {#if errorState}
            <tr
                ><td
                    colspan="99"
                    class="py-20 text-center font-mono text-bearish text-[10px] border-none uppercase"
                    >{errorState}</td
                ></tr
            >
        {:else if rows.length === 0 && !isLoading && activeTable !== ''}
            <tr
                ><td
                    colspan="99"
                    class="py-20 text-center font-mono text-text-muted text-[9px] border-none uppercase"
                    >ZERO_ENTITIES_IN_{activeTable}</td
                ></tr
            >
        {:else}
            <!-- Top virtual spacer row -->
            <tr><td colspan="99" style="height: {paddingTop}px; padding: 0; border: none;"></td></tr
            >

            {#each pagedRows as row, i (startIndex + i)}
                <tr class="hover:bg-glass-hover transition-colors h-[52px] group/row">
                    {#each colPrototypes as proto, j}
                        {@const val = row[j]}
                        {@const isNull = val === null || val === undefined}
                        <td
                            class="px-6 py-4 text-[11px] border-r border-border {isNull
                                ? 'bg-red-500/5 text-red-500 italic'
                                : ''}"
                        >
                            <div
                                class="truncate max-w-[300px]"
                                class:text-bullish={!isNull &&
                                    typeof val === 'number' &&
                                    proto.isPct &&
                                    val >= 0}
                                class:text-bearish={!isNull &&
                                    typeof val === 'number' &&
                                    proto.isPct &&
                                    val < 0}
                                class:font-bold={!isNull &&
                                    typeof val === 'number' &&
                                    (proto.isPct || proto.isPrice)}
                                class:text-accent={!isNull &&
                                    typeof val === 'number' &&
                                    proto.isPrice &&
                                    !proto.isPct}
                                class:text-text-secondary={!isNull &&
                                    typeof val === 'number' &&
                                    !proto.isPct &&
                                    !proto.isPrice}
                                class:font-mono={!isNull && typeof val === 'number'}
                            >
                                {#if isNull}
                                    NULL
                                {:else if typeof val === 'number'}
                                    {proto.isPct
                                        ? (val > 0 ? '+' : '') + val.toFixed(2) + '%'
                                        : val}
                                {:else}
                                    {val}
                                {/if}
                            </div>
                        </td>
                    {/each}
                </tr>
            {/each}
            <!-- Bottom virtual spacer row -->
            <tr
                ><td colspan="99" style="height: {paddingBottom}px; padding: 0; border: none;"
                ></td></tr
            >
        {/if}
    </tbody>
</table>

<style>
    table {
        table-layout: fixed;
        width: max-content;
    }
</style>
