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
    class="flex items-center gap-1 bg-white/[0.05] p-1 rounded-lg border border-white/5 shadow-inner"
>
    <CyberDatePicker size="w-8 h-8" value={date} onchange={onDateChange} />
    <div class="flex flex-col gap-0.5">
        <button
            onclick={() => onNavigate(1)}
            class="w-6 h-4 rounded-sm flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all active:scale-90 bg-white/5"
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
            class="w-6 h-4 rounded-sm flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all active:scale-90 bg-white/5"
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
