import { describe, it, expect, vi } from 'vitest';
import { formatTimeSince } from './data-sync';

describe('Data Sync Service', () => {
    describe('formatTimeSince', () => {
        it('0 時應顯示「尚未同步」', () => {
            expect(formatTimeSince(0)).toBe('尚未同步');
        });

        it('剛剛同步應顯示「剛剛」', () => {
            const now = Date.now();
            expect(formatTimeSince(now - 30000)).toBe('剛剛'); // 30 秒前
        });

        it('5 分鐘前應顯示分鐘', () => {
            const now = Date.now();
            expect(formatTimeSince(now - 5 * 60000)).toBe('5 分鐘前');
        });

        it('2 小時前應顯示小時', () => {
            const now = Date.now();
            expect(formatTimeSince(now - 2 * 3600000)).toBe('2 小時前');
        });

        it('2 天前應顯示天數', () => {
            const now = Date.now();
            expect(formatTimeSince(now - 2 * 86400000)).toBe('2 天前');
        });

        it('59 分鐘前應顯示分鐘', () => {
            const now = Date.now();
            expect(formatTimeSince(now - 59 * 60000)).toBe('59 分鐘前');
        });

        it('23 小時前應顯示小時', () => {
            const now = Date.now();
            expect(formatTimeSince(now - 23 * 3600000)).toBe('23 小時前');
        });
    });
});
