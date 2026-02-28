<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { getChartColors, onThemeChange } from '../../utils/chart-theme';

    /**
     * MABreadthChart.svelte - Visualizes market health via MA alignment
     * Shows % of stocks above major moving averages (MA20, MA60, MA120)
     */
    interface Props {
        data: {
            aboveMA20: number;
            aboveMA60: number;
            aboveMA120: number;
            total: number;
        };
    }

    let { data }: Props = $props();

    let chartContainer: HTMLDivElement | null = null;
    let chart: any = null;
    let ro: ResizeObserver | null = null;

    $effect(() => {
        // Explicitly read all data fields for Svelte 5 dependency tracking
        const _ = data && [data.aboveMA20, data.aboveMA60, data.aboveMA120, data.total];
        if (chart && data) {
            updateChart();
        }
    });

    function updateChart() {
        if (!chart) return;

        const p20 = (data.aboveMA20 / (data.total || 1)) * 100;
        const p60 = (data.aboveMA60 / (data.total || 1)) * 100;
        const p120 = (data.aboveMA120 / (data.total || 1)) * 100;

        chart.setOption({
            series: [
                {
                    data: [
                        { value: p20.toFixed(1), name: '站上月線 (20MA)' },
                        { value: p60.toFixed(1), name: '站上週線 (5MA)' },
                        { value: p120.toFixed(1), name: '站上半年線 (120MA)' },
                    ],
                },
            ],
        });
    }

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
                tooltip: {
                    formatter: '{b}: {c}%',
                },
                radar: {
                    indicator: [
                        { name: '月線 (20MA)', max: 100 },
                        { name: '週線 (5MA)', max: 100 },
                        { name: '半年線 (120MA)', max: 100 },
                    ],
                    splitArea: { show: false },
                    axisLine: { lineStyle: { color: tc.axisLine } },
                    splitLine: { lineStyle: { color: tc.splitLine } },
                },
                series: [
                    {
                        name: 'MA Breadth',
                        type: 'radar',
                        symbol: 'none',
                        areaStyle: {
                            color: 'rgba(99, 102, 241, 0.2)',
                        },
                        lineStyle: {
                            width: 2,
                            color: '#6366f1', // Indigo
                        },
                        data: [],
                    },
                ],
            };

            // Alternative: use a Bar chart if Radar is too complex for 3 points
            const barOption = {
                grid: { top: 20, right: 50, bottom: 20, left: 130 },
                xAxis: {
                    type: 'value',
                    max: 100,
                    axisLabel: { show: false },
                    splitLine: { show: false },
                },
                yAxis: {
                    type: 'category',
                    data: ['站上月線 (20MA)', '站上週線 (5MA)', '站上半年線 (120MA)'],
                    axisLabel: {
                        color: tc.labelTextMuted,
                        fontSize: 12,
                        fontWeight: 'bold',
                        fontFamily: 'system-ui',
                    },
                    axisLine: { show: false },
                    axisTick: { show: false },
                },
                series: [
                    {
                        type: 'bar',
                        data: [],
                        barWidth: '50%',
                        itemStyle: {
                            color: (params: any) => {
                                const gradients = [
                                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                                        { offset: 0, color: '#f43f5e' },
                                        { offset: 1, color: '#fb7185' },
                                    ]),
                                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                                        { offset: 0, color: '#ef4444' },
                                        { offset: 1, color: '#f87171' },
                                    ]),
                                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                                        { offset: 0, color: '#dc2626' },
                                        { offset: 1, color: '#ef4444' },
                                    ]),
                                ];
                                return gradients[params.dataIndex];
                            },
                            borderRadius: [0, 6, 6, 0],
                        },
                        label: {
                            show: true,
                            position: 'right',
                            formatter: '{c}%',
                            color: tc.labelText,
                            fontSize: 13,
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            distance: 10,
                        },
                        showBackground: true,
                        backgroundStyle: {
                            color: tc.bgSubtle,
                            borderRadius: [0, 6, 6, 0],
                        },
                    },
                ],
            };

            chart.setOption(barOption);
            updateChart();

            ro = new ResizeObserver(() => {
                if (chart) chart.resize();
            });
            ro.observe(chartContainer);
        } catch (e) {
            console.error('MA Breadth init error:', e);
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

<div bind:this={chartContainer} class="w-full h-full min-h-[400px]"></div>
