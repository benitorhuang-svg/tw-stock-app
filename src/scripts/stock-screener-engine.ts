/**
 * Core Engine for StockScreener.astro
 * EXTREME OPTIMIZATION: Row Caching, Throttled Paint, Manual GC
 */
import { toast } from '../lib/toast';
import type { ScreenerResult } from '../types/stock';

let screenerRendered = false;
let rowMap = new Map<string, HTMLElement>();
import { getEl } from '../lib/dom';

function initScreenerEngine() {
    const tbody = getEl('screener-results');
    if (!tbody) return;

    let activeStrategyName = '';

    let refreshTimeout: number | null = null;

    function renderResults(stocks: ScreenerResult[]) {
        rowMap.clear();
        tbody!.innerHTML = stocks
            .map(stock => {
                const isBull = (stock.changePercent || 0) >= 0;
                return `
                <tr tabindex="0" class="hover:bg-accent/5 transition-colors cursor-pointer border-b border-border/10" data-link="/stocks/${stock.symbol}" data-symbol="${stock.symbol}">
                    <td class="px-3 py-2 text-xs font-mono text-text-secondary">${stock.symbol}</td>
                    <td class="px-3 py-2 text-sm font-semibold text-text-primary uppercase tracking-tight">${stock.name || '—'}</td>
                    <td class="px-3 py-2 text-xs font-mono text-right text-text-secondary cell-price">${stock.price?.toFixed(2) || '—'}</td>
                    <td class="px-3 py-2 text-xs font-mono text-right ${isBull ? 'text-bullish' : 'text-bearish'}">${stock.changePercent?.toFixed(2) || '0.00'}%</td>
                    <td class="px-3 py-2 text-xs font-mono text-right text-text-secondary">${stock.fundamentals?.pe?.toFixed(1) || '—'}</td>
                    <td class="px-3 py-2 text-xs font-mono text-right text-text-secondary">${stock.fundamentals?.pb?.toFixed(2) || '—'}</td>
                    <td class="px-3 py-2 text-xs font-mono text-right text-text-secondary">${stock.fundamentals?.dividendYield?.toFixed(2) || '0.00'}%</td>
                    <td class="px-3 py-2 text-xs font-mono text-right text-text-secondary">${(stock.volume || 0).toLocaleString()}</td>
                    <td class="px-3 py-2 text-xs text-accent font-bold opacity-80">${(stock.matchedStrategies || []).join(' / ')}</td>
                </tr>`;
            })
            .join('');

        // Cache rows for instant SSE selection
        tbody!.querySelectorAll('tr[data-symbol]').forEach(row => {
            rowMap.set((row as HTMLElement).dataset.symbol!, row as HTMLElement);
        });
    }

    // Delegation
    tbody.addEventListener('click', e => {
        const h = (e.target as HTMLElement).closest<HTMLElement>('tr[data-link]')?.dataset.link;
        if (h) window.location.href = h;
    });

    document.querySelectorAll('[data-strategy]').forEach(card => {
        card.addEventListener('click', async () => {
            const strategyId = (card as HTMLElement).dataset.strategy;
            if (!strategyId) return;

            activeStrategyName = card.querySelector('h4, h3')?.textContent?.trim() || strategyId;
            getEl('active-strategy-label')!.textContent = activeStrategyName;

            try {
                tbody.innerHTML = Array.from({ length: 8 })
                    .map(
                        () =>
                            '<tr class="h-12"><td colspan="9"><div class="skeleton h-4"></div></td></tr>'
                    )
                    .join('');

                const res = await fetch('/api/screener', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ strategyId, limit: 50 }),
                });
                const data = await res.json();

                if (data.success) {

                    renderResults(data.results);
                    getEl('screener-count')!.textContent = data.pagination.total;
                    toast.show({ message: `Found ${data.results.length} stocks`, type: 'success' });
                }
            } catch (err) {
                toast.show({ message: 'Engine Error', type: 'error' });
            }
        });
    });

    // SSE Dynamic Updates (Fast-Patch)
    const win = window as any;
    if (typeof EventSource !== 'undefined' && !win.__screenerSSE) {
        win.__screenerSSE = new EventSource('/api/sse/stream');
        win.__screenerSSE.addEventListener('tick', (e: MessageEvent) => {
            const ticks = JSON.parse(e.data);
            requestAnimationFrame(() => {
                for (let i = 0; i < ticks.length; i++) {
                    const row = rowMap.get(ticks[i].symbol);
                    if (row) {
                        const cell = row.querySelector('.cell-price');
                        if (cell) cell.textContent = ticks[i].price.toFixed(2);
                        row.style.background = 'rgba(59, 130, 246, 0.05)';
                        setTimeout(() => (row.style.background = ''), 500);
                    }
                }
            });
        });
    }

    document.addEventListener(
        'astro:before-preparation',
        () => {
            if (win.__screenerSSE) {
                win.__screenerSSE.close();
                win.__screenerSSE = null;
            }
            if (refreshTimeout) clearTimeout(refreshTimeout);
            rowMap.clear();
        },
        { once: true }
    );
}

document.addEventListener('astro:page-load', () => {
    if (!getEl('screener-results')) {
        screenerRendered = false;
        return;
    }
    if (screenerRendered) return;
    screenerRendered = true;
    initScreenerEngine();
});
