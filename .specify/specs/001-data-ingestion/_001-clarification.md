# 需求釐清 (Clarification) - M1 資料採集層與 ETL

> 本文件用於在撰寫 Plan 之前，強制釐清系統架構的盲區與邊界條件。
> 目前主題：**M1 Data Ingestion & SQLite Feature Engineering**

## 1. 資料來源與依賴 (Data Sources & Dependencies)

- [x] 此 Feature 需要哪些既有的 DB Tables？
    - **不需要**。這是整個系統的地基。本次要「從無到有」建立 SQLite 的 `stocks`, `tech_features`, `chip_features`, `valuation_features`。
- [x] 是否需要串接新的外部 API？呼叫頻率與限制為何？
    - 需要打 `openapi.twse.com.tw` (包含 `STOCK_DAY_ALL`/`T86`/`MI_MARGN`) 以及 MOPS 公開資訊觀測站。
    - **限制**：TWSE OpenAPI 每 5 秒最多 3 次請求。爬蟲與 ETL 必須實作嚴格的 Queue 與 Exponential Backoff (指數退避)，以防被 TWSE Ban IP。

## 2. 邊界條件與極端測試 (Edge Cases)

- [x] 若資料為空 (Null/0/Empty Array)，畫面的 Fallback 是什麼？
    - 剛上市股票 (無足夠 60 天歷史)，`macd_hist` 或 `ma60` 欄位將產生 `null`。
    - ETL 必須允許欄位 `NULL`，遇到 `null` 時 Screener 的大於小於邏輯預設回傳 `false` (略過該檔)。
- [x] 若網路斷線或 DB 鎖死 (Locked/Timeout)，錯誤處理機制為何？
    - Node.js 在執行 `better-sqlite3` 大量 INSERT 時，需開啟 `WAL (Write-Ahead Logging)` 模式，防止讀寫互相鎖死 (`SQLITE_BUSY`)。

## 3. 效能與資源評估 (Performance Impact)

- [x] 此功能是否會產生 $O(N^2)$ 以上的運算複雜度？
    - 如果每天有 1700 檔股票，每檔 100 天數據，迴圈計算 `MACD` 將是 $O(N \times T)$。
    - **優化解法**：這是 ETL 層次，允許執行 1 分鐘以上。這 1 分鐘的等待，將換來前端 $O(1)$ 的查詢效能。必須使用 `sqlite3.prepare()` 執行 Batch Insert 提高效率。
- [x] 是否需要建立新的 DB Index (索引) 來支撐查詢速度？
    - **絕對需要**。需要為 `tech_features(date, symbol)`, `macd_hist`, `volume` 等高頻過濾條件建立 B-Tree Indexes。
- [x] 是否需要設定 Cache (Redis/IndexedDB)？
    - `.db` 檔案本身就是 Cache。Client 端透過 HTTP Range Request 下載 `.db` 後，會快取存入瀏覽器 IndexedDB 中。
