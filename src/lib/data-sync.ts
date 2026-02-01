/**
 * 資料同步服務
 * 背景同步、手動刷新、時效管理
 */

// ================== 常數 ==================

const SYNC_INTERVAL = 10 * 60 * 1000; // 10 分鐘
const STORAGE_KEY = 'tw-stock-sync-meta';
const STOCK_DATA_KEY = 'tw-stock-local-data';

// ================== 型別 ==================

interface SyncMeta {
    lastSyncTime: number;
    syncStatus: 'idle' | 'syncing' | 'success' | 'error';
    stockCount: number;
    errorMessage?: string;
}

interface LocalStockData {
    stocks: any[];
    fundamentals: any[];
    timestamp: number;
}

// ================== 狀態 ==================

let syncTimer: ReturnType<typeof setInterval> | null = null;
let currentStatus: SyncMeta = {
    lastSyncTime: 0,
    syncStatus: 'idle',
    stockCount: 0
};

// ================== 核心函式 ==================

/**
 * 取得最後同步時間
 */
export function getLastSyncTime(): number {
    try {
        const meta = localStorage.getItem(STORAGE_KEY);
        if (meta) {
            const parsed = JSON.parse(meta) as SyncMeta;
            return parsed.lastSyncTime;
        }
    } catch (e) { }
    return 0;
}

/**
 * 取得同步狀態
 */
export function getSyncStatus(): SyncMeta {
    try {
        const meta = localStorage.getItem(STORAGE_KEY);
        if (meta) {
            return JSON.parse(meta) as SyncMeta;
        }
    } catch (e) { }
    return currentStatus;
}

/**
 * 格式化時間差
 */
export function formatTimeSince(timestamp: number): string {
    if (timestamp === 0) return '尚未同步';

    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    return `${days} 天前`;
}

/**
 * 從 API 同步資料
 */
export async function syncFromAPI(): Promise<boolean> {
    updateSyncStatus('syncing');

    try {
        // 取得全部股票
        const response = await fetch('/api/screener', {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();

        if (data.success && data.stocks) {
            // 儲存到 localStorage
            const localData: LocalStockData = {
                stocks: data.stocks,
                fundamentals: data.fundamentals || [],
                timestamp: Date.now()
            };

            localStorage.setItem(STOCK_DATA_KEY, JSON.stringify(localData));

            updateSyncStatus('success', data.stocks.length);
            console.log('[Sync] Successfully synced', data.stocks.length, 'stocks');
            return true;
        }

        throw new Error('Invalid API response');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        updateSyncStatus('error', 0, message);
        console.warn('[Sync] Failed:', message);
        return false;
    }
}

/**
 * 取得本地儲存的資料
 */
export function getLocalData(): LocalStockData | null {
    try {
        const data = localStorage.getItem(STOCK_DATA_KEY);
        if (data) {
            return JSON.parse(data) as LocalStockData;
        }
    } catch (e) { }
    return null;
}

/**
 * 檢查資料是否過期
 */
export function isDataStale(maxAgeMs: number = SYNC_INTERVAL): boolean {
    const lastSync = getLastSyncTime();
    if (lastSync === 0) return true;
    return Date.now() - lastSync > maxAgeMs;
}

/**
 * 啟動背景同步
 */
export function startBackgroundSync(): void {
    if (syncTimer) {
        console.log('[Sync] Background sync already running');
        return;
    }

    console.log('[Sync] Starting background sync, interval:', SYNC_INTERVAL / 1000, 's');

    // 立即執行一次（如果資料過期）
    if (isDataStale()) {
        syncFromAPI();
    }

    // 設定定時器
    syncTimer = setInterval(() => {
        console.log('[Sync] Background sync triggered');
        syncFromAPI();
    }, SYNC_INTERVAL);
}

/**
 * 停止背景同步
 */
export function stopBackgroundSync(): void {
    if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
        console.log('[Sync] Background sync stopped');
    }
}

/**
 * 清除本地資料
 */
export function clearLocalData(): void {
    localStorage.removeItem(STOCK_DATA_KEY);
    localStorage.removeItem(STORAGE_KEY);
    currentStatus = {
        lastSyncTime: 0,
        syncStatus: 'idle',
        stockCount: 0
    };
    console.log('[Sync] Local data cleared');
}

// ================== 內部函式 ==================

function updateSyncStatus(
    status: SyncMeta['syncStatus'],
    stockCount?: number,
    errorMessage?: string
): void {
    currentStatus = {
        lastSyncTime: status === 'success' ? Date.now() : currentStatus.lastSyncTime,
        syncStatus: status,
        stockCount: stockCount ?? currentStatus.stockCount,
        errorMessage
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentStatus));

    // 發送自訂事件通知 UI 更新
    window.dispatchEvent(new CustomEvent('sync-status-changed', {
        detail: currentStatus
    }));
}
