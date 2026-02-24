/**
 * 取得每月營收數據
 *
 * 來源: TWSE OpenAPI (t187ap05_L, t187ap05_P)
 * 輸出: public/data/revenue.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'revenue.json');

// TWSE OpenAPI 端點
const ENDPOINTS = [
    'https://openapi.twse.com.tw/v1/opendata/t187ap05_L', // 上市公司
    'https://openapi.twse.com.tw/v1/opendata/t187ap05_P', // 公開發行公司
];

const REQUEST_TIMEOUT = 10000;
const MAX_RETRIES = 3;

async function fetchWithRetry(url, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) return await res.json();
            console.warn(`⚠️ 伺服器 HTTP ${res.status}: ${url}, 正在進行第 ${i + 1}/${retries} 次重試`);
        } catch (e) {
            clearTimeout(timeout);
            console.warn(`⚠️ 請求錯誤 ${url}: ${e.message}, 正在進行第 ${i + 1}/${retries} 次重試`);
        }
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
    return [];
}

async function main() {
    console.log('📥 開始下載每月營收資料...');

    let allData = [];
    for (const url of ENDPOINTS) {
        console.log(`   正在抓取: ${url}`);
        const data = await fetchWithRetry(url);
        allData = allData.concat(data);
        console.log(`   ✅ 取得 ${data.length} 筆資料`);
    }

    // 資料轉換與規格化
    const formatted = allData.map(item => ({
        symbol: item['公司代號'],
        name: item['公司名稱'],
        month: item['資料年月'],
        revenue: parseInt(item['營業收入-當月營收']) || 0,
        lastMonthRevenue: parseInt(item['營業收入-上月營收']) || 0,
        lastYearRevenue: parseInt(item['營業收入-去年當月營收']) || 0,
        revenueYoY: parseFloat(item['營業收入-去年同月增減(%)']) || 0,
        cumulativeRevenue: parseInt(item['累計營業收入-當月累計營收']) || 0,
        cumulativeYoY: parseFloat(item['累計營業收入-前期比較增減(%)']) || 0,
        note: item['備註'] || '',
    }));

    // 儲存
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(formatted, null, 2), 'utf-8');
    console.log(`\n✅ 已儲存 ${formatted.length} 筆營收資料至 revenue.json`);
}

main().catch(console.error);
