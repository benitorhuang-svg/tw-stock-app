/**
 * 統一測試所有 API 端點
 * 使用 for 迴圈一次測完，驗證目前規格中各類數據的連通性與結構。
 */

const ENDPOINTS = [
    { name: '上市股票清單 (TWSE)', url: 'https://www.twse.com.tw/exchangeReport/STOCK_DAY_ALL?response=json' },
    { name: '上櫃股票清單 (TPEx)', url: 'https://www.tpex.org.tw/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php?l=zh-tw&o=json' },
    { name: '每月營收 (上市公司)', url: 'https://openapi.twse.com.tw/v1/opendata/t187ap05_L' },
    { name: '每月營收 (公開發行)', url: 'https://openapi.twse.com.tw/v1/opendata/t187ap05_P' },
    { name: '上市公司月報 (PE/Yield)', url: 'https://www.twse.com.tw/exchangeReport/BWIBBU_ALL?response=json' },
    { name: '財務摘要 (損益表)', url: 'https://openapi.twse.com.tw/v1/opendata/t187ap06_L_ci' },
    { name: '獲利能力分析', url: 'https://openapi.twse.com.tw/v1/opendata/t187ap17_L' },
    { name: '每股盈餘 (EPS)', url: 'https://openapi.twse.com.tw/v1/opendata/t187ap14_L' }
];

async function testAll() {
    console.log('🚀 開始全量 API 連通性測試...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const api of ENDPOINTS) {
        process.stdout.write(`📡 測試中: ${api.name.padEnd(20)} `);

        try {
            const start = Date.now();
            const response = await fetch(api.url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                // 為了快速測試，設定較短的超時概念
                signal: AbortSignal.timeout(5000)
            });
            const duration = Date.now() - start;

            if (response.ok) {
                const data = await response.json();
                const count = Array.isArray(data) ? data.length : (data.data ? data.data.length : (data.aaData ? data.aaData.length : 'N/A'));
                console.log(`✅ OK (${duration}ms) | 數據筆數: ${count}`);
            } else {
                console.log(`❌ 失敗 (HTTP ${response.status})`);
            }
        } catch (error) {
            console.log(`❌ 錯誤 (${error.message})`);
        }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ 測試完成。');
}

testAll();
