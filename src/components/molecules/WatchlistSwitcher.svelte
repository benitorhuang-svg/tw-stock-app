<script lang="ts">
    import { onMount } from 'svelte';

    interface WatchlistStore {
        active: string;
        lists: Record<string, string[]>;
    }

    let store: WatchlistStore = $state({
        active: '默認清單',
        lists: { 默認清單: [] },
    });

    let showDropdown = $state(false);

    onMount(() => {
        const saved = localStorage.getItem('tw_watchlists');
        if (saved) {
            try {
                store = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse watchlists', e);
            }
        } else {
            // Migration: Check old watchlist
            const old = localStorage.getItem('watchlist');
            if (old) {
                try {
                    const items = JSON.parse(old);
                    store.lists['默認清單'] = items;
                    save();
                } catch (e) {}
            }
        }

        // Sync LiveDataTable
        dispatchChange();
    });

    function save() {
        localStorage.setItem('tw_watchlists', JSON.stringify(store));
        // Legacy support mapping
        localStorage.setItem('watchlist', JSON.stringify(store.lists[store.active] || []));
        dispatchChange();
    }

    function dispatchChange() {
        const codes = store.lists[store.active] || [];
        window.dispatchEvent(
            new CustomEvent('tw-live-update', {
                detail: {
                    type: 'FILTERS',
                    payload: { starred: true }, // Usually we want to switch to the list when selected
                },
            })
        );
        // Notify Svelte component directly via a custom event
        window.dispatchEvent(
            new CustomEvent('tw-watchlist-sync', {
                detail: { codes },
            })
        );
    }

    function selectList(name: string) {
        store.active = name;
        showDropdown = false;
        save();
    }

    function createList() {
        const name = prompt('輸入新清單名稱:');
        if (name && !store.lists[name]) {
            store.lists[name] = [];
            store.active = name;
            save();
        }
    }

    function deleteList(name: string) {
        if (Object.keys(store.lists).length <= 1) return;
        if (confirm(`確定要刪除清單 "${name}" 嗎?`)) {
            delete store.lists[name];
            if (store.active === name) {
                store.active = Object.keys(store.lists)[0];
            }
            store = { ...store };
            save();
        }
    }
</script>

<div class="relative inline-block text-left">
    <button
        class="h-9 px-4 bg-glass border border-border rounded-lg flex items-center gap-2 transition-all group"
        onclick={() => (showDropdown = !showDropdown)}
    >
        <span class="text-[10px] font-black text-text-muted uppercase tracking-widest font-mono"
            >Watchlist:</span
        >
        <span class="text-[11px] font-bold text-accent truncate max-w-[100px]">{store.active}</span>
        <span class="text-text-muted/50 group-hover:text-text-muted transition-colors">▾</span>
    </button>

    {#if showDropdown}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="fixed inset-0 z-40" onclick={() => (showDropdown = false)}></div>

        <div
            class="absolute right-0 mt-2 w-56 bg-surface-elevated border border-border shadow-2xl rounded-xl z-50 p-2 overflow-hidden animate-fade-in"
        >
            <div class="px-3 py-2 border-b border-border/50 mb-1">
                <span class="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]"
                    >清單管理</span
                >
            </div>

            <div class="max-h-48 overflow-y-auto custom-scrollbar">
                {#each Object.keys(store.lists) as name}
                    <div class="flex items-center group">
                        <button
                            class="flex-1 text-left px-3 py-2 rounded-lg text-xs font-bold transition-all hover:bg-accent/10 {store.active ===
                            name
                                ? 'text-accent bg-accent/5'
                                : 'text-text-muted hover:text-white'}"
                            onclick={() => selectList(name)}
                        >
                            {name}
                            <span class="float-right text-[10px] opacity-30"
                                >({store.lists[name].length})</span
                            >
                        </button>
                        {#if Object.keys(store.lists).length > 1}
                            <button
                                class="p-2 opacity-0 group-hover:opacity-40 hover:!opacity-100 text-bearish transition-all"
                                onclick={() => deleteList(name)}
                            >
                                ✕
                            </button>
                        {/if}
                    </div>
                {/each}
            </div>

            <button
                class="w-full mt-2 py-2 px-3 border border-dashed border-border rounded-lg text-[10px] font-black text-text-muted hover:text-accent hover:border-accent/40 transition-all uppercase tracking-widest"
                onclick={createList}
            >
                + 新增清單
            </button>
        </div>
    {/if}
</div>

<style>
    .bg-glass {
        background: rgba(255, 255, 255, 0.03);
    }
    .bg-glass:hover {
        background: rgba(255, 255, 255, 0.06);
    }
    .bg-surface-elevated {
        background: #0f1115;
    }

    .animate-fade-in {
        animation: fadeIn 0.15s ease-out forwards;
    }
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-4px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
