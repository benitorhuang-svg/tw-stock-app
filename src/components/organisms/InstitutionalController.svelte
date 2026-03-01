<script lang="ts">
    import { onMount } from 'svelte';
    import { marketStore } from '../../stores/market.svelte';

    // Reuse existing molecules/organisms
    import QuickNav from '../molecules/QuickNav.svelte';
    import AnalysisAccordion from '../organisms/AnalysisAccordion.svelte';
    import InstitutionalPulseHUD from '../organisms/InstitutionalPulseHUD.svelte';
    import InstitutionalMatrix from '../organisms/InstitutionalMatrix.svelte';
    import InstitutionalUnifiedTable from '../organisms/InstitutionalUnifiedTable.svelte';
    import ForensicRadar from '../organisms/ForensicRadar.svelte';
    import ForensicReport from '../organisms/ForensicReport.svelte';
    import InstitutionalAnalytics from '../organisms/InstitutionalAnalytics.svelte';
    import ForensicTicker from '../molecules/ForensicTicker.svelte';

    // ─── Accordion State ─────────────────────────────────
    let expandedSections = $state<Record<string, boolean>>({
        guide: true,
        pulse: false,
        matrix: false,
        unified: false,
        radar: false,
        report: false,
        analytics: false,
    });

    const NAV_ORDER = ['guide', 'pulse', 'matrix', 'unified', 'radar', 'report', 'analytics'];

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

    // ─── Quick Nav Items ─────────────────────────────────
    const navItems = [
        { id: 'guide', label: '功能說明', icon: '📖' },
        { id: 'pulse', label: '法人總覽', icon: '📡' },
        { id: 'matrix', label: '三法人監控', icon: '🏛️' },
        { id: 'unified', label: '統一列表', icon: '📊' },
        { id: 'radar', label: '籌碼雷達', icon: '🔬' },
        { id: 'report', label: '異常報告', icon: '📋' },
        { id: 'analytics', label: '趨勢分析', icon: '📈' },
    ];

    // ─── Data Fetching ───────────────────────────────────
    const defaultSummary = { foreign: 0, invest: 0, dealer: 0, total: 0 };
    const summary = $derived(marketStore.state.institutional.summary ?? defaultSummary);
    const date = $derived(marketStore.state.institutional.date);
    const isLoading = $derived(marketStore.state.isInstLoading);

    async function fetchData() {
        try {
            marketStore.setInstLoading(true);
            const res = await fetch('/api/market/institutional-streak');
            const data = await res.json();
            marketStore.updateInstitutionalData({
                foreign: data.foreign || [],
                invest: data.invest || [],
                dealer: data.dealer || [],
                summary: data.marketSummary || { foreign: 0, invest: 0, dealer: 0, total: 0 },
                trend: data.trend || [],
                date: data.date || '',
                forensicAlpha: data.forensicAlpha,
            });
        } catch (err) {
            console.error('[Institutional Controller] Fetch failure:', err);
            marketStore.setError('Failed to fetch institutional data');
        }
    }

    onMount(() => {
        fetchData();
    });

    function formatValue(v: number) {
        const units = Math.round(v / 1000);
        return `${units > 0 ? '+' : ''}${units.toLocaleString()}K`;
    }
    function colorClass(v: number) {
        return v > 0 ? 'text-bullish' : v < 0 ? 'text-bearish' : 'text-text-muted';
    }
</script>

