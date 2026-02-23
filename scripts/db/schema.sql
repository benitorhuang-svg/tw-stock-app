-- M1: Data Ingestion Schema (stocks.db)

-- 1. 基礎 K 線資料表 (每日存入)
CREATE TABLE IF NOT EXISTS stocks (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,          -- YYYY-MM-DD
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    change_rate REAL,            -- 漲跌幅 (%)
    PRIMARY KEY (symbol, date)
);

-- 2. 技術指標特徵表 (M1 ETL 預算後存入)
CREATE TABLE IF NOT EXISTS tech_features (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    ma5 REAL,
    ma20 REAL,
    ma60 REAL,
    macd_diff REAL,              -- MACD 柱狀體
    macd_dea REAL,               -- MACD 訊號線
    rsi14 REAL,
    kd_k REAL,
    kd_d REAL,
    PRIMARY KEY (symbol, date),
    FOREIGN KEY (symbol, date) REFERENCES stocks(symbol, date) ON DELETE CASCADE
);

-- 3. 籌碼特徵表 (M1 ETL 存入)
CREATE TABLE IF NOT EXISTS chip_features (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    foreign_buy INTEGER,         -- 外資買賣超
    trust_buy INTEGER,           -- 投信買賣超
    dealer_buy INTEGER,          -- 自營商買賣超
    total_inst_buy INTEGER,      -- 三大法人合計
    concentration_5d REAL,       -- 5日籌碼集中度 (%)
    PRIMARY KEY (symbol, date),
    FOREIGN KEY (symbol, date) REFERENCES stocks(symbol, date) ON DELETE CASCADE
);

-- 4. 估值與基本面快照
CREATE TABLE IF NOT EXISTS valuation_features (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    pe_ratio REAL,               -- 本益比
    pb_ratio REAL,               -- 股價淨值比
    dividend_yield REAL,         -- 殖利率
    PRIMARY KEY (symbol, date),
    FOREIGN KEY (symbol, date) REFERENCES stocks(symbol, date) ON DELETE CASCADE
);

-- 5. AI 總結報告快取 (M2 使用)
CREATE TABLE IF NOT EXISTS ai_reports (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    prompt_hash TEXT,
    report TEXT,
    PRIMARY KEY (symbol, date)
);

-- 6. 索引優化 (幫助 M3 篩選器達到 O(log N))
CREATE INDEX IF NOT EXISTS idx_stocks_date ON stocks(date);
CREATE INDEX IF NOT EXISTS idx_tech_kd_k ON tech_features(kd_k);
CREATE INDEX IF NOT EXISTS idx_valuation_pe ON valuation_features(pe_ratio);
CREATE INDEX IF NOT EXISTS idx_valuation_yield ON valuation_features(dividend_yield);
