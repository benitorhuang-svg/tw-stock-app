/**
 * 使用者帳戶管理
 * 使用 localStorage 儲存使用者設定與資料
 */

export interface UserProfile {
    id: string;
    name: string;
    createdAt: string;
    lastLoginAt: string;
}

export interface UserSettings {
    theme: 'dark' | 'light';
    defaultView: 'grid' | 'list';
    showVolume: boolean;
    showMA: boolean;
    maLines: number[];
    language: 'zh-TW' | 'en';
    notifications: {
        priceAlert: boolean;
        dividendReminder: boolean;
    };
}

export interface UserData {
    profile: UserProfile;
    settings: UserSettings;
    watchlist: string[];
    portfolioIds: number[];
    recentViewed: string[];
    customStrategies: any[];
}

const STORAGE_KEY = 'tw-stock-user';
const MAX_RECENT = 10;

// 預設值
const defaultSettings: UserSettings = {
    theme: 'dark',
    defaultView: 'grid',
    showVolume: true,
    showMA: true,
    maLines: [5, 20, 60],
    language: 'zh-TW',
    notifications: {
        priceAlert: false,
        dividendReminder: true,
    },
};

const defaultProfile: UserProfile = {
    id: generateUserId(),
    name: '投資者',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
};

function generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 取得使用者資料
 */
export function getUserData(): UserData {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored) as UserData;
            // 更新最後登入時間
            data.profile.lastLoginAt = new Date().toISOString();
            saveUserData(data);
            return data;
        }
    } catch (e) {
        console.error('[User] Failed to load user data:', e);
    }

    // 返回預設值
    const defaultData: UserData = {
        profile: { ...defaultProfile },
        settings: { ...defaultSettings },
        watchlist: [],
        portfolioIds: [],
        recentViewed: [],
        customStrategies: [],
    };
    saveUserData(defaultData);
    return defaultData;
}

/**
 * 儲存使用者資料
 */
export function saveUserData(data: UserData): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('[User] Failed to save user data:', e);
    }
}

/**
 * 取得使用者設定
 */
export function getSettings(): UserSettings {
    return getUserData().settings;
}

/**
 * 更新設定
 */
export function updateSettings(updates: Partial<UserSettings>): UserSettings {
    const data = getUserData();
    data.settings = { ...data.settings, ...updates };
    saveUserData(data);
    return data.settings;
}

/**
 * 取得使用者個人資料
 */
export function getProfile(): UserProfile {
    return getUserData().profile;
}

/**
 * 更新個人資料
 */
export function updateProfile(updates: Partial<UserProfile>): UserProfile {
    const data = getUserData();
    data.profile = { ...data.profile, ...updates };
    saveUserData(data);
    return data.profile;
}

/**
 * 自選股操作
 */
export function getWatchlist(): string[] {
    return getUserData().watchlist;
}

export function addToWatchlist(symbol: string): void {
    const data = getUserData();
    if (!data.watchlist.includes(symbol)) {
        data.watchlist.push(symbol);
        saveUserData(data);
    }
}

export function removeFromWatchlist(symbol: string): void {
    const data = getUserData();
    data.watchlist = data.watchlist.filter(s => s !== symbol);
    saveUserData(data);
}

export function isInWatchlist(symbol: string): boolean {
    return getUserData().watchlist.includes(symbol);
}

/**
 * 最近瀏覽
 */
export function addToRecentViewed(symbol: string): void {
    const data = getUserData();
    // 移除舊的
    data.recentViewed = data.recentViewed.filter(s => s !== symbol);
    // 加到最前面
    data.recentViewed.unshift(symbol);
    // 限制數量
    data.recentViewed = data.recentViewed.slice(0, MAX_RECENT);
    saveUserData(data);
}

export function getRecentViewed(): string[] {
    return getUserData().recentViewed;
}

/**
 * 匯出所有使用者資料
 */
export function exportUserData(): string {
    const data = getUserData();
    return JSON.stringify(data, null, 2);
}

/**
 * 匯入使用者資料
 */
export function importUserData(json: string): boolean {
    try {
        const data = JSON.parse(json) as UserData;
        // 驗證基本結構
        if (!data.profile || !data.settings) {
            throw new Error('Invalid user data format');
        }
        saveUserData(data);
        return true;
    } catch (e) {
        console.error('[User] Failed to import user data:', e);
        return false;
    }
}

/**
 * 重設所有資料
 */
export function resetUserData(): void {
    localStorage.removeItem(STORAGE_KEY);
    // 清除其他相關快取
    localStorage.removeItem('tw-watchlist');
    localStorage.removeItem('tw-portfolio');
    localStorage.removeItem('tw-stock-theme');
}

/**
 * 備份到檔案
 */
export function downloadBackup(): void {
    const data = exportUserData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tw-stock-backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 從檔案還原
 */
export async function restoreFromFile(file: File): Promise<boolean> {
    try {
        const text = await file.text();
        return importUserData(text);
    } catch (e) {
        console.error('[User] Failed to restore from file:', e);
        return false;
    }
}

/**
 * 策略儲存與獲取
 */
export function saveStrategy(strategy: any): void {
    const data = getUserData();
    if (!data.customStrategies) data.customStrategies = [];

    // Check if updating existing
    const idx = data.customStrategies.findIndex(s => s.id === strategy.id);
    if (idx !== -1) {
        data.customStrategies[idx] = strategy;
    } else {
        data.customStrategies.push(strategy);
    }
    saveUserData(data);
}

export function getStrategies(): any[] {
    return getUserData().customStrategies || [];
}
