/**
 * Core Engine for screener.astro
 */
import { saveStrategy } from '../lib/user-account';

// ═══ Forensic Nexus Engine ═══
let scanId: ReturnType<typeof setTimeout> | null = null;

interface NexusVectors {
    pe: number;
    pb: number;
    yield: number;
    rev: number;
    margin: number;
    eps: number;
    foreign: number;
    trust: number;
    [key: string]: number;
}

const nexus_vectors: NexusVectors = {
    pe: 100,
    pb: 10,
    yield: 0,
    rev: -20,
    margin: -10,
    eps: -5,
    foreign: 0,
    trust: 0,
};

function setupScreener() {
    const mappings = [
        { id: 'filter-pe-max', field: 'pe', display: 'pe-display', def: 100 },
        { id: 'filter-pb-max', field: 'pb', display: 'pb-display', def: 10 },
        { id: 'filter-yield-min', field: 'yield', display: 'yield-display', def: 0 },
        { id: 'filter-rev-min', field: 'rev', display: 'rev-display', def: -20 },
        { id: 'filter-margin-min', field: 'margin', display: 'margin-display', def: -10 },
        { id: 'filter-eps-min', field: 'eps', display: 'eps-display', def: -5 },
        {
            id: 'filter-foreign-streak',
            field: 'foreign',
            display: 'foreign-display',
            def: 0,
        },
        { id: 'filter-trust-streak', field: 'trust', display: 'trust-display', def: 0 },
    ];

    mappings.forEach(m => {
        const el = document.getElementById(m.id) as HTMLInputElement | null;
        const disp = document.getElementById(m.display);
        if (el) {
            el.addEventListener('input', () => {
                const val = parseFloat(el.value);
                nexus_vectors[m.field] = val;
                if (disp)
                    disp.textContent = val.toFixed(
                        m.field === 'foreign' || m.field === 'trust' ? 0 : 1
                    );
                triggerScanning();
            });
        }
    });

    // Reset Logic
    document.getElementById('reset-filters')?.addEventListener('click', () => {
        mappings.forEach(m => {
            const el = document.getElementById(m.id) as HTMLInputElement | null;
            const disp = document.getElementById(m.display);
            if (el) {
                el.value = m.def.toString();
                nexus_vectors[m.field] = m.def;
                if (disp)
                    disp.textContent = m.def.toFixed(
                        m.field === 'foreign' || m.field === 'trust' ? 0 : 1
                    );
            }
        });
        triggerScanning();
    });

    // Save Strategy Logic
    document.getElementById('add-custom-strategy')?.addEventListener('click', e => {
        const name = prompt(
            'Enter Sector Code for this Configuration:',
            'CUSTOM_' + Date.now().toString().slice(-4)
        );
        if (name) {
            const strategy = {
                id: 'custom-' + Date.now(),
                name: name,
                criteria: { ...nexus_vectors },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            saveStrategy(strategy);
            const btn = e.currentTarget as HTMLElement | null;
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ VECTOR_STORED';
                btn.classList.add('bg-bullish/20', 'text-bullish', 'border-bullish/40');
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.remove(
                        'bg-bullish/20',
                        'text-bullish',
                        'border-bullish/40'
                    );
                }, 2000);
            }
        }
    });

    // Strategy Preset Clicks
    document.querySelectorAll('.strategy-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sid = (btn as HTMLElement).dataset.strategyId;
            console.log('[Forensic Nexus] Loading preset vector:', sid);
            // For now, presets are handled by the API, but we could sync sliders here
        });
    });
}

function triggerScanning() {
    if (scanId) clearTimeout(scanId);
    const countEl = document.getElementById('visible-count');
    if (countEl) countEl.textContent = 'INTERCEPTING_SIGNALS...';
    scanId = setTimeout(execute_entity_isolation, 400);
}

interface ScreenerApiResult {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    volume: number;
    fundamentals: {
        pe: number | null;
        pb: number | null;
        dividendYield: number | null;
        revenueYoY: number | null;
    };
}

async function execute_entity_isolation() {
    try {
        const res = await fetch('/api/screener', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filters: nexus_vectors }),
        });
        const data = await res.json();
        if (data.success) renderResults(data.results);
    } catch (err) {
        console.error('[Forensic Engine] Isolation failure:', err);
    }
}

function renderResults(results: ScreenerApiResult[]) {
    const body = document.getElementById('screener-results');
    const countEl = document.getElementById('visible-count');
    const emptyEl = document.getElementById('no-results');
    if (!body) return;

    if (countEl) countEl.textContent = `${results.length} ENTITIES_ISOLATED`;

    if (results.length === 0) {
        body.innerHTML = '';
        emptyEl?.classList.remove('hidden');
        return;
    }

    emptyEl?.classList.add('hidden');
    body.innerHTML = results
        .map(
            (s) => `
        <tr class="hover:bg-accent/[0.04] transition-all group cursor-pointer border-b border-white/[0.02]" onclick="window.location.href='/stocks/${s.symbol}'">
            <td class="py-5 px-8">
                <div class="flex flex-col">
                    <span class="text-[12px] font-black text-white group-hover:text-accent transition-colors">${s.name}</span>
                    <span class="text-[9px] font-mono text-white/20 mt-1 uppercase tracking-widest">${s.symbol}</span>
                </div>
            </td>
            <td class="py-5 px-8 text-right font-mono text-xs font-bold text-white/70">${s.price.toFixed(2)}</td>
            <td class="py-5 px-8 text-right font-mono text-xs font-black ${s.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}">
                ${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%
            </td>
            <td class="py-5 px-8 text-right font-mono text-[11px] text-white/30 font-bold">${fmtVolClient(s.volume)}</td>
            <td class="py-5 px-8 text-right font-mono text-xs text-white/50">${s.fundamentals.pe ? s.fundamentals.pe.toFixed(1) : '—'}</td>
            <td class="py-5 px-8 text-right">
                <div class="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    ${(s.fundamentals.dividendYield || 0) > 5 ? '<div class="w-2 h-2 rounded-full bg-bullish shadow-[0_0_8px_rgba(34,197,94,0.4)]" title="High Yield"></div>' : ''}
                    ${(s.fundamentals.pe || 100) < 15 ? '<div class="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(59,130,246,0.4)]" title="Value Focus"></div>' : ''}
                    ${(s.fundamentals.revenueYoY || 0) > 10 ? '<div class="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)]" title="Growth Vector"></div>' : ''}
                </div>
            </td>
        </tr>
    `
        )
        .join('');
}

function fmtVolClient(v: number) {
    const cv = Math.ceil(v);
    if (cv >= 100000000) return (cv / 100000000).toFixed(1) + '億';
    if (cv >= 10000) return (cv / 10000).toFixed(1) + '萬';
    return cv.toLocaleString();
}

// Initialize Screen Engine
document.addEventListener('astro:page-load', () => {
    setupScreener();
    execute_entity_isolation();
});
