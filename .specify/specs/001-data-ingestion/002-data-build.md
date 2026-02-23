# 002 — 資料建構與特徵工程 ETL (Data Build & Feature Engineering Pipeline)

> Layer 2：將 Layer 1 的原始 CSV/JSON 進行運算，並轉化為**包含所有技術指標與運算結果的高效能 SQLite 資料庫**。這顆 SQLite 不只是讀取介面，更是我們「全機本地端即時分析」與「選股」的核心。

## 職責定義與架構翻轉

在一般的網頁應用中，MACD 等指標是透過瀏覽器即時算的。**但為了支援強大的「全臺股 1700 檔股票的技術+籌碼條件跨維度選股」**以及**儲備給機器學習訓練的特徵值**，我們在 `build-sqlite-db.js` 這個 ETL 階段，就必須把所有衍生數據「算好並寫入資料庫」。

## ETL 執行流程 (Extract, Transform, Feature Engineer, Load)

執行命令：`node scripts/build-sqlite-db.js`

### Step 1: 初始化 SQLite (WAL 模式)

建立一顆極度優化的 `stocks.db`，開啟 `WAL (Write-Ahead Logging)` 與記憶體暫存表提升寫入極限。

### Step 2: 建立機器學習等級的 Schema (定義表結構)

```sql
-- 1. 基礎字典表 (Stocks)
CREATE TABLE stocks (symbol TEXT PRIMARY KEY, name TEXT, market TEXT);

-- 2. 歷史價格與技術面特徵表 (Technical Features)
-- 不只存 OHLCV，直接把技術指標算好存進來，以利快速 SELECT 篩選
CREATE TABLE tech_features (
    symbol TEXT,
    date TEXT,
    open REAL, high REAL, low REAL, close REAL, volume INTEGER,
    ma_5 REAL, ma_20 REAL, ma_60 REAL,
    macd_dif REAL, macd_macd REAL, macd_hist REAL,  -- MACD指標
    kdj_k REAL, kdj_d REAL, kdj_j REAL,             -- KD指標
    rsi_14 REAL,                                    -- RSI
    wave_label TEXT,                                -- 波浪理論標籤 (如 W3, W4, NULL)
    PRIMARY KEY (symbol, date)
);

-- 3. 籌碼與信用交易特徵表 (Institutional & Margin Features)
-- 完美支援 005_tab_chips.md 畫面所需的雙軸對比
CREATE TABLE chip_features (
    symbol TEXT,
    date TEXT,
    foreign_net INTEGER,    -- 外資淨買超
    trust_net INTEGER,      -- 投信淨買超
    dealer_net INTEGER,     -- 自營商淨買超
    margin_bal INTEGER,     -- 融資餘額
    short_bal INTEGER,      -- 融券餘額
    PRIMARY KEY (symbol, date)
);

-- 4. 估值與基本面表 (Valuation & Fundamentals)
-- 完美支援 006_tab_fundamentals.md 的河流圖繪製
CREATE TABLE valuation_features (
    symbol TEXT,
    date TEXT,
    pe_ratio REAL,          -- 當日 本益比
    pb_ratio REAL,          -- 當日 股淨比
    div_yield REAL,         -- 當日 殖利率
    monthly_rev INTEGER,    -- 當月營收
    rev_yoy REAL,           -- 營收年增率
    margin_gross REAL,      -- 毛利率
    PRIMARY KEY (symbol, date)
);
```

### Step 3: 特徵計算與向量化 (Transform & Compute)

- 讀取某檔股票的歷史 OHLCV 陣列。
- **呼叫 Node.js 的技術指標計算庫** (如 `technicalindicators` npm package)。
- 一口氣算出該股 5 年的 MA20, MACD_hist, RSI。
- **機器學習準備**：如果遇到無效天數（上市第一天沒有 MA20），存為 `NULL` 或是填補平均值 (Imputation)，保持資料庫整潔。

### Step 4: 建立高速檢索索引 (Indexing)

為了支撐前端 Screener 的「即時篩選」與 Data Explorer 的無遲滯瀏覽，建立極端的複合索引：

```sql
-- 查詢某檔股票全歷史
CREATE INDEX idx_tech_symbol_date ON tech_features(symbol, date DESC);

-- 查詢「今日投信買超排名」、「今日MACD黃金交叉」
CREATE INDEX idx_chip_date_trust ON chip_features(date DESC, trust_net DESC);
CREATE INDEX idx_tech_date_macd ON tech_features(date DESC, macd_hist DESC);
```

## 效能與架構優勢

1. **Screener O(1) 複雜度**：當使用者想篩選「MACD 翻紅 且 投信連買」的股票，直接是一體成型的 SQL `SELECT`，能在 `10ms` 內從全台股 1700 檔撈出結果，不用前端算到當機。
2. **Tab 渲染零延遲**：Stock Terminal 前端切換技術面或籌碼面時，因為資料庫裡已經有 `macd_hist` 或 `foreign_net` 的絕對數值，Chart.js / ECharts 拿到資料就能直接繪圖，完全無需迴圈邏輯。
3. **ML Ready**：這顆 SQLite `.db` 檔案隨時可以直接丟進 Python Pandas 的 `read_sql` 函數，無縫接軌 Scikit-learn 或 TensorFlow 進行模型訓練。
