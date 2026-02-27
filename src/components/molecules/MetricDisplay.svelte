<script lang="ts">
    /**
     * MetricDisplay.svelte - Molecule for Label + Value display
     * Part of Atomic Design: Molecules
     */
    interface Props {
        label: string;
        value: string | number;
        subValue?: string;
        variant?: 'default' | 'bullish' | 'bearish' | 'accent';
        size?: 'sm' | 'md' | 'lg';
    }

    let { label, value, subValue = '', variant = 'default', size = 'md' }: Props = $props();

    const valueColors = {
        default: 'text-white',
        bullish: 'text-bullish',
        bearish: 'text-bearish',
        accent: 'text-accent',
    };

    const textSizes = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
    };
</script>

<div class="flex flex-col gap-1.5 border-l-2 border-white/5 pl-3">
    <span class="text-[8px] text-white/20 uppercase font-mono tracking-widest font-bold"
        >{label}</span
    >
    <div class="flex items-baseline gap-2">
        <span class="font-mono font-black leading-none {textSizes[size]} {valueColors[variant]}">
            {value}
        </span>
        {#if subValue}
            <span class="text-[10px] font-mono font-bold text-white/20">{subValue}</span>
        {/if}
    </div>
</div>
