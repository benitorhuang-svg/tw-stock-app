<script lang="ts">
    import ViewHeader from '../atoms/ViewHeader.svelte';
    import AnalysisAccordion from '../organisms/AnalysisAccordion.svelte';
    import PriceVolumeScatter from '../molecules/PriceVolumeScatter.svelte';
    import SectorTreemap from '../molecules/SectorTreemap.svelte';

    interface Props {
        isOpen: boolean;
        onToggle: () => void;
        scatterStocks: any[];
        treemapSectors: any[];
        selectedSector: string | null;
        onSectorSelect: (sector: string) => void;
    }

    let { isOpen, onToggle, scatterStocks, treemapSectors, selectedSector, onSectorSelect }: Props =
        $props();
</script>

<AnalysisAccordion
    id="scatter"
    icon="⚡"
    title="量價與產業 ( ANALYSIS MATRIX )"
    {isOpen}
    {onToggle}
>
    <div class="flex flex-col lg:flex-row gap-3 pb-2 items-stretch">
        <!-- Left: Scatter (45%) -->
        <div
            class="w-full lg:w-[45%] glass-card shadow-elevated px-4 pb-4 pt-3 flex flex-col h-[360px] overflow-hidden"
        >
            <ViewHeader
                title="量價散佈圖 ( PRICE-VOLUME SCATTER ){selectedSector
                    ? ` — ${selectedSector}`
                    : ''}"
            />
            <div class="flex-1 mt-1 min-h-0">
                <PriceVolumeScatter stocks={scatterStocks} />
            </div>
        </div>
        <!-- Right: Treemap (55%) -->
        <div
            class="w-full lg:w-[55%] glass-card shadow-elevated px-4 pb-4 pt-3 h-[360px] flex flex-col gap-1 overflow-hidden"
        >
            <ViewHeader title="產業熱力圖 ( SECTOR TREEMAP )" />
            <div class="flex-1 min-h-0">
                <SectorTreemap sectors={treemapSectors} onSelect={onSectorSelect} />
            </div>
        </div>
    </div>
</AnalysisAccordion>
