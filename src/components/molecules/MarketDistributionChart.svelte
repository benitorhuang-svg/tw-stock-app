<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { getChartColors, onThemeChange } from '../../utils/chart-theme';

    /**
     * MarketDistributionChart.svelte - Molecule for visualizing price change distribution
     * Part of Atomic Design: Molecules
     */
    interface Props {
        distribution: {
            p9: number;
            p6_9: number;
            p3_6: number;
            p0_3: number;
            zero: number;
            m0_3: number;
            m3_6: number;
            m6_9: number;
            m9: number;
        };
        activeRangeIndex?: number | null;
        onSelectRange?: (idx: number | null) => void;
    }

    let { distribution, activeRangeIndex = null, onSelectRange }: Props = $props();

    let chartContainer: HTMLDivElement | null = null;
    let chart: any = null;
    let ro: ResizeObserver | null = null;

    const labels = ['跌停', '-9~-6%', '-6~-3%', '-3~0%', '平盤', '0~3%', '3~6%', '6~9%', '漲停'];
    const colors = [
        '#22c55e', // m9 (Green in TW means Down)
        '#4ade80', // m6_9
        '#86efac', // m3_6
        '#bbf7d0', // m0_3
        '#94a3b8', // zero
        '#fecaca', // p0_3
        '#fca5a5', // p3_6
        '#f87171', // p6_9
        '#ef4444', // p9 (Red in TW means Up)
    ];

    // Reactive effect to update chart when distribution or active index changes
    $effect(() => {
        // Explicitly read all distribution fields to ensure Svelte tracks them
        const _ = distribution && [
            distribution.p9,
            distribution.p6_9,
            distribution.p3_6,
            distribution.p0_3,
            distribution.zero,
            distribution.m0_3,
            distribution.m3_6,
            distribution.m6_9,
            distribution.m9,
        ];
        const __ = activeRangeIndex;
        if (chart) {
            updateChart();
        }
    });

    function getOpacity(idx: number) {
        if (activeRangeIndex === null) return 1;
        return activeRangeIndex === idx ? 1 : 0.2;
    }

    function updateChart() {
        if (!chart) return;

        const data = [
            distribution?.m9 || 0,
            distribution?.m6_9 || 0,
            distribution?.m3_6 || 0,
            distribution?.m0_3 || 0,
            distribution?.zero || 0,
            distribution?.p0_3 || 0,
            distribution?.p3_6 || 0,
            distribution?.p6_9 || 0,
            distribution?.p9 || 0,
        ];

        chart.setOption({
            series: [
                {
                    data: data.map((val, i) => ({
                        value: val,
                        itemStyle: { color: colors[i], opacity: getOpacity(i) },
                    })),
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

            const initialData = [
                distribution?.m9 || 0,
                distribution?.m6_9 || 0,
                distribution?.m3_6 || 0,
                distribution?.m0_3 || 0,
                distribution?.zero || 0,
                distribution?.p0_3 || 0,
                distribution?.p3_6 || 0,
                distribution?.p6_9 || 0,
                distribution?.p9 || 0,
            ];

            const tc = getChartColors();

            const option = {
                grid: { top: 10, right: 10, bottom: 25, left: 35 },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    backgroundColor: tc.tooltipBg,
                    borderColor: tc.tooltipBorder,
                    textStyle: { color: tc.tooltipText, fontSize: 10, fontFamily: 'monospace' },
                },
                xAxis: {
                    type: 'category',
                    data: labels,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: tc.legendText,
                        fontSize: 8,
                        interval: 0,
                    },
                    triggerEvent: true,
                },
                yAxis: {
                    type: 'value',
                    splitLine: { lineStyle: { color: tc.splitLine } },
                    axisLabel: {
                        color: tc.legendText,
                        fontSize: 8,
                    },
                },
                series: [
                    {
                        data: initialData.map((val, i) => ({
                            value: val,
                            itemStyle: { color: colors[i], opacity: getOpacity(i) },
                        })),
                        type: 'bar',
                        barWidth: '60%',
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)',
                            },
                        },
                    },
                ],
            };

            chart.setOption(option);

            // Click handling
            chart.on('click', (params: any) => {
                let dIndex = params.dataIndex;
                if (params.componentType === 'xAxis') {
                    dIndex = labels.indexOf(params.value);
                }

                if (dIndex !== undefined && dIndex !== -1) {
                    if (activeRangeIndex === dIndex) {
                        onSelectRange?.(null); // Unselect
                    } else {
                        onSelectRange?.(dIndex);
                    }
                }
            });

            chart.getZr().on('click', (params: any) => {
                if (!params.target) {
                    const pointInPixel = [params.offsetX, params.offsetY];
                    if (chart.containPixel('grid', pointInPixel)) {
                        const pointInGrid = chart.convertFromPixel(
                            { seriesIndex: 0 },
                            pointInPixel
                        );
                        const idx = pointInGrid[0];
                        if (idx !== undefined && idx >= 0 && idx < labels.length) {
                            if (activeRangeIndex === idx) {
                                onSelectRange?.(null);
                            } else {
                                onSelectRange?.(idx);
                            }
                            return;
                        }
                    }
                    onSelectRange?.(null); // Clicked blank background outside grid bars
                }
            });

            ro = new ResizeObserver(() => {
                if (chart) chart.resize();
            });
            ro.observe(chartContainer);
        } catch (e) {
            console.error('Failed to init distribution chart:', e);
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

<div class="flex flex-col gap-2 h-full">
    <span class="text-[8px] text-text-muted/60 uppercase font-mono tracking-widest font-bold">
        個股漲跌家數分佈 ( DISTRIBUTION )
    </span>
    <div
        class="flex-1 w-full min-h-[120px] relative rounded-xl overflow-hidden"
        bind:this={chartContainer}
    >
        <!-- ECharts Injected Here -->
    </div>
</div>
