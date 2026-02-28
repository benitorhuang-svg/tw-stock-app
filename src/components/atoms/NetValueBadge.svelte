<script lang="ts">
    const { value, unit = 'K', divider = 1000, precision } = $props<{
        value: number;
        unit?: string;
        divider?: number;
        precision?: number;
    }>();

    const formatted = $derived.by(() => {
        const v = value / divider;
        const p = precision ?? (Math.abs(v) >= 10 ? 0 : 1);
        return `${value > 0 ? '+' : ''}${v.toFixed(p)}${unit}`;
    });

    const cls = $derived(
        value > 0 ? 'text-bullish' : value < 0 ? 'text-bearish' : 'text-text-muted'
    );
</script>

<span class="font-black font-mono {cls}">{formatted}</span>
