/**
 * 取得公司財務報表 (EPS, ROE, 獲利比率)
 *
 * 來源: TWSE OpenAPI (t187ap06_L_ci, t187ap17_L 等最新的財報批次)
 * 輸出: public/data/financials.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'financials.json');

// 使用多個 OpenAPI 端點來獲取最完整的「最新財報批次」
const ENDPOINTS = [
    'https://openapi.twse.com.tw/v1/opendata/t187ap06_L_ci', // 損益表摘要
    'https://openapi.twse.com.tw/v1/opendata/t187ap17_L', // 獲利能力分析
    'https://openapi.twse.com.tw/v1/opendata/t187ap14_L', // 每股盈餘
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
            console.warn(`   ⚠️ HTTP ${res.status}, 重試 ${i + 1}/${retries}`);
        } catch (e) {
            clearTimeout(timeout);
            console.warn(`   ⚠️ Error: ${e.message}, 重試 ${i + 1}/${retries}`);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    return [];
}

async function main() {
    console.log('📥 開始抓取公司最新季度財務報表...');

    // 我們將不同 API 的資料合併到以 symbol 為 key 的對照表
    const consolidated = {};

    for (const url of ENDPOINTS) {
        console.log(`   正在抓取: ${url.split('/').pop()}`);
        const data = await fetchWithRetry(url);

        data.forEach(item => {
            const symbol = item['公司代號']?.trim();
            if (!symbol) return;

            if (!consolidated[symbol]) {
                consolidated[symbol] = {
                    symbol,
                    name: item['公司名稱']?.trim(),
                    year: item['年度']?.trim(),
                    quarter: item['季別']?.trim(),
                };
            }

            // 補充各別 API 提供的欄位
            if (item['基本每股盈餘（元）'])
                consolidated[symbol].eps = parseFloat(item['基本每股盈餘（元）']);
            if (item['基本每股盈餘(元)'])
                consolidated[symbol].eps = parseFloat(item['基本每股盈餘(元)']);

            if (item['營業毛利（毛損）淨額'])
                consolidated[symbol].grossProfit = parseFloat(item['營業毛利（毛損）淨額']);
            if (item['營業利益（損失）'])
                consolidated[symbol].operatingIncome = parseFloat(item['營業利益（損失）']);
            if (item['稅後淨利']) consolidated[symbol].netIncome = parseFloat(item['稅後淨利']);

            if (item['毛利率(%)(營業毛利)/(營業收入)'])
                consolidated[symbol].grossMargin = parseFloat(
                    item['毛利率(%)(營業毛利)/(營業收入)']
                );
            if (item['營業利益率(%)(營業利益)/(營業收入)'])
                consolidated[symbol].operatingMargin = parseFloat(
                    item['營業利益率(%)(營業利益)/(營業收入)']
                );
            if (item['稅後純益率(%)(稅後純益)/(營業收入)'])
                consolidated[symbol].netMargin = parseFloat(
                    item['稅後純益率(%)(稅後純益)/(營業收入)']
                );
        });

        console.log(`   ✅ 處理完畢，目前累計 ${Object.keys(consolidated).length} 家公司`);
    }

    const result = Object.values(consolidated);

    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`\n✅ 已儲存 ${result.length} 筆財報資料至 financials.json`);
}

main().catch(console.error);
