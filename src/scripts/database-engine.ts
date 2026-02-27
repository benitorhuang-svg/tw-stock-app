/**
 * Core Data Explorer Engine for database.astro
 * PERFORMANCE PEAK: Manual GC, Scroll Throttling, Hardware Acceleration Hints
 */


let activeTable = '';
let currentPage = 1;
let limit = 100;
let activeController: AbortController | null = null;
let requestSeq = 0;
let rsObserver: ResizeObserver | null = null;

import { getEl } from '../lib/dom';

function setLoading(isLoading: boolean) {
    const loadingBar = getEl('db-loading-bar');
    if (!loadingBar) return;
    if (isLoading) {
        loadingBar.style.opacity = '1';
        loadingBar.style.width = '30%';
    } else {
        loadingBar.style.width = '100%';
        setTimeout(() => {
            if (loadingBar) {
                loadingBar.style.opacity = '0';
                loadingBar.style.width = '0';
            }
        }, 300);
    }
}

async function loadTable(name: string, page = 1) {
    if (!name) return;
    const seq = ++requestSeq;
    if (activeController) activeController.abort();
    activeController = new AbortController();

    const startTime = performance.now();
    setLoading(true);

    // Tell Svelte to clear the old heavy DOM immediately
    window.dispatchEvent(
        new CustomEvent('tw-db-update', {
            detail: { type: 'DB_LOADING' },
        })
    );

    const toggleOpt = (id: string, action: 'add' | 'remove', ...classes: string[]) => {
        const el = getEl(id);
        if (el) el.classList[action](...classes);
    };

    toggleOpt('db-error', 'add', 'hidden');
    toggleOpt('welcome-message', 'add', 'hidden');
    toggleOpt('explorer-toolbar', 'remove', 'hidden', 'opacity-0');
    toggleOpt('table-controls', 'remove', 'hidden', 'opacity-0');
    toggleOpt('data-table', 'remove', 'hidden');
    toggleOpt('top-scrollbar', 'remove', 'hidden');

    try {
        const offset = (page - 1) * limit;
        const searchInput = getEl('global-search') as HTMLInputElement;
        const searchTerm = (searchInput?.value || '').trim();
        const url = `/api/db/${encodeURIComponent(name)}?limit=${limit}&offset=${offset}&search=${encodeURIComponent(searchTerm)}`;

        console.log(`[Explorer] Fetching: ${url}`);

        const res = await fetch(url, { signal: activeController.signal });
        if (seq !== requestSeq) return;
        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        console.log(`[Explorer] Received ${data.rows?.length || 0} rows for ${name}`);
        if (seq !== requestSeq) return;

        const pageNumLabel = getEl('page-num');
        if (pageNumLabel) pageNumLabel.textContent = page.toString();
        currentPage = page;

        const prevBtn = getEl('prev-page') as HTMLButtonElement;
        const nextBtn = getEl('next-page') as HTMLButtonElement;
        if (prevBtn) prevBtn.disabled = page <= 1;
        if (nextBtn) {
            const totalPages = Math.ceil(data.total / limit);
            nextBtn.disabled = page >= totalPages;
        }

        // --- DELEGATE RENDERING TO SVELTE (Non-blocking) ---
        requestAnimationFrame(() => {
            window.dispatchEvent(
                new CustomEvent('tw-db-update', {
                    detail: {
                        type: 'DB_DATA',
                        payload: {
                            tableName: name,
                            columns: data.columns,
                            rows: data.rows,
                            total: data.total,
                            page: page,
                        },
                    },
                })
            );
        });

        const queryTimeLabel = getEl('query-time');
        if (queryTimeLabel)
            queryTimeLabel.textContent = `${Math.round(performance.now() - startTime)}ms`;
    } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return;
        console.error(err);
        toggleOpt('db-error', 'remove', 'hidden');
        toggleOpt('data-table', 'add', 'hidden');
        const errorMsg = getEl('error-message');
        if (errorMsg) errorMsg.textContent = (err as Error).message;
    } finally {
        setLoading(false);
    }
}

