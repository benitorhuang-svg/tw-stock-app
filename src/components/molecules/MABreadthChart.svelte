<script lang="ts">
    /**
     * MABreadthChart.svelte - HUD Style MA Breadth Indicator (Redesigned)
     * Visualizes market health via % of stocks above MA20, MA60, MA120
     */
    interface Props {
        data: {
            aboveMA20: number;
            aboveMA60: number;
            aboveMA120: number;
            total: number;
            totalMA20?: number;
            totalMA60?: number;
            totalMA120?: number;
        };
    }

    let { data }: Props = $props();

    let t20 = $derived(data.totalMA20 || data.total || 1);
    let t60 = $derived(data.totalMA60 || data.total || 1);
    let t120 = $derived(data.totalMA120 || data.total || 1);

    let p20 = $derived((data.aboveMA20 / t20) * 100);
    let p60 = $derived((data.aboveMA60 / t60) * 100);
    let p120 = $derived((data.aboveMA120 / t120) * 100);

    function getVerdict(p: number): { text: string; color: string } {
        if (p >= 80) return { text: '強勢多頭，普漲格局', color: 'text-bullish' };
        if (p >= 60) return { text: '偏多格局，主流向上', color: 'text-bullish/80' };
        if (p >= 40) return { text: '多空均衡，盤整震盪', color: 'text-text-muted' };
        if (p >= 20) return { text: '偏空格局，弱勢整理', color: 'text-bearish/80' };
        return { text: '極度弱勢，全面破線', color: 'text-bearish' };
    }

    function getOverallVerdict(
        p20: number,
        p60: number,
        p120: number
    ): { text: string; icon: string; color: string } {
        const avg = (p20 + p60 + p120) / 3;
        if (p20 >= 60 && p60 >= 60 && p120 >= 60)
            return {
                text: '多頭排列 — 短中長期趨勢一致向上，適合偏多操作',
                icon: '🟢',
                color: 'text-bullish',
            };
        if (p20 <= 40 && p60 <= 40 && p120 <= 40)
            return {
                text: '空頭排列 — 短中長期趨勢一致向下，宜保守觀望',
                icon: '🔴',
                color: 'text-bearish',
            };
        if (p20 > p60 && p60 > p120 && avg >= 45)
            return {
                text: '底部回升 — 短線率先轉強，留意趨勢反轉訊號',
                icon: '🟡',
                color: 'text-warning',
            };
        if (p20 < p60 && p60 < p120)
            return {
                text: '高檔轉弱 — 短線先行走弱，注意風險控管',
                icon: '🟠',
                color: 'text-warning',
            };
        return {
            text: '多空交戰 — 均線訊號分歧，等待方向確認',
            icon: '⚪',
            color: 'text-text-muted',
        };
    }

    const metrics = $derived([
        {
            id: 'ma20',
            label: '站上月線',
            sublabel: '20MA / 短期趨勢',
            value: p20,
            count: data.aboveMA20,
            total: t20,
            bgClass: p20 >= 50 ? 'bg-bullish/90' : 'bg-bearish/90',
            textClass: p20 >= 50 ? 'text-bullish' : 'text-bearish',
            status: p20 >= 50 ? 'BULL' : 'BEAR',
            verdict: getVerdict(p20),
        },
        {
            id: 'ma60',
            label: '站上季線',
            sublabel: '60MA / 中期趨勢',
            value: p60,
            count: data.aboveMA60,
            total: t60,
            bgClass: p60 >= 50 ? 'bg-bullish/90' : 'bg-bearish/90',
            textClass: p60 >= 50 ? 'text-bullish' : 'text-bearish',
            status: p60 >= 50 ? 'BULL' : 'BEAR',
            verdict: getVerdict(p60),
        },
        {
            id: 'ma120',
            label: '站上半年線',
            sublabel: '120MA / 長期趨勢',
            value: p120,
            count: data.aboveMA120,
            total: t120,
            bgClass: p120 >= 50 ? 'bg-bullish/90' : 'bg-bearish/90',
            textClass: p120 >= 50 ? 'text-bullish' : 'text-bearish',
            status: p120 >= 50 ? 'BULL' : 'BEAR',
            verdict: getVerdict(p120),
        },
    ]);

    const overall = $derived(getOverallVerdict(p20, p60, p120));
</script>

<div class="w-full h-full flex flex-col justify-center py-1 px-1 gap-3">
    {#each metrics as m}
        <div class="flex flex-col gap-1 group w-full">
            <!-- Header Row -->
            <div class="flex items-end justify-between px-1">
                <div class="flex flex-col gap-0.5">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[13px] font-bold text-text-primary tracking-wide">
                            {m.label}
                        </span>
                        <div
                            class="px-1 py-[0.5px] rounded bg-surface border border-border text-[8px] font-black uppercase font-mono tracking-wider {m.textClass}"
                        >
                            {m.status}
                        </div>
                    </div>
                    <span class="text-[9px] font-mono text-text-muted/60 uppercase tracking-wider"
                        >{m.sublabel}</span
                    >
                </div>
                <div class="flex items-baseline gap-1">
                    <span
                        class="text-2xl font-black font-mono tracking-tighter {m.textClass} drop-shadow-sm leading-none"
                        style="text-shadow: 0 0 10px var(--color-{m.status === 'BULL'
                            ? 'bullish'
                            : 'bearish'}-glow, transparent)"
                    >
                        {m.value.toFixed(1)}
                    </span>
                    <span class="text-[10px] font-mono font-bold text-text-muted/50 leading-none"
                        >%</span
                    >
                </div>
            </div>

            <!-- Progress Track -->
            <div
                class="h-2 w-full bg-surface-hover/80 rounded-sm overflow-hidden border border-border/80 relative flex items-center shadow-inner"
            >
                <!-- 50% Marker Line -->
                <div class="absolute top-0 bottom-0 left-[50%] w-[1px] bg-text-muted/30 z-0"></div>

                <div
                    class="h-full z-10 {m.bgClass} transition-all duration-[1200ms] ease-out relative rounded-r-sm"
                    style="width: {m.value}%"
                >
                    <!-- Highlight Shimmer -->
                    <div
                        class="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"
                    ></div>
                </div>
            </div>

            <!-- Verdict & Count -->
            <div class="flex items-center justify-between px-1">
                <span class="text-[9px] font-mono {m.verdict.color} tracking-wide"
                    >{m.verdict.text}</span
                >
                <span class="text-[8px] font-mono text-text-muted/40">{m.count} / {m.total}</span>
            </div>
        </div>
    {/each}

    <!-- Overall Verdict -->
    <div class="mt-0.5 px-3 py-1.5 rounded-lg bg-surface/40 border border-border/30">
        <div class="flex items-center gap-2">
            <span class="text-xs">{overall.icon}</span>
            <span class="text-[10px] font-bold {overall.color} tracking-wide leading-tight"
                >{overall.text}</span
            >
        </div>
    </div>
</div>
