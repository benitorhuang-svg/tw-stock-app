-- M1: TW-Stock Forensic Ecosystem Schema (stocks.db)
-- Last updated: 2026-02-28
--
-- 四層分離架構 (Raw → Computed → Aggregated → Snapshot):
--
--   ① 原始層 (Raw)       : stocks, price_history, chips, margin_short,
--                           shareholder_distribution, government_chips,
--                           major_broker_chips, director_holdings,
--                           security_lending, dealer_details,
--                           valuation_history, fundamentals, monthly_revenue, dividends
--
--   ② 運算層 (Computed)   : market_index, daily_indicators, chip_features,
--                           tech_features, valuation_features
--
--   ③ 聚合層 (Aggregated) : market_breadth_history,
--                           institutional_trend, sector_daily
--
--   ④ 快照層 (Snapshot)   : latest_prices, ai_reports,
--                           institutional_snapshot,
--                           screener_scores, backtest_results
--
-- 設計原則:
--   • 各分頁讀取快照/聚合層 → 零 JOIN, 毫秒級回應
--   • 運算層由 ETL 離線填入 → 不占線上查詢時間
--   • 原始層僅供 ETL 與資料探索使用

-- ═══════════════════════════════════════════
-- ①  原 始 層  (Raw Data)
-- ═══════════════════════════════════════════

-- 1. 股票基本資料表 (Metadata)
CREATE TABLE IF NOT EXISTS stocks (
    symbol TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    market TEXT,                 -- TSE / OTC
    sector TEXT                  -- 產業分類
);

