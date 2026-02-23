# 001 — 原始資料與機器學習特徵源 (Raw Data & ML Feature Sources)

> Layer 1：系統最底層，負責從外部服務取得原始股價、籌碼、財報資料，為後續的「本端即時分析」與「機器學習 (ML) 模型訓練」儲備特徵庫。

## 職責定義與哲學轉換 (Paradigm Shift)

過去我們依賴前端在瀏覽器即時運算 MACD 或 KD 等技術指標。為了支援**全盤掃描選股 (Screener)** 與未來的 **ML 模型特徵工程 (Feature Engineering)**，本層的職責已經轉換為：**「盡可能抓取最細顆粒度的原始資料，並落地儲存為 JSON/CSV 備用」**。

## 資料來源與特徵清單 (Data Sources)

| 資料集類別                      | 抓取腳本 / 來源                             | 落地檔案             | 機器學習特徵價值 (ML Value)                                    |
| :------------------------------ | :------------------------------------------ | :------------------- | :------------------------------------------------------------- |
| **股票清單**                    | `fetch-stock-list.mjs`                      | `stocks.json`        | Ticker 映射與產業分類標籤 (Categorical Features)。             |
| **歷史價格 (OHLCV)**            | `fetch-yahoo.mjs`<br>`fetch-twse-daily.mjs` | `prices/*.csv`       | 最核心的時間序列 (Time-Series) 特徵基底，衍生所有技術指標。    |
| **估值水準 (P/E, P/B, 殖利率)** | `fetch-bwibbu.mjs`                          | `valuations/*.csv`   | 訓練長線投資模型、回歸預測目標價的定錨特徵 (Anchor Features)。 |
| **三大法人籌碼動向**            | `fetch-institutional.mjs`                   | `chips_inst/*.csv`   | 外資/投信淨買賣超，捕捉大資金流向，屬於極強的預測因變數。      |
| **信用交易 (融資融券)**         | `fetch-margin.mjs`                          | `chips_margin/*.csv` | 散戶看多/看空情緒指標 (Sentiment Features)。                   |
| **公司營收與三率**              | `fetch-financials.mjs`                      | `financials.json`    | 獲利與成長動能標籤，用於剔除地雷股的模型邊界。                 |
| **即時 TICK (盤中限定)**        | `twse-websocket.ts`                         | 不落地 (即時更新 DB) | 供單日當沖模型判定日內走勢，繪製微型走勢與五檔。               |

## 重點腳本詳解 (Scripts Detail)

### 1. `fetch-yahoo.mjs` / `fetch-twse-daily.mjs`

- **功能**：下載每支股票 5 年以上的歷史價格。
- **資料深度**：為了滿足機器學習至少需要 3~5 個景氣循環的訓練資料，盡可能拉長歷史區間。
- **輸出格式**：CSV，保持 `Date,Open,High,Low,Close,Volume` 格式。

### 2. `fetch-institutional.mjs` (籌碼面)

- **API 來源**：TWSE `fund/T86` (三大法人買賣超日報)
- **資料提煉**：不只要抓每日總計，需要提煉出**外資淨額**、**投信淨額**、**自營商淨額**。

### 3. `fetch-bwibbu.mjs` (估值面)

- **API 來源**：TWSE `exchangeReport/BWIBBU_d`
- **資料提煉**：逐日記錄 P/E (本益比), P/B (股價淨值比), Yield (殖利率)。為了之後在 DB 內畫「河流圖」做歷史數據儲備。

## 資料落地策略 (Local-First Ingestion)

1. **目錄結構**：所有腳本抓取回來的資料，統一存放在 `.data/raw/` 目錄下（此目錄應加入 `.gitignore` 避免污染 Git Repo，或透過 DVC 版控）。
2. **斷點續傳**：因 API 呼叫次數極大（每日上千次 request），所有 fetch 腳本必須實作 `progress.json` 保存點機制。
3. **無損壓縮**：舊日期的 CSV 資料可透過去除重複標頭等方式進行壓縮整理，但絕對保留真實的數值（不提前做標準化 Normalization，以防未來更換 ML 模型需求）。
