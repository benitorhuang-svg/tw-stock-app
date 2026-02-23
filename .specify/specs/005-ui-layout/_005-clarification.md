# 需求釐清 (Clarification) - M5 五大核心分析分頁佈局

> 本文件用於在撰寫 Plan 之前，強制釐清系統架構的盲區與邊界條件。
> 目前主題：**M5 UI Layout & Render Engine**

## 1. 資料來源與依賴 (Data Sources & Dependencies)

- [x] 此 Feature 需要哪些既有的 DB Tables？
    - 相依最大，`M5` 需要在頁面渲染時，從 `M1/M2/M3/M4` 各自取回**已計算完成的 O(1) 前端資料格式** (比如 K 線圖陣列、AI 總結 JSON、法人的 Dataset 點陣)。
- [x] 是否需要串接新的外部 API？呼叫頻率與限制為何？
    - 取決於 `Astro SSR` 的渲染。沒有獨立的外部 API，它負責從我們地端的 SQLite Server (`better-sqlite3`) 以及 `M4 Server-Sent Events` 拉資料。

## 2. 邊界條件與極端測試 (Edge Cases)

- [x] 若資料為空 (Null/0/Empty Array)，畫面的 Fallback 是什麼？
    - 當點擊無歷史交易的剛上市新股或 API 壞掉時：
    - K 線圖（ChartGPU）顯示無資料背景、右側資料總覽顯示 `-` 橫槓。
    - 不能拋出 Uncaught Error 讓整個 App 白畫面 (React Component Tree Crash)。這是最重要的佈局防護線。
- [x] 若網路斷線或 DB 鎖死 (Locked/Timeout)，錯誤處理機制為何？
    - 在發布時，有實作 Service Worker (PWA)，載入 Cache-First 的 Shell，並顯示灰黑色的 "You are offline" 的 Global Banner。

## 3. 效能與資源評估 (Performance Impact)

- [x] 此功能是否會產生 $O(N^2)$ 以上的運算複雜度？
    - 本來 `005-tab-chips` 要畫三大法人的「散點圓圈」時會卡死（DOM Tree 破萬）。
    - **解法**：全面拋棄 `highcharts` 或是傳統的 `<svg>`。改用 `ChartGPU` (基於 WebGL 制定的底層) 去利用顯示卡並行繪製 12 萬個節點。
- [x] 是否需要建立新的 DB Index (索引) 來支撐查詢速度？
    - UI 本身不建 Index，但需仰賴上游的 Materialized View 提供快速加載時間。
- [x] 是否需要設定 Cache (Redis/IndexedDB)？
    - Astro `View Transitions` 會在分頁間切換，必須善加利用 `<a data-astro-prefetch>` 在用戶 Hover 時預先載入 HTML，達到 **"瞬移感 (Zero JS Loading State)"** 體驗。
