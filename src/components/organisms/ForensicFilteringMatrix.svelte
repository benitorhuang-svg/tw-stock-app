<script lang="ts">
    interface SliderConfig {
        id: string;
        label: string;
        min: number;
        max: number;
        step: number;
        value: number;
        displayId: string;
        colorClass?: string;
        filterType: string;
    }

    interface SliderGroup {
        title: string;
        sliders: SliderConfig[];
        extra?: 'institutional-domain';
    }

    const groups: SliderGroup[] = [
        {
            title: 'Value Deciles',
            sliders: [
                { id: 'filter-pe-max', label: 'P/E Ratio ≤', min: 1, max: 100, step: 1, value: 100, displayId: 'pe-display', filterType: 'pe' },
                { id: 'filter-pb-max', label: 'P/B Ratio ≤', min: 0.1, max: 10, step: 0.1, value: 10, displayId: 'pb-display', filterType: 'pb' },
                { id: 'filter-yield-min', label: 'Yield % ≥', min: 0, max: 15, step: 0.5, value: 0, displayId: 'yield-display', colorClass: 'text-bullish', filterType: 'yield' },
            ],
        },
        {
            title: 'Growth Vector',
            sliders: [
                { id: 'filter-rev-min', label: 'Rev YoY % ≥', min: -20, max: 100, step: 1, value: -20, displayId: 'rev-display', colorClass: 'text-bullish', filterType: 'rev' },
                { id: 'filter-margin-min', label: 'Op Margin % ≥', min: -10, max: 50, step: 1, value: -10, displayId: 'margin-display', filterType: 'margin' },
                { id: 'filter-eps-min', label: 'EPS (TWD) ≥', min: -5, max: 30, step: 0.5, value: -5, displayId: 'eps-display', filterType: 'eps' },
            ],
        },
        {
            title: 'Capital Forensic',
            sliders: [
                { id: 'filter-foreign-streak', label: 'Foreign Streak (Days) ≥', min: 0, max: 10, step: 1, value: 0, displayId: 'foreign-display', colorClass: 'text-bullish', filterType: 'foreign' },
                { id: 'filter-trust-streak', label: 'Trust Streak (Days) ≥', min: 0, max: 10, step: 1, value: 0, displayId: 'trust-display', filterType: 'trust' },
            ],
            extra: 'institutional-domain',
        },
    ];
</script>

<div class="glass-card p-6 border-b-2 border-b-accent/20 animate-fade-up" style="animation-delay: 150ms">
    <div class="flex items-center justify-between mb-8 pb-4 border-b border-border/10">
        <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H4V4"/><path d="M4 16h16"/><path d="M4 12h16"/><path d="M4 8h16"/></svg>
            </div>
            <div>
                <h3 class="text-xs font-mono font-bold text-text-primary uppercase tracking-[0.2em]">Forensic Filtering Matrix</h3>
                <p class="text-[9px] text-text-muted font-mono mt-0.5" id="visible-count">SCANNING DATABASE...</p>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <button id="reset-filters" class="p-2 rounded-lg bg-surface-hover/20 border border-border text-text-muted hover:text-text-primary transition-colors" title="Reset Filters">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button id="add-custom-strategy" class="px-4 py-2 rounded-xl bg-accent/20 text-accent text-[10px] font-bold border border-accent/30 hover:bg-accent/30 transition-all flex items-center gap-2">
                <span>✨ SAVE CONFIG</span>
            </button>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12" id="slider-container">
        {#each groups as group}
            <div class="space-y-6">
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-3 h-0.5 bg-accent/40"></div>
                    <span class="text-[9px] font-mono font-bold text-text-muted/70 uppercase tracking-widest">{group.title}</span>
                </div>
                {#each group.sliders as slider}
                    <div class="space-y-2 group" data-filter-type={slider.filterType}>
                        <div class="flex justify-between items-end">
                            <span class="text-[10px] text-text-muted group-hover:text-text-muted transition-colors">{slider.label}</span>
                            <span class="text-xs font-mono font-bold {slider.colorClass || 'text-accent'}" id={slider.displayId}>{slider.value}</span>
                        </div>
                        <input type="range" id={slider.id} min={slider.min} max={slider.max} step={slider.step} value={slider.value} class="w-full custom-range" />
                    </div>
                {/each}
                {#if group.extra === 'institutional-domain'}
                    <div class="space-y-3">
                        <span class="text-[10px] text-text-muted uppercase tracking-widest block">Institutional Domain</span>
                        <div class="flex gap-2">
                            <button class="flex-1 py-1.5 rounded-lg bg-surface-hover/10 border border-border text-[9px] font-bold text-text-muted hover:text-text-primary hover:border-border-hover transition-all uppercase tracking-tighter">Foreign Focus</button>
                            <button class="flex-1 py-1.5 rounded-lg bg-surface-hover/10 border border-border text-[9px] font-bold text-text-muted hover:text-text-primary hover:border-border-hover transition-all uppercase tracking-tighter">Local Trust</button>
                        </div>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<style>
    :global(.custom-range) {
        -webkit-appearance: none;
        height: 4px;
        background: var(--color-border);
        border-radius: 10px;
        border: none;
        outline: none;
    }
    :global(.custom-range::-webkit-slider-thumb) {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        background: var(--color-accent);
        border: 3px solid var(--color-surface);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.4);
        transition: all 0.2s;
    }
    :global(.custom-range::-webkit-slider-thumb:hover) {
        transform: scale(1.2);
        box-shadow: 0 0 15px rgba(var(--accent-rgb), 0.6);
    }
</style>
