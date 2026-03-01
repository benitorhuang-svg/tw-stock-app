/**
 * 從證交所/櫃買中心取得完整股票清單
 *
 * 使用方式:
 * node scripts/fetch-stock-list.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'stocks.json');

// TWSE 上市股票 API
const TWSE_URL = 'https://www.twse.com.tw/exchangeReport/STOCK_DAY_ALL?response=json';

// TPEx 上櫃股票 API
const TPEX_URL =
    'https://www.tpex.org.tw/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php?l=zh-tw&o=json';

// 設定
const REQUEST_TIMEOUT = 5000;
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 帶超時與重試的 fetch
 */
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    for (let attempt = 0; attempt < retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (response.ok) return response;

            if (response.status === 429 && attempt < retries - 1) {
                await delay(BASE_DELAY * Math.pow(2, attempt));
                continue;
            }

            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (attempt === retries - 1) throw error;
            await delay(BASE_DELAY * Math.pow(2, attempt));
        }
    }
    throw new Error('Max retries exceeded');
}

/**
 * 取得上市股票清單
 */
async function fetchTWSEStocks() {
    console.log('📥 取得上市股票清單...');

    try {
        const response = await fetchWithRetry(TWSE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.data) {
            throw new Error('無資料');
        }

        // 解析資料
        // 格式: [代號, 名稱, 成交股數, ...]
        const stocks = data.data
            .filter(row => {
                const symbol = row[0];
                // 取 4 位數代碼 (普通股) 或 00 開頭的代號 (ETF)
                return /^\d{4}$/.test(symbol) || symbol.startsWith('00');
            })
            .map(row => ({
                symbol: row[0],
                name: row[1].trim(),
                market: 'TSE',
            }));

        console.log(`   ✅ 取得 ${stocks.length} 檔上市股票`);
        return stocks;
    } catch (error) {
        console.error(`   ❌ 失敗: ${error.message}`);
        return [];
    }
}

/**
 * 取得上櫃股票清單
 */
