import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
    const symbol = url.searchParams.get('symbol');

    console.log('[API Debug] Request URL:', url.toString());
    console.log('[API Debug] Parsed Symbol:', symbol);

    if (!symbol) {
        return new Response(JSON.stringify({ error: 'Symbol is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Append .TW if not present (simple heuristic)
    const querySymbol = symbol.includes('.') ? symbol : `${symbol}.TW`;
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${querySymbol}?range=1d&interval=1m`;

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });

        if (!response.ok) {
            throw new Error(`Yahoo API responded with ${response.status}`);
        }

        const data = await response.json();
        const result = data.chart?.result?.[0];

        if (!result) {
            throw new Error('No data found');
        }

        const meta = result.meta;
        const quote = result.indicators.quote[0];
        const lastIdx = quote.close.length - 1 || 0;

        // Construct a simplified quote object
        const liveData = {
            symbol: meta.symbol,
            price: meta.regularMarketPrice,
            previousClose: meta.chartPreviousClose,
            open: meta.regularMarketDayHigh, // Note: meta has proper day stats
            high: meta.regularMarketDayHigh,
            low: meta.regularMarketDayLow,
            volume: meta.regularMarketVolume,
            time: new Date(meta.regularMarketTime * 1000).toISOString(),
            change: meta.regularMarketPrice - meta.chartPreviousClose,
            changePercent:
                ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) *
                100,
        };

        return new Response(JSON.stringify(liveData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 's-maxage=60, stale-while-revalidate=30',
            },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
