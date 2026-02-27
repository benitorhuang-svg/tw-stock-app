<script lang="ts">
    /**
     * CyberRangeSlider.svelte - Atomic Range Input with Cyber UI
     * Part of Atomic Design: Atoms
     */
    interface Props {
        label: string;
        value: string | number;
        min: number;
        max: number;
        step: number;
        displayValue: string;
        variant?: 'bullish' | 'bearish' | 'accent';
        onchange: (val: string) => void;
        onplus: () => void;
        onminus: () => void;
    }

    let {
        label,
        value = $bindable(),
        min,
        max,
        step,
        displayValue,
        variant = 'accent',
        onchange,
        onplus,
        onminus,
    }: Props = $props();

    const variantColors = {
        bullish: 'text-bullish',
        bearish: 'text-bearish',
        accent: 'text-accent',
    };
</script>

<div class="flex items-center gap-1.5 px-2 h-8 w-full bg-glass rounded-full border border-border">
    <div class="flex flex-col items-center justify-center shrink-0 w-8">
        <span class="text-[9px] font-mono font-black {variantColors[variant]} leading-none">
            {displayValue}
        </span>
        <span
            class="text-[7px] text-white/30 font-black tracking-widest leading-none mt-0.5 uppercase"
        >
            {label}
        </span>
    </div>

    <button
        onclick={onminus}
        class="text-white/20 hover:text-accent transition-colors text-xs font-bold px-1">－</button
    >

    <input
        type="range"
        {min}
        {max}
        {step}
        bind:value
        oninput={e => onchange((e.target as HTMLInputElement).value)}
        class="flex-1 w-0 min-w-0 h-1 bg-white/5 rounded-full appearance-none flex-shrink cursor-pointer accent-accent custom-range"
    />

    <button
        onclick={onplus}
        class="text-white/20 hover:text-accent transition-colors text-xs font-bold px-1">＋</button
    >
</div>

<style>
    .custom-range {
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.05);
        height: 4px;
        border-radius: 10px;
    }
    .custom-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 10px;
        height: 10px;
        background: var(--color-accent);
        border: 1.5px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.5);
    }
</style>
