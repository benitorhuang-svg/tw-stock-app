<script lang="ts">
    
    interface Props {
        /**
     * PriceBadge.svelte - Atomic Badge for change/variance
     * Part of Atomic Design: Atoms
     */
        value: number;
        isPct?: boolean;
        pClose?: number; // Reference price for null check
    }

    let { value, isPct = false, pClose = 0 }: Props = $props();

    let isUp = $derived(value > 0);
    let isDown = $derived(value < 0);
    let displayValue =
        $derived((isUp ? '+' : '') +
        (pClose > 0 ? (isPct ? value.toFixed(2) + '%' : value.toFixed(2)) : '—'));
</script>

<div
    class="inline-flex items-center justify-center min-w-[64px] h-[22px] rounded border text-[10px] font-black px-2 tracking-tighter"
    class:badge-bull={isUp}
    class:badge-bear={isDown}
    class:badge-flat={!isUp && !isDown}
>
    {displayValue}
</div>

<style>
    .badge-bull {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
        color: rgb(239, 68, 68);
    }
    .badge-bear {
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.3);
        color: rgb(34, 197, 94);
    }
    .badge-flat {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.4);
    }
</style>