<div class="flex flex-col lg:flex-row gap-4 items-start relative pb-10 pt-4">
    <!-- ═══ LEFT SIDEBAR ═══ -->
    <aside
        id="inst-sidebar"
        class="w-64 bg-base-deep/80 backdrop-blur-md border-r border-border flex flex-col z-20 shrink-0 sticky top-4 h-[calc(100vh-2rem)] rounded-xl overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
        <!-- Institutional Status Card -->
        <div class="px-5 py-6 flex flex-col gap-4 relative border-b border-border/50">
            <div class="flex items-center gap-3">
                <div
                    class="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center"
                >
                    <svg
                        class="w-6 h-6 text-accent"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                </div>
                <div class="flex flex-col">
                    <span
                        class="text-[11px] font-black text-text-primary/80 tracking-wide uppercase"
                        >法人監控</span
                    >
                    <span class="text-[9px] font-mono text-text-muted/40 tracking-wider">
                        {date || '—'}
                    </span>
                </div>
            </div>

            <!-- Mini Summary -->
            <div class="flex flex-col gap-2 mt-2">
                <div class="flex items-center justify-between">
                    <span class="text-[9px] font-mono text-text-muted/40 uppercase">Foreign</span>
                    <span class="text-[10px] font-black font-mono {colorClass(summary.foreign)}">
                        {formatValue(summary.foreign)}
                    </span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[9px] font-mono text-text-muted/40 uppercase">Trust</span>
                    <span class="text-[10px] font-black font-mono {colorClass(summary.invest)}">
                        {formatValue(summary.invest)}
                    </span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[9px] font-mono text-text-muted/40 uppercase">Dealer</span>
                    <span class="text-[10px] font-black font-mono {colorClass(summary.dealer)}">
                        {formatValue(summary.dealer)}
                    </span>
                </div>
                <div class="flex items-center justify-between border-t border-border/30 pt-1.5">
                    <span class="text-[9px] font-mono text-text-muted/40 uppercase">Total</span>
                    <span class="text-[11px] font-black font-mono {colorClass(summary.total)}">
                        {formatValue(summary.total)}
                    </span>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <div
            class="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
            <div class="px-5 flex-1 py-1 flex flex-col gap-0.5 bg-surface/5">
                <span
                    class="text-[10px] font-mono font-black text-text-muted/40 uppercase tracking-[0.25em] mb-1"
                >
                    快速索引 ( NAV )
                </span>
                {#each navItems as nav}
                    {@const isActive = expandedSections[nav.id]}
                    <button
                        onclick={() => scrollToSection(nav.id)}
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
                                : 'text-text-muted/60 group-hover:text-text-primary'} transition-colors"
                        >
                            {nav.label}
                        </span>
                        {#if isActive}
                            <div
                                class="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_12px_rgba(0,184,212,1)]"
                            ></div>
                            <div
                                class="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-accent rounded-r-full transition-all shadow-[0_0_10px_rgba(0,184,212,0.6)]"
                            ></div>
                        {/if}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Ticker Stream at bottom -->
        <div class="mt-auto px-3 py-3 border-t border-border/30">
            <ForensicTicker />
        </div>
    </aside>

    <!-- ═══ RIGHT MAIN AREA ═══ -->
    <main class="flex-1 space-y-4 animate-fade-right min-w-0">
        <!-- ⓪ 功能說明 ( FEATURE GUIDE ) -->
        <AnalysisAccordion
            id="guide"
            icon="📖"
            title="功能說明 ( FEATURE GUIDE )"
            isOpen={expandedSections.guide}
            onToggle={() => toggleSection('guide')}
        >
            <div
                class="glass-card bg-base-deep/30 px-5 py-4 shadow-elevated rounded-xl border border-border/10"
            >
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {#each [{ icon: '📡', title: '法人總覽', desc: '顯示外資、投信、自營商當日買賣超金額總覽，官股動向及市場集中度等關鍵指標。搜尋、市場別、背離篩選一覽無遺。' }, { icon: '🏛️', title: '三法人監控', desc: '外資、投信、自營商分三欄獨立顯示，各欄呈現連續買賣超天數、淨買賣張數、漲跌背離訊號等資訊。' }, { icon: '📊', title: '統一列表', desc: '將三大法人操作整合至同一張表格，同一檔股票可同時對比外資/投信/自營商的買賣操作，支援多欄排序。' }, { icon: '🔬', title: '籌碼雷達', desc: '進階篩選：高集中度股、官股買超、主力券商佈局、內部人異動、融資融券等五大面向，快速鎖定籌碼異常標的。' }, { icon: '📋', title: '異常報告', desc: '自動偵測法人行為異常模式：急買急賣、連續買超反轉、量能暴增等訊號，並產出結構化報告。' }, { icon: '📈', title: '趨勢分析', desc: '20日法人買賣超趨勢圖，疊加市場均價走勢，觀察法人資金流向與股價的領先/落後關係。' }] as item}
                        <div
                            class="flex gap-3 items-start p-3 rounded-lg bg-surface/30 border border-border/5"
                        >
                            <span class="text-xl mt-0.5 shrink-0">{item.icon}</span>
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-text-primary tracking-wide mb-1">
                                    {item.title}
                                </p>
                                <p class="text-[11px] text-text-muted leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </AnalysisAccordion>

        <!-- ① 法人總覽 ( INSTITUTIONAL PULSE ) -->
        <AnalysisAccordion
            id="pulse"
            icon="📡"
            title="法人總覽 ( INSTITUTIONAL PULSE )"
            isOpen={expandedSections.pulse}
            onToggle={() => toggleSection('pulse')}
        >
            <InstitutionalPulseHUD />
        </AnalysisAccordion>

        <!-- ② 三法人監控 ( MONITORING MATRIX ) -->
        <AnalysisAccordion
            id="matrix"
            icon="🏛️"
            title="三法人監控 ( MONITORING MATRIX )"
            isOpen={expandedSections.matrix}
            onToggle={() => toggleSection('matrix')}
        >
            <InstitutionalMatrix />
        </AnalysisAccordion>

        <!-- ③ 統一列表 ( UNIFIED FLOW TABLE ) -->
        <AnalysisAccordion
            id="unified"
            icon="📊"
            title="統一列表 ( UNIFIED FLOW TABLE )"
            isOpen={expandedSections.unified}
            onToggle={() => toggleSection('unified')}
        >
            <InstitutionalUnifiedTable />
        </AnalysisAccordion>

        <!-- ④ 籌碼雷達 ( FORENSIC RADAR ) -->
        <AnalysisAccordion
            id="radar"
            icon="🔬"
            title="籌碼雷達 ( FORENSIC RADAR )"
            isOpen={expandedSections.radar}
            onToggle={() => toggleSection('radar')}
        >
            <ForensicRadar />
        </AnalysisAccordion>

        <!-- ⑤ 異常報告 ( FORENSIC REPORT ) -->
        <AnalysisAccordion
            id="report"
            icon="📋"
            title="異常報告 ( FORENSIC REPORT )"
            isOpen={expandedSections.report}
            onToggle={() => toggleSection('report')}
        >
            <ForensicReport />
        </AnalysisAccordion>

        <!-- ⑥ 趨勢分析 ( VELOCITY ANALYTICS ) -->
        <AnalysisAccordion
            id="analytics"
            icon="📈"
            title="趨勢分析 ( VELOCITY ANALYTICS )"
            isOpen={expandedSections.analytics}
            onToggle={() => toggleSection('analytics')}
        >
            <InstitutionalAnalytics />
        </AnalysisAccordion>
    </main>
</div>
