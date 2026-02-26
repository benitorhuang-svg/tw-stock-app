/**
 * live-filter-engine.ts — UI controller for LiveFilterPanel sliders/buttons
 * Atomic Design: Atom-level engine for filter UI interactions.
 * Responsibility: slider display updates + button increments only.
 * Filtering logic is handled by LiveDataTable.svelte via events.
 */
import { getEl } from '../lib/dom';

function setupFilterUI() {
    const trendInput = getEl('filter-trend') as HTMLInputElement | null;
    const trendDisplay = getEl('trend-display');
    const trendUp = getEl('trend-up');
    const trendDn = getEl('trend-dn');

    const volInput = getEl('filter-volume') as HTMLInputElement | null;
    const volDisplay = getEl('vol-display');
    const volUp = getEl('vol-up');
    const volDn = getEl('vol-dn');

    const ma20Input = getEl('filter-ma20') as HTMLInputElement | null;
    const ma20Display = getEl('ma20-display');
    const ma20Up = getEl('ma20-up');
    const ma20Dn = getEl('ma20-dn');

    // ─── Trend display ─────────────────────────
    function updateTrend() {
        if (!trendInput || !trendDisplay) return;
        const val = parseFloat(trendInput.value);
        const prefix = val > 0 ? '+' : '';
        trendDisplay.textContent = prefix + val.toFixed(1) + '%';

        // Swap class atomically (single className assignment avoids 3x classList calls)
        trendDisplay.className = `text-[9px] font-mono font-black leading-none ${val > 0 ? 'text-bullish' : val < 0 ? 'text-bearish' : 'text-accent'
            }`;
    }

    // ─── Volume display ────────────────────────
    function updateVol() {
        if (!volInput || !volDisplay) return;
        const val = parseInt(volInput.value, 10);
        volDisplay.textContent = val >= 10000 ? (val / 10000).toFixed(1) + '萬' : String(val);
    }

    // ─── MA20 display ────────────────────────
    function updateMA20() {
        if (!ma20Input || !ma20Display) return;
        const val = parseFloat(ma20Input.value);
        const prefix = val > 0 ? '+' : '';
        ma20Display.textContent = prefix + val.toFixed(1);
        ma20Display.className = `text-[9px] font-mono font-black leading-none ${val > 0 ? 'text-bullish' : val < 0 ? 'text-bearish' : 'text-accent'
            }`;
    }

    // ─── Trend controls ────────────────────────
    trendUp?.addEventListener('click', () => {
        if (!trendInput) return;
        trendInput.value = String(Math.min(10, parseFloat(trendInput.value) + 0.5));
        updateTrend();
        trendInput.dispatchEvent(new Event('change'));
    });
    trendDn?.addEventListener('click', () => {
        if (!trendInput) return;
        trendInput.value = String(Math.max(-10, parseFloat(trendInput.value) - 0.5));
        updateTrend();
        trendInput.dispatchEvent(new Event('change'));
    });
    trendInput?.addEventListener('input', updateTrend);

    // ─── Volume controls ───────────────────────
    volUp?.addEventListener('click', () => {
        if (!volInput) return;
        volInput.value = String(Math.min(1000000, parseInt(volInput.value, 10) + 5000));
        updateVol();
        volInput.dispatchEvent(new Event('change'));
    });
    volDn?.addEventListener('click', () => {
        if (!volInput) return;
        volInput.value = String(Math.max(0, parseInt(volInput.value, 10) - 5000));
        updateVol();
        volInput.dispatchEvent(new Event('change'));
    });
    volInput?.addEventListener('input', updateVol);

    // ─── MA20 controls ───────────────────────
    ma20Up?.addEventListener('click', () => {
        if (!ma20Input) return;
        ma20Input.value = String(Math.min(10, parseFloat(ma20Input.value) + 0.5));
        updateMA20();
        ma20Input.dispatchEvent(new Event('change'));
    });
    ma20Dn?.addEventListener('click', () => {
        if (!ma20Input) return;
        ma20Input.value = String(Math.max(-10, parseFloat(ma20Input.value) - 0.5));
        updateMA20();
        ma20Input.dispatchEvent(new Event('change'));
    });
    ma20Input?.addEventListener('input', updateMA20);
}

document.addEventListener('astro:page-load', setupFilterUI);
