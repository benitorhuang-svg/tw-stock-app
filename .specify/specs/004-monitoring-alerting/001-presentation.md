# 001 — 視覺化看板與介面 (Presentation Layer)

> 模組 4：最終面向使用者的展示層，包含前端展示資料的儀表板與視覺元件。

## 職責定義

本層負責**將 Layer 5-6 的資料與分析結果呈現給使用者**：
1. Astro Pages → SSR 渲染 + Client Hydration
2. Astro Components → 可重用 UI 元件
3. CSS Design System → 全域樣式體系
4. UX Tool Modules → 鍵盤快捷鍵、Toast 通知、骨架屏、效能模式

## Pages (12+)

| 頁面 | 檔案 | 大小 | 資料來源（Layer 引用） |
|------|------|------|----------------------|
| 🏠 首頁 | `pages/index.astro` | 34KB | L4: `stockDataService.getTopGainers/Losers/Volume` |
| 📊 股票列表 | `pages/stocks/index.astro` | — | L4: `stockDataService.getStocksPaginated` |
| 📈 個股詳情 | `pages/stocks/[symbol].astro` | — | L4: `priceService.fetchStockPrices` + L6: `calculateAllIndicators` + `analyzeRisk` |
| 🏭 產業分類 | `pages/industries.astro` | 8KB | L4: `stockDataService` + `src/data/industries.ts` |
| 🎯 選股策略 | `pages/strategies/index.astro` | — | `src/data/strategies.ts` (18 種策略定義) |
| 🔍 智能篩選 | `pages/filter.astro` | 25KB | L6: `screener.ts` + `sqlite-service.screenStocks` |
| ⚖️ 股票比較 | `pages/compare.astro` | 15KB | L4: `priceService` × 4 股 + L6: `indicators` |
| 💼 投資組合 | `pages/portfolio.astro` | 16KB | L5: `stock-service.getPortfolioSummary` |
| 💰 股利歷史 | `pages/dividends.astro` | 12KB | L5: `stock-service.getDividends` |
| 📡 即時資料 | `pages/live.astro` | 12KB | L1: `twse-api.ts` 即時查詢 |
| ⭐ 自選股 | `pages/watchlist.astro` | 7KB | L5: `stock-service` (watchlist 表) |
| ⚙️ 設定 | `pages/settings.astro` | 13KB | L5: `user-account.ts`, `export.ts` |
| 🔎 選股器 | `pages/screener.astro` | — | L6: `screener` (Placeholder) |

### 頁面渲染流程（以首頁為例）

```
index.astro (SSR)
    │
    ├── Server 階段 (Astro SSR):
    │   ├── getTopGainers(10)        → L4 → L3 (better-sqlite3)
    │   ├── getTopLosers(10)         → L4 → L3
    │   ├── getTopStocksByVolume(10) → L4 → L3
    │   └── 渲染為靜態 HTML → 送到瀏覽器
    │
    └── Client 階段 (<script> 標籤):
        ├── sql.js 初始化 → L3 (IndexedDB 載入)
        ├── 搜尋功能 → L5 (searchStocks)
        ├── 自選股操作 → L5 (watchlist CRUD)
        └── 即時報價更新 → L1 (twse-api fetch)
```

### 頁面渲染流程（以個股頁為例）

```
stocks/[symbol].astro (SSR)
    │
    ├── Server 階段:
    │   ├── getStockBySymbol(symbol) → L4 基本資料
    │   ├── fetchStockPrices(symbol) → L4 歷史價格 (CSV → parse)
    │   └── 渲染 HTML 含初始資料
    │
    └── Client 階段:
        ├── StockChart.astro → ChartGPU 渲染 K 線圖
        ├── calculateAllIndicators(ohlcv) → L6 技術指標
        ├── analyzeRisk(stock, market) → L6 風險分析
        └── 加入自選股 / 交易紀錄 → L5
```

## Components & Atomic Design

本專案遵循 **Atomic Design** 原則組織元件，確保其可重用性與測試便利性。

