<script lang="ts">
    interface Props {
        type?: 'loading' | 'error' | 'empty';
        message?: string;
    }

    let { type = 'loading', message = '' }: Props = $props();
</script>

<tr>
    <td colspan="9" class="py-12 bg-surface/20">
        {#if type === 'loading'}
            <div
                class="flex flex-col items-center gap-2 opacity-30 text-[9px] uppercase tracking-[0.5em]"
            >
                {message || 'Awaiting_Uplink...'}
            </div>
        {:else if type === 'error'}
            <div class="py-12 text-center text-bearish uppercase tracking-[0.2em] italic">
                {message}
            </div>
        {:else if type === 'empty'}
            <div
                class="py-12 text-center text-text-muted opacity-30 text-[9px] uppercase tracking-[0.5em]"
            >
                No_Data_Matches_Current_Filter
            </div>
        {/if}
    </td>
</tr>
