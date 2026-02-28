<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { marketStore } from '../../stores/market.svelte.ts';

    // Molecules
    import MarketKeyDimensions from '../molecules/MarketKeyDimensions.svelte';
    import StrategyFilterMatrix from '../molecules/StrategyFilterMatrix.svelte';
    import QuickNav from '../molecules/QuickNav.svelte';

    // Organisms
    import AnalysisAccordion from '../organisms/AnalysisAccordion.svelte';
    import DashboardPulse from '../organisms/DashboardPulse.svelte';
    import DashboardAnalysisMatrix from '../organisms/DashboardAnalysisMatrix.svelte';
    import DashboardTechStructure from '../organisms/DashboardTechStructure.svelte';
    import DashboardTopMovers from '../organisms/DashboardTopMovers.svelte';
    import DashboardCapitalFlow from '../organisms/DashboardCapitalFlow.svelte';

    // Shared utilities
    import {
        applyStockFilter,
        isStockInActiveBin,
        aggregateSectors,
        calcMABreadth,
    } from '../../lib/filters/stock-filter';

    // ─── Props (lightweight: only SSR summary numbers) ──
    interface Props {
        upCount?: number;
        downCount?: number;
        flatCount?: number;
        totalVolume?: number;
        avgChange?: number;
        dataDate?: string;
        distribution?: any;
    }

    let props = $props<Props>();

    // ─── Local Reactive State ────────────────────────────
    /**
     * Svelte 5 Pattern (Seed & Diverge):
     * Summary numbers from SSR props (instant render).
     * Heavy data (stocks, breadth) fetched client-side on mount.
     */
    let upCount = $state(0);
    let downCount = $state(0);
    let flatCount = $state(0);
    let totalVolume = $state(0);
    let avgChange = $state(0);
    let dataDate = $state('');
    let gainers = $state<any[]>([]);
    let losers = $state<any[]>([]);
    let distribution = $state<any>(null);
    let breadthData = $state<any[]>([]);

    let activeSSE: EventSource | null = null;
    let isLive = $state(false);
    let chartRef: any = $state();
    let expandedSections = $state<Record<string, boolean>>({
        guide: true,
        pulse: false,
        scatter: false,
        sectors: false,
        movers: false,
        flow: false,
        structure: false,
    });

    function toggleSection(key: string) {
        expandedSections[key] = !expandedSections[key];
    }

    function scrollToSection(key: string) {
        if (expandedSections[key]) {
            // If already open, toggle it closed
            expandedSections[key] = false;
        } else {
            // Expand and scroll
            expandedSections[key] = true;
            setTimeout(() => {
                const el = document.getElementById(`section-${key}`);
                const scrollContainer = document.getElementById('main-workspace');
                if (el && scrollContainer) {
                    // Use getBoundingClientRect for reliable positioning
                    const filterEl = scrollContainer.querySelector('.sticky.z-30') as HTMLElement;
                    const filterBottom = filterEl
                        ? filterEl.getBoundingClientRect().bottom
                        : scrollContainer.getBoundingClientRect().top + 96;
                    const elRect = el.getBoundingClientRect();
                    const scrollOffset = elRect.top - filterBottom+56;
                    scrollContainer.scrollBy({
                        top: scrollOffset,
                        behavior: 'smooth',
                    });
                }
            }, 350);
        }
    }

    let activeDistributionIndex: number | null = $state(null);
    let selectedSector: string | null = $state(null);

    function handleSectorSelect(sectorName: string) {
        selectedSector = selectedSector === sectorName ? null : sectorName;
    }

    // Initial seeding from props (sync once or when not in live mode)
    $effect(() => {
        if (!isLive) {
            upCount = props.upCount ?? 0;
            downCount = props.downCount ?? 0;
            flatCount = props.flatCount ?? 0;
            totalVolume = props.totalVolume ?? 0;
            avgChange = props.avgChange ?? 0;
            dataDate = props.dataDate ?? '';
            distribution = props.distribution ?? null;
        }
    });

    // ─── Client-side data fetch (keeps HTML lightweight) ─
    async function fetchInitialData() {
        try {
            const [stocksRes, breadthRes] = await Promise.all([
                fetch('/api/market/latest'),
                fetch('/api/market/breadth-timeseries'),
            ]);
            if (stocksRes.ok) {
                const data = await stocksRes.json();
                gainers = data.gainers ?? [];
                losers = data.losers ?? [];
            }
            if (breadthRes.ok) {
                breadthData = await breadthRes.json();
            }
        } catch (err) {
            console.error('[Initial fetch error]', err);
        }
    }

    // ─── SSE Lifecycle ───────────────────────────────────
    onMount(() => {
        fetchInitialData();
        if (typeof EventSource !== 'undefined') {
            activeSSE = new EventSource('/api/sse/stream');
            activeSSE.addEventListener('tick', (e: any) => {
                try {
                    const ticks = JSON.parse(e.data);
                    if (!ticks || !Array.isArray(ticks)) return;
                    let up = 0,
                        down = 0,
                        flat = 0,
                        tVol = 0,
                        tPct = 0,
                        count = 0;
                    let latestDate = '';
                    for (const t of ticks) {
                        const price = parseFloat(t.Close || t.price || 0);
                        const chgPct = parseFloat(t.ChangePct || t.changePercent || 0);
                        const vol = parseFloat(t.Volume || t.volume || 0);
                        if (price > 0) {
                            if (chgPct > 0) up++;
                            else if (chgPct < 0) down++;
                            else flat++;
                            tVol += vol;
                            tPct += chgPct;
                            count++;
                            if (t.Date) latestDate = t.Date;
                        }
                    }
                    upCount = up;
                    downCount = down;
                    flatCount = flat;
                    totalVolume = tVol;
                    avgChange = count > 0 ? tPct / count : 0;
                    if (latestDate) dataDate = latestDate;
                    isLive = true;
                } catch (err) {
                    console.error('[SSE Error]', err);
                }
            });
        }
    });

    onDestroy(() => {
        if (activeSSE) activeSSE.close();
    });

    // ─── Logic ───────────────────────────────────────────
    const allDates = $derived(breadthData.map(d => d.date).sort());

    async function fetchDateData(date: string) {
        if (!date) return;
        dataDate = date;
        isLive = false;
        if (chartRef) chartRef.focusOnDate(date);
        if (activeSSE) {
            activeSSE.close();
            activeSSE = null;
        }
        try {
            const res = await fetch(`/api/market/history?date=${date}`, { cache: 'no-store' });
            const data = await res.json();
            if (res.ok && !data.error) {
                upCount = data.summary.up;
                downCount = data.summary.down;
                flatCount = data.summary.flat;
                totalVolume = data.summary.totalVolume;
                avgChange = data.summary.avgChange;
                distribution = data.summary.distribution;
                gainers = data.gainers;
                losers = data.losers;
            }
        } catch (err) {
            console.error('[Sync Error]', err);
        }
    }

    function navigateDate(direction: number) {
        const currentIndex = allDates.indexOf(dataDate);
        if (currentIndex === -1) return;
        const nextIndex = currentIndex + direction;
        if (nextIndex >= 0 && nextIndex < allDates.length) {
            fetchDateData(allDates[nextIndex]);
        }
    }

    let ratio = $derived(downCount > 0 ? (upCount / downCount).toFixed(2) : 'MAX');

    // ─── Single-pass filter: combines market filter + distribution bin ──
    const allFilteredStocks = $derived.by(() => {
        const g = gainers;
        const l = losers;
        if (!g.length && !l.length) return [];
        const combined = g.length && l.length ? [...g, ...l] : g.length ? g : l;
        const idx = activeDistributionIndex;
        return combined.filter(
            s => applyStockFilter(s, marketStore) && isStockInActiveBin(s.changePercent || 0, idx)
        );
    });

    // ─── Gated Derivations: Skip expensive sort/aggregation when accordion is collapsed ──

    const filteredGainers = $derived.by(() => {
        if (!expandedSections.movers || activeDistributionIndex === 4) return [];
        return allFilteredStocks
            .filter(s => (s.changePercent || 0) > 0)
            .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
            .slice(0, 8);
    });
    const filteredLosers = $derived.by(() => {
        if (!expandedSections.movers) return [];
        return allFilteredStocks
            .filter(s => (s.changePercent || 0) <= 0)
            .sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0))
            .slice(0, 8);
    });
    const filteredTopVolume = $derived.by(() => {
        if (!expandedSections.flow) return [];
        return [...allFilteredStocks].sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 15);
    });

    const scatterStocks = $derived.by(() => {
        if (!expandedSections.scatter && !expandedSections.sectors) return [];
        if (!selectedSector) return allFilteredStocks;
        return allFilteredStocks.filter(s => s.sector === selectedSector);
    });

    const treemapSectors = $derived.by(() => {
        if (!expandedSections.scatter && !expandedSections.sectors) return [];
        return aggregateSectors(allFilteredStocks);
    });

    const maBreadthData = $derived.by(() => {
        if (!expandedSections.structure) return null;
        return calcMABreadth(allFilteredStocks);
    });