### Organisms (生物)
具備完整功能或與 Layer 4-6 高度整合的 UI 區塊。

| 元件 | 大小 | 功能 | Layer 依賴 |
|------|------|------|-----------|
| `StockScreener.astro` | 39KB | 進階選股篩選器 UI | L6 screener |
| `StockChart.astro` | 19KB | GPU 加速 K 線圖 (ChartGPU) | L4 price + L6 indicators |
| `ProTopHeader.astro` | 16KB | 頂部導覽列 + 搜尋 | L5 searchStocks |
| `TabBar.astro` | 13KB | 底部分頁導航 (Mobile) | — |
| `StockCard.astro` | 11KB | 股票卡片 | L4 StockFullData |
| `Heatmap.astro` | 8KB | 產業熱力圖 | L4 stockData + industries |
| `ProSidebarNav.astro` | 4KB | 側邊欄導航 | — |

### Molecules (分子)
較小的功能單元，通常由原子組成。

| 元件 | 大小 | 功能 | Layer 依賴 |
|------|------|------|-----------|
| `KeyboardHelp.astro` | 5KB | 快捷鍵說明面板 | — |
| `StrategyCard.astro` | 4KB | 策略卡片 | strategies data |
| `NewsList.astro` | 3KB | 新聞列表 | news data |
| `FilterBar.astro` | 2KB | 篩選列 | — |

### Atoms (原子)
最小且不可分割的 UI 元件。

| 元件 | 大小 | 功能 | Layer 依賴 |
|------|------|------|-----------|
| `Skeleton.astro` | 4KB | 通用骨架屏 | — |
| `ChartSkeleton.astro` | 3KB | 圖表專用骨架 | — |
| `ErrorBoundary.astro` | 2KB | 錯誤邊界 | — |
| `TableSkeleton.astro` | 2KB | 表格骨架 | — |
| `ErrorMessage.astro` | 2KB | 錯誤訊息 | — |
| `LoadingSpinner.astro` | 1KB | 載入動畫 | — |

### Layout 結構

```
Layout.astro (11KB)
├── <ProTopHeader />      ← 頂部導覽
├── <ProSidebarNav />     ← 側邊欄（桌面端）
├── <slot />              ← 頁面內容區
├── <TabBar />            ← 底部導覽（行動端）
├── <KeyboardHelp />      ← 快捷鍵面板
└── <script>              ← 全域 JS（效能模式、mousemove、主題切換）
```

## Styles System (8 files)

| 檔案 | 大小 | 說明 |
|------|------|------|
| `tokens.css` | 3KB | 設計 Token：顏色(HSL)、字級、間距、圓角、陰影 |
| `global.css` | 7KB | 全域基礎：reset、body、scrollbar、dark mode |
| `utils.css` | 6KB | 工具類：排版、間距、flex/grid 佈局、text 截斷 |
| `transitions.css` | 3KB | SPA 頁面轉場動畫 (View Transitions API) |
| `skeleton.css` | 3KB | 骨架屏 shimmer 動畫 |
| `accessibility.css` | 3KB | 焦點樣式、High Contrast、Skip Link |
| `print.css` | 3KB | 列印樣式（隱藏導覽、調整佈局） |
| `index.css` | 2KB | 樣式入口（@import 全部） |

> 💡 詳細視覺規範請參閱 [008 — 設計系統 (Design System)](./008-design-system.md)。

## UX Tool Modules

| 模組 | 大小 | 功能 | 測試 |
|------|------|------|------|
| `src/lib/keyboard.ts` | 9KB | 快捷鍵系統（Ctrl+K 搜尋、? 說明） | ❌ |
| `src/lib/toast.ts` | 6KB | Toast 通知（success/error/info + 自動消失） | ❌ |
| `src/lib/lazy-load.ts` | 5KB | IntersectionObserver 懶載入 | ❌ |
| `src/lib/chart-tooltip.ts` | 5KB | 圖表游標工具提示 | ❌ |
| `src/lib/performance-mode.ts` | 7KB | 效能模式偵測與自動調整 | ✅ |

### 效能模式系統 — performance-mode.ts

