<script lang="ts">
    import { onMount } from 'svelte';

    let report: any = $state(null);
    let isLoading = $state(true);

    onMount(async () => {
        try {
            const res = await fetch('/api/forensic/abnormal-report');
            report = await res.json();
        } catch (e) {
            console.error('Failed to fetch forensic report', e);
        } finally {
            isLoading = false;
        }
    });

    const severityMap: any = {
        CRITICAL: 'text-bearish border-bearish/30 bg-bearish/10',
        HIGH: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
        MEDIUM: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    };
</script>

<div class="mt-8 bg-surface/40 rounded-2xl border border-border/10 overflow-hidden">
    <div class="p-6 border-b border-border/10 flex items-center justify-between bg-surface/30">
        <div class="flex items-center gap-3">
            <div
                class="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent"
            >
                <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
            </div>
            <div>
                <h2 class="text-sm font-black text-text-primary uppercase tracking-widest">
                    Abnormal_Forensic_Report
                </h2>
                <p class="text-[9px] font-mono text-text-muted/60 uppercase">
                    Real-time Archetype Analysis
                </p>
            </div>
        </div>
        {#if report}
            <span
                class="px-2 py-0.5 rounded-full bg-bullish/10 text-bullish text-[8px] font-black border border-bullish/20 uppercase"
            >
                Status: {report.market_sentiment}
            </span>
        {/if}
    </div>

    <div class="p-6">
        {#if isLoading}
            <div class="space-y-4 animate-pulse">
                <div class="h-4 bg-surface/40 rounded w-3/4"></div>
                <div class="h-24 bg-surface/40 rounded"></div>
            </div>
        {:else if report}
            <div class="space-y-6">
                <!-- Summary Section -->
                <div class="relative p-4 bg-accent/5 border-l-2 border-accent rounded-r-xl">
                    <p class="text-xs text-text-muted/90 leading-relaxed italic">
                        "{report.summary}"
                    </p>
                </div>

                <!-- Alert Stream -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {#each report.alerts as alert}
                        <div
                            class="group p-4 rounded-xl border border-border/10 bg-surface/30 hover:bg-surface-hover/40 transition-all relative overflow-hidden"
                        >
                            <div class="flex items-center justify-between mb-3">
                                <span
                                    class="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border {severityMap[
                                        alert.severity
                                    ]}"
                                >
                                    {alert.type}
                                </span>
                                <span class="text-[10px] font-black font-mono text-text-muted/60"
                                    >{alert.symbol}</span
                                >
                            </div>
                            <h3 class="text-xs font-black text-text-primary mb-2">{alert.name}</h3>
                            <p class="text-[9px] text-text-muted leading-relaxed line-clamp-3">
                                {alert.reason}
                            </p>

                            <!-- Hover Decoration -->
                            <div
                                class="absolute -right-2 -bottom-2 w-8 h-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"
                            >
                                <svg fill="currentColor" viewBox="0 0 24 24"
                                    ><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg
                                >
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</div>
