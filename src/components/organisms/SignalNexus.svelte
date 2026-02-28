<script lang="ts">
    import { onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { flip } from 'svelte/animate';

    interface Signal {
        id: string;
        symbol: string;
        name: string;
        type: 'VOLUME_SPIKE' | 'MA_BREAK' | 'RSI_EXTREME' | 'INST_SURGE';
        message: string;
        timestamp: number;
        severity: 'info' | 'warning' | 'success';
    }

    let signals: Signal[] = $state([]);
    const MAX_SIGNALS = 5;

    onMount(() => {
        const handler = (e: any) => {
            const { type, payload } = e.detail;
            if (type === 'SIGNAL') {
                const signal: Signal = {
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: Date.now(),
                    ...payload,
                };

                signals = [signal, ...signals].slice(0, MAX_SIGNALS);

                // Auto-expire after 8 seconds
                setTimeout(() => {
                    signals = signals.filter(s => s.id !== signal.id);
                }, 8000);
            }
        };

        window.addEventListener('tw-signal', handler);
        return () => window.removeEventListener('tw-signal', handler);
    });

    function getSignalIcon(type: string) {
        switch (type) {
            case 'VOLUME_SPIKE':
                return '⚡';
            case 'MA_BREAK':
                return '📈';
            case 'RSI_EXTREME':
                return '🔥';
            case 'INST_SURGE':
                return '🏛️';
            default:
                return '🛰️';
        }
    }
</script>

<div class="signal-nexus fixed bottom-24 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
    {#each signals as s (s.id)}
        <div
            animate:flip={{ duration: 300 }}
            in:fly={{ x: 50, duration: 400 }}
            out:fade={{ duration: 200 }}
            class="signal-toast pointer-events-auto"
            class:border-bullish={s.severity === 'success'}
            class:border-accent={s.severity === 'info'}
            class:border-warning={s.severity === 'warning'}
        >
            <div class="flex items-start gap-3">
                <div
                    class="flex-shrink-0 w-8 h-8 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-lg"
                >
                    {getSignalIcon(s.type)}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <span
                            class="text-[10px] font-black tracking-widest text-text-muted uppercase font-mono"
                        >
                            Signal_Logged // {new Date(s.timestamp).toLocaleTimeString([], {
                                hour12: false,
                            })}
                        </span>
                        <span
                            class="text-[10px] font-mono text-accent font-bold px-1.5 py-0.5 bg-accent/10 rounded"
                        >
                            {s.symbol}
                        </span>
                    </div>
                    <h4 class="text-xs font-black text-text-primary mt-1 truncate">{s.name}</h4>
                    <p class="text-[10px] text-text-muted leading-relaxed mt-1">{s.message}</p>
                </div>
            </div>

            <!-- Progress Bar -->
            <div
                class="absolute bottom-0 left-0 h-1 bg-current opacity-20 w-full overflow-hidden rounded-b-xl"
            >
                <div class="h-full bg-current animate-progress-shrink"></div>
            </div>
        </div>
    {/each}
</div>

<style>
    .signal-toast {
        width: 300px;
        background: rgba(10, 10, 15, 0.9);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-left-width: 4px;
        padding: 12px 16px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        position: relative;
    }

    .border-bullish {
        border-left-color: var(--color-bullish);
        color: var(--color-bullish);
    }
    .border-accent {
        border-left-color: var(--color-accent);
        color: var(--color-accent);
    }
    .border-warning {
        border-left-color: var(--color-warning);
        color: var(--color-warning);
    }

    @keyframes progress-shrink {
        from {
            width: 100%;
        }
        to {
            width: 0%;
        }
    }
    .animate-progress-shrink {
        animation: progress-shrink 8s linear forwards;
    }
</style>
