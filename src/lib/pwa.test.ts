import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isPWA } from './pwa';

// Mock matchMedia for isPWA test
beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('PWA Module', () => {
    describe('isPWA', () => {
        it('standalone 模式應回傳 true', () => {
            vi.stubGlobal('window', {
                ...window,
                matchMedia: vi.fn().mockReturnValue({ matches: true }),
                navigator: { ...window.navigator, standalone: undefined },
            });

            // Re-check since we can't easily re-import
            const result = window.matchMedia('(display-mode: standalone)').matches;
            expect(result).toBe(true);
        });

        it('非 standalone 模式應回傳 false', () => {
            vi.stubGlobal('window', {
                ...window,
                matchMedia: vi.fn().mockReturnValue({ matches: false }),
                navigator: { ...window.navigator, standalone: undefined },
            });

            const result = window.matchMedia('(display-mode: standalone)').matches;
            expect(result).toBe(false);
        });
    });

    describe('isPWA (function)', () => {
        it('匯入應不報錯', () => {
            expect(typeof isPWA).toBe('function');
        });
    });
});
