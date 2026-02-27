<script lang="ts">
    /**
     * SentimentBar.svelte - Molecule for Market Breadth / Sentiment visualization
     * Part of Atomic Design: Molecules
     */
    interface Props {
        up: number;
        down: number;
        flat: number;
        ratio: string;
    }

    let { up, down, flat, ratio }: Props = $props();

    let total = $derived(up + down + flat);
    let barUp = $derived(total > 0 ? (up / total) * 100 : 0);
    let barDown = $derived(total > 0 ? (down / total) * 100 : 0);
    let barFlat = $derived(total > 0 ? (flat / total) * 100 : 0);

    let ratioColor = $derived(
        parseFloat(ratio) > 1
            ? 'text-bullish'
            : parseFloat(ratio) < 1 && ratio !== 'MAX'
              ? 'text-bearish'
              : 'text-white'
    );
</script>

<div class="flex flex-col gap-1.5">
    <span class="text-[8px] text-white/20 uppercase font-mono tracking-widest font-bold">
        市場多空比 (下跌:平盤:上漲)
    </span>
    <div class="flex items-center gap-3">
        <span class="text-2xl font-mono font-black w-12 {ratioColor}">{ratio}</span>
        <div
            class="h-4 flex-1 bg-white/5 rounded-full overflow-hidden flex text-[9px] font-mono font-bold text-white/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] border border-white/5 relative"
        >
            <div
                class="h-full bg-bearish flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                style="width: {barDown}%"
            >
                {#if down > 0}{down}{/if}
            </div>
            <div
                class="h-full bg-white/10 flex items-center justify-center text-white/40"
                style="width: {barFlat}%"
            >
                {#if flat > 0}{flat}{/if}
            </div>
            <div
                class="h-full bg-bullish flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                style="width: {barUp}%"
            >
                {#if up > 0}{up}{/if}
            </div>
        </div>
    </div>
</div>
