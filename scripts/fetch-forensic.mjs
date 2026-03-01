/**
 * fetch-forensic.mjs — 鑑識數據抓取（真實 API）
 *
 * 資料來源（全部為公開 API，零 Mock）:
 *   - dealer_details: TWSE TWT43U (上市自營商自行/避險) + TPEx 3itrade_hedge (上櫃)
 *   - director:       TWSE afterTrading/t36sb03 (上市董監持股) + TPEx directors (上櫃)
 *   - lending:        TWSE TWT93U (上市融資融券餘額) + TPEx margin_bal (上櫃)
 *   - government:     TWSE BFI82U (三大法人買賣金額) + TPEx 3insti (上櫃三大法人)
 *
 * 已移除的 Mock 表（無公開 bulk API）:
 *   - distribution:   已由 tdcc-shareholders.mjs 真實抓取，無需重複
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(__dirname, '..', 'public', 'data', 'chips');
const REQUEST_TIMEOUT = 15000;
const DELAY_MS = 3500;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function parseNum(s) { return parseInt(String(s || '0').replace(/,/g, ''), 10) || 0; }

function toTWSEDate(d) {
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
function toROCDate(d) {
    return `${d.getFullYear()-1911}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}
function toISODate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

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

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function is4Digit(s) { return /^\d{4}\s*$/.test(s); }

// ═══════════════════════════════════════════
// 1. dealer_details — 自營商自行買賣 / 避險
// ═══════════════════════════════════════════

async function fetchTSEDealer(dateStr) {
    console.log('   📥 TWSE TWT43U 上市自營商買賣超...');
    const data = await fetchJSON(
        `https://www.twse.com.tw/rwd/zh/fund/TWT43U?date=${dateStr}&response=json`
    );
    if (data.stat !== 'OK' || !data.data) {
        console.log(`   ⚠️  TWSE TWT43U 無資料 (stat=${data.stat})`);
        return [];
    }
    // groups: 自營商(自行買賣) idx[2-4], 自營商(避險) idx[5-7]
    const result = data.data
        .filter(r => is4Digit(r[0]))
        .map(r => ({ symbol: r[0].trim(), prop: parseNum(r[4]), hedge: parseNum(r[7]) }));
    console.log(`   ✅ TSE 自營商: ${result.length} 檔`);
    return result;
}

async function fetchOTCDealer(rocDate) {
    console.log('   📥 TPEx 上櫃自營商買賣超...');
    const data = await fetchJSON(
        `https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php?l=zh-tw&o=json&se=EW&t=D&d=${rocDate}`
    );
    const rows = data.aaData || data.tables?.[0]?.data;
    if (!rows) { console.log('   ⚠️  TPEx 無自營商資料'); return []; }
    // 自營(自行) idx[14-16], 自營(避險) idx[17-19],  淨=idx[16]/[19]
    const result = rows
        .filter(r => /^\d{4}$/.test(String(r[0]).trim()))
        .map(r => ({ symbol: String(r[0]).trim(), prop: parseNum(r[16]), hedge: parseNum(r[19]) }));
    console.log(`   ✅ OTC 自營商: ${result.length} 檔`);
    return result;
}

// ═══════════════════════════════════════════
// 2. director — 全體董監持股比率與設質
// ═══════════════════════════════════════════

async function fetchTSEDirector(dateStr) {
    console.log('   📥 TWSE 上市董監持股比率...');
    try {
        const data = await fetchJSON(
            `https://www.twse.com.tw/rwd/zh/afterTrading/t36sb03?date=${dateStr}&selectType=ALL&response=json`
        );
        if (data.stat === 'OK' && data.data?.length > 0) {
            const result = data.data.filter(r => is4Digit(r[0])).map(r => ({
                symbol: r[0].trim(),
                ratio: parseFloat(r[3]) || 0,
                pawn: parseFloat(r[4]) || 0,
                change: parseNum(r[5]),
            }));
            console.log(`   ✅ TSE 董監持股: ${result.length} 檔`);
            return result;
        }
    } catch (e) { console.log(`   ⚠️  TWSE t36sb03: ${e.message}`); }
    console.log('   ℹ️  上市董監持股無資料（月頻，可能尚未公布）');
    return [];
}

async function fetchOTCDirector(rocDate) {
    console.log('   📥 TPEx 上櫃董監持股比率...');
    try {
        const data = await fetchJSON(
            `https://www.tpex.org.tw/web/stock/exright/directors/directors_result.php?l=zh-tw&o=json&d=${rocDate}`
        );
        const rows = data.aaData || data.tables?.[0]?.data;
        if (rows?.length > 0) {
            const result = rows.filter(r => /^\d{4}$/.test(String(r[0]).trim())).map(r => ({
                symbol: String(r[0]).trim(),
                ratio: parseFloat(r[3]) || 0,
                pawn: parseFloat(r[4]) || 0,
                change: parseNum(r[5]),
            }));
            console.log(`   ✅ OTC 董監持股: ${result.length} 檔`);
            return result;
        }
    } catch (e) { console.log(`   ⚠️  TPEx directors: ${e.message}`); }
    console.log('   ℹ️  上櫃董監持股無資料');
    return [];
}

// ═══════════════════════════════════════════
// 3. lending — 有價證券借貸餘額
// ═══════════════════════════════════════════

async function fetchTSELending(dateStr) {
    console.log('   📥 TWSE TWT93U 上市融資融券餘額...');
    try {
        const data = await fetchJSON(
            `https://www.twse.com.tw/rwd/zh/marginTrading/TWT93U?date=${dateStr}&response=json`
        );
        if (data.stat === 'OK' && data.data?.length > 0) {
            // idx[6]=融資餘額, idx[12]=融券餘額, idx[13]=融券次一日限額
            const result = data.data.filter(r => is4Digit(r[0])).map(r => ({
                symbol: r[0].trim(),
                lending_balance: parseNum(r[6]),
                shorting_balance: parseNum(r[12]),
                limit: parseNum(r[13]),
            }));
            console.log(`   ✅ TSE 融資融券: ${result.length} 檔`);
            return result;
        }
    } catch (e) { console.log(`   ⚠️  TWSE TWT93U: ${e.message}`); }
    console.log('   ℹ️  上市融資融券無資料（可能非交易日）');
    return [];
}

async function fetchOTCLending(rocDate) {
    console.log('   📥 TPEx 上櫃融資融券餘額...');
    try {
        const data = await fetchJSON(
            `https://www.tpex.org.tw/web/stock/margin_trading/margin_balance/margin_bal_result.php?l=zh-tw&o=json&d=${rocDate}&se=EW`
        );
        const rows = data.aaData || data.tables?.[0]?.data;
        if (rows?.length > 0) {
            // idx[6]=資餘額, idx[14]=券餘額, idx[17]=券限額
            const result = rows.filter(r => /^\d{4}$/.test(String(r[0]).trim())).map(r => ({
                symbol: String(r[0]).trim(),
                lending_balance: parseNum(r[6]),
                shorting_balance: parseNum(r[14]),
                limit: parseNum(r[17]),
            }));
            console.log(`   ✅ OTC 融資融券: ${result.length} 檔`);
            return result;
        }
    } catch (e) { console.log(`   ⚠️  TPEx margin_bal: ${e.message}`); }
    console.log('   ℹ️  上櫃融資融券無資料');
    return [];
}

// ═══════════════════════════════════════════
// 4. government — 三大法人買賣金額（市場彙總）
// ═══════════════════════════════════════════

const GOV_CATEGORIES = [
    { key: 'dealer_prop', label: '自營商(自行買賣)' },
    { key: 'dealer_hedge', label: '自營商(避險)' },
    { key: 'trust', label: '投信' },
    { key: 'foreign', label: '外資及陸資(不含外資自營商)' },
    { key: 'foreign_prop', label: '外資自營商' },
    { key: 'total', label: '合計' },
];

async function fetchTSEGovernment(dateStr) {
    console.log('   📥 TWSE BFI82U 三大法人買賣金額...');
    try {
        const data = await fetchJSON(
            `https://www.twse.com.tw/fund/BFI82U?dayDate=${dateStr}&type=day&response=json`
        );
        if (data.stat !== 'OK' || !data.data?.length) {
            console.log('   ⚠️  BFI82U 無資料');
            return [];
        }
        const result = [];
        for (const row of data.data) {
            const name = String(row[0]).trim();
            const cat = GOV_CATEGORIES.find(c => name.includes(c.label) || c.label.includes(name));
            if (!cat) continue;
            const buyAmt = parseInt(String(row[1]).replace(/,/g, '')) || 0;
            const sellAmt = parseInt(String(row[2]).replace(/,/g, '')) || 0;
            const netAmt = parseInt(String(row[3]).replace(/,/g, '')) || 0;
            result.push({ category: cat.key, buy_amount: buyAmt, sell_amount: sellAmt, net_amount: netAmt });
        }
        console.log(`   ✅ TSE 三大法人: ${result.length} 類別`);
        return result;
    } catch (e) { console.log(`   ⚠️  BFI82U: ${e.message}`); }
    return [];
}

async function fetchOTCGovernment(rocDate) {
    console.log('   📥 TPEx 上櫃三大法人買賣金額...');
    try {
        const data = await fetchJSON(
            `https://www.tpex.org.tw/web/stock/3insti/3insti_summary/3itrade_summary_result.php?l=zh-tw&o=json&se=EW&t=D&d=${rocDate}`
        );
        const rows = data.aaData || data.tables?.[0]?.data;
        if (!rows?.length) {
            console.log('   ⚠️  TPEx 三大法人無資料');
            return [];
        }
        // TPEx 格式: [名稱, 買進金額, 賣出金額, 買賣差額]
        const result = [];
        const mapping = {
            '外資及陸資(不含外資自營商)': 'foreign',
            '外資自營商': 'foreign_prop',
            '投信': 'trust',
            '自營商(自行買賣)': 'dealer_prop',
            '自營商(避險)': 'dealer_hedge',
            '合計': 'total',
        };
        for (const row of rows) {
            const name = String(row[0]).trim();
            const key = Object.keys(mapping).find(k => name.includes(k));
            if (!key) continue;
            result.push({
                category: mapping[key],
                buy_amount: parseInt(String(row[1]).replace(/,/g, '')) || 0,
                sell_amount: parseInt(String(row[2]).replace(/,/g, '')) || 0,
                net_amount: parseInt(String(row[3]).replace(/,/g, '')) || 0,
            });
        }
        console.log(`   ✅ OTC 三大法人: ${result.length} 類別`);
        return result;
    } catch (e) { console.log(`   ⚠️  TPEx 3insti: ${e.message}`); }
    return [];
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════

async function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  鑑識數據抓取 — Real API (zero mock)         ║');
    console.log('╚═══════════════════════════════════════════════╝');

    // 計算目標日期（週末回溯至週五，並可嘗試前幾個交易日）
    const target = new Date();
    if (target.getDay() === 0) target.setDate(target.getDate() - 2);
    if (target.getDay() === 6) target.setDate(target.getDate() - 1);

    // 嘗試最近 5 個交易日（遇到休市自動回溯）
    let dateStr, rocDate, foundDate = false;
    for (let attempt = 0; attempt < 5; attempt++) {
        const d = new Date(target);
        d.setDate(d.getDate() - attempt);
        if (d.getDay() === 0) d.setDate(d.getDate() - 2);
        if (d.getDay() === 6) d.setDate(d.getDate() - 1);

        dateStr = toTWSEDate(d);
        rocDate = toROCDate(d);

        console.log(`📅 嘗試日期: ${toISODate(d)} (TWSE=${dateStr}, ROC=${rocDate})`);

        // 用 TWT43U 判斷是否為交易日
        try {
            const probe = await fetchJSON(
                `https://www.twse.com.tw/rwd/zh/fund/TWT43U?date=${dateStr}&response=json`
            );
            if (probe.stat === 'OK' && probe.data?.length > 0) {
                console.log(`✅ 確認 ${toISODate(d)} 為交易日 (${probe.data.length} 筆)\n`);
                foundDate = true;
                break;
            }
        } catch {}
        console.log(`   → 非交易日或無資料，回溯...`);
        await delay(2000);
    }

    if (!foundDate) {
        console.log('\n⚠️ 最近 5 個工作日均無交易資料，跳過本次抓取');
        return;
    }

    // Ensure output directories
    for (const d of ['dealer_details', 'director', 'lending']) ensureDir(path.join(BASE_DIR, d));

    const summary = {};

    // ── 1. dealer_details ── (TWT43U 已在 probe 階段驗證過)
    console.log('🔍 [1/3] 自營商自行買賣 / 避險明細');
    let dealers = [];
    try { dealers.push(...await fetchTSEDealer(dateStr)); } catch(e) { console.log(`   ❌ TSE: ${e.message}`); }
    await delay(DELAY_MS);
    try { dealers.push(...await fetchOTCDealer(rocDate)); } catch(e) { console.log(`   ❌ OTC: ${e.message}`); }
    if (dealers.length) {
        fs.writeFileSync(path.join(BASE_DIR, 'dealer_details', `${dateStr}.json`), JSON.stringify(dealers, null, 2));
    }
    summary.dealer_details = dealers.length;
    await delay(DELAY_MS);

    // ── 2. director ── (月頻資料，可能需要回溯更多天)
    console.log('\n🔍 [2/3] 全體董監持股比率與設質');
    let directors = [];
    try { directors.push(...await fetchTSEDirector(dateStr)); } catch(e) { console.log(`   ❌ TSE: ${e.message}`); }
    await delay(DELAY_MS);
    try { directors.push(...await fetchOTCDirector(rocDate)); } catch(e) { console.log(`   ❌ OTC: ${e.message}`); }

    // 董監持股為月頻資料，若當日無資料則回溯最近 30 天
    if (directors.length === 0) {
        console.log('   🔄 當日無董監資料，回溯搜尋最近 30 天...');
        for (let back = 1; back <= 30 && directors.length === 0; back++) {
            const d = new Date(target);
            d.setDate(d.getDate() - back);
            if (d.getDay() === 0 || d.getDay() === 6) continue;
            const backDateStr = toTWSEDate(d);
            const backRocDate = toROCDate(d);
            try { directors.push(...await fetchTSEDirector(backDateStr)); } catch {}
            await delay(1500);
            try { directors.push(...await fetchOTCDirector(backRocDate)); } catch {}
            if (directors.length > 0) {
                console.log(`   ✅ 回溯至 ${toISODate(d)} 找到 ${directors.length} 筆董監資料`);
            }
            await delay(1500);
        }
    }
    if (directors.length) {
        fs.writeFileSync(path.join(BASE_DIR, 'director', `${dateStr}.json`), JSON.stringify(directors, null, 2));
    }
    summary.director = directors.length;
    await delay(DELAY_MS);

    // ── 3. lending ──
    console.log('\n🔍 [3/4] 有價證券借貸餘額');
    let lending = [];
    try { lending.push(...await fetchTSELending(dateStr)); } catch(e) { console.log(`   ❌ TSE: ${e.message}`); }
    await delay(DELAY_MS);
    try { lending.push(...await fetchOTCLending(rocDate)); } catch(e) { console.log(`   ❌ OTC: ${e.message}`); }
    if (lending.length) {
        fs.writeFileSync(path.join(BASE_DIR, 'lending', `${dateStr}.json`), JSON.stringify(lending, null, 2));
    }
    summary.lending = lending.length;
    await delay(DELAY_MS);

    // ── 4. government — 三大法人市場彙總 ──
    console.log('\n🔍 [4/4] 三大法人買賣金額（市場彙總）');
    ensureDir(path.join(BASE_DIR, 'government'));
    let govTSE = [];
    let govOTC = [];
    try { govTSE = await fetchTSEGovernment(dateStr); } catch(e) { console.log(`   ❌ TSE: ${e.message}`); }
    await delay(DELAY_MS);
    try { govOTC = await fetchOTCGovernment(rocDate); } catch(e) { console.log(`   ❌ OTC: ${e.message}`); }
    // 合併: TSE + OTC 同類別金額加總
    const govMerged = {};
    for (const g of [...govTSE, ...govOTC]) {
        if (!govMerged[g.category]) {
            govMerged[g.category] = { category: g.category, buy_amount: 0, sell_amount: 0, net_amount: 0 };
        }
        govMerged[g.category].buy_amount += g.buy_amount;
        govMerged[g.category].sell_amount += g.sell_amount;
        govMerged[g.category].net_amount += g.net_amount;
    }
    const govResult = Object.values(govMerged);
    if (govResult.length) {
        fs.writeFileSync(path.join(BASE_DIR, 'government', `${dateStr}.json`), JSON.stringify(govResult, null, 2));
    }
    summary.government = govResult.length;

    // ── Summary ──
    console.log('\n════════════════════════════════════════');
    console.log('📊 鑑識數據抓取完成（全部真實 API）');
    for (const [k, v] of Object.entries(summary)) {
        console.log(`   ${v > 0 ? '✅' : '⚠️'} ${k}: ${v} 筆`);
    }
    console.log('');
    console.log('ℹ️  distribution → 已由 tdcc-shareholders.mjs 獨立抓取');
    console.log('ℹ️  major_broker → 由 import-forensic 從 chips+price 資料衍算');
    console.log('');
}

main().catch(err => {
    console.error('❌ 鑑識數據抓取失敗:', err.message);
    process.exit(1);
});
