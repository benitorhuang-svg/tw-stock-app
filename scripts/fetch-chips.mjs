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
        if (now.getDay() === 0) now.setDate(now.getDate() - 2); // Sunday -> Friday
        else if (now.getDay() === 6) now.setDate(now.getDate() - 1); // Saturday -> Friday

        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        dateStr = `${y}${m}${d}`;
    }

    console.log(`📥 開始抓取 ${dateStr} 三大法人買賣超...`);

    const url = `https://www.twse.com.tw/fund/T86?response=json&date=${dateStr}&selectType=ALL`;
    const data = await fetchWithRetry(url);

    if (!data || data.stat !== 'OK' || !data.data) {
        console.error('   ❌ 無資料或非交易日');
        return;
    }

    // 資料欄位解析
    // 0: 代號, 1: 名稱, 4: 外資, 10: 投信, 11: 自營商
    const chips = data.data.map(row => ({
        symbol: row[0].trim(),
        name: row[1].trim(),
        foreign_inv: parseInt(row[4].replace(/,/g, '')) || 0,
        invest_trust: parseInt(row[10].replace(/,/g, '')) || 0,
        dealer: parseInt(row[11].replace(/,/g, '')) || 0
    }));

    // 儲存為特定日期的檔案
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    const outputPath = path.join(DATA_DIR, `${dateStr}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(chips, null, 2), 'utf-8');

    console.log(`\n✅ 已儲存 ${chips.length} 筆籌碼資料至 chips/${dateStr}.json`);
}

main().catch(console.error);
