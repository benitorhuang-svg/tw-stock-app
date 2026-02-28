<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    import { marketStore } from '../../stores/market.svelte.ts';

    // Atoms
    import ViewHeader from '../atoms/ViewHeader.svelte';

    // Molecules
    import RankingCard from '../molecules/RankingCard.svelte';
    import MarketKeyDimensions from '../molecules/MarketKeyDimensions.svelte';
    import MarketDistributionChart from '../molecules/MarketDistributionChart.svelte';
    import StrategyFilterMatrix from '../molecules/StrategyFilterMatrix.svelte';
    import QuickNav from '../molecules/QuickNav.svelte';
    import MarketPulseMetrics from '../molecules/MarketPulseMetrics.svelte';

    // Organisms
    import MABreadthChart from '../molecules/MABreadthChart.svelte';
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
    import { fmtVol } from '../../utils/format';

    // ─── Props ───────────────────────────────────────────
    interface Props {
        upCount?: number;
        downCount?: number;
        flatCount?: number;
        totalVolume?: number;
        avgChange?: number;
        dataDate?: string;
        gainers?: any[];
        losers?: any[];
        topVolume?: any[];
        distribution?: any;
        initialBreadthData?: any[];
        initialSectorData?: any[];
        initialMAData?: any;
    }

    let props = $props<Props>();

    // ─── Local Reactive State ────────────────────────────
    /**
     * Svelte 5 Pattern (Seed & Diverge):
     * We initialize local state from props (Astro SSR values).
     * Local state is then updated by SSE (live) or manual date navigation.
     */
    let upCount = $state(0);
    let downCount = $state(0);
    let flatCount = $state(0);
    let totalVolume = $state(0);
    let avgChange = $state(0);
    let dataDate = $state('');
    let gainers = $state<any[]>([]);
    let losers = $state<any[]>([]);
    let topVolume = $state<any[]>([]);
    let distribution = $state<any>(null);
    let sectors = $state<any[]>([]);
    let maData = $state<any>(null);

    let activeSSE: EventSource | null = null;
    let isLive = $state(false);
    let chartRef: any = $state();
    let expandedSections = $state<Record<string, boolean>>({
        pulse: true,
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
                    // Calculate offset: position section just below the sticky filter bar
                    const filterEl = scrollContainer.querySelector('.sticky.z-30') as HTMLElement;
                    const stickyOffset = filterEl
                        ? filterEl.offsetTop + filterEl.offsetHeight + 16
                        : 96;
                    const elTop = el.offsetTop;
                    // Walk up offset parents within the scroll container
                    let parent = el.offsetParent as HTMLElement | null;
                    let totalOffset = el.offsetTop;
                    while (parent && parent !== scrollContainer && scrollContainer.contains(parent)) {
                        totalOffset += parent.offsetTop;
                        parent = parent.offsetParent as HTMLElement | null;
                    }
                    scrollContainer.scrollTo({
                        top: totalOffset - stickyOffset,
                        behavior: 'smooth',
                    });
                }
            }, 350);
        }
    }

    let activeDistributionIndex: number | null = $state(null);
    let selectedSector: string | null = $state(null);

    // Scatter stocks: filtered by selected sector (from treemap click)
    const scatterStocks = $derived.by(() => {
        if (!selectedSector) return allFilteredStocks;
        return allFilteredStocks.filter(s => s.sector === selectedSector);
    });

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
            gainers = props.gainers ?? [];
            losers = props.losers ?? [];
            topVolume = props.topVolume ?? [];
            distribution = props.distribution ?? null;
            sectors = props.initialSectorData ?? [];
            maData = props.initialMAData ?? null;
        }
    });

    // ─── SSE Lifecycle ───────────────────────────────────
    onMount(() => {
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
    const allDates = $derived(props.initialBreadthData?.map(d => d.date).sort() || []);

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
                sectors = data.summary.sectors || [];
                maData = data.summary.maBreadth || null;
                gainers = data.gainers;
                losers = data.losers;
                topVolume = data.volumeLeaders;
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
    const allStocks = $derived([...(gainers || []), ...(losers || [])]);
    const allFilteredStocks = $derived(
        allStocks
            .filter(s => applyStockFilter(s, marketStore))
            .filter(s => isStockInActiveBin(s.changePercent || 0, activeDistributionIndex))
    );

    // List Derivations - Unified with allFilteredStocks
    const filteredGainers = $derived(
        activeDistributionIndex === 4
            ? []
            : allFilteredStocks
                  .filter(s => (s.changePercent || 0) > 0)
                  .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
                  .slice(0, 8)
    );
    const filteredLosers = $derived(
        allFilteredStocks
            .filter(s => (s.changePercent || 0) <= 0)
            .sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0))
            .slice(0, 8)
    );
    const filteredTopVolume = $derived(
        allFilteredStocks.sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 15)
    );

    // Derived Aggregate Data for Real-time Synchronization
    const treemapSectors = $derived(aggregateSectors(allFilteredStocks));
    const maBreadthData = $derived(calcMABreadth(allFilteredStocks));

    // Distribution - Dynamic based on MARKET side-filters
    const dynamicDistribution = $derived.by(() => {
        const base = allStocks.filter(s => applyStockFilter(s, marketStore));
        const dist = {
            p9: 0,
            p6_9: 0,
            p3_6: 0,
            p0_3: 0,
            zero: 0,
            m0_3: 0,
            m3_6: 0,
            m6_9: 0,
            m9: 0,
        };
        for (const s of base) {
            const chg = s.changePercent || 0;
            if (chg >= 9) dist.p9++;
            else if (chg >= 6) dist.p6_9++;
            else if (chg >= 3) dist.p3_6++;
            else if (chg > 0) dist.p0_3++;
            else if (chg === 0) dist.zero++;
            else if (chg > -3) dist.m0_3++;
            else if (chg > -6) dist.m3_6++;
            else if (chg > -9) dist.m6_9++;
            else dist.m9++;
        }
        return dist;
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
                class="glass-card shadow-elevated rounded-xl overflow-hidden border border-white/5 backdrop-blur-2xl bg-base-deep/90"
            >
                <StrategyFilterMatrix vertical={false} />
            </div>
        </div>

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
            initialBreadthData={props.initialBreadthData || []}
            bind:chartRef
            onDateSelect={fetchDateData}
        />
    </main>
</div>
