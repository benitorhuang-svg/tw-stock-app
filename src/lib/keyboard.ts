/**
 * 鍵盤快捷鍵系統
 * 支援 Ctrl+K / Cmd+K 快速搜尋等功能
 */

export interface ShortcutHandler {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    handler: (e: KeyboardEvent) => void;
    description: string;
}

class KeyboardShortcuts {
    private shortcuts: Map<string, ShortcutHandler> = new Map();
    private enabled = true;
    private searchModal: HTMLElement | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this.handleKeyDown.bind(this));
        }
    }

    private getKey(handler: ShortcutHandler): string {
        const parts: string[] = [];
        if (handler.ctrl) parts.push('ctrl');
        if (handler.shift) parts.push('shift');
        if (handler.alt) parts.push('alt');
        parts.push(handler.key.toLowerCase());
        return parts.join('+');
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.enabled) return;

        // 忽略輸入框內的快捷鍵（除了 Escape）
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            if (e.key !== 'Escape') return;
        }

        const key = this.getKey({
            key: e.key,
            ctrl: e.ctrlKey || e.metaKey,
            shift: e.shiftKey,
            alt: e.altKey,
            handler: () => {},
            description: '',
        });

        const shortcut = this.shortcuts.get(key);
        if (shortcut) {
            e.preventDefault();
            shortcut.handler(e);
        }
    }

    register(handler: ShortcutHandler): void {
        const key = this.getKey(handler);
        this.shortcuts.set(key, handler);
    }

    unregister(handler: ShortcutHandler): void {
        const key = this.getKey(handler);
        this.shortcuts.delete(key);
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    // 內建：快速搜尋對話框
    initSearchModal(): void {
        // 創建搜尋對話框
        this.searchModal = document.createElement('div');
        this.searchModal.id = 'search-modal';
        this.searchModal.innerHTML = `
            <div class="search-modal-backdrop"></div>
            <div class="search-modal-content">
                <div class="search-modal-header">
                    <input type="text" id="global-search" placeholder="搜尋股票代號或名稱..." autofocus />
                    <span class="search-hint">ESC 關閉</span>
                </div>
                <div class="search-modal-results" id="search-results"></div>
            </div>
        `;

        this.searchModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: none;
        `;

        const backdrop = this.searchModal.querySelector('.search-modal-backdrop') as HTMLElement;
        backdrop.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
        `;

        const content = this.searchModal.querySelector('.search-modal-content') as HTMLElement;
        content.style.cssText = `
            position: absolute;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 600px;
            background: var(--bg-secondary, #1a1a2e);
            border: 1px solid var(--border, rgba(255,255,255,0.1));
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;

        const header = this.searchModal.querySelector('.search-modal-header') as HTMLElement;
        header.style.cssText = `
            display: flex;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));
            gap: 12px;
        `;

        const input = this.searchModal.querySelector('#global-search') as HTMLInputElement;
        input.style.cssText = `
            flex: 1;
            padding: 12px 16px;
            background: var(--bg-card, rgba(255,255,255,0.05));
            border: 1px solid var(--border, rgba(255,255,255,0.1));
            border-radius: 8px;
            color: var(--text-primary, #f0f0f0);
            font-size: 1rem;
            outline: none;
        `;

        const hint = this.searchModal.querySelector('.search-hint') as HTMLElement;
        hint.style.cssText = `
            font-size: 0.8rem;
            color: var(--text-secondary, #a0a0b0);
            background: var(--bg-card, rgba(255,255,255,0.05));
            padding: 4px 8px;
            border-radius: 4px;
        `;

        const results = this.searchModal.querySelector('.search-modal-results') as HTMLElement;
        results.style.cssText = `
            max-height: 400px;
            overflow-y: auto;
            padding: 12px;
        `;

        document.body.appendChild(this.searchModal);

        // 綁定事件
        backdrop.addEventListener('click', () => this.closeSearchModal());

        input.addEventListener('input', e => {
            const query = (e.target as HTMLInputElement).value;
            this.updateSearchResults(query);
        });

        // 註冊快捷鍵
        this.register({
            key: 'k',
            ctrl: true,
            handler: () => this.openSearchModal(),
            description: '開啟快速搜尋',
        });

        this.register({
            key: 'Escape',
            handler: () => this.closeSearchModal(),
            description: '關閉對話框',
        });
    }

    openSearchModal(): void {
        if (!this.searchModal) return;
        this.searchModal.style.display = 'block';
        const input = this.searchModal.querySelector('#global-search') as HTMLInputElement;
        input?.focus();
        input.value = '';
        this.updateSearchResults('');
        this.loadStockList();
    }

    closeSearchModal(): void {
        if (!this.searchModal) return;
        this.searchModal.style.display = 'none';
    }

    private stockList: Array<{ symbol: string; name: string }> = [];

    private async loadStockList(): Promise<void> {
        if (this.stockList.length > 0) return;
        try {
            const res = await fetch('/data/stocks.json');
            if (res.ok) {
                const data = await res.json();
                this.stockList = Array.isArray(data)
                    ? data.map((s: any) => ({ symbol: String(s.symbol || s.code || ''), name: String(s.name || '') })).filter((s: any) => s.symbol)
                    : [];
            }
        } catch {
            // fallback: empty list
        }
    }

    private updateSearchResults(query: string): void {
        const results = this.searchModal?.querySelector('#search-results');
        if (!results) return;

        if (!query) {
            results.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary, #a0a0b0);">
                    輸入股票代號或名稱開始搜尋 <kbd style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-size:0.75rem;margin-left:4px">Ctrl+K</kbd>
                </div>
            `;
            return;
        }

        const q = query.toLowerCase();
        const filtered = this.stockList
            .filter(s => s.symbol.toLowerCase().includes(q) || s.name.includes(query))
            .slice(0, 20);

        if (filtered.length === 0) {
            results.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary, #a0a0b0);">
                    找不到符合「${query}」的股票
                </div>
            `;
        } else {
            results.innerHTML = filtered
                .map(
                    s => `
                <a href="/stocks/${s.symbol}" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    color: var(--text-primary, #f0f0f0);
                    text-decoration: none;
                    border-radius: 8px;
                    margin-bottom: 4px;
                " onmouseover="this.style.background='var(--bg-card, rgba(255,255,255,0.05))'" onmouseout="this.style.background='transparent'">
                    <span style="color: var(--accent, #00d4aa); font-weight: 600; min-width: 50px;">${s.symbol}</span>
                    <span>${s.name}</span>
                </a>
            `
                )
                .join('');
        }
    }

    getAll(): ShortcutHandler[] {
        return Array.from(this.shortcuts.values());
    }
}

export const keyboard = new KeyboardShortcuts();
