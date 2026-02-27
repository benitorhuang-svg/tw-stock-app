<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

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
    }

    let { distribution }: Props = $props();

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

    // Reactive effect to update chart when distribution changes
    $effect(() => {
        if (chart && distribution) {
            updateChart();
        }
    });

    function updateChart() {
        if (!chart) return;

        const data = [
            distribution.m9,
            distribution.m6_9,
            distribution.m3_6,
            distribution.m0_3,
            distribution.zero,
            distribution.p0_3,
            distribution.p3_6,
            distribution.p6_9,
            distribution.p9,
        ];

        chart.setOption({
            series: [
                {
                    data: data.map((val, i) => ({
                        value: val,
                        itemStyle: { color: colors[i] },
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

            const option = {
                grid: { top: 10, right: 10, bottom: 25, left: 35 },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    backgroundColor: 'rgba(15,23,42,0.9)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    textStyle: { color: '#fff', fontSize: 10, fontFamily: 'monospace' },
                },
                xAxis: {
                    type: 'category',
                    data: labels,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 8,
                        interval: 0,
                    },
                },
                yAxis: {
                    type: 'value',
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                    axisLabel: {
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 8,
                    },
                },
                series: [
                    {
                        data: initialData.map((val, i) => ({
                            value: val,
                            itemStyle: { color: colors[i] },
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

            ro = new ResizeObserver(() => {
                if (chart) chart.resize();
            });
            ro.observe(chartContainer);
        } catch (e) {
            console.error('Failed to init distribution chart:', e);
        }
    }

    onMount(() => {
        initChart();
    });

    onDestroy(() => {
        if (chart) chart.dispose();
        if (ro) ro.disconnect();
    });
</script>

<div class="flex flex-col gap-2 h-full">
    <span class="text-[8px] text-white/20 uppercase font-mono tracking-widest font-bold">
        個股漲跌家數分佈 <span class="text-white/10 ml-1">/ DISTRIBUTION</span>
    </span>
    <div
        class="flex-1 w-full min-h-[120px] relative rounded-xl overflow-hidden"
        bind:this={chartContainer}
    >
        <!-- ECharts Injected Here -->
    </div>
</div>
