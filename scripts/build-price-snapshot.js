/**
 * Build Script: Generate Latest Prices Snapshot
 *
 * Reads all CSV files from public/data/prices/ and generates
 * a single JSON file with the latest price for each stock.
 *
 * Run: node scripts/build-price-snapshot.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRICES_DIR = path.join(__dirname, '../public/data/prices');
const OUTPUT_FILE = path.join(__dirname, '../public/data/latest_prices.json');
const INDEX_FILE = path.join(__dirname, '../public/data/price_index.json');
const CHIPS_DIR = path.join(__dirname, '../public/data/chips');

function parseCSV(csvText) {
    if (!csvText) return null;
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;

    const headers = lines[0].split(',');
    const lastLine = lines[lines.length - 1];
    const values = lastLine.split(',');

    const record = {};
    headers.forEach((h, i) => {
        const val = values[i];
        if (h === 'Date') record[h] = val;
        else record[h] = parseFloat(val) || 0;
    });

    return record;
}

async function buildPriceSnapshot() {
    console.log('🚀 正在建置行情數據快照...');

    // 動態讀取價格目錄以獲取所有可用股票
    if (!fs.existsSync(PRICES_DIR)) {
        console.error('❌ 找不到價格資料目錄');
        process.exit(1);
    }

    const files = fs.readdirSync(PRICES_DIR).filter(f => f.endsWith('.csv'));
    const priceIndex = {};
    files.forEach(file => {
        const symbol = file.split('_')[0];
        if (symbol) priceIndex[symbol] = file;
    });

    const symbols = Object.keys(priceIndex);

    console.log(`📊 正在處理 ${symbols.length} 檔股票數據...`);

    // Load real fundamental data
    const MONTHLY_STATS_FILE = path.join(__dirname, '../public/data/monthly_stats.json');
    const REVENUE_FILE = path.join(__dirname, '../public/data/revenue.json');
    const FINANCIALS_FILE = path.join(__dirname, '../public/data/financials.json');

    const statsMap = {};
    if (fs.existsSync(MONTHLY_STATS_FILE)) {
        const stats = JSON.parse(fs.readFileSync(MONTHLY_STATS_FILE, 'utf-8'));
        for (const s of stats) {
            statsMap[s.symbol] = s;
        }
        console.log(`  📈 已載入 ${stats.length} 筆每月統計數據 (本益比/股淨比/殖利率)`);
    }

    const revenueMap = {};
    if (fs.existsSync(REVENUE_FILE)) {
        const rev = JSON.parse(fs.readFileSync(REVENUE_FILE, 'utf-8'));
        for (const r of rev) {
            revenueMap[r.symbol] = r;
        }
        console.log(`  💰 已載入 ${rev.length} 筆營收紀錄`);
    }

    const financialsMap = {};
    if (fs.existsSync(FINANCIALS_FILE)) {
        const fin = JSON.parse(fs.readFileSync(FINANCIALS_FILE, 'utf-8'));
        for (const f of fin) {
            financialsMap[f.symbol] = f;
        }
        console.log(`  📊 已載入 ${fin.length} 筆財務報表紀錄`);
    }

    // 籌碼連買計算
    const streakMap = {};
    if (fs.existsSync(CHIPS_DIR)) {
        const chipFiles = fs.readdirSync(CHIPS_DIR).filter(f => f.endsWith('.json')).sort().reverse().slice(0, 20);
        console.log(`  🤝 正在分析 ${chipFiles.length} 份籌碼檔案以計算連買/連賣天數...`);

        const history = {}; // symbol -> days[]

        for (const file of chipFiles) {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(CHIPS_DIR, file), 'utf-8'));
                for (const item of data) {
                    if (!history[item.symbol]) history[item.symbol] = [];
                    history[item.symbol].push(item);
                }
            } catch (e) { }
        }

        for (const symbol in history) {
            const days = history[symbol];
            const calc = (key) => {
                let streak = 0;
                if (!days[0] || days[0][key] === 0) return 0;
                const isBuy = days[0][key] > 0;
                for (const d of days) {
                    if (isBuy && d[key] > 0) streak++;
                    else if (!isBuy && d[key] < 0) streak--;
                    else break;
                }
                return streak;
            };
            streakMap[symbol] = {
                foreign: calc('foreign_inv'),
                trust: calc('invest_trust'),
                dealer: calc('dealer')
            };
        }
    }

    const latestPrices = {};
    let processed = 0;
    let errors = 0;

    for (const symbol of symbols) {
        const filename = priceIndex[symbol];
        const filePath = path.join(PRICES_DIR, filename);

        try {
            if (fs.existsSync(filePath)) {
                const csvText = fs.readFileSync(filePath, 'utf-8');
                const latestRecord = parseCSV(csvText);

                if (latestRecord) {
                    const stat = statsMap[symbol];
                    const rev = revenueMap[symbol];
                    const fin = financialsMap[symbol];

                    latestPrices[symbol] = {
                        date: latestRecord.Date,
                        open: latestRecord.Open,
                        high: latestRecord.High,
                        low: latestRecord.Low,
                        close: latestRecord.Close,
                        volume: latestRecord.Volume,
                        change: latestRecord.Change,
                        changePct: latestRecord.ChangePct || 0,
                        pe: stat?.peRatio || 0,
                        pb: stat?.pbRatio || 0,
                        yield: stat?.dividendYield || 0,
                        revenueYoY: rev?.revenueYoY || 0,
                        eps: fin?.eps || 0,
                        grossMargin: fin?.grossMargin || 0,
                        operatingMargin: fin?.operatingMargin || 0,
                        netMargin: fin?.netMargin || 0,
                        foreignStreak: streakMap[symbol]?.foreign || 0,
                        trustStreak: streakMap[symbol]?.trust || 0,
                        dealerStreak: streakMap[symbol]?.dealer || 0,
                    };
                    processed++;
                }
            }
        } catch (e) {
            errors++;
        }

        if (processed % 100 === 0 || processed === symbols.length) {
            process.stdout.write(`\r  已處理: ${processed}/${symbols.length}`);
        }
    }

    console.log(`\n✅ 成功處理 ${processed} 檔股票 (${errors} 筆錯誤)`);

    // Write output
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(latestPrices, null, 2));

    const fileSizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2);
    console.log(`📦 輸出檔案: ${OUTPUT_FILE} (${fileSizeKB} KB)`);
    console.log('🎉 建置完成！');
}

buildPriceSnapshot().catch(console.error);
