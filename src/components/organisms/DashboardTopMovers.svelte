<script lang="ts">
    import AnalysisAccordion from '../organisms/AnalysisAccordion.svelte';
    import RankingCard from '../molecules/RankingCard.svelte';

    interface Props {
        isOpen: boolean;
        onToggle: () => void;
        filteredGainers: any[];
        filteredLosers: any[];
        activeDistributionIndex: number | null;
    }

    let { isOpen, onToggle, filteredGainers, filteredLosers, activeDistributionIndex }: Props =
        $props();
</script>

<AnalysisAccordion id="movers" icon="🏆" title="漲跌排行 ( TOP MOVERS )" {isOpen} {onToggle}>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-2">
        <RankingCard
            title={activeDistributionIndex === 4 ? '平盤排行' : '跌幅排行'}
            variant="bearish"
            items={filteredLosers}
            align="left"
        />
        <RankingCard
            title="漲幅排行"
            variant="bullish"
            items={activeDistributionIndex === 4 ? [] : filteredGainers}
            align="left"
        />
    </div>
</AnalysisAccordion>
