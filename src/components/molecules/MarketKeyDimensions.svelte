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
    <div class="flex items-end justify-between pt-2">
        <DateHero date={dataDate} {onDateChange} {onNavigate} />
        <!-- remove separate navigator, controls now inside card -->
    </div>
</div>
