<script lang="ts">
    import { stopPropagation } from 'svelte/legacy';

    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    interface Props {
        active?: boolean;
    }

    let { active = false }: Props = $props();
</script>

<button
    class="star-btn text-base shrink-0 transition-all duration-300 hover:scale-125 {active
        ? 'text-warning drop-shadow-[0_0_8px_rgba(var(--warning-rgb),0.5)]'
        : 'text-text-muted/10 hover:text-text-muted/40'}"
    onclick={stopPropagation(() => dispatch('toggle'))}
    title="Toggle Watchlist"
>
    ★
</button>

<style>
    .star-btn {
        -webkit-tap-highlight-color: transparent;
    }
</style>
