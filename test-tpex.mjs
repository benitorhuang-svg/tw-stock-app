const API_URL =
    'https://www.tpex.org.tw/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php?l=zh-tw&o=json';

async function test() {
    try {
        const res = await fetch(API_URL);
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Response starts with:', text.substring(0, 500));
        const json = JSON.parse(text);
        console.log('Response keys:', Object.keys(json));
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
