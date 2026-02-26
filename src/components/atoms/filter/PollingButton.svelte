<script lang="ts">
    export let active = false;
    export let id = 'toggle-polling-btn';
</script>

<button
    {id}
    class="relative group h-8 px-4 flex items-center gap-2 rounded-lg font-black tracking-widest text-[9px] uppercase overflow-hidden transition-all duration-300 active:scale-95 {active
        ? 'bg-bearish/10 text-bearish border border-bearish/30 hover:bg-bearish/20'
        : 'bg-accent text-white shadow-[0_4px_12px_rgba(var(--accent-rgb),0.2)] hover:shadow-[0_8px_20px_rgba(var(--accent-rgb),0.4)]'}"
>
    <!-- Background Glow Effect -->
    <div
        class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"
    ></div>

    {#if active}
        <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
                <span
                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-bearish opacity-75"
                ></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-bearish"></span>
            </span>
            <span>停止監測</span>
        </div>
    {:else}
        <div class="flex items-center gap-2">
            <svg
                class="w-3 h-3 transition-transform group-hover:rotate-12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
            >
                <path d="M5 3l14 9-14 9V3z"></path>
            </svg>
            <span>開始即時監測</span>
        </div>
    {/if}
</button>

<style>
    /* Add any button specific styles here if needed */
</style>
