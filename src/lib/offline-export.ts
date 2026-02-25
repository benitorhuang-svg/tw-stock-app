/**
 * 離線 HTML 匯出
 * 一鍵匯出完整單頁 HTML，可離線使用
 */

import { stockList } from '../data/stocks';
import { strategies } from '../data/strategies';

interface ExportOptions {
    includeCharts: boolean;
    includePortfolio: boolean;
    includeWatchlist: boolean;
    compressData: boolean;
}

const defaultOptions: ExportOptions = {
    includeCharts: true,
    includePortfolio: true,
    includeWatchlist: true,
    compressData: true,
};

/**
 * 一鍵匯出離線 HTML
 */
export async function exportOfflineHTML(options: Partial<ExportOptions> = {}): Promise<void> {
    const opts = { ...defaultOptions, ...options };

    // 收集資料
    const userData = localStorage.getItem('tw-stock-user') || '{}';
    const portfolioData = localStorage.getItem('tw-portfolio') || '[]';
    const watchlistData = localStorage.getItem('tw-watchlist') || '[]';

    // 生成 HTML
    const html = generateOfflineHTML({
        stocks: stockList,
        strategies,
        userData: JSON.parse(userData),
        portfolio: opts.includePortfolio ? JSON.parse(portfolioData) : [],
        watchlist: opts.includeWatchlist ? JSON.parse(watchlistData) : [],
    });

    // 下載
    downloadHTML(html, `TW_Stock_App_${formatDate()}.html`);
}

