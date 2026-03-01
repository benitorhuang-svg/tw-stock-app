/**
 * fetch-dividends.mjs — 除權除息歷史資料抓取
 *
 * 資料來源（全部公開 API）:
 *   - TWSE TWT49U:  上市除權息公告（年度範圍查詢）
 *   - TPEx exDailyQ: 上櫃除權息公告（年度範圍查詢）
 *
 * 輸出: public/data/dividends.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', 'public', 'data', 'dividends.json');
const REQUEST_TIMEOUT = 20000;
const DELAY_MS = 3500;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJSON(url) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
    try {
        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        clearTimeout(tid);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) { clearTimeout(tid); throw e; }
}

/** 解析 ROC 日期 "114年03月05日" → "2025-03-05" */
function parseROCDate(s) {
    const m = String(s).match(/(\d+)年(\d+)月(\d+)日/);
    if (!m) return null;
    const y = parseInt(m[1]) + 1911;
    return `${y}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

/** 解析 ROC 日期 "114/03/05" → "2025-03-05" */
function parseROCSlash(s) {
    const parts = String(s).split('/');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0]) + 1911;
    return `${y}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
}

function is4Digit(s) { return /^\d{4}$/.test(String(s).trim()); }

// ─── TWSE 上市除權息 ───

async function fetchTWSEDividends(year) {
    const adYear = year + 1911;
    const url = `https://www.twse.com.tw/rwd/zh/exRight/TWT49U?startDate=${adYear}0101&endDate=${adYear}1231&response=json`;
    console.log(`   📥 TWSE 上市 ${adYear} 年...`);
    try {
        const data = await fetchJSON(url);
        if (data.stat !== 'OK' || !data.data?.length) {
            console.log(`   ℹ️  上市 ${adYear} 年無資料`);
            return [];
        }
        const results = [];
        for (const row of data.data) {
            const symbol = String(row[1]).trim();
            if (!is4Digit(symbol)) continue;
            const exDate = parseROCDate(row[0]);
            if (!exDate) continue;
            const dividend = parseFloat(row[5]) || 0;
            if (dividend <= 0) continue;
            results.push({
                symbol,
                year: parseInt(exDate.slice(0, 4)),
                ex_dividend_date: exDate,
                dividend,
                type: String(row[6]).trim(), // 權/息/權息
            });
        }
        console.log(`   ✅ 上市 ${adYear}: ${results.length} 筆`);
        return results;
    } catch (e) {
        console.log(`   ⚠️  TWSE ${adYear}: ${e.message}`);
        return [];
    }
}

// ─── TPEx 上櫃除權息 ───

async function fetchTPExDividends(year) {
    const adYear = year + 1911;
    const url = `https://www.tpex.org.tw/web/stock/exright/dailyquo/exDailyQ_result.php?l=zh-tw&o=json&d=${year}/01/01&ed=${year}/12/31`;
    console.log(`   📥 TPEx 上櫃 ${adYear} 年...`);
    try {
        const data = await fetchJSON(url);
        const rows = data.aaData || data.tables?.[0]?.data;
        if (!rows?.length) {
            console.log(`   ℹ️  上櫃 ${adYear} 年無資料`);
            return [];
        }
        const results = [];
        for (const row of rows) {
            const symbol = String(row[1]).trim();
            if (!is4Digit(symbol)) continue;
            const exDate = parseROCSlash(row[0]);
            if (!exDate) continue;
            // row[5] = 權值, row[6] = 息值
            const stockDiv = parseFloat(row[5]) || 0;
            const cashDiv = parseFloat(row[6]) || 0;
            const total = stockDiv + cashDiv;
            if (total <= 0) continue;
            results.push({
                symbol,
                year: parseInt(exDate.slice(0, 4)),
                ex_dividend_date: exDate,
                dividend: total,
                type: String(row[8]).trim(), // 除權/除息/除權息
            });
        }
        console.log(`   ✅ 上櫃 ${adYear}: ${results.length} 筆`);
        return results;
    } catch (e) {
        console.log(`   ⚠️  TPEx ${adYear}: ${e.message}`);
        return [];
    }
}

// ─── Main ───

async function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  除權除息歷史資料抓取 — TWSE + TPEx API      ║');
    console.log('╚═══════════════════════════════════════════════╝');

    const currentAD = new Date().getFullYear();
    const currentROC = currentAD - 1911;
    // 抓取近 6 年 (ROC 109~115 → 2020~2026)
    const startROC = currentROC - 5;

    const allDividends = [];

    for (let rocYear = startROC; rocYear <= currentROC; rocYear++) {
        const tse = await fetchTWSEDividends(rocYear);
        allDividends.push(...tse);
        await delay(DELAY_MS);

        const otc = await fetchTPExDividends(rocYear);
        allDividends.push(...otc);
        await delay(DELAY_MS);
    }

    // 去重 (同 symbol + ex_dividend_date)
    const seen = new Set();
    const unique = allDividends.filter(d => {
        const key = `${d.symbol}_${d.ex_dividend_date}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    fs.writeFileSync(OUTPUT, JSON.stringify(unique, null, 2));

    console.log('');
    console.log('════════════════════════════════════════');
    console.log(`📊 除權除息資料抓取完成`);
    console.log(`   ✅ 共 ${unique.length} 筆（${startROC + 1911}~${currentAD}）`);
    console.log(`   📁 ${OUTPUT}`);
    console.log('');
}

main().catch(err => {
    console.error('❌ 除權除息抓取失敗:', err.message);
    process.exit(1);
});
