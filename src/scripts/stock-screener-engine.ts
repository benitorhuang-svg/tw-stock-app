/**
 * Core Engine for StockScreener.astro
 */
import { toast } from '../lib/toast';
import type { ScreenerFilterPayload, ScreenerResult } from '../types/stock';



let activeStrategyName = '';
let lastResults: ScreenerResult[] = [];
let activeFilters: ScreenerFilterPayload | null = null; // keep latest filter payload for auto-refresh
const resultsContainer = document.getElementById('screener-results');
const resultsGrid = document.getElementById('screener-results-grid');
const resultsCount = document.getElementById('screener-count');
const emptyState = document.getElementById('screener-empty');
const activeStrategyLabel = document.getElementById('active-strategy-label');
const csvExportBtn = document.getElementById('csv-export-btn');

const PRESET_PAYLOAD: Record<string, Partial<ScreenerFilterPayload>> = {
    'low-pe': { pe: { max: 15 } },
    'low-pb': { pb: { max: 1.5 } },
    'high-dividend': { dividendYield: { min: 5 } },
    'revenue-growth': { revenueYoY: { min: 10 } },
    'volume-breakout': {},
    breakout: {},
    'foreign-buy': {},
    'trust-buy': {},
};

const formatNum = (value: number | undefined | null, digits = 2) => {
    if (value === undefined || value === null || Number.isNaN(value)) return '—';
    return Number(value).toFixed(digits);
};

function renderResults(stocks: ScreenerResult[]) {
    if (!resultsGrid) return;

    resultsGrid.innerHTML = stocks
        .map(
            stock => `
            <tr tabindex="0" class="hover:bg-accent/5 transition-colors cursor-pointer" data-link="/stocks/${stock.symbol}" data-symbol="${stock.symbol}">
                <td class="px-3 py-2 text-xs font-mono text-text-secondary">${stock.symbol}</td>
                <td class="px-3 py-2 text-sm font-semibold text-text-primary">${stock.name || '—'}</td>
                <td class="px-3 py-2 text-xs font-mono text-right text-text-secondary">${formatNum(stock.price)}</td>
                <td class="px-3 py-2 text-xs font-mono text-right ${Number(stock.changePercent) >= 0 ? 'text-bullish' : 'text-bearish'}">${formatNum(stock.changePercent)}%</td>
                <td class="px-3 py-2 text-xs font-mono text-right text-text-secondary">${formatNum(stock.fundamentals?.pe, 1)}</td>
                <td class="px-3 py-2 text-xs font-mono text-right text-text-secondary">${formatNum(stock.fundamentals?.pb, 2)}</td>
                <td class="px-3 py-2 text-xs font-mono text-right text-text-secondary">${formatNum(stock.fundamentals?.dividendYield, 2)}%</td>
                <td class="px-3 py-2 text-xs font-mono text-right text-text-secondary">${Number(stock.volume || 0).toLocaleString()}</td>
                <td class="px-3 py-2 text-xs text-accent">${(stock.matchedStrategies || []).join(' / ')}</td>
            </tr>
        `
        )
        .join('');
}

resultsGrid?.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLTableRowElement>('tr[data-link]');
    const href = row?.dataset.link;
    if (href) window.location.href = href;
});
// support keyboard navigation (Enter to follow link)
resultsGrid?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        const row = (event.target as HTMLElement).closest<HTMLTableRowElement>('tr[data-link]');
        const href = row?.dataset.link;
        if (href) window.location.href = href;
    }
});

// Strategy card click handling
document.querySelectorAll('[data-strategy]').forEach(card => {
    card.addEventListener('click', async () => {
        const strategyId = (card as HTMLElement).dataset.strategy;
        if (!strategyId) return;

        // Visual active state
        document.querySelectorAll('[data-strategy]').forEach(c => {
            c.classList.remove('border-accent/50', 'bg-accent/5');
        });
        card.classList.add('border-accent/50', 'bg-accent/5');

        activeStrategyName =
            card.querySelector('h4')?.textContent?.trim() ||
            card.querySelector('h3')?.textContent?.trim() ||
            strategyId;
        if (activeStrategyLabel) activeStrategyLabel.textContent = activeStrategyName;

        const filters: ScreenerFilterPayload = {
            page: 1,
            limit: 50,
            strategyId,
            ...(PRESET_PAYLOAD[strategyId] || {}),
        };
        activeFilters = { ...filters };

        try {
            // Show loading state
            if (resultsCount) resultsCount.textContent = '...';
            emptyState?.classList.add('hidden');
            resultsContainer?.classList.remove('hidden');
            if (resultsGrid)
                resultsGrid.innerHTML = Array.from({ length: 8 })
                    .map(
                        () =>
                            '<tr class="table-loading-row border-b border-border/30"><td colspan="9"><div class="skeleton"></div></td></tr>'
                    )
                    .join('');

            const res = await fetch('/api/screener', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filters),
            });

            const data = await res.json();

            if (data.success) {
                if (resultsCount) resultsCount.textContent = data.pagination.total;
                lastResults = data.results;
                renderResults(data.results);
                csvExportBtn?.classList.toggle('hidden', data.results.length === 0);

                if (data.results.length === 0) {
                    if (resultsGrid)
                        resultsGrid.innerHTML =
                            '<tr><td colspan="9" class="py-12 text-center text-text-muted text-sm italic">沒有符合條件的股票</td></tr>';
                } else {
                    toast.show({
                        message: `找到 ${data.results.length} 檔符合「${activeStrategyName}」`,
                        type: 'success',
                        duration: 2500,
                    });
                }
            } else {
                if (resultsGrid)
                    resultsGrid.innerHTML = `<tr><td colspan="9" class="py-12 text-center text-bearish text-sm">${data.error || '查詢失敗'}</td></tr>`;
                if (resultsCount) resultsCount.textContent = '0';
                csvExportBtn?.classList.add('hidden');
                toast.show({ message: data.error || '篩選查詢失敗', type: 'error' });
            }
        } catch (err) {
            console.error('[Screener] Fetch error:', err);
            if (resultsGrid)
                resultsGrid.innerHTML =
                    '<tr><td colspan="9" class="py-12 text-center text-bearish text-sm">無法連線到篩選服務，請稍後再試</td></tr>';
            if (resultsCount) resultsCount.textContent = '0';
            csvExportBtn?.classList.add('hidden');
            toast.show({ message: '無法連線到篩選服務', type: 'error' });
        }
    });
});

