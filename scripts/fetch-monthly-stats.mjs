/**
 * 取得上市公司月報 (P/E, 殖利率, 股淨比)
 *
 * 來源: TWSE (index04 數據)
 * 輸出: public/data/monthly_stats.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'monthly_stats.json');

const REQUEST_TIMEOUT = 5000;
const MAX_RETRIES = 3;

async function fetchWithRetry(url, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        try {
            const res = await fetch(url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0' },
            });
            clearTimeout(timeout);
            if (res.ok) return await res.json();
            console.warn(`   ⚠️ HTTP ${res.status}, 重試 ${i + 1}/${retries}`);
        } catch (e) {
            clearTimeout(timeout);
            console.warn(`   ⚠️ 請求錯誤: ${e.message}, 正在進行第 ${i + 1}/${retries} 次重試`);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    return null;
}

async function main() {
    const now = new Date();
    // 獲取最近一個工作日的資料 (通常是昨天)
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}${m}${d}`;

    console.log(`📥 開始抓取 ${dateStr} 月報統計 (P/E, Yield)...`);

    let stats = [];

    // ── 1. TWSE 上市 ──
    const twseUrl = `https://www.twse.com.tw/exchangeReport/BWIBBU_ALL?response=json&date=${dateStr}`;
    const twseData = await fetchWithRetry(twseUrl);

    if (twseData && twseData.stat === 'OK' && twseData.data) {
        // 格式: 股票代號, 股票名稱, 本益比, 殖利率(%), 股價淨值比
        const tseStats = twseData.data.map(row => ({
            symbol: row[0],
            name: row[1],
            peRatio: parseFloat(row[2]) || 0,
            dividendYield: parseFloat(row[3]) || 0,
            pbRatio: parseFloat(row[4]) || 0,
        }));
        stats.push(...tseStats);
        console.log(`   ✅ TWSE 上市: ${tseStats.length} 檔`);
    } else {
        console.warn('   ⚠️ TWSE 無資料或非交易日');
    }

    // ── 2. TPEx 上櫃 ──
    // TPEx 使用民國日期: YYY/MM/DD
    const rocYear = y - 1911;
    const rocDate = `${rocYear}/${m}/${d}`;

    await new Promise(r => setTimeout(r, 3000)); // 避免被擋

    const tpexUrl = `https://www.tpex.org.tw/web/stock/aftertrading/peratio_analysis/pera_result.php?l=zh-tw&o=json&d=${rocDate}&c=`;
    const tpexData = await fetchWithRetry(tpexUrl);

    if (tpexData) {
        const rows = tpexData.aaData || tpexData.tables?.[0]?.data;
        if (rows && rows.length > 0) {
            // TPEx 格式: 0=代號, 1=名稱, 2=本益比, 3=殖利率, 4=股價淨值比
            const otcStats = rows
                .filter(r => /^\d{4}$/.test(String(r[0]).trim()))
                .map(r => ({
                    symbol: String(r[0]).trim(),
                    name: String(r[1]).trim(),
                    peRatio: parseFloat(r[2]) || 0,
                    dividendYield: parseFloat(r[3]) || 0,
                    pbRatio: parseFloat(r[4]) || 0,
                }));
            stats.push(...otcStats);
            console.log(`   ✅ TPEx 上櫃: ${otcStats.length} 檔`);
        } else {
            console.warn('   ⚠️ TPEx 無上櫃月報資料');
        }
    } else {
        console.warn('   ⚠️ TPEx 請求失敗');
    }

    if (!fs.existsSync(path.dirname(OUTPUT_FILE)))
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stats, null, 2), 'utf-8');

    console.log(`\n✅ 已儲存 ${stats.length} 檔股票統計至 monthly_stats.json`);
}

main().catch(console.error);