async function fetchTPExStocks() {
    console.log('📥 取得上櫃股票清單...');

    try {
        const response = await fetchWithRetry(TPEX_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // TPEx API 新版格式：資料在 tables[0].data（舊版為 aaData）
        const rows = data.aaData || data.tables?.[0]?.data;
        if (!rows) {
            throw new Error('無資料（aaData / tables[0].data 皆不存在）');
        }

        // 解析資料
        const stocks = rows
            .filter(row => {
                const symbol = row[0];
                // 取 4 位數代碼 (普通股) 或 00 開頭的代號 (ETF)
                return /^\d{4}$/.test(symbol) || symbol.startsWith('00');
            })
            .map(row => ({
                symbol: row[0],
                name: row[1].trim(),
                market: 'OTC',
            }));

        console.log(`   ✅ 取得 ${stocks.length} 檔上櫃股票`);
        return stocks;
    } catch (error) {
        console.error(`   ❌ 失敗: ${error.message}`);
        return [];
    }
}

/**
 * 備用：從本地檔案載入
 */
function loadFallbackList() {
    // 如果 API 失敗，使用預設清單
    return [
        // 半導體
        { symbol: '2330', name: '台積電', market: 'TSE' },
        { symbol: '2454', name: '聯發科', market: 'TSE' },
        { symbol: '3034', name: '聯詠', market: 'TSE' },
        { symbol: '2379', name: '瑞昱', market: 'TSE' },
        { symbol: '3711', name: '日月光投控', market: 'TSE' },
        { symbol: '2303', name: '聯電', market: 'TSE' },
        { symbol: '2408', name: '南亞科', market: 'TSE' },
        { symbol: '3443', name: '創意', market: 'TSE' },
        { symbol: '3661', name: '世芯-KY', market: 'TSE' },

        // 電子
        { symbol: '2317', name: '鴻海', market: 'TSE' },
        { symbol: '2308', name: '台達電', market: 'TSE' },
        { symbol: '2382', name: '廣達', market: 'TSE' },
        { symbol: '2357', name: '華碩', market: 'TSE' },
        { symbol: '2395', name: '研華', market: 'TSE' },
        { symbol: '3231', name: '緯創', market: 'TSE' },
        { symbol: '2324', name: '仁寶', market: 'TSE' },
        { symbol: '2353', name: '宏碁', market: 'TSE' },
        { symbol: '2301', name: '光寶科', market: 'TSE' },
        { symbol: '2327', name: '國巨', market: 'TSE' },
        { symbol: '2377', name: '微星', market: 'TSE' },
        { symbol: '3017', name: '奇鋐', market: 'TSE' },
        { symbol: '3037', name: '欣興', market: 'TSE' },
        { symbol: '4938', name: '和碩', market: 'TSE' },
        { symbol: '6669', name: '緯穎', market: 'TSE' },

        // 金融
        { symbol: '2881', name: '富邦金', market: 'TSE' },
        { symbol: '2882', name: '國泰金', market: 'TSE' },
        { symbol: '2884', name: '玉山金', market: 'TSE' },
        { symbol: '2886', name: '兆豐金', market: 'TSE' },
        { symbol: '2891', name: '中信金', market: 'TSE' },
        { symbol: '2892', name: '第一金', market: 'TSE' },
        { symbol: '2880', name: '華南金', market: 'TSE' },
        { symbol: '2883', name: '開發金', market: 'TSE' },
        { symbol: '2885', name: '元大金', market: 'TSE' },
        { symbol: '2887', name: '台新金', market: 'TSE' },
        { symbol: '2890', name: '永豐金', market: 'TSE' },

        // 傳產
        { symbol: '1301', name: '台塑', market: 'TSE' },
        { symbol: '1303', name: '南亞', market: 'TSE' },
        { symbol: '1326', name: '台化', market: 'TSE' },
        { symbol: '2002', name: '中鋼', market: 'TSE' },
        { symbol: '1402', name: '遠東新', market: 'TSE' },
        { symbol: '6505', name: '台塑化', market: 'TSE' },

        // 航運
        { symbol: '2603', name: '長榮', market: 'TSE' },
        { symbol: '2609', name: '陽明', market: 'TSE' },
        { symbol: '2615', name: '萬海', market: 'TSE' },

        // 電信
        { symbol: '2412', name: '中華電', market: 'TSE' },
        { symbol: '3045', name: '台灣大', market: 'TSE' },
        { symbol: '4904', name: '遠傳', market: 'TSE' },

        // 食品
        { symbol: '1216', name: '統一', market: 'TSE' },
        { symbol: '2912', name: '統一超', market: 'TSE' },

        // 其他
        { symbol: '2345', name: '智邦', market: 'TSE' },
        { symbol: '3008', name: '大立光', market: 'TSE' },
    ];
}

/**
 * 主程式
 */
async function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  台股股票清單下載工具                         ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');

    // 取得上市股票
    let tseStocks = await fetchTWSEStocks();

    // 稍等一下
    await new Promise(r => setTimeout(r, 1000));

    // 取得上櫃股票
    let otcStocks = await fetchTPExStocks();

    // 合併
    let allStocks = [...tseStocks, ...otcStocks];

    // 如果 API 都失敗，使用備用清單
    if (allStocks.length === 0) {
        console.log('⚠️ API 無法使用，使用備用清單');
        allStocks = loadFallbackList();
    }

    // 按代號排序
    allStocks.sort((a, b) => a.symbol.localeCompare(b.symbol));

    // 儲存
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allStocks, null, 2), 'utf-8');

    console.log('');
    console.log(`✅ 已儲存 ${allStocks.length} 檔股票到 stocks.json`);
    console.log(`   上市(TSE): ${allStocks.filter(s => s.market === 'TSE').length}`);
    console.log(`   上櫃(OTC): ${allStocks.filter(s => s.market === 'OTC').length}`);
}

main().catch(console.error);
