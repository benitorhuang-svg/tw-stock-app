/**
 * ui.svelte.ts — Svelte 5 Reactive Store for Global UI State
 */

function createUIStore() {
    let showMarketFilters = $state(false);
    let showDatabaseSidebar = $state(true);

    return {
        get showMarketFilters() {
            return showMarketFilters;
        },
        set showMarketFilters(v: boolean) {
            showMarketFilters = v;
        },
        toggleMarketFilters() {
            showMarketFilters = !showMarketFilters;
        },

        get showDatabaseSidebar() {
            return showDatabaseSidebar;
        },
        set showDatabaseSidebar(v: boolean) {
            showDatabaseSidebar = v;
        },
        toggleDatabaseSidebar() {
            showDatabaseSidebar = !showDatabaseSidebar;
        }
    };
}

export const uiStore = createUIStore();
