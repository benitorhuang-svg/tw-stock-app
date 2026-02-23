# 需求釐清 (Clarification) - M3 O(1) 複合索引查詢引擎

> 本文件用於在撰寫 Plan 之前，強制釐清系統架構的盲區與邊界條件。
> 目前主題：**M3 SQL Query Builder & Preset Strategies**

## 1. 資料來源與依賴 (Data Sources & Dependencies)

- [x] 此 Feature 需要哪些既有的 DB Tables？
    - 需要 `stocks`, `tech_features`, `chip_features`, `valuation_features` 的聯合查詢。
- [x] 是否需要串接新的外部 API？呼叫頻率與限制為何？
    - **完全不需要**。這是一個純地端的 SQL 字串組合器，100% 依賴本地的 `stocks.db` 副本。

## 2. 邊界條件與極端測試 (Edge Cases)

- [x] 若資料為空 (Null/0/Empty Array)，畫面的 Fallback 是什麼？
    - 如果使用者勾選了極端條件 (例：本益比 < 0 且 殖利率 > 10%)，SQL 將會回傳零筆資料。
    - 前端 UI 的 Fallback：「📉 目前市場上沒有符合所有條件的股票，試著減少條件限制。」
- [x] 若網路斷線或 DB 鎖死 (Locked/Timeout)，錯誤處理機制為何？- 這個模組是**「SQL Injection」**的重點防護區。若傳入非法的欄位 (例如 `'`; DROP TABLE stocks;`)：
系統會被 `query-builder.ts`中的`Zod 白名單檢查`擋下，拋出`Invalid Query Parameters`，不會抵達 SQLite 引擎。

## 3. 效能與資源評估 (Performance Impact)

- [x] 此功能是否會產生 $O(N^2)$ 以上的運算複雜度？
    - 過去 TypeScript `map/filter` 架構下，是 $1700 \times M$ 條件的計算循環。
    - 現在透過 SQLite 的 Query Builder，複雜度會降為 **資料庫 B-Tree 檢索的 $O(\log N)$ 或 $O(1)$**。
- [x] 是否需要建立新的 DB Index (索引) 來支撐查詢速度？
    - 是的。甚至必須為高頻的「預設策略 (能噴發先鋒等)」在 M1 階段建立 **Materialized Views**，達到 $1ms$ 內的瞬間渲染。
- [x] 是否需要設定 Cache (Redis/IndexedDB)？
    - SQL 字串編譯結果不需要 Cache (計算太快了)。
    - 若是經常查詢的固定組合，前端可以把 SQL ResultSet (股票矩陣清單) 暫存在 Zustand Store 裡。
