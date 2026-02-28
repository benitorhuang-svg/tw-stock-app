<script lang="ts">
    /**
     * MarketMetric.svelte - Atom
     * Displays a single market metric with label and value
     */
    interface Props {
        label: string;
        value: string | number;
        trend?: 'bullish' | 'bearish' | 'neutral';
    }
    let { label, value, trend = 'neutral' }: Props = $props();

    const colorClass = $derived(
        trend === 'bullish' ? 'text-bullish' : trend === 'bearish' ? 'text-bearish' : 'text-text-primary'
    );
</script>

<div class="flex flex-col">
    <span class="text-[8px] font-mono font-black text-text-muted uppercase tracking-wider mb-0.5">
        {label}
    </span>
    <span class="text-base font-mono font-black {colorClass}">
        {value}
    </span>
</div>
