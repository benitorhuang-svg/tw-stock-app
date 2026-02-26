-- M1: TW-Stock Forensic Ecosystem Schema (stocks.db)

-- 1. 股票基本資料表 (Metadata)
CREATE TABLE IF NOT EXISTS stocks (
    symbol TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    market TEXT,                 -- TSE / OTC
    sector TEXT                  -- 產業分類
);

-- 2. 最新行情快照 (Latest Market Snapshot)
CREATE TABLE IF NOT EXISTS latest_prices (
    symbol TEXT NOT NULL PRIMARY KEY,
    date TEXT NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    change REAL,
    change_pct REAL,
    pe REAL,
    pb REAL,
    yield REAL,
    FOREIGN KEY (symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
);

-- 3. 歷史價格資料表 (Time-Series 基座)
CREATE TABLE IF NOT EXISTS price_history (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    turnover REAL,
    change REAL,
    change_pct REAL,
    PRIMARY KEY (symbol, date),
    FOREIGN KEY (symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
);

-- 4. 籌碼特徵表 (M1 ETL 存入)
CREATE TABLE IF NOT EXISTS chip_features (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    foreign_buy INTEGER,         -- 外資買賣超
    trust_buy INTEGER,           -- 投信買賣超
    dealer_buy INTEGER,          -- 自營商買賣超
    total_inst_buy INTEGER,      -- 三大法人合計
    concentration_5d REAL,       -- 5日籌碼集中度 (%)
    PRIMARY KEY (symbol, date),
    FOREIGN KEY (symbol, date) REFERENCES price_history(symbol, date) ON DELETE CASCADE
);

-- 5. 融資融券資料表
CREATE TABLE IF NOT EXISTS margin_short (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    margin_bal INTEGER,           -- 融資餘額 (張)
    margin_net INTEGER,           -- 融資當日增減
    short_bal INTEGER,            -- 融券餘額 (張)
    short_net INTEGER,            -- 融券當日增減
    short_margin_ratio REAL,      -- 券資比 (%)
    margin_usage REAL,            -- 融資使用率 (%)
    PRIMARY KEY (symbol, date),
    FOREIGN KEY (symbol, date) REFERENCES price_history(symbol, date) ON DELETE CASCADE
);

-- 6. 股權分散表 (Forensic Expansion)
CREATE TABLE IF NOT EXISTS shareholder_distribution (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,           -- 通常為週五日期 (YYYY-MM-DD)
    total_shareholders INTEGER,   -- 總股東人數
    large_holder_400_ratio REAL,  -- 400張以上大戶持股佔比 (%)
    large_holder_1000_ratio REAL, -- 1000張以上大戶持股佔比 (%)
    small_holder_under_10_ratio REAL, -- 10張以下散戶持股佔比 (%)
    avg_shares_per_holder REAL,   -- 平均每人持股 (張)
    PRIMARY KEY (symbol, date)
);

-- 7. 八大官股券商動向 (Forensic Expansion)
CREATE TABLE IF NOT EXISTS government_chips (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    net_buy_shares INTEGER,       -- 八大官股合計買賣超張數
    net_buy_amount INTEGER,       -- 八大官股合計買賣超金額 (千元)
    PRIMARY KEY (symbol, date)
);

-- 8. 主力分點籌碼 (Forensic Expansion)
CREATE TABLE IF NOT EXISTS major_broker_chips (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    buy_top5_shares INTEGER,      -- 買超前五大分點合計
    sell_top5_shares INTEGER,     -- 賣超前五大分點合計
    net_main_player_shares INTEGER, -- 主力淨買超 (買五 - 賣五)
    concentration_ratio REAL,     -- 主力集中度 (%)
    PRIMARY KEY (symbol, date)
);

-- 9. 董監持股與質押表 (Forensic Expansion - Insider Risk)
CREATE TABLE IF NOT EXISTS director_holdings (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,           -- 通常為月底日期
    director_holding_ratio REAL,  -- 董監合計持股比例 (%)
    pawn_ratio REAL,              -- 董監設質比例 (%) - 設質過高為風險指標
    insider_net_change INTEGER,   -- 本月內部人增減持股 (張)
    PRIMARY KEY (symbol, date)
);

-- 10. 借券賣出與餘額表 (Forensic Expansion - Inst Shorting)
CREATE TABLE IF NOT EXISTS security_lending (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    lending_balance INTEGER,       -- 借券餘額 (張)
    short_selling_balance INTEGER, -- 借券賣出餘額 (張) - 核心空方指標
    short_selling_limit INTEGER,   -- 借券賣出限額
    PRIMARY KEY (symbol, date)
);

-- 11. 自營商細項 (Granular Dealer Flow)
CREATE TABLE IF NOT EXISTS dealer_details (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    prop_buy INTEGER,              -- 自營商自行買賣
    hedge_buy INTEGER,             -- 自營商避險 (權證相關)
    PRIMARY KEY (symbol, date)
);

-- 索引優化 (幫助 M3 篩選器達到 O(log N))
CREATE INDEX IF NOT EXISTS idx_history_date ON price_history(date);
CREATE INDEX IF NOT EXISTS idx_dist_date ON shareholder_distribution(date);
CREATE INDEX IF NOT EXISTS idx_gov_date ON government_chips(date);
CREATE INDEX IF NOT EXISTS idx_broker_date ON major_broker_chips(date);
CREATE INDEX IF NOT EXISTS idx_director_date ON director_holdings(date);
CREATE INDEX IF NOT EXISTS idx_lending_date ON security_lending(date);
CREATE INDEX IF NOT EXISTS idx_dealer_det_date ON dealer_details(date);
