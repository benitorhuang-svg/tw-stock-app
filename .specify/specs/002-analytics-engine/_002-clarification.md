# 需求釐清 (Clarification) - M2 風險引擎與 AI

> 本文件用於在撰寫 Plan 之前，強制釐清系統架構的盲區與邊界條件。
> 目前主題：**M2 Risk Engine & AI Context Distillation**

## 1. 資料來源與依賴 (Data Sources & Dependencies)

- [x] 此 Feature 需要哪些既有的 DB Tables？
    - 核心：`tech_features.close` (算 Beta)、`stocks`。需要讀取 M1 產生的歷史陣列。
- [x] 是否需要串接新的外部 API？呼叫頻率與限制為何？
    - 需要打 `OpenAI API (gpt-4o-mini)` 或 `Gemini (gemini-2.5-flash)`。
    - **限制**：AI 有 Token 長度 (例如 8k context) 與 RPM (Requests per minute) 限制。

## 2. 邊界條件與極端測試 (Edge Cases)

- [x] 若資料為空 (Null/0/Empty Array)，畫面的 Fallback 是什麼？
    - 若歷史交易日 < 2 天（例如剛上的新股或 ETF）將無法計算 Correlation Matrix 與 Beta，必須回傳 `1` 或 `0` 的安全預設值，並在 AI Context 加上 "[New Stock Alert]" 標籤。
- [x] 若網路斷線或 DB 鎖死 (Locked/Timeout)，錯誤處理機制為何？
    - 若 OpenAI 斷線或回傳 HTTP 500/429：前端 `Alerts` 面板顯示「⚠️ AI 分析伺服器忙線中，請改看圖表或稍後再試」，而不是崩潰整個 Tab。

## 3. 效能與資源評估 (Performance Impact)

- [x] 此功能是否會產生 $O(N^2)$ 以上的運算複雜度？
    - 是的，投資組合 100 檔股票的皮爾森矩陣 (Pearson Correlation) 計算量為 $C(100,2) \times N$，達數十萬次乘法操作。
    - **優化解法**：絕對不可以在主線程 (Main Thread) 跑。必須將 `risk-engine.ts` 包裝成 **Web Worker** 處理。
- [x] 是否需要建立新的 DB Index (索引) 來支撐查詢速度？
    - 需要。為 `ai_reports(symbol, date)` 建立 Unique Index 供 AI Caching。
- [x] 是否需要設定 Cache (Redis/IndexedDB)？
    - **極度需要 AI Cache**。呼叫完 AI 後將 Markdown 存入 SQLite 的 `ai_reports`。同日若再查同一檔股票直接讀取，達成 0 費用、$0ms$ 的查詢！
