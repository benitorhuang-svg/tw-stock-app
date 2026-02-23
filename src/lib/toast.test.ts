import { describe, it, expect, vi, beforeEach } from 'vitest';

// Cannot simply import the singleton because it caches container reference.
// Instead, test by re-importing each time or testing the class directly.

describe('Toast Manager', () => {
    let toast: any;

    beforeEach(async () => {
        // Clear any existing container
        const existing = document.getElementById('toast-container');
        if (existing) existing.remove();

        // Re-import fresh module to reset singleton state
        vi.resetModules();
        const mod = await import('./toast');
        toast = mod.toast;
    });

    describe('show', () => {
        it('應建立 toast-container', () => {
            toast.show({ message: 'Hello' });

            const container = document.getElementById('toast-container');
            expect(container).not.toBeNull();
        });

        it('應回傳唯一遞增 ID', () => {
            const id1 = toast.show({ message: 'first' });
            const id2 = toast.show({ message: 'second' });

            expect(typeof id1).toBe('number');
            expect(id2).toBeGreaterThan(id1);
        });

        it('應顯示正確的訊息文字', () => {
            toast.show({ message: '操作成功' });

            const container = document.getElementById('toast-container');
            expect(container?.textContent).toContain('操作成功');
        });

        it('success 應顯示 ✅ 圖標', () => {
            toast.show({ message: 'ok', type: 'success' });

            const container = document.getElementById('toast-container');
            expect(container?.textContent).toContain('✅');
        });

        it('error 應顯示 ❌ 圖標', () => {
            toast.show({ message: 'fail', type: 'error' });

            const container = document.getElementById('toast-container');
            expect(container?.textContent).toContain('❌');
        });

        it('warning 應顯示 ⚠️ 圖標', () => {
            toast.show({ message: 'warn', type: 'warning' });

            const container = document.getElementById('toast-container');
            expect(container?.textContent).toContain('⚠');
        });

        it('應包含關閉按鈕', () => {
            toast.show({ message: 'closable' });

            const closeBtn = document.querySelector('.toast-close');
            expect(closeBtn).not.toBeNull();
        });

        it('有 action 時應顯示按鈕', () => {
            const onClick = vi.fn();
            toast.show({
                message: 'with action',
                action: { label: 'Undo', onClick },
            });

            const actionBtn = document.querySelector('.toast-action');
            expect(actionBtn).not.toBeNull();
            expect(actionBtn?.textContent).toBe('Undo');
        });
    });

    describe('convenience methods', () => {
        it('success() 應建立 success toast', () => {
            const id = toast.success('成功');
            expect(typeof id).toBe('number');
            expect(document.querySelector('.toast-success')).not.toBeNull();
        });

        it('error() 應建立 error toast', () => {
            toast.error('錯誤');
            expect(document.querySelector('.toast-error')).not.toBeNull();
        });

        it('warning() 應建立 warning toast', () => {
            toast.warning('警告');
            expect(document.querySelector('.toast-warning')).not.toBeNull();
        });

        it('info() 應建立 info toast', () => {
            toast.info('提示');
            expect(document.querySelector('.toast-info')).not.toBeNull();
        });
    });

    describe('dismiss', () => {
        it('dismiss 不存在的 ID 不應報錯', () => {
            expect(() => toast.dismiss(99999)).not.toThrow();
        });

        it('dismissAll 不應報錯', () => {
            toast.show({ message: 'a', duration: 0 });
            toast.show({ message: 'b', duration: 0 });

            expect(() => toast.dismissAll()).not.toThrow();
        });
    });
});
