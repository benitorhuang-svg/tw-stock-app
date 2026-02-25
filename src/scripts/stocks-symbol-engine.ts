/**
 * Core Engine for [symbol].astro
 */
function setupWatchToggle() {
    const btn = document.getElementById('watch-toggle-hero');
    if (!btn) return;

    // Interaction logic (mocking persistence for now)
    btn.addEventListener('click', () => {
        btn.classList.toggle('text-accent');
        btn.classList.toggle('border-accent/40');
        btn.classList.toggle('bg-accent/10');
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = {
        overview: document.getElementById('tab-overview'),
        technical: document.getElementById('tab-technical'),
        chips: document.getElementById('tab-chips'),
        fundamentals: document.getElementById('tab-fundamentals'),
        alerts: document.getElementById('tab-alerts')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetId = (e.currentTarget as HTMLElement).dataset.tab;
            if (!targetId) return;

            // Update UI
            tabs.forEach(t => t.classList.remove('active', 'border-accent', 'text-accent'));
            (e.currentTarget as HTMLElement).classList.add('active', 'border-accent', 'text-accent');

            // Switch content
            Object.values(contents).forEach(c => c?.classList.add('hidden'));
            const targetContent = document.getElementById(`tab-${targetId}`);
            if (targetContent) targetContent.classList.remove('hidden');

            // Trigger custom events for specific tab initializations if needed
            if (targetId === 'technical') window.dispatchEvent(new CustomEvent('tab-switched-technical'));
        });
    });
}

let symbolEngineRendered = false;

document.addEventListener('astro:page-load', () => {
    // Guard: only run on stock symbol pages
    if (!document.getElementById('watch-toggle-hero')) {
        symbolEngineRendered = false;
        return;
    }
    if (symbolEngineRendered) return;
    symbolEngineRendered = true;
    setupWatchToggle();
    setupTabs();
});
