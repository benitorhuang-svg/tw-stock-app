# 001 — Quantum Terminal Layout & Design System

> 本文件定義了「量子終端 (Quantum Terminal)」的視覺規範與完整元件登記。
> 最後更新：2026-02-25 · 元件總數：97 (11 Atoms + 59 Molecules + 27 Organisms) + 2 Layouts + 8 Pages

## 一、宏觀佈局模型 (Macro Layout: The Command Center)

系統採用「固定佈局、局部滾動」的視窗模型，確保核心數據永遠處於使用者的第一視線。

- **Container**: `width: 100vw; height: 100dvh; overflow: hidden; background: hsl(240, 10%, 2%)`.
- **Sidebar (Nav)**: 寬度 `260px`（桌面端），側邊帶有極細的發光邊界 (`border-r border-white/5`)。
- **Workspace**: 採用網格系統，模組與模組之間保留 `gap-6` 的呼吸空間。
- **Mobile Adaptive**: 在手機端自動隱藏側邊欄，改為底部導航或是漢堡選單，確保 `p-4` 的觸控間距。

## 二、量子視覺規範 (Visual Tokens)

### 1. 核心色彩 (HSL System)

| 語意        | HSL 變量            | 用途                     |
| :---------- | :------------------ | :----------------------- |
| **Base**    | `240, 10%, 4%`      | 全站背景底層             |
| **Surface** | `240, 6%, 10%`      | 卡片與面板背景           |
| **Accent**  | `217, 91%, 60%`     | 主動作、按鈕、掃描線     |
| **Bullish** | `142, 71%, 45%`     | 上漲、正面指標、系統正常 |
| **Bearish** | `346, 77%, 50%`     | 下跌、負面指標、警告系統 |
| **Border**  | `0, 0%, 100%, 0.05` | 玻璃邊界、細分線         |

### 2. 玻璃層次 (Glass Elevation)

- **Deep Glass**: `bg-white/[0.02] backdrop-blur-3xl` (用於主背景區塊)。
- **Elevated Glass**: `bg-white/[0.05] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]` (用於彈窗、懸浮控制項)。
- **Hover Shine**: 懸浮時邊界不應變色，而是產生一個半徑 `100px` 的 `radial-gradient` 背光。

### 3. 字體與排版 (Modern Typos)

- **Primary**: `Inter`, `system-ui` (Non-blocking preload 載入)。
- **Monaspace**: `JetBrains Mono` (用於所有數值顯示)。
- **Sizing**: 標籤一律使用 `uppercase tracking-[0.15em] font-black text-[10px]` 的嚴肅風格。
- **載入策略**: `<link rel="preload" as="style">` + `<script is:inline>` 非阻塞升級為 stylesheet。

## 三、原子化設計元件登記 (Atomic Design Registry)

> 本專案遵循 Atomic Design 方法論：Atoms → Molecules → Organisms → Templates (Layouts) → Pages
> 統計基準日：2026-02-25

### Atoms (`src/components/atoms/`) — 11 個

最小不可分割的 UI 元素，不含業務邏輯。

| 元件                   | 用途                       |
| ---------------------- | -------------------------- |
| `Badge.astro`          | 狀態標籤 (上漲/下跌/平盤)  |
| `CyberButton.astro`    | 量子終端風格通用按鈕       |
| `ErrorBoundary.astro`  | 錯誤邊界容器               |
| `FAQItem.astro`        | 可折疊 FAQ 項目            |
| `NavTab.astro`         | 導航分頁按鈕               |
| `PageLimitSelect.astro`| 每頁筆數下拉選單           |
| `RegistryItem.astro`   | 元件清單中的登記項         |
| `SearchInput.astro`    | 搜尋輸入框                 |
| `Skeleton.astro`       | 骨架載入動畫（Zero-CLS）   |
| `StrategyIcon.astro`   | 策略圖示                   |
| `SyncHourglass.astro`  | 同步等待沙漏動畫           |

### Molecules (`src/components/molecules/`) — 59 個

Atoms 的功能性組合，封裝單一可重用邏輯。

