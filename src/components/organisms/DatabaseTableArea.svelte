<script lang="ts">
    import { run } from 'svelte/legacy';

    import { onMount } from 'svelte';

    interface TableColumn {
        name: string;
        type: string;
    }

    let columns: TableColumn[] = $state([]);
    let rows: any[][] = $state([]); // Matrix format: [[v1, v2], ...]
    let errorState = $state('');
    let isLoading = $state(false);
    let activeTable = $state('');

    // Derived flags for fast rendering
    let colPrototypes: { isPct: boolean; isPrice: boolean }[] = $state([]);
    run(() => {
        colPrototypes = columns.map(col => {
            const lName = col.name.toLowerCase();
            return {
                isPct: lName.includes('pct'),
                isPrice: lName.includes('price') || lName.includes('close'),
            };
        });
    });

    onMount(() => {
        const container = document.getElementById('table-scroll-container');

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

<table
    class="table-fixed w-max text-left border-collapse whitespace-nowrap min-w-full"
    id="data-table"
>
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
            {#each rows as row, i}
                <tr class="hover:bg-glass-hover transition-colors h-[52px] group/row">
                    {#each colPrototypes as proto, j}
                        <td
                            class="px-6 py-4 text-[11px] border-r border-border {row[j] === null ||
                            row[j] === undefined
                                ? 'bg-red-500/5 text-red-500 italic'
                                : ''}"
                        >
                            <div
                                class="truncate max-w-[300px]"
                                class:text-bullish={row[j] !== null &&
                                    typeof row[j] === 'number' &&
                                    proto.isPct &&
                                    row[j] >= 0}
                                class:text-bearish={row[j] !== null &&
                                    typeof row[j] === 'number' &&
                                    proto.isPct &&
                                    row[j] < 0}
                                class:font-bold={row[j] !== null &&
                                    typeof row[j] === 'number' &&
                                    (proto.isPct || proto.isPrice)}
                                class:text-accent={row[j] !== null &&
                                    typeof row[j] === 'number' &&
                                    proto.isPrice &&
                                    !proto.isPct}
                                class:text-text-secondary={row[j] !== null &&
                                    typeof row[j] === 'number' &&
                                    !proto.isPct &&
                                    !proto.isPrice}
                                class:font-mono={row[j] !== null && typeof row[j] === 'number'}
                            >
                                {#if row[j] === null || row[j] === undefined}
                                    NULL
                                {:else if typeof row[j] === 'number'}
                                    {proto.isPct
                                        ? (row[j] > 0 ? '+' : '') + row[j].toFixed(2) + '%'
                                        : row[j]}
                                {:else}
                                    {row[j]}
                                {/if}
                            </div>
                        </td>
                    {/each}
                </tr>
            {/each}
        {/if}
    </tbody>
</table>
