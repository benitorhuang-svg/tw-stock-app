<script lang="ts">
    import AnalysisAccordion from '../organisms/AnalysisAccordion.svelte';
    import RankingCard from '../molecules/RankingCard.svelte';

    interface Props {
        isOpen: boolean;
        onToggle: () => void;
        filteredTopVolume: any[];
    }

    let { isOpen, onToggle, filteredTopVolume }: Props = $props();
</script>

<AnalysisAccordion id="flow" icon="💰" title="資金流向 ( CAPITAL FLOW )" {isOpen} {onToggle}>
    <div class="space-y-3 pb-2">
        <RankingCard title="主力資金匯聚排行" variant="accent" items={filteredTopVolume} />
    </div>
</AnalysisAccordion>