| 元件                          | 組合來源             | 用途                           |
| ----------------------------- | -------------------- | ------------------------------ |
| `AiQuickInsights.astro`       | Text + Badge         | AI 快速洞察摘要                |
| `AiReportMatrix.astro`        | StatCard + Reports   | AI 報告矩陣面板                |
| `BacktestHeatmap.astro`       | Grid + Colors        | 回測績效熱力圖                 |
| `ComboDivergenceChart.astro`  | SVG + Indicators     | 技術指標背離複合圖表           |
| `CoreMetricMatrix.astro`      | StatCard[]           | 核心指標矩陣                   |
| `DatabaseErrorState.astro`    | ErrorBoundary + Text | 資料庫錯誤狀態顯示             |
| `DatabaseFooter.astro`        | Text + Stats         | 資料庫瀏覽器底部狀態列         |
| `DatabaseSidebarActions.astro`| CyberButton[]        | 資料庫側邊操作按鈕             |
| `DesktopNavTabs.astro`        | NavTab[]             | 桌面端主導航列                 |
| `DividendIntelligenceWall.astro`| Charts + Tables    | 股利智能分析牆                 |
| `ExplorerToolbar.astro`       | Buttons + Search     | 資料庫探索器工具列             |
| `FinancialHealthMatrix.astro` | StatCard[] + Charts  | 財務健康矩陣                   |
| `ForensicFlowSummary.astro`   | Flows + Text         | 法人資金流向摘要               |
| `ForensicTicker.astro`        | Scrolling Text       | 底部全站跑馬燈訊號流           |
| `IndicatorMacd.astro`         | SVG Chart            | MACD 指標圖表                  |
| `IndicatorRsi.astro`          | SVG Chart            | RSI 指標圖表                   |
| `InstitutionalHeader.astro`   | Title + Badges       | 法人頁面標題列                 |
| `InstitutionalMomentumCards.astro`| Cards + Charts   | 法人動能卡片組                 |
| `InstitutionalRatingCard.astro`| Badge + Score       | 法人評等卡片                   |
| `IntradayChart.astro`         | SVG + Price Data     | 盤中即時走勢線圖               |
| `LiquidityLeaders.astro`     | StockCard[]          | 成交量前 N 排行側邊欄          |
| `LiveSignals.astro`           | Badge + Text         | 即時訊號指示器                 |
| `MarketBreadth.astro`         | Progress bars        | 漲跌平比例進度條               |
| `MarketBreadthWidget.astro`   | MarketBreadth + Stats| 市場廣度小工具                 |
| `MarketReturnWidget.astro`    | Charts + % Values    | 市場回報率小工具               |
| `MarketStatusPanel.astro`     | Calendar + Breadth   | Dashboard 左欄市況總覽面板     |
| `MatrixGroup.astro`           | Grid Container       | 矩陣分組容器                   |
| `MatrixSlider.astro`          | Range + Display      | 矩陣滑桿控制項                 |
| `MobileNavTabs.astro`         | NavTab[]             | 行動端底部導航列               |
| `MoverRow.astro`              | Symbol + Price + Pct | 漲跌幅排行單列                 |
| `NeuralHealthMonitor.astro`   | Gauges + Metrics     | 神經健康監測面板               |
| `OrderBook.astro`             | Bid/Ask Grid         | 五檔委買賣資訊                 |
| `OwnershipChart.astro`        | Pie/Donut            | 股權結構圓餅圖                 |
| `OwnershipDistribution.astro` | Bar Chart            | 股權分佈長條圖                 |
| `PageHero.astro`              | Title + Description  | 頁面大標 Hero 區塊             |
| `PaginationControls.astro`    | Buttons + Page Info  | 分頁控制元件                   |
| `PriceLabels.astro`           | Price + Change       | 報價標籤組                     |
| `RecentAnalyses.astro`        | List + Links         | 最近分析列表                   |
| `RevenueMomentumChart.astro`  | Bar Chart + YoY      | 營收動能長條圖                 |
| `ScreenerResultHeader.astro`  | Title + Count + CSV  | 選股結果表頭                   |
| `ScreenerResultTable.astro`   | Table + Sort         | 選股結果資料表                 |
| `SentimentGauge.astro`        | Gauge + Labels       | 情緒儀表盤                     |
| `StatCard.astro`              | Label + Value + ΔInd | 通用指標數值卡片               |
| `StockAnalysisHero.astro`     | Symbol + Price + Δ%  | 個股分析頁 Hero                |
| `StockCard.astro`             | Badge + Vol/Pct      | 股票資訊卡片                   |
| `StockHubHero.astro`          | Search + Stats       | 股票首頁 Hero                  |
| `StrategicActionMatrix.astro` | Buttons Grid         | 策略操作矩陣                   |
| `StrategyCard.astro`          | Icon + Name + Desc   | 策略卡片                       |
| `StrategySidebar.astro`       | StrategyCard[]       | 策略側欄                       |
| `SyncScrollbar.astro`         | Scrollbar Overlay    | 同步滾動條                     |
| `TechnicalSummaryPanel.astro` | Indicators + Text    | 技術面摘要面板                 |
| `ValuationRiverChart.astro`   | Area Chart + PE      | 本益比河流圖                   |
| `VolumeAnalysis.astro`        | Volume Bars + MA     | 成交量分析圖                   |
| `WatchlistCard.astro`         | Symbol + Price       | 自選股卡片                     |
| `WatchlistEmpty.astro`        | Empty State          | 自選股空狀態                   |
| + 其他 4 個                   | —                    | 參見原始碼                     |

