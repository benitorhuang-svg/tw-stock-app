<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { getChartColors, onThemeChange } from '../../utils/chart-theme';

    /**
     * PriceVolumeScatter.svelte - Dynamic Scatter Matrix
     * X = Volume (Log scale or Normalized), Y = Change %
     */
    interface Props {
        stocks: any[]; // { symbol, volume, changePercent }
    }

    let { stocks }: Props = $props();

    let chartContainer: HTMLDivElement | null = null;
    let chart: any = $state(null);
    let ro: ResizeObserver | null = null;
    let fixedMaxVolume: number = $state(0);

    // ─── Derived: Prepared scatter data (reactive atom) ──
    const scatterData = $derived.by(() => {
        if (!stocks || !stocks.length) return [];
        return stocks
            .filter(s => s.volume > 0)
            .map(s => [s.volume, s.changePercent, s.symbol, s.name || s.symbol]);
    });

    // ─── Reactive: Push data to ECharts on every change ──
    const FIXED_MAX_VOLUME = 10_000_000; // 固定成交量上限 (張)

    $effect(() => {
        const data = scatterData;
        const len = data.length;
        if (!chart || len === 0) return;

        chart.setOption({
            xAxis: { max: FIXED_MAX_VOLUME },
            series: [{ data }],
        });
    });

    async function initChart() {
        if (!chartContainer) return;

        try {
            const echarts = (window as any).echarts;
            if (!echarts) {
                setTimeout(initChart, 50);
                return;
            }

            if (chart) chart.dispose();
            chart = echarts.init(chartContainer);

            const tc = getChartColors();

            const option = {
                grid: { top: 40, right: 40, bottom: 40, left: 60 },
                tooltip: {
                    trigger: 'item',
                    backgroundColor: tc.tooltipBg,
                    borderColor: tc.tooltipBorder,
                    formatter: (params: any) => {
                        const [vol, chg, sym, name] = params.data;
                        return `
                            <div style="font-family: monospace; font-size: 11px; color: ${tc.tooltipText}">
                                <b>${name} (${sym})</b><br/>
                                <hr style="opacity:0.1; margin: 4px 0;"/>
                                漲跌幅: <span style="color:${chg >= 0 ? '#ff4d4d' : '#00e676'}">${chg.toFixed(2)}%</span><br/>
                                成交量: ${vol.toLocaleString()}
                            </div>
                        `;
                    },
                },
                xAxis: {
                    name: '成交量',
                    type: 'log',
                    nameLocation: 'middle',
                    nameGap: 25,
                    splitLine: { lineStyle: { color: tc.splitLine } },
                    axisLabel: { color: tc.axisLabel, fontSize: 9 },
                    axisLine: { lineStyle: { color: tc.axisLine } },
                },
                yAxis: {
                    name: '漲跌幅 (%)',
                    type: 'value',
                    splitLine: { lineStyle: { color: tc.splitLine } },
                    axisLabel: { color: tc.axisLabel, fontSize: 9 },
                    axisLine: { lineStyle: { color: tc.axisLine } },
                    markLine: {
                        data: [{ yAxis: 0 }],
                        lineStyle: { color: tc.markLine, type: 'dashed' },
                    },
                },
                dataZoom: [
                    {
                        type: 'inside',
                        xAxisIndex: 0,
                        filterMode: 'filter',
                    },
                    {
                        type: 'inside',
                        yAxisIndex: 0,
                        filterMode: 'filter',
                    },
                ],
                series: [
                    {
                        type: 'scatter',
                        symbolSize: (data: any) => {
                            // Dynamic size based on volume magnitude
                            const vol = data[0] || 1;
                            return Math.max(4, Math.min(25, Math.log10(vol) * 2.5));
                        },
                        itemStyle: {
                            color: (params: any) => {
                                const chg = params.data[1];
                                return chg >= 0
                                    ? 'rgba(239, 68, 68, 0.6)'
                                    : 'rgba(34, 197, 94, 0.6)';
                            },
                        },
                        data: [],
                    },
                ],
            };

            chart.setOption(option);

            ro = new ResizeObserver(() => {
                if (chart) chart.resize();
            });
            ro.observe(chartContainer);
        } catch (e) {
            console.error('Scatter plot init error:', e);
        }
    }

    let unsubTheme: (() => void) | null = null;

    onMount(() => {
        initChart();
        unsubTheme = onThemeChange(() => {
            if (chart) chart.dispose();
            chart = null;
            initChart();
        });
    });

    onDestroy(() => {
        if (chart) chart.dispose();
        if (ro) ro.disconnect();
        if (unsubTheme) unsubTheme();
    });
</script>

<div bind:this={chartContainer} class="w-full h-full min-h-[320px]"></div>
