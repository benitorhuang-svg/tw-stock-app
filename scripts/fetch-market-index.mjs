/**
 * fetch-market-index.mjs — 抓取台灣加權指數 (TAIEX) 歷史資料
 *
 * 資料來源: Yahoo Finance (^TWII)
 * 輸出: public/data/market_index.json
 *
 * 用途: market_breadth_analysis, risk_management, backtest_engine
 *       (大盤 MA60 判斷、Alpha/Beta 計算、系統性風險門檻)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', 'public', 'data', 'market_index.json');
const YEARS_BACK = 5;

async function fetchTAIEX() {
    console.log('📊 Fetching TAIEX (^TWII) index history...');

    const now = Math.floor(Date.now() / 1000);
    const start = now - YEARS_BACK * 365 * 24 * 60 * 60;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5ETWII?period1=${start}&period2=${now}&interval=1d`;

    const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const json = await resp.json();
    const result = json.chart?.result?.[0];
    if (!result) throw new Error('No chart data returned');

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const volumes = quote.volume || [];

    const records = [];
    for (let i = 0; i < timestamps.length; i++) {
        const c = closes[i];
        if (c == null) continue; // skip null days

        const d = new Date(timestamps[i] * 1000);
        const date = d.toISOString().slice(0, 10);

        records.push({
            date,
            open: +(opens[i]?.toFixed(2) || 0),
            high: +(highs[i]?.toFixed(2) || 0),
            low: +(lows[i]?.toFixed(2) || 0),
            close: +(c.toFixed(2)),
            volume: volumes[i] || 0,
        });
    }

    // Sort by date ascending
    records.sort((a, b) => a.date.localeCompare(b.date));

    fs.writeFileSync(OUTPUT, JSON.stringify(records, null, 2), 'utf-8');
    console.log(`✅ TAIEX: ${records.length} trading days (${records[0]?.date} ~ ${records[records.length - 1]?.date})`);
    console.log(`   Output: ${OUTPUT}`);
    return records;
}

fetchTAIEX().catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
});
