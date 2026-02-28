/**
 * chart-theme.ts — Shared ECharts theme-aware color tokens
 * Returns appropriate colors for dark/light mode
 */

export function isDarkMode(): boolean {
    if (typeof document === 'undefined') return true;
    return document.documentElement.classList.contains('dark');
}

export interface ChartThemeColors {
    // Axis
    axisLabel: string;
    axisLine: string;
    splitLine: string;
    // Tooltip
    tooltipBg: string;
    tooltipBorder: string;
    tooltipText: string;
    // Text
    labelText: string;
    labelTextMuted: string;
    // Backgrounds
    bgSubtle: string;
    // Mark lines
    markLine: string;
    // Legend
    legendText: string;
    // Area gradient
    areaGradientTop: string;
    areaGradientBottom: string;
}

export function getChartColors(): ChartThemeColors {
    const dark = isDarkMode();
    return dark
        ? {
              axisLabel: 'rgba(255,255,255,0.4)',
              axisLine: 'rgba(255,255,255,0.1)',
              splitLine: 'rgba(255,255,255,0.05)',
              tooltipBg: 'rgba(15,23,42,0.9)',
              tooltipBorder: 'rgba(255,255,255,0.1)',
              tooltipText: '#fff',
              labelText: '#fff',
              labelTextMuted: 'rgba(255,255,255,0.7)',
              bgSubtle: 'rgba(255,255,255,0.03)',
              markLine: 'rgba(255,255,255,0.2)',
              legendText: 'rgba(128,128,128,0.6)',
              areaGradientTop: 'rgba(255,255,255,0.15)',
              areaGradientBottom: 'rgba(255,255,255,0.0)',
          }
        : {
              axisLabel: 'rgba(0,0,0,0.55)',
              axisLine: 'rgba(0,0,0,0.15)',
              splitLine: 'rgba(0,0,0,0.08)',
              tooltipBg: 'rgba(255,255,255,0.96)',
              tooltipBorder: 'rgba(0,0,0,0.12)',
              tooltipText: '#1e293b',
              labelText: '#1e293b',
              labelTextMuted: 'rgba(0,0,0,0.65)',
              bgSubtle: 'rgba(0,0,0,0.04)',
              markLine: 'rgba(0,0,0,0.2)',
              legendText: 'rgba(60,60,60,0.7)',
              areaGradientTop: 'rgba(0,0,0,0.1)',
              areaGradientBottom: 'rgba(0,0,0,0.0)',
          };
}

/** Listen for theme changes and call callback */
export function onThemeChange(callback: () => void): () => void {
    if (typeof document === 'undefined') return () => {};
    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.attributeName === 'class') {
                callback();
                break;
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
}
