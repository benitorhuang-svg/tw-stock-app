<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import QuickNav from '../molecules/QuickNav.svelte';
    import AnalysisAccordion from '../organisms/AnalysisAccordion.svelte';
    import ScreenerResults from './ScreenerResults.svelte';
    import ForensicFilteringMatrix from './ForensicFilteringMatrix.svelte';
    import BacktestHeatmap from '../molecules/BacktestHeatmap.svelte';

    interface Strategy {
        id: string;
        name: string;
        icon: string;
        category: string;
    }

    interface Props {
        presetStrategies: Strategy[];
    }

    let { presetStrategies }: Props = $props();

    let expandedSections = $state<Record<string, boolean>>({
        presets: true,
        matrix: false,
        backtest: false,
        results: true,
    });

    const NAV_ORDER = ['presets', 'matrix', 'backtest', 'results'];

    function toggleSection(key: string) {
        expandedSections[key] = !expandedSections[key];
    }

    function scrollToSection(key: string) {
        if (expandedSections[key]) {
            // If already open, toggle it closed
            expandedSections[key] = false;

            const allClosed = Object.values(expandedSections).every(v => v === false);
            const scrollContainer = document.getElementById('main-workspace');

            if (allClosed) {
                if (scrollContainer) {
                    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else {
                // Find nearest open section ABOVE the one we just closed
                const currentIndex = NAV_ORDER.indexOf(key);
                let targetKey = null;

                // 1. Look above
                for (let i = currentIndex - 1; i >= 0; i--) {
                    if (expandedSections[NAV_ORDER[i]]) {
                        targetKey = NAV_ORDER[i];
                        break;
                    }
                }

                // 2. If nothing above, look below
                if (!targetKey) {
                    for (let i = currentIndex + 1; i < NAV_ORDER.length; i++) {
                        if (expandedSections[NAV_ORDER[i]]) {
                            targetKey = NAV_ORDER[i];
                            break;
                        }
                    }
                }

                if (targetKey && scrollContainer) {
                    setTimeout(() => {
                        const el = document.getElementById(`section-${targetKey}`);
                        if (el) {
                            const scrollContainerRect = scrollContainer.getBoundingClientRect();
                            const filterBottom = scrollContainerRect.top + 64;
                            const elRect = el.getBoundingClientRect();
                            const scrollOffset = elRect.top - filterBottom + 60;
                            scrollContainer.scrollBy({
                                top: scrollOffset,
                                behavior: 'smooth',
                            });
                        }
                    }, 100);
                }
            }
        } else {
            expandedSections[key] = true;
            setTimeout(() => {
                const el = document.getElementById(`section-${key}`);
                const scrollContainer = document.getElementById('main-workspace');
                if (el && scrollContainer) {
                    const scrollContainerRect = scrollContainer.getBoundingClientRect();
                    const filterBottom = scrollContainerRect.top + 64;
                    const elRect = el.getBoundingClientRect();
                    const scrollOffset = elRect.top - filterBottom + 60;
                    scrollContainer.scrollBy({
                        top: scrollOffset,
                        behavior: 'smooth',
                    });
                }
            }, 350);
        }
    }

    const navItems = [
        { id: 'presets', label: '戰略佈署', icon: '🎯' },
        { id: 'matrix', label: '過濾矩陣', icon: '📊' },
        { id: 'backtest', label: '回測表現', icon: '🔍' },
        { id: 'results', label: '篩選結果', icon: '🧬' },
    ];
</script>

<div class="flex flex-col lg:flex-row gap-4 items-start relative pb-10 pt-4">
    <aside
        id="screener-sidebar"
        class="w-64 bg-base-deep/80 backdrop-blur-md border-r border-border flex flex-col z-20 shrink-0 sticky top-4 h-[calc(100vh-2rem)] rounded-xl overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
        <div class="px-5 py-6 border-b border-border/50">
            <h1 class="text-xs font-black tracking-[0.25em] text-accent uppercase">
                Screener_Terminal
            </h1>
            <p class="text-[9px] text-text-muted mt-1 font-mono">MULTI-VECTOR ISOLATION ENGINE</p>
        </div>
        <div
            class="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
            <QuickNav onNavigate={scrollToSection} activeStates={expandedSections} {navItems} />
        </div>

        <div class="p-5 mt-auto border-t border-border/50 bg-accent/5">
            <div class="flex items-center gap-2 mb-2">
                <div class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                <span class="text-[10px] font-bold text-accent uppercase tracking-wider"
                    >Engine status</span
                >
            </div>
            <p class="text-[9px] text-text-muted leading-relaxed font-mono">
                SYSTEM_READY: MONITORING 1,800+ ENTITIES
            </p>
        </div>
    </aside>

    <main class="flex-1 space-y-4 animate-fade-right min-w-0">
        <!-- ① 戰略佈署 ( TACTICAL PRESETS ) -->
        <AnalysisAccordion
            id="presets"
            icon="🎯"
            title="戰略佈署 ( TACTICAL PRESETS )"
            isOpen={expandedSections.presets}
            onToggle={() => toggleSection('presets')}
        >
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {#each presetStrategies as s}
                    <button
                        class="strategy-preset-btn p-4 rounded-xl bg-surface/30 border border-border/10 hover:border-accent/40 hover:bg-accent/[0.05] transition-all flex flex-col gap-3 group text-left relative overflow-hidden"
                        data-strategy-id={s.id}
                    >
                        <div class="flex items-center justify-between w-full">
                            <div
                                class="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-sm border border-border/5"
                            >
                                {s.icon}
                            </div>
                            <div
                                class="text-[9px] font-mono text-text-muted/40 uppercase tracking-widest"
                            >
                                {s.id.slice(0, 6)}
                            </div>
                        </div>
                        <div class="min-w-0">
                            <div
                                class="text-[13px] font-bold text-text-primary group-hover:text-accent transition-colors"
                            >
                                {s.name}
                            </div>
                            <div class="text-[10px] text-text-muted mt-1 line-clamp-1">
                                {s.category || 'Quantitative Vector'}
                            </div>
                        </div>
                        <div
                            class="absolute bottom-0 left-0 w-full h-[2px] bg-accent/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
                        ></div>
                    </button>
                {/each}
            </div>
        </AnalysisAccordion>

        <!-- ② 過濾矩陣 ( FORENSIC MATRIX ) -->
        <AnalysisAccordion
            id="matrix"
            icon="📊"
            title="過濾矩陣 ( FORENSIC FILTERING MATRIX )"
            isOpen={expandedSections.matrix}
            onToggle={() => toggleSection('matrix')}
        >
            <ForensicFilteringMatrix />
        </AnalysisAccordion>

        <!-- ③ 回測表現 ( BACKTEST HEATMAP ) -->
        <AnalysisAccordion
            id="backtest"
            icon="🔍"
            title="回測控制台 ( BACKTEST CONSOLE )"
            isOpen={expandedSections.backtest}
            onToggle={() => toggleSection('backtest')}
        >
            <BacktestHeatmap />
        </AnalysisAccordion>

        <!-- ④ 篩選結果 ( DETECTION RESULTS ) -->
        <AnalysisAccordion
            id="results"
            icon="🧬"
            title="隔離實體 ( ISOLATED ENTITIES )"
            isOpen={expandedSections.results}
            onToggle={() => toggleSection('results')}
        >
            <div class="glass-card overflow-hidden border border-border/20 shadow-elevated">
                <header
                    class="px-6 py-4 border-b border-border/10 bg-surface/30 flex items-center justify-between"
                >
                    <div class="flex items-center gap-3">
                        <span
                            class="text-[10px] font-mono text-text-muted uppercase tracking-[0.2em]"
                            >Detection_Stream</span
                        >
                        <div class="h-[1px] w-12 bg-border/20"></div>
                    </div>
                    <div class="flex items-center gap-4">
                        <span
                            class="text-[10px] font-mono text-accent font-bold uppercase"
                            id="visible-count">Awaiting_Scan</span
                        >
                    </div>
                </header>
                <ScreenerResults />
            </div>
        </AnalysisAccordion>
    </main>
</div>
