<script lang="ts">
    import { marketStore } from '../../stores/market.svelte';
    import { SECTOR_OPTIONS } from '../../lib/filters/sector-filter';
    import CyberRangeSlider from '../atoms/CyberRangeSlider.svelte';
    import CyberSelect from '../atoms/CyberSelect.svelte';

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
                <CyberSelect
                    bind:value={marketStore.filterMarket}
                    options={[
                        { value: 'tse', label: '上市' },
                        { value: 'otc', label: '上櫃' },
                    ]}
                    placeholder="全部市場"
                />
                <div class="w-px h-3 bg-border shrink-0"></div>
                <CyberSelect
                    bind:value={marketStore.filterSector}
                    options={SECTOR_OPTIONS}
                    placeholder="所有產業"
                />
                <div class="w-px h-3 bg-border shrink-0"></div>
                <CyberSelect
                    bind:value={marketStore.filterPriceRange}
                    options={[
                        { value: '0-50', label: '50↓' },
                        { value: '50-100', label: '50-100' },
                        { value: '100-500', label: '100-500' },
                        { value: '500-10000', label: '500↑' },
                    ]}
                    placeholder="價格區間"
                />
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
                                : String(marketStore.filterMinVol)
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
            class="flex items-center gap-2 px-4 py-2 rounded-full border border-border/20 bg-surface-hover/20 hover:bg-surface-hover/40 text-[10px] font-black text-text-muted hover:text-text-primary transition-all uppercase tracking-[0.2em] active:scale-95 whitespace-nowrap"
            >RESET</button
        >
    </div>
{:else}
    <!-- VERTICAL SIDEBAR LAYOUT -->
    <div class="w-full flex flex-col gap-4 p-4 border-b border-border/10 bg-surface-hover/5">
        <div class="flex items-center justify-between mb-1">
            <span class="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]"
                >戰略篩選 ( FILTERS )</span
            >
            <button
                onclick={resetFilters}
                class="text-[9px] font-mono text-accent hover:text-accent-dim transition-colors uppercase tracking-widest"
                >RESET</button
            >
        </div>

        <div
            class="flex items-center gap-0.5 px-0.5 py-0.5 bg-surface-hover/10 rounded-lg border border-border/10 h-9 shrink-0"
        >
            <CyberSelect
                bind:value={marketStore.filterMarket}
                options={[
                    { value: 'tse', label: '上市' },
                    { value: 'otc', label: '上櫃' },
                ]}
                placeholder="市場"
            />
            <div class="w-px h-3 bg-border/20 shrink-0"></div>
            <CyberSelect
                bind:value={marketStore.filterSector}
                options={SECTOR_OPTIONS}
                placeholder="產業"
            />
            <div class="w-px h-3 bg-border/20 shrink-0"></div>
            <CyberSelect
                bind:value={marketStore.filterPriceRange}
                options={[
                    { value: '0-50', label: '50↓' },
                    { value: '50-100', label: '50-100' },
                    { value: '100-500', label: '100-500' },
                    { value: '500-10000', label: '500↑' },
                ]}
                placeholder="價格"
            />
        </div>

        <div class="space-y-4 pt-2 border-t border-border/10">
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
                        : String(marketStore.filterMinVol)
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
