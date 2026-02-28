<script lang="ts">
    import { onMount } from 'svelte';
    import QuickNav from '../molecules/QuickNav.svelte';
    import AnalysisAccordion from '../organisms/AnalysisAccordion.svelte';

    interface BacktestRow {
        streak_date: string;
        symbol: string;
        name: string;
        entry_price: number;
        exit_price: number;
        return_pct: number;
    }

    let data: BacktestRow[] = $state([]);
    let stats = $state({ winRate: 0, avgReturn: 0, samples: 0 });
    let isLoading = $state(true);

    // ─── Accordion State ─────────────────────────────────
    let expandedSections = $state<Record<string, boolean>>({
        guide: true,
        stats: false,
        results: false,
    });

    function toggleSection(key: string) {
        expandedSections[key] = !expandedSections[key];
    }

    function scrollToSection(key: string) {
        if (expandedSections[key]) {
            expandedSections[key] = false;
        } else {
            expandedSections[key] = true;
            setTimeout(() => {
                const el = document.getElementById(`section-${key}`);
                const scrollContainer = document.getElementById('main-workspace');
                if (el && scrollContainer) {
                    const elRect = el.getBoundingClientRect();
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const scrollOffset = elRect.top - containerRect.top - 80;
                    scrollContainer.scrollBy({ top: scrollOffset, behavior: 'smooth' });
                }
            }, 350);
        }
    }

    const navItems = [
        { id: 'guide', label: '功能說明', icon: '📖' },
        { id: 'stats', label: '統計總覽', icon: '📊' },
        { id: 'results', label: '回測結果', icon: '🧪' },
    ];

    async function runBacktest() {
        isLoading = true;
        try {
            const res = await fetch('/api/strategy/backtest');
            const result = await res.json();
            data = result.data;
            stats = result.stats;
        } catch (_e) {
            // silent fail
        }
        isLoading = false;
    }

    onMount(runBacktest);
</script>

