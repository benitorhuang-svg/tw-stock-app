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

    let trendColor = $derived(trend > 0 ? 'text-bullish' : trend < 0 ? 'text-bearish' : 'text-white/40');
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
    class="stat-card-molecule relative p-5 bg-surface-deep/40 rounded-2xl border border-white/[0.03] backdrop-blur-xl group hover:border-white/10 transition-all duration-500 {glowColor} shadow-2xl"
>
    <div class="flex items-center justify-between mb-4">
        <span class="text-[9px] font-black font-mono tracking-[0.2em] text-white/40 uppercase">
            {label}
        </span>
        {#if icon}
            <div
                class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity"
            >
                <i class="text-sm">{icon}</i>
            </div>
        {/if}
    </div>

    <div class="relative">
        <div class="text-[22px] font-black font-mono text-white tracking-tight">
            {value}
        </div>

        <div class="flex items-center gap-2 mt-2">
            <div
                class="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-[8px] font-mono font-black uppercase {statusColor}"
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
