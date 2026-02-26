import { marketStore } from '../stores/market.svelte';

// ═══ Forensic Institutional Monitoring Engine ═══
async function fetchStreaks() {
    try {
        marketStore.setInstLoading(true);
        const res = await fetch('/api/market/institutional-streak');
        const data = await res.json();

        // Push directly to store
        marketStore.updateInstitutionalData(data);
    } catch (err) {
        console.error('[Institutional Engine] Stream failure:', err);
        marketStore.setError('Failed to fetch institutional data');
    }
}

// Initialize Engine
let institutionalRendered = false;

document.addEventListener('astro:page-load', () => {
    // Basic page detection
    if (!location.pathname.includes('/institutional')) {
        institutionalRendered = false;
        return;
    }
    if (institutionalRendered) return;
    institutionalRendered = true;
    fetchStreaks();
});