<div class="flex flex-col lg:flex-row gap-4 items-start relative pb-10 pt-4">
    <!-- ═══ LEFT SIDEBAR ═══ -->
    <aside class="w-64 bg-base-deep/80 backdrop-blur-md border-r border-border flex flex-col z-20 shrink-0 sticky top-4 h-[calc(100vh-2rem)] rounded-xl overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div class="px-5 py-6 flex flex-col gap-4 relative border-b border-border/50">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                </div>
                <div class="flex flex-col">
                    <span class="text-[11px] font-black text-text-primary/80 tracking-wide uppercase">策略回測</span>
                    <span class="text-[9px] font-mono text-text-muted/40 tracking-wider">
                        BACKTEST ENGINE
                    </span>
                </div>
            </div>

            <!-- Mini Summary -->
            <div class="flex flex-col gap-2 mt-2">
                <div class="flex items-center justify-between">
                    <span class="text-[9px] font-mono text-text-muted/40 uppercase">樣本數</span>
                    <span class="text-[10px] font-black font-mono text-accent">{stats.samples}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[9px] font-mono text-text-muted/40 uppercase">勝率</span>
                    <span class="text-[10px] font-black font-mono text-bullish">{(stats.winRate * 100).toFixed(1)}%</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[9px] font-mono text-text-muted/40 uppercase">平均報酬</span>
                    <span class="text-[10px] font-black font-mono text-bullish">+{stats.avgReturn.toFixed(2)}%</span>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <div class="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <QuickNav onNavigate={scrollToSection} activeStates={expandedSections} {navItems} />
        </div>

        <div class="p-5 mt-auto border-t border-border/50 bg-accent/5">
            <div class="flex items-center gap-2 mb-2">
                <div class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                <span class="text-[10px] font-bold text-accent uppercase tracking-wider">Engine status</span>
            </div>
            <p class="text-[9px] text-text-muted leading-relaxed font-mono">{isLoading ? 'PROCESSING...' : 'READY'}</p>
        </div>
    </aside>

    <!-- ═══ RIGHT MAIN AREA ═══ -->
    <main class="flex-1 space-y-4 animate-fade-right min-w-0">
        <!-- ⓪ 功能說明 -->
        <AnalysisAccordion id="guide" icon="📖" title="功能說明 ( FEATURE GUIDE )" isOpen={expandedSections.guide} onToggle={() => toggleSection('guide')}>
            <div class="glass-card bg-base-deep/30 px-5 py-4 shadow-elevated rounded-xl border border-border/10">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {#each [
                        { icon: '📊', title: '統計總覽', desc: '顯示回測策略的勝率、平均報酬率與樣本數等核心績效指標，快速評估策略有效性。' },
                        { icon: '🧪', title: '回測結果', desc: '列出每筆回測紀錄的進出場價格、報酬率，完整追蹤策略在歷史數據上的表現。' },
                        { icon: '⚡', title: '策略條件', desc: '法人連續買超 ≥ 3 日做為進場訊號，持有 T+5 後平倉，計算期間報酬率。' },
                    ] as item}
                        <div class="flex gap-3 p-3 rounded-lg bg-surface/20 border border-border/5">
                            <span class="text-lg shrink-0">{item.icon}</span>
                            <div>
                                <h4 class="text-[11px] font-bold text-text-primary">{item.title}</h4>
                                <p class="text-[10px] text-text-muted leading-relaxed mt-1">{item.desc}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </AnalysisAccordion>

        <!-- ① 統計總覽 -->
        <AnalysisAccordion id="stats" icon="📊" title="統計總覽 ( PERFORMANCE METRICS )" isOpen={expandedSections.stats} onToggle={() => toggleSection('stats')}>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="stat-card border-accent/20 bg-accent/5">
                    <span class="label text-accent">樣本總數</span>
                    <span class="value text-text-primary">{stats.samples} 筆</span>
                    <div class="sub-label opacity-40">INST_STREAK >= 3</div>
                </div>
                <div class="stat-card border-bullish/20 bg-bullish/5">
                    <span class="label text-bullish">回測勝率</span>
                    <span class="value text-text-primary">{(stats.winRate * 100).toFixed(1)}%</span>
                    <div class="sub-label opacity-40">POSIX_RETURN > 0</div>
                </div>
                <div class="stat-card border-border bg-surface-hover">
                    <span class="label text-text-muted">平均報酬 (5日)</span>
                    <span class="value text-bullish">+{stats.avgReturn.toFixed(2)}%</span>
                    <div class="sub-label opacity-40">MEAN_EXPECTANCY</div>
                </div>
            </div>
        </AnalysisAccordion>

        <!-- ② 回測結果 -->
        <AnalysisAccordion id="results" icon="🧪" title="回測結果 ( BACKTEST HISTORY )" isOpen={expandedSections.results} onToggle={() => toggleSection('results')}>
            <div class="overflow-auto custom-scrollbar border border-border/40 rounded-xl bg-surface/20 max-h-[60vh]">
                <table class="w-full text-left border-collapse text-[11px] font-mono">
                    <thead class="sticky top-0 bg-surface z-10">
                        <tr class="border-b border-border/60">
                            <th class="p-4 text-text-muted uppercase tracking-widest">Date</th>
                            <th class="p-4 text-text-muted uppercase tracking-widest">Entity</th>
                            <th class="p-4 text-text-muted uppercase tracking-widest">Entry</th>
                            <th class="p-4 text-text-muted uppercase tracking-widest">Exit (T+5)</th>
                            <th class="p-4 text-text-muted uppercase tracking-widest text-right">Return</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border/20">
                        {#if isLoading}
                            <tr><td colspan="5" class="p-20 text-center animate-pulse uppercase tracking-[0.5em] text-accent">Processing_Vast_History...</td></tr>
                        {:else}
                            {#each data as row}
                                <tr class="hover:bg-surface-hover/30 transition-colors">
                                    <td class="p-4 opacity-40">{row.streak_date}</td>
                                    <td class="p-4">
                                        <div class="font-black text-text-primary">{row.symbol}</div>
                                        <div class="text-[9px] text-text-muted">{row.name}</div>
                                    </td>
                                    <td class="p-4 text-text-muted">{row.entry_price.toFixed(2)}</td>
                                    <td class="p-4 text-text-muted">{row.exit_price.toFixed(2)}</td>
                                    <td class="p-4 text-right font-black {row.return_pct > 0 ? 'text-bullish' : 'text-bearish'}">
                                        {row.return_pct > 0 ? '+' : ''}{row.return_pct.toFixed(2)}%
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        </AnalysisAccordion>
    </main>
</div>

<style>
    .stat-card {
        border-radius: 12px;
        padding: 20px;
        border: 1px solid;
    }
    .label {
        display: block;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 8px;
    }
    .value {
        display: block;
        font-size: 24px;
        font-weight: 900;
        letter-spacing: -1px;
    }
    .sub-label {
        font-size: 9px;
        font-family: var(--font-mono);
        margin-top: 4px;
    }
</style>
