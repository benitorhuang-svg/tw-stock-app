<script lang="ts">
    /**
     * DateHero.svelte - Atom
     * Specialized vertical date display for sidebars/HUDs
     */
    interface Props {
        date: string;
    }
    let { date }: Props = $props();

    let year = $derived(date ? date.split('-')[0] : '—');
    let monthDay = $derived(date ? date.split('-').slice(1).join('-') : '—');
</script>

<div class="flex flex-col leading-none">
    <span
        class="text-[11px] font-mono font-bold text-text-muted/40 tracking-[0.2em] leading-none mb-1 uppercase"
    >
        Fiscal Year {year}
    </span>
    <span class="text-4xl font-mono font-black text-text-primary tracking-tighter drop-shadow-sm">
        {monthDay}
    </span>
</div>
