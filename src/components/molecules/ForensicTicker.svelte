<script lang="ts">
    import { onMount } from 'svelte';
    import { marketStore } from '../../stores/market.svelte';

    const alpha = $derived(marketStore.state.institutional.forensicAlpha);

    let currentMessage = $state('Initializing Forensic Scan...');
    let messageIndex = 0;
    let fadeOut = $state(false);

    const baseMessages = [
        'DETECTING INSTITUTIONAL FOOTPRINTS...',
        'ANALYZING MOMENTUM DIVERGENCE...',
        'SCANNING FOR FORENSIC ALPHA...',
        'MONITORING GOV_BANK LIQUIDITY...',
    ];

    function generateDynamicMessages() {
        if (!alpha) return baseMessages;

        const dynamic = [];
        if (alpha.highConcentration.length > 0) {
            const top = alpha.highConcentration[0];
            dynamic.push(
                `HIGH CONCENTRATION DETECTED: ${top.symbol} [${top.name}] @ ${top.shareholderDist?.large1000.toFixed(1)}%`
            );
        }
        if (alpha.govSupport.length > 0) {
            const top = alpha.govSupport[0];
            dynamic.push(
                `GOVERNMENT BANK ACCUMULATION: ${top.symbol} [${top.name}] NET +${((top.government?.netAmount || 0) / 1000).toFixed(1)}M`
            );
        }
        if (alpha.mainAccumulation.length > 0) {
            const top = alpha.mainAccumulation[0];
            dynamic.push(
                `MAIN BROKER CONCENTRATION: ${top.symbol} [${top.name}] AT ${top.brokerChip?.concentration.toFixed(1)}%`
            );
        }
        return [...baseMessages, ...dynamic];
    }

    onMount(() => {
        const interval = setInterval(() => {
            const allMessages = generateDynamicMessages();
            fadeOut = true;
            setTimeout(() => {
                messageIndex = (messageIndex + 1) % allMessages.length;
                currentMessage = allMessages[messageIndex];
                fadeOut = false;
            }, 500);
        }, 5000);

        return () => clearInterval(interval);
    });
</script>

<div class="flex items-center gap-3 w-full overflow-hidden">
    <div class="flex-shrink-0 flex items-center gap-2">
        <div
            class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--color-accent)]"
        ></div>
        <span
            class="text-[9px] font-black text-text-muted/60 uppercase tracking-[0.2em] whitespace-nowrap"
            >Forensic_Signals:</span
        >
    </div>

    <div class="h-[1px] w-8 bg-border flex-shrink-0"></div>

    <div class="flex-1 overflow-hidden">
        <p
            class="text-[10px] text-text-muted/60 italic font-mono truncate transition-all duration-500 uppercase tracking-tighter"
            style="opacity: {fadeOut ? '0' : '1'}; transform: translateY({fadeOut ? '4px' : '0'})"
        >
            {currentMessage}
        </p>
    </div>

    <div
        class="flex-shrink-0 text-[8px] font-black font-mono text-text-muted/20 uppercase tracking-widest hidden md:block"
    >
        [VERIFIED_STREAM]
    </div>
</div>
