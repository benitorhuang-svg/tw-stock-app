<script lang="ts">
    import ViewHeader from '../atoms/ViewHeader.svelte';
    import AnalysisAccordion from '../organisms/AnalysisAccordion.svelte';
    import MABreadthChart from '../molecules/MABreadthChart.svelte';
    import MarketBreadthChart from '../organisms/MarketBreadthChart.svelte';

    interface Props {
        isOpen: boolean;
        onToggle: () => void;
        maBreadthData: any;
        initialBreadthData: any[];
        chartRef?: any;
        onDateSelect: (date: string) => void;
    }

    let {
        isOpen,
        onToggle,
        maBreadthData,
        initialBreadthData,
        chartRef = $bindable(),
        onDateSelect,
    }: Props = $props();
</script>

<AnalysisAccordion id="structure" icon="📐" title="技術結構 ( TECH STRUCTURE )" {isOpen} {onToggle}>
    <div class="flex flex-col lg:flex-row gap-3 pb-2 items-stretch">
        <!-- Left: MA Breadth (45%) -->
        <div
            class="w-full lg:w-[45%] glass-card shadow-elevated p-4 h-[380px] flex flex-col gap-3 overflow-hidden"
        >
            <ViewHeader title="多重均線多空排列 ( MA BREADTH )" />
            <div class="flex-1 w-full mx-auto min-h-0">
                {#if maBreadthData}
                    <MABreadthChart data={maBreadthData} />
                {/if}
            </div>
        </div>
        <!-- Right: Breadth & Momentum (55%) -->
        <div class="w-full lg:w-[55%] h-[380px] glass-card bg-base-deep/30 p-1 overflow-hidden">
            <MarketBreadthChart
                bind:this={chartRef}
                initialData={initialBreadthData}
                {onDateSelect}
            />
        </div>
    </div>
</AnalysisAccordion>
