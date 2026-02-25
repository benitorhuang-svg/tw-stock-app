/**
 * Core Engine for institutional.astro
 */

interface InstitutionalData {
    symbol: string;
    name: string;
    foreignStreak: number;
    investStreak: number;
    dealerStreak: number;
    latest: Record<string, number>;
}

// ═══ Forensic Institutional Monitoring Engine ═══
async function fetchStreaks() {
    try {
        const res = await fetch('/api/market/institutional-streak');
        const data = await res.json();
        renderForensicData(data);
    } catch (err) {
        console.error('[Institutional Engine] Stream failure:', err);
    }
}

function renderForensicData(data: InstitutionalData[]) {
    const fList = document.getElementById('foreign-list');
    const tList = document.getElementById('trust-list');
    const dList = document.getElementById('dealer-list');

    const fCount = document.getElementById('foreign-count');
    const tCount = document.getElementById('trust-count');
    const dCount = document.getElementById('dealer-count');

    if (!fList || !tList || !dList) return;

    // Sorting & Filtering (Min 2 days streak)
    const fSorted = data
        .filter(i => Math.abs(i.foreignStreak) >= 2)
        .sort((a, b) => Math.abs(b.foreignStreak) - Math.abs(a.foreignStreak));
    const tSorted = data
        .filter(i => Math.abs(i.investStreak) >= 2)
        .sort((a, b) => Math.abs(b.investStreak) - Math.abs(a.investStreak));
    const dSorted = data
        .filter(i => Math.abs(i.dealerStreak) >= 2)
        .sort((a, b) => Math.abs(b.dealerStreak) - Math.abs(a.dealerStreak));

    if (fCount) fCount.textContent = `${fSorted.length} ENTITIES ACTIVE`;
    if (tCount) tCount.textContent = `${tSorted.length} ENTITIES ACTIVE`;
    if (dCount) dCount.textContent = `${dSorted.length} ENTITIES ACTIVE`;

    fList.innerHTML =
        fSorted.length > 0
            ? fSorted.map(i => renderForensicCard(i, i.foreignStreak, 'foreign')).join('')
            : renderEmptyState();
    tList.innerHTML =
        tSorted.length > 0
            ? tSorted.map(i => renderForensicCard(i, i.investStreak, 'invest')).join('')
            : renderEmptyState();
    dList.innerHTML =
        dSorted.length > 0
            ? dSorted.map(i => renderForensicCard(i, i.dealerStreak, 'dealer')).join('')
            : renderEmptyState();
}

function renderForensicCard(item: InstitutionalData, streak: number, type: string) {
    const isBuy = streak > 0;
    const streakAbs = Math.abs(streak);
    const color = isBuy ? 'text-bullish' : 'text-bearish';
    const bgColor = isBuy ? 'bg-bullish/10' : 'bg-bearish/10';
    const bdrColor = isBuy ? 'border-bullish/20' : 'border-bearish/20';
    const glow = isBuy
        ? 'shadow-[0_0_15px_rgba(34,197,94,0.1)]'
        : 'shadow-[0_0_15px_rgba(239,68,68,0.1)]';
    const netVal = item.latest[type];
    const fmtNet = (netVal / 1000).toFixed(1) + 'K';

    return `
        <a href="/stocks/${item.symbol}" class="group relative block p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all no-underline overflow-hidden">
            <div class="absolute top-0 left-0 w-1 h-full ${isBuy ? 'bg-bullish' : 'bg-bearish'} opacity-40 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                    <span class="text-sm font-black text-white group-hover:text-accent transition-colors tracking-tighter">${item.symbol}</span>
                    <span class="text-[10px] font-mono text-white/30 uppercase truncate max-w-[80px]">${item.name}</span>
                </div>
                <div class="px-2 py-0.5 rounded text-[9px] font-black font-mono border ${bdrColor} ${bgColor} ${color} ${glow}">
                    ${streakAbs}D ${isBuy ? 'ACCUM' : 'DUMP'}
                </div>
            </div>
            <div class="flex items-end justify-between">
                <div>
                    <div class="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1">Impact_Magnitude</div>
                    <div class="text-sm font-mono font-bold ${netVal >= 0 ? 'text-bullish' : 'text-bearish'}">
                        ${netVal >= 0 ? '+' : ''}${fmtNet}
                    </div>
                </div>
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </a>
    `;
}

function renderEmptyState() {
    return `<div class="h-full flex flex-col items-center justify-center opacity-10 gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
        <span class="font-mono text-[10px] tracking-widest uppercase">No_Sig_Detected</span>
    </div>`;
}

// Initialize Engine
document.addEventListener('astro:page-load', fetchStreaks);
fetchStreaks();
