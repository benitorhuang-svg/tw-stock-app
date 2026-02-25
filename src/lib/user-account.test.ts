import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getUserData,
    getSettings,
    updateSettings,
    getProfile,
    updateProfile,
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    addToRecentViewed,
    getRecentViewed,
    exportUserData,
    importUserData,
    resetUserData,
} from './user-account';
import type { UserData } from './user-account';

// Mock localStorage
const store: Record<string, string> = {};
const mockLocalStorage = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
        delete store[key];
    }),
    clear: vi.fn(() => {
        Object.keys(store).forEach(k => delete store[k]);
    }),
};

beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.spyOn(console, 'error').mockImplementation(() => { });
});

describe('User Account Module', () => {
    // ========================================
    // getUserData
    // ========================================

    describe('getUserData', () => {
        it('首次取得應回傳預設值', () => {
            const data = getUserData();

            expect(data.profile).toBeDefined();
            expect(data.profile.name).toBe('投資者');
            expect(data.profile.id).toMatch(/^user_/);
            expect(data.settings.theme).toBe('dark');
            expect(data.settings.language).toBe('zh-TW');
            expect(data.watchlist).toEqual([]);
            expect(data.recentViewed).toEqual([]);
        });

        it('應從 localStorage 載入已存資料', () => {
            const saved: UserData = {
                profile: {
                    id: 'test_1',
                    name: 'Test',
                    createdAt: '2025-01-01',
                    lastLoginAt: '2025-01-01',
                },
                settings: {
                    theme: 'light',
                    defaultView: 'list',
                    showVolume: false,
                    showMA: false,
                    maLines: [10],
                    language: 'en',
                    notifications: { priceAlert: true, dividendReminder: false },
                },
                watchlist: ['2330'],
                portfolioIds: [],
                recentViewed: ['2317'],
                customStrategies: [],
            };
            store['tw-stock-user'] = JSON.stringify(saved);

            const data = getUserData();

            expect(data.profile.id).toBe('test_1');
            expect(data.profile.name).toBe('Test');
            expect(data.settings.theme).toBe('light');
            expect(data.watchlist).toEqual(['2330']);
        });

        it('損壞的 JSON 應回傳預設值', () => {
            store['tw-stock-user'] = '{invalid json!!!}';

            const data = getUserData();

            expect(data.profile.name).toBe('投資者');
            expect(data.settings.theme).toBe('dark');
        });

        it('應更新 lastLoginAt', () => {
            const saved: UserData = {
                profile: {
                    id: 'test_1',
                    name: 'Test',
                    createdAt: '2020-01-01',
                    lastLoginAt: '2020-01-01',
                },
                settings: {
                    theme: 'dark',
                    defaultView: 'grid',
                    showVolume: true,
                    showMA: true,
                    maLines: [5, 20, 60],
                    language: 'zh-TW',
                    notifications: { priceAlert: false, dividendReminder: true },
                },
                watchlist: [],
                portfolioIds: [],
                recentViewed: [],
                customStrategies: [],
            };
            store['tw-stock-user'] = JSON.stringify(saved);

            const data = getUserData();

            expect(data.profile.lastLoginAt).not.toBe('2020-01-01');
        });
    });

    // ========================================
    // Settings
    // ========================================

    describe('getSettings / updateSettings', () => {
        it('應取得預設設定', () => {
            const settings = getSettings();

            expect(settings.theme).toBe('dark');
            expect(settings.showVolume).toBe(true);
            expect(settings.maLines).toEqual([5, 20, 60]);
        });

        it('應更新部分設定', () => {
            const updated = updateSettings({ theme: 'light', showMA: false });

            expect(updated.theme).toBe('light');
            expect(updated.showMA).toBe(false);
            // 其他設定應保留
            expect(updated.showVolume).toBe(true);
        });

        it('連續更新應正確累積', () => {
            updateSettings({ theme: 'light' });
            updateSettings({ language: 'en' });

            const settings = getSettings();
            expect(settings.theme).toBe('light');
            expect(settings.language).toBe('en');
        });
    });

    // ========================================
    // Profile
    // ========================================

    describe('getProfile / updateProfile', () => {
        it('應取得預設個人資料', () => {
            const profile = getProfile();

            expect(profile.name).toBe('投資者');
            expect(profile.id).toMatch(/^user_/);
        });

        it('應更新名稱', () => {
            const updated = updateProfile({ name: '巴菲特' });

            expect(updated.name).toBe('巴菲特');
            // id 不應被覆蓋
            expect(updated.id).toMatch(/^user_/);
        });
    });

    // ========================================
    // Watchlist
    // ========================================

    describe('Watchlist', () => {
        it('初始自選股應為空', () => {
            expect(getWatchlist()).toEqual([]);
        });

        it('addToWatchlist 應新增股票', () => {
            addToWatchlist('2330');
            addToWatchlist('2317');

            expect(getWatchlist()).toContain('2330');
            expect(getWatchlist()).toContain('2317');
        });

        it('重複新增應不產生重複', () => {
            addToWatchlist('2330');
            addToWatchlist('2330');

            const list = getWatchlist();
            expect(list.filter(s => s === '2330')).toHaveLength(1);
        });

        it('removeFromWatchlist 應移除股票', () => {
            addToWatchlist('2330');
            addToWatchlist('2317');
            removeFromWatchlist('2330');

            expect(getWatchlist()).not.toContain('2330');
            expect(getWatchlist()).toContain('2317');
        });

        it('isInWatchlist 應正確判斷', () => {
            addToWatchlist('2330');

            expect(isInWatchlist('2330')).toBe(true);
            expect(isInWatchlist('9999')).toBe(false);
        });
    });

    // ========================================
    // Recent Viewed
    // ========================================

    describe('Recent Viewed', () => {
        it('初始應為空', () => {
            expect(getRecentViewed()).toEqual([]);
        });

        it('應加到最前面', () => {
            addToRecentViewed('2330');
            addToRecentViewed('2317');

            const recent = getRecentViewed();
            expect(recent[0]).toBe('2317');
            expect(recent[1]).toBe('2330');
        });

        it('重複瀏覽應移到最前面（不重複）', () => {
            addToRecentViewed('2330');
            addToRecentViewed('2317');
            addToRecentViewed('2330');

            const recent = getRecentViewed();
            expect(recent[0]).toBe('2330');
            expect(recent).toHaveLength(2);
        });

        it('應限制最多 10 筆', () => {
            for (let i = 0; i < 15; i++) {
                addToRecentViewed(`${1000 + i}`);
            }

            expect(getRecentViewed()).toHaveLength(10);
        });
    });

    // ========================================
    // Export / Import
    // ========================================

    describe('exportUserData / importUserData', () => {
        it('exportUserData 應回傳有效 JSON', () => {
            addToWatchlist('2330');

            const json = exportUserData();
            const parsed = JSON.parse(json);

            expect(parsed.profile).toBeDefined();
            expect(parsed.settings).toBeDefined();
            expect(parsed.watchlist).toContain('2330');
        });

        it('importUserData 應還原資料', () => {
            const importData: UserData = {
                profile: {
                    id: 'import_1',
                    name: 'Imported',
                    createdAt: '2025-01-01',
                    lastLoginAt: '2025-01-01',
                },
                settings: {
                    theme: 'light',
                    defaultView: 'list',
                    showVolume: false,
                    showMA: true,
                    maLines: [10, 30],
                    language: 'en',
                    notifications: { priceAlert: true, dividendReminder: false },
                },
                watchlist: ['2330', '2317'],
                portfolioIds: [1, 2],
                recentViewed: ['2454'],
                customStrategies: [],
            };

            const result = importUserData(JSON.stringify(importData));

            expect(result).toBe(true);
            expect(getProfile().name).toBe('Imported');
            expect(getSettings().theme).toBe('light');
            expect(getWatchlist()).toContain('2317');
        });

        it('無效 JSON 應回傳 false', () => {
            const result = importUserData('not json!!');
            expect(result).toBe(false);
        });

        it('缺少 profile 應回傳 false', () => {
            const result = importUserData(JSON.stringify({ settings: {} }));
            expect(result).toBe(false);
        });

        it('缺少 settings 應回傳 false', () => {
            const result = importUserData(JSON.stringify({ profile: {} }));
            expect(result).toBe(false);
        });
    });

    // ========================================
    // resetUserData
    // ========================================

    describe('resetUserData', () => {
        it('應清除所有 localStorage 項目', () => {
            addToWatchlist('2330');
            updateSettings({ theme: 'light' });

            resetUserData();

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('tw-stock-user');
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('tw-watchlist');
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('tw-portfolio');
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('tw-stock-theme');
        });
    });
});
