<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { getChartColors, onThemeChange } from '../../utils/chart-theme';

    /**
     * MarketBreadthChart.svelte - Organism for the ECharts Breadth visualization
     * Part of Atomic Design: Organisms
     */
    interface Props {
        initialData: any[];
        onDateSelect: (date: string) => void;
    }

    let { initialData = [], onDateSelect }: Props = $props();

    let chartContainer: HTMLDivElement | null = null;
    let chart: any = null;
    let ro: ResizeObserver | null = null;
    let echartsLabels: string[] = [];
    let resizeRaf: number | null = null;

    // Reactive effect to wait for data and re-init/update
    $effect(() => {
        if (initialData && initialData.length > 0) {
            if (chart) {
                // If already initialized, we could call setOption,
                // but initChart handles the full logic safer for now
                initChart(initialData);
            } else {
                initChart(initialData);
            }
        }
    });

    export function focusOnDate(dateStr: string) {
        if (!chart || echartsLabels.length === 0) return;
        const index = echartsLabels.indexOf(dateStr);
        if (index !== -1) {
            const totalPoints = echartsLabels.length;
            const startIdx = Math.max(0, index - 55);
            const endIdx = Math.min(totalPoints - 1, index + 5);
            const startPct = (startIdx / totalPoints) * 100;
            const endPct = (endIdx / totalPoints) * 100;

            chart.dispatchAction({
                type: 'dataZoom',
                start: startPct,
                end: endPct,
            });

            setTimeout(() => {
                chart.dispatchAction({
                    type: 'showTip',
                    seriesIndex: 0,
                    dataIndex: index,
                });
            }, 50);
        }
    }

    export function resetZoom() {
        if (chart && echartsLabels.length > 0) {
            const totalPoints = Math.max(1, echartsLabels.length);
            const defaultStart = Math.max(0, 100 - (30 / totalPoints) * 100);
            chart.dispatchAction({
                type: 'dataZoom',
                start: defaultStart,
                end: 100,
            });

            const latestDate = echartsLabels[echartsLabels.length - 1];
            if (latestDate) onDateSelect(latestDate);
        }
    }

    async function initChart(data: any[]) {
        if (!chartContainer || !data || data.length === 0) {
            if (chart) {
                chart.clear();
            }
            return;
        }

        try {
            const echarts = (window as any).echarts;
            if (!echarts) {
                setTimeout(() => initChart(data), 100);
                return;
            }

            if (chart) chart.dispose();

            // Check container visibility/size
            if (chartContainer.clientWidth === 0 || chartContainer.clientHeight === 0) {
                setTimeout(() => initChart(data), 100);
                return;
            }

            chart = echarts.init(chartContainer);

            const labels = data.map((d: any) => d.date);
            echartsLabels = labels;

            const ratios = data.map((d: any) =>
                d.down > 0 ? Number((d.up / d.down).toFixed(2)) : 1
            );

            const trins = data.map((d: any) => {
                // Use pre-computed TRIN from API when available; otherwise fallback to client-side calculation
                if (d.trin != null && !isNaN(d.trin)) return Number(d.trin);
                const issuesRatio = (d.up || 0.1) / (d.down || 0.1);
                const upVol = d.upTurnover || d.upVolume || 0.1;
                const dnVol = d.downTurnover || d.downVolume || 0.1;
                const turnoverRatio = upVol / dnVol;
                const val = issuesRatio / turnoverRatio;
                return Number(Math.min(Math.max(val, 0.1), 8).toFixed(3));
            });

            const totalPoints = data.length;
            // Calculate starting percentage for last 20 days
            const defaultStart = totalPoints > 20 ? ((totalPoints - 20) / totalPoints) * 100 : 0;

            const tc = getChartColors();

            const option = {
                grid: { top: 30, right: 30, bottom: 20, left: 30, containLabel: false },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'line', lineStyle: { color: tc.markLine } },
                    backgroundColor: tc.tooltipBg,
                    borderColor: tc.tooltipBorder,
                    textStyle: { color: tc.tooltipText, fontSize: 10, fontFamily: 'monospace' },
                    formatter: (params: any) => {
                        if (!params || !params.length) return '';
                        const date = params[0].axisValue;
                        let html = `<div style="font-weight:bold;margin-bottom:4px">${date}</div>`;
                        for (const p of params) {
                            html += `<div>${p.marker} ${p.seriesName}: <b>${p.value}</b>`;
                            if (p.seriesName.includes('TRIN')) {
                                const v = p.value;
                                const verdict =
                                    v < 0.8
                                        ? '強勢買盤'
                                        : v < 1.0
                                          ? '偏多'
                                          : v < 1.2
                                            ? '中性'
                                            : v < 1.5
                                              ? '偏空'
                                              : '恐慌賣壓';
                                html += ` <span style="opacity:0.7">(${verdict})</span>`;
                            } else if (p.seriesName.includes('多空比')) {
                                const v = p.value;
                                const verdict =
                                    v >= 2
                                        ? '強勢多頭'
                                        : v >= 1.2
                                          ? '偏多'
                                          : v >= 0.8
                                            ? '均衡'
                                            : v >= 0.5
                                              ? '偏空'
                                              : '全面弱勢';
                                html += ` <span style="opacity:0.7">(${verdict})</span>`;
                            }
                            html += `</div>`;
                        }
                        return html;
                    },
                },
                legend: {
                    data: ['多空比 (Breadth)', 'TRIN (Arms Index)'],
                    textStyle: { color: tc.legendText, fontSize: 10 },
                    top: 0,
                },
                xAxis: {
                    type: 'category',
                    data: labels,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: tc.legendText,
                        fontSize: 9,
                        fontFamily: 'monospace',
                    },
                },
                yAxis: [
                    {
                        type: 'value',
                        name: '多空比',
                        nameTextStyle: { color: tc.legendText, fontSize: 10 },
                        splitLine: {
                            lineStyle: { color: tc.splitLine, type: 'solid' },
                        },
                        axisLabel: {
                            color: tc.legendText,
                            fontSize: 9,
                            fontFamily: 'monospace',
                        },
                        min: 0,
                        max: 8, // Standardize breadth scale
                    },
                    {
                        type: 'value',
                        name: 'TRIN',
                        nameTextStyle: { color: '#f59e0b', fontSize: 10 },
                        splitLine: { show: false },
                        axisLine: { show: false },
                        axisLabel: {
                            color: '#f59e0b',
                            fontSize: 9,
                            fontFamily: 'monospace',
                        },
                        min: 0,
                        max: 4, // Normalized TRIN scale (0-4 is common)
                    },
                ],
                visualMap: {
                    show: false,
                    seriesIndex: 0, // Apply only to breadth
                    dimension: 1,
                    pieces: [
                        { max: 0.999, color: 'rgba(34, 197, 94, 0.9)' },
                        { min: 1, color: 'rgba(239, 68, 68, 0.9)' },
                    ],
                },
                dataZoom: [
                    {
                        type: 'inside',
                        start: defaultStart,
                        end: 100,
                        zoomOnMouseWheel: true,
                        moveOnMouseMove: true,
                    },
                ],
                series: [
                    {
                        name: '多空比 (Breadth)',
                        data: ratios,
                        type: 'line',
                        yAxisIndex: 0,
                        smooth: 0.3,
                        symbol: 'none',
                        lineStyle: { width: 2.5 },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: tc.areaGradientTop },
                                { offset: 1, color: tc.areaGradientBottom },
                            ]),
                        },
                        markLine: {
                            silent: true,
                            symbol: 'none',
                            lineStyle: { color: tc.markLine, type: 'dashed', width: 1 },
                            data: [
                                {
                                    yAxis: 1,
                                    label: {
                                        show: false,
                                        formatter: '多空分界',
                                        fontSize: 9,
                                        color: tc.legendText,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        name: 'TRIN (Arms Index)',
                        data: trins,
                        type: 'line',
                        yAxisIndex: 1,
                        smooth: true,
                        showSymbol: false,
                        lineStyle: { width: 1.5, color: 'rgba(245, 158, 11, 0.6)', type: 'solid' },
                        markLine: {
                            silent: true,
                            symbol: 'none',
                            lineStyle: {
                                color: 'rgba(245, 158, 11, 0.3)',
                                type: 'dashed',
                                width: 1,
                            },
                            data: [
                                {
                                    yAxis: 1,
                                    label: {
                                        show: false,
                                        formatter: 'TRIN=1',
                                        fontSize: 9,
                                        color: tc.legendText,
                                        position: 'end',
                                    },
                                },
                            ],
                        },
                    },
                ],
            };

            chart.setOption(option);

            chart.getZr().on('click', (params: any) => {
                const pointInPixel = [params.offsetX, params.offsetY];
                if (chart.containPixel('grid', pointInPixel)) {
                    const xIndex = Math.round(
                        chart.convertFromPixel({ seriesIndex: 0 }, pointInPixel)[0]
                    );
                    const dateClicked = labels[xIndex];
                    if (dateClicked) onDateSelect(dateClicked);
                }
            });

            ro = new ResizeObserver(() => {
                if (resizeRaf) cancelAnimationFrame(resizeRaf);
                resizeRaf = requestAnimationFrame(() => {
                    if (chart) chart.resize();
                });
            });
            ro.observe(chartContainer);
        } catch (e) {
            console.error('Failed to init chart:', e);
        }
    }

    let unsubTheme: (() => void) | null = null;

    onMount(() => {
        // Delay slightly for initial mount to ensure parent layout is calculated
        setTimeout(() => {
            initChart(initialData);
        }, 150);

        unsubTheme = onThemeChange(() => {
            if (chart) chart.dispose();
            chart = null;
            initChart(initialData);
        });
    });

    onDestroy(() => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        if (chart) chart.dispose();
        if (ro) ro.disconnect();
        if (unsubTheme) unsubTheme();
    });
</script>

<div
    class="w-full h-full glass-card border-l-4 border-l-blue-500 px-4 pt-3 pb-1 relative overflow-hidden shadow-elevated flex flex-col gap-1"
>
    <div class="flex items-center justify-between">
        <h3
            class="text-[10px] font-mono font-black text-text-muted/60 uppercase tracking-[0.2em] flex items-center gap-2"
        >
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            綜合大盤量價趨勢 ( BREADTH & MOMENTUM )
        </h3>
        <button
            onclick={resetZoom}
            class="flex items-center gap-1 px-2 py-1 rounded-full border border-border bg-glass hover:bg-glass-hover text-[9px] font-black text-text-muted/60 hover:text-accent transition-all uppercase tracking-widest active:scale-95"
        >
            <svg
                class="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path
                    d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                ></path>
            </svg>
            Reset
        </button>
    </div>

    <div
        class="flex-1 w-full min-h-[140px] relative rounded-xl overflow-hidden group/chart cursor-crosshair"
        bind:this={chartContainer}
    >
        <!-- Chart Container Injected via Script -->
    </div>
</div>