-- 2. 歷史價格資料表 (Time-Series 基座) — 純 OHLCV
CREATE TABLE IF NOT EXISTS price_history (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,              -- 成交張數
    turnover REAL,               -- 成交金額
    change REAL,                 -- 漲跌點數
    change_pct REAL,             -- 漲跌幅 %
    PRIMARY KEY (symbol, date),
    FOREIGN KEY (symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
);

-- 3. 三大法人買賣超 (每日)
CREATE TABLE IF NOT EXISTS chips (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    foreign_inv INTEGER,         -- 外資買賣超
    invest_trust INTEGER,        -- 投信買賣超
    dealer INTEGER,              -- 自營商買賣超
    PRIMARY KEY (symbol, date)
);

-- 4. 融資融券 (每日)
CREATE TABLE IF NOT EXISTS margin_short (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    margin_bal INTEGER,           -- 融資餘額 (張)
    margin_net INTEGER,           -- 融資當日增減
    short_bal INTEGER,            -- 融券餘額 (張)
    short_net INTEGER,            -- 融券當日增減
    PRIMARY KEY (symbol, date)
);

-- 5. 股權分散表 (每週)
CREATE TABLE IF NOT EXISTS shareholder_distribution (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    total_shareholders INTEGER,
    large_holder_400_ratio REAL,
    large_holder_1000_ratio REAL,
    small_holder_under_10_ratio REAL,
    avg_shares_per_holder REAL,
    PRIMARY KEY (symbol, date)
);

-- 6. 八大官股券商動向 (每日)
CREATE TABLE IF NOT EXISTS government_chips (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    net_buy_shares INTEGER,
    net_buy_amount REAL,
    PRIMARY KEY (symbol, date)
);

-- 7. 主力分點籌碼 (每日)
CREATE TABLE IF NOT EXISTS major_broker_chips (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    buy_top5_shares INTEGER,
    sell_top5_shares INTEGER,
    net_main_player_shares INTEGER,
    concentration_ratio REAL,
    PRIMARY KEY (symbol, date)
);

-- 8. 董監持股與質押 (每月)
CREATE TABLE IF NOT EXISTS director_holdings (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    director_holding_ratio REAL,
    pawn_ratio REAL,
    insider_net_change INTEGER,
    PRIMARY KEY (symbol, date)
);

-- 9. 借券與賣出餘額 (每日)
CREATE TABLE IF NOT EXISTS security_lending (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    lending_balance INTEGER,
    short_selling_balance INTEGER,
    short_selling_limit INTEGER,
    PRIMARY KEY (symbol, date)
);

-- 10. 自營商明細 (每日)
CREATE TABLE IF NOT EXISTS dealer_details (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    prop_buy INTEGER,
    hedge_buy INTEGER,
    PRIMARY KEY (symbol, date)
);

-- 11. 估值歷史 (PE/PB/Yield 走勢)
CREATE TABLE IF NOT EXISTS valuation_history (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    pe REAL,
    pb REAL,
    dividend_yield REAL,
    PRIMARY KEY (symbol, date)
);

-- 12. 基本面數據 (季度)
CREATE TABLE IF NOT EXISTS fundamentals (
    symbol TEXT NOT NULL,
    year INTEGER NOT NULL,       -- 民國年 (ROC), 如 114 = 西元 2025; SQL 比較需 +1911
    quarter INTEGER NOT NULL,
    eps REAL,
    gross_margin REAL,
    operating_margin REAL,
    net_margin REAL,
    revenue_yoy REAL,
    debt_ratio REAL,                  -- 負債比率 %
    PRIMARY KEY (symbol, year, quarter)
);

-- 13. 每月營收
CREATE TABLE IF NOT EXISTS monthly_revenue (
    symbol TEXT NOT NULL,
    month TEXT NOT NULL,
    revenue REAL,
    last_year_revenue REAL,
    revenue_yoy REAL,
    cumulative_revenue REAL,
    cumulative_yoy REAL,
    PRIMARY KEY (symbol, month)
);

-- 14. 股利紀錄
CREATE TABLE IF NOT EXISTS dividends (
    symbol TEXT NOT NULL,
    year INTEGER NOT NULL,
    ex_dividend_date TEXT,
    dividend REAL,
    PRIMARY KEY (symbol, year, ex_dividend_date)
);

-- ═══════════════════════════════════════════
-- ②  運 算 層  (Computed / Per-Stock Daily)
-- ═══════════════════════════════════════════

-- 15. 大盤加權指數 (TAIEX ^TWII, 由 fetch-market-index.mjs 寫入)
--     用途: Alpha/Beta 計算, MA60 系統性風險門檻, 回測基準
CREATE TABLE IF NOT EXISTS market_index (
    date TEXT PRIMARY KEY,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER
);

-- 16. 每日個股技術指標 (由 ETL 從 price_history 運算後寫入)
CREATE TABLE IF NOT EXISTS daily_indicators (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    -- 移動平均線
    ma5 REAL,
    ma10 REAL,
    ma20 REAL,
    ma60 REAL,
    ma120 REAL,
    -- 波動率
    atr14 REAL,                   -- ATR (14日), 停損/部位計算核心
    -- 動能指標
    rsi14 REAL,                   -- RSI (14日)
    -- MACD 指標
    macd_diff REAL,               -- MACD 柱狀 (DIF - DEA)
    macd_dea REAL,                -- MACD 信號線
    -- KD 指標
    kd_k REAL,
    kd_d REAL,
    PRIMARY KEY (symbol, date),
    FOREIGN KEY (symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
);

-- 17. 籌碼特徵 (ETL 運算)
CREATE TABLE IF NOT EXISTS chip_features (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    foreign_buy INTEGER,
    trust_buy INTEGER,
    dealer_buy INTEGER,
    total_inst_buy INTEGER,
    concentration_5d REAL,
    PRIMARY KEY (symbol, date)
);

-- 18. 技術指標特徵 (ETL 從 price_history 運算; 每檔僅保留最新)
CREATE TABLE IF NOT EXISTS tech_features (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    ma5 REAL,
    ma20 REAL,
    rsi_14 REAL,
    macd_diff REAL,
    macd_dea REAL,
    kd_k REAL,
    kd_d REAL,
    PRIMARY KEY (symbol, date)
);

-- 19. 估值特徵 (ETL 從 latest_prices 複製; 每檔僅保留最新)
CREATE TABLE IF NOT EXISTS valuation_features (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    pe_ratio REAL,
    pb_ratio REAL,
    dividend_yield REAL,
    PRIMARY KEY (symbol, date)
);

-- ═══════════════════════════════════════════
-- ③  聚 合 層  (Aggregated / Market-Wide Daily)
-- ═══════════════════════════════════════════

-- 20. 每日大盤廣度指標 (由 ETL 聚合 price_history + daily_indicators)
CREATE TABLE IF NOT EXISTS market_breadth_history (
    date TEXT PRIMARY KEY,
    -- 漲跌家數
    up_count INTEGER,
    down_count INTEGER,
    flat_count INTEGER,
    -- 漲跌成交金額
    up_turnover REAL,
    down_turnover REAL,
    -- 漲跌成交量 (張)
    up_volume INTEGER,
    down_volume INTEGER,
    -- Arms Index
    trin REAL,
    -- MA 廣度 (站上各均線的百分比)
    ma5_breadth REAL,
    ma20_breadth REAL,
    ma60_breadth REAL,
    ma120_breadth REAL,
    -- 漲跌線 (Advance-Decline Line)
    adl INTEGER DEFAULT 0,         -- 累積 ADL = SUM(up_count - down_count)
    -- 全市場股數
    total_stocks INTEGER
);

-- 21. 法人每日市場彙總 (ETL 聚合 chips → 按日加總三大法人)
--     用途: 法人監控頁「趨勢圖」→ 直讀, 不需 GROUP BY
CREATE TABLE IF NOT EXISTS institutional_trend (
    date TEXT PRIMARY KEY,
    total_foreign INTEGER,         -- 全市場外資買賣超合計
    total_trust INTEGER,           -- 全市場投信買賣超合計
    total_dealer INTEGER,          -- 全市場自營商買賣超合計
    total_net INTEGER,             -- 三大法人淨額 (F+T+D)
    avg_change_pct REAL,           -- 全市場平均漲跌幅
    buy_count INTEGER,             -- 三大法人合計買超檔數
    sell_count INTEGER              -- 三大法人合計賣超檔數
);

-- 22. 產業每日彙總 (ETL 聚合 latest_prices + stocks → 按產業加總)
--     用途: 首頁「產業板塊」& 選股頁「產業篩選」→ 直讀
CREATE TABLE IF NOT EXISTS sector_daily (
    sector TEXT NOT NULL,
    date TEXT NOT NULL,
    stock_count INTEGER,            -- 該產業股數
    avg_change_pct REAL,            -- 平均漲跌幅
    total_volume INTEGER,           -- 總成交量
    total_turnover REAL,            -- 總成交金額
    up_count INTEGER,               -- 上漲檔數
    down_count INTEGER,             -- 下跌檔數
    top_gainer_symbol TEXT,         -- 漲最多的股票
    top_gainer_pct REAL,            -- 漲幅
    avg_pe REAL,                    -- 產業平均 PE
    avg_pb REAL,                    -- 產業平均 PB
    avg_yield REAL,                 -- 產業平均殖利率
    PRIMARY KEY (sector, date)
);

-- ═══════════════════════════════════════════
-- ④  快 照 層  (Snapshot)
-- ═══════════════════════════════════════════

-- 23. 最新行情快照 (每日更新, 用於首頁列表; 不存放歷史)
--     包含技術指標 + 法人籌碼 + 產業, 供列表/選股/排行直讀
CREATE TABLE IF NOT EXISTS latest_prices (
    symbol TEXT NOT NULL PRIMARY KEY,
    date TEXT NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    turnover REAL,
    change REAL,
    change_pct REAL,
    -- 基本面
    pe REAL DEFAULT 0,
    pb REAL DEFAULT 0,
    yield REAL DEFAULT 0,
    revenue_yoy REAL DEFAULT 0,
    eps REAL DEFAULT 0,
    gross_margin REAL DEFAULT 0,
    operating_margin REAL DEFAULT 0,
    net_margin REAL DEFAULT 0,
    debt_ratio REAL DEFAULT 0,        -- 負債比率 % (從 fundamentals 複製)
    -- 技術指標 (從 daily_indicators 複製)
    ma5 REAL DEFAULT 0,
    ma20 REAL DEFAULT 0,
    ma60 REAL DEFAULT 0,
    ma120 REAL DEFAULT 0,
    rsi REAL DEFAULT 0,
    -- 法人籌碼 (從 chips 最新一日複製, 免 JOIN)
    foreign_inv INTEGER DEFAULT 0,
    invest_trust INTEGER DEFAULT 0,
    dealer INTEGER DEFAULT 0,
    -- 產業分類 (從 stocks.sector 複製, 免 JOIN)
    sector TEXT,
    FOREIGN KEY (symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
);

-- 24. 法人籌碼總覽快照 (每檔一列; 合併 8 張法人表最新資料)
--     用途: 法人監控頁 → 直讀, 取代 7-table JOIN + Window function
CREATE TABLE IF NOT EXISTS institutional_snapshot (
    symbol TEXT NOT NULL PRIMARY KEY,
    date TEXT NOT NULL,
    -- 三大法人買賣超
    foreign_inv INTEGER DEFAULT 0,
    invest_trust INTEGER DEFAULT 0,
    dealer INTEGER DEFAULT 0,
    -- 融資融券
    margin_bal INTEGER DEFAULT 0,
    margin_net INTEGER DEFAULT 0,
    short_bal INTEGER DEFAULT 0,
    short_net INTEGER DEFAULT 0,
    -- 股權分散
    total_shareholders INTEGER,
    large_holder_1000_ratio REAL,
    small_holder_under_10_ratio REAL,
    -- 官股
    gov_net_buy INTEGER DEFAULT 0,
    gov_net_amount REAL DEFAULT 0,
    -- 主力分點
    main_net_shares INTEGER DEFAULT 0,
    main_concentration REAL DEFAULT 0,
    -- 董監
    director_ratio REAL DEFAULT 0,
    pawn_ratio REAL DEFAULT 0,
    insider_change INTEGER DEFAULT 0,
    -- 借券
    lending_balance INTEGER DEFAULT 0,
    short_selling_balance INTEGER DEFAULT 0,
    -- 自營商明細
    prop_buy INTEGER DEFAULT 0,
    hedge_buy INTEGER DEFAULT 0,
    FOREIGN KEY (symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
);

-- 25. AI 分析報告快取
CREATE TABLE IF NOT EXISTS ai_reports (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    report TEXT,
    PRIMARY KEY (symbol, date)
);

-- 26. 選股評分快照 (多策略評分匯總, 由 ETL/篩選引擎寫入)
CREATE TABLE IF NOT EXISTS screener_scores (
    symbol TEXT NOT NULL PRIMARY KEY,
    date TEXT NOT NULL,
    -- 各模型評分 (0~100)
    fundamental_score REAL DEFAULT 0,
    valuation_score REAL DEFAULT 0,
    technical_score REAL DEFAULT 0,
    chip_score REAL DEFAULT 0,
    forensic_score REAL DEFAULT 0,
    -- 加權總分
    total_score REAL DEFAULT 0,
    -- 信號等級
    signal TEXT,                   -- 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL'
    FOREIGN KEY (symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
);

-- 27. 回測結果 (策略回測引擎產出)
CREATE TABLE IF NOT EXISTS backtest_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy_name TEXT NOT NULL,    -- 策略名稱 (如 'foreign_3buy_t5')
    run_date TEXT NOT NULL,         -- 回測執行日期
    params TEXT,                    -- JSON 格式的策略參數
    -- 績效指標
    total_trades INTEGER,
    win_rate REAL,                  -- 勝率 %
    avg_return REAL,                -- 平均報酬 %
    total_return REAL,              -- 累計報酬 %
    max_drawdown REAL,              -- 最大回撤 %
    sharpe_ratio REAL,              -- 夏普比率
    profit_factor REAL,             -- 獲利因子
    avg_holding_days REAL,          -- 平均持有天數
    -- 原始交易明細 (JSON)
    trades TEXT                     -- [{symbol, entry_date, exit_date, entry_price, exit_price, return_pct, exit_reason}]
);

-- ═══════════════════════════════════════════
-- 索引優化
-- ═══════════════════════════════════════════

-- 原始層
CREATE INDEX IF NOT EXISTS idx_history_symbol ON price_history(symbol);
CREATE INDEX IF NOT EXISTS idx_history_date ON price_history(date);
CREATE INDEX IF NOT EXISTS idx_history_symbol_date ON price_history(symbol, date DESC);
CREATE INDEX IF NOT EXISTS idx_chips_date_symbol ON chips(date DESC, symbol);
CREATE INDEX IF NOT EXISTS idx_chips_symbol_date_desc ON chips(symbol, date DESC);
CREATE INDEX IF NOT EXISTS idx_margin_date ON margin_short(date);
CREATE INDEX IF NOT EXISTS idx_shareholder_date ON shareholder_distribution(date);
CREATE INDEX IF NOT EXISTS idx_gov_chips_date ON government_chips(date);
CREATE INDEX IF NOT EXISTS idx_major_broker_date ON major_broker_chips(date);
CREATE INDEX IF NOT EXISTS idx_director_date ON director_holdings(date);
CREATE INDEX IF NOT EXISTS idx_lending_date ON security_lending(date);
CREATE INDEX IF NOT EXISTS idx_dealer_det_date ON dealer_details(date);
CREATE INDEX IF NOT EXISTS idx_valuation_symbol ON valuation_history(symbol);
CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol ON fundamentals(symbol);
CREATE INDEX IF NOT EXISTS idx_revenue_symbol ON monthly_revenue(symbol);

-- 運算層
CREATE INDEX IF NOT EXISTS idx_daily_ind_date ON daily_indicators(date);
CREATE INDEX IF NOT EXISTS idx_daily_ind_symbol_date ON daily_indicators(symbol, date DESC);
CREATE INDEX IF NOT EXISTS idx_market_index_date ON market_index(date DESC);
CREATE INDEX IF NOT EXISTS idx_chip_feat_date ON chip_features(date);
CREATE INDEX IF NOT EXISTS idx_tech_feat_symbol ON tech_features(symbol);
CREATE INDEX IF NOT EXISTS idx_val_feat_symbol ON valuation_features(symbol);

-- 聚合層
-- (market_breadth_history PK = date 已足夠)
CREATE INDEX IF NOT EXISTS idx_inst_trend_date ON institutional_trend(date DESC);
CREATE INDEX IF NOT EXISTS idx_sector_daily_date ON sector_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_sector_daily_sector ON sector_daily(sector, date DESC);

-- 快照層
CREATE INDEX IF NOT EXISTS idx_latest_change_pct ON latest_prices(change_pct DESC);
CREATE INDEX IF NOT EXISTS idx_latest_volume ON latest_prices(volume DESC);
CREATE INDEX IF NOT EXISTS idx_latest_pe ON latest_prices(pe);
CREATE INDEX IF NOT EXISTS idx_latest_pb ON latest_prices(pb);
CREATE INDEX IF NOT EXISTS idx_latest_yield ON latest_prices(yield DESC);
CREATE INDEX IF NOT EXISTS idx_latest_revenue_yoy ON latest_prices(revenue_yoy DESC);
CREATE INDEX IF NOT EXISTS idx_latest_sector ON latest_prices(sector);
CREATE INDEX IF NOT EXISTS idx_latest_foreign ON latest_prices(foreign_inv DESC);
CREATE INDEX IF NOT EXISTS idx_inst_snap_symbol ON institutional_snapshot(symbol);

-- 評分 & 回測
CREATE INDEX IF NOT EXISTS idx_screener_total ON screener_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_screener_signal ON screener_scores(signal);
CREATE INDEX IF NOT EXISTS idx_backtest_strategy ON backtest_results(strategy_name, run_date DESC);
