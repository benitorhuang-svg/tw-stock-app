<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';
    import { SECTOR_OPTIONS } from '../../lib/filters/sector-filter';
    import CyberRangeSlider from '../atoms/CyberRangeSlider.svelte';

    /**
     * StrategyFilterMatrix.svelte - Molecule for the filter controls
     * Part of Atomic Design: Molecules
     */

    function resetFilters() {
        marketStore.searchKeyword = '';
        marketStore.filterMarket = '';
        marketStore.filterPriceRange = '';
        marketStore.filterMinVol = 0;
        marketStore.filterTrend = '0';
        marketStore.filterMA20 = 0;
        marketStore.filterSector = '';
    }

    let trendVal = $derived(parseFloat(marketStore.filterTrend));
</script>

<div
    class="w-full glass-card p-2 px-4 shadow-elevated bg-surface/30 flex items-center gap-6 shrink-0 h-14"
>
    <!-- Title Section (Compact) -->
    <div class="flex items-center gap-2 shrink-0 border-r border-white/5 pr-4 h-full">
        <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
        <h3 class="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.2em]">
            FILTERS <span class="text-white/10 ml-1">戰略篩選</span>
        </h3>
    </div>

    <!-- Controls Row -->
    <div class="flex-1 flex items-center gap-4">
        <!-- Market & Industry & Price Group -->
        <div
            class="flex items-center gap-0.5 px-0.5 py-0.5 bg-glass rounded-full border border-border h-8 min-w-[300px]"
        >
            <select
                bind:value={marketStore.filterMarket}
                class="flex-1 appearance-none h-7 px-2 text-center bg-transparent text-[10px] font-black tracking-widest text-[#94a3b8] cursor-pointer outline-none hover:text-accent transition-all uppercase"
            >
                <option value="">全部市場</option>
                <option value="tse">上市</option>
                <option value="otc">上櫃</option>
            </select>
            <div class="w-px h-3 bg-border shrink-0"></div>
            <select
                bind:value={marketStore.filterSector}
                class="flex-[1.5] appearance-none h-7 px-2 text-center bg-transparent text-[10px] font-black tracking-widest text-text-primary/60 cursor-pointer outline-none hover:text-accent transition-all uppercase"
            >
                <option value="">所有產業</option>
                {#each SECTOR_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                {/each}
            </select>
            <div class="w-px h-3 bg-border shrink-0"></div>
            <select
                bind:value={marketStore.filterPriceRange}
                class="flex-1 appearance-none h-7 px-2 text-center bg-transparent text-[10px] font-black tracking-widest text-[#94a3b8] cursor-pointer outline-none hover:text-accent transition-all uppercase"
            >
                <option value="">價格區間</option>
                <option value="0-50">50↓</option>
                <option value="50-100">50-100</option>
                <option value="100-500">100-500</option>
                <option value="500-10000">500↑</option>
            </select>
        </div>

        <!-- Sliders Group -->
        <div class="flex items-center gap-4 flex-1 max-w-[600px]">
            <!-- Slider: Trend -->
            <div class="flex-1">
                <CyberRangeSlider
                    label="漲跌幅"
                    bind:value={marketStore.filterTrend}
                    min={-10}
                    max={10}
                    step={0.5}
                    variant={trendVal > 0 ? 'bullish' : trendVal < 0 ? 'bearish' : 'accent'}
                    displayValue={(trendVal > 0 ? '+' : '') + trendVal.toFixed(1) + '%'}
                    onchange={val => (marketStore.filterTrend = val)}
                    onplus={() => (marketStore.filterTrend = String(Math.min(10, trendVal + 0.5)))}
                    onminus={() =>
                        (marketStore.filterTrend = String(Math.max(-10, trendVal - 0.5)))}
                />
            </div>

            <!-- Slider: Volume -->
            <div class="flex-1">
                <CyberRangeSlider
                    label="成交量"
                    bind:value={marketStore.filterMinVol}
                    min={0}
                    max={1000000}
                    step={10000}
                    displayValue={marketStore.filterMinVol > 0
                        ? marketStore.filterMinVol >= 10000
                            ? (marketStore.filterMinVol / 10000).toFixed(1) + '萬'
                            : marketStore.filterMinVol
                        : '0'}
                    onchange={val => (marketStore.filterMinVol = parseInt(val))}
                    onplus={() =>
                        (marketStore.filterMinVol = Math.min(
                            1000000,
                            marketStore.filterMinVol + 10000
                        ))}
                    onminus={() =>
                        (marketStore.filterMinVol = Math.max(0, marketStore.filterMinVol - 10000))}
                />
            </div>
        </div>
    </div>

    <!-- Reset Section -->
    <div class="shrink-0">
        <button
            onclick={resetFilters}
            class="flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 text-[10px] font-black text-white/40 hover:text-white transition-all uppercase tracking-[0.2em] active:scale-95 whitespace-nowrap"
        >
            <svg
                class="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path
                    d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                ></path>
            </svg>
            RESET
        </button>
    </div>
</div>
