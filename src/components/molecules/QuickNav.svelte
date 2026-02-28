<script lang="ts">
    /**
     * QuickNav.svelte - Molecule for dashboard anchoring
     */
    interface Props {
        onNavigate: (id: string) => void;
        activeStates?: Record<string, boolean>;
        navItems?: { id: string; label: string; icon: string }[];
    }
    let {
        onNavigate,
        activeStates = {},
        navItems = [
            { id: 'guide', label: '功能說明', icon: '📖' },
            { id: 'pulse', label: '大盤脈搏', icon: '📡' },
            { id: 'scatter', label: '量價與產業', icon: '⚡' },
            { id: 'movers', label: '漲跌排行', icon: '🏆' },
            { id: 'flow', label: '資金流向', icon: '💰' },
            { id: 'structure', label: '技術結構', icon: '📐' },
        ],
    }: Props = $props();
</script>

<div class="px-5 flex-1 py-1 flex flex-col gap-0.5 bg-surface/5">
    <span class="text-[10px] font-mono font-black text-text-muted uppercase tracking-[0.25em] mb-1"
        >快速索引 ( NAV )</span
    >
    {#each navItems as nav}
        {@const isActive = activeStates[nav.id]}
        <button
            onclick={() => onNavigate(nav.id)}
            class="flex items-center gap-3 px-3 py-1 rounded-lg transition-all group group-active:scale-[0.98] text-left relative overflow-hidden
                   {isActive
                ? 'bg-accent/10 border border-accent/20 shadow-sm'
                : 'hover:bg-surface-hover/40 border border-transparent hover:translate-x-1.5'}"
        >
            <span
                class="text-base {isActive
                    ? 'opacity-100 scale-110 drop-shadow-sm'
                    : 'opacity-30 group-hover:opacity-100'} transition-all duration-300"
            >
                {nav.icon}
            </span>
            <span
                class="text-xs font-bold tracking-widest {isActive
                    ? 'text-accent'
                    : 'text-text-muted group-hover:text-text-primary'} transition-colors"
            >
                {nav.label}
            </span>
            {#if isActive}
                <div
                    class="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_12px_rgba(0,184,212,1)]"
                ></div>
                <!-- Glow line on the left -->
                <div
                    class="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-accent rounded-r-full transition-all shadow-[0_0_10px_rgba(0,184,212,0.6)]"
                ></div>
            {/if}
        </button>
    {/each}
</div>
