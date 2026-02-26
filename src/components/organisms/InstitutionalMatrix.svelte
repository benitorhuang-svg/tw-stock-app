<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';
    import InstitutionalColumn from '../molecules/InstitutionalColumn.svelte';

    // ─── Reactive State (Runes) ────────────────────────
    const institutional = $derived(marketStore.state.institutional);
    const isLoading = $derived(marketStore.state.isInstLoading);
</script>

<div
    class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0 animate-fade-up gpu-layer mb-12"
    style="animation-delay: 100ms"
>
    <InstitutionalColumn
        title="Foreign_Portfolio"
        subtitle="Global Capital Flow"
        channel="foreign"
        dotColorClass="bg-accent"
        data={institutional.foreign}
        {isLoading}
        scanText="Syncing_Frequencies"
    />

    <InstitutionalColumn
        title="Trust_Index"
        subtitle="Domestic Accumulation"
        channel="invest"
        dotColorClass="bg-bullish"
        data={institutional.invest}
        {isLoading}
        scanText="Scanning_Ledgers"
    />

    <InstitutionalColumn
        title="Prop_Alpha"
        subtitle="Internal Dealer Pulse"
        channel="dealer"
        dotColorClass="bg-yellow-400"
        data={institutional.dealer}
        {isLoading}
        scanText="Decrypting_Network"
    />
</div>

<style>
    :global(.gpu-layer) {
        transform: translateZ(0);
        will-change: transform, opacity;
    }
</style>
