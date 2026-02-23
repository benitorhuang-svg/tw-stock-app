# 需求釐清 (Clarification) — 005-ui-layout 優化與修復

> 本文件在實作計畫 (Plan) 之前，釐清系統架構的盲區與邊界條件。
> 日期: 2026-02-23

## 1. 資料來源與依賴 (Data Sources & Dependencies)

- [x] 此功能需要哪些既有的資料庫資料表？
  - `latest_prices`、`stocks`、`revenue`、`financials`、`chips_daily` — 皆已存在於 `stocks.db`
  - Dashboard / stocks 列表使用 `stockDataService.ts` 從 `public/data/` JSON 快照載入
  - Screener / Database Explorer 使用 `better-sqlite3` 的 `SqliteService` singleton
  - TabFundamentals/Chips 現在直接讀取 `public/data/financials.json`、`chips/*.json`，不再依賴模擬資料
- [x] 是否需要串接新的外部 API？
  - 否。SSE stream (`/api/sse/stream`) 已實作但未被任何頁面使用 — 可暫不動
  - `/api/live-quote.json` 用於即時報價，不需外部配置
  - 未來可整合 `chartgpu` 替換模擬 SVG 圖表
- [x] 是否依賴其他尚未完成的功能或模組？
  - Tab 內容（Overview/Technical/Chips/Fundamentals/Alerts）部分使用模擬數據，非本次修復範圍

## 2. 邊界條件與極端測試 (Edge Cases)

- [x] 資料為空時的回退機制？
  - **Dashboard**: 每個區塊應顯示 "暫無資料" 空狀態，而非空白區域 ✅ 待修
  - **Stock list**: 載入失敗時只有 `console.error`，無使用者回饋 ✅ 待修
  - **Stock detail**: 當找不到 symbol 時建立空殼物件 — 應加 "查無此股票" 提示
  - **DB Explorer**: 已有 Error State 和 Welcome State — ✅ 已處理
- [x] 網路斷線 / API 失敗的錯誤處理？
  - Screener: fetch 失敗只有 `console.error`，無 UI 回饋 ✅ 待修
  - DB Explorer: 有 error state 和 AbortController ✅ 已處理
- [x] 大量資料輸入？
  - Stock list 硬限 100 筆、無分頁 ✅ 待修 → 實作分頁或 "Load More"

## 3. 效能與資源評估 (Performance Impact)

- [x] 是否有 O(N²) 以上運算？
  - `getStocksWithPrices()` 對 ~1700 筆做多次 `.filter().sort().slice()` — O(N log N) 可接受
- [x] 是否需要新的資料庫索引？
  - 否。現有 SQLite 索引已足夠
- [x] 是否需要快取？
  - `stockDataService` 已有 module-level cache (`cachedStocks`) ✅ 已處理
- [x] 是否會阻塞主執行緒？
  - DOM search filtering 最多 100 筆，使用 `requestAnimationFrame` ✅ 已處理

## 4. 安全與權限 (Security & Permissions)

- [x] 是否涉及敏感資料？
  - 否。全為公開市場資料
- [x] 輸入過濾是否防 Injection / XSS？
  - **XSS 漏洞 (Critical)**: DB Explorer 的 `tableBody.innerHTML` 直接嵌入資料庫 cell value，未做 HTML escape ✅ 必須修
  - Screener API: 使用白名單 table name + parameterized SQL ✅ 安全
  - Stock search: 純 DOM `includes()` 比對、不涉及 HTML 注入 ✅ 安全

## 5. 已確認的 UI/UX 問題清單

| # | 嚴重度 | 問題 | 位置 |
|---|--------|------|------|
| 1 | 🔴 Critical | DB Explorer XSS: cell value 未 escape | `database.astro` script |
| 2 | 🟡 Major | 非功能性按鈕 ("加入自選", "AI 分析報告") | `[symbol].astro` |
| 3 | 🟡 Major | Stock list 無分頁，硬限 100 筆 | `stocks/index.astro` |
| 4 | 🟡 Major | ErrorBoundary 元件從未使用 | 全站 |
| 5 | 🟡 Major | 鍵盤導覽與 focus style 缺失 | 全站 |
| 6 | 🟠 Medium | Tab 切換狀態不保存 (重新載入回 overview) | `[symbol].astro` |
| 7 | 🟠 Medium | 文字對比度不足 (9px/10px + muted 色) | `global.css` |
| 8 | 🟠 Medium | Mobile DB Explorer sidebar 遮擋內容 | `database.astro` |
| 9 | 🟢 Minor | 未使用的元件 (MoversPanel, MarketBreadth, StockCard) | components/ |
| 10 | 🟢 Minor | 空狀態缺 fallback UI | Dashboard / Stock list |
