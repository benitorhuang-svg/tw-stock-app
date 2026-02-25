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
    // Let Svelte handle all the heavy DOM rendering
    window.dispatchEvent(new CustomEvent('tw-inst-update', {
        detail: { type: 'INST_DATA', payload: { data } }
    }));
}

// Initialize Engine
let institutionalRendered = false;

document.addEventListener('astro:page-load', () => {
    // Guard: only run on institutional page
    if (!document.getElementById('foreign-list')) {
        institutionalRendered = false; // Reset when leaving page to allow re-fetch on return
        return;
    }
    if (institutionalRendered) return;
    institutionalRendered = true;
    fetchStreaks();
});
