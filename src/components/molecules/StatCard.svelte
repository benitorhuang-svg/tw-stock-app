<script lang="ts">
    interface Props {
        label: string;
        value: string | number;
        trend?: number; // -1, 0, 1
        status?: 'normal' | 'low' | 'high' | 'warning';
        icon?: string;
    }

    let {
        label,
        value,
        trend = 0,
        status = 'normal',
        icon = ''
    }: Props = $props();

    let trendColor = $derived(trend > 0 ? 'text-bullish' : trend < 0 ? 'text-bearish' : 'text-text-muted/60');
    let statusColor = $derived({
        normal: 'text-text-muted',
        low: 'text-accent',
        high: 'text-yellow-400',
        warning: 'text-bearish',
    }[status]);

    let glowColor = $derived({
        normal: 'shadow-white/5',
        low: 'shadow-accent/10',
        high: 'shadow-yellow-400/10',
        warning: 'shadow-bearish/10',
    }[status]);
</script>

<div
    class="stat-card-molecule relative p-5 bg-surface-deep/40 rounded-2xl border border-border/30 backdrop-blur-xl group hover:border-border-hover transition-all duration-500 {glowColor} shadow-2xl"
>
    <div class="flex items-center justify-between mb-4">
        <span class="text-[9px] font-black font-mono tracking-[0.2em] text-text-muted/60 uppercase">
            {label}
        </span>
        {#if icon}
            <div
                class="w-7 h-7 rounded-lg bg-surface-hover flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity"
            >
                <i class="text-sm">{icon}</i>
            </div>
        {/if}
    </div>

    <div class="relative">
        <div class="text-[22px] font-black font-mono text-text-primary tracking-tight">
            {value}
        </div>

        <div class="flex items-center gap-2 mt-2">
            <div
                class="px-1.5 py-0.5 rounded-md bg-surface-hover border border-border text-[8px] font-mono font-black uppercase {statusColor}"
            >
                {status}
            </div>
            {#if trend !== 0}
                <span class="text-[9px] font-mono font-bold {trendColor}">
                    {trend > 0 ? '▲ INCREASING' : '▼ DECREASING'}
                </span>
            {/if}
        </div>
    </div>
</div>