### Organisms (`src/components/organisms/`) — 27 個

多個 Molecules 組合的複雜業務功能區塊。

| 元件                          | 組成                          | 用途                           |
| ----------------------------- | ----------------------------- | ------------------------------ |
| `CyberCalendar.astro`         | Trigger + Popover Grid + API  | 市場熱力日曆 (戳戳樂)          |
| `DatabaseExplorer.astro`      | Table + Toolbar + Pagination  | SQLite 資料庫探索器主面板      |
| `DatabaseSidebar.astro`       | Table List + Stats            | 資料庫側邊目錄                 |
| `DatabaseTableArea.astro`     | Table + Columns + Data        | 資料表顯示區域                 |
| `DatabaseWelcome.astro`       | Empty State + Instructions    | 資料庫歡迎空狀態               |
| `ForensicFilteringMatrix.astro`| Filters Grid + Controls      | 法人分析篩選矩陣               |
| `HighYieldWall.astro`         | Cards + Rankings              | 高殖利率個股看板               |
| `InstitutionalMatrix.astro`   | Charts + Tables + Flows       | 法人籌碼主矩陣                 |
| `LiveControlPanel.astro`      | CyberButton + Breadth         | 即時監控控制面板               |
| `LiveDataTable.astro`         | TableBody + Sort + Filter     | 即時報價資料表 (300+ rows)     |
| `LiveFilterPanel.astro`       | Sliders + Selects + Toggle    | 即時篩選器面板                 |
| `MoversMatrix.astro`          | Gainers + Losers Panels       | 漲跌排行雙欄矩陣               |
| `MoversPanel.astro`           | MoverRow[] + Header           | 漲幅/跌幅排行單面板            |
| `RefreshTerminal.astro`       | Progress + Status             | 資料重新整理終端               |
| `ScreenerSidebar.astro`       | Filters + Strategies          | 選股器側邊篩選欄               |
| `SentimentTrendModal.astro`   | Modal + Charts + Analysis     | 情緒趨勢分析彈窗               |
| `StockChartSection.astro`     | K-line + Volume + Indicators  | 個股走勢圖表區                 |
| `StockScreener.astro`         | Sidebar + Results + Export    | 選股引擎核心組合               |
| `StockSearchEngine.astro`     | Search + Autocomplete + Table | 股票搜尋引擎                   |
| `StrategicHUD.astro`          | Breadth + Volume + AvgΔ       | Dashboard 戰略 HUD 抬頭顯示   |
| `TabAlerts.astro`             | AI Report + Alert Settings    | AI 報告分頁                    |
| `TabBar.astro`                | Tab Buttons + Switch Logic    | 個股頁 5-tab 導航器            |
| `TabChips.astro`              | 3-Institutional Charts        | 籌碼面分頁                     |
| `TabFundamentals.astro`       | PE River + Revenue + Health   | 基本面分頁                     |
| `TabOverview.astro`           | StatCard[] + Charts           | 個股總覽分頁                   |
| `TabTechnical.astro`          | K-line + MACD + RSI + Waves   | 技術面分頁                     |
| `TacticalIntelligenceHUD.astro`| Multi-metric HUD             | 戰術情報面板                   |

### Templates / Layouts (`src/layouts/`) — 2 個

| 元件                  | 用途                                      |
| --------------------- | ----------------------------------------- |
| `MainTerminal.astro`  | 全站主佈局（Sidebar + Topbar + Workspace）|
| `BaseHead.astro`      | `<head>` 區塊（PWA、字體、SEO meta）      |

### Pages (`src/pages/`) — 8 個

