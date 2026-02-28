<script lang="ts">
    /**
     * ViewHeader.svelte — Atom
     * Consistent header for chart view panels with title and optional subtitle/legend
     */
    import type { Snippet } from 'svelte';

    interface Props {
        title: string;
        subtitle?: string;
        legend?: Snippet;
    }

    let { title, subtitle, legend }: Props = $props();
</script>

<div class="flex items-center justify-between border-b border-white/5 pb-2">
    <h2 class="text-[10px] font-mono font-black text-white/30 uppercase tracking-[0.2em]">
        {title}
    </h2>
    {#if subtitle}
        <div class="text-[9px] font-mono text-white/20 uppercase tracking-widest">
            {subtitle}
        </div>
    {/if}
    {#if legend}
        {@render legend()}
    {/if}
</div>
