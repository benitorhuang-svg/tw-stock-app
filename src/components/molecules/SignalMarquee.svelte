<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { fade } from 'svelte/transition';

    interface Signal {
        id: string;
        symbol: string;
        name: string;
        message: string;
        timestamp: number;
    }

    let signals: Signal[] = $state([]);
    const MAX_SIGNALS = 8;
    let dismissed = $state(false);

    onMount(() => {
        const handler = (e: any) => {
            const signalPayload = e.detail;
            if (signalPayload && signalPayload.symbol) {
                const signal: Signal = {
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: Date.now(),
                    ...signalPayload,
                };

                // Deduplicate and keep recent
                if (signals.some(s => s.symbol === signal.symbol && s.message === signal.message))
                    return;

                signals = [signal, ...signals].slice(0, MAX_SIGNALS);
                dismissed = false; // Re-show on new signal
            }
        };

        window.addEventListener('tw-signal', handler);
        return () => window.removeEventListener('tw-signal', handler);
    });

    function getSeverityClass(msg: string) {
        if (msg.includes('爆量') || msg.includes('跌破')) return 'text-bearish';
        if (msg.includes('成功站上') || msg.includes('突破')) return 'text-bullish';
        return 'text-accent';
    }
</script>

{#if signals.length > 0 && !dismissed}
    <div
        class="signal-marquee-belt w-full h-8 bg-black/40 border-b border-white/5 backdrop-blur-md overflow-hidden flex items-center relative group/marquee"
        transition:fade={{ duration: 300 }}
    >
        <div
            class="marquee-content flex items-center gap-12 whitespace-nowrap px-4 animate-marquee"
        >
            <!-- Duplicate content for seamless loop -->
            {#each Array(2) as _, i}
                <div class="flex items-center gap-12">
                    {#each signals as s (s.id + i)}
                        <div
                            class="flex items-center gap-3 group/item px-2 py-0.5 rounded hover:bg-white/5 transition-all"
                        >
                            <span
                                class="text-[10px] font-mono font-black py-0.5 px-1.5 bg-white/5 text-white/40 rounded border border-white/10 group-hover/item:border-accent/30 group-hover/item:text-accent transition-colors"
                            >
                                {s.symbol}
                            </span>
                            <span
                                class="text-[10px] font-bold tracking-tight {getSeverityClass(
                                    s.message
                                )}"
                            >
                                {s.message}
                            </span>
                            <span class="text-[8px] font-mono text-white/20">
                                {new Date(s.timestamp).toLocaleTimeString([], {
                                    hour12: false,
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                        </div>
                    {/each}
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .animate-marquee {
        animation: marquee 40s linear infinite;
        will-change: transform;
    }

    .animate-marquee:hover {
        animation-play-state: paused;
    }

    @keyframes marquee {
        0% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(-50%);
        }
    }

    .signal-marquee-belt {
        /* Professional Ticker Depth */
        box-shadow: inset 0 -5px 15px rgba(0, 0, 0, 0.2);
    }
</style>
