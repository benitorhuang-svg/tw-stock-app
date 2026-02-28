<script lang="ts">
    import ViewHeader from '../atoms/ViewHeader.svelte';
    import AnalysisAccordion from '../organisms/AnalysisAccordion.svelte';
    import MarketPulseMetrics from '../molecules/MarketPulseMetrics.svelte';
    import MarketDistributionChart from '../molecules/MarketDistributionChart.svelte';

    interface Props {
        isOpen: boolean;
        onToggle: () => void;
        metrics: {
            totalVolume: number;
            avgChange: number;
            upCount: number;
            downCount: number;
            flatCount: number;
            ratio: string;
        };
        distribution: any;
        activeDistributionIndex: number | null;
        onSelectRange: (index: number | null) => void;
    }

    let { isOpen, onToggle, metrics, distribution, activeDistributionIndex, onSelectRange }: Props =
        $props();
</script>

<AnalysisAccordion id="pulse" icon="📡" title="大盤脈搏 ( MARKET PULSE )" {isOpen} {onToggle}>
    <div class="flex flex-col lg:flex-row gap-3 pb-2 items-stretch">
        <!-- Left: Numeric Metrics Card (40%) -->
        <div class="w-full lg:w-[40%] h-[280px]">
            <MarketPulseMetrics
                totalVolume={metrics.totalVolume}
                avgChange={metrics.avgChange}
                upCount={metrics.upCount}
                downCount={metrics.downCount}
                flatCount={metrics.flatCount}
                ratio={metrics.ratio}
            />
        </div>

        <!-- Right: Distribution Chart (60%) -->
        <div
            class="w-full lg:w-[60%] glass-card bg-base-deep/30 px-4 py-3 shadow-elevated flex flex-col gap-3 h-[280px]"
        >
            <ViewHeader title="個股漲跌家數分佈 ( DISTRIBUTION )" />
            {#if distribution}
                <div class="flex-1 min-h-0">
                    <MarketDistributionChart
                        {distribution}
                        activeRangeIndex={activeDistributionIndex}
                        {onSelectRange}
                    />
                </div>
            {/if}
        </div>
    </div>
</AnalysisAccordion>