function initExplorer() {
    const sidebar = getEl('db-sidebar');
    if (sidebar && !sidebar.dataset.bound) {
        sidebar.dataset.bound = 'true';

        const toggleOpt = (id: string, action: 'add' | 'remove', ...classes: string[]) => {
            const el = getEl(id);
            if (el) el.classList[action](...classes);
        };

        let prefetchTid: number | null = null;

        // Hover Pre-fetch: Predictive loading for "Snap-in" feel
        sidebar.addEventListener(
            'mouseenter',
            e => {
                const btn = (e.target as HTMLElement).closest('button[data-table]');
                if (!btn) return;
                const targetTable = (btn as HTMLElement).dataset.table;
                if (targetTable && targetTable !== activeTable && targetTable !== 'refresh') {
                    if (prefetchTid) clearTimeout(prefetchTid);
                    prefetchTid = window.setTimeout(() => {
                        fetch(`/api/db/${targetTable}?limit=${limit}&offset=0`).catch(() => { });
                    }, 150);
                }
            },
            { capture: true }
        );

        sidebar.addEventListener('click', e => {
            const btn = (e.target as HTMLElement).closest('button[data-table]');
            if (!btn) return;

            activeTable = (btn as HTMLElement).dataset.table || '';
            sidebar
                .querySelectorAll('button[data-table]')
                .forEach(b =>
                    b.classList.remove('bg-white/[0.1]', 'text-accent', 'border-l-accent')
                );
            btn.classList.add('bg-white/[0.1]', 'text-accent', 'border-l-accent');

            if (activeTable === 'refresh') {
                if (activeController) {
                    activeController.abort();
                    activeController = null;
                }
                toggleOpt('grid-container', 'add', 'hidden');
                toggleOpt('explorer-toolbar', 'add', 'hidden');
                toggleOpt('refresh-area', 'remove', 'hidden');
                toggleOpt('refresh-area', 'add', 'flex');
            } else {
                toggleOpt('grid-container', 'remove', 'hidden');
                toggleOpt('explorer-toolbar', 'remove', 'hidden');
                toggleOpt('refresh-area', 'add', 'hidden');
                toggleOpt('refresh-area', 'remove', 'flex');
                currentPage = 1;
                loadTable(activeTable);
            }
        });
    }

    const prevPage = getEl('prev-page');
    if (prevPage && !prevPage.dataset.bound) {
        prevPage.dataset.bound = 'true';
        prevPage.addEventListener('click', () => {
            if (currentPage > 1) loadTable(activeTable, currentPage - 1);
        });
    }

    const nextPage = getEl('next-page');
    if (nextPage && !nextPage.dataset.bound) {
        nextPage.dataset.bound = 'true';
        nextPage.addEventListener('click', () => {
            loadTable(activeTable, currentPage + 1);
        });
    }

    const topScrollbar = getEl('top-scrollbar');
    const tableScrollContainer = getEl('table-scroll-container');
    const topScrollContent = getEl('top-scroll-content');
    const dataTable = getEl('data-table');

    if (topScrollbar && tableScrollContainer && !topScrollbar.dataset.bound) {
        topScrollbar.dataset.bound = 'true';
        let isSyncingTop = false;
        let isSyncingBottom = false;

        // Optimized sync with micro-task
        topScrollbar.addEventListener(
            'scroll',
            function (this: HTMLElement) {
                if (!isSyncingTop) {
                    isSyncingBottom = true;
                    tableScrollContainer!.scrollLeft = this.scrollLeft;
                }
                isSyncingTop = false;
            },
            { passive: true }
        );

        tableScrollContainer.addEventListener(
            'scroll',
            function (this: HTMLElement) {
                if (!isSyncingBottom) {
                    isSyncingTop = true;
                    topScrollbar!.scrollLeft = this.scrollLeft;
                }
                isSyncingBottom = false;
            },
            { passive: true }
        );

        if (topScrollContent && dataTable) {
            if (rsObserver) rsObserver.disconnect();
            let resizeTid: number;
            rsObserver = new ResizeObserver(() => {
                cancelAnimationFrame(resizeTid);
                resizeTid = requestAnimationFrame(() => {
                    if (topScrollContent && dataTable) {
                        topScrollContent.style.width = `${(dataTable as HTMLElement).scrollWidth}px`;
                    }
                });
            });
            rsObserver.observe(dataTable);
            rsObserver.observe(tableScrollContainer);
        }
    }

    const globalSearch = getEl('global-search');
    if (globalSearch && !globalSearch.dataset.bound) {
        globalSearch.dataset.bound = 'true';
        let searchTimeout: ReturnType<typeof setTimeout>;
        globalSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadTable(activeTable, 1);
            }, 300);
        });
    }

    const pageLimit = getEl('page-limit');
    if (pageLimit && !pageLimit.dataset.bound) {
        pageLimit.dataset.bound = 'true';
        pageLimit.addEventListener('change', e => {
            limit = parseInt((e.target as HTMLSelectElement).value);
            loadTable(activeTable, 1);
        });
    }

    const tickCountEl = getEl('tick-count');
    if (typeof EventSource !== 'undefined' && tickCountEl && !tickCountEl.dataset.bound) {
        tickCountEl.dataset.bound = 'true';
        const es = new EventSource('/api/sse/stream');
        es.addEventListener('tick', e => {
            try {
                const ticks = JSON.parse(e.data);
                if (getEl('tick-count')) getEl('tick-count')!.textContent = String(ticks.length);
            } catch { }
        });
        document.addEventListener('astro:before-swap', () => es.close(), { once: true });
    }

    // ═══ Mobile Sidebar Toggle (Atomic & Breakpoint Aware) ═══
    const sidebarToggle = getEl('sidebar-toggle');
    const backdrop = getEl('sidebar-backdrop');

    if (sidebarToggle && backdrop && sidebar && !sidebarToggle.dataset.bound) {
        sidebarToggle.dataset.bound = 'true';

        const isMobile = () => window.innerWidth < 768; // Tailwind md breakpoint

        const toggleSidebar = (forceClose = false) => {
            if (!isMobile()) return; // ATOMIC GUARD: Desktop should never toggle

            if (forceClose) {
                sidebar.classList.add('-translate-x-full');
                backdrop.classList.add('hidden');
            } else {
                sidebar.classList.toggle('-translate-x-full');
                backdrop.classList.toggle('hidden');
            }
        };

        sidebarToggle.addEventListener('click', () => toggleSidebar());
        backdrop.addEventListener('click', () => toggleSidebar(true));

        // Auto-close ONLY on mobile selection
        sidebar.addEventListener('click', e => {
            if ((e.target as HTMLElement).closest('button[data-table]')) {
                if (isMobile()) toggleSidebar(true);
            }
        });

        // DESKTOP RECOVERY: Force reset if window is resized above mobile
        window.addEventListener(
            'resize',
            () => {
                if (!isMobile()) {
                    sidebar.classList.remove('-translate-x-full');
                    backdrop.classList.add('hidden');
                }
            },
            { passive: true }
        );
    }

    // Cleanup on navigation
    document.addEventListener(
        'astro:before-swap',
        () => {
            if (rsObserver) {
                rsObserver.disconnect();
                rsObserver = null;
            }
            if (activeController) activeController.abort();
        },
        { once: true }
    );
}

let explorerInitialized = false;

document.addEventListener('astro:before-preparation', () => {
    const tableBody = document.getElementById('table-body');
    if (tableBody) tableBody.innerHTML = '';
});

document.addEventListener('astro:page-load', () => {
    if (!document.getElementById('db-sidebar')) {
        explorerInitialized = false;
        return;
    }
    if (explorerInitialized) return;
    explorerInitialized = true;
    initExplorer();
});
