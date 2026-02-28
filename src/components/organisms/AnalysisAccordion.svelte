<script lang="ts">
    import { slide } from 'svelte/transition';
    /**
     * AnalysisAccordion.svelte - Organism
     * Standardized accordion section for dashboard analysis views
     */
    interface Props {
        id: string;
        title: string;
        icon: string;
        isOpen: boolean;
        onToggle: () => void;
        children?: any;
    }
    let { id, title, icon, isOpen, onToggle, children }: Props = $props();
</script>

<section id="section-{id}" class="flex flex-col gap-3 scroll-mt-24">
    <button
        class="w-full flex items-center justify-between px-4 py-2.5 bg-surface-hover/30 hover:bg-surface-hover/60 transition-all border border-border/10 rounded-xl group relative overflow-hidden active:scale-[0.995] shadow-sm"
        onclick={onToggle}
    >
        <!-- Subtle gradient overlay on active/hover -->
        <div
            class="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        ></div>

        <div class="flex items-center gap-3 relative z-10">
            <div
                class="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-lg shadow-sm border border-border/5 group-hover:scale-110 transition-transform"
            >
                {icon}
            </div>
            <div class="flex flex-col items-start leading-none justify-center">
                <span class="text-[13px] font-bold text-text-primary tracking-wide">
                    {title}
                </span>
            </div>
        </div>

        <div class="flex items-center gap-4 relative z-10">
            {#if isOpen}
                <div
                    class="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)] animate-pulse"
                ></div>
            {/if}
            <div
                class="text-text-muted/40 group-hover:text-accent transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) {isOpen
                    ? 'rotate-180 text-accent'
                    : ''}"
            >
                <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </div>
        </div>
    </button>

    {#if isOpen}
        <div transition:slide={{ duration: 300 }}>
            {@render children?.()}
        </div>
    {/if}
</section>
