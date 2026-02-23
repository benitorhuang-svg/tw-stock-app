/**
 * 懶載入工具
 * 使用 Intersection Observer 實現圖片和元件懶載入
 */

export interface LazyLoadOptions {
    root?: Element | null;
    rootMargin?: string;
    threshold?: number | number[];
    onLoad?: (element: Element) => void;
}

/**
 * 初始化懶載入
 */
export function initLazyLoad(options: LazyLoadOptions = {}): IntersectionObserver {
    const { root = null, rootMargin = '200px', threshold = 0, onLoad } = options;

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;

                    // 處理圖片
                    if (element instanceof HTMLImageElement && element.dataset.src) {
                        element.src = element.dataset.src;
                        delete element.dataset.src;
                    }

                    // 處理背景圖片
                    if (element.dataset.bg) {
                        (element as HTMLElement).style.backgroundImage =
                            `url(${element.dataset.bg})`;
                        delete element.dataset.bg;
                    }

                    // 處理 iframe
                    if (element instanceof HTMLIFrameElement && element.dataset.src) {
                        element.src = element.dataset.src;
                        delete element.dataset.src;
                    }

                    // 移除載入中樣式
                    element.classList.remove('lazy');
                    element.classList.add('loaded');

                    // 觸發回調
                    onLoad?.(element);

                    // 停止觀察
                    observer.unobserve(element);
                }
            });
        },
        { root, rootMargin, threshold }
    );

    return observer;
}

/**
 * 觀察懶載入元素
 */
export function observeLazyElements(
    selector: string = '[data-src], [data-bg], .lazy',
    observer?: IntersectionObserver
): IntersectionObserver {
    const obs = observer || initLazyLoad();

    document.querySelectorAll(selector).forEach(element => {
        obs.observe(element);
    });

    return obs;
}

/**
 * 預取資料
 * 預先載入可能需要的頁面或資源
 */
export function prefetch(urls: string[]): void {
    if (!('requestIdleCallback' in window)) {
        // 降級處理
        urls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
        });
        return;
    }

    requestIdleCallback(() => {
        urls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
        });
    });
}

/**
 * 預連接
 * 預先建立到目標伺服器的連接
 */
export function preconnect(origins: string[]): void {
    origins.forEach(origin => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    });
}

/**
 * 虛擬滾動輔助
 * 計算可見區域內應該渲染的項目
 */
export function calculateVisibleItems<T>(
    items: T[],
    containerHeight: number,
    scrollTop: number,
    itemHeight: number,
    overscan: number = 5
): { startIndex: number; endIndex: number; offset: number } {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);
    const offset = startIndex * itemHeight;

    return { startIndex, endIndex, offset };
}

/**
 * 節流函式
 */
export function throttle<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        const now = Date.now();
        const remaining = delay - (now - lastCall);

        if (remaining <= 0) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            lastCall = now;
            fn(...args);
        } else if (!timeout) {
            timeout = setTimeout(() => {
                lastCall = Date.now();
                timeout = null;
                fn(...args);
            }, remaining);
        }
    };
}

/**
 * 防抖函式
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}
