<script lang="ts">
    /**
     * SidebarNavButton.svelte — Atom
     * Reusable sidebar navigation button with icon, label, active state
     */
    interface Props {
        label: string;
        icon: string;
        active?: boolean;
        onclick?: () => void;
    }

    let { label, icon, active = false, onclick }: Props = $props();
</script>

<button
    {onclick}
    class="w-full text-left px-4 py-3 rounded-xl text-[11px] font-mono transition-all flex items-center justify-between group border border-transparent active:scale-[0.98] {active
        ? 'bg-glass-hover text-text-primary border-accent/20'
        : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary'}"
>
    <div class="flex items-center gap-3 min-w-0 flex-1">
        <div
            class="w-6 h-6 shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-glass border border-border group-hover:border-accent/40 group-hover:bg-accent/10 transition-all {active
                ? 'border-accent/40 bg-accent/10 shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]'
                : ''}"
        >
            <span
                class="text-xs {active ? 'text-accent' : 'text-text-muted group-hover:text-accent'}"
                >{icon}</span
            >
        </div>
        <span
            class="truncate tracking-wide group-hover:translate-x-1 transition-transform {active
                ? 'font-bold text-accent'
                : ''}"
        >
            {label}
        </span>
    </div>
</button>
