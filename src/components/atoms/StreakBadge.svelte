<script lang="ts">
    const { streak, size = 'sm' } = $props<{ streak: number; size?: 'sm' | 'xs' }>();

    const abs = $derived(Math.abs(streak));
    const label = $derived(abs === 0 ? '—' : `${abs}D${streak > 0 ? 'B' : 'S'}`);
    const cls = $derived(
        streak > 0
            ? 'bg-bullish/10 text-bullish border-bullish/20'
            : streak < 0
              ? 'bg-bearish/10 text-bearish border-bearish/20'
              : 'bg-surface/30 text-text-muted/40 border-border/20'
    );
    const sizeClass = $derived(size === 'xs' ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5');
</script>

<span class="inline-block rounded border font-black font-mono tracking-tighter {cls} {sizeClass}">
    {label}
</span>
