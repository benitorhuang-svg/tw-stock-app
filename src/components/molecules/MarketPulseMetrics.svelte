<script lang="ts">
    import SentimentBar from './SentimentBar.svelte';
    import { fmtVol } from '../../utils/format';

    interface Props {
        totalVolume: number;
        avgChange: number;
        upCount: number;
        downCount: number;
        flatCount: number;
        ratio: string;
    }

    let { totalVolume, avgChange, upCount, downCount, flatCount, ratio }: Props = $props();

    let avgChangeTrend = $derived((avgChange || 0) >= 0 ? 'bullish' : 'bearish');
    let avgChangeFormatted = $derived(
        ((avgChange || 0) >= 0 ? '+' : '') + (avgChange || 0).toFixed(2) + '%'
    );
</script>

<div
    class="flex flex-col h-full bg-surface-hover/20 rounded-xl p-5 border border-border/20 shadow-sm relative overflow-hidden"
>
    <div class="flex flex-col gap-6 flex-1 justify-center relative z-10">
        <!-- Main Stats -->
        <div class="grid grid-cols-1 gap-6">
            <div class="flex flex-col gap-1.5">
                <span
                    class="text-[10px] font-mono font-black text-text-muted/50 uppercase tracking-[0.25em]"
                    >成交量 ( VOLUME )</span
                >
                <span
                    class="text-2xl font-black text-text-primary tracking-tight font-mono drop-shadow-sm"
                >
                    {fmtVol(totalVolume)}
                </span>
            </div>

            <div class="flex flex-col gap-1.5">
                <span
                    class="text-[10px] font-mono font-black text-text-muted/50 uppercase tracking-[0.25em]"
                    >平均漲跌 ( AVG CHG )</span
                >
                <span
                    class="text-2xl font-black tracking-tight font-mono drop-shadow-sm {avgChangeTrend ===
                    'bullish'
                        ? 'text-bullish'
                        : 'text-bearish'}"
                >
                    {avgChangeFormatted}
                </span>
            </div>
        </div>

        <!-- Sentiment -->
        <div class="flex flex-col gap-3 mt-auto">
            <SentimentBar up={upCount} down={downCount} flat={flatCount} {ratio} />
        </div>
    </div>
</div>
