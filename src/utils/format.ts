/**
 * format.ts — Shared Formatting Utilities (Atom Layer)
 * 
 * Consolidates all duplicated formatting functions across the codebase
 * into a single source of truth.
 */

/**
 * Format volume number to readable Chinese abbreviated string.
 * @example fmtVol(150000000) => "1.5億"
 * @example fmtVol(52300)     => "5.2萬"
 * @example fmtVol(800)       => "800"
 * @example fmtVol(0)         => "—"
 */
export function fmtVol(v: number): string {
    const cv = Math.ceil(v);
    if (cv >= 1_0000_0000) return `${(cv / 1_0000_0000).toFixed(1)}億`;
    if (cv >= 10000) return `${(cv / 10000).toFixed(1)}萬`;
    if (cv > 0) return cv.toLocaleString('zh-TW');
    return '—';
}

/**
 * Format percentage with sign prefix.
 * @example fmtPct(3.5)  => "+3.50%"
 * @example fmtPct(-1.2) => "-1.20%"
 */
export function fmtPct(v: number): string {
    return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
}

/**
 * Format price to 2 decimal places, or "—" if zero/invalid.
 */
export function fmtPrice(v: number): string {
    return v > 0 ? v.toFixed(2) : '—';
}
