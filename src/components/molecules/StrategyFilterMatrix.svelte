<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';
    import { SECTOR_OPTIONS } from '../../lib/filters/sector-filter';
    import CyberRangeSlider from '../atoms/CyberRangeSlider.svelte';

    /**
     * StrategyFilterMatrix.svelte - Molecule for the filter controls
     */
    interface Props {
        vertical?: boolean;
    }
    let { vertical = false }: Props = $props();

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

{#if !vertical}
    <!-- ORIGINAL HORIZONTAL LAYOUT (Deprecated if always vertical) -->
    <div
        class="w-full glass-card p-2 px-4 shadow-elevated bg-surface/30 flex items-center gap-6 shrink-0 h-14"
    >
        <div class="flex-1 flex items-center gap-4">
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

            <div class="flex items-center gap-4 flex-1 max-w-[600px]">
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
                        onplus={() =>
                            (marketStore.filterTrend = String(Math.min(10, trendVal + 0.5)))}
                        onminus={() =>
                            (marketStore.filterTrend = String(Math.max(-10, trendVal - 0.5)))}
                    />
                </div>
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
                            (marketStore.filterMinVol = Math.max(
                                0,
                                marketStore.filterMinVol - 10000
                            ))}
                    />
                </div>
            </div>
        </div>
        <button
            onclick={resetFilters}
            class="flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-black text-white/40 hover:text-white transition-all uppercase tracking-[0.2em] active:scale-95 whitespace-nowrap"
            >RESET</button
        >
    </div>
{:else}
    <!-- VERTICAL SIDEBAR LAYOUT -->
    <div class="w-full flex flex-col gap-4 p-4 border-b border-white/5 bg-white/[0.02]">
        <div class="flex items-center justify-between mb-1">
            <span class="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]"
                >戰略篩選 / FILTERS</span
            >
            <button
                onclick={resetFilters}
                class="text-[9px] font-mono text-accent/60 hover:text-accent transition-colors uppercase tracking-widest"
                >RESET</button
            >
        </div>

        <!-- Compact Select Row -->
        <div
            class="flex items-center gap-0.5 px-0.5 py-0.5 bg-white/5 rounded-lg border border-white/5 h-9 shrink-0"
        >
            <select
                bind:value={marketStore.filterMarket}
                class="flex-1 appearance-none h-7 px-1 text-center bg-transparent text-[9px] font-bold tracking-tighter text-white/50 cursor-pointer outline-none hover:text-accent transition-all uppercase"
            >
                <option value="">市場</option>
                <option value="tse">上市</option>
                <option value="otc">上櫃</option>
            </select>
            <div class="w-px h-3 bg-white/10 shrink-0"></div>
            <select
                bind:value={marketStore.filterSector}
                class="flex-1 appearance-none h-7 px-1 text-center bg-transparent text-[9px] font-bold tracking-tighter text-white/50 cursor-pointer outline-none hover:text-accent transition-all uppercase"
            >
                <option value="">產業</option>
                {#each SECTOR_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                {/each}
            </select>
            <div class="w-px h-3 bg-white/10 shrink-0"></div>
            <select
                bind:value={marketStore.filterPriceRange}
                class="flex-1 appearance-none h-7 px-1 text-center bg-transparent text-[9px] font-bold tracking-tighter text-white/50 cursor-pointer outline-none hover:text-accent transition-all uppercase"
            >
                <option value="">價格</option>
                <option value="0-50">50↓</option>
                <option value="50-100">50-100</option>
                <option value="100-500">100-500</option>
                <option value="500-10000">500↑</option>
            </select>
        </div>

        <div class="space-y-4 pt-2 border-t border-white/5">
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
                onminus={() => (marketStore.filterTrend = String(Math.max(-10, trendVal - 0.5)))}
            />
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
{/if}
