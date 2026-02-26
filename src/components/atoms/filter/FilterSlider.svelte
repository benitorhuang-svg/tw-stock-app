<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    interface Props {
        id: string;
        label: string;
        min?: any;
        max?: number;
        step?: number;
        value?: number | string;
        unit?: string;
        isMA20?: boolean;
    }

    let {
        id,
        label,
        min = -10,
        max = 10,
        step = 0.5,
        value = $bindable(0),
        unit = '%',
        isMA20 = false
    }: Props = $props();

    let num = $derived(typeof value === 'string' ? parseFloat(value) : value);

    function emit() {
        dispatch('change', num);
    }

    function adjust(delta: number) {
        value = Math.max(min, Math.min(max, num + delta));
        emit();
    }

    let displayValue = $derived(isMA20 && num === 0 ? 'ALL' : (num > 0 ? '+' : '') + num.toFixed(1) + unit);
    let colorClass =
        $derived(isMA20 && num === 0
            ? 'text-accent'
            : num > 0
              ? 'text-bullish'
              : num < 0
                ? 'text-bearish'
                : 'text-accent');
</script>

<div
    class="flex items-center gap-1 px-1.5 h-8 bg-glass rounded-full border border-border group/slider transition-all hover:border-accent/20 min-w-[110px]"
>
    <div
        class="flex flex-col items-center justify-center shrink-0 w-8 border-r border-border/10 pr-1 mr-0.5"
    >
        <span class="text-[9px] font-mono font-black {colorClass} leading-none tracking-tighter"
            >{displayValue}</span
        >
        <span
            class="text-[6px] text-text-muted/40 font-black tracking-widest leading-none mt-0.5 uppercase"
            >{label}</span
        >
    </div>

    <button
        onclick={() => adjust(-step)}
        class="text-text-muted/40 hover:text-accent transition-colors text-[10px] font-bold px-1"
        >－</button
    >

    <div class="relative flex-1 flex items-center">
        <input
            type="range"
            {id}
            {min}
            {max}
            {step}
            bind:value
            oninput={emit}
            onchange={emit}
            class="w-full h-1 bg-glass-elevated rounded-full appearance-none cursor-pointer accent-accent"
        />
    </div>

    <button
        onclick={() => adjust(step)}
        class="text-text-muted/40 hover:text-accent transition-colors text-[10px] font-bold px-1"
        >＋</button
    >
</div>

<style>
    input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 10px;
        height: 10px;
        background: var(--color-accent);
        border-radius: 50%;
        cursor: pointer;
        border: 1.5px solid white;
        box-shadow: 0 0 10px var(--color-accent-glow);
        transition: transform 0.1s ease;
    }
    input[type='range']:active::-webkit-slider-thumb {
        transform: scale(1.3);
    }
    input[type='range']::-moz-range-thumb {
        width: 10px;
        height: 10px;
        background: var(--color-accent);
        border-radius: 50%;
        cursor: pointer;
        border: 1.5px solid white;
    }
</style>
