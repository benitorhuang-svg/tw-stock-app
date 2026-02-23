import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateVisibleItems, throttle, debounce } from './lazy-load';

describe('Lazy Load Utilities', () => {
    // ========================================
    // calculateVisibleItems (Virtual Scrolling)
    // ========================================

    describe('calculateVisibleItems', () => {
        const items = Array.from({ length: 100 }, (_, i) => i);

        it('顯示區域從頂部開始、overscan=5', () => {
            const result = calculateVisibleItems(items, 500, 0, 50, 5);

            expect(result.startIndex).toBe(0);
            expect(result.endIndex).toBeGreaterThan(0);
            expect(result.offset).toBe(0);
        });

        it('捲動到中間位置', () => {
            const result = calculateVisibleItems(items, 500, 2500, 50, 5);

            // scrollTop=2500, itemHeight=50 → 第50項
            // startIndex = max(0, 50 - 5) = 45
            expect(result.startIndex).toBe(45);
            expect(result.offset).toBe(45 * 50);
        });

        it('捲動到底部不應超出陣列', () => {
            const result = calculateVisibleItems(items, 500, 5000, 50, 5);

            expect(result.endIndex).toBeLessThanOrEqual(items.length);
        });

        it('空陣列應正確處理', () => {
            const result = calculateVisibleItems([], 500, 0, 50);

            expect(result.startIndex).toBe(0);
            expect(result.endIndex).toBe(0);
        });

        it('overscan=0 應只顯示可見區域', () => {
            const result = calculateVisibleItems(items, 200, 0, 50, 0);

            // 200 / 50 = 4 visible items
            expect(result.startIndex).toBe(0);
            expect(result.endIndex).toBe(4);
        });

        it('大 overscan 不應超出陣列範圍', () => {
            const smallItems = [1, 2, 3];
            const result = calculateVisibleItems(smallItems, 500, 0, 50, 100);

            expect(result.endIndex).toBeLessThanOrEqual(smallItems.length);
        });
    });

    // ========================================
    // throttle
    // ========================================

    describe('throttle', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        it('首次呼叫應立即執行', () => {
            const fn = vi.fn();
            const throttled = throttle(fn, 100);

            throttled();

            expect(fn).toHaveBeenCalledOnce();
        });

        it('delay 內連續呼叫應被節流', () => {
            const fn = vi.fn();
            const throttled = throttle(fn, 100);

            throttled(); // 立即執行
            throttled(); // 被節流
            throttled(); // 被節流

            expect(fn).toHaveBeenCalledOnce();
        });

        it('delay 過後應能再次執行', () => {
            const fn = vi.fn();
            const throttled = throttle(fn, 100);

            throttled();
            vi.advanceTimersByTime(150);
            throttled();

            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('應傳遞正確的參數', () => {
            const fn = vi.fn();
            const throttled = throttle(fn, 100);

            throttled('a', 'b');

            expect(fn).toHaveBeenCalledWith('a', 'b');
        });

        it('尾端呼叫應在 delay 後執行', () => {
            const fn = vi.fn();
            const throttled = throttle(fn, 100);

            throttled(); // 立即
            throttled(); // 排程尾端呼叫

            vi.advanceTimersByTime(150);

            expect(fn).toHaveBeenCalledTimes(2);
        });
    });

    // ========================================
    // debounce
    // ========================================

    describe('debounce', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        it('應延遲執行', () => {
            const fn = vi.fn();
            const debounced = debounce(fn, 100);

            debounced();

            expect(fn).not.toHaveBeenCalled();

            vi.advanceTimersByTime(150);

            expect(fn).toHaveBeenCalledOnce();
        });

        it('連續呼叫只應執行最後一次', () => {
            const fn = vi.fn();
            const debounced = debounce(fn, 100);

            debounced('a');
            debounced('b');
            debounced('c');

            vi.advanceTimersByTime(150);

            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith('c');
        });

        it('間隔足夠長時應各自執行', () => {
            const fn = vi.fn();
            const debounced = debounce(fn, 100);

            debounced('first');
            vi.advanceTimersByTime(150);

            debounced('second');
            vi.advanceTimersByTime(150);

            expect(fn).toHaveBeenCalledTimes(2);
            expect(fn).toHaveBeenNthCalledWith(1, 'first');
            expect(fn).toHaveBeenNthCalledWith(2, 'second');
        });

        it('快速連續呼叫應重置計時器', () => {
            const fn = vi.fn();
            const debounced = debounce(fn, 100);

            debounced();
            vi.advanceTimersByTime(50);
            debounced();
            vi.advanceTimersByTime(50);
            debounced();
            vi.advanceTimersByTime(50);

            expect(fn).not.toHaveBeenCalled();

            vi.advanceTimersByTime(100);

            expect(fn).toHaveBeenCalledOnce();
        });
    });
});
