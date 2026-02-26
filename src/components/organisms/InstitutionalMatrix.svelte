<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';
    import InstitutionalColumn from '../molecules/InstitutionalColumn.svelte';

    // ─── Reactive State (Runes) ────────────────────────
    // We can use $derived to automatically react to store changes
    const institutional = $derived(marketStore.state.institutional);
    const isLoading = $derived(marketStore.state.isInstLoading);
</script>

<div
    class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0 animate-fade-up gpu-layer"
    style="animation-delay: 100ms"
>
    <!-- Column 1: Foreign -->
    <InstitutionalColumn
        title="Foreign Channels"
        subtitle="Global Capital Flow"
        channel="foreign"
        dotColorClass="bg-bullish"
        colorClasses="from-bullish/10 hover:border-bullish/20"
        data={institutional.foreign}
        {isLoading}
        scanText="Synching_Frequencies"
    />

    <!-- Column 2: Trust -->
    <InstitutionalColumn
        title="Trust Domains"
        subtitle="Domestic Funds"
        channel="invest"
        dotColorClass="bg-accent"
        colorClasses="from-accent/10 hover:border-accent/20"
        data={institutional.invest}
        {isLoading}
        scanText="Checking_Ledgers"
    />

    <!-- Column 3: Dealer -->
    <InstitutionalColumn
        title="Dealer Network"
        subtitle="Proprietary Trading"
        channel="dealer"
        dotColorClass="bg-yellow-400"
        colorClasses="from-yellow-400/10 hover:border-yellow-400/20"
        data={institutional.dealer}
        {isLoading}
        scanText="Decrypt_Network"
    />
</div>

<style>
    /* Prevent layout shifts and optimize for GPU */
    :global(.gpu-layer) {
        transform: translateZ(0);
        will-change: transform, opacity;
    }
</style>
