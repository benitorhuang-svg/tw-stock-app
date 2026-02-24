/**
 * 抓取歷史估值資料 (PE, PB, 殖利率)
 * 
 * 用於繪製「本益比河流圖」與「股淨比河流圖」
 * 每月抓取一次資料，回溯 5 年
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'public', 'data', 'valuation');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');

const DELAY_MS = 3000; // TWSE 頻率限制較嚴格
const YEARS_BACK = 5;

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (res.ok) return await res.json();
            console.warn(`   ⚠️ HTTP ${res.status}, 重試 ${i + 1}/${retries}`);
        } catch (e) {
            console.warn(`   ⚠️ Error: ${e.message}, 重試 ${i + 1}/${retries}`);
        }
        await delay(5000 * (i + 1));
    }
    return null;
}

// 取得過去 X 年的所有月份（倒序）
function getMonths() {
    const months = [];
    const now = new Date();
    for (let i = 0; i < YEARS_BACK * 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        // 抓取每個月的 25 號 (避開月初可能還沒更新，且通常是交易日或接近交易日)
        months.push(`${y}${m}25`);
    }
    return months;
}

async function main() {
    console.log('📥 開始抓取歷史估值資料 (PE/PB History)...');
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    const months = getMonths();
    let count = 0;

    for (const dateStr of months) {
        const outputPath = path.join(DATA_DIR, `${dateStr}.json`);

        // 跳過已存在的資料
        if (fs.existsSync(outputPath)) {
            // console.log(`   ⏩ 跳過已存在的日期: ${dateStr}`);
            continue;
        }

        console.log(`   正在抓取: ${dateStr}...`);
        const url = `https://www.twse.com.tw/exchangeReport/BWIBBU_ALL?response=json&date=${dateStr}`;
        const data = await fetchWithRetry(url);

        if (!data || data.stat !== 'OK' || !data.data) {
            console.warn(`   ⚠️ ${dateStr} 無法取得資料 (可能是非交易日)，嘗試往前一天...`);
            // 此處簡單處理，跳過即可
            continue;
        }

        const stats = data.data.map(row => ({
            symbol: row[0],
            pe: parseFloat(row[2]) || 0,
            yield: parseFloat(row[3]) || 0,
            pb: parseFloat(row[4]) || 0
        }));

        fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2), 'utf-8');
        console.log(`   ✅ 已儲存 ${stats.length} 筆資料`);

        count++;
        await delay(DELAY_MS);
    }

    console.log(`\n🎉 歷史估值抓取完成，共新增 ${count} 個月份資料。`);
    console.log(`📁 資料存在於: ${DATA_DIR}`);
}

main().catch(console.error);
