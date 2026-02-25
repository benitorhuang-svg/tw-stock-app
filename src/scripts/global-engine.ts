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
let ticking = false;
document.addEventListener('mousemove', (e: MouseEvent) => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
        const elements = document.querySelectorAll<HTMLElement>('.glow-interactive');
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
        ticking = false;
    });
});
