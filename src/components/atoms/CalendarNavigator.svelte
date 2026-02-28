<script lang="ts">
    import CyberDatePicker from '../atoms/CyberDatePicker.svelte';
    /**
     * CalendarNavigator.svelte - Atom
     * Vertical/Horizontal navigation for dates with a picker
     */
    interface Props {
        date: string;
        onDateChange: (date: string) => void;
        onNavigate: (dir: number) => void;
    }
    let { date, onDateChange, onNavigate }: Props = $props();
</script>

<div
    class="flex items-center gap-1 bg-surface-hover/50 p-1 rounded-lg border border-border shadow-inner"
>
    <CyberDatePicker size="w-8 h-8" value={date} onchange={onDateChange} />
    <div class="flex flex-col gap-0.5">
        <button
            onclick={() => onNavigate(1)}
            class="w-6 h-4 rounded-sm flex items-center justify-center text-text-muted/60 hover:text-text-primary hover:bg-surface-hover transition-all active:scale-90 bg-surface-hover/50"
            aria-label="後一天"
        >
            <svg
                class="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
            >
                <path d="m18 15-6-6-6 6" />
            </svg>
        </button>
        <button
            onclick={() => onNavigate(-1)}
            class="w-6 h-4 rounded-sm flex items-center justify-center text-text-muted/60 hover:text-text-primary hover:bg-surface-hover transition-all active:scale-90 bg-surface-hover/50"
            aria-label="前一天"
        >
            <svg
                class="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
            >
                <path d="m6 9 6 6 6-6" />
            </svg>
        </button>
    </div>
</div>
