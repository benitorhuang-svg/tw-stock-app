/**
 * Yahoo Finance 歷史資料抓取腳本
 * 
 * 使用方式:
 * node scripts/fetch-yahoo.mjs              # 自動續傳 + 跳過已完成
 * node scripts/fetch-yahoo.mjs --retry      # 重試失敗的股票
 * node scripts/fetch-yahoo.mjs --force      # 強制全部重新下載
 * node scripts/fetch-yahoo.mjs 2330 2317    # 指定股票
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 設定
const YEARS_BACK = 5;
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'prices');
const STOCKS_JSON = path.join(__dirname, '..', 'public', 'data', 'stocks.json');
const FAILED_LOG = path.join(__dirname, '..', 'public', 'data', 'failed.json');
const PROGRESS_LOG = path.join(__dirname, '..', 'public', 'data', 'progress.json');
const DELAY_MS = 1500;
const MIN_FILE_SIZE = 500; // 小於此大小視為不完整（bytes）

let startTime = null;

/**
 * 載入股票清單
 */
function loadStockList() {
    try {
        const data = fs.readFileSync(STOCKS_JSON, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ 無法讀取 stocks.json');
        return [];
    }
}

/**
 * 載入失敗清單
 */
function loadFailedList() {
    try {
        if (fs.existsSync(FAILED_LOG)) {
            return JSON.parse(fs.readFileSync(FAILED_LOG, 'utf-8'));
        }
    } catch { }
    return [];
}

/**
 * 儲存失敗清單
 */
function saveFailedList(failedSymbols) {
    fs.writeFileSync(FAILED_LOG, JSON.stringify(failedSymbols, null, 2), 'utf-8');
}

/**
 * 載入進度
 */
function loadProgress() {
    try {
        if (fs.existsSync(PROGRESS_LOG)) {
            return JSON.parse(fs.readFileSync(PROGRESS_LOG, 'utf-8'));
        }
    } catch { }
    return { lastSymbol: null, lastIndex: 0 };
}

/**
 * 儲存進度
 */
function saveProgress(symbol, index) {
    fs.writeFileSync(PROGRESS_LOG, JSON.stringify({
        lastSymbol: symbol,
        lastIndex: index,
        timestamp: new Date().toISOString()
    }, null, 2), 'utf-8');
}

/**
 * 檢查檔案是否完整（大小 > MIN_FILE_SIZE）
 */
function isFileComplete(symbol, name) {
    const safeName = sanitizeFilename(name);
    const filePath = path.join(OUTPUT_DIR, `${symbol}_${safeName}.csv`);

    if (!fs.existsSync(filePath)) return false;

    const stats = fs.statSync(filePath);
    return stats.size >= MIN_FILE_SIZE;
}

/**
 * 顯示進度條
 */
function showProgress(current, total, symbol, name, status) {
    const percent = Math.round((current / total) * 100);
    const barWidth = 30;
    const filledWidth = Math.round((current / total) * barWidth);
    const bar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);

    let eta = '--:--';
    if (startTime && current > 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const avgTime = elapsed / current;
        const remaining = avgTime * (total - current);
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        eta = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    const statusIcon = status === 'success' ? '✅' : status === 'skip' ? '⏭️' : status === 'fail' ? '❌' : status === 'retry' ? '🔄' : '📥';
    const displayName = name.substring(0, 8).padEnd(8);
    const line = `\r${bar} ${percent}% [${current}/${total}] ETA: ${eta} | ${statusIcon} ${symbol} ${displayName}`;

    process.stdout.write(line);
}

/**
 * 從 Yahoo Finance 取得歷史資料
 */
async function fetchYahooFinance(symbol) {
    const twSymbol = `${symbol}.TW`;
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (YEARS_BACK * 365 * 24 * 60 * 60);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${twSymbol}?period1=${startDate}&period2=${endDate}&interval=1d&events=history`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        return parseYahooData(data);
    } catch (error) {
        return null;
    }
}

/**
 * 解析 Yahoo Finance 回傳資料
 */
function parseYahooData(data) {
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    const rows = [];
    let prevClose = null;

    for (let i = 0; i < timestamps.length; i++) {
        const date = new Date(timestamps[i] * 1000);
        const dateStr = formatDate(date);

        const open = quote.open?.[i];
        const high = quote.high?.[i];
        const low = quote.low?.[i];
        const close = quote.close?.[i];
        const volume = quote.volume?.[i];

        if (open == null || close == null) continue;

        const change = prevClose !== null ? close - prevClose : 0;
        const changePct = prevClose !== null && prevClose !== 0 ? (change / prevClose) * 100 : 0;
        const volumeInLots = volume ? round(volume / 1000, 3) : 0;
        const avgPrice = (high + low) / 2;
        const turnover = Math.round(avgPrice * (volume || 0));

        rows.push({
            date: dateStr,
            open: round(open, 1),
            high: round(high, 1),
            low: round(low, 1),
            close: round(close, 1),
            volume: volumeInLots,
            turnover,
            change: round(change, 1),
            changePct: round(changePct, 2)
        });

        prevClose = close;
    }

    return rows.length > 0 ? rows : null;
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

function sanitizeFilename(name) {
    return name.replace(/[\/\\:*?"<>|]/g, '_');
}

function saveToCSV(symbol, name, data) {
    if (!data || data.length === 0) return false;

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const csvHeader = 'Date,Open,High,Low,Close,Volume,Turnover,Change,ChangePct';
    const csvRows = data.map(row =>
        `${row.date},${row.open},${row.high},${row.low},${row.close},${row.volume},${row.turnover},${row.change},${row.changePct}`
    );

    const csvContent = [csvHeader, ...csvRows].join('\n');
    const safeName = sanitizeFilename(name);
    const filePath = path.join(OUTPUT_DIR, `${symbol}_${safeName}.csv`);

    fs.writeFileSync(filePath, csvContent, 'utf-8');
    return true;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 主程式
 */
async function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  Yahoo Finance 台股歷史資料下載工具           ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');

    const stockList = loadStockList();
    const args = process.argv.slice(2);

    let stocks = stockList;
    let forceAll = false;
    let retryFailed = false;

    // 解析參數
    if (args.includes('--force')) {
        forceAll = true;
        console.log('⚠️ 強制模式：重新下載全部');
    } else if (args.includes('--retry')) {
        retryFailed = true;
        const failedList = loadFailedList();
        stocks = stockList.filter(s => failedList.includes(s.symbol));
        console.log(`🔄 重試模式：${stocks.length} 檔失敗股票`);
    } else if (args.length > 0 && !args[0].startsWith('--')) {
        stocks = stockList.filter(s => args.includes(s.symbol));
        console.log(`📌 指定模式：${stocks.length} 檔股票`);
    }

    if (stocks.length === 0) {
        console.log('❌ 沒有需要下載的股票');
        return;
    }

    // 載入進度，找到續傳起始點
    const progress = loadProgress();
    let startIndex = 0;

    if (!forceAll && !retryFailed && progress.lastSymbol) {
        const lastIdx = stocks.findIndex(s => s.symbol === progress.lastSymbol);
        if (lastIdx >= 0) {
            // 從最後一個開始（會重新下載它以確保完整）
            startIndex = lastIdx;
            console.log(`📍 續傳模式：從第 ${startIndex + 1} 檔 (${progress.lastSymbol}) 開始`);
        }
    }

    console.log(`📊 共 ${stocks.length} 檔股票，近 ${YEARS_BACK} 年資料`);
    console.log(`📁 輸出: ${OUTPUT_DIR}`);
    console.log('');

    let success = 0;
    let skipped = 0;
    let failed = 0;
    const failedSymbols = [];

    startTime = Date.now();

    for (let i = startIndex; i < stocks.length; i++) {
        const { symbol, name } = stocks[i];
        const displayIndex = i - startIndex + 1;
        const displayTotal = stocks.length - startIndex;

        // 檢查是否已完整下載（非強制模式）
        if (!forceAll && i !== startIndex && isFileComplete(symbol, name)) {
            skipped++;
            showProgress(displayIndex, displayTotal, symbol, name, 'skip');
        } else {
            const statusType = (i === startIndex && !forceAll) ? 'retry' : 'loading';
            showProgress(displayIndex, displayTotal, symbol, name, statusType);

            const data = await fetchYahooFinance(symbol);

            if (data && saveToCSV(symbol, name, data)) {
                success++;
                showProgress(displayIndex, displayTotal, symbol, name, 'success');
            } else {
                failed++;
                failedSymbols.push(symbol);
                showProgress(displayIndex, displayTotal, symbol, name, 'fail');
            }

            // 儲存進度
            saveProgress(symbol, i);

            if (i < stocks.length - 1) {
                await delay(DELAY_MS);
            }
        }
    }

    // 儲存失敗清單
    if (failedSymbols.length > 0) {
        const existingFailed = loadFailedList();
        const allFailed = [...new Set([...existingFailed, ...failedSymbols])];
        saveFailedList(allFailed);
    }

    // 完成後清除進度
    if (failed === 0) {
        try { fs.unlinkSync(PROGRESS_LOG); } catch { }
    }

    console.log('');
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log(`✅ 成功: ${success}  ⏭️ 跳過: ${skipped}  ❌ 失敗: ${failed}`);

    if (failed > 0) {
        console.log(`💡 執行 node scripts/fetch-yahoo.mjs --retry 重試失敗的股票`);
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const mins = Math.floor(totalTime / 60);
    const secs = totalTime % 60;
    console.log(`⏱️ 總耗時: ${mins} 分 ${secs} 秒`);
    console.log('═══════════════════════════════════════════════');
}

main().catch(console.error);
