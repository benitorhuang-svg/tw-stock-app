<script lang="ts">
    import DateHero from '../atoms/DateHero.svelte';
    import CalendarNavigator from '../atoms/CalendarNavigator.svelte';

    interface Props {
        dataDate: string;
        onDateChange: (date: string) => void;
        onNavigate: (direction: number) => void;
    }

    let { dataDate, onDateChange, onNavigate }: Props = $props();
</script>

<div class="px-5 py-6 flex flex-col gap-4 relative border-b border-border/50">
    <!-- TODAY button absolute top right -->
    <div class="absolute top-4 right-5">
        <button
            onclick={() => onDateChange(new Date().toISOString().slice(0, 10))}
            class="text-[9px] font-black text-white/50 hover:text-accent shadow-sm uppercase tracking-[0.1em] transition-all px-2.5 py-1 rounded-md bg-white/5 border border-white/5 hover:border-accent/40 hover:bg-white/10 active:scale-95"
        >
            TODAY
        </button>
    </div>

    <div class="flex items-end justify-between pt-2">
        <DateHero date={dataDate} />
        <div class="pb-1">
            <CalendarNavigator date={dataDate} {onDateChange} {onNavigate} />
        </div>
    </div>
</div>
