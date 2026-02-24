import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');

    if (!symbol) {
        return new Response(JSON.stringify({ error: 'Missing symbol parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // 先假設為上市 (TWSE)
        let yahooSymbol = `${symbol}.TW`;
        let yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1m`;

        let response = await fetch(yahooUrl);

        // 若找不到上市股票，自動 fallback 測試上櫃 (OTC)
        if (!response.ok || response.status === 404) {
            yahooSymbol = `${symbol}.TWO`;
            yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1m`;
            response = await fetch(yahooUrl);

            if (!response.ok) {
                throw new Error('Yahoo Finance API failed to find this symbol.');
            }
        }

        const data = await response.json();

        // 整理 Yahoo 回傳的結構，防呆空值
        const result = data.chart?.result?.[0];
        if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
            throw new Error('Invalid data format from Yahoo Finance');
        }

        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        const prevClose = result.meta.previousClose;

        // 將兩者組合成我們前端好畫圖的 TimeSeries Array
        const timeseries = [];
        for (let i = 0; i < timestamps.length; i++) {
            // Yahoo 有時候當成分鐘沒有交易，會吐 null，我們過濾掉或填補
            if (quotes.close[i] !== null) {
                timeseries.push({
                    time: timestamps[i] * 1000, // 轉成 JS Date 需要的 ms
                    price: quotes.close[i],
                    volume: quotes.volume[i] || 0
                });
            }
        }

        return new Response(JSON.stringify({
            status: 'success',
            meta: {
                symbol: result.meta.symbol,
                prevClose: prevClose,
                currency: result.meta.currency
            },
            data: timeseries
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error(`[Intraday API Error]`, error);
        return new Response(JSON.stringify({
            status: 'error',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
