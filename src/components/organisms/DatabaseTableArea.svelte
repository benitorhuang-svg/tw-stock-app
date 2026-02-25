<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    interface TableColumn {
        name: string;
        type: string;
    }

    interface TableDataResponse {
        columns: TableColumn[];
        rows: Record<string, unknown>[];
        total: number;
    }

    let columns: TableColumn[] = [];
    let rows: Record<string, unknown>[] = [];
    let errorState = '';
    let isLoading = false;
    let activeTable = '';
    let currentPage = 1;

    // Derived flags for fast rendering
    let renderableCols: { name: string; isPct: boolean; isPrice: boolean }[] = [];

    $: renderableCols = columns.map(col => {
        const lName = col.name.toLowerCase();
        return {
            name: col.name,
            isPct: lName.includes('pct'),
            isPrice: lName.includes('price') || lName.includes('close'),
        };
    });

    onMount(() => {
        // Bind to external Astro controllers (database-engine.ts)
        const listener = (e: any) => {
            const { type, payload } = e.detail;
            if (type === 'DB_DATA') {
                columns = payload.columns;
                rows = payload.rows;
                activeTable = payload.tableName;
                currentPage = payload.page;
                errorState = '';
                isLoading = false;
            } else if (type === 'DB_LOADING') {
                isLoading = true;
                errorState = '';
                // INSTANT DOM CLEAR: Pre-nuke the huge old table to give instant visual feedback
                // and let the browser GC clean up before the new JSON arrives.
                rows = [];
            } else if (type === 'DB_ERROR') {
                errorState = payload.message;
                isLoading = false;
                rows = [];
                columns = [];
            }
        };

        window.addEventListener('tw-db-update', listener);
        return () => window.removeEventListener('tw-db-update', listener);
    });
</script>

{#if isLoading && rows.length === 0}
    <!-- Skeleton/Loading state before first data dump -->
    <div class="absolute inset-0 flex items-center justify-center bg-base/50 backdrop-blur-sm z-50">
        <div
            class="flex items-center gap-3 bg-surface border border-accent/20 px-6 py-4 rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.1)]"
        >
            <div
                class="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"
            ></div>
            <span class="text-accent font-mono text-[10px] tracking-widest uppercase"
                >Querying_Quantum_DB...</span
            >
        </div>
    </div>
{/if}

<table class="w-full text-left border-collapse whitespace-nowrap min-w-full" id="data-table">
    <thead class="bg-surface border-b border-border/50 sticky top-0 z-10" id="table-head">
        {#if columns.length > 0}
            <tr>
                {#each columns as col}
                    <th
                        class="cursor-pointer px-6 py-4 text-[9px] tracking-[0.2em] font-black text-text-muted border-r border-border hover:bg-accent-glow hover:text-accent transition-all uppercase"
                    >
                        <div class="flex flex-col gap-1">
                            <span>{col.name}</span>
                            <span
                                class="text-[7px] text-text-muted opacity-50 font-mono tracking-widest"
                                >{col.type}</span
                            >
                        </div>
                    </th>
                {/each}
            </tr>
        {:else if !errorState && activeTable}
            <tr><th class="py-4 text-center">...</th></tr>
        {/if}
    </thead>
    <tbody class="divide-y divide-border/30" id="table-body">
        {#if errorState}
            <tr>
                <td
                    colspan="99"
                    class="py-20 text-center font-mono text-bearish opacity-80 text-[10px] tracking-widest uppercase bg-red-500/5"
                >
                    {errorState}
                </td>
            </tr>
        {:else if rows.length === 0 && !isLoading && activeTable !== ''}
            <tr>
                <td
                    colspan="99"
                    class="py-20 text-center font-mono text-text-muted opacity-50 text-[9px] tracking-widest uppercase"
                >
                    Zero_Entities_Isolated
                </td>
            </tr>
        {:else}
            {#each rows as row}
                <tr class="hover:bg-glass-hover transition-colors group/row">
                    {#each renderableCols as col}
                        {@const val = row[col.name]}
                        {@const isNull = val === null || val === undefined}

                        <td
                            class="px-6 py-4 text-[11px] border-r border-border {isNull
                                ? 'bg-red-500/10 text-red-500 dark:text-red-400 italic'
                                : ''}"
                        >
                            <div
                                class="db-cell truncate max-w-[300px]"
                                class:text-bullish={!isNull &&
                                    typeof val === 'number' &&
                                    col.isPct &&
                                    val >= 0}
                                class:text-bearish={!isNull &&
                                    typeof val === 'number' &&
                                    col.isPct &&
                                    val < 0}
                                class:font-bold={!isNull &&
                                    typeof val === 'number' &&
                                    (col.isPct || col.isPrice)}
                                class:text-accent={!isNull &&
                                    typeof val === 'number' &&
                                    col.isPrice &&
                                    !col.isPct}
                                class:text-text-secondary={!isNull &&
                                    typeof val === 'number' &&
                                    !col.isPct &&
                                    !col.isPrice}
                                class:font-mono={!isNull &&
                                    typeof val === 'number' &&
                                    !col.isPct &&
                                    !col.isPrice}
                                class:text-text-muted={!isNull && typeof val !== 'number'}
                            >
                                {#if isNull}
                                    NULL
                                {:else if typeof val === 'number'}
                                    {#if col.isPct}
                                        {val > 0 ? '+' : ''}{val.toFixed(2)}%
                                    {:else}
                                        {val}
                                    {/if}
                                {:else}
                                    {val}
                                {/if}
                            </div>
                        </td>
                    {/each}
                </tr>
            {/each}
        {/if}
    </tbody>
</table>

<style>
    /* Ensure scrolling logic continues to work from global astro styles */
    table {
        table-layout: fixed;
        width: max-content;
    }
</style>
