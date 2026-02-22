# 002 — 資料建構 ETL (Data Build Pipeline)

> Layer 2：將 Layer 1 產出的原始檔案（CSV / JSON）轉換為高效能的 SQLite 資料庫。

## 職責定義

本層負責 **Extract-Transform-Load (ETL)** 流程：
1. **Extract**：讀取 `stocks.json`、`latest_prices.json`、1,077 個 CSV 檔案
2. **Transform**：解析 CSV 行、型別轉換、計算衍生欄位
3. **Load**：批次寫入 SQLite 資料庫，建立索引，執行 VACUUM / ANALYZE 優化

本層是**離線批次執行**的，不在使用者請求路徑上，執行一次即可供後續所有層級使用。

## 核心腳本：build-sqlite-db.js

- **執行方式**：`npm run refresh-db` = `node scripts/build-sqlite-db.js`
- **輸入**：
  | 檔案 | 來源 |
  |------|------|
  | `src/content/stocks/list.json` | 股票清單（代號、名稱、市場） |
  | `public/data/latest_prices.json` | 最新價格快照（含 pe, pb, yield） |
  | `public/data/prices/*.csv` (1,077 檔) | 5 年歷史日K |
- **輸出**：`public/data/stocks.db`（約 150MB）

## ETL 流程詳解

### Step 1: 刪除舊資料庫並初始化

```javascript
if (fs.existsSync(OUTPUT_DB)) fs.unlinkSync(OUTPUT_DB);
const db = new Database(OUTPUT_DB);
db.pragma('journal_mode = WAL');       // Write-Ahead Logging
db.pragma('synchronous = NORMAL');     // 平衡效能與安全
db.pragma('cache_size = 10000');       // 10000 pages ≈ 40MB cache
db.pragma('temp_store = MEMORY');      // 暫存表使用記憶體
```

### Step 2: 建立 Schema

```sql
-- 股票基本資料 (1,077 rows)
CREATE TABLE stocks (
    symbol TEXT PRIMARY KEY,
    name   TEXT NOT NULL,
    market TEXT            -- 'TSE' | 'OTC'
);

-- 最新價格快照 (1,077 rows) — 用於首頁 / 列表快速查詢
CREATE TABLE latest_prices (
    symbol     TEXT PRIMARY KEY,
    date       TEXT,
    open       REAL,  high       REAL,
    low        REAL,  close      REAL,
    volume     INTEGER,
    turnover   REAL,
    change     REAL,  change_pct REAL,
    pe         REAL DEFAULT 0,
    pb         REAL DEFAULT 0,
    yield      REAL DEFAULT 0,
    FOREIGN KEY (symbol) REFERENCES stocks(symbol)
);

-- 基本面進階資料 (EPS, ROE, 現金流等)
CREATE TABLE fundamentals (
    symbol     TEXT PRIMARY KEY,
    eps_yoy    REAL,
    roe        REAL,
    cash_flow  REAL,
    peg        REAL,
    FOREIGN KEY (symbol) REFERENCES stocks(symbol)
);

-- 籌碼面資料 (三大法人買賣超、籌碼集中度等)
CREATE TABLE chips (
    symbol     TEXT NOT NULL,
    date       TEXT NOT NULL,
    foreign_inv INTEGER,   -- 外資買賣超
    invest_trust INTEGER,  -- 投信買賣超
    dealer      INTEGER,   -- 自營商買賣超
    concentration REAL,    -- 籌碼集中度
    PRIMARY KEY (symbol, date),
    FOREIGN KEY (symbol) REFERENCES stocks(symbol)
);

-- 歷史價格 (~1,300,000 rows) — 用於圖表 / 選股 / 技術分析
CREATE TABLE price_history (
    symbol     TEXT NOT NULL,
    date       TEXT NOT NULL,
    open       REAL,  high       REAL,
    low        REAL,  close      REAL,
    volume     INTEGER,
    turnover   REAL,
    change     REAL,  change_pct REAL,
    PRIMARY KEY (symbol, date),
    FOREIGN KEY (symbol) REFERENCES stocks(symbol)
);
```

### Step 3: 建立索引

```sql
CREATE INDEX idx_history_symbol      ON price_history(symbol);
CREATE INDEX idx_history_date        ON price_history(date);
CREATE INDEX idx_history_symbol_date ON price_history(symbol, date DESC);
CREATE INDEX idx_latest_change_pct   ON latest_prices(change_pct DESC);
CREATE INDEX idx_latest_volume       ON latest_prices(volume DESC);
```

**索引設計意圖**：
- `idx_history_symbol_date`：個股歷史查詢（最常用，DESC 排序直接輸出最新在前）
- `idx_latest_change_pct`：漲跌排行榜（首頁 Top 10 漲跌）
- `idx_latest_volume`：成交量排行榜

### Step 4: 批次寫入

- 股票清單 → `INSERT OR REPLACE INTO stocks` (transaction 包裝)
- 最新價格 → `INSERT OR REPLACE INTO latest_prices` (transaction 包裝)
- 歷史價格 → **每 50 個 CSV 檔案一批** transaction 插入：
  ```javascript
  // 從檔名提取代號: "2330_台積電.csv" → symbol = "2330"
  const symbol = file.split('_')[0];
  // 逐行解析 CSV (跳過標題行)
  cols[0]=Date, cols[1]=Open, ..., cols[8]=ChangePct
  ```

### Step 5: 最佳化

```javascript
db.pragma('optimize');  // 更新查詢計畫統計
db.exec('VACUUM');      // 壓縮資料庫檔案
db.exec('ANALYZE');     // 更新索引統計
```

## 其他建構腳本

| 腳本 | 功能 | 輸出 |
|------|------|------|
| `scripts/build-price-snapshot.js` | 從所有 CSV 提取最後一筆作為最新價格 | `latest_prices.json` |
| `scripts/generate-price-index.js` | 建立 symbol → filename 的映射索引 | `price_index.json` |
| `scripts/optimize-data.mjs` | 資料壓縮與清理 | — |
| `scripts/audit-sectors-final.mjs` | 產業分類正確性稽核 | 稽核報告 |
| `scripts/setup-data.ps1` | 首次資料初始化（一鍵執行全部腳本） | — |

## 效能數據

| 指標 | 數值 |
|------|------|
| CSV 檔案數 | 1,077 |
| 歷史紀錄總數 | ~1,300,000 rows |
| 建構時間 | ~30 秒 |
| 輸出 DB 大小 | ~150 MB |
| 原始 CSV 總大小 | ~185 MB |

## 待辦任務

- [ ] **T2-01**: 加入增量更新機制（只匯入新增的 CSV 資料，而非全部重建）
- [ ] **T2-02**: 加入 DB 版本號（metadata 表），用於 Client 端判斷是否需要重新下載
- [ ] **T2-03**: 將 `build-sqlite-db.js` 從 CommonJS 遷移至 ESM（統一模組格式）