// CSV Export
csvExportBtn?.addEventListener('click', () => {
    if (lastResults.length === 0) return;
    const headers = [
        '股票代號',
        '股票名稱',
        '價格',
        '漲跌幅%',
        '本益比',
        '股價淨值比',
        '殖利率',
        '成交量',
        '策略',
    ];
    const rows = lastResults.map((s: ScreenerResult) => [
        s.symbol,
        s.name || '',
        s.price ?? '',
        s.changePercent ?? '',
        s.fundamentals?.pe ?? '',
        s.fundamentals?.pb ?? '',
        s.fundamentals?.dividendYield ?? '',
        s.volume ?? '',
        (s.matchedStrategies || []).join('; '),
    ]);
    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(c => `"${c}"`).join(',')),
    ].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `選股結果_${activeStrategyName}_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.show({
        message: `已匯出 ${lastResults.length} 筆結果`,
        type: 'success',
        duration: 2000,
    });
});

// real-time price updates for screener results
if (typeof EventSource !== 'undefined') {
    const es = new EventSource('/api/sse/stream');
    es.addEventListener('tick', e => {
        try {
            const ticks = JSON.parse(e.data);
            ticks.forEach((t: { symbol: string; price: number }) => {
                const row = document.querySelector(`tr[data-symbol="${t.symbol}"]`);
                if (row) {
                    const priceCell = row.querySelector('td:nth-child(3)');
                    if (priceCell) priceCell.textContent = t.price.toFixed(2);
                    row.classList.add('flash');
                    setTimeout(() => row.classList.remove('flash'), 800);
                }
            });
            // auto-refresh current screener results (throttled)
            if (activeFilters) {
                const win = window as unknown as { __screenerRefreshTimeout: number | null };
                if (!win.__screenerRefreshTimeout) {
                    win.__screenerRefreshTimeout = window.setTimeout(async () => {
                        try {
                            const res = await fetch('/api/screener', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(activeFilters),
                            });
                            const data = await res.json();
                            if (data.success) {
                                lastResults = data.results;
                                renderResults(data.results);
                            }
                        } catch { }
                        win.__screenerRefreshTimeout = null;
                    }, 5000);
                }
            }
        } catch (err) {
            console.error('[SSE tick] parse error', err);
        }
    });
}

// Column-header sorting
function sortResultsBy(colIndex: number) {
    const keys = [
        'symbol',
        'name',
        'price',
        'changePercent',
        'pe',
        'pb',
        'dividendYield',
        'volume',
        'matchedStrategies',
    ];
    const key = keys[colIndex] || 'symbol';
    lastResults.sort((a, b) => {
        let va: string | number = 0, vb: string | number = 0;
        if (['pe', 'pb', 'dividendYield'].includes(key)) {
            va = (a.fundamentals as Record<string, number>)[key] ?? 0;
            vb = (b.fundamentals as Record<string, number>)[key] ?? 0;
        } else if (key === 'matchedStrategies') {
            va = (a.matchedStrategies || []).join(', ');
            vb = (b.matchedStrategies || []).join(', ');
        } else {
            va = (a as unknown as Record<string, string | number>)[key] ?? 0;
            vb = (b as unknown as Record<string, string | number>)[key] ?? 0;
        }
        if (typeof va === 'number' && typeof vb === 'number') return va - vb;
        return String(va).localeCompare(String(vb));
    });
    renderResults(lastResults);
}

document.querySelectorAll('#screener-table th').forEach((th, i) => {
    th.addEventListener('click', () => sortResultsBy(i));
});
