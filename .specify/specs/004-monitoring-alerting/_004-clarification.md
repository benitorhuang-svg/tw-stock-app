# 需求釐清 (Clarification) - M4 背景輪詢與推播引擎

> 本文件用於在撰寫 Plan 之前，強制釐清系統架構的盲區與邊界條件。
> 目前主題：**M4 Realtime Daemon & Event Emitter**

## 1. 資料來源與依賴 (Data Sources & Dependencies)

- [x] 此 Feature 需要哪些既有的 DB Tables？
    - 需要 `user_alerts` 表，存著使用者定義的條件 (例如：`2330 價格 < 590`)。
- [x] 是否需要串接新的外部 API？呼叫頻率與限制為何？
    - 核心依賴：TWSE **盤中即時叢集 API** (`getStockInfo.jsp`)。
    - **頻率限制**：建議由 Node.js 後端每 5 秒統一輪詢一次、收集全部 Ticks 後，再透過 SSE 廣播給所有連線的 Browser (Pub/Sub 架構)，切勿讓百位 Client 各自去打 TWSE 被 Ban。

## 2. 邊界條件與極端測試 (Edge Cases)

- [x] 若資料為空 (Null/0/Empty Array)，畫面的 Fallback 是什麼？
    - 若盤後/假日輪詢無更新，SSE 推送 `STATUS: OFFLINE` 事件。
    - 用戶畫面的 Header Badge 會呈現灰色。
- [x] 若網路斷線或 DB 鎖死 (Locked/Timeout)，錯誤處理機制為何？
    - 若 Client 端網路斷開，`EventSource` 底層具備自動重連邏輯（Exponential Backoff）。
    - 當重連成功後，必須發送一個 "Sync" 請求去抓取斷線期間錯過的最高/低點。

## 3. 效能與資源評估 (Performance Impact)

- [x] 此功能是否會產生 $O(N^2)$ 以上的運算複雜度？
    - 當 Tick 進來時，Client 需要將其與 "所有警示條件" 進行比對。如果使用者設定了上千條，可能導致畫面卡頓。
    - **優化解法**：`user_alerts` 必須以 Symbol/股票代號建立 Hash Map (鍵值對)。Tick `2330` 進來時，只去挑出 `map['2330']` 的長度為 5 的條件陣列做 $O(1)$ 查找過濾。
- [x] 是否需要建立新的 DB Index (索引) 來支撐查詢速度？
    - `user_alerts.symbol` 需建 Index。
- [x] 是否需要設定 Cache (Redis/IndexedDB)？
    - Client 端的警示規則一旦從 DB 下載後，必須暫存在 Client-side **Worker Memory / Zustand**，以應對每 5 秒一次的高頻掃描。
