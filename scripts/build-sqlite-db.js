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
const FINANCIALS_JSON = path.join(DATA_DIR, 'financials.json');
const MONTHLY_STATS_JSON = path.join(DATA_DIR, 'monthly_stats.json');
const OUTPUT_DB = process.env.DB_PATH || path.join(DATA_DIR, 'stocks.db');

console.log(`🔧 Building SQLite Database at: ${OUTPUT_DB}\n`);

// 刪除舊的資料庫
if (fs.existsSync(OUTPUT_DB)) {
    try {
        fs.unlinkSync(OUTPUT_DB);
        console.log('📦 Removed old database');
    } catch (e) {
        if (e.code === 'EBUSY') {
            console.warn('⚠️  Database file is busy. Attempting to overwrite without deleting...');
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

console.log('📁 Creating tables...\n');

// 建立資料表
db.exec(`
    DROP TABLE IF EXISTS latest_prices;
    DROP TABLE IF EXISTS fundamentals;
    DROP TABLE IF EXISTS chips;
    DROP TABLE IF EXISTS price_history;
    DROP TABLE IF EXISTS stocks;

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
        ma5 REAL DEFAULT 0,
        ma20 REAL DEFAULT 0,
        rsi REAL DEFAULT 0,
        FOREIGN KEY (symbol) REFERENCES stocks(symbol)
    );

    -- 基本面數據 (EPS, 三率, 營收 YoY)
    CREATE TABLE fundamentals (
        symbol TEXT PRIMARY KEY,
        year INTEGER,
        quarter INTEGER,
        eps REAL,
        gross_margin REAL,
        operating_margin REAL,
        net_margin REAL,
        revenue_yoy REAL,
        FOREIGN KEY (symbol) REFERENCES stocks(symbol)
    );

    -- 籌碼面資料 (三大法人買賣超)
    CREATE TABLE chips (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        foreign_inv INTEGER,
        invest_trust INTEGER,
        dealer INTEGER,
        PRIMARY KEY (symbol, date),
        FOREIGN KEY (symbol) REFERENCES stocks(symbol)
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
        PRIMARY KEY (symbol, date),
        FOREIGN KEY (symbol) REFERENCES stocks(symbol)
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
`);

// 載入股票清單
console.log('📊 Loading stock list...');
const stockList = JSON.parse(fs.readFileSync(STOCKS_JSON, 'utf-8'));
console.log(`   Found ${stockList.length} stocks\n`);

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
console.log('✅ Inserted stock list\n');

// 載入最新價格 (如果存在)
if (fs.existsSync(LATEST_PRICES_JSON)) {
    console.log('💰 Loading latest prices...');
    const latestPrices = JSON.parse(fs.readFileSync(LATEST_PRICES_JSON, 'utf-8'));

    const insertLatest = db.prepare(`
        INSERT OR REPLACE INTO latest_prices 
        (symbol, date, open, high, low, close, volume, turnover, change, change_pct, pe, pb, yield, revenue_yoy, eps, gross_margin, operating_margin, net_margin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                data.netMargin || 0
            );
        }
    });

    insertLatestBatch(latestPrices);
    console.log(`✅ Inserted ${Object.keys(latestPrices).length} latest prices\n`);
}

// 載入每月統計 (補齊 PE, Yield)
if (fs.existsSync(MONTHLY_STATS_JSON)) {
    console.log('📊 Updating Latest Prices with Monthly Stats (PE/Yield)...');
    const stats = JSON.parse(fs.readFileSync(MONTHLY_STATS_JSON, 'utf-8'));
    const updateStats = db.prepare(
        'UPDATE latest_prices SET pe = ?, pb = ?, yield = ? WHERE symbol = ?'
    );
    const updateBatch = db.transaction(list => {
        for (const item of list) {
            updateStats.run(
                item.peRatio || 0,
                item.pbRatio || 0,
                item.dividendYield || 0,
                item.symbol
            );
        }
    });
    updateBatch(stats);
    console.log('✅ Updated Monthly Stats\n');
}

// 載入財報數據
if (fs.existsSync(FINANCIALS_JSON)) {
    console.log('📈 Loading Financials...');
    const financials = JSON.parse(fs.readFileSync(FINANCIALS_JSON, 'utf-8'));
    const insertFin = db.prepare(`
        INSERT OR REPLACE INTO fundamentals (symbol, year, quarter, eps, gross_margin, operating_margin, net_margin)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // 獲取營收 YoY 對照
    let revenueMap = {};
    if (fs.existsSync(REVENUE_JSON)) {
        const revData = JSON.parse(fs.readFileSync(REVENUE_JSON, 'utf-8'));
        revData.forEach(r => (revenueMap[r.symbol] = r.revenueYoY));
    }

    const insertBatch = db.transaction(list => {
        for (const item of list) {
            insertFin.run(
                item.symbol,
                item.year || 0,
                item.quarter || 0,
                item.eps || 0,
                item.grossMargin || 0,
                item.operatingMargin || 0,
                item.netMargin || 0
            );
            // 更新營收 YoY
            if (revenueMap[item.symbol]) {
                db.prepare('UPDATE fundamentals SET revenue_yoy = ? WHERE symbol = ?').run(
                    revenueMap[item.symbol],
                    item.symbol
                );
            }
        }
    });
    insertBatch(financials);
    console.log(`✅ Inserted ${financials.length} financial records\n`);
}

// 載入籌碼數據
if (fs.existsSync(CHIPS_DIR)) {
    console.log('🤝 Loading Chips Data...');
    const files = fs.readdirSync(CHIPS_DIR).filter(f => f.endsWith('.json'));
    const insertChips = db.prepare(`
        INSERT OR REPLACE INTO chips (symbol, date, foreign_inv, invest_trust, dealer)
        VALUES (?, ?, ?, ?, ?)
    `);

    const chipsBatch = db.transaction((data, date) => {
        for (const item of data) {
            insertChips.run(item.symbol, date, item.foreign_inv, item.invest_trust, item.dealer);
        }
    });

    for (const file of files) {
        const date = file.replace('.json', '');
        const data = JSON.parse(fs.readFileSync(path.join(CHIPS_DIR, file), 'utf-8'));
        chipsBatch(data, date);
    }
    console.log(`✅ Loaded chips data from ${files.length} dates\n`);
}

// 處理 CSV 歷史價格
console.log('📈 Processing CSV price history...');
const csvFiles = fs.readdirSync(PRICES_DIR).filter(f => f.endsWith('.csv'));
console.log(`   Found ${csvFiles.length} CSV files\n`);

const insertHistory = db.prepare(`
    INSERT OR REPLACE INTO price_history 
    (symbol, date, open, high, low, close, volume, turnover, change, change_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 使用 transaction 進行批次插入 (大幅提升效能)
let totalRecords = 0;
let processedFiles = 0;

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
            console.error(`   ⚠️ Error processing ${file}:`, err.message);
        }
    }

    // 批次寫入
    processCSVBatch(allRecords);
    totalRecords += allRecords.length;

    // 進度顯示
    const progress = Math.round(((i + batch.length) / csvFiles.length) * 100);
    process.stdout.write(
        `\r   Progress: ${progress}% (${processedFiles}/${csvFiles.length} files, ${totalRecords.toLocaleString()} records)`
    );
}

console.log('\n\n📈 Calculating technical indicators (MA5, MA20)...');
const symbols = db.prepare('SELECT symbol FROM latest_prices').all();
const updateTech = db.prepare('UPDATE latest_prices SET ma5 = ?, ma20 = ? WHERE symbol = ?');
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
        updateTech.run(ma5Row.v || 0, ma20Row.v || 0, symbol);
    }
});
calcBatch(symbols);
console.log('✅ Technical indicators calculated');

console.log('\n');

// 最佳化資料庫
console.log('🔧 Optimizing database...');
db.pragma('optimize');
db.exec('VACUUM');
db.exec('ANALYZE');

// 關閉資料庫
db.close();

// 顯示結果
const stats = fs.statSync(OUTPUT_DB);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log('\n' + '='.repeat(50));
console.log('✅ SQLite Database Built Successfully!');
console.log('='.repeat(50));
console.log(`📁 Output: ${OUTPUT_DB}`);
console.log(`📊 Size: ${sizeMB} MB`);
console.log(`📈 Total Records: ${totalRecords.toLocaleString()}`);
console.log(`📋 Stocks: ${stockList.length}`);
console.log('='.repeat(50));
console.log('\n💡 The database is ready to use!');
console.log('   - Server: Use better-sqlite3 for sync queries');
console.log('   - Client: Use sql.js (WASM) for offline support');
