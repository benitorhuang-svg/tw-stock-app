<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { getChartColors, isDarkMode, onThemeChange } from '../../utils/chart-theme';

    /**
     * SectorTreemap.svelte — Atomic Molecule
     * Reactive Treemap for Market Sector Visualization
     *
     * Props (Atom inputs):
     *   sectors: Array<{ name, value (volume), change (avg change %), count }>
     *
     * Reactivity Strategy:
     *   Uses $derived to pre-compute ECharts-ready data from props.
     *   Uses $effect watching the derived data length + JSON signature
     *   to guarantee chart re-render on any upstream change.
     */
    interface SectorItem {
        name: string;
        value: number;
        change: number;
        count?: number;
    }

    interface Props {
        sectors: SectorItem[];
        onSelect?: (sectorName: string) => void;
    }

    let { sectors, onSelect }: Props = $props();

    let chartContainer: HTMLDivElement | null = null;
    let chart: any = $state(null);
    let ro: ResizeObserver | null = null;

    // ─── Atom: Premium Color Mapping (TW Market: Red=Up, Green=Down) ───
    function getColor(val: number): string {
        if (val >= 5) return '#ff1744'; // Extreme Surge
        if (val >= 3) return '#d50000'; // Strong Bullish
        if (val >= 1.5) return '#b71c1c'; // Bullish
        if (val >= 0.5) return '#7f1d1d'; // Mild Bullish
        if (val > -0.5) return '#1e293b'; // Neutral / Consolidation (Deep Slate)
        if (val > -1.5) return '#064e3b'; // Mild Bearish
        if (val > -3) return '#14532d'; // Bearish
        if (val > -5) return '#166534'; // Strong Bearish
        return '#00c853'; // Extreme Plummet
    }

    // ─── Atom: Volume Formatter ──────────────────────────
    function fmtVol(v: number): string {
        if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
        if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
        return String(v);
    }

    // ─── Derived: Prepared chart data (reactive atom) ────
    const chartData = $derived.by(() => {
        if (!sectors || !sectors.length) return [];
        return sectors
            .filter(s => s.value > 0 && s.name)
            .map(s => {
                // Determine if block is too small for full label
                // ECharts treemap value is used for sizing
                const isSmall = s.value < 100000;

                return {
                    name: s.name,
                    value: s.value,
                    _change: s.change,
                    _count: s.count || 0,
                    itemStyle: {
                        color: getColor(s.change),
                        borderColor: isDarkMode() ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
                        borderWidth: 1,
                    },
                    label: {
                        show: true,
                        formatter: isSmall
                            ? '{b}'
                            : `{b}\n{custom|${s.change > 0 ? '+' : ''}${s.change.toFixed(2)}%}`,
                        rich: {
                            custom: {
                                color: isDarkMode() ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                                fontSize: 10,
                                fontWeight: 'bold',
                                lineHeight: 18,
                            },
                        },
                    },
                };
            });
    });

    // ─── Reactive: Push data to ECharts on every change ──
    $effect(() => {
        // Read chartData deeply to establish Svelte dependency tracking
        const data = chartData;
        const len = data.length;

        if (!chart || len === 0) return;

        // Force ECharts to completely replace the series (treemap needs this)
        chart.setOption(
            {
                series: [
                    {
                        type: 'treemap',
                        width: '100%',
                        height: '100%',
                        roam: false,
                        nodeClick: false,
                        breadcrumb: { show: false },
                        label: {
                            show: true,
                            position: 'inside',
                            fontSize: 12,
                            fontFamily: 'monospace',
                            color: '#fff',
                        },
                        itemStyle: { gapWidth: 2 },
                        data: data,
                    },
                ],
            },
            { replaceMerge: ['series'] }
        );
    });

    // ─── Lifecycle: Initialize ECharts instance ──────────
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

            // Minimal skeleton — actual data is pushed by the $effect
            chart.setOption({
                tooltip: {
                    formatter: (info: any) => {
                        const change = info.data?._change ?? 0;
                        const count = info.data?._count ?? '-';
                        return `
                            <div style="font-family: monospace; font-size: 11px; color: ${tc.tooltipText}">
                                <b>${info.name}</b><br/>
                                <hr style="opacity:0.1; margin: 4px 0;"/>
                                平均漲跌: <span style="color:${change >= 0 ? '#ff4d4d' : '#00e676'}">${change.toFixed(2)}%</span><br/>
                                總成交量: ${fmtVol(info.value)}<br/>
                                個股數量: ${count}
                            </div>
                        `;
                    },
                    backgroundColor: tc.tooltipBg,
                    borderColor: tc.tooltipBorder,
                    textStyle: { color: tc.tooltipText },
                },
                series: [
                    {
                        type: 'treemap',
                        width: '100%',
                        height: '100%',
                        roam: false,
                        nodeClick: false,
                        breadcrumb: { show: false },
                        label: {
                            show: true,
                            position: 'inside',
                            fontSize: 12,
                            fontFamily: 'monospace',
                            color: '#fff',
                        },
                        itemStyle: { gapWidth: 2 },
                        data: [],
                    },
                ],
            });

            ro = new ResizeObserver(() => {
                if (chart) chart.resize();
            });
            ro.observe(chartContainer);

            // Click handler for sector selection
            chart.on('click', (params: any) => {
                if (params.name && onSelect) {
                    onSelect(params.name);
                }
            });
            // Pointer cursor on hover
            chart.getZr().on('mousemove', () => {
                if (chartContainer) chartContainer.style.cursor = 'pointer';
            });
        } catch (e) {
            console.error('Treemap init error:', e);
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

<div bind:this={chartContainer} class="w-full h-full"></div>