function formatDate(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

function downloadHTML(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function generateOfflineHTML(data: any): string {
    const { stocks, portfolio, watchlist } = data;

    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TW Stock App - 離線版</title>
    <style>
        ${getEmbeddedCSS()}
    </style>
</head>
<body>
    <div id="app">
        <!-- 側邊欄 -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo">📈 TW Stock (離線版)</div>
            </div>
            <nav class="nav-menu">
                <button class="nav-item active" data-page="home">🏠 首頁</button>
                <button class="nav-item" data-page="stocks">📊 個股列表</button>
                <button class="nav-item" data-page="portfolio">💼 投資組合</button>
                <button class="nav-item" data-page="watchlist">⭐ 自選股</button>
            </nav>
            <div class="sidebar-footer">
                <button id="theme-toggle" class="theme-btn">🌙 深色</button>
                <div class="export-time">匯出時間: ${new Date().toLocaleString('zh-TW')}</div>
            </div>
        </aside>

        <!-- 主內容區 -->
        <main class="main-content">
            <!-- 首頁 -->
            <section id="page-home" class="page active">
                <h1>📈 台灣股票分析平台（離線版）</h1>
                <div class="info-banner">
                    <p>📅 資料日期: ${new Date().toLocaleDateString('zh-TW')}</p>
                    <p>📊 共 ${stocks.length} 檔股票</p>
                </div>
                
                <h2>🔥 漲幅排行</h2>
                <div class="stock-grid">
                    ${stocks
            .slice(0, 8)
            .map(
                (s: any) => `
                        <div class="stock-card">
                            <div class="stock-symbol">${s.symbol}</div>
                            <div class="stock-name">${s.name}</div>
                            <div class="stock-price">${s.price}</div>
                            <div class="${s.changePercent >= 0 ? 'positive' : 'negative'}">
                                ${s.changePercent >= 0 ? '+' : ''}${s.changePercent}%
                            </div>
                        </div>
                    `
            )
            .join('')}
                </div>
            </section>

            <!-- 股票列表 -->
            <section id="page-stocks" class="page">
                <h1>📊 個股列表</h1>
                <input type="text" id="stock-search" placeholder="🔍 搜尋..." class="search-input" />
                <table class="data-table" id="stocks-table">
                    <thead>
                        <tr>
                            <th>代號</th>
                            <th>名稱</th>
                            <th>股價</th>
                            <th>漲跌%</th>
                            <th>本益比</th>
                            <th>殖利率</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stocks
            .map(
                (s: any) => `
                            <tr data-symbol="${s.symbol}" data-name="${s.name}">
                                <td class="symbol">${s.symbol}</td>
                                <td>${s.name}</td>
                                <td>${s.price}</td>
                                <td class="${s.changePercent >= 0 ? 'positive' : 'negative'}">
                                    ${s.changePercent >= 0 ? '+' : ''}${s.changePercent}%
                                </td>
                                <td>${s.pe || '-'}</td>
                                <td>${s.yield}%</td>
                            </tr>
                        `
            )
            .join('')}
                    </tbody>
                </table>
            </section>

            <!-- 投資組合 -->
            <section id="page-portfolio" class="page">
                <h1>💼 投資組合</h1>
                ${portfolio.length === 0
            ? `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <p>尚無投資組合資料</p>
                    </div>
                `
            : `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>代號</th>
                                <th>名稱</th>
                                <th>持股數</th>
                                <th>成本</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${portfolio
                .map(
                    (p: any) => `
                                <tr>
                                    <td class="symbol">${p.symbol}</td>
                                    <td>${p.name || p.symbol}</td>
                                    <td>${p.shares}</td>
                                    <td>${p.avgCost}</td>
                                </tr>
                            `
                )
                .join('')}
                        </tbody>
                    </table>
                `
        }
            </section>

            <!-- 自選股 -->
            <section id="page-watchlist" class="page">
                <h1>⭐ 自選股</h1>
                ${watchlist.length === 0
            ? `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <p>尚無自選股</p>
                    </div>
                `
            : `
                    <div class="stock-grid">
                        ${watchlist
                .map((symbol: string) => {
                    const stock = stocks.find((s: any) => s.symbol === symbol);
                    if (!stock) return '';
                    return `
                                <div class="stock-card">
                                    <div class="stock-symbol">${stock.symbol}</div>
                                    <div class="stock-name">${stock.name}</div>
                                    <div class="stock-price">${stock.price}</div>
                                    <div class="${stock.changePercent >= 0 ? 'positive' : 'negative'}">
                                        ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent}%
                                    </div>
                                </div>
                            `;
                })
                .join('')}
                    </div>
                `
        }
            </section>
        </main>
    </div>

    <script>
        ${getEmbeddedJS()}
    </script>
</body>
</html>`;
}

function getEmbeddedCSS(): string {
    return `
        :root {
            --bg-primary: #0f0f1a;
            --bg-secondary: #1a1a2e;
            --bg-card: rgba(255, 255, 255, 0.05);
            --accent: #00d4aa;
            --text-primary: #f0f0f0;
            --text-secondary: #a0a0b0;
            --border: rgba(255, 255, 255, 0.1);
            --positive: #00d4aa;
            --negative: #ff4757;
        }
        [data-theme="light"] {
            --bg-primary: #f5f7fa;
            --bg-secondary: #ffffff;
            --bg-card: rgba(0, 0, 0, 0.03);
            --text-primary: #1a1a2e;
            --text-secondary: #6a6a7a;
            --border: rgba(0, 0, 0, 0.1);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
        }
        #app { display: flex; min-height: 100vh; }
        .sidebar {
            width: 220px;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            position: fixed;
            height: 100vh;
        }
        .sidebar-header { padding: 20px; border-bottom: 1px solid var(--border); }
        .logo { font-weight: 700; color: var(--accent); }
        .nav-menu { flex: 1; padding: 16px 0; }
        .nav-item {
            display: block;
            width: 100%;
            padding: 12px 20px;
            background: none;
            border: none;
            color: var(--text-secondary);
            text-align: left;
            cursor: pointer;
            font-size: 0.9rem;
        }
        .nav-item:hover { background: var(--bg-card); color: var(--text-primary); }
        .nav-item.active { color: var(--accent); background: rgba(0,212,170,0.1); border-left: 3px solid var(--accent); }
        .sidebar-footer { padding: 16px 20px; border-top: 1px solid var(--border); }
        .theme-btn {
            width: 100%;
            padding: 10px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text-primary);
            cursor: pointer;
            margin-bottom: 8px;
        }
        .export-time { font-size: 0.75rem; color: var(--text-secondary); }
        .main-content { flex: 1; margin-left: 220px; padding: 32px; }
        .page { display: none; }
        .page.active { display: block; }
        h1 { font-size: 1.8rem; margin-bottom: 24px; }
        h2 { font-size: 1.3rem; margin: 24px 0 16px; color: var(--text-primary); }
        .info-banner {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px 20px;
            display: flex;
            gap: 24px;
        }
        .info-banner p { color: var(--text-secondary); font-size: 0.9rem; }
        .stock-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 16px;
        }
        .stock-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
        }
        .stock-symbol { font-weight: 700; color: var(--accent); }
        .stock-name { font-size: 0.85rem; color: var(--text-secondary); margin: 4px 0; }
        .stock-price { font-size: 1.5rem; font-weight: 700; }
        .positive { color: var(--positive); }
        .negative { color: var(--negative); }
        .search-input {
            width: 100%;
            max-width: 300px;
            padding: 12px 16px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text-primary);
            margin-bottom: 20px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            background: var(--bg-card);
            border-radius: 12px;
            overflow: hidden;
        }
        th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); }
        th { background: rgba(0,0,0,0.2); color: var(--text-secondary); font-size: 0.85rem; }
        .symbol { font-weight: 700; color: var(--accent); }
        .empty-state { text-align: center; padding: 60px; color: var(--text-secondary); }
        .empty-icon { font-size: 3rem; margin-bottom: 12px; }
        tr.hidden { display: none; }
        @media (max-width: 768px) {
            .sidebar { width: 100%; height: auto; position: relative; }
            .main-content { margin-left: 0; padding: 20px; }
            .nav-menu { display: flex; overflow-x: auto; padding: 8px; }
            .nav-item { white-space: nowrap; }
        }
    `;
}

function getEmbeddedJS(): string {
    return `
        // 頁面切換
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('page-' + page)?.classList.add('active');
            });
        });

        // 主題切換
        document.getElementById('theme-toggle')?.addEventListener('click', function() {
            const current = document.documentElement.getAttribute('data-theme');
            if (current === 'light') {
                document.documentElement.removeAttribute('data-theme');
                this.textContent = '🌙 深色';
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                this.textContent = '☀️ 淺色';
            }
        });

        // 搜尋
        document.getElementById('stock-search')?.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('#stocks-table tbody tr').forEach(row => {
                const symbol = row.dataset.symbol?.toLowerCase() || '';
                const name = row.dataset.name?.toLowerCase() || '';
                row.classList.toggle('hidden', !symbol.includes(query) && !name.includes(query));
            });
        });
    `;
}
