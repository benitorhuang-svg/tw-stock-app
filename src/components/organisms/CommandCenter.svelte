<script lang="ts">
    import { onMount } from 'svelte';
    import SearchInput from '../atoms/filter/SearchInput.svelte';
    import FilterSelect from '../atoms/filter/FilterSelect.svelte';
    import FilterSlider from '../atoms/filter/FilterSlider.svelte';
    import PollingButton from '../atoms/filter/PollingButton.svelte';
    import MarketBreadth from '../molecules/MarketBreadth.svelte';

    // --- State Management ---
    let search = $state('');
    let market = $state('');
    let sector = $state('');
    let price = $state('');
    let trend = $state(0);
    let volume = $state(0);
    let ma20 = $state(0);

    let up = $state(0),
        down = $state(0),
        flat = $state(0),
        total = $state(0);
    let isPolling = $state(false);
    let updateTime = $state('--:--:--');

    const markets = [
        { value: 'tse', label: '上市' },
        { value: 'otc', label: '上櫃' },
    ];
    const sectors = [
        { value: 'semiconductor', label: '半導體' },
        { value: 'electronics', label: '電子' },
        { value: 'computer', label: '電腦' },
        { value: 'finance', label: '金融' },
        { value: 'shipping', label: '航運' },
        { value: 'etf', label: 'ETF' },
    ];
    const prices = [
        { value: '0-50', label: '50以下' },
        { value: '50-100', label: '50-100' },
        { value: '100-500', label: '100-500' },
        { value: '500-10000', label: '500以上' },
    ];

    let notifyTimeout: any;
    function notify() {
        if (notifyTimeout) clearTimeout(notifyTimeout);
        notifyTimeout = setTimeout(() => {
            const detail = { search, market, sector, price, trend, volume, ma20: String(ma20) };
            window.dispatchEvent(
                new CustomEvent('tw-live-update', {
                    detail: { type: 'FILTERS', payload: detail },
                })
            );
        }, 80);
    }

    function reset() {
        search = '';
        market = '';
        sector = '';
        price = '';
        trend = 0;
        volume = 0;
        ma20 = 0;
        notify();
    }

    onMount(() => {
        const handler = (e: any) => {
            const { type, payload } = e.detail;
            if (type === 'DATA' && payload.data) {
                const data = payload.data;
                let u = 0,
                    d = 0,
                    f = 0;
                for (let i = 0; i < data.length; i++) {
                    const chg = data[i]._change;
                    if (chg > 0) u++;
                    else if (chg < 0) d++;
                    else f++;
                }
                up = u;
                down = d;
                flat = f;
                total = u + d + f;
                updateTime = new Date().toLocaleTimeString('zh-TW', { hour12: false });
            } else if (type === 'POLLING') {
                isPolling = payload.active;
            }
        };
        window.addEventListener('tw-live-update', handler);
        return () => window.removeEventListener('tw-live-update', handler);
    });
</script>

<div
    class="command-center-organism flex items-center justify-between w-full h-12 px-3 bg-surface border-b border-border shadow-md backdrop-blur-2xl z-50 overflow-x-auto custom-scrollbar"
    class:polling={isPolling}
>
    <!-- Atomic Indicator Shell -->
    <span id="live-indicator" class="hidden"></span>

    <!-- Left: Tactical Segment -->
    <div class="flex items-center gap-2 shrink-0">
        <SearchInput id="nexus-search-atom" bind:value={search} on:input={notify} />

        <div
            class="flex items-center gap-1 px-1.5 py-0.5 bg-glass rounded-full border border-border/60"
        >
            <FilterSelect
                id="hx-market"
                label="市場"
                options={markets}
                bind:value={market}
                on:change={notify}
                width="min-w-[55px]"
            />
            <div class="vx-divider"></div>
            <FilterSelect
                id="hx-sector"
                label="產業"
                options={sectors}
                bind:value={sector}
                on:change={notify}
                width="min-w-[65px]"
            />
            <div class="vx-divider"></div>
            <FilterSelect
                id="hx-price"
                label="價格"
                options={prices}
                bind:value={price}
                on:change={notify}
                width="min-w-[60px]"
            />
        </div>

        <div class="flex items-center gap-1.5">
            <FilterSlider id="hx-trend" label="Pct" bind:value={trend} on:change={notify} />
            <div class="w-px h-3 bg-white/5"></div>
            <FilterSlider
                id="hx-ma20"
                label="MA20"
                isMA20={true}
                bind:value={ma20}
                on:change={notify}
            />
            <div class="w-px h-3 bg-white/5"></div>
            <FilterSlider
                id="hx-vol"
                label="Vol"
                min={0}
                max={1000000}
                step={5000}
                unit=""
                bind:value={volume}
                on:change={notify}
            />
        </div>
        <button
            onclick={reset}
            class="flex items-center justify-center w-8 h-8 text-text-muted/30 hover:text-accent hover:bg-accent/5 rounded-full transition-all active:scale-90"
            title="Reset Filters"
        >
            <svg
                class="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
            >
                <path
                    d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
                ></path>
            </svg>
        </button>
    </div>

    <!-- Right: Telemetry & Control Segment -->
    <div class="flex items-center gap-4 shrink-0">
        <!-- System Vitals -->
        <div class="flex items-center gap-3 border-r border-border/20 pr-4">
            <div class="flex flex-col items-end shrink-0">
                <div
                    class="flex items-center gap-1.5 font-mono text-[9px] font-black tracking-tighter"
                >
                    <span class="opacity-20 uppercase">Last_Uplink:</span>
                    <span id="last-update-time" class="text-accent min-w-[50px] text-right"
                        >{updateTime}</span
                    >
                </div>
                <div class="flex items-center gap-1.5 mt-0.5">
                    <div
                        class="w-1 h-1 rounded-full {isPolling
                            ? 'bg-accent animate-pulse shadow-[0_0_5px_var(--color-accent)]'
                            : 'bg-white/10'}"
                    ></div>
                    <span class="text-[7px] font-mono text-text-muted/40 uppercase tracking-[0.2em]"
                        >{isPolling ? 'Active_Tele' : 'Idle_System'}</span
                    >
                </div>
            </div>

            <div class="w-36">
                <MarketBreadth {up} {down} {flat} {total} />
            </div>
        </div>

        <!-- Connection Reactor -->
        <PollingButton active={isPolling} />
    </div>
</div>

<style>
    .vx-divider {
        width: 1px;
        height: 10px;
        background-color: var(--color-border);
        opacity: 0.2;
        flex-shrink: 0;
    }
    .command-center-organism.polling {
        background-color: var(--color-surface);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
</style>