</script>

<div class="flex flex-col lg:flex-row gap-4 items-start relative pb-10 pt-4">
    <aside
        id="db-sidebar"
        class="w-64 bg-base-deep/80 backdrop-blur-md border-r border-border flex flex-col z-20 shrink-0 sticky top-4 h-[calc(100vh-2rem)] rounded-xl overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
        <div class="flex-shrink-0">
            <MarketKeyDimensions
                {dataDate}
                onDateChange={fetchDateData}
                onNavigate={navigateDate}
            />
        </div>
        <div
            class="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
            <QuickNav onNavigate={scrollToSection} activeStates={expandedSections} />
        </div>
    </aside>

    <main class="flex-1 space-y-4 animate-fade-right min-w-0">
        <!-- 戰略篩選 / FILTERS -->
        <div
            class="w-full flex flex-col gap-2 mb-2 sticky top-4 z-30 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)]"
        >
            <div
                class="glass-card shadow-elevated rounded-xl overflow-hidden border border-border backdrop-blur-2xl bg-base-deep/90"
            >
                <StrategyFilterMatrix vertical={false} />
            </div>
        </div>

        <!-- ⓪ 功能說明 ( FEATURE GUIDE ) -->
        <AnalysisAccordion id="guide" icon="📖" title="功能說明 ( FEATURE GUIDE )" isOpen={expandedSections.guide} onToggle={() => toggleSection('guide')}>
            <div class="glass-card bg-base-deep/30 px-5 py-4 shadow-elevated rounded-xl border border-border/10">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {#each [
                        { icon: '📡', title: '大盤脈搏', desc: '即時總覽漲跌家數、成交量、平均漲幅等大盤關鍵指標，並以分佈圖顯示個股漲跌幅度分布。點選分佈柱可篩選特定漲跌區間。' },
                        { icon: '⚡', title: '量價與產業', desc: '散佈圖展示個股量價關係，樹狀圖顯示產業板塊漲跌熱度。點選產業可快速篩選該板塊個股。' },
                        { icon: '🏆', title: '漲跌排行', desc: '即時顯示當日漲幅/跌幅前 5 名的個股，自動依篩選條件更新排行結果。' },
                        { icon: '💰', title: '資金流向', desc: '以成交量排序顯示前 5 活躍個股，快速掌握市場資金集中方向。' },
                        { icon: '📐', title: '技術結構', desc: '多重均線多空排列分析—顯示站上月線/季線/半年線的個股比例，以及漲跌比率趨勢圖。' },
                        { icon: '🔍', title: '篩選概述', desc: '上方篩選列可依市場別、產業別、價格區間、最低成交量、趨勢方向等條件快速過濾個股。' },
                    ] as item}
                        <div class="flex gap-3 items-start p-3 rounded-lg bg-surface/30 border border-border/5">
                            <span class="text-xl mt-0.5 shrink-0">{item.icon}</span>
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-text-primary tracking-wide mb-1">{item.title}</p>
                                <p class="text-[11px] text-text-muted leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </AnalysisAccordion>

        <!-- ① 大盤脈搏 ( MARKET PULSE ) -->
        <DashboardPulse
            isOpen={expandedSections.pulse}
            onToggle={() => toggleSection('pulse')}
            metrics={{ totalVolume, avgChange, upCount, downCount, flatCount, ratio }}
            {distribution}
            {activeDistributionIndex}
            onSelectRange={idx => (activeDistributionIndex = idx)}
        />

        <!-- ② 量價與產業 ( ANALYSIS MATRIX ) -->
        <DashboardAnalysisMatrix
            isOpen={expandedSections.scatter || expandedSections.sectors}
            onToggle={() => {
                const newState = !expandedSections.scatter;
                expandedSections.scatter = newState;
                expandedSections.sectors = newState;
            }}
            {scatterStocks}
            {treemapSectors}
            {selectedSector}
            onSectorSelect={handleSectorSelect}
        />

        <!-- ④ 漲跌排行 ( TOP MOVERS ) -->
        <!-- ④ 漲跌排行 ( TOP MOVERS ) -->
        <DashboardTopMovers
            isOpen={expandedSections.movers}
            onToggle={() => toggleSection('movers')}
            filteredGainers={filteredGainers.slice(0, 5)}
            filteredLosers={filteredLosers.slice(0, 5)}
            {activeDistributionIndex}
        />

        <!-- ⑤ 資金流向 ( CAPITAL FLOW ) -->
        <DashboardCapitalFlow
            isOpen={expandedSections.flow}
            onToggle={() => toggleSection('flow')}
            filteredTopVolume={filteredTopVolume.slice(0, 5)}
        />

        <!-- ⑥ 技術結構 ( TECH STRUCTURE ) -->
        <DashboardTechStructure
            isOpen={expandedSections.structure}
            onToggle={() => toggleSection('structure')}
            {maBreadthData}
            initialBreadthData={breadthData}
            bind:chartRef
            onDateSelect={fetchDateData}
        />
    </main>
</div>
