#!/usr/bin/env node
/**
 * Build SQLite Database from CSV/JSON files
 *
 * 將 CSV 歷史價格資料和 JSON 股票清單轉換為 SQLite 資料庫
 *
 * Usage: node scripts/build-sqlite-db.js
 *
 * 輸出: public/data/stocks.db
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 使用 createRequire 來載入 better-sqlite3 (native module)
const require = createRequire(import.meta.url);
let Database;
try {
    Database = require('better-sqlite3');
} catch (e) {
    console.error('請先安裝 better-sqlite3: npm install better-sqlite3 --save-dev');
    process.exit(1);
}

const DATA_DIR = path.join(__dirname, '../public/data');
const PRICES_DIR = path.join(DATA_DIR, 'prices');
const STOCKS_JSON = path.join(DATA_DIR, 'stocks.json');
const LATEST_PRICES_JSON = path.join(DATA_DIR, 'latest_prices.json');
const REVENUE_JSON = path.join(DATA_DIR, 'revenue.json');
const CHIPS_DIR = path.join(DATA_DIR, 'chips');
const VALUATION_DIR = path.join(DATA_DIR, 'valuation');
const FINANCIALS_JSON = path.join(DATA_DIR, 'financials.json');
const MONTHLY_STATS_JSON = path.join(DATA_DIR, 'monthly_stats.json');
const OUTPUT_DB = process.env.DB_PATH || path.join(DATA_DIR, 'stocks.db');

console.log(`🔧 正在建置 SQLite 資料庫於: ${OUTPUT_DB}\n`);

// 刪除舊的資料庫
if (fs.existsSync(OUTPUT_DB)) {
    try {
        fs.unlinkSync(OUTPUT_DB);
        console.log('📦 已移除舊版資料庫檔案');
    } catch (e) {
        if (e.code === 'EBUSY') {
            console.warn('⚠️  資料庫檔案正被使用中，將嘗試直接覆寫...');
        } else {
            throw e;
        }
    }
}

// 建立新資料庫
const db = new Database(OUTPUT_DB);

// 啟用效能優化
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = 10000');
db.pragma('temp_store = MEMORY');
db.pragma('foreign_keys = OFF');

console.log('📁 正在建立資料表結構...\n');

// 建立資料表
try {
    db.exec(`
    DROP TABLE IF EXISTS latest_prices;
    DROP TABLE IF EXISTS fundamentals;
    DROP TABLE IF EXISTS chips;
    DROP TABLE IF EXISTS price_history;
    DROP TABLE IF EXISTS stocks;
    DROP TABLE IF EXISTS valuation_history;
    DROP TABLE IF EXISTS monthly_revenue;
    DROP TABLE IF EXISTS dividends;
    DROP TABLE IF EXISTS margin_short;
    DROP TABLE IF EXISTS chip_features;
    DROP TABLE IF EXISTS valuation_features;
    DROP TABLE IF EXISTS tech_features;
    DROP TABLE IF EXISTS ai_reports;
    DROP TABLE IF EXISTS shareholder_distribution;
    DROP TABLE IF EXISTS government_chips;
    DROP TABLE IF EXISTS major_broker_chips;
    DROP TABLE IF EXISTS director_holdings;
    DROP TABLE IF EXISTS security_lending;
    DROP TABLE IF EXISTS dealer_details;
    DROP TABLE IF EXISTS market_breadth_history;
    DROP TABLE IF EXISTS daily_indicators;
    DROP TABLE IF EXISTS market_index;
    DROP TABLE IF EXISTS institutional_trend;
    DROP TABLE IF EXISTS sector_daily;
    DROP TABLE IF EXISTS institutional_snapshot;
    DROP TABLE IF EXISTS screener_scores;
    DROP TABLE IF EXISTS backtest_results;

    -- 股票基本資料
    CREATE TABLE stocks (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        market TEXT,
        sector TEXT
    );

    -- 最新價格 (用於首頁/列表快速查詢)
    CREATE TABLE latest_prices (
        symbol TEXT PRIMARY KEY,
        date TEXT,
        open REAL,  high REAL,
        low REAL,   close REAL,
        volume INTEGER,
        turnover REAL,
        change REAL,  change_pct REAL,
        pe REAL DEFAULT 0,
        pb REAL DEFAULT 0,
        yield REAL DEFAULT 0,
        revenue_yoy REAL DEFAULT 0,
        eps REAL DEFAULT 0,
        gross_margin REAL DEFAULT 0,
        operating_margin REAL DEFAULT 0,
        net_margin REAL DEFAULT 0,
        debt_ratio REAL DEFAULT 0,
        ma5 REAL DEFAULT 0,
        ma20 REAL DEFAULT 0,
        ma60 REAL DEFAULT 0,
        ma120 REAL DEFAULT 0,
        rsi REAL DEFAULT 0,
        FOREIGN KEY (symbol) REFERENCES stocks(symbol)
    );

    -- 歷史基本面數據 (EPS, 三率, 營收 YoY)
    CREATE TABLE fundamentals (
        symbol TEXT NOT NULL,
        year INTEGER NOT NULL,
        quarter INTEGER NOT NULL,
        eps REAL,
        gross_margin REAL,
        operating_margin REAL,
        net_margin REAL,
        revenue_yoy REAL,
        debt_ratio REAL,
        PRIMARY KEY (symbol, year, quarter),
        FOREIGN KEY (symbol) REFERENCES stocks(symbol)
    );

    -- 估值歷史 (用於河流圖: PE/PB/Yield 走勢)
    CREATE TABLE valuation_history (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        pe REAL,
        pb REAL,
        dividend_yield REAL,
        PRIMARY KEY (symbol, date),
        FOREIGN KEY (symbol) REFERENCES stocks(symbol)
    );

    -- 每月營收數據
    CREATE TABLE monthly_revenue (
        symbol TEXT NOT NULL,
        month TEXT NOT NULL, -- 格式: 11205 (民國YYMM) 或 202305
        revenue REAL,
        last_year_revenue REAL,
        revenue_yoy REAL,
        cumulative_revenue REAL,
        cumulative_yoy REAL,
        PRIMARY KEY (symbol, month),
        FOREIGN KEY (symbol) REFERENCES stocks(symbol)
    );

    -- 股利紀錄
    CREATE TABLE dividends (
        symbol TEXT NOT NULL,
        year INTEGER NOT NULL,
        ex_dividend_date TEXT,
        dividend REAL,
        PRIMARY KEY (symbol, year, ex_dividend_date),
        FOREIGN KEY (symbol) REFERENCES stocks(symbol)
    );

    -- 籌碼面資料 (三大法人買賣超)
    CREATE TABLE chips (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        foreign_inv INTEGER,
        invest_trust INTEGER,
        dealer INTEGER,
        PRIMARY KEY (symbol, date)
    );

    -- 歷史價格 (用於選股/圖表)
    CREATE TABLE price_history (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        open REAL,  high REAL,
        low REAL,   close REAL,
        volume INTEGER,
        turnover REAL,
        change REAL,  change_pct REAL,
        PRIMARY KEY (symbol, date)
    );

    -- 建立索引
    CREATE INDEX idx_history_symbol ON price_history(symbol);
    CREATE INDEX idx_history_date ON price_history(date);
    CREATE INDEX idx_history_symbol_date ON price_history(symbol, date DESC);
    CREATE INDEX idx_latest_change_pct ON latest_prices(change_pct DESC);
    CREATE INDEX idx_latest_volume ON latest_prices(volume DESC);
    CREATE INDEX idx_latest_pe ON latest_prices(pe);
    CREATE INDEX idx_latest_pb ON latest_prices(pb);
    CREATE INDEX idx_latest_yield ON latest_prices(yield DESC);
    CREATE INDEX idx_latest_revenue_yoy ON latest_prices(revenue_yoy DESC);
    CREATE INDEX idx_chips_date_symbol ON chips(date DESC, symbol);
    CREATE INDEX idx_chips_symbol_date_desc ON chips(symbol, date DESC);
    CREATE INDEX idx_fundamentals_symbol ON fundamentals(symbol);
    CREATE INDEX idx_valuation_symbol ON valuation_history(symbol);
    CREATE INDEX idx_revenue_symbol ON monthly_revenue(symbol);

    -- 股權分散表 (每週)
    CREATE TABLE shareholder_distribution (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        total_shareholders INTEGER,
        large_holder_400_ratio REAL,
        large_holder_1000_ratio REAL,
        small_holder_under_10_ratio REAL,
        avg_shares_per_holder REAL,
        PRIMARY KEY (symbol, date)
    );

    -- 官股券商買賣 (每日)
    CREATE TABLE government_chips (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        net_buy_shares INTEGER,
        net_buy_amount REAL,
        PRIMARY KEY (symbol, date)
    );

    -- 主力券商進出 (每日)
    CREATE TABLE major_broker_chips (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        buy_top5_shares INTEGER,
        sell_top5_shares INTEGER,
        net_main_player_shares INTEGER,
        concentration_ratio REAL,
        PRIMARY KEY (symbol, date)
    );

    -- 董監持股與質押 (每月)
    CREATE TABLE director_holdings (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        director_holding_ratio REAL,
        pawn_ratio REAL,
        insider_net_change INTEGER,
        PRIMARY KEY (symbol, date)
    );

    -- 借券與賣出餘額 (每日)
    CREATE TABLE security_lending (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        lending_balance INTEGER,
        short_selling_balance INTEGER,
        short_selling_limit INTEGER,
        PRIMARY KEY (symbol, date)
    );

    -- 自營商明細 (每日)
    CREATE TABLE dealer_details (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        prop_buy INTEGER,
        hedge_buy INTEGER,
        PRIMARY KEY (symbol, date)
    );

    CREATE INDEX idx_shareholder_date ON shareholder_distribution(date);
    CREATE INDEX idx_gov_chips_date ON government_chips(date);
    CREATE INDEX idx_major_broker_date ON major_broker_chips(date);
    CREATE INDEX idx_director_date ON director_holdings(date);
    CREATE INDEX idx_lending_date ON security_lending(date);
    CREATE INDEX idx_dealer_det_date ON dealer_details(date);

    -- 融資融券 (每日)
    CREATE TABLE margin_short (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        margin_bal INTEGER,
        margin_net INTEGER,
        short_bal INTEGER,
        short_net INTEGER,
        PRIMARY KEY (symbol, date)
    );

    -- 籌碼特徵 (M1 ETL 運算)
    CREATE TABLE chip_features (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        foreign_buy INTEGER,
        trust_buy INTEGER,
        dealer_buy INTEGER,
        total_inst_buy INTEGER,
        concentration_5d REAL,
        PRIMARY KEY (symbol, date)
    );

    -- 估值特徵 (M1 ETL 運算)
    CREATE TABLE valuation_features (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        pe_ratio REAL,
        pb_ratio REAL,
        dividend_yield REAL,
        PRIMARY KEY (symbol, date)
    );

    -- 技術指標 (M1 ETL 運算)
    CREATE TABLE tech_features (
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

    -- AI 報告快取 (M2 Orchestrator)
    CREATE TABLE ai_reports (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        report TEXT,
        PRIMARY KEY (symbol, date)
    );

    CREATE INDEX idx_margin_date ON margin_short(date);
    CREATE INDEX idx_chip_feat_date ON chip_features(date);

    -- 每日大盤聚合指標 (分析數據 - 聚合層)
    CREATE TABLE market_breadth_history (
        date TEXT PRIMARY KEY,
        up_count INTEGER,
        down_count INTEGER,
        flat_count INTEGER,
        up_turnover REAL,
        down_turnover REAL,
        up_volume INTEGER,
        down_volume INTEGER,
        trin REAL,
        ma5_breadth REAL,
        ma20_breadth REAL,
        ma60_breadth REAL,
        ma120_breadth REAL,
        adl INTEGER DEFAULT 0,
        total_stocks INTEGER
    );

    -- 大盤加權指數 TAIEX (Yahoo ^TWII)
    CREATE TABLE market_index (
        date TEXT PRIMARY KEY,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        volume INTEGER
    );

    CREATE INDEX idx_market_index_date ON market_index(date DESC);

    -- 每日個股指標歷史 (分析數據 - 運算層)
    CREATE TABLE daily_indicators (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        ma5 REAL,
        ma10 REAL,
        ma20 REAL,
        ma60 REAL,
        ma120 REAL,
        atr14 REAL,
        rsi14 REAL,
        macd_diff REAL,
        macd_dea REAL,
        kd_k REAL,
        kd_d REAL,
        PRIMARY KEY (symbol, date)
    );

    CREATE INDEX idx_daily_ind_date ON daily_indicators(date);
    CREATE INDEX idx_daily_ind_symbol_date ON daily_indicators(symbol, date DESC);

    -- 法人資金趨勢 (ETL 聚合)
    CREATE TABLE institutional_trend (
        date TEXT PRIMARY KEY,
        total_foreign INTEGER,
        total_trust INTEGER,
        total_dealer INTEGER,
        total_net INTEGER,
        avg_change_pct REAL,
        buy_count INTEGER,
        sell_count INTEGER
    );

    -- 產業每日彙總 (ETL 聚合)
    CREATE TABLE sector_daily (
        sector TEXT NOT NULL,
        date TEXT NOT NULL,
        stock_count INTEGER,
        avg_change_pct REAL,
        total_volume INTEGER,
        total_turnover REAL,
        up_count INTEGER,
        down_count INTEGER,
        top_gainer_symbol TEXT,
        top_gainer_pct REAL,
        avg_pe REAL,
        avg_pb REAL,
        avg_yield REAL,
        PRIMARY KEY (sector, date)
    );

    -- 法人籌碼總覽快照 (ETL)
    CREATE TABLE institutional_snapshot (
        symbol TEXT NOT NULL PRIMARY KEY,
        date TEXT,
        foreign_inv INTEGER DEFAULT 0,
        invest_trust INTEGER DEFAULT 0,
        dealer INTEGER DEFAULT 0,
        margin_bal INTEGER DEFAULT 0,
        margin_net INTEGER DEFAULT 0,
        short_bal INTEGER DEFAULT 0,
        short_net INTEGER DEFAULT 0,
        total_shareholders INTEGER,
        large_holder_1000_ratio REAL,
        small_holder_under_10_ratio REAL,
        gov_net_buy INTEGER DEFAULT 0,
        gov_net_amount REAL DEFAULT 0,
        main_net_shares INTEGER DEFAULT 0,
        main_concentration REAL DEFAULT 0,
        director_ratio REAL DEFAULT 0,
        pawn_ratio REAL DEFAULT 0,
        insider_change INTEGER DEFAULT 0,
        lending_balance INTEGER DEFAULT 0,
        short_selling_balance INTEGER DEFAULT 0,
        prop_buy INTEGER DEFAULT 0,
        hedge_buy INTEGER DEFAULT 0
    );

    -- 選股評分快照
    CREATE TABLE screener_scores (
        symbol TEXT NOT NULL PRIMARY KEY,
        date TEXT NOT NULL,
        fundamental_score REAL DEFAULT 0,
        valuation_score REAL DEFAULT 0,
        technical_score REAL DEFAULT 0,
        chip_score REAL DEFAULT 0,
        forensic_score REAL DEFAULT 0,
        total_score REAL DEFAULT 0,
        signal TEXT
    );

    -- 回測結果
    CREATE TABLE backtest_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_name TEXT NOT NULL,
        run_date TEXT NOT NULL,
        params TEXT,
        total_trades INTEGER,
        win_rate REAL,
        avg_return REAL,
        total_return REAL,
        max_drawdown REAL,
        sharpe_ratio REAL,
        profit_factor REAL,
        avg_holding_days REAL,
        trades TEXT
    );

    CREATE INDEX idx_inst_trend_date ON institutional_trend(date);
    CREATE INDEX idx_sector_daily_date ON sector_daily(date);
`);
} catch (e) {
    console.error(`❌ SQL 初始化失敗: ${e.message}`);
    if (e.message.includes('locked')) {
        console.error('💡 提示: 請先暫停 npm run dev 以釋放資料庫檔案！');
    }
    process.exit(1);
}

// 載入股票清單
console.log('📊 正在載入股票清單...');
const stockList = JSON.parse(fs.readFileSync(STOCKS_JSON, 'utf-8'));
console.log(`   共找到 ${stockList.length} 檔股票\n`);

// 產業分類邏輯 (從 stockDataService.ts 遷移)
function getSectorBySymbol(symbol) {
    const overrides = {
        2330: 'semiconductor',
        2454: 'semiconductor',
        3034: 'semiconductor',
        2317: 'electronics',
        2308: 'electronics',
        2382: 'electronics',
        2412: 'communication',
        3008: 'optoelectronics',
        1301: 'plastic',
        2002: 'steel',
        2603: 'shipping',
        2609: 'shipping',
        9910: 'sports-leisure',
        9914: 'sports-leisure',
        9921: 'sports-leisure',
    };
    if (overrides[symbol]) return overrides[symbol];
    const prefix = symbol.substring(0, 2);
    if (prefix === '00' || prefix === '01' || prefix === '03') return 'etf';
    if (prefix === '11') return 'construction';
    if (prefix === '12') return 'food';
    if (prefix === '13') return 'plastic';
    if (prefix === '14') return 'textile';
    if (prefix === '17') return 'chemical';
    if (prefix === '18') return 'construction';
    if (prefix === '19') return 'paper';
    if (prefix === '20') return 'steel';
    if (prefix === '21') return 'rubber';
    if (prefix === '22') return 'auto';
    if (prefix === '23') return 'semiconductor';
    if (prefix === '24') return 'computer';
    if (prefix === '25') return 'construction';
    if (prefix === '26') return 'shipping';
    if (prefix === '27') return 'tourism';
    if (prefix === '28') return 'finance';
    if (prefix === '29') return 'trading';
    if (prefix === '30') return 'electronics';
    if (prefix === '34') return 'optoelectronics';
    if (prefix === '41') return 'biotech';
    return 'other';
}

// 插入股票基本資料
const insertStock = db.prepare(
    'INSERT OR REPLACE INTO stocks (symbol, name, market, sector) VALUES (?, ?, ?, ?)'
);
const insertStockBatch = db.transaction(stocks => {
    for (const stock of stocks) {
        insertStock.run(stock.symbol, stock.name, stock.market, getSectorBySymbol(stock.symbol));
    }
});
insertStockBatch(stockList);
console.log('✅ 股票基本資料匯入完成\n');

// 載入最新價格 (如果存在)
if (fs.existsSync(LATEST_PRICES_JSON)) {
    console.log('💰 正在匯入最新行情數據...');
    const latestPrices = JSON.parse(fs.readFileSync(LATEST_PRICES_JSON, 'utf-8'));

    const insertLatest = db.prepare(`
        INSERT OR REPLACE INTO latest_prices 
        (symbol, date, open, high, low, close, volume, turnover, change, change_pct, pe, pb, yield, revenue_yoy, eps, gross_margin, operating_margin, net_margin, debt_ratio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertLatestBatch = db.transaction(prices => {
        for (const [symbol, data] of Object.entries(prices)) {
            insertLatest.run(
                symbol,
                data.date || '',
                data.open || 0,
                data.high || 0,
                data.low || 0,
                data.close || 0,
                data.volume || 0,
                data.turnover || 0,
                data.change || 0,
                data.changePct || 0,
                data.pe || 0,
                data.pb || 0,
                data.yield || 0,
                data.revenueYoY || 0,
                data.eps || 0,
                data.grossMargin || 0,
                data.operatingMargin || 0,
                data.netMargin || 0,
                data.debtRatio || 0
            );
        }
    });

    insertLatestBatch(latestPrices);
    console.log(`✅ 已匯入 ${Object.keys(latestPrices).length} 檔股票之最新行情\n`);
}

// 確保所有 stocks 都有 latest_prices 列 (含尚無 CSV 的上櫃股)
{
    const inserted = db.prepare(`
        INSERT OR IGNORE INTO latest_prices (symbol, date)
        SELECT symbol, '' FROM stocks WHERE symbol NOT IN (SELECT symbol FROM latest_prices)
    `).run();
    if (inserted.changes > 0) {
        console.log(`📌 已為 ${inserted.changes} 檔缺少行情的股票建立 latest_prices 佔位列\n`);
    }
}

// 載入每月統計 (補齊 PE, Yield 並存入估值歷史)
if (fs.existsSync(MONTHLY_STATS_JSON)) {
    console.log('📊 正在更新最新行情統計與估值歷史...');
    const stats = JSON.parse(fs.readFileSync(MONTHLY_STATS_JSON, 'utf-8'));

    // 取得當前日期 (估值歷史用)
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const updateStats = db.prepare(
        'UPDATE latest_prices SET pe = ?, pb = ?, yield = ? WHERE symbol = ?'
    );
    const insertValuation = db.prepare(
        'INSERT OR REPLACE INTO valuation_history (symbol, date, pe, pb, dividend_yield) VALUES (?, ?, ?, ?, ?)'
    );

    const updateBatch = db.transaction(list => {
        for (const item of list) {
            updateStats.run(
                item.peRatio || 0,
                item.pbRatio || 0,
                item.dividendYield || 0,
                item.symbol
            );
            insertValuation.run(
                item.symbol,
                dateStr,
                item.peRatio || 0,
                item.pbRatio || 0,
                item.dividendYield || 0
            );
        }
    });
    updateBatch(stats);
    console.log('✅ 每月統計與估值歷史更新完成\n');
}

// 載入估值歷史資料夾 (Valuation History Folder)
if (fs.existsSync(VALUATION_DIR)) {
    console.log('📊 正在匯入歷史估值區間數據...');
    const files = fs
        .readdirSync(VALUATION_DIR)
        .filter(f => f.endsWith('.json') && f !== 'progress.json');
    const insertValuation = db.prepare(
        'INSERT OR REPLACE INTO valuation_history (symbol, date, pe, pb, dividend_yield) VALUES (?, ?, ?, ?, ?)'
    );

    const valBatch = db.transaction((data, date) => {
        for (const item of data) {
            insertValuation.run(item.symbol, date, item.pe || 0, item.pb || 0, item.yield || 0);
        }
    });

    for (const file of files) {
        // filename: 20230525.json -> date: 2023-05-25
        const rawDate = file.replace('.json', '');
        const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
        const data = JSON.parse(fs.readFileSync(path.join(VALUATION_DIR, file), 'utf-8'));
        valBatch(data, date);
    }
    console.log(`✅ 已載入 ${files.length} 個日期的歷史估值數據\n`);
}

// 載入財報數據 (支持歷史基本面)
if (fs.existsSync(FINANCIALS_JSON)) {
    console.log('📈 正在匯入各期財務報表...');
    const financials = JSON.parse(fs.readFileSync(FINANCIALS_JSON, 'utf-8'));
    const insertFin = db.prepare(`
        INSERT OR REPLACE INTO fundamentals (symbol, year, quarter, eps, gross_margin, operating_margin, net_margin, revenue_yoy, debt_ratio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 獲取營收 YoY 對照
    let revenueMap = {};
    if (fs.existsSync(REVENUE_JSON)) {
        const revData = JSON.parse(fs.readFileSync(REVENUE_JSON, 'utf-8'));
        revData.forEach(r => (revenueMap[r.symbol] = r.revenueYoY));
    }

    const insertBatch = db.transaction(list => {
        for (const item of list) {
            const revYoY = revenueMap[item.symbol] || 0;
            insertFin.run(
                item.symbol,
                item.year || 0,
                item.quarter || 0,
                item.eps || 0,
                item.grossMargin || 0,
                item.operatingMargin || 0,
                item.netMargin || 0,
                revYoY,
                item.debtRatio || 0
            );

            // 同時更新最新價格中的基本面快照
            db.prepare(
                `
                UPDATE latest_prices 
                SET eps = ?, gross_margin = ?, operating_margin = ?, net_margin = ?, revenue_yoy = ?, debt_ratio = ?
                WHERE symbol = ?
            `
            ).run(
                item.eps || 0,
                item.grossMargin || 0,
                item.operatingMargin || 0,
                item.netMargin || 0,
                revYoY,
                item.debtRatio || 0,
                item.symbol
            );
        }
    });
    insertBatch(financials);
    console.log(`✅ 已匯入 ${financials.length} 筆財務報表紀錄\n`);
}

// 載入每月營收數據
if (fs.existsSync(REVENUE_JSON)) {
    console.log('💰 正在匯入每月營收歷史數據...');
    const revenueData = JSON.parse(fs.readFileSync(REVENUE_JSON, 'utf-8'));
    const insertRevenue = db.prepare(`
        INSERT OR REPLACE INTO monthly_revenue 
        (symbol, month, revenue, last_year_revenue, revenue_yoy, cumulative_revenue, cumulative_yoy)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const revenueBatch = db.transaction(list => {
        for (const item of list) {
            insertRevenue.run(
                item.symbol,
                item.month.toString(),
                item.revenue || 0,
                item.lastYearRevenue || 0,
                item.revenueYoY || 0,
                item.cumulativeRevenue || 0,
                item.cumulativeYoY || 0
            );
        }
    });
    revenueBatch(revenueData);
    console.log(`✅ 已匯入 ${revenueData.length} 筆營收紀錄\n`);
}

// 載入籌碼數據
if (fs.existsSync(CHIPS_DIR)) {
    console.log('🤝 正在匯入法人籌碼數據...');
    const files = fs.readdirSync(CHIPS_DIR).filter(f => f.endsWith('.json'));
    const insertChips = db.prepare(`
        INSERT OR REPLACE INTO chips (symbol, date, foreign_inv, invest_trust, dealer)
        VALUES (?, ?, ?, ?, ?)
    `);

    // 日期格式正規化: YYYYMMDD → YYYY-MM-DD
    function normalizeDate(raw) {
        if (/^\d{8}$/.test(raw)) {
            return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
        }
        return raw; // 已是 YYYY-MM-DD 或其他格式
    }

    const chipsBatch = db.transaction((data, date) => {
        for (const item of data) {
            insertChips.run(item.symbol, date, item.foreign_inv, item.invest_trust, item.dealer);
        }
    });

    for (const file of files) {
        const rawDate = file.replace('.json', '');
        const date = normalizeDate(rawDate);
        const data = JSON.parse(fs.readFileSync(path.join(CHIPS_DIR, file), 'utf-8'));
        chipsBatch(data, date);
    }
    console.log(`✅ 已載入 ${files.length} 個日期的籌碼數據 (日期格式已正規化為 YYYY-MM-DD)\n`);
}

// Schema generation and data initialization complete

// 處理 CSV 歷史價格
let totalRecords = 0;
let processedFiles = 0;

if (fs.existsSync(PRICES_DIR)) {
    console.log('📈 正在掃描 CSV 歷史價格檔案...');
    const csvFiles = fs.readdirSync(PRICES_DIR).filter(f => f.endsWith('.csv'));
    console.log(`   共找到 ${csvFiles.length} 個 CSV 檔案\n`);

    const insertHistory = db.prepare(`
    INSERT OR REPLACE INTO price_history 
    (symbol, date, open, high, low, close, volume, turnover, change, change_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

    // 使用 transaction 進行批次插入 (大幅提升效能)

    const processCSVBatch = db.transaction(records => {
        for (const record of records) {
            insertHistory.run(
                record.symbol,
                record.date,
                record.open,
                record.high,
                record.low,
                record.close,
                record.volume,
                record.turnover,
                record.change,
                record.changePct
            );
        }
    });

    // 分批處理以顯示進度
    const BATCH_SIZE = 50;
    for (let i = 0; i < csvFiles.length; i += BATCH_SIZE) {
        const batch = csvFiles.slice(i, i + BATCH_SIZE);
        const allRecords = [];

        for (const file of batch) {
            // 從檔名提取股票代碼 (格式: 2330_台積電.csv)
            const symbol = file.split('_')[0];
            const filePath = path.join(PRICES_DIR, file);

            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.trim().split('\n');

                // 跳過標題行
                for (let j = 1; j < lines.length; j++) {
                    const cols = lines[j].split(',');
                    if (cols.length >= 9) {
                        allRecords.push({
                            symbol,
                            date: cols[0],
                            open: parseFloat(cols[1]) || 0,
                            high: parseFloat(cols[2]) || 0,
                            low: parseFloat(cols[3]) || 0,
                            close: parseFloat(cols[4]) || 0,
                            volume: parseInt(cols[5]) || 0,
                            turnover: parseFloat(cols[6]) || 0,
                            change: parseFloat(cols[7]) || 0,
                            changePct: parseFloat(cols[8]) || 0,
                        });
                    }
                }
                processedFiles++;
            } catch (err) {
                console.error(`   ⚠️ 處理 ${file} 時發生錯誤:`, err.message);
            }
        }

        // 批次寫入
        processCSVBatch(allRecords);
        totalRecords += allRecords.length;

        // 進度顯示
        const progress = Math.round(((i + batch.length) / csvFiles.length) * 100);
        process.stdout.write(
            `\r   同步進度: ${progress}% (${processedFiles}/${csvFiles.length} 個檔案, ${totalRecords.toLocaleString()} 筆紀錄)`
        );
    }

    console.log('\n\n📈 正在計算技術面指標 (MA5, MA20, MA60, MA120)...');

    // Ensure ma60/ma120 columns exist (migration for existing DBs)
    const existingCols = db
        .prepare("PRAGMA table_info('latest_prices')")
        .all()
        .map(c => c.name);
    if (!existingCols.includes('ma60')) {
        db.exec('ALTER TABLE latest_prices ADD COLUMN ma60 REAL DEFAULT 0');
        console.log('   ➕ 新增 ma60 欄位');
    }
    if (!existingCols.includes('ma120')) {
        db.exec('ALTER TABLE latest_prices ADD COLUMN ma120 REAL DEFAULT 0');
        console.log('   ➕ 新增 ma120 欄位');
    }

    const symbols = db.prepare('SELECT symbol FROM latest_prices').all();
    const updateTech = db.prepare(
        'UPDATE latest_prices SET ma5 = ?, ma20 = ?, ma60 = ?, ma120 = ? WHERE symbol = ?'
    );
    const calcBatch = db.transaction(list => {
        for (const { symbol } of list) {
            const ma5Row = db
                .prepare(
                    'SELECT AVG(close) as v FROM (SELECT close FROM price_history WHERE symbol = ? ORDER BY date DESC LIMIT 5)'
                )
                .get(symbol);
            const ma20Row = db
                .prepare(
                    'SELECT AVG(close) as v FROM (SELECT close FROM price_history WHERE symbol = ? ORDER BY date DESC LIMIT 20)'
                )
                .get(symbol);
            const ma60Row = db
                .prepare(
                    'SELECT AVG(close) as v FROM (SELECT close FROM price_history WHERE symbol = ? AND close > 0 ORDER BY date DESC LIMIT 60)'
                )
                .get(symbol);
            const ma120Row = db
                .prepare(
                    'SELECT AVG(close) as v FROM (SELECT close FROM price_history WHERE symbol = ? AND close > 0 ORDER BY date DESC LIMIT 120)'
                )
                .get(symbol);
            updateTech.run(ma5Row.v || 0, ma20Row.v || 0, ma60Row.v || 0, ma120Row.v || 0, symbol);
        }
    });
    calcBatch(symbols);
    console.log('✅ 技術面指標計算完成');
} else {
    console.log('⚠️ 未找到 prices 資料夾，跳過 CSV 歷史價格匯入');
}

console.log('\n');

// ===== 匯入大盤指數 (market_index) =====
const MARKET_INDEX_JSON = path.join(DATA_DIR, 'market_index.json');
if (fs.existsSync(MARKET_INDEX_JSON)) {
    console.log('📊 正在匯入 TAIEX 大盤指數...');
    const indexData = JSON.parse(fs.readFileSync(MARKET_INDEX_JSON, 'utf-8'));
    const insertIndex = db.prepare(
        'INSERT OR REPLACE INTO market_index (date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const batchIndex = db.transaction(rows => {
        for (const r of rows) {
            insertIndex.run(r.date, r.open, r.high, r.low, r.close, r.volume);
        }
    });
    batchIndex(indexData);
    console.log(`✅ TAIEX: ${indexData.length} 筆`);
    totalRecords += indexData.length;
} else {
    console.log('⚠️ 未找到 market_index.json，跳過大盤指數匯入');
}

console.log('\n');

// 最佳化資料庫
console.log('🔧 正在進行資料庫索引結構最佳化...');
db.pragma('optimize');
db.exec('VACUUM');
db.exec('ANALYZE');

// 關閉資料庫
db.close();

// 顯示結果
const stats = fs.statSync(OUTPUT_DB);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log('\n' + '='.repeat(50));
console.log('✅ SQLite 資料庫建置全面完成！');
console.log('='.repeat(50));
console.log(`📁 輸出檔案: ${OUTPUT_DB}`);
console.log(`📊 檔案大小: ${sizeMB} MB`);
console.log(`📈 總資料筆數: ${totalRecords.toLocaleString()}`);
console.log(`📋 股票總數: ${stockList.length}`);
console.log('='.repeat(50));
console.log('\n💡 資料庫已就緒！');
console.log('   - Server: Use better-sqlite3 for sync queries');
console.log('   - Client: Use sql.js (WASM) for offline support');
