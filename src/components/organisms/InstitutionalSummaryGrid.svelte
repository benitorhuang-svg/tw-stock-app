<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';

    const summary = $derived(marketStore.state.institutional.summary);
    const date = $derived(marketStore.state.institutional.date);

    function formatValue(v: number) {
        // Taiwan convention: '張' = 1000 shares. API returns shares.
        const units = Math.round(v / 1000);
        const prefix = units > 0 ? '+' : '';
        return `${prefix}${units.toLocaleString()} 張`;
    }

    function colorClass(v: number) {
        return v > 0 ? 'text-bullish' : v < 0 ? 'text-bearish' : 'text-text-muted';
    }

    function bgClass(v: number) {
        return v > 0
            ? 'from-bullish/20 to-bullish/5 border-bullish/20'
            : v < 0
              ? 'from-bearish/20 to-bearish/5 border-bearish/20'
              : 'from-white/5 to-transparent border-white/10';
    }

    function glowClass(v: number) {
        return v > 0 ? 'shadow-bullish/10' : v < 0 ? 'shadow-bearish/10' : '';
    }

    $effect(() => {
        if (date) {
            const el = document.getElementById('inst-header-date');
            if (el) el.textContent = date;
        }
    });
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <!-- Foreign -->
    <div
        class="group relative p-6 rounded-2xl bg-gradient-to-br border backdrop-blur-md transition-all duration-500 hover:-translate-y-1 shadow-2xl {bgClass(
            summary.foreign
        )} {glowClass(summary.foreign)}"
    >
        <div class="flex items-center justify-between mb-4">
            <span class="text-[10px] font-black font-mono tracking-[0.3em] uppercase opacity-60"
                >Foreign_Channel</span
            >
            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <span class="text-lg">🏛️</span>
            </div>
        </div>
        <div class="flex flex-col">
            <span class="text-2xl font-black font-mono {colorClass(summary.foreign)}">
                {formatValue(summary.foreign)}
            </span>
            <span class="text-[9px] font-mono opacity-30 uppercase mt-2">Net_Position_Delta</span>
        </div>
    </div>

    <!-- Trust -->
    <div
        class="group relative p-6 rounded-2xl bg-gradient-to-br border backdrop-blur-md transition-all duration-500 hover:-translate-y-1 shadow-2xl {bgClass(
            summary.invest
        )} {glowClass(summary.invest)}"
    >
        <div class="flex items-center justify-between mb-4">
            <span class="text-[10px] font-black font-mono tracking-[0.3em] uppercase opacity-60"
                >Investment_Trust</span
            >
            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <span class="text-lg">📊</span>
            </div>
        </div>
        <div class="flex flex-col">
            <span class="text-2xl font-black font-mono {colorClass(summary.invest)}">
                {formatValue(summary.invest)}
            </span>
            <span class="text-[9px] font-mono opacity-30 uppercase mt-2"
                >Fund_Accumulation_Index</span
            >
        </div>
    </div>

    <!-- Dealer -->
    <div
        class="group relative p-6 rounded-2xl bg-gradient-to-br border backdrop-blur-md transition-all duration-500 hover:-translate-y-1 shadow-2xl {bgClass(
            summary.dealer
        )} {glowClass(summary.dealer)}"
    >
        <div class="flex items-center justify-between mb-4">
            <span class="text-[10px] font-black font-mono tracking-[0.3em] uppercase opacity-60"
                >Prop_Dealers</span
            >
            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <span class="text-lg">🏢</span>
            </div>
        </div>
        <div class="flex flex-col">
            <span class="text-2xl font-black font-mono {colorClass(summary.dealer)}">
                {formatValue(summary.dealer)}
            </span>
            <span class="text-[9px] font-mono opacity-30 uppercase mt-2"
                >Internal_Trading_Signal</span
            >
        </div>
    </div>

    <!-- Total -->
    <div
        class="group relative p-6 rounded-2xl bg-gradient-to-br border backdrop-blur-md transition-all duration-500 hover:-translate-y-1 shadow-2xl {bgClass(
            summary.total
        )} {glowClass(summary.total)}"
    >
        <div class="flex items-center justify-between mb-4">
            <span class="text-[10px] font-black font-mono tracking-[0.3em] uppercase opacity-60"
                >Combined_Matrix</span
            >
            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <span class="text-lg">📈</span>
            </div>
        </div>
        <div class="flex flex-col">
            <span class="text-2xl font-black font-mono {colorClass(summary.total)}">
                {formatValue(summary.total)}
            </span>
            <span class="text-[9px] font-mono opacity-30 uppercase mt-2"
                >Aggregate_Market_Pressure</span
            >
        </div>
    </div>
</div>
