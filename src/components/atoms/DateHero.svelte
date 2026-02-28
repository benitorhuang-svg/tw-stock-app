<script lang="ts">
    import CyberDatePicker from './CyberDatePicker.svelte';
    /**
     * DateHero.svelte - Atom
     * Specialized vertical date display for sidebars/HUDs
     */
    interface Props {
        date: string;
        onDateChange?: (date: string) => void;
        onNavigate?: (dir: number) => void;
    }
    let { date, onDateChange, onNavigate }: Props = $props();

    let year = $derived(date ? date.split('-')[0] : '—');
    let monthDay = $derived(date ? date.split('-').slice(1).join('-') : '—');

    // Split month and day for vertical layout
    let monthPart = $derived(monthDay.includes('-') ? monthDay.split('-')[0] : monthDay);
    let dayPart = $derived(monthDay.includes('-') ? monthDay.split('-')[1] : '');
</script>

<div class="flex flex-col gap-4 w-full relative group">
    <div class="flex items-center gap-4 relative z-10 w-full pl-1">
        <!-- calendar icon / picker -->
        {#if onDateChange}
            <CyberDatePicker size="w-20 h-20" value={date} onchange={onDateChange} />
        {:else}
            <div
                class="w-20 h-20 rounded-2xl bg-surface/50 shadow-sm border border-border/50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
            >
                <svg
                    class="w-10 h-10 text-accent"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            </div>
        {/if}

        <div class="flex flex-col leading-none">
            <span class="text-[15px] font-black text-accent uppercase tracking-[0.4em] mb-1 pl-1">
                {year}
            </span>

            <span
                class="text-[42px] font-black text-text-primary tracking-tighter leading-none drop-shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)] font-sans whitespace-nowrap"
            >
                {monthDay}
            </span>
        </div>
    </div>

    <!-- Navigation row with wider arrows and shorter TODAY -->
    <div class="flex items-center gap-2 relative z-10 w-full pl-1">
        <!-- prev navigation -->
        {#if onNavigate}
            <button
                onclick={() => onNavigate(-1)}
                class="flex-1 h-12 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover/50 transition-all active:scale-90 bg-surface border border-border/30 shadow-xl"
                aria-label="前一天"
            >
                <svg
                    class="w-7 h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="m15 18-6-6 6-6" />
                </svg>
            </button>
        {/if}

        <!-- TODAY button -->
        {#if onDateChange}
            <button
                onclick={() => onDateChange(new Date().toISOString().slice(0, 10))}
                class="px-4 py-3 rounded-2xl bg-surface border border-border/40 text-[12px] font-black text-text-primary hover:border-accent hover:text-accent shadow-xl uppercase tracking-[0.2em] active:scale-95 transition-all text-center min-w-[100px]"
            >
                TODAY
            </button>
        {/if}

        <!-- next navigation -->
        {#if onNavigate}
            <button
                onclick={() => onNavigate(1)}
                class="flex-1 h-12 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover/50 transition-all active:scale-90 bg-surface border border-border/30 shadow-xl"
                aria-label="後一天"
            >
                <svg
                    class="w-7 h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="m9 18 6-6-6-6" />
                </svg>
            </button>
        {/if}
    </div>
</div>
