<script lang="ts">
    /**
     * StatusBadge.svelte - Atomic Status Indicator with Pulse Effect
     * Part of Atomic Design: Atoms
     */
    interface Props {
        label: string;
        active?: boolean;
        variant?: 'bullish' | 'bearish' | 'accent' | 'neutral';
    }

    let { label, active = true, variant = 'bullish' }: Props = $props();

    const colors = {
        bullish: 'bg-bullish/10 text-bullish',
        bearish: 'bg-bearish/10 text-bearish',
        accent: 'bg-accent/10 text-accent',
        neutral: 'bg-surface-hover text-text-muted',
    };

    const dotColors = {
        bullish: 'bg-bullish',
        bearish: 'bg-bearish',
        accent: 'bg-accent',
        neutral: 'bg-text-muted/60',
    };
</script>

<div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full {colors[variant]}">
    <span class="text-[8px] font-mono uppercase font-black">{label}</span>
    {#if active}
        <div class="w-1.5 h-1.5 rounded-full {dotColors[variant]} animate-pulse"></div>
    {/if}
</div>