```typescript
type PerformanceLevel = 'high' | 'medium' | 'low' | 'minimal';

// 自動偵測規則:
// minimal: prefers-reduced-motion: reduce
// low:     mobile + deviceMemory < 4GB
// medium:  mobile
// high:    desktop

// CSS 分層回應:
// [data-perf="high"]    → backdrop-filter: blur(12px), transition: 0.3s
// [data-perf="medium"]  → backdrop-filter: blur(4px), transition: 0.15s
// [data-perf="low"]     → background: rgba(0,0,0,0.8), transition: none
// [data-perf="minimal"] → animation: none !important
```

## 效能問題與優化

### P-01: Mouse Move Overload — ⚠️ 部分解決

- **問題**：`Layout.astro` 中 `mousemove` 監聽器頻繁執行 `querySelectorAll('.glow-effect')`
- **方案**：改用 CSS Variables (`--mouse-x`, `--mouse-y`) + `requestAnimationFrame`
- **狀態**：已加入 performance-mode 偵測，但 DOM 查詢尚未完全消除

### P-02: 組件重複初始化 — 🔴 未解決

- **問題**：SPA 導覽時 `astro:page-load` 重新掛載事件，事件監聽器堆疊
- **方案**：每個初始化函式檢查 `data-initialized` 屬性，實作冪等性
- **狀態**：未開始

### P-03: Backdrop Blur — ✅ 大部分解決

- **問題**：`backdrop-filter: blur(24px)` 在低端裝置掉幀
- **方案**：效能模式 CSS 分層，low 模式禁用 blur

### P-04: Mobile Viewport — 🔴 未解決

- **問題**：`100vh` 在行動裝置上因工具列造成佈局跳動
- **方案**：改用 `100dvh` 或 `100svh` (Dynamic/Small Viewport Height)

## Data Modules

| 模組 | 大小 | 說明 |
|------|------|------|
| `src/data/strategies.ts` | 5KB | 18 種選股策略定義 |
| `src/data/stocks.ts` | 4KB | 股票基本資料與 OHLC 型別 |
| `src/data/news.ts` | 4KB | 新聞資料 |
| `src/data/financials.ts` | 4KB | 季報、月營收 |
| `src/data/institutional.ts` | 4KB | 三大法人買賣超 |
| `src/data/industries.ts` | 3KB | 15 大產業分類定義 |

## API Endpoints

| 端點 | 檔案 | 說明 | 狀態 |
|------|------|------|------|
| `GET /api/live-quote.json` | `pages/api/live-quote.json.ts` | TWSE 即時報價 | ✅ |
| `GET /api/pe-ratios.json` | `pages/api/pe-ratios.json.ts` | 全市場本益比 | ✅ |
| `GET /api/prices/[symbol]` | `pages/api/prices/` | 歷史價格 | ✅ |
| `POST /api/screener` | `pages/api/screener.ts.disabled` | 選股 API | ❌ Disabled |

## 待辦任務

- [ ] **T7-01**: 消除 `Layout.astro` 中 mousemove 的 `querySelectorAll`，改用 CSS Variables
- [ ] **T7-02**: 修復組件冪等初始化 — 所有 `<script>` 加入 `data-initialized` 檢查
- [ ] **T7-03**: Mobile Viewport 修正 — `100vh` → `100dvh` (with fallback)
- [ ] **T7-04**: 為 `keyboard.ts` 新增測試
- [ ] **T7-05**: 為 `toast.ts` 新增測試
- [ ] **T7-06**: 為 `lazy-load.ts` 新增測試（mock IntersectionObserver）
- [ ] **T7-07**: 為 `chart-tooltip.ts` 新增測試
- [ ] **T7-08**: 實作選股結果排序功能（點擊表頭排序）
- [ ] **T7-09**: 實作選股結果分頁或虛擬列表（> 50 筆時）
- [ ] **T7-10**: 重新啟用 `/api/screener` 端點
- [ ] **T7-11**: Sidebar 使用 `transition:persist` 避免 SPA 導覽時重新渲染
