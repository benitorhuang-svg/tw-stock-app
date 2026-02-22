# 001 — 原始資料來源 (External Data Sources)

> Layer 1：系統最底層，負責從外部服務取得原始股票資料。

## 職責定義

本層唯一的職責是**從外部 API 下載原始資料並儲存為本地檔案**。
不做任何資料轉換、計算或展示，僅負責「取得」與「落地」。

## 資料來源清單

| 來源 | 腳本 | 輸出 | 取得內容 |
|------|------|------|----------|
| TWSE 證交所 | `scripts/fetch-stock-list.mjs` | `public/data/stocks.json` | 上市股票清單 (代號、名稱、市場) |
| TPEx 櫃買中心 | `scripts/fetch-stock-list.mjs` | `public/data/stocks.json` | 上櫃股票清單 |
| Yahoo Finance | `scripts/fetch-yahoo.mjs` | `public/data/prices/*.csv` | 5 年歷史日K (OHLCV) |
| TWSE 即時 API | `src/lib/twse-api.ts` | 即時回應 (不落地) | 即時報價、本益比、殖利率 |
| TWSE / TPEx | *(待開發)* `scripts/fetch-chips.mjs` | `public/data/chips.json` | 三大法人買賣超、籌碼集中度 |
| MOPS 公開資訊 | *(待開發)* `scripts/fetch-financials.mjs` | `public/data/financials.json` | 財務報表 (EPS, ROE, 現金流) |

## 腳本詳解

### fetch-stock-list.mjs

- **功能**：下載台灣上市 + 上櫃股票清單
- **API 端點**：
  - TWSE: `https://www.twse.com.tw/exchangeReport/STOCK_DAY_ALL?response=json`
  - TPEx: `https://www.tpex.org.tw/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php?l=zh-tw&o=json`
- **過濾規則**：只取 4 位數代號的普通股 (`/^\d{4}$/`)
- **輸出格式**：`[{ symbol: "2330", name: "台積電", market: "TSE" }]`
- **緊急備用**：API 全部失敗時回退至內建的 ~50 檔核心股票硬編碼清單
- **執行方式**：`node scripts/fetch-stock-list.mjs`

### fetch-yahoo.mjs

- **功能**：逐一下載每支股票 5 年歷史價格
- **API 端點**：`https://query1.finance.yahoo.com/v8/finance/chart/{symbol}.TW?period1={start}&period2={end}&interval=1d`
- **回應解析**：
  ```
  data.chart.result[0].timestamp[]     → 日期 (Unix → YYYY-MM-DD)
  data.chart.result[0].indicators.quote[0].open/high/low/close/volume
  ```
- **衍生計算**：
  - `change = close - prevClose`
  - `changePct = (change / prevClose) × 100`
  - `volumeInLots = volume / 1000`（股→張）
  - `turnover = (high + low) / 2 × volume`（估算成交金額）
- **輸出格式**：CSV，檔名 `{symbol}_{name}.csv`
  ```
  Date,Open,High,Low,Close,Volume,Turnover,Change,ChangePct
  2024-01-02,595.0,600.0,590.0,598.0,28456,17000000000,3.0,0.5
  ```
- **斷點續傳**：進度存於 `progress.json`，失敗記錄存於 `failed.json`
- **速率控制**：每次請求間隔 1.5 秒
- **執行方式**：
  ```bash
  node scripts/fetch-yahoo.mjs              # 自動續傳
  node scripts/fetch-yahoo.mjs --retry      # 重試失敗
  node scripts/fetch-yahoo.mjs --force      # 全部重下
  node scripts/fetch-yahoo.mjs 2330 2317    # 指定股票
  ```

### fetch-chips.mjs (待開發)

- **功能**：下載三大法人買賣超與主力籌碼集中度資料
- **API 端點**：TWSE/TPEx 公開資料 API
- **衍生計算**：
  - 統計前 N 大分點券商買超比例
  - 紀錄投信與外資連續買超天數
- **輸出格式**：`public/data/chips.json` 或拆分 `chips/*.csv`

### fetch-financials.mjs (待開發)

- **功能**：下載季報與財務比率 (EPS, ROE, 營業現金流)
- **API 端點**：公開資訊觀測站 (MOPS)
- **衍生計算**：
  - 計算 EPS 年成長率 (YoY)
  - 結合即時股價估算 PEG (本益成長比)
- **輸出格式**：`public/data/financials.json`

### twse-api.ts（即時 API）

- **功能**：即時查詢 TWSE 公開 API（不落地為檔案，直接回應）
- **提供 4 個函式**：
  | 函式 | 用途 | API 路徑 |
  |------|------|----------|
  | `getPERatio(date, symbol)` | 個股本益比/殖利率/股淨比 | `/exchangeReport/BWIBBU_d` |
  | `getStockDay(date, symbol)` | 個股月成交行情 | `/exchangeReport/STOCK_DAY` |
  | `getAllPERatios(date)` | 全部股票本益比 | `/exchangeReport/BWIBBU_ALL` |
  | `getDailyQuotes(date)` | 當日全部收盤行情 | `/exchangeReport/MI_INDEX` |
- **資料轉換**：TWSE 回傳的千分位逗號數字 `"1,234"` → `parseInt/parseFloat` 清理
- **已知問題**：
  - ❌ 無 timeout 設定
  - ❌ 無重試 / backoff 機制
  - ❌ 無測試覆蓋

## 輸出檔案清單

| 檔案 | 數量 | 說明 |
|------|------|------|
| `public/data/stocks.json` | 1 | 1,077 支股票基本資料 |
| `public/data/prices/*.csv` | 1,077 | 每支股票 5 年日K 資料 |
| `public/data/failed.json` | 1 | 下載失敗清單 |
| `public/data/progress.json` | 1 | 下載進度紀錄 |

## 待辦任務

- [ ] **T1-01**: 為 `twse-api.ts` 新增完整測試（mock fetch、timeout、404/500 錯誤處理）
- [ ] **T1-02**: 為 `twse-api.ts` 加入 timeout（5 秒）與指數退避重試（最多 3 次）
- [ ] **T1-03**: 統一 `fetch-stock-list.mjs` 與 `twse-api.ts` 的錯誤處理模式