| 頁面                      | 路由            | 核心 Organism              |
| ------------------------- | --------------- | -------------------------- |
| `index.astro`             | `/`             | StrategicHUD + MoversMatrix|
| `screener.astro`          | `/screener`     | StockScreener + Sidebar    |
| `live.astro`              | `/live`         | LiveDataTable + FilterPanel|
| `database.astro`          | `/database`     | DatabaseExplorer + Sidebar |
| `institutional.astro`     | `/institutional`| InstitutionalMatrix + HUD  |
| `watchlist.astro`         | `/watchlist`    | WatchlistCard[] + Search   |
| `stocks/index.astro`      | `/stocks`       | StockSearchEngine          |
| `stocks/[symbol].astro`   | `/stocks/:id`   | TabBar + Chart + 5 Tabs    |

## 四、客戶端引擎 (Client-Side Engine Scripts)

每個頁面由獨立的 Engine Script 驅動互動邏輯，實現 UI/業務分離：

| 引擎檔案                      | 對應頁面          | 核心職責                          |
| ----------------------------- | ----------------- | --------------------------------- |
| `global-engine.ts`            | 全站              | 主題切換、PWA 註冊、效能模式偵測  |
| `dashboard-engine.ts`         | `/`               | SSE 同步 HUD、歷史數據切換       |
| `live-engine.ts`              | `/live`           | 15s 輪詢、即時表格渲染、DOM Diff  |
| `live-filter-engine.ts`       | `/live`           | 篩選滑桿互動                     |
| `database-engine.ts`          | `/database`       | 表格載入、搜尋、分頁、JSON Viewer|
| `stock-screener-engine.ts`    | `/screener`       | 篩選 API 呼叫、SSE 自動刷新     |
| `screener-engine.ts`          | `/screener`       | 策略卡片互動                     |
| `stocks-index-engine.ts`      | `/stocks`         | 股票搜尋與列表                   |
| `stocks-symbol-engine.ts`     | `/stocks/:id`     | Tab 切換、圖表初始化             |
| `institutional-engine.ts`     | `/institutional`  | 法人資料視覺化                   |
| `watchlist-engine.ts`         | `/watchlist`      | 自選股增刪                       |
| `refresh-engine.ts`           | `/database`       | 資料刷新進度條                   |
| `cyber-calendar-engine.ts`    | 全站 (日曆元件)   | 日曆月份切換、熱力著色           |

## 五、效能優化架構 (Performance Architecture)

| 層級 | 優化策略 | 實作檔案 |
|------|----------|----------|
| **SQLite** | Prepared Statement Cache、WAL mode、mmap 3GB、temp_store MEMORY | `db/sqlite-service.ts` |
| **SSR** | SQL 聚合取代 JS 陣列處理、Dashboard 直接 SQL `COUNT/SUM/AVG` | `pages/index.astro` |
| **API** | Cache-Control headers (30s POST / 60s GET)、TextEncoder 單例 | `api/screener.ts`, `api/sse/stream.ts` |
| **Client** | 字體非阻塞 preload、搜尋 debounce、`Set` O(1) 自選股查詢 | `BaseHead.astro`, `live-engine.ts` |
| **Build** | Vite manual chunk splitting (vendor/sqljs/chart/indicators) | `astro.config.mjs` |
| **PWA** | SW v4: Cache-First 靜態 / Stale-While-Revalidate 數據 | `public/sw.js` |
| **Adaptive** | 四級效能偵測 (high/medium/low/minimal) 動態調整動畫 | `lib/performance-mode.ts` |

## 六、SSR / SSG 雙模架構 (Dual-Mode Build)

| 環境 | `output` | Adapter | 用途 |
|------|----------|---------|------|
| **本地開發** | `server` | `@astrojs/node` | 完整 SSR + API routes |
| **GitHub Pages** | `static` | `@astrojs/node` (for prerender=false routes) | 靜態 HTML 預渲染 |

透過 `STATIC_BUILD=true` 環境變數切換模式。靜態建置時：
- 頁面使用 JSON fallback（`stockDataService`）取代 DB 直接查詢
- API routes（`prerender = false`）由 adapter 處理但不部署
- 動態路由 `[symbol]` 透過 `getStaticPaths()` 枚舉所有股票

## 七、重構與清理 (Aesthetic Integrity)

1. **Delete the Ugly**: 任何帶有「過時陰影」、「預設藍色連結」、「不明確的內距」的舊組件，應在大規模重構中直接移除。
2. **Unified Rendering**: 所有的 `StockCard` 必須統一使用 HSL 變量，嚴禁在元件中寫死十六進位色彩。
3. **Motion First**: 優雅的轉場不只是裝飾，而是引導使用者視線的 UX 工具。進入頁面時，模組應以 `20ms` 的間隔由下而上依序浮現。
