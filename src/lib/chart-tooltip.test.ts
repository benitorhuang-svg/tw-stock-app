import { describe, it, expect, vi, beforeEach } from 'vitest';

// Need fresh imports per test because of module-level state (tooltipElement)
describe('Chart Tooltip', () => {
    let showTooltip: any;
    let hideTooltip: any;
    let bindChartTooltip: any;

    beforeEach(async () => {
        // Clean up previous tooltip
        const existing = document.getElementById('chart-tooltip');
        if (existing) existing.remove();

        vi.resetModules();
        const mod = await import('./chart-tooltip');
        showTooltip = mod.showTooltip;
        hideTooltip = mod.hideTooltip;
        bindChartTooltip = mod.bindChartTooltip;
    });

    describe('showTooltip', () => {
        it('應建立 tooltip 元素', () => {
            showTooltip(100, 200, {
                date: '2024/01/15',
                open: 100, high: 105, low: 98, close: 103
            });

            const tooltip = document.getElementById('chart-tooltip');
            expect(tooltip).not.toBeNull();
            expect(tooltip!.style.display).toBe('block');
        });

        it('應顯示 OHLC 資料', () => {
            showTooltip(100, 200, {
                date: '2024/01/15',
                open: 100, high: 105, low: 98, close: 103
            });

            const tooltip = document.getElementById('chart-tooltip');
            expect(tooltip!.textContent).toContain('2024/01/15');
            expect(tooltip!.textContent).toContain('100.00');
            expect(tooltip!.textContent).toContain('105.00');
            expect(tooltip!.textContent).toContain('98.00');
            expect(tooltip!.textContent).toContain('103.00');
        });

        it('有 volume 時應顯示成交量 (K 單位)', () => {
            showTooltip(100, 200, {
                date: '2024/01/15',
                open: 100, high: 105, low: 98, close: 103,
                volume: 50000
            });

            const tooltip = document.getElementById('chart-tooltip');
            expect(tooltip!.textContent).toContain('50K');
        });

        it('有 change 時應顯示漲跌額和百分比', () => {
            showTooltip(100, 200, {
                date: '2024/01/15',
                open: 100, high: 105, low: 98, close: 103,
                change: 3,
                changePercent: 3.0
            });

            const tooltip = document.getElementById('chart-tooltip');
            expect(tooltip!.textContent).toContain('+3.00');
            expect(tooltip!.textContent).toContain('3.00%');
        });

        it('上漲時應顯示 ▲', () => {
            showTooltip(100, 200, {
                date: '2024/01/15',
                open: 100, high: 105, low: 98, close: 103,
                change: 3, changePercent: 3.0
            });

            const tooltip = document.getElementById('chart-tooltip');
            expect(tooltip!.textContent).toContain('▲');
        });

        it('下跌時應顯示 ▼', () => {
            showTooltip(100, 200, {
                date: '2024/01/15',
                open: 105, high: 105, low: 98, close: 100,
                change: -5, changePercent: -4.76
            });

            const tooltip = document.getElementById('chart-tooltip');
            expect(tooltip!.textContent).toContain('▼');
        });
    });

    describe('hideTooltip', () => {
        it('應隱藏 tooltip', () => {
            showTooltip(100, 200, {
                date: '2024/01/15',
                open: 100, high: 105, low: 98, close: 103
            });

            hideTooltip();

            const tooltip = document.getElementById('chart-tooltip');
            expect(tooltip!.style.display).toBe('none');
        });

        it('tooltip 不存在時不應報錯', () => {
            expect(() => hideTooltip()).not.toThrow();
        });
    });

    describe('bindChartTooltip', () => {
        it('應回傳清理函式', () => {
            const canvas = document.createElement('canvas');
            const data = [
                { date: '2024/01/15', open: 100, high: 105, low: 98, close: 103 }
            ];

            const cleanup = bindChartTooltip(canvas, data, {
                padding: { left: 50, right: 20, top: 20, bottom: 30 },
                getBarIndex: (x: number) => Math.floor(x / 10)
            });

            expect(typeof cleanup).toBe('function');

            // 清理不應報錯
            expect(() => cleanup()).not.toThrow();
        });
    });
});
