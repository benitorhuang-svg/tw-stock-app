import { describe, it, expect, vi, beforeEach } from 'vitest';
import { keyboard } from './keyboard';

describe('Keyboard Shortcuts', () => {

    describe('register / unregister', () => {
        it('應註冊快捷鍵', () => {
            const handler = vi.fn();
            keyboard.register({
                key: 'a',
                ctrl: true,
                handler,
                description: 'Test'
            });

            const all = keyboard.getAll();
            expect(all.some(s => s.key === 'a' && s.ctrl)).toBe(true);
        });

        it('unregister 應移除快捷鍵', () => {
            const shortcut = {
                key: 'b',
                ctrl: true,
                handler: vi.fn(),
                description: 'To remove'
            };

            keyboard.register(shortcut);
            keyboard.unregister(shortcut);

            const all = keyboard.getAll();
            expect(all.some(s => s.key === 'b' && s.description === 'To remove')).toBe(false);
        });
    });

    describe('setEnabled', () => {
        it('應能啟用/停用', () => {
            expect(() => keyboard.setEnabled(false)).not.toThrow();
            expect(() => keyboard.setEnabled(true)).not.toThrow();
        });
    });

    describe('getAll', () => {
        it('應回傳所有已註冊的快捷鍵', () => {
            const before = keyboard.getAll().length;

            keyboard.register({
                key: 'z',
                handler: vi.fn(),
                description: 'Test Z'
            });

            expect(keyboard.getAll().length).toBeGreaterThanOrEqual(before + 1);
        });
    });

    describe('key composition', () => {
        it('Ctrl+Shift+key 應產生正確的組合鍵', () => {
            const handler = vi.fn();
            keyboard.register({
                key: 'f',
                ctrl: true,
                shift: true,
                handler,
                description: 'Ctrl+Shift+F'
            });

            const all = keyboard.getAll();
            expect(all.some(s => s.key === 'f' && s.ctrl && s.shift)).toBe(true);
        });
    });
});
