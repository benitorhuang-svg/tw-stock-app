/**
 * Core Data Explorer Engine for database.astro
 */
// ═══ Forensic Data Explorer Engine ═══
function escapeHtml(str: unknown): string {
    if (str === null || str === undefined) return '';
    const s = String(str);
    // Fast path: avoid expensive replace chains if no special chars present (handles 95%+ of dataset)
    if (!/[&<>"']/.test(s)) return s;
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let activeTable = '';
let currentPage = 1;
let limit = 100;
let activeController: AbortController | null = null;
let requestSeq = 0;

interface TableColumn {
    name: string;
    type: string;
}

interface TableDataResponse {
    columns: TableColumn[];
    rows: Record<string, unknown>[];
    total: number;
}

const getEl = (id: string) => document.getElementById(id);

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
            detail: { type: 'DB_LOADING' }
        })
    );

    const toggleOpt = (id: string, action: 'add' | 'remove', ...classes: string[]) => {
        const el = getEl(id);
        if (el) el.classList[action](...classes);
    };

    toggleOpt('db-error', 'add', 'hidden');
    toggleOpt('welcome-message', 'add', 'hidden');
    toggleOpt('table-name-container', 'remove', 'hidden');
    toggleOpt('explorer-toolbar', 'remove', 'hidden', 'opacity-0');
    toggleOpt('table-controls', 'remove', 'hidden', 'opacity-0');
    toggleOpt('data-table', 'remove', 'hidden');
    toggleOpt('top-scrollbar', 'remove', 'hidden');

    try {
        const offset = (page - 1) * limit;
        const searchInput = getEl('global-search') as HTMLInputElement;
        const searchTerm = searchInput?.value || '';
        const res = await fetch(
            `/api/db/${encodeURIComponent(name)}?limit=${limit}&offset=${offset}&search=${encodeURIComponent(searchTerm)}`,
            { signal: activeController.signal }
        );
        if (seq !== requestSeq) return;
        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();

        const tableNameLabel = getEl('current-table-name');
        if (tableNameLabel) tableNameLabel.textContent = name;

        const rowCountBadge = getEl('row-count-badge');
        if (rowCountBadge) {
            rowCountBadge.textContent = `${data.total.toLocaleString()} ENTITIES`;
            rowCountBadge.classList.remove('hidden');
        }

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

        // --- DELEGATE RENDERING TO SVELTE ---
        window.dispatchEvent(
            new CustomEvent('tw-db-update', {
                detail: {
                    type: 'DB_DATA',
                    payload: {
                        tableName: name,
                        columns: data.columns,
                        rows: data.rows,
                        total: data.total,
                        page: page
                    }
                }
            })
        );

        const queryTimeLabel = getEl('query-time');
        if (queryTimeLabel) queryTimeLabel.textContent = `${Math.round(performance.now() - startTime)}ms`;
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
        sidebar.addEventListener('click', e => {
            const btn = (e.target as HTMLElement).closest('button[data-table]');
            if (!btn) return;

            sidebar
                .querySelectorAll('button[data-table]')
                .forEach(b =>
                    b.classList.remove('bg-white/[0.1]', 'text-accent', 'border-l-accent')
                );
            btn.classList.add('bg-white/[0.1]', 'text-accent', 'border-l-accent');

            activeTable = (btn as HTMLElement).dataset.table || '';

            const toggleOpt = (id: string, action: 'add' | 'remove', ...classes: string[]) => {
                const el = getEl(id);
                if (el) el.classList[action](...classes);
            };

            if (activeTable === 'refresh') {
                if (activeController) {
                    activeController.abort();
                    activeController = null;
                }
                toggleOpt('grid-container', 'add', 'hidden');
                toggleOpt('explorer-toolbar', 'add', 'hidden');
                toggleOpt('refresh-area', 'remove', 'hidden');
                toggleOpt('refresh-area', 'add', 'flex');
                return;
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

        topScrollbar.addEventListener('scroll', function (this: HTMLElement) {
            if (!isSyncingTop) {
                isSyncingBottom = true;
                if (tableScrollContainer) tableScrollContainer.scrollLeft = this.scrollLeft;
            }
            isSyncingTop = false;
        });

        tableScrollContainer.addEventListener('scroll', function (this: HTMLElement) {
            if (!isSyncingBottom) {
                isSyncingTop = true;
                if (topScrollbar) topScrollbar.scrollLeft = this.scrollLeft;
            }
            isSyncingBottom = false;
        });

        if (topScrollContent && dataTable) {
            let resizeTid: number;
            const rsObserver = new ResizeObserver(() => {
                cancelAnimationFrame(resizeTid);
                resizeTid = requestAnimationFrame(() => {
                    if (topScrollContent) topScrollContent.style.width = `${((dataTable as HTMLElement).scrollWidth)}px`;
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
                if (getEl('tick-count'))
                    getEl('tick-count')!.textContent = String(ticks.length);
            } catch { }
        });
        document.addEventListener('astro:before-swap', () => es.close(), { once: true });
    }

    // ═══ Mobile Sidebar Toggle ═══
    const sidebarToggle = getEl('sidebar-toggle');
    const backdrop = getEl('sidebar-backdrop');
    if (sidebarToggle && backdrop && sidebar && !sidebarToggle.dataset.bound) {
        sidebarToggle.dataset.bound = 'true';

        const toggleSidebar = () => {
            sidebar.classList.toggle('-translate-x-full');
            backdrop.classList.toggle('hidden');
        };

        sidebarToggle.addEventListener('click', toggleSidebar);
        backdrop.addEventListener('click', toggleSidebar);

        // Auto-close on selection
        sidebar.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('button[data-table]')) {
                if (!sidebar.classList.contains('-translate-x-full')) {
                    toggleSidebar();
                }
            }
        });
    }
}

let explorerInitialized = false;

document.addEventListener('astro:before-preparation', () => {
    // Destroy massive DOM table to prevent view transition screenshot from creating lag spikes
    const tableBody = document.getElementById('table-body');
    if (tableBody) tableBody.innerHTML = '';
});

document.addEventListener('astro:page-load', () => {
    if (!document.getElementById('db-sidebar')) {
        explorerInitialized = false;
        return;
    }
    if (explorerInitialized) return; // Prevent multiple re-bindings
    explorerInitialized = true;
    initExplorer();
});
