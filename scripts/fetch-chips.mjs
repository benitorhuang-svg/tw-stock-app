/**
 * 取得三大法人買賣超資料
 *
 * 使用方式:
 * node scripts/fetch-chips.mjs [YYYYMMDD]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'public', 'data', 'chips');

// 設定
const REQUEST_TIMEOUT = 10000;
const MAX_RETRIES = 3;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) return await res.json();
            console.warn(`   ⚠️ HTTP ${res.status}, 重試 ${i + 1}/${retries}`);
        } catch (e) {
            clearTimeout(timeout);
            console.warn(`   ⚠️ Error: ${e.message}, 重試 ${i + 1}/${retries}`);
        }
        await delay(2000 * (i + 1));
    }
    return null;
}

async function main() {
    let dateStr = process.argv[2];
    if (!dateStr) {
        let now = new Date();
        // 如果是週末，往前找最接近的週五
        if (now.getDay() === 0)
            now.setDate(now.getDate() - 2); // Sunday -> Friday
        else if (now.getDay() === 6) now.setDate(now.getDate() - 1); // Saturday -> Friday

        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        dateStr = `${y}${m}${d}`;
    }

    console.log(`📥 開始抓取 ${dateStr} 三大法人買賣超...`);

    // ── 1. TWSE 上市股票 (T86) ──
    const twseUrl = `https://www.twse.com.tw/fund/T86?response=json&date=${dateStr}&selectType=ALL`;
    const twseData = await fetchWithRetry(twseUrl);

    let chips = [];

    if (twseData && twseData.stat === 'OK' && twseData.data) {
        // 0: 代號, 1: 名稱, 4: 外資, 10: 投信, 11: 自營商
        const tseChips = twseData.data.map(row => ({
            symbol: row[0].trim(),
            name: row[1].trim(),
            foreign_inv: parseInt(row[4].replace(/,/g, '')) || 0,
            invest_trust: parseInt(row[10].replace(/,/g, '')) || 0,
            dealer: parseInt(row[11].replace(/,/g, '')) || 0,
        }));
        chips.push(...tseChips);
        console.log(`   ✅ TWSE 上市: ${tseChips.length} 檔`);
    } else {
        console.warn('   ⚠️ TWSE 目前無資料或非交易日');
    }

    // ── 2. TPEx 上櫃股票 ──
    // TPEx 使用民國日期格式: YYY/MM/DD
    const dateObj = new Date(
        parseInt(dateStr.slice(0, 4)),
        parseInt(dateStr.slice(4, 6)) - 1,
        parseInt(dateStr.slice(6, 8))
    );
    const rocYear = dateObj.getFullYear() - 1911;
    const rocDate = `${rocYear}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;

    await new Promise(r => setTimeout(r, 3000)); // 避免被擋

    const tpexUrl = `https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php?l=zh-tw&o=json&se=EW&t=D&d=${rocDate}`;
    const tpexData = await fetchWithRetry(tpexUrl);

    if (tpexData) {
        const rows = tpexData.aaData || tpexData.tables?.[0]?.data;
        if (rows && rows.length > 0) {
            // TPEx 格式: 0=代號 1=名稱, 2=外資買 3=外資賣 4=外資淨, 8=投信買 9=投信賣 10=投信淨, 11=自營買 12=自營賣 13=自營淨(自行) 14=避險買 15=避險賣 16=避險淨
            // 實際欄位依 API，使用淨額合計: foreign=idx[4], trust=idx[10], dealer_self=idx[13], dealer_hedge=idx[16]
            const otcChips = rows
                .filter(r => /^\d{4}$/.test(String(r[0]).trim()))
                .map(r => ({
                    symbol: String(r[0]).trim(),
                    name: String(r[1]).trim(),
                    foreign_inv: parseInt(String(r[4]).replace(/,/g, '')) || 0,
                    invest_trust: parseInt(String(r[10]).replace(/,/g, '')) || 0,
                    dealer: (parseInt(String(r[13]).replace(/,/g, '')) || 0) + (parseInt(String(r[16]).replace(/,/g, '')) || 0),
                }));
            chips.push(...otcChips);
            console.log(`   ✅ TPEx 上櫃: ${otcChips.length} 檔`);
        } else {
            console.warn('   ⚠️ TPEx 無上櫃籌碼資料');
        }
    } else {
        console.warn('   ⚠️ TPEx 請求失敗');
    }

    if (chips.length === 0) {
        console.error('   ❌ 無任何籌碼資料（非交易日？）');
        return;
    }

    // 儲存為特定日期的檔案
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    const outputPath = path.join(DATA_DIR, `${dateStr}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(chips, null, 2), 'utf-8');

    console.log(`\n✅ 已儲存 ${chips.length} 筆籌碼資料至 chips/${dateStr}.json`);
}

main().catch(console.error);
