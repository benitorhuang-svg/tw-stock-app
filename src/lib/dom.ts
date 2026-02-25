/**
 * Shared DOM Utilities for the Quantum Terminal Engine
 * PERFORMANCE: Fast element lookup with caching
 */

const elCache = new Map<string, HTMLElement | null>();

/** Fast ID selector with memory caching */
export function getEl<T extends HTMLElement>(id: string): T | null {
    if (elCache.has(id)) return elCache.get(id) as T | null;
    const el = document.getElementById(id);
    elCache.set(id, el as HTMLElement);
    return el as T | null;
}

/** Clear cache on page navigation to avoid stale refs */
document.addEventListener('astro:before-preparation', () => {
    elCache.clear();
});

/** Batch class toggle utility */
export function toggleClasses(id: string, action: 'add' | 'remove', className: string) {
    const el = getEl(id);
    if (el) el.classList[action](className);
}
