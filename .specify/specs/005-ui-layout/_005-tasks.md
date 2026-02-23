# 任務清單: 005-ui-layout — UI/UX 優化與修復

**輸入**: `_005-plan.md` + `_005-clarification.md`
**日期**: 2026-02-23

---

## 第一階段：安全修復 (P0)

- [x] T001 修復 DB Explorer XSS — `database.astro` innerHTML escape
  - 檔案: `src/pages/database.astro`
  - 新增 `escapeHtml()` 工具函式，所有 cell value 渲染經過 escape

---

## 第二階段：功能完整性 (P1)

- [x] T002 非功能性按鈕改為 disabled 提示 — `[symbol].astro`
  - 檔案: `src/pages/stocks/[symbol].astro`
  - 「⭐ 加入自選」與「🤖 AI 分析報告」加 `disabled` + tooltip "即將推出"

- [x] T003 Stock list 加 Load More 分頁
  - 檔案: `src/pages/stocks/index.astro`
  - 初始載入 200 筆，再點擊"載入更多"一次增加 200筆
- [x] T011 SSE 實時更新列表與 Dashboard 統計
  - 檔案: `src/pages/stocks/index.astro`, `src/pages/index.astro`
  - 利用 `/api/sse/stream` 導入 EventSource 實時刷新價格與上下統計
- [x] T019 SSE 嵌入股票詳情頁
  - 檔案: `src/pages/stocks/[symbol].astro`
  - 當前頁面啟用 EventSource，只更新價格/漲跌並加入閃光動畫
- [x] T022 AI 報告後端串接
  - 檔案: `src/pages/api/ai-report/[symbol].ts`, `src/components/organisms/TabAlerts.astro`
  - 建立 API 端點並於 TabAlerts 客戶端 fetch 實時報告
- [x] T012 啟用動態價格 API
  - 檔案: `src/pages/api/prices/[symbol].ts`
  - 解除註解並支援 `prices` 客戶端回退

- [x] T004 Tab 狀態保存到 URL Hash
  - 檔案: `src/components/organisms/TabBar.astro`
  - 從 `location.hash` 初始化 active tab，切換時更新 hash

---

## 第三階段：無障礙與體驗 (P2)

- [x] T005 全站 focus-visible 樣式
  - 檔案: `src/styles/global.css`
  - 加 `:focus-visible` ring style 到 button, a, input, select

- [x] T006 色彩對比提升 (WCAG AA)
  - 檔案: `src/styles/global.css`
  - `--color-text-muted` 亮度從 40% → 55%

- [x] T007 Dashboard 空狀態 Fallback
  - 檔案: `src/pages/index.astro`
  - 當 `totalStocks === 0` 時顯示 "暫無市場資料" 提示

- [x] T008 Mobile DB Explorer sidebar
  - 檔案: `src/pages/database.astro`
  - mobile 時 sidebar 加 toggle button，預設收合
- [x] T022 Database table sorting & keyboard navigation
  - 檔案: `src/pages/database.astro`
  - table headers可點擊排序，加入上下鍵在 table list 中移動焦點

---

## 第四階段：程式碼品質 (P3)

- [x] T009 Stock detail 查無股票提示
  - 檔案: `src/pages/stocks/[symbol].astro`
  - 當 price === 0 且非手動建的 fallback 時顯示 "查無此股票資料"

- [x] T010 TabBar 鍵盤導覽 (Arrow keys)
  - 檔案: `src/components/organisms/TabBar.astro`
  - 支援左右方向鍵切換 tab + `aria-selected`

---

## 第五階段：資料接線與功能擴充 (P0+)

- [x] T023 主題切換按鈕 & light/dark 支援
  - 檔案: `src/layouts/MainTerminal.astro`, `src/layouts/BaseHead.astro`
  - 使用 localStorage 記錄，按鈕在頂欄顯示月亮/太陽  
> 於 2026-02-23 實作完畢

- [x] T011 將 `financials.ts` 改為讀取 `public/data/financials.json`/`revenue.json`，TabFundamentals 現在顯示全市場真實財報資料
- [x] T012 將 `institutional.ts` 改為讀取 `public/data/chips/*.json`，TabChips 顯示全市場法人買賣超
- [x] T013 TabTechnical 使用 `priceService.fetchStockPrices()` 傳入真實 OHLCV 資料並計算 MACD/MA5/MA20
- [x] T014 為整站啟用 Ctrl+K 快速搜尋：`src/lib/keyboard.ts` + MainTerminal 搜尋按鈕
- [x] T015 加入 Toast 通知系統 (`toast.ts`)，在篩選、匯出、錯誤時顯示訊息
- [x] T016 Screener 結果頁面加入「📥 匯出 CSV」按鈕與匯出邏輯
- [x] T020 Screener表格可排序與鍵盤連結
  - 檔案: `src/components/organisms/StockScreener.astro`
  - 結果行 `tabindex="0"` 並支援 Enter 鍵；點選欄位標題排序價格、漲幅等
- [x] T021 自選股功能
  - 檔案: `src/pages/stocks/[symbol].astro`, `src/pages/watchlist.astro`, `src/layouts/MainTerminal.astro`
  - 詳情頁新增 ⭐ 加入/移除自選按鈕；新增 /watchlist 頁面顯示自選股列表；頂欄 tab 加入自選連結
- [x] T017 初始化 PWA 註冊 (`pwa.ts`) 及 performance-mode (`performance-mode.ts`) 在 MainTerminal
- [x] T018 TabOverview 新增即時報價 fetch，週期 60s 呼叫 `/api/live-quote.json`

(未來可新增：啟用 SSE、prices API、AI 報告等)
