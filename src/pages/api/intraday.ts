import type { APIRoute } from 'astro';
export const prerender = false;

// Server-side cache for intraday data (keyed by symbol, 30 sec TTL)
const intradayCache = new Map<string, { data: any; ts: number }>();
const INTRADAY_CACHE_MS = 30_000;

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');
    const USER_AGENT =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

    if (!symbol) {
        return new Response(JSON.stringify({ error: 'Missing symbol parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Check cache first
    const cached = intradayCache.get(symbol);
    if (cached && Date.now() - cached.ts < INTRADAY_CACHE_MS) {
        return new Response(JSON.stringify(cached.data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=30',
            },
        });
    }

    try {
        // 先假設為上市 (TWSE)
        let yahooSymbol = `${symbol}.TW`;
        let yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1m`;

        let response = await fetch(yahooUrl, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(8000),
        });

        console.log(`[Intraday API] Fetching ${yahooSymbol}, status: ${response.status}`);

        // 若找不到上市股票，自動 fallback 測試上櫃 (OTC)
        if (!response.ok || response.status === 404) {
            console.log(`[Intraday API] Fallback to .TWO for ${symbol}`);
            yahooSymbol = `${symbol}.TWO`;
            yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1m`;
            const fallbackResponse = await fetch(yahooUrl, {
                headers: { 'User-Agent': USER_AGENT },
                signal: AbortSignal.timeout(8000),
            });
            console.log(
                `[Intraday API] Fetching ${yahooSymbol}, status: ${fallbackResponse.status}`
            );

            if (!fallbackResponse.ok) {
                const errorBody = await fallbackResponse.text().catch(() => 'No body');
                console.error(
                    `[Intraday API] Yahoo Finance API failed: ${fallbackResponse.status} ${errorBody}`
                );
                throw new Error(
                    `Yahoo Finance API failed (${fallbackResponse.status}): ${yahooSymbol}`
                );
            }
            response = fallbackResponse;
        }

        const data = await response.json();

        // 整理 Yahoo 回傳的結構，防呆空值
        const result = data.chart?.result?.[0];
        if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
            throw new Error('Invalid data format from Yahoo Finance');
        }

        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];

        // 將兩者組合成我們前端好畫圖的 TimeSeries Array
        const timeseries = [];
        for (let i = 0; i < timestamps.length; i++) {
            if (quotes.close[i] !== null) {
                timeseries.push({
                    time: timestamps[i] * 1000,
                    price: quotes.close[i],
                    volume: quotes.volume[i] || 0,
                });
            }
        }

        const responseData = {
            status: 'success',
            meta: {
                symbol: result.meta.symbol,
                prevClose: result.meta.previousClose,
                currency: result.meta.currency,
            },
            data: timeseries,
        };

        // Cache the result
        intradayCache.set(symbol, { data: responseData, ts: Date.now() });

        // Evict old entries (keep max 50 symbols)
        if (intradayCache.size > 50) {
            const oldest = intradayCache.keys().next().value;
            if (oldest) intradayCache.delete(oldest);
        }

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=30',
            },
        });
    } catch (error: any) {
        console.error(`[Intraday API Error]`, error.message);
        return new Response(
            JSON.stringify({
                status: 'error',
                message: error.message,
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
};
