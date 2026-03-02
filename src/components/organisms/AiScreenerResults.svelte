<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    interface AiScore {
        symbol: string;
        name: string;
        sector: string | null;
        date: string;
        technical_score: number;
        chip_score: number;
        fundamental_score: number;
        total_score: number;
        signal: string;
        close: number;
        change_pct: number;
        volume: number;
        pe: number;
        pb: number;
        yield_pct: number;
        foreign_inv: number;
        invest_trust: number;
    }

    let results: AiScore[] = $state([]);
    let isLoading = $state(false);
    let hasRun = $state(false);
    let errorMsg = $state('');
    let filterSignal = $state('');
    let lastRunDate = $state('');

    /** POST: compute fresh scores + persist to DB */
    async function runAiScoring() {
        isLoading = true;
        errorMsg = '';
        results = [];

        try {
            const params = new URLSearchParams();
            params.set('limit', '50');
            if (filterSignal) params.set('signal', filterSignal);

            const resp = await fetch(`/api/ai-screener?${params}`, { method: 'POST' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            const data = await resp.json();
            results = data.results ?? [];
            hasRun = true;
            if (results.length > 0 && results[0].date) {
                lastRunDate = results[0].date;
            }
        } catch (err: any) {
            errorMsg = err.message || 'AI scoring failed';
            hasRun = true;
        } finally {
            isLoading = false;
        }
    }

    /** GET: read persisted scores (may fall back to real-time) */
    async function loadCachedResults() {
        isLoading = true;
        errorMsg = '';

        try {
            const params = new URLSearchParams();
            params.set('limit', '50');
            if (filterSignal) params.set('signal', filterSignal);

            const resp = await fetch(`/api/ai-screener?${params}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            const data = await resp.json();
            results = data.results ?? [];
            hasRun = true;
            if (results.length > 0 && results[0].date) {
                lastRunDate = results[0].date;
            }
        } catch (err: any) {
            errorMsg = err.message || 'Failed to load results';
            hasRun = true;
        } finally {
            isLoading = false;
        }
    }

    function handleRun() {
        runAiScoring();
    }

    onMount(() => {
        const listener = () => runAiScoring();
        window.addEventListener('tw-ai-run', listener);

        // Auto-load persisted results when accordion opens
        if (!hasRun) {
            loadCachedResults();
        }

        return () => window.removeEventListener('tw-ai-run', listener);
    });

    function signalColor(sig: string) {
        if (sig.includes('STRONG_BUY')) return 'text-bullish bg-bullish/10 border-bullish/30';
        if (sig.includes('BUY')) return 'text-bullish/80 bg-bullish/5 border-bullish/20';
        if (sig.includes('STRONG_SELL')) return 'text-bearish bg-bearish/10 border-bearish/30';
        if (sig.includes('SELL')) return 'text-bearish/80 bg-bearish/5 border-bearish/20';
        return 'text-text-muted bg-surface border-border';
    }

    function signalLabel(sig: string) {
        const map: Record<string, string> = {
            STRONG_BUY: '強力買進',
            BUY: '買進',
            STRONG_SELL: '強力賣出',
            SELL: '賣出',
        };
        return map[sig] || sig;
    }

    function fmtScore(v: number) {
        return v.toFixed(1);
    }

    function fmtVol(v: number) {
        if (v >= 10000) return (v / 10000).toFixed(1) + '萬';
        if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
        return v.toString();
    }

    function navigateToStock(symbol: string) {
        window.location.href = '/stocks/' + symbol;
    }

    const SIGNAL_TABS = [
        { value: '', label: '全部' },
        { value: 'STRONG_BUY', label: '強買' },
        { value: 'BUY', label: '買進' },
        { value: 'SELL', label: '賣出' },
        { value: 'STRONG_SELL', label: '強賣' },
    ];
</script>

<div class="space-y-4">
    <!-- Control Bar -->
    <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-2">
            {#each SIGNAL_TABS as tab}
                <button
                    onclick={() => { filterSignal = tab.value; if (hasRun) loadCachedResults(); }}
                    class="px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all border
                        {filterSignal === tab.value
                        ? 'bg-accent/15 border-accent/40 text-accent'
                        : 'bg-surface/30 border-border/10 text-text-muted hover:text-text-primary hover:border-border-highlight'}"
                >
                    {tab.label}
                </button>
            {/each}
        </div>
        <div class="flex items-center gap-3">
            {#if lastRunDate}
                <span class="text-[9px] font-mono text-text-muted/60 uppercase tracking-widest">
                    Last_Scan: {lastRunDate}
                </span>
            {/if}
            <button
                onclick={handleRun}
                disabled={isLoading}
                class="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase
                    bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/50
                    disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
                {#if isLoading}
                    <div class="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                {:else}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                {/if}
                Refresh
            </button>
        </div>
    </div>

    <!-- Results Table -->
    <div class="overflow-x-auto min-h-[300px] relative">
        {#if isLoading}
            <div class="absolute top-16 left-1/2 -translate-x-1/2 flex items-center justify-center z-50">
                <div class="flex items-center gap-3 bg-surface border border-accent/20 px-6 py-4 rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                    <div class="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-accent font-mono text-[10px] tracking-widest uppercase">AI_Model_Inference...</span>
                </div>
            </div>
        {/if}

        {#if errorMsg}
            <div class="py-12 text-center">
                <p class="text-bearish text-xs font-mono">{errorMsg}</p>
            </div>
        {:else if !hasRun}
            <div class="py-20 text-center">
                <div class="text-3xl mb-4 opacity-30">🤖</div>
                <p class="text-text-muted font-mono text-[11px] tracking-widest uppercase">
                    Awaiting_AI_Inference
                </p>
                <p class="text-text-muted/50 text-[10px] mt-2 font-mono">
                    點擊上方「執行AI選股」或 Refresh 開始掃描
                </p>
            </div>
        {:else if results.length === 0 && !isLoading}
            <div class="py-20 text-center">
                <p class="text-text-muted font-mono text-xs tracking-widest uppercase">
                    No qualifying signals detected
                </p>
            </div>
        {:else}
            <table class="w-full text-left border-separate border-spacing-0" style="table-layout: fixed;">
                <thead class="sticky top-0 bg-surface/95 backdrop-blur-md z-20">
                    <tr class="bg-surface-hover/10 text-[9px] uppercase text-text-muted font-black tracking-widest">
                        <th class="py-3 px-4 border-b border-border/10 w-[18%]">Entity</th>
                        <th class="py-3 px-4 border-b border-border/10 text-center w-[10%]">Signal</th>
                        <th class="py-3 px-4 border-b border-border/10 text-right w-[13%]">Total</th>
                        <th class="py-3 px-4 border-b border-border/10 text-right w-[10%]">Tech</th>
                        <th class="py-3 px-4 border-b border-border/10 text-right w-[10%]">Chip</th>
                        <th class="py-3 px-4 border-b border-border/10 text-right w-[10%]">Fund</th>
                        <th class="py-3 px-4 border-b border-border/10 text-right w-[14%]">Price</th>
                        <th class="py-3 px-4 border-b border-border/10 text-right w-[15%]">Volume</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border/10">
                    {#each results as row}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <tr
                            class="hover:bg-accent/[0.04] transition-all group cursor-pointer"
                            onclick={() => navigateToStock(row.symbol)}
                        >
                            <td class="py-3 px-4">
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-xs font-bold text-text-primary group-hover:text-accent transition-colors">
                                        {row.symbol}
                                    </span>
                                    <span class="text-[10px] text-text-muted truncate">{row.name}</span>
                                </div>
                            </td>
                            <td class="py-3 px-4 text-center">
                                <span class="inline-block px-2.5 py-0.5 rounded-md text-[9px] font-black tracking-wider border {signalColor(row.signal)}">
                                    {signalLabel(row.signal)}
                                </span>
                            </td>
                            <td class="py-3 px-4 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <div class="w-12 h-1.5 rounded-full bg-surface overflow-hidden">
                                        <div
                                            class="h-full rounded-full {row.total_score >= 70 ? 'bg-bullish' : row.total_score >= 40 ? 'bg-accent' : 'bg-bearish'}"
                                            style="width: {Math.min(row.total_score, 100)}%"
                                        ></div>
                                    </div>
                                    <span class="text-[11px] font-mono font-bold text-text-primary">{fmtScore(row.total_score)}</span>
                                </div>
                            </td>
                            <td class="py-3 px-4 text-right text-[11px] font-mono {row.technical_score >= 60 ? 'text-bullish' : row.technical_score <= 40 ? 'text-bearish' : 'text-text-muted'}">
                                {fmtScore(row.technical_score)}
                            </td>
                            <td class="py-3 px-4 text-right text-[11px] font-mono {row.chip_score >= 60 ? 'text-bullish' : row.chip_score <= 40 ? 'text-bearish' : 'text-text-muted'}">
                                {fmtScore(row.chip_score)}
                            </td>
                            <td class="py-3 px-4 text-right text-[11px] font-mono {row.fundamental_score >= 60 ? 'text-bullish' : row.fundamental_score <= 40 ? 'text-bearish' : 'text-text-muted'}">
                                {fmtScore(row.fundamental_score)}
                            </td>
                            <td class="py-3 px-4 text-right">
                                <div class="flex flex-col items-end gap-0.5">
                                    <span class="text-[11px] font-mono font-bold text-text-primary">{row.close.toFixed(2)}</span>
                                    <span class="text-[9px] font-mono {row.change_pct >= 0 ? 'text-bullish' : 'text-bearish'}">
                                        {row.change_pct >= 0 ? '+' : ''}{row.change_pct.toFixed(2)}%
                                    </span>
                                </div>
                            </td>
                            <td class="py-3 px-4 text-right text-[11px] font-mono text-text-muted">
                                {fmtVol(row.volume)}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>
</div>
