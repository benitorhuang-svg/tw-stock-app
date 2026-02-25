/**
 * Global Engine - Theme & Interactive FX
 */
import { registerServiceWorker } from '../lib/pwa';
import { initPerformanceMode } from '../lib/performance-mode';

// theme toggle logic
export function initTheme() {
    const icon = document.getElementById('theme-icon');
    const saved = localStorage.getItem('theme');

    if (saved === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }

    if (icon) {
        icon.textContent = document.documentElement.classList.contains('dark')
            ? '🌙'
            : '☀️';
    }
}

// Runs on initial load and after every page transition
initTheme();
document.addEventListener('astro:page-load', initTheme);

// Toggle button listener (manually re-bind due to script execution)
document.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const toggle = target.closest('#theme-toggle');
    if (toggle) {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        const icon = document.getElementById('theme-icon');
        if (icon) icon.textContent = isDark ? '🌙' : '☀️';
    }
});

// PWA Service Worker registration
registerServiceWorker();

// Performance mode detection
initPerformanceMode();

// Interactive Glow Tracker — follows cursor on .glow-interactive elements
// Optimized: Uses event delegation to avoid broad DOM loops and layout thrashing
document.addEventListener('mousemove', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const glowEl = target.closest('.glow-interactive') as HTMLElement;

    if (!glowEl) return;

    // Only update if mouse is actually moving over a glow element
    requestAnimationFrame(() => {
        const rect = glowEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        glowEl.style.setProperty('--mouse-x', `${x}px`);
        glowEl.style.setProperty('--mouse-y', `${y}px`);
    });
});
