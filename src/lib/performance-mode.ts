/**
 * Performance Mode Detection & Management
 * Automatically adjusts animations and effects based on device capabilities
 *
 * @module performance-mode
 * @version 1.0.0
 */

type PerformanceLevel = 'minimal' | 'low' | 'medium' | 'high';

interface PerformanceConfig {
    level: PerformanceLevel;
    isMobile: boolean;
    prefersReducedMotion: boolean;
    deviceMemoryGB: number;
    hasGPU: boolean;
}

/**
 * Initialize performance mode detection
 * Sets data-perf attribute on root element for CSS-based optimization
 */
export function initPerformanceMode(): PerformanceConfig {
    // 1. Detect device type
    const isMobile = /iPhone|iPad|Android|Mobile/.test(navigator.userAgent);

    // 2. Detect motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 3. Device memory estimation (Bytes to GB)
    const deviceMemoryGB = ((navigator as any).deviceMemory || 4) / 1; // Default: 4GB

    // 4. GPU detection (optional, can use WebGL context)
    const hasGPU = detectGPU();

    // 5. Determine performance level
    const level = determinePerformanceLevel(isMobile, prefersReducedMotion, deviceMemoryGB, hasGPU);

    // 6. Apply to DOM
    document.documentElement.setAttribute('data-perf', level);

    // 7. Log for debugging
    if (import.meta.env.DEV) {
        console.log('[Performance Mode]', {
            level,
            isMobile,
            prefersReducedMotion,
            deviceMemoryGB,
            hasGPU,
        });
    }

    return {
        level,
        isMobile,
        prefersReducedMotion,
        deviceMemoryGB,
        hasGPU,
    };
}

/**
 * Determine performance level based on device capabilities
 */
function determinePerformanceLevel(
    isMobile: boolean,
    prefersReducedMotion: boolean,
    deviceMemoryGB: number,
    hasGPU: boolean
): PerformanceLevel {
    // Highest priority: User preference for reduced motion
    if (prefersReducedMotion) {
        return 'minimal';
    }

    // Mobile device with low RAM
    if (isMobile && deviceMemoryGB < 2) {
        return 'low';
    }

    // Mobile device
    if (isMobile) {
        return 'medium';
    }

    // Desktop
    if (!hasGPU) {
        return 'medium';
    }

    return 'high';
}

/**
 * Detect GPU availability using WebGL
 */
function detectGPU(): boolean {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
    } catch (e) {
        return false;
    }
}

/**
 * Get current performance configuration
 */
export function getPerformanceConfig(): PerformanceConfig | null {
    const level = document.documentElement.getAttribute('data-perf') as PerformanceLevel | null;

    if (!level) return null;

    return {
        level,
        isMobile: /iPhone|iPad|Android|Mobile/.test(navigator.userAgent),
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        deviceMemoryGB: (navigator as any).deviceMemory || 4,
        hasGPU: detectGPU(),
    };
}

/**
 * Check if certain features should be enabled
 */
export function shouldEnableFeature(
    feature: 'animations' | 'blur' | 'shadows' | 'charts'
): boolean {
    const level = document.documentElement.getAttribute('data-perf') as PerformanceLevel | null;

    if (!level) return true; // Default: enable all

    const featureMatrix = {
        minimal: { animations: false, blur: false, shadows: false, charts: false },
        low: { animations: false, blur: false, shadows: true, charts: true },
        medium: { animations: true, blur: false, shadows: true, charts: true },
        high: { animations: true, blur: true, shadows: true, charts: true },
    };

    return featureMatrix[level]?.[feature] ?? true;
}

/**
 * Dynamically adjust CSS variables based on performance level
 */
export function applyPerformanceCSS(level: PerformanceLevel): void {
    const root = document.documentElement;

    switch (level) {
        case 'minimal':
            root.style.setProperty('--transition-smooth', '0s');
            root.style.setProperty('--ease-out', 'linear');
            break;
        case 'low':
            root.style.setProperty('--transition-smooth', '0.15s ease');
            root.style.setProperty('--ease-out', 'ease');
            break;
        case 'medium':
            root.style.setProperty('--transition-smooth', '0.3s cubic-bezier(0.16, 1, 0.3, 1)');
            root.style.setProperty('--ease-out', 'cubic-bezier(0.16, 1, 0.3, 1)');
            break;
        case 'high':
            root.style.setProperty('--transition-smooth', '0.4s cubic-bezier(0.16, 1, 0.3, 1)');
            root.style.setProperty('--ease-out', 'cubic-bezier(0.16, 1, 0.3, 1)');
            break;
    }
}

/**
 * Monitor performance metrics
 */
export function startPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
        try {
            // Monitor LCP (Largest Contentful Paint)
            const lcpObserver = new PerformanceObserver(entryList => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1] as any;
                console.log('[LCP]', lastEntry.renderTime || lastEntry.loadTime);
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

            // Monitor FID (First Input Delay)
            const fidObserver = new PerformanceObserver(entryList => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    console.log('[FID]', (entry as any).processingDuration);
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });

            // Monitor CLS (Cumulative Layout Shift)
            const clsObserver = new PerformanceObserver(entryList => {
                const entries = entryList.getEntries();
                let clsValue = 0;
                entries.forEach(entry => {
                    if (!(entry as any).hadRecentInput) {
                        clsValue += (entry as any).value;
                    }
                });
                console.log('[CLS]', clsValue);
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (err) {
            console.warn('[Performance Monitoring] Not supported on this browser');
        }
    }
}

/**
 * Network Information API - detect bandwidth
 */
export function getNetworkInfo(): { effectiveType: string; rtt?: number } | null {
    const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

    if (connection) {
        return {
            effectiveType: connection.effectiveType,
            rtt: connection.rtt,
        };
    }

    return null;
}

export default {
    initPerformanceMode,
    getPerformanceConfig,
    shouldEnableFeature,
    applyPerformanceCSS,
    startPerformanceMonitoring,
    getNetworkInfo,
};
