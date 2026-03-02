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
                    btn.classList.remove('bg-bullish/20', 'text-bullish', 'border-bullish/40');
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
    window.dispatchEvent(
        new CustomEvent('tw-screener-update', {
            detail: { type: 'SCREENER_LOADING' },
        })
    );
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
    const countEl = document.getElementById('visible-count');
    if (countEl) countEl.textContent = `${results.length} ENTITIES_ISOLATED`;

    window.dispatchEvent(
        new CustomEvent('tw-screener-update', {
            detail: { type: 'SCREENER_DATA', payload: { results } },
        })
    );
}

// Initialize Screen Engine
document.addEventListener('astro:page-load', () => {
    setupScreener();
    execute_entity_isolation();

    // AI Screener button → dispatch event to AiScreenerResults.svelte
    document.getElementById('ai-screener-btn')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('tw-ai-run'));
    });
});
