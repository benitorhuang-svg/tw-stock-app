# 002 — 總覽分頁 (Overview Tab)

## 1. 頁面定位與目標

「總覽 (Overview)」是在使用者進入 `[ /stocks/:symbol ]` 時的落地頁。有別於傳統網頁需要長篇距捲動，此頁面必須在一屏 `100dvh` 的框架內，整合即時報價、微型分時走勢、核心財報與 AI 極簡評語，打造「一分鐘 War Room 決策」的高效率體驗。

## 2. 視覺佈局與網格結構 (Grid Layout)

**背景與風格**：全站 Cyber-Premium 漸層 (`#0f172a` -> `#020617`)。

建構於 `grid grid-cols-12 gap-4 h-full p-4`：

- **頂部數據摘要列 (Top Stats Row, `col-span-12 h-24`)**：
    - 由 6 個相等的卡片組成 (`grid-cols-6`)：開盤、最高、最低、昨收、成交量、五日均量。
    - 設計細節：每個卡片帶有頂部細光帶 (`border-t border-t-blue-500/50`)。
- **左側主視角 (Main Vision, `col-span-8`)**：
    - **日內走勢圖 (Intraday Chart, 占比 75% 高度)**：現價線右側帶有發光的即時價格標籤 (Glowing Price Tag `shadow-[0_0_15px_rgba(239,68,68,0.5)]` 若為紅漲)。
    - **AI 快評小黑板 (AI Insights, 占比 25% 高度)**：深色模糊底板，文字逐字印出的打字機特效 (Typewriter Animation)，用句點列出 2-3 句由 LLM 總結的今日多空定調。
- **右側副視角 (Market Depth, `col-span-4`)**：
    - **即時五檔報價 (Order Book, 占比 40% 高度)**：紅綠對接的買賣掛單簿。成交張數的條狀圖 (Bar chart) 直接作為該列的背景。
    - **逐筆明細 (Trade Tape, 占比 60% 高度)**：動態向上滾動的最新成交清單。新增資料時會有 0.5s 的底色閃爍特效 (Flash effect)。

## 3. 狀態與資料管理 (State & Data Management)

- **Data Hooking**：此頁面依賴 WebSocket 提供即時 TICK 資訊以更新五檔與日內走勢。
- **Skeleton State (載入狀態)**：
    - 圖表區塊在連線建立前顯示 `animate-pulse bg-slate-800/50` 色塊。
    - 價格數字顯示為灰色的 `00.00`。
- **Error Handling (錯誤處理)**：若遇到盤後或假日無法取得即時 WebSocket，系統必須透過 HTTP API 退回「歷史最後收盤狀態」，並在右上角顯示一個細緻的 `Offline` 徽章。

## 4. 核心元件清單與 Props 規劃 (Component Interfaces)

- **`IntradayChart.tsx`**
    - Props: `data: TickData[], previousClose: number, isLive: boolean`
    - 技術：強烈推薦使用 `Lightweight Charts` 繪製，因為原生支援十字線聯動與高效能重繪。
- **`OrderBook.tsx`**
    - Props: `bids: DepthItem[], asks: DepthItem[]`
- **`QuickStatsRow.tsx`**
    - Props: `marketData: RealtimeStockQuote`
- **`AIQuickInsightCard.tsx`**
    - Props: `insights: string[], isLoading: boolean`
    - 當 `isLoading` 為 true 時，顯示發光的掃描波浪動畫 (Scanning Wave Animation)。
